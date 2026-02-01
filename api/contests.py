"""
Vercel serverless function: Get upcoming contests
GET /api/contests?filter=div2,div3&include_gym=false
"""
import os
import json
import sys
from http.server import BaseHTTPRequestHandler

# Add current directory to path to import cf_api
sys.path.insert(0, os.path.dirname(__file__))
try:
    from cf_api import CodeforcesAPI
except ImportError:
    # Fallback: try scripts directory
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))
    from cf_api import CodeforcesAPI


class handler(BaseHTTPRequestHandler):
    """Handle GET request for contests"""
    def do_GET(self):
        try:
            from urllib.parse import urlparse, parse_qs
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            
            # Get query parameters
            filter_str = params.get('filter', ['div2,div3'])[0]
            include_gym = params.get('include_gym', ['false'])[0].lower() == 'true'
            
            # Parse filters
            filters = set()
            if filter_str and filter_str.lower() != 'all':
                filters = {f.strip().lower() for f in filter_str.split(',')}
            
            # Initialize API
            api = CodeforcesAPI()
            
            # Get contests
            all_contests = api.get_contest_list(gym=include_gym)
            
            import time
            current_time = int(time.time())
            upcoming = []
            
            for contest in all_contests:
                start_time = contest.get('startTimeSeconds', 0)
                if start_time <= current_time:
                    continue
                
                phase = contest.get('phase', '').upper()
                if phase not in ['BEFORE', 'CODING']:
                    continue
                
                # Filter by division if specified
                if filters:
                    contest_name = contest.get('name', '').lower()
                    matches = False
                    if 'div1' in filters and ('div. 1' in contest_name or 'div1' in contest_name):
                        matches = True
                    if 'div2' in filters and ('div. 2' in contest_name or 'div2' in contest_name):
                        matches = True
                    if 'div3' in filters and ('div. 3' in contest_name or 'div3' in contest_name):
                        matches = True
                    if 'div4' in filters and ('div. 4' in contest_name or 'div4' in contest_name):
                        matches = True
                    if not matches:
                        continue
                
                # Exclude gym unless specified
                if contest.get('type') == 'GYM' and not include_gym:
                    continue
                
                upcoming.append({
                    'id': contest.get('id'),
                    'name': contest.get('name'),
                    'type': contest.get('type'),
                    'phase': contest.get('phase'),
                    'startTimeSeconds': contest.get('startTimeSeconds'),
                    'durationSeconds': contest.get('durationSeconds'),
                    'relativeTimeSeconds': contest.get('relativeTimeSeconds')
                })
            
            # Sort by start time
            upcoming.sort(key=lambda x: x.get('startTimeSeconds', 0))
            
            response = {
                'status': 'success',
                'contests': upcoming,
                'count': len(upcoming)
            }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())
            
        except Exception as e:
            error_response = {
                'status': 'error',
                'message': str(e)
            }
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(error_response).encode())
