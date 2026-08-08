#!/bin/bash
# Weekly Cloudflare traffic snapshot for convene.md.
# Invoked by ~/Library/LaunchAgents/com.medconf.traffic.plist
#
# The API token lives OUTSIDE this repo, at ~/.config/convene/cloudflare-token, so it can
# never be committed by accident. See marketing/traffic/README.md to create one.

set -u

PROJECT_DIR="/Users/ckeithw/Documents/Claude projects/medconf"
LOG_FILE="$PROJECT_DIR/logs/traffic.log"
TOKEN_FILE="$HOME/.config/convene/cloudflare-token"
NODE_BIN="$(command -v node || echo /opt/homebrew/bin/node)"

mkdir -p "$PROJECT_DIR/logs"

{
  echo ""
  echo "======================================================================"
  echo "Traffic report: $(date '+%Y-%m-%d %H:%M:%S %Z')"
  echo "======================================================================"

  if [ ! -f "$TOKEN_FILE" ]; then
    echo "ERROR: no token at $TOKEN_FILE — see marketing/traffic/README.md"
    exit 1
  fi

  cd "$PROJECT_DIR" || exit 1
  "$NODE_BIN" scripts/traffic-report.js --days 7
  rc=$?

  if [ $rc -ne 0 ]; then
    echo "ERROR: traffic-report.js exited $rc — report not written"
    exit $rc
  fi

  # Commit the snapshot so the history survives this machine. Only ever touches the
  # traffic directory; never conferences.js or anything the conference updater owns.
  if [ -n "$(git status --porcelain marketing/traffic)" ]; then
    git add marketing/traffic
    git commit -q -m "Weekly traffic snapshot $(date '+%Y-%m-%d')"
    git push -q origin main && echo "pushed snapshot" || echo "WARN: push failed (snapshot committed locally)"
  else
    echo "no change to commit"
  fi

  echo "Done: $(date '+%H:%M:%S')"
} >> "$LOG_FILE" 2>&1
