#!/bin/bash
# Weekly auto-update for MedConf Atlas.
# Invoked by ~/Library/LaunchAgents/com.medconf.update.plist
# Edit scripts/update-prompt.md to change what the agent does.

set -u

PROJECT_DIR="/Users/ckeithw/Documents/Claude projects/medconf"
PROMPT_FILE="$PROJECT_DIR/scripts/update-prompt.md"
LOG_FILE="$PROJECT_DIR/logs/update.log"
CLAUDE_BIN="/opt/homebrew/bin/claude"

mkdir -p "$PROJECT_DIR/logs"

{
  echo ""
  echo "======================================================================"
  echo "Run started: $(date '+%Y-%m-%d %H:%M:%S %Z')"
  echo "======================================================================"

  if [ ! -x "$CLAUDE_BIN" ]; then
    echo "ERROR: claude CLI not found at $CLAUDE_BIN"
    exit 1
  fi

  if [ ! -f "$PROMPT_FILE" ]; then
    echo "ERROR: prompt file missing at $PROMPT_FILE"
    exit 1
  fi

  cd "$PROJECT_DIR" || exit 1

  # Run Claude Code in print/non-interactive mode with permissions auto-accepted
  # for tools the agent needs (read/write conferences.js, web search).
  "$CLAUDE_BIN" \
    --print \
    --permission-mode acceptEdits \
    --allowed-tools "Read,Edit,Write,WebSearch,WebFetch,Bash" \
    "$(cat "$PROMPT_FILE")"

  # If the agent added/changed conferences, regenerate SEO artifacts and deploy.
  if ! git diff --quiet -- conferences.js; then
    echo "conferences.js changed — regenerating SEO and deploying."
    node scripts/build-seo.js
    git add conferences.js index.html sitemap.xml robots.txt
    git commit -m "Weekly auto-update: new conferences + refreshed SEO" \
      -m "Automated by scripts/update-conferences.sh" \
      -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
    git push
  else
    echo "No changes to conferences.js — nothing to deploy."
  fi

  echo ""
  echo "Run finished: $(date '+%Y-%m-%d %H:%M:%S %Z')"
} >> "$LOG_FILE" 2>&1
