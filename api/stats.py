"""
Vercel serverless function: Get user statistics
GET /api/stats?handle=rodriguescarson
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
    """Handle GET request for user stats"""
    def do_GET(self):
        try:
            from urllib.parse import urlparse, parse_qs
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            
            handle = params.get('handle', [None])[0]
            if not handle:
                error_response = {
                    'status': 'error',
                    'message': 'handle parameter required'
                }
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(error_response).encode())
                return
            
            # Initialize API
            api = CodeforcesAPI()
            
            # Get user info
            user_info = api.get_user_info([handle])
            if not user_info:
                error_response = {
                    'status': 'error',
                    'message': 'User not found'
                }
                self.send_response(404)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(error_response).encode())
                return
            
            user = user_info[0]
            
            # Get recent submissions
            submissions = api.get_user_status(handle, count=10)
            
            # Get rating history
            rating_history = api.get_user_rating(handle)
            
            # Calculate solved problems
            solved = set()
            for sub in submissions:
                if sub.get('verdict') == 'OK':
                    problem = sub.get('problem', {})
                    contest_id = problem.get('contestId')
                    index = problem.get('index')
                    if contest_id and index:
                        solved.add(f"{contest_id}{index}")
            
            response = {
                'status': 'success',
                'user': {
                    'handle': user.get('handle'),
                    'rating': user.get('rating', 0),
                    'maxRating': user.get('maxRating', 0),
                    'rank': user.get('rank', 'unrated'),
                    'maxRank': user.get('maxRank', 'unrated')
                },
                'stats': {
                    'solvedCount': len(solved),
                    'recentSubmissions': len(submissions),
                    'ratingChanges': len(rating_history)
                },
                'ratingHistory': rating_history[-10:] if rating_history else [],
                'recentSubmissions': [
                    {
                        'id': sub.get('id'),
                        'problem': f"{sub.get('problem', {}).get('contestId', '')}{sub.get('problem', {}).get('index', '')}",
                        'verdict': sub.get('verdict'),
                        'creationTimeSeconds': sub.get('creationTimeSeconds')
                    }
                    for sub in submissions[:10]
                ]
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
