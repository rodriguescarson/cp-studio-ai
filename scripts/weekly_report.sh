#!/bin/bash

# Generate weekly practice report
# Usage: ./weekly_report.sh

LOG_FILE="$HOME/cf/practice_log.txt"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$HOME/cf/data"
SOLVED_FILE="$DATA_DIR/solved_problems.json"
RATING_FILE="$DATA_DIR/rating_history.json"

if [ ! -f "$LOG_FILE" ]; then
    echo "No practice log found. Start tracking with: ./track_progress.sh"
    exit 1
fi

echo "📊 Weekly Practice Report"
echo "================================"
echo ""

# Get this week's data (last 7 days)
WEEK_START=$(date -v-7d +"%Y-%m-%d" 2>/dev/null || date -d "7 days ago" +"%Y-%m-%d")
TODAY=$(date +"%Y-%m-%d")

echo "📅 Period: $WEEK_START to $TODAY"
echo ""

# Count problems by difficulty from log
EASY=$(grep -E "$WEEK_START|.*" "$LOG_FILE" | grep -c "easy" || echo "0")
MEDIUM=$(grep -E "$WEEK_START|.*" "$LOG_FILE" | grep -c "medium" || echo "0")
HARD=$(grep -E "$WEEK_START|.*" "$LOG_FILE" | grep -c "hard" || echo "0")
TOTAL=$((EASY + MEDIUM + HARD))

echo "📈 Problems Solved (from log):"
echo "  Easy:   $EASY"
echo "  Medium: $MEDIUM"
echo "  Hard:   $HARD"
echo "  Total:  $TOTAL"
echo ""

# Show API stats if available
if [ -f "$SOLVED_FILE" ]; then
    TOTAL_SOLVED=$(python3 -c "import json; data=json.load(open('$SOLVED_FILE')); print(data.get('total_solved', 0))" 2>/dev/null || echo "0")
    if [ "$TOTAL_SOLVED" != "0" ]; then
        echo "🌐 Total Solved (from API): $TOTAL_SOLVED"
        echo ""
    fi
fi

# Show rating info if available
if [ -f "$RATING_FILE" ]; then
    CURRENT_RATING=$(python3 -c "import json; data=json.load(open('$RATING_FILE')); history=data.get('history', []); print(history[-1].get('newRating', 'N/A') if history else 'N/A')" 2>/dev/null || echo "N/A")
    if [ "$CURRENT_RATING" != "N/A" ]; then
        echo "⭐ Current Rating: $CURRENT_RATING"
        echo ""
    fi
fi

# Days practiced
DAYS=$(grep -E "$WEEK_START|.*" "$LOG_FILE" | cut -d'|' -f1 | sort -u | wc -l | tr -d ' ')
echo "📆 Days Practiced: $DAYS/7"
echo ""

# Recent problems
echo "🔄 Recent Problems:"
tail -10 "$LOG_FILE" | tail -n +3 | while IFS='|' read -r date day problem diff status time; do
    echo "  $date: $problem ($diff)"
done

echo ""
echo "💡 Tip: Run './track_progress.sh --sync' to update from Codeforces API"
