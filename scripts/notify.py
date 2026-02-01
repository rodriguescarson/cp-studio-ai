#!/usr/bin/env python3
"""
macOS Notification Helper
Sends desktop notifications using osascript
"""
import os
import subprocess
import sys


def send_notification(title: str, message: str, subtitle: str = None, sound: str = None, 
                     open_url: str = None):
    """
    Send a macOS desktop notification
    
    Args:
        title: Notification title
        message: Notification message/body
        subtitle: Optional subtitle
        sound: Optional sound name (e.g., 'Glass', 'Ping', 'Basso')
        open_url: Optional URL to open when notification is clicked
    """
    # Escape special characters for AppleScript
    def escape(text):
        if text is None:
            return ""
        return str(text).replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
    
    # Build AppleScript command
    script_parts = ['display notification']
    script_parts.append(f'"{escape(message)}"')
    script_parts.append('with title')
    script_parts.append(f'"{escape(title)}"')
    
    if subtitle:
        script_parts.append('subtitle')
        script_parts.append(f'"{escape(subtitle)}"')
    
    if sound:
        script_parts.append('sound name')
        script_parts.append(f'"{escape(sound)}"')
    
    apple_script = ' '.join(script_parts)
    
    try:
        # Execute osascript
        result = subprocess.run(
            ['osascript', '-e', apple_script],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode != 0:
            print(f"Warning: Notification failed: {result.stderr}", file=sys.stderr)
            return False
        
        # If URL provided, open it after a short delay
        if open_url:
            # Use a separate process to open URL after notification
            subprocess.Popen(['open', open_url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        return True
        
    except subprocess.TimeoutExpired:
        print("Warning: Notification timed out", file=sys.stderr)
        return False
    except Exception as e:
        print(f"Error sending notification: {e}", file=sys.stderr)
        return False


def test_notification():
    """Test function to verify notifications work"""
    print("Sending test notification...")
    success = send_notification(
        title="Test Notification",
        message="If you see this, notifications are working!",
        subtitle="Codeforces Reminders",
        sound="Glass"
    )
    
    if success:
        print("✓ Test notification sent successfully!")
    else:
        print("✗ Failed to send test notification")
    
    return success


def main():
    """CLI interface for testing"""
    if len(sys.argv) < 3:
        print("Usage: python3 notify.py <title> <message> [subtitle] [sound]")
        print("\nExample:")
        print('  python3 notify.py "Contest Reminder" "Round 1077 starts in 1 hour!" "Codeforces" "Glass"')
        print("\nRunning test notification...")
        test_notification()
        return
    
    title = sys.argv[1]
    message = sys.argv[2]
    subtitle = sys.argv[3] if len(sys.argv) > 3 else None
    sound = sys.argv[4] if len(sys.argv) > 4 else None
    
    send_notification(title, message, subtitle, sound)


if __name__ == "__main__":
    main()
