#!/usr/bin/env bash

set -e

if [ $# -lt 1 ]; then
  echo "Usage: $0 <sha> [reason]"; exit 1
fi

SHA=$1
REASON=${2:-"automatic rollback"}
ID=$(date +%Y%m%d%H%M%S)-${SHA:0:7}
LOG="issues.log"
mkdir -p .cache/rollbacks
cat > .cache/rollbacks/$ID.json <<EOF
{"id":"$ID","sha":"$SHA","time":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","reason":"$REASON","status":"initiated"}
EOF

git revert --no-commit "$SHA" || { git revert --abort; exit 1; }
if [ -f "package.json" ]; then npm ci; fi
if [ -f "go.mod" ]; then go mod download; fi
if [ -f "requirements.txt" ]; then pip install -r requirements.txt; fi
npm test || go test ./... || pytest

git commit -m "revert: $REASON (reverts $SHA)"
git push --force-with-lease
echo "Rollback complete: $ID"
