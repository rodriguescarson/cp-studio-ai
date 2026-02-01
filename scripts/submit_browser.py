#!/usr/bin/env python3
"""
Browser-based submission script for Codeforces
Uses browser automation to bypass Cloudflare protection
"""
import sys
import os
import time
import json
from pathlib import Path

try:
    import undetected_chromedriver as uc
    from bs4 import BeautifulSoup
except ImportError:
    print("Error: undetected-chromedriver and beautifulsoup4 required")
    print("Install with: pip3 install undetected-chromedriver beautifulsoup4")
    sys.exit(1)

def get_config():
    config_path = os.path.expanduser("~/codeforces.uwu")
    if not os.path.isfile(config_path):
        print("Error: Config file not found. Run 'cf config' first.")
        return None
    with open(config_path, "r") as f:
        return json.load(f)

def submit_solution(contest_id, problem_id, file_path, lang_id="73"):
    """Submit solution using browser automation"""
    config = get_config()
    if not config:
        return False
    
    username = config.get('username')
    if not username:
        print("Error: Username not configured")
        return False
    
    # Read solution file
    if not os.path.isfile(file_path):
        print(f"Error: File not found: {file_path}")
        return False
    
    with open(file_path, 'r') as f:
        source_code = f.read()
    
    print(f"Opening browser for submission...")
    print(f"Contest: {contest_id}, Problem: {problem_id}")
    
    options = uc.ChromeOptions()
    options.add_argument('--no-first-run')
    options.add_argument('--password-store=basic')
    
    driver = uc.Chrome(options=options, use_subprocess=True)
    
    try:
        # Load saved cookies
        cookie_path = os.path.expanduser("~/codeforces.cookies")
        if os.path.isfile(cookie_path):
            driver.get("https://codeforces.com")
            time.sleep(2)
            with open(cookie_path, "r") as f:
                cookies = json.load(f)
            for cookie in cookies:
                try:
                    driver.add_cookie(cookie)
                except:
                    pass
        
        # Navigate to submit page
        submit_url = f"https://codeforces.com/contest/{contest_id}/submit"
        driver.get(submit_url)
        time.sleep(3)
        
        # Check if we need to login
        if "enter" in driver.current_url.lower() or "login" in driver.page_source.lower():
            print("Session expired. Please login in the browser window.")
            print("Waiting for login... (check browser window)")
            # Wait for login
            for _ in range(300):  # 5 minutes max
                time.sleep(1)
                driver.refresh()
                time.sleep(1)
                if username.lower() in driver.page_source.lower() and "logout" in driver.page_source.lower():
                    break
            else:
                print("Login timeout")
                driver.quit()
                return False
        
        # Get CSRF token
        html = driver.page_source
        soup = BeautifulSoup(html, 'html.parser')
        csrf_spans = soup.find_all("span", {"class": "csrf-token"})
        if not csrf_spans:
            print("Error: Could not find CSRF token. Page might be blocked.")
            print(f"Current URL: {driver.current_url}")
            print(f"Page title: {driver.title}")
            driver.quit()
            return False
        
        csrf_token = csrf_spans[0]["data-csrf"]
        print(f"CSRF token obtained")
        
        # Fill submission form using JavaScript
        # Wait for form elements to be ready
        time.sleep(2)
        
        # Try to find and fill the problem selector
        try:
            problem_input = driver.find_element("css selector", 'input[name="submittedProblemIndex"]')
            problem_input.clear()
            problem_input.send_keys(problem_id)
        except:
            # Try alternative selector
            try:
                problem_select = driver.find_element("css selector", 'select[name="submittedProblemIndex"]')
                from selenium.webdriver.support.ui import Select
                Select(problem_select).select_by_value(problem_id)
            except:
                print("Warning: Could not set problem ID, trying JavaScript...")
                driver.execute_script(f'document.querySelector("input[name=\\"submittedProblemIndex\\"]").value = "{problem_id}";')
        
        # Set language
        try:
            lang_select = driver.find_element("css selector", 'select[name="programTypeId"]')
            from selenium.webdriver.support.ui import Select
            Select(lang_select).select_by_value(lang_id)
        except:
            print("Warning: Could not set language, trying JavaScript...")
            driver.execute_script(f'document.querySelector("select[name=\\"programTypeId\\"]").value = "{lang_id}";')
        
        # Fill code editor
        time.sleep(1)
        escaped_code = source_code.replace('\\', '\\\\').replace('`', '\\`').replace('$', '\\$').replace("'", "\\'").replace('\n', '\\n').replace('\r', '\\r')
        try:
            driver.execute_script(f"""
                var editor = ace.edit(document.querySelector('.ace_editor'));
                if (editor) {{
                    editor.setValue('{escaped_code}');
                    editor.clearSelection();
                }} else {{
                    var textarea = document.querySelector('textarea[name="source"]');
                    if (textarea) textarea.value = '{escaped_code}';
                }}
            """)
        except Exception as e:
            print(f"Warning: Could not fill editor via JavaScript: {e}")
            # Try direct textarea
            try:
                textarea = driver.find_element("css selector", 'textarea[name="source"]')
                textarea.clear()
                textarea.send_keys(source_code)
            except:
                print("Error: Could not fill code editor")
                driver.quit()
                return False
        
        time.sleep(1)
        
        # Submit
        submit_button = driver.find_element("css selector", 'input[type="submit"]')
        submit_button.click()
        
        print("Submission sent! Waiting for confirmation...")
        time.sleep(3)
        
        # Check if submission was successful
        if f"/contest/{contest_id}/my" in driver.current_url:
            print("✓ Submission successful!")
            # Get submission ID from URL or page
            if "/submission/" in driver.current_url:
                sub_id = driver.current_url.split("/submission/")[-1]
                print(f"Submission ID: {sub_id}")
                print(f"View at: https://codeforces.com/contest/{contest_id}/submission/{sub_id}")
            else:
                print(f"View submissions: https://codeforces.com/contest/{contest_id}/my")
            driver.quit()
            return True
        else:
            print("Submission may have failed. Check browser window.")
            print(f"Current URL: {driver.current_url}")
            input("Press Enter after checking browser...")
            driver.quit()
            return False
            
    except Exception as e:
        print(f"Error during submission: {e}")
        import traceback
        traceback.print_exc()
        driver.quit()
        return False

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python3 submit_browser.py <contest_id> <problem_id> <file_path>")
        print("Example: python3 submit_browser.py 2193 A main.cpp")
        sys.exit(1)
    
    contest_id = sys.argv[1]
    problem_id = sys.argv[2].upper()
    file_path = sys.argv[3]
    
    lang_ids = {
        "cpp": "73", "c": "43", "py": "70", "java": "74",
        "rs": "75", "go": "32", "js": "55"
    }
    
    ext = file_path.split('.')[-1].lower()
    lang_id = lang_ids.get(ext, "73")
    
    submit_solution(contest_id, problem_id, file_path, lang_id)
