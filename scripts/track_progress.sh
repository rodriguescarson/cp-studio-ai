#!/bin/bash

# Progress tracking script for competitive programming
# Usage: ./track_progress.sh [problem_id] [difficulty] [status]
#        ./track_progress.sh --sync  (sync with Codeforces API)

LOG_FILE="$HOME/cf/practice_log.txt"
DATE=$(date +"%Y-%m-%d")
DAY=$(date +"%A")
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Initialize log file if it doesn't exist
mkdir -p "$HOME/cf"
if [ ! -f "$LOG_FILE" ]; then
    echo "Date | Day | Problem | Difficulty | Status | Time" > "$LOG_FILE"
    echo "-----|-----|---------|------------|--------|------" >> "$LOG_FILE"
fi

# Handle --sync option
if [ "$1" == "--sync" ]; then
    echo "🔄 Syncing with Codeforces API..."
    python3 "$SCRIPT_DIR/sync_progress.py"
    exit $?
fi

if [ $# -eq 0 ]; then
    # Show today's progress
    echo "📊 Today's Progress ($DATE - $DAY)"
    echo "================================"
    grep "$DATE" "$LOG_FILE" 2>/dev/null || echo "No problems solved today"
    echo ""
    echo "📈 This Week's Summary:"
    echo "================================"
    tail -20 "$LOG_FILE" | tail -n +3
    echo ""
    echo "💡 Tip: Use './track_progress.sh --sync' to sync with Codeforces API"
    exit 0
fi

PROBLEM_ID=$1
DIFFICULTY=${2:-"medium"}
STATUS=${3:-"solved"}
TIME=$(date +"%H:%M")

# Add entry
echo "$DATE | $DAY | $PROBLEM_ID | $DIFFICULTY | $STATUS | $TIME" >> "$LOG_FILE"
echo "✅ Logged: $PROBLEM_ID ($DIFFICULTY) - $STATUS at $TIME"
