#!/usr/bin/env bash
if ! command -v rg >/dev/null; then
  echo "Install ripgrep (rg)"; exit 1
fi
PAT=$1; SCOPE=${2:-.}
IGNORES=(
  '!**/node_modules/*' '!**/.git/*' '!**/.cache/*' '!**/dist/*' 
  '!**/build/*' '!**/coverage/*' '!**/target/*' '!**/vendor/*'
)
rg --line-number --hidden --no-ignore-vcs "${IGNORES[@]}" "$PAT" "$SCOPE" || true
