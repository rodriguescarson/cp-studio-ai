#!/usr/bin/env python3
"""
Codeforces API Client
Handles all interactions with Codeforces API including authentication
"""
import os
import time
import hashlib
import random
import string
import requests
from typing import Optional, Dict, List, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

API_BASE_URL = "https://codeforces.com/api"
API_KEY = os.getenv("KEY")
API_SECRET = os.getenv("SECRET")
CF_USERNAME = os.getenv("CF_USERNAME", "")


class CodeforcesAPI:
    """Codeforces API client with authentication support"""
    
    def __init__(self, api_key: Optional[str] = None, api_secret: Optional[str] = None):
        self.api_key = api_key or API_KEY
        self.api_secret = api_secret or API_SECRET
        self.base_url = API_BASE_URL
        
    def _generate_api_sig(self, method_name: str, params: Dict[str, Any]) -> tuple:
        """Generate API signature for authenticated requests"""
        if not self.api_key or not self.api_secret:
            return None, None
            
        # Generate random 6-character string
        rand = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
        
        # Sort parameters by key
        sorted_params = sorted(params.items())
        param_str = '&'.join(f"{k}={v}" for k, v in sorted_params)
        
        # Create signature string: rand + /api/methodName + ?params + #secret
        sig_string = f"{rand}/api/{method_name}?{param_str}#{self.api_secret}"
        
        # Hash with SHA512
        api_sig = hashlib.sha512(sig_string.encode()).hexdigest()
        
        return rand, api_sig
    
    def _make_request(self, method_name: str, params: Optional[Dict[str, Any]] = None, 
                     authenticated: bool = False) -> Dict[str, Any]:
        """Make API request with optional authentication"""
        if params is None:
            params = {}
            
        # Add authentication if needed
        if authenticated and self.api_key and self.api_secret:
            params['apiKey'] = self.api_key
            params['time'] = str(int(time.time()))
            rand, api_sig = self._generate_api_sig(method_name, params)
            if rand and api_sig:
                params['apiSig'] = rand + api_sig
        
        # Make request
        url = f"{self.base_url}/{method_name}"
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if data.get('status') == 'FAILED':
                raise Exception(f"API Error: {data.get('comment', 'Unknown error')}")
                
            return data.get('result', {})
        except requests.exceptions.RequestException as e:
            raise Exception(f"Network error: {str(e)}")
    
    # User Methods
    def get_user_info(self, handles: List[str]) -> List[Dict[str, Any]]:
        """Get user information for given handles"""
        handles_str = ';'.join(handles)
        return self._make_request('user.info', {'handles': handles_str})
    
    def get_user_status(self, handle: str, from_index: int = 1, count: int = 10) -> List[Dict[str, Any]]:
        """Get user's submission status"""
        return self._make_request('user.status', {
            'handle': handle,
            'from': from_index,
            'count': count
        })
    
    def get_user_rating(self, handle: str) -> List[Dict[str, Any]]:
        """Get user's rating history"""
        return self._make_request('user.rating', {'handle': handle})
    
    def get_user_submissions(self, handle: str, from_index: int = 1, count: int = 1000) -> List[Dict[str, Any]]:
        """Get user's submissions (alias for get_user_status)"""
        return self.get_user_status(handle, from_index, count)
    
    # Contest Methods
    def get_contest_list(self, gym: bool = False) -> List[Dict[str, Any]]:
        """Get list of contests"""
        return self._make_request('contest.list', {'gym': str(gym).lower()})
    
    def get_contest_standings(self, contest_id: int, handle: Optional[str] = None,
                             from_index: int = 1, count: int = 100) -> Dict[str, Any]:
        """Get contest standings"""
        params = {
            'contestId': contest_id,
            'from': from_index,
            'count': count
        }
        if handle:
            params['handles'] = handle
        return self._make_request('contest.standings', params)
    
    def get_contest_rating_changes(self, contest_id: int) -> List[Dict[str, Any]]:
        """Get rating changes for a contest"""
        return self._make_request('contest.ratingChanges', {'contestId': contest_id})
    
    def get_contest_hacks(self, contest_id: int) -> List[Dict[str, Any]]:
        """Get hacks for a contest"""
        return self._make_request('contest.hacks', {'contestId': contest_id})
    
    # Problem Methods
    def get_problemset(self, tags: Optional[List[str]] = None, 
                      problemset_name: Optional[str] = None) -> Dict[str, Any]:
        """Get problemset with optional tag filtering"""
        params = {}
        if tags:
            params['tags'] = ';'.join(tags)
        if problemset_name:
            params['problemsetName'] = problemset_name
        return self._make_request('problemset.problems', params)
    
    def get_recent_status(self, count: int = 10, problemset_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get recent submissions"""
        params = {'count': count}
        if problemset_name:
            params['problemsetName'] = problemset_name
        return self._make_request('problemset.recentStatus', params)
    
    # Blog Methods
    def get_blog_entry(self, blog_entry_id: int) -> Dict[str, Any]:
        """Get blog entry"""
        return self._make_request('blogEntry.view', {'blogEntryId': blog_entry_id})
    
    def get_blog_comments(self, blog_entry_id: int) -> List[Dict[str, Any]]:
        """Get blog entry comments"""
        return self._make_request('blogEntry.comments', {'blogEntryId': blog_entry_id})


def main():
    """Test the API client"""
    api = CodeforcesAPI()
    
    if not CF_USERNAME:
        print("Error: CF_USERNAME not set in .env file")
        print("Add: CF_USERNAME=your_handle to .env")
        return
    
    print(f"Testing API with handle: {CF_USERNAME}")
    
    try:
        # Test user info
        print("\n1. Fetching user info...")
        user_info = api.get_user_info([CF_USERNAME])
        if user_info:
            user = user_info[0]
            print(f"   Handle: {user.get('handle')}")
            print(f"   Rating: {user.get('rating', 'N/A')}")
            print(f"   Rank: {user.get('rank', 'N/A')}")
        
        # Test recent submissions
        print("\n2. Fetching recent submissions...")
        submissions = api.get_user_status(CF_USERNAME, count=5)
        print(f"   Found {len(submissions)} recent submissions")
        for sub in submissions[:3]:
            problem = sub.get('problem', {})
            verdict = sub.get('verdict', 'UNKNOWN')
            print(f"   - {problem.get('contestId', '')}{problem.get('index', '')}: {verdict}")
        
        # Test rating history
        print("\n3. Fetching rating history...")
        rating_history = api.get_user_rating(CF_USERNAME)
        print(f"   Found {len(rating_history)} rating changes")
        if rating_history:
            latest = rating_history[-1]
            print(f"   Latest rating: {latest.get('newRating')} (change: {latest.get('newRating') - latest.get('oldRating')})")
        
        print("\n✓ API client working correctly!")
        
    except Exception as e:
        print(f"\n✗ Error: {e}")


if __name__ == "__main__":
    main()
