#!/usr/bin/env python3
"""
Sync progress from Codeforces API
Fetches user submissions, rating changes, and updates local progress tracking
"""
import os
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any
from dotenv import load_dotenv

# Add scripts directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cf_api import CodeforcesAPI, CF_USERNAME

load_dotenv()

# Paths
DATA_DIR = Path.home() / "cf" / "data"
LOG_FILE = Path.home() / "cf" / "practice_log.txt"
SOLVED_FILE = DATA_DIR / "solved_problems.json"
RATING_FILE = DATA_DIR / "rating_history.json"
CACHE_FILE = DATA_DIR / "api_cache.json"

# Ensure data directory exists
DATA_DIR.mkdir(parents=True, exist_ok=True)


def load_json_file(filepath: Path, default: Any = None) -> Any:
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


def get_solved_problems(submissions: list) -> set:
    """Extract solved problems from submissions"""
    solved = set()
    for sub in submissions:
        if sub.get('verdict') == 'OK':
            problem = sub.get('problem', {})
            contest_id = problem.get('contestId')
            index = problem.get('index')
            if contest_id and index:
                solved.add(f"{contest_id}{index}")
    return solved


def sync_submissions(api: CodeforcesAPI, handle: str):
    """Sync user submissions and extract solved problems"""
    print(f"📥 Fetching submissions for {handle}...")
    
    try:
        # Fetch all submissions (API allows up to 1000 at a time)
        all_submissions = []
        from_index = 1
        count = 1000
        
        while True:
            submissions = api.get_user_status(handle, from_index=from_index, count=count)
            if not submissions:
                break
            all_submissions.extend(submissions)
            if len(submissions) < count:
                break
            from_index += count
            # Rate limiting - be nice to API
            import time
            time.sleep(0.5)
        
        print(f"   Found {len(all_submissions)} total submissions")
        
        # Extract solved problems
        solved = get_solved_problems(all_submissions)
        print(f"   Found {len(solved)} solved problems")
        
        # Load existing solved problems
        existing_solved = set(load_json_file(SOLVED_FILE, {}).get('problems', []))
        
        # Find new solved problems
        new_solved = solved - existing_solved
        if new_solved:
            print(f"   ✨ {len(new_solved)} new solved problems!")
            for problem in sorted(new_solved)[:10]:  # Show first 10
                print(f"      - {problem}")
            if len(new_solved) > 10:
                print(f"      ... and {len(new_solved) - 10} more")
        
        # Save solved problems
        save_json_file(SOLVED_FILE, {
            'last_sync': datetime.now().isoformat(),
            'total_solved': len(solved),
            'problems': sorted(list(solved))
        })
        
        # Cache submissions
        cache_data = load_json_file(CACHE_FILE, {})
        cache_data['submissions'] = {
            'last_sync': datetime.now().isoformat(),
            'count': len(all_submissions),
            'data': all_submissions[:100]  # Cache last 100 for quick access
        }
        save_json_file(CACHE_FILE, cache_data)
        
        return solved, all_submissions
        
    except Exception as e:
        print(f"   ✗ Error fetching submissions: {e}")
        return set(), []


def sync_rating_history(api: CodeforcesAPI, handle: str):
    """Sync user rating history"""
    print(f"📈 Fetching rating history for {handle}...")
    
    try:
        rating_history = api.get_user_rating(handle)
        print(f"   Found {len(rating_history)} rating changes")
        
        if rating_history:
            latest = rating_history[-1]
            current_rating = latest.get('newRating', 0)
            print(f"   Current rating: {current_rating}")
            
            # Calculate rating change
            if len(rating_history) > 1:
                prev_rating = rating_history[-2].get('newRating', 0)
                change = current_rating - prev_rating
                if change > 0:
                    print(f"   Recent change: +{change}")
                elif change < 0:
                    print(f"   Recent change: {change}")
        
        # Save rating history
        save_json_file(RATING_FILE, {
            'last_sync': datetime.now().isoformat(),
            'handle': handle,
            'history': rating_history
        })
        
        return rating_history
        
    except Exception as e:
        print(f"   ✗ Error fetching rating history: {e}")
        return []


def update_progress_log(solved: set, submissions: list):
    """Update progress log with new solved problems"""
    if not LOG_FILE.exists():
        return
    
    # Read existing log
    existing_problems = set()
    try:
        with open(LOG_FILE, 'r') as f:
            lines = f.readlines()
            for line in lines[2:]:  # Skip header
                parts = line.split('|')
                if len(parts) > 2:
                    problem = parts[2].strip()
                    existing_problems.add(problem)
    except:
        pass
    
    # Find problems to add
    new_problems = solved - existing_problems
    
    if new_problems:
        print(f"\n📝 Adding {len(new_problems)} problems to progress log...")
        date = datetime.now().strftime("%Y-%m-%d")
        day = datetime.now().strftime("%A")
        time_str = datetime.now().strftime("%H:%M")
        
        with open(LOG_FILE, 'a') as f:
            for problem in sorted(new_problems):
                # Try to determine difficulty from submissions
                difficulty = "medium"  # default
                for sub in submissions:
                    if sub.get('verdict') == 'OK':
                        prob = sub.get('problem', {})
                        prob_id = f"{prob.get('contestId', '')}{prob.get('index', '')}"
                        if prob_id == problem:
                            rating = prob.get('rating', 0)
                            if rating > 0:
                                if rating < 1400:
                                    difficulty = "easy"
                                elif rating < 1900:
                                    difficulty = "medium"
                                else:
                                    difficulty = "hard"
                            break
                
                f.write(f"{date} | {day} | {problem} | {difficulty} | solved | {time_str}\n")
                print(f"   ✓ Added {problem}")


def main():
    """Main sync function"""
    if not CF_USERNAME:
        print("Error: CF_USERNAME not set in .env file")
        print("Add: CF_USERNAME=your_handle to .env")
        return 1
    
    print("🔄 Syncing progress from Codeforces API...")
    print("=" * 50)
    
    api = CodeforcesAPI()
    
    # Sync submissions
    solved, submissions = sync_submissions(api, CF_USERNAME)
    
    # Sync rating history
    rating_history = sync_rating_history(api, CF_USERNAME)
    
    # Update progress log
    if solved:
        update_progress_log(solved, submissions)
    
    print("\n" + "=" * 50)
    print("✅ Sync complete!")
    
    # Summary
    print(f"\n📊 Summary:")
    print(f"   Solved problems: {len(solved)}")
    print(f"   Rating changes: {len(rating_history)}")
    if rating_history:
        latest = rating_history[-1]
        print(f"   Current rating: {latest.get('newRating', 'N/A')}")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
