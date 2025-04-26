#!/usr/bin/env bash

# Enhanced watchdog script with better error handling, configuration reading,
# and cross-platform support that is aware of meta/implementation separation
# UPDATED: Now supports multiple agent locks using .agent-lock-* pattern

# Function to print colored output
print_status() {
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

# Function to log messages
log_message() {
  local level=$1
  local message=$2
  local log_file=$3
  
  # Format timestamp for consistency
  local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  
  # Write to log file
  echo "[$timestamp] [$level] $message" >> "$log_file"
  
  # Also print to console with color
  case "$level" in
    "INFO")  print_status "blue" "[$level] $message" ;;
    "WARN")  print_status "yellow" "[$level] $message" ;;
    "ERROR") print_status "red" "[$level] $message" ;;
    "ALERT") print_status "red" "[$level] $message" ;;
    *)       print_status "" "[$level] $message" ;;
  esac
}

# Read configuration from .agent-config.json using Node.js config-utils for consistency
read_config_node() {
  local key=$1
  local default=$2
  
  # Try to use Node.js and our config utilities
  if [ -f "scripts/config-utils.js" ]; then
    local node_cmd="
      try {
        const utils = require('./scripts/config-utils');
        const parts = '${key}'.split('.');
        let value = utils.config;
        
        for (const part of parts) {
          if (value && typeof value === 'object' && part in value) {
            value = value[part];
          } else {
            value = undefined;
            break;
          }
        }
        
        console.log(value === undefined ? '${default}' : value);
      } catch (e) {
        console.log('${default}');
      }
    "
    
    local value=$(node -e "$node_cmd" 2>/dev/null)
    if [ -n "$value" ]; then
      echo "$value"
      return
    fi
  fi
  
  # Fallback to traditional method
  read_config_fallback "$key" "$default"
}

# Fallback method for reading config
read_config_fallback() {
  local config_file=".agent-config.json"
  local key=$1
  local default=$2
  
  # Try to use jq if available
  if command -v jq >/dev/null 2>&1; then
    local jq_path=$(echo "$key" | sed 's/\./\./g')
    local value=$(jq -r ".$jq_path" "$config_file" 2>/dev/null)
    if [ "$value" != "null" ] && [ -n "$value" ]; then
      echo "$value"
      return
    fi
  fi
  
  # Fallback to grep and cut for simple path extraction
  if [[ $key == "recovery.heartbeatFile" ]]; then
    local value=$(grep -o '"heartbeatFile": *"[^"]*"' "$config_file" 2>/dev/null | cut -d'"' -f4)
    if [ -n "$value" ]; then
      echo "$value"
      return
    fi
  elif [[ $key == "recovery.heartbeatStaleSeconds" ]]; then
    local value=$(grep -o '"heartbeatStaleSeconds": *[0-9]*' "$config_file" 2>/dev/null | grep -o '[0-9]*$')
    if [ -n "$value" ]; then
      echo "$value"
      return
    fi
  elif [[ $key == "recovery.heartbeatIntervalSeconds" ]]; then
    local value=$(grep -o '"heartbeatIntervalSeconds": *[0-9]*' "$config_file" 2>/dev/null | grep -o '[0-9]*$')
    if [ -n "$value" ]; then
      echo "$value"
      return
    fi
  elif [[ $key == "recovery.staleLocksDir" ]]; then
    local value=$(grep -o '"staleLocksDir": *"[^"]*"' "$config_file" 2>/dev/null | cut -d'"' -f4)
    if [ -n "$value" ]; then
      echo "$value"
      return
    fi
  fi
  
  echo "$default"
}

# Get file modification time in a cross-platform way
get_file_mtime() {
  local file=$1
  
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    stat -f %m "$file" 2>/dev/null
  else
    # Linux and others
    stat -c %Y "$file" 2>/dev/null
  fi
}

# Set variables with defaults from config
LOG="issues.log"
FILE=$(read_config_node "recovery.heartbeatFile" ".agent-lock")
STALE=$(read_config_node "recovery.heartbeatStaleSeconds" "300")
INT=$(read_config_node "recovery.heartbeatIntervalSeconds" "30")
DIR=$(read_config_node "recovery.staleLocksDir" ".cache/stale-locks")

# Function to check if a file appears to be an agent lock file
is_agent_lock_file() {
  local file=$1
  # Match either exact file name or files with pattern .agent-lock-*
  if [[ "$file" == ".agent-lock" ]] || [[ "$file" =~ \.agent-lock-.* ]]; then
    return 0  # true
  else
    return 1  # false
  fi
}

