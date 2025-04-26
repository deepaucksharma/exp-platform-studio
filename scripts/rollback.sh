#!/usr/bin/env bash

# Enhanced rollback script with better error handling and multi-language support
# Properly handles meta/implementation separation by using config-utils.js

set -e

# Print colored output
function print_status() {
  local color=$1
  local message=$2
  
  case "$color" in
    "red")    echo -e "\033[0;31m$message\033[0m" ;;
    "green")  echo -e "\033[0;32m$message\033[0m" ;;
    "yellow") echo -e "\033[0;33m$message\033[0m" ;;
    "blue")   echo -e "\033[0;34m$message\033[0m" ;;
    *)        echo "$message" ;;
  esac
}

# Get project root folder - works regardless of where the script is called from
ROOT_DIR=$(git rev-parse --show-toplevel)
cd "$ROOT_DIR"

# Get implementation directory from config-utils.js
function get_impl_dir() {
  if [ -f "scripts/config-utils.js" ]; then
    IMPL_DIR=$(node -e "try { const utils = require('./scripts/config-utils'); console.log(utils.getImplementationDir()); } catch (e) { console.error(e); process.exit(1); }")
    if [ $? -ne 0 ]; then
      print_status "yellow" "Failed to get implementation directory from config-utils.js"
      # Fall back to direct JSON parsing
      if [ -f ".agent-config.json" ]; then
        # Try to extract implementation directory using grep and cut (more compatible)
        IMPL_DIR=$(grep -o '"implementationDir": *"[^"]*"' .agent-config.json | cut -d'"' -f4)
        
        # If that fails, try with jq if available
        if [ -z "$IMPL_DIR" ] && command -v jq >/dev/null 2>&1; then
          IMPL_DIR=$(jq -r '.workspace.implementationDir' .agent-config.json)
        fi
        
        # Clean up the path
        IMPL_DIR=${IMPL_DIR//.\//}
      fi
    fi
  elif [ -f ".agent-config.json" ]; then
    # Try to extract implementation directory using grep and cut (more compatible)
    IMPL_DIR=$(grep -o '"implementationDir": *"[^"]*"' .agent-config.json | cut -d'"' -f4)
    
    # If that fails, try with jq if available
    if [ -z "$IMPL_DIR" ] && command -v jq >/dev/null 2>&1; then
      IMPL_DIR=$(jq -r '.workspace.implementationDir' .agent-config.json)
    fi
    
    # Clean up the path
    IMPL_DIR=${IMPL_DIR//.\//}
  fi
  
  # Default to generated_implementation if not found
  echo "${IMPL_DIR:-generated_implementation}"
}

IMPL_DIR=$(get_impl_dir)
print_status "blue" "Implementation directory: $IMPL_DIR"

# Check arguments
if [ $# -lt 1 ]; then
  print_status "red" "Usage: $0 <sha> [reason]"
  exit 1
fi

SHA=$1
REASON=${2:-"automatic rollback"}
ID=$(date +%Y%m%d%H%M%S)-${SHA:0:7}
LOG="issues.log"

# Create cache directory if it doesn't exist
mkdir -p .cache/rollbacks

# Log rollback
cat > .cache/rollbacks/$ID.json <<EOF
{"id":"$ID","sha":"$SHA","time":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","reason":"$REASON","status":"initiated"}
EOF

# Add to issues log
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ROLLBACK: $REASON (sha: $SHA)" >> $LOG

print_status "yellow" "Starting rollback of commit $SHA - $REASON"

# Get default branch from config or fall back to 'main'
DEFAULT_BRANCH=$(node -e "try { const utils = require('./scripts/config-utils'); console.log(utils.getDefaultBranch()); } catch (e) { console.log('main'); }")

# Create temp branch for rollback to avoid direct manipulation of main branch
TEMP_BRANCH="rollback-$ID"
git checkout -b $TEMP_BRANCH

# Try to revert the commit
if ! git revert --no-commit "$SHA"; then
  print_status "red" "Failed to revert commit. Checking for conflicts..."
  
  if git status | grep -q "You are in the middle of a reverting"; then
    print_status "yellow" "Conflicts detected. Aborting revert and returning to $DEFAULT_BRANCH branch."
    git revert --abort
    git checkout "$DEFAULT_BRANCH"
    git branch -D $TEMP_BRANCH
    
    # Update status
    cat > .cache/rollbacks/$ID.json <<EOF
{"id":"$ID","sha":"$SHA","time":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","reason":"$REASON","status":"failed","error":"merge_conflicts"}
EOF
    
    exit 1
  fi
fi

print_status "green" "Commit reverted. Restoring dependencies..."

# Move to implementation directory and restore dependencies based on language
if [ -d "$IMPL_DIR" ]; then
  cd "$IMPL_DIR"
  
  # Detect project type and restore dependencies
  if [ -f "package.json" ]; then
    print_status "blue" "JavaScript/Node.js project detected."
    npm ci || print_status "yellow" "npm ci failed, but continuing rollback."
  fi
  
  if [ -f "go.mod" ]; then
    print_status "blue" "Go project detected."
    go mod download || print_status "yellow" "go mod download failed, but continuing rollback."
  fi
  
  if [ -f "requirements.txt" ]; then
    print_status "blue" "Python project detected."
    pip install -r requirements.txt || print_status "yellow" "pip install failed, but continuing rollback."
  elif [ -f "pyproject.toml" ]; then
    print_status "blue" "Python project with pyproject.toml detected."
    pip install -e . || print_status "yellow" "pip install failed, but continuing rollback."
  fi
  
  if [ -f "Cargo.toml" ]; then
    print_status "blue" "Rust project detected."
    cargo fetch || print_status "yellow" "cargo fetch failed, but continuing rollback."
  fi
  
  if [ -f "pom.xml" ]; then
    print_status "blue" "Java (Maven) project detected."
    mvn dependency:resolve || print_status "yellow" "mvn dependency:resolve failed, but continuing rollback."
  elif [ -f "build.gradle" ]; then
    print_status "blue" "Java (Gradle) project detected."
    ./gradlew dependencies || print_status "yellow" "gradlew dependencies failed, but continuing rollback."
  fi
  
  cd "$ROOT_DIR"
else
  print_status "yellow" "Implementation directory not found or empty. Skipping dependency restore."
fi

# Try to run basic tests
print_status "blue" "Running tests..."
TEST_SUCCESS=false

if [ -d "$IMPL_DIR" ]; then
  cd "$IMPL_DIR"
  
  # Try each testing approach, but don't fail if tests don't exist
  if [ -f "package.json" ]; then
    npm test && TEST_SUCCESS=true || print_status "yellow" "JavaScript tests failed or not found."
  elif [ -f "go.mod" ]; then
    go test ./... && TEST_SUCCESS=true || print_status "yellow" "Go tests failed or not found."
  elif [ -f "requirements.txt" ] || [ -f "pyproject.toml" ]; then
    python -m pytest && TEST_SUCCESS=true || print_status "yellow" "Python tests failed or not found."
  elif [ -f "Cargo.toml" ]; then
    cargo test && TEST_SUCCESS=true || print_status "yellow" "Rust tests failed or not found."
  elif [ -f "pom.xml" ]; then
    mvn test && TEST_SUCCESS=true || print_status "yellow" "Maven tests failed or not found."
  elif [ -f "build.gradle" ]; then
    ./gradlew test && TEST_SUCCESS=true || print_status "yellow" "Gradle tests failed or not found."
  fi
  
  cd "$ROOT_DIR"
fi

# Complete the revert and push
git commit -m "revert: $REASON (reverts $SHA)"

print_status "yellow" "Pushing changes..."

if git push --force-with-lease origin $TEMP_BRANCH:$DEFAULT_BRANCH; then
  print_status "green" "Rollback complete: $ID"
  
  # Update status
  cat > .cache/rollbacks/$ID.json <<EOF
{"id":"$ID","sha":"$SHA","time":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","reason":"$REASON","status":"completed","tests_passed":$TEST_SUCCESS}
EOF
  
  # Clean up
  git checkout $DEFAULT_BRANCH
  git pull origin $DEFAULT_BRANCH
  git branch -D $TEMP_BRANCH
  
  # Update meta layer status
  print_status "blue" "Updating project status..."
  if [ -f "scripts/gen-status-quick.js" ]; then
    node scripts/gen-status-quick.js || print_status "yellow" "Failed to update status."
  fi
  
  # Run health check
  print_status "blue" "Running health check..."
  if [ -f "scripts/health-check.js" ]; then
    node scripts/health-check.js || print_status "yellow" "Health check found issues. Please review."
  fi
else
  print_status "red" "Failed to push rollback. Changes are still in branch $TEMP_BRANCH."
  
  # Update status
  cat > .cache/rollbacks/$ID.json <<EOF
{"id":"$ID","sha":"$SHA","time":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","reason":"$REASON","status":"failed","error":"push_failed","branch":"$TEMP_BRANCH"}
EOF
  
  exit 1
fi
