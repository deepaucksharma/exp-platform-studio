#!/usr/bin/env bash

set -e

FILE=".agent-lock"
STALE=300
INT=30
LOG="issues.log"
DIR=".cache/stale-locks"
mkdir -p "$DIR"

while true; do
  if [ -f "$FILE" ]; then
    LM=$(stat -c %Y "$FILE" 2>/dev/null||stat -f %m "$FILE")
    now=$(date +%s)
    if [ $((now-LM)) -gt $STALE ]; then
      ts=$(date -u +%Y%m%d%H%M%S)
      cp "$FILE" "$DIR/$FILE.$ts.stale"
      rm "$FILE"
      echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [ALERT] Stale heartbeat, backed up" | tee -a "$LOG"
    fi
  fi
  sleep $INT
done
