#!/bin/bash

# Setup script for Codeforces contest reminders
# Configures automatic checking via cron or launchd

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CF_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CHECK_SCRIPT="$SCRIPT_DIR/check_contests.sh"
PLIST_NAME="com.codeforces.reminders"
PLIST_FILE="$HOME/Library/LaunchAgents/${PLIST_NAME}.plist"

echo "🔔 Codeforces Contest Reminders Setup"
echo "======================================"
echo ""

# Test notification first
echo "1. Testing notifications..."
python3 "$SCRIPT_DIR/notify.py" "Test" "Notifications are working!" "Setup Test" "Glass"
echo "   (You should see a notification above)"
echo ""

# Ask for setup method
echo "Choose setup method:"
echo "  1) Cron job (runs every 15 minutes)"
echo "  2) Launchd (macOS native, runs every 15 minutes)"
echo "  3) Manual only (no automatic scheduling)"
echo ""
read -p "Enter choice [1-3]: " choice

case $choice in
    1)
        echo ""
        echo "Setting up cron job..."
        
        # Make script executable
        chmod +x "$CHECK_SCRIPT"
        
        # Create cron entry (every 15 minutes)
        CRON_ENTRY="*/15 * * * * $CHECK_SCRIPT"
        
        # Check if entry already exists
        if crontab -l 2>/dev/null | grep -q "$CHECK_SCRIPT"; then
            echo "   Cron job already exists"
        else
            # Add to crontab
            (crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -
            echo "   ✓ Cron job added (runs every 15 minutes)"
        fi
        
        echo ""
        echo "Current crontab:"
        crontab -l | grep "$CHECK_SCRIPT" || echo "   (none found)"
        ;;
        
    2)
        echo ""
        echo "Setting up LaunchAgent..."
        
        # Make script executable
        chmod +x "$CHECK_SCRIPT"
        
        # Create LaunchAgent plist
        cat > "$PLIST_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${PLIST_NAME}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${CHECK_SCRIPT}</string>
    </array>
    <key>StartInterval</key>
    <integer>900</integer>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${HOME}/cf/data/launchd.log</string>
    <key>StandardErrorPath</key>
    <string>${HOME}/cf/data/launchd.error.log</string>
</dict>
</plist>
EOF
        
        # Load the LaunchAgent
        launchctl unload "$PLIST_FILE" 2>/dev/null
        launchctl load "$PLIST_FILE"
        
        echo "   ✓ LaunchAgent created and loaded"
        echo "   File: $PLIST_FILE"
        echo ""
        echo "To unload: launchctl unload $PLIST_FILE"
        echo "To reload: launchctl load $PLIST_FILE"
        ;;
        
    3)
        echo ""
        echo "Manual mode selected."
        echo "Run manually with: $CHECK_SCRIPT"
        echo "Or: python3 $SCRIPT_DIR/contest_reminders.py"
        ;;
        
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo "======================================"
echo "✅ Setup complete!"
echo ""
echo "Configuration:"
echo "  • Reminder times: Set REMINDER_TIMES in .env (default: 1440,60,15 minutes)"
echo "  • Contest filters: Set CONTEST_FILTER in .env (default: div2,div3)"
echo "  • Include gym: Set INCLUDE_GYM in .env (default: false)"
echo ""
echo "Test it:"
echo "  python3 $SCRIPT_DIR/contest_reminders.py"
echo ""
echo "View logs:"
echo "  tail -f ~/cf/data/contest_checker.log"