# Function to check a single lock file
check_lock_file() {
  local lock_file=$1
  
  # Check if file exists but can't be read (permission issue)
  if [ ! -r "$lock_file" ]; then
    log_message "ERROR" "Cannot read $lock_file - permission denied" "$LOG"
    return
  fi
  
  # Get modification time
  LM=$(get_file_mtime "$lock_file")
  
  # If we couldn't get the modification time, log and continue
  if [ -z "$LM" ]; then
    log_message "ERROR" "Could not determine last modification time of $lock_file" "$LOG"
    return
  fi
  
  now=$(date +%s)
  age=$((now-LM))
  
  # If the lock file is getting old but not yet stale, log a warning
  if [ "$age" -gt "$((STALE / 2))" ] && [ "$age" -lt "$STALE" ]; then
    log_message "WARN" "Lock file $lock_file is getting old (${age}s)" "$LOG"
  fi
  
  # If the lock file is stale, back it up and remove it
  if [ "$age" -gt "$STALE" ]; then
    ts=$(date -u +%Y%m%d%H%M%S)
    
    # Try to parse the lock file to get agent info
    if [ -r "$lock_file" ]; then
      AGENT_INFO=$(grep -o '"agent": *"[^"]*"' "$lock_file" 2>/dev/null | cut -d'"' -f4)
      if [ -n "$AGENT_INFO" ]; then
        BACKUP_SUFFIX="${ts}.${AGENT_INFO}.stale"
      else
        BACKUP_SUFFIX="${ts}.stale"
      fi
    else
      BACKUP_SUFFIX="${ts}.stale"
    fi
    
    # Create the backup file name
    local lock_filename=$(basename "$lock_file")
    BACKUP_FILE="$DIR/${lock_filename}.${BACKUP_SUFFIX}"
    
    # Backup the stale lock
    if cp "$lock_file" "$BACKUP_FILE" 2>/dev/null; then
      log_message "ALERT" "Stale heartbeat detected (${age}s > ${STALE}s) for $lock_file, backed up to $BACKUP_FILE" "$LOG"
      
      # Try to remove the lock file, but don't fail if we can't
      if rm "$lock_file" 2>/dev/null; then
        log_message "INFO" "Removed stale lock file $lock_file" "$LOG"
      else
        log_message "ERROR" "Failed to remove stale lock file $lock_file" "$LOG"
      fi
    else
      log_message "ERROR" "Failed to backup stale lock file to $BACKUP_FILE" "$LOG"
    fi
  fi
}

# Ensure cache directory exists
mkdir -p "$DIR"

# Get implementation directory for monitoring
IMPL_DIR=$(read_config_node "workspace.implementationDir" "generated_implementation")
IMPL_DIR=${IMPL_DIR#./}  # Remove leading ./

log_message "INFO" "Watchdog started with multi-agent support (Default lock file: $FILE, Implementation dir: $IMPL_DIR, Check interval: ${INT}s, Stale threshold: ${STALE}s)" "$LOG"

# Trap SIGINT and SIGTERM to exit gracefully
trap 'log_message "INFO" "Watchdog stopping" "$LOG"; exit 0' SIGINT SIGTERM

# Recovery function to check if there are stale backups that need attention
check_recovery() {
  local stale_count=$(ls -1 "$DIR"/*.stale 2>/dev/null | wc -l)
  if [ "$stale_count" -gt 0 ]; then
    log_message "WARN" "Found $stale_count stale lock backups in $DIR" "$LOG"
    # List the stale locks with their timestamps
    for stale_file in "$DIR"/*.stale; do
      local filename=$(basename "$stale_file")
      local timestamp=${filename##*.agent-lock.}
      timestamp=${timestamp%.stale}
      log_message "INFO" "Stale lock backup from $timestamp: $stale_file" "$LOG"
    done
  fi
}

# Function to check for implementation integrity
check_implementation_integrity() {
  # Only check at longer intervals
  if [ "$((SECONDS % (INT * 20)))" -lt "$INT" ]; then
    if [ -d "$IMPL_DIR" ]; then
      # Check for basic structure
      if [ ! -f "$IMPL_DIR/README.md" ]; then
        log_message "WARN" "Implementation directory missing README.md" "$LOG"
      fi
      
      # Check for tech stack files in the wrong place
      for stack_file in package.json go.mod requirements.txt pyproject.toml Cargo.toml pom.xml build.gradle; do
        if [ -f "$stack_file" ] && [ "$stack_file" != "package.json" ]; then
          # Allow package.json in root as it's the meta layer package
          log_message "WARN" "Tech stack file '$stack_file' found in root directory - should be in $IMPL_DIR" "$LOG"
        fi
      done
      
      # Check for node_modules in wrong place
      if [ -d "node_modules" ] && [ -f "$IMPL_DIR/package.json" ]; then
        log_message "WARN" "node_modules found in root but package.json is in implementation directory" "$LOG"
      fi
    else
      log_message "WARN" "Implementation directory not found: $IMPL_DIR" "$LOG"
    fi
  fi
}

# Initial recovery check
check_recovery

# Check for implementation integrity
check_implementation_integrity

# Main watchdog loop
while true; do
  # Check default lock file if it exists
  if [ -f "$FILE" ]; then
    check_lock_file "$FILE"
  fi
  
  # Check all agent-specific lock files using pattern .agent-lock-*
  for agent_lock in .agent-lock-*; do
    # Make sure the file exists (not just a pattern with no matches)
    if [ -f "$agent_lock" ]; then
      check_lock_file "$agent_lock"
    fi
  done
  
  # Every 10 checks, look for stale backups to see if they need attention
  if [ "$((SECONDS % (INT * 10)))" -lt "$INT" ]; then
    check_recovery
  fi
  
  # Check implementation integrity periodically
  check_implementation_integrity
  
  # Sleep for the specified interval
  sleep $INT
done
