"""
Vercel serverless function: Get user information
GET /api/user?handle=rodriguescarson
"""
import os
import json
import sys
import logging
from http.server import BaseHTTPRequestHandler

# CORS origin is configurable; set CORS_ALLOW_ORIGIN to the dashboard
# origin in production to lock down cross-origin access.
ALLOW_ORIGIN = os.getenv("CORS_ALLOW_ORIGIN", "*")

# Add current directory to path to import cf_api
sys.path.insert(0, os.path.dirname(__file__))
try:
    from cf_api import CodeforcesAPI
except ImportError:
    # Fallback: try scripts directory
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))
    from cf_api import CodeforcesAPI


class handler(BaseHTTPRequestHandler):
    """Handle GET request for user info"""
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
                self.send_header('Access-Control-Allow-Origin', ALLOW_ORIGIN)
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
                self.send_header('Access-Control-Allow-Origin', ALLOW_ORIGIN)
                self.end_headers()
                self.wfile.write(json.dumps(error_response).encode())
                return
            
            user = user_info[0]
            
            response = {
                'status': 'success',
                'user': {
                    'handle': user.get('handle'),
                    'rating': user.get('rating', 0),
                    'maxRating': user.get('maxRating', 0),
                    'rank': user.get('rank', 'unrated'),
                    'maxRank': user.get('maxRank', 'unrated'),
                    'organization': user.get('organization'),
                    'country': user.get('country'),
                    'city': user.get('city'),
                    'contribution': user.get('contribution', 0),
                    'friendOfCount': user.get('friendOfCount', 0)
                }
            }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', ALLOW_ORIGIN)
            self.send_header('Cache-Control', 'public, max-age=60')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())
            
        except Exception:
            logging.exception("API request failed")
            error_response = {
                'status': 'error',
                'message': 'Internal server error'
            }
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', ALLOW_ORIGIN)
            self.end_headers()
            self.wfile.write(json.dumps(error_response).encode())
