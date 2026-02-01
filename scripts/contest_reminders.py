#!/usr/bin/env python3
"""
Codeforces Contest Reminders
Fetches upcoming contests and sends notifications at configured times
"""
import os
import sys
import json
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any, Set
from dotenv import load_dotenv

# Add scripts directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cf_api import CodeforcesAPI
from notify import send_notification

load_dotenv()

# Paths
DATA_DIR = Path.home() / "cf" / "data"
REMINDERS_FILE = DATA_DIR / "reminders_sent.json"

# Configuration defaults
DEFAULT_REMINDER_TIMES = [1440, 60, 15]  # 24h, 1h, 15min in minutes
DEFAULT_CONTEST_FILTER = ["div2", "div3"]
DEFAULT_INCLUDE_GYM = False

# Ensure data directory exists
DATA_DIR.mkdir(parents=True, exist_ok=True)


def load_json_file(filepath: Path, default=None):
    """Load JSON file or return default"""
    if filepath.exists():
        try:
            with open(filepath, 'r') as f:
                return json.load(f)
        except:
            return default if default is not None else {}
    return default if default is not None else {}


def save_json_file(filepath: Path, data: Any):
    """Save data to JSON file"""
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)


def parse_reminder_times(reminder_str: str) -> List[int]:
    """Parse reminder times from comma-separated string"""
    if not reminder_str:
        return DEFAULT_REMINDER_TIMES
    
    try:
        times = [int(t.strip()) for t in reminder_str.split(',')]
        return sorted(times, reverse=True)  # Sort descending (furthest first)
    except:
        return DEFAULT_REMINDER_TIMES


def parse_contest_filter(filter_str: str) -> Set[str]:
    """Parse contest filter from comma-separated string"""
    if not filter_str or filter_str.lower() == "all":
        return set()
    
    filters = {f.strip().lower() for f in filter_str.split(',')}
    return filters


def should_include_contest(contest: Dict[str, Any], filters: Set[str], include_gym: bool) -> bool:
    """Check if contest should be included based on filters"""
    # Exclude gym contests unless specified
    if contest.get('type') == 'CF' and contest.get('phase') == 'FINISHED':
        return False
    
    # Check if it's a gym contest
    is_gym = contest.get('type') == 'GYM' or contest.get('gym', False)
    if is_gym and not include_gym:
        return False
    
    # If no filters, include all regular contests
    if not filters:
        return True
    
    # Check division filters
    contest_name = contest.get('name', '').lower()
    
    if 'div1' in filters and ('div. 1' in contest_name or 'div1' in contest_name):
        return True
    if 'div2' in filters and ('div. 2' in contest_name or 'div2' in contest_name):
        return True
    if 'div3' in filters and ('div. 3' in contest_name or 'div3' in contest_name):
        return True
    if 'div4' in filters and ('div. 4' in contest_name or 'div4' in contest_name):
        return True
    
    # If filters specified but no match, exclude
    if filters:
        return False
    
    return True


def get_upcoming_contests(api: CodeforcesAPI, filters: Set[str], include_gym: bool) -> List[Dict[str, Any]]:
    """Fetch and filter upcoming contests"""
    try:
        # Get all contests (regular + gym if needed)
        all_contests = api.get_contest_list(gym=include_gym)
        
        current_time = int(time.time())
        upcoming = []
        
        for contest in all_contests:
            # Only include future contests
            start_time = contest.get('startTimeSeconds', 0)
            if start_time <= current_time:
                continue
            
            # Check if contest is in registration or before phase
            phase = contest.get('phase', '').upper()
            if phase not in ['BEFORE', 'CODING']:
                continue
            
            # Apply filters
            if should_include_contest(contest, filters, include_gym):
                upcoming.append(contest)
        
        # Sort by start time
        upcoming.sort(key=lambda x: x.get('startTimeSeconds', 0))
        
        return upcoming
        
    except Exception as e:
        print(f"Error fetching contests: {e}", file=sys.stderr)
        return []


def format_time_until(start_time: int) -> str:
    """Format time until contest starts"""
    current_time = int(time.time())
    seconds_until = start_time - current_time
    
    if seconds_until < 0:
        return "started"
    
    days = seconds_until // 86400
    hours = (seconds_until % 86400) // 3600
    minutes = (seconds_until % 3600) // 60
    
    if days > 0:
        return f"{days}d {hours}h"
    elif hours > 0:
        return f"{hours}h {minutes}m"
    else:
        return f"{minutes}m"


def format_start_time(start_time: int) -> str:
    """Format contest start time"""
    dt = datetime.fromtimestamp(start_time)
    return dt.strftime("%Y-%m-%d %H:%M UTC")


