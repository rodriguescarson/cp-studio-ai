#!/bin/bash

# Contest Checker Daemon Wrapper
# Runs the contest reminder script with proper environment setup

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CF_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
VENV_DIR="$CF_DIR/venv"
LOG_FILE="$HOME/cf/data/contest_checker.log"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Activate virtual environment if it exists
if [ -d "$VENV_DIR" ]; then
    source "$VENV_DIR/bin/activate"
else
    log "Warning: Virtual environment not found at $VENV_DIR"
fi

# Change to cf directory
cd "$CF_DIR" || exit 1

# Run the reminder script
log "Checking for contests..."
python3 "$SCRIPT_DIR/contest_reminders.py" >> "$LOG_FILE" 2>&1
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    log "Check completed successfully"
else
    log "Check failed with exit code $EXIT_CODE"
fi

exit $EXIT_CODE
