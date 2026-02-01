#!/usr/bin/env python3
"""
Pull a Codeforces contest and its test cases
Usage: python pull_contest.py <contest_id>
Example: python pull_contest.py 2112
"""
import os
import sys
import re
import requests
from bs4 import BeautifulSoup
from pathlib import Path

# Add parent directory to path to import cf_api
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
try:
    from api.cf_api import CodeforcesAPI
except ImportError:
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'api'))
    from cf_api import CodeforcesAPI


def get_contest_problems(contest_id: int):
    """Get list of problems from a contest using Codeforces API"""
    api = CodeforcesAPI()
    try:
        standings = api.get_contest_standings(contest_id, from_index=1, count=1)
        problems = standings.get('problems', [])
        return problems
    except Exception as e:
        print(f"Error fetching contest problems: {e}")
        return []


def scrape_test_cases(contest_id: int, problem_index: str):
    """Scrape test cases from a problem page or use cf CLI tool"""
    # Try using cf CLI tool first if available
    import subprocess
    try:
        result = subprocess.run(
            ['cf', 'parse', str(contest_id), problem_index],
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode == 0:
            # cf tool creates files in the current directory
            # Look for input/output files it might have created
            import glob
            input_files = glob.glob(f'{contest_id}{problem_index}*.in') + glob.glob(f'{contest_id}{problem_index}*.input')
            output_files = glob.glob(f'{contest_id}{problem_index}*.out') + glob.glob(f'{contest_id}{problem_index}*.output')
            
            test_cases = []
            for inp_file, out_file in zip(sorted(input_files), sorted(output_files)):
                try:
                    with open(inp_file, 'r') as f:
                        inp = f.read().strip()
                    with open(out_file, 'r') as f:
                        out = f.read().strip()
                    test_cases.append((inp, out))
                except:
                    pass
            
            if test_cases:
                return test_cases
    except (subprocess.TimeoutExpired, FileNotFoundError, Exception):
        pass
    
    # Fallback to web scraping
    url = f"https://codeforces.com/contest/{contest_id}/problem/{problem_index}"
    
    try:
        session = requests.Session()
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        
        # First, visit the main contest page to get cookies
        contest_url = f"https://codeforces.com/contest/{contest_id}"
        session.get(contest_url, headers=headers, timeout=10)
        
        # Now try to get the problem page
        response = session.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Find all input and output sections
        inputs = []
        outputs = []
        
        # Look for sample test sections
        # Codeforces typically has <div class="input"> and <div class="output">
        input_divs = soup.find_all('div', class_='input')
        output_divs = soup.find_all('div', class_='output')
        
        for input_div in input_divs:
            pre = input_div.find('pre')
            if pre:
                # Get all text, handling nested tags
                text = pre.get_text(separator='\n')
                # Clean up extra whitespace but preserve structure
                text = '\n'.join(line.rstrip() for line in text.split('\n'))
                inputs.append(text.strip())
        
        for output_div in output_divs:
            pre = output_div.find('pre')
            if pre:
                text = pre.get_text(separator='\n')
                text = '\n'.join(line.rstrip() for line in text.split('\n'))
                outputs.append(text.strip())
        
        # If we didn't find them in divs, try alternative methods
        if not inputs or not outputs:
            # Try finding <pre> tags directly
            all_pre = soup.find_all('pre')
            for i, pre in enumerate(all_pre):
                text = pre.get_text(separator='\n')
                text = '\n'.join(line.rstrip() for line in text.split('\n'))
                text = text.strip()
                if text:
                    # Alternate between input and output
                    if i % 2 == 0:
                        inputs.append(text)
                    else:
                        outputs.append(text)
        
        # Match inputs and outputs
        test_cases = []
        min_len = min(len(inputs), len(outputs))
        for i in range(min_len):
            test_cases.append((inputs[i], outputs[i]))
        
        return test_cases
        
    except Exception as e:
        print(f"Error scraping test cases from {url}: {e}")
        return []


def create_contest_structure(contest_id: int, problems):
    """Create directory structure and files for contest"""
    base_dir = Path(__file__).parent.parent / 'contests' / str(contest_id)
    base_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"\nPulling contest {contest_id}...")
    print(f"Found {len(problems)} problems\n")
    
    for problem in problems:
        problem_index = problem.get('index', '')
        problem_name = problem.get('name', '')
        
        if not problem_index:
            continue
        
        print(f"Processing problem {problem_index}: {problem_name}")
        
        # Create problem directory
        problem_dir = base_dir / problem_index
        problem_dir.mkdir(exist_ok=True)
        
        # Scrape test cases
        test_cases = scrape_test_cases(contest_id, problem_index)
        
        if test_cases:
            # Combine all inputs and outputs
            all_inputs = []
            all_outputs = []
            
            for inp, out in test_cases:
                all_inputs.append(inp)
                all_outputs.append(out)
            
            # Write input file
            input_file = problem_dir / 'in.txt'
            with open(input_file, 'w') as f:
                f.write('\n'.join(all_inputs))
            
            # Write output file
            output_file = problem_dir / 'out.txt'
            with open(output_file, 'w') as f:
                f.write('\n'.join(all_outputs))
            
            print(f"  ✓ Saved {len(test_cases)} test case(s)")
        else:
            print(f"  ⚠ No test cases found")
        
        # Create empty main.cpp template if it doesn't exist
        main_file = problem_dir / 'main.cpp'
        if not main_file.exists():
            template = """#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <cmath>
#include <set>
#include <map>
#include <unordered_map>
#include <unordered_set>
#include <queue>
#include <stack>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    // TODO: Implement solution
    
    return 0;
}
"""
            with open(main_file, 'w') as f:
                f.write(template)
            print(f"  ✓ Created main.cpp template")
    
    print(f"\n✓ Contest {contest_id} pulled successfully!")
    print(f"  Location: {base_dir}")


def main():
    if len(sys.argv) < 2:
        print("Usage: python pull_contest.py <contest_id>")
        print("Example: python pull_contest.py 2112")
        sys.exit(1)
    
    try:
        contest_id = int(sys.argv[1])
    except ValueError:
        print(f"Error: Invalid contest ID: {sys.argv[1]}")
        sys.exit(1)
    
    # Get contest problems
    problems = get_contest_problems(contest_id)
    
    if not problems:
        print(f"Error: Could not fetch problems for contest {contest_id}")
        print("Make sure the contest exists and is accessible.")
        sys.exit(1)
    
    # Create structure and pull test cases
    create_contest_structure(contest_id, problems)


if __name__ == "__main__":
    main()