def check_and_send_reminders(api: CodeforcesAPI, reminder_times: List[int], 
                            filters: Set[str], include_gym: bool):
    """Check contests and send reminders if needed"""
    print("🔍 Checking for upcoming contests...")
    
    # Get upcoming contests
    contests = get_upcoming_contests(api, filters, include_gym)
    
    if not contests:
        print("   No upcoming contests found.")
        return
    
    print(f"   Found {len(contests)} upcoming contest(s)")
    
    # Load sent reminders
    reminders_sent = load_json_file(REMINDERS_FILE, {})
    current_time = int(time.time())
    
    notifications_sent = 0
    
    for contest in contests:
        contest_id = contest.get('id', 0)
        contest_name = contest.get('name', 'Unknown Contest')
        start_time = contest.get('startTimeSeconds', 0)
        
        if not start_time:
            continue
        
        # Initialize contest entry if needed
        if str(contest_id) not in reminders_sent:
            reminders_sent[str(contest_id)] = []
        
        sent_times = reminders_sent[str(contest_id)]
        
        # Check each reminder time
        for reminder_minutes in reminder_times:
            reminder_key = f"{reminder_minutes}m"
            
            # Skip if already sent
            if reminder_key in sent_times:
                continue
            
            # Calculate when to send reminder
            reminder_time = start_time - (reminder_minutes * 60)
            
            # Check if it's time to send (within 5 minute window)
            time_diff = current_time - reminder_time
            if -300 <= time_diff <= 300:  # 5 minute window
                # Send notification
                time_until = format_time_until(start_time)
                start_time_str = format_start_time(start_time)
                
                # Determine message based on time
                if reminder_minutes >= 1440:  # 24+ hours
                    message = f"{contest_name} starts {time_until} ({start_time_str})"
                    subtitle = "Contest Reminder"
                elif reminder_minutes >= 60:  # 1+ hours
                    message = f"{contest_name} starts in {time_until}!"
                    subtitle = f"Starts at {start_time_str}"
                else:  # Less than 1 hour
                    message = f"{contest_name} starts in {time_until}! Get ready!"
                    subtitle = "Contest starting soon"
                
                # Contest URL
                contest_url = f"https://codeforces.com/contest/{contest_id}"
                
                # Send notification
                success = send_notification(
                    title="Codeforces Contest Reminder",
                    message=message,
                    subtitle=subtitle,
                    sound="Glass",
                    open_url=contest_url
                )
                
                if success:
                    print(f"   ✓ Sent {reminder_minutes}m reminder for: {contest_name}")
                    sent_times.append(reminder_key)
                    notifications_sent += 1
                else:
                    print(f"   ✗ Failed to send reminder for: {contest_name}")
        
        # Update reminders sent
        reminders_sent[str(contest_id)] = sent_times
    
    # Save reminders sent
    save_json_file(REMINDERS_FILE, reminders_sent)
    
    if notifications_sent > 0:
        print(f"\n✅ Sent {notifications_sent} reminder(s)")
    else:
        print("\n✓ No reminders needed at this time")
    
    # Show upcoming contests
    if contests:
        print(f"\n📅 Upcoming Contests:")
        for contest in contests[:5]:  # Show next 5
            contest_name = contest.get('name', 'Unknown')
            start_time = contest.get('startTimeSeconds', 0)
            time_until = format_time_until(start_time)
            start_time_str = format_start_time(start_time)
            print(f"   • {contest_name}")
            print(f"     Starts in {time_until} ({start_time_str})")


def main():
    """Main function"""
    # Load configuration
    reminder_times_str = os.getenv('REMINDER_TIMES', '')
    reminder_times = parse_reminder_times(reminder_times_str)
    
    contest_filter_str = os.getenv('CONTEST_FILTER', 'div2,div3')
    contest_filters = parse_contest_filter(contest_filter_str)
    
    include_gym = os.getenv('INCLUDE_GYM', 'false').lower() == 'true'
    
    print("🔔 Codeforces Contest Reminders")
    print("=" * 50)
    print(f"Reminder times: {', '.join(f'{t}m' for t in reminder_times)}")
    print(f"Contest filters: {', '.join(contest_filters) if contest_filters else 'all'}")
    print(f"Include gym: {include_gym}")
    print("=" * 50)
    print()
    
    # Initialize API
    api = CodeforcesAPI()
    
    # Check and send reminders
    check_and_send_reminders(api, reminder_times, contest_filters, include_gym)


if __name__ == "__main__":
    main()
