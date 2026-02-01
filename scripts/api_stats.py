#!/usr/bin/env python3
"""
Display comprehensive Codeforces statistics dashboard
"""
import os
import json
import sys
from datetime import datetime, timedelta
from pathlib import Path
from collections import defaultdict
from dotenv import load_dotenv

# Add scripts directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cf_api import CodeforcesAPI, CF_USERNAME

load_dotenv()

# Paths
DATA_DIR = Path.home() / "cf" / "data"
SOLVED_FILE = DATA_DIR / "solved_problems.json"
RATING_FILE = DATA_DIR / "rating_history.json"
CACHE_FILE = DATA_DIR / "api_cache.json"


def load_json_file(filepath: Path, default=None):
    """Load JSON file or return default"""
    if filepath.exists():
        try:
            with open(filepath, 'r') as f:
                return json.load(f)
        except:
            return default if default is not None else {}
    return default if default is not None else {}


def format_rating(rating: int) -> str:
    """Format rating with color coding"""
    if rating < 1200:
        return f"{rating} (Newbie)"
    elif rating < 1400:
        return f"{rating} (Pupil)"
    elif rating < 1600:
        return f"{rating} (Specialist)"
    elif rating < 1900:
        return f"{rating} (Expert)"
    elif rating < 2100:
        return f"{rating} (Candidate Master)"
    elif rating < 2300:
        return f"{rating} (Master)"
    elif rating < 2400:
        return f"{rating} (International Master)"
    elif rating < 2600:
        return f"{rating} (Grandmaster)"
    elif rating < 3000:
        return f"{rating} (International Grandmaster)"
    else:
        return f"{rating} (Legendary Grandmaster)"


def show_user_info(api: CodeforcesAPI, handle: str):
    """Display user information"""
    print("👤 User Information")
    print("=" * 50)
    
    try:
        user_info = api.get_user_info([handle])
        if user_info:
            user = user_info[0]
            handle_name = user.get('handle', handle)
            rating = user.get('rating', 0)
            max_rating = user.get('maxRating', 0)
            rank = user.get('rank', 'N/A')
            max_rank = user.get('maxRank', 'N/A')
            
            print(f"Handle:     {handle_name}")
            print(f"Rating:     {format_rating(rating)}")
            print(f"Max Rating: {format_rating(max_rating)}")
            print(f"Rank:       {rank}")
            print(f"Max Rank:   {max_rank}")
            
            # Organization and country if available
            if user.get('organization'):
                print(f"Org:        {user.get('organization')}")
            if user.get('country'):
                print(f"Country:    {user.get('country')}")
            
            return user
    except Exception as e:
        print(f"Error: {e}")
    
    return None


def show_solved_stats():
    """Display solved problems statistics"""
    print("\n📚 Solved Problems")
    print("=" * 50)
    
    solved_data = load_json_file(SOLVED_FILE, {})
    problems = solved_data.get('problems', [])
    
    if not problems:
        print("No solved problems found. Run sync_progress.py first.")
        return
    
    print(f"Total Solved: {len(problems)}")
    
    # Analyze by contest/problem type
    contest_problems = defaultdict(int)
    for problem in problems:
        # Extract contest ID (numbers before letter)
        import re
        match = re.match(r'(\d+)([A-Z]+)', problem)
        if match:
            contest_id = match.group(1)
            contest_problems[contest_id] += 1
    
    if contest_problems:
        print(f"\nProblems by Contest:")
        sorted_contests = sorted(contest_problems.items(), key=lambda x: int(x[0]), reverse=True)
        for contest_id, count in sorted_contests[:10]:
            print(f"  Contest {contest_id}: {count} problems")
        if len(contest_problems) > 10:
            print(f"  ... and {len(contest_problems) - 10} more contests")


