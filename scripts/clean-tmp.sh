#!/usr/bin/env bash
set -e
DIRS=(dist build coverage target bin obj)
FILES=('*.tmp' '*.log' '*.swp' '*.bak')
for d in "${DIRS[@]}"; do [ -d "$d" ] && rm -rf "$d"; done
for p in "${FILES[@]}"; do find . -name "$p" -type f -delete || true; done
echo "Clean complete."
