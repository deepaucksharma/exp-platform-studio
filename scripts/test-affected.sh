#!/usr/bin/env bash

# Test Affected components with proper meta/implementation separation

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

# Parse arguments
SINCE=""
VERBOSE=false
LANG=""
CACHE=".cache"
OUT="$CACHE/affected-components.txt"
MAX=50
ALL=false
META=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --since) SINCE="$2"; shift 2;;
    --verbose) VERBOSE=true; shift;;
    --language) LANG="$2"; shift 2;;
    --all) ALL=true; shift;;
    --meta) META=true; shift;;
    *) print_status "red" "Unknown option: $1"; exit 1;;
  esac
done

# Get implementation directory from config
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

# If --meta is set, run meta tests only
if [ "$META" = true ]; then
  print_status "blue" "Running meta layer tests..."
  
  # Run health check as a form of meta test
  if [ -f "scripts/health-check.js" ]; then
    print_status "blue" "Running health check..."
    node scripts/health-check.js
    exit $?
  else
    print_status "yellow" "No meta tests available"
    exit 0
  fi
fi

# Set commit to compare if not provided
if [ -z "$SINCE" ]; then
  if git rev-parse --verify HEAD~1 >/dev/null 2>&1; then 
    SINCE=$(git rev-parse HEAD~1);
  else
    SINCE="4b825d..."; 
  fi
fi

# Enter implementation directory
if [ ! -d "$IMPL_DIR" ]; then
  print_status "red" "Implementation directory not found: $IMPL_DIR"
  exit 1
fi

cd "$IMPL_DIR"

# Auto-detect language if not provided
if [ -z "$LANG" ]; then
  if [ -f "package.json" ]; then 
    LANG="js";
  elif [ -f "go.mod" ]; then 
    LANG="go";
  elif [ -f "requirements.txt" ] || [ -f "pyproject.toml" ]; then 
    LANG="python";
  elif [ -f "Cargo.toml" ]; then
    LANG="rust";
  elif [ -f "pom.xml" ]; then
    LANG="java-maven";
  elif [ -f "build.gradle" ]; then
    LANG="java-gradle";
  else 
    print_status "yellow" "Could not auto-detect language. Please specify with --language"
    exit 1
  fi
fi

print_status "blue" "Detected language: $LANG"

# Create cache directory
mkdir -p "../$CACHE"

# If --all flag is set, run all tests
if [ "$ALL" = true ]; then
  print_status "blue" "Running all tests for $LANG"
  
  case $LANG in
    js) 
      npm test
      ;;
    go) 
      go test ./...
      ;;
    python) 
      if [ -f "pytest.ini" ] || [ -d "tests" ]; then
        python -m pytest
      else
        print_status "yellow" "No pytest configuration found"
      fi
      ;;
    rust)
      cargo test
      ;;
    java-maven)
      mvn test
      ;;
    java-gradle)
      ./gradlew test
      ;;
  esac
  
  exit $?
fi

# Get affected files relative to implementation directory
FILES=$(git -C .. diff --name-only --diff-filter=ACMRTUXB "$SINCE"..HEAD | grep "^$IMPL_DIR/" | sed "s|^$IMPL_DIR/||")

if [ -z "$FILES" ]; then
  print_status "green" "No implementation files changed"
  exit 0
fi

CNT=$(echo "$FILES" | wc -l)
print_status "blue" "Found $CNT changed files in implementation directory"

if [ "$VERBOSE" = true ]; then
  print_status "blue" "Changed files:"
  echo "$FILES"
fi

# Handle large changes
if [ "$CNT" -gt "$MAX" ]; then
  print_status "yellow" "Too many files changed ($CNT > $MAX), running all tests"
  echo "" > "../$OUT"
  ALL=true
else
  # Identify affected components based on language
  CMP=()
  while read -r f; do
    [ -z "$f" ] && continue
    
    comp=""
    case $LANG in
      js)
        if [[ "$f" =~ ^src/([^/]+) ]]; then 
          comp="${BASH_REMATCH[1]}"
        elif [[ "$f" =~ ^test/([^/]+) ]]; then
          comp="${BASH_REMATCH[1]}"
        fi
        ;;
      go) 
        comp=$(dirname "$f")
        ;;
      python)
        if [[ "$f" =~ ^tests/ ]]; then 
          comp="$f"
        else 
          comp=$(dirname "$f")
        fi
        ;;
      rust) 
        comp=$(echo "$f" | cut -d'/' -f1)
        ;;
      java-maven|java-gradle)
        if [[ "$f" =~ ^src/main/java/([^/]+) ]]; then
          comp="${BASH_REMATCH[1]}"
        elif [[ "$f" =~ ^src/test/java/([^/]+) ]]; then
          comp="${BASH_REMATCH[1]}"
        fi
        ;;
    esac
    
    if [ -n "$comp" ]; then
      # Check if component is already in array
      if ! printf '%s\n' "${CMP[@]}" | grep -q "^$comp$"; then
        CMP+=("$comp")
      fi
    fi
  done <<< "$FILES"
  
  # Write affected components to file
  printf "%s\n" "${CMP[@]}" > "../$OUT"
fi

# Run tests for affected components or all tests
if [ "$ALL" = true ] || [ ${#CMP[@]} -eq 0 ]; then
  print_status "blue" "Running all tests"
  case $LANG in
    js) npm test ;;
    go) go test ./... ;;
    python) python -m pytest ;;
    rust) cargo test ;;
    java-maven) mvn test ;;
    java-gradle) ./gradlew test ;;
  esac
elif [ -s "../$OUT" ]; then
  print_status "blue" "Running tests for affected components: ${CMP[*]}"
  
  case $LANG in
    js) 
      if [ -f "package.json" ] && grep -q "\"jest\":" "package.json"; then
        npx jest -- "${CMP[@]}"
      else
        npm test
      fi
      ;;
    go) 
      for comp in "${CMP[@]}"; do
        go test "./$comp/..."
      done
      ;;
    python) 
      python -m pytest "${CMP[@]}"
      ;;
    rust)
      for comp in "${CMP[@]}"; do
        cargo test --package "$comp"
      done
      ;;
    java-maven)
      mvn test -pl "$(IFS=,; echo "${CMP[*]}")"
      ;;
    java-gradle)
      ./gradlew "${CMP[@]}:test"
      ;;
  esac
else
  print_status "green" "No testable components affected"
fi