def show_rating_history():
    """Display rating history and trends"""
    print("\n📈 Rating History")
    print("=" * 50)
    
    rating_data = load_json_file(RATING_FILE, {})
    history = rating_data.get('history', [])
    
    if not history:
        print("No rating history found. Run sync_progress.py first.")
        return
    
    print(f"Total Contests: {len(history)}")
    
    if history:
        latest = history[-1]
        current_rating = latest.get('newRating', 0)
        print(f"Current Rating: {format_rating(current_rating)}")
        
        # Show recent changes
        print(f"\nRecent Rating Changes:")
        for change in history[-5:]:
            contest_name = change.get('contestName', 'Unknown')
            old_rating = change.get('oldRating', 0)
            new_rating = change.get('newRating', 0)
            rating_change = new_rating - old_rating
            
            change_str = f"+{rating_change}" if rating_change > 0 else str(rating_change)
            print(f"  {contest_name}: {old_rating} → {new_rating} ({change_str})")
        
        # Calculate statistics
        if len(history) > 1:
            ratings = [h.get('newRating', 0) for h in history]
            max_rating = max(ratings)
            min_rating = min(ratings)
            avg_rating = sum(ratings) / len(ratings)
            
            print(f"\nStatistics:")
            print(f"  Highest: {format_rating(max_rating)}")
            print(f"  Lowest:  {format_rating(min_rating)}")
            print(f"  Average: {int(avg_rating)}")


def show_recent_activity(api: CodeforcesAPI, handle: str):
    """Display recent submission activity"""
    print("\n🔄 Recent Activity")
    print("=" * 50)
    
    try:
        submissions = api.get_user_status(handle, count=10)
        
        if not submissions:
            print("No recent submissions found.")
            return
        
        print(f"Last {len(submissions)} submissions:")
        
        for sub in submissions[:10]:
            problem = sub.get('problem', {})
            contest_id = problem.get('contestId', '')
            index = problem.get('index', '')
            problem_name = problem.get('name', 'Unknown')
            verdict = sub.get('verdict', 'UNKNOWN')
            creation_time = sub.get('creationTimeSeconds', 0)
            
            # Format time
            if creation_time:
                dt = datetime.fromtimestamp(creation_time)
                time_str = dt.strftime("%Y-%m-%d %H:%M")
            else:
                time_str = "Unknown"
            
            # Format verdict
            verdict_icon = "✓" if verdict == "OK" else "✗"
            
            print(f"  {verdict_icon} {contest_id}{index}: {problem_name[:40]}")
            print(f"    Verdict: {verdict} | Time: {time_str}")
            
    except Exception as e:
        print(f"Error fetching recent activity: {e}")


def show_weekly_stats():
    """Show weekly statistics"""
    print("\n📅 Weekly Statistics")
    print("=" * 50)
    
    solved_data = load_json_file(SOLVED_FILE, {})
    last_sync = solved_data.get('last_sync', '')
    
    if last_sync:
        try:
            sync_time = datetime.fromisoformat(last_sync)
            print(f"Last Sync: {sync_time.strftime('%Y-%m-%d %H:%M:%S')}")
        except:
            pass
    
    # Count problems solved this week
    rating_data = load_json_file(RATING_FILE, {})
    history = rating_data.get('history', [])
    
    if history:
        week_ago = datetime.now() - timedelta(days=7)
        recent_contests = [
            h for h in history
            if datetime.fromtimestamp(h.get('ratingUpdateTimeSeconds', 0)) >= week_ago
        ]
        print(f"Contests this week: {len(recent_contests)}")


def main():
    """Main stats display"""
    if not CF_USERNAME:
        print("Error: CF_USERNAME not set in .env file")
        print("Add: CF_USERNAME=your_handle to .env")
        return 1
    
    print("📊 Codeforces Statistics Dashboard")
    print("=" * 50)
    print(f"Handle: {CF_USERNAME}\n")
    
    api = CodeforcesAPI()
    
    # Show user info
    user = show_user_info(api, CF_USERNAME)
    
    # Show solved stats
    show_solved_stats()
    
    # Show rating history
    show_rating_history()
    
    # Show recent activity
    show_recent_activity(api, CF_USERNAME)
    
    # Show weekly stats
    show_weekly_stats()
    
    print("\n" + "=" * 50)
    print("💡 Tip: Run 'python3 scripts/sync_progress.py' to update data")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
