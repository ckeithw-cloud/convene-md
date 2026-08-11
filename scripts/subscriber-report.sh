#!/bin/bash
# Monthly subscriber snapshot for convene.md.
# Invoked by ~/Library/LaunchAgents/com.medconf.subscribers.plist
#
# The API key lives OUTSIDE this repo, at ~/.config/convene/buttondown-token, so it can
# never be committed by accident. See marketing/subscribers/README.md to create one.

set -u

PROJECT_DIR="/Users/ckeithw/Documents/Claude projects/medconf"
LOG_FILE="$PROJECT_DIR/logs/subscribers.log"
TOKEN_FILE="$HOME/.config/convene/buttondown-token"
NODE_BIN="$(command -v node || echo /opt/homebrew/bin/node)"

mkdir -p "$PROJECT_DIR/logs"

{
  echo ""
  echo "======================================================================"
  echo "Subscriber report: $(date '+%Y-%m-%d %H:%M:%S %Z')"
  echo "======================================================================"

  if [ ! -f "$TOKEN_FILE" ]; then
    echo "ERROR: no token at $TOKEN_FILE — see marketing/subscribers/README.md"
    exit 1
  fi

  cd "$PROJECT_DIR" || exit 1
  "$NODE_BIN" scripts/subscriber-report.js
  rc=$?

  if [ $rc -ne 0 ]; then
    echo "ERROR: subscriber-report.js exited $rc — report not written"
    exit $rc
  fi

  # Commit so the history survives this machine. Only ever touches the subscribers
  # directory; never conferences.js or anything the other jobs own.
  if [ -n "$(git status --porcelain marketing/subscribers)" ]; then
    git add marketing/subscribers
    git commit -q -m "Monthly subscriber snapshot $(date '+%Y-%m')"
    git push -q origin main && echo "pushed snapshot" || echo "WARN: push failed (snapshot committed locally)"
  else
    echo "no change to commit"
  fi

  echo "Done: $(date '+%H:%M:%S')"
} >> "$LOG_FILE" 2>&1
