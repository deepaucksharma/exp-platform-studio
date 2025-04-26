#!/usr/bin/env bash

# Test Affected components

set -e

SINCE=""
VERBOSE=false
LANG=""
CACHE=".cache"
OUT="$CACHE/affected-components.txt"
MAX=50

while [[ $# -gt 0 ]]; do
  case $1 in
    --since) SINCE="$2"; shift 2;;
    --verbose) VERBOSE=true; shift;;
    --language) LANG="$2"; shift 2;;
    *) echo "Unknown $1"; exit 1;;
  esac
done

if [ -z "$SINCE" ]; then
  if git rev-parse --verify HEAD~1 >/dev/null 2>&1; then 
    SINCE=$(git rev-parse HEAD~1);
  else
    SINCE="4b825d..."; 
  fi
fi

if [ -z "$LANG" ]; then
  if [ -f package.json ]; then LANG="js";
  elif [ -f go.mod ]; then LANG="go";
  elif [ -f requirements.txt ]; then LANG="python";
  else echo "Specify --language"; exit 1; fi
fi

mkdir -p "$CACHE"
FILES=$(git diff --name-only --diff-filter=ACMRTUXB "$SINCE"..HEAD)
[ -z "$FILES" ] && exit 0
CNT=$(echo "$FILES" | wc -l)

if [ "$CNT" -gt "$MAX" ]; then
  echo "" > "$OUT"
else
  CMP=()
  while read -r f; do
    comp=""
    case $LANG in
      js)
        if [[ "$f" =~ ^src/([^/]+) ]]; then comp="${BASH_REMATCH[1]}"; fi;;
      go) comp=$(dirname "$f");;
      python)
        if [[ "$f" =~ ^tests/ ]]; then comp="$f"; else comp=$(dirname "$f"); fi;;
      rust) comp=$(echo "$f" | cut -d'/' -f1);;
    esac
    if [ -n "$comp" ]; then
      [[ " ${CMP[*]} " =~ " ${comp} " ]] || CMP+=("$comp")
    fi
  done <<< "$FILES"
  printf "%s\n" "${CMP[@]}" > "$OUT"
fi

if [ -s "$OUT" ]; then
  echo "Running tests for affected: $(<"$OUT")"
  case $LANG in
    js) npx jest -- ${CMP[*]};;
    go) go test ${CMP[*]}/...;;
    python) pytest ${CMP[*]};;
  esac
else
  echo "Running all tests"
  case $LANG in
    js) npm test;;
    go) go test ./...;;
    python) pytest;;
  esac
fi
