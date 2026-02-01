#!/bin/bash
# Helper script to pull test cases using cf CLI tool
# Usage: ./pull_test_cases.sh <contest_id> <problem>
# Example: ./pull_test_cases.sh 2112 A

if [ $# -lt 2 ]; then
    echo "Usage: $0 <contest_id> <problem>"
    echo "Example: $0 2112 A"
    exit 1
fi

CONTEST_ID=$1
PROBLEM=$2
PROBLEM_DIR="contests/${CONTEST_ID}/${PROBLEM}"

if [ ! -d "$PROBLEM_DIR" ]; then
    echo "Error: Directory $PROBLEM_DIR does not exist"
    exit 1
fi

cd "$PROBLEM_DIR" || exit 1

echo "Attempting to parse test cases for contest $CONTEST_ID problem $PROBLEM..."
echo "Using cf CLI tool..."

# Try cf parse command
cf parse "$CONTEST_ID" "$PROBLEM" 2>&1 | grep -v "NotOpenSSLWarning"

# Check if cf created any files
if ls "${CONTEST_ID}${PROBLEM}"*.in 1> /dev/null 2>&1; then
    echo "Found input files created by cf tool"
    # Combine all .in files into in.txt
    cat "${CONTEST_ID}${PROBLEM}"*.in > in.txt 2>/dev/null
    echo "Created in.txt"
fi

if ls "${CONTEST_ID}${PROBLEM}"*.out 1> /dev/null 2>&1; then
    echo "Found output files created by cf tool"
    # Combine all .out files into out.txt
    cat "${CONTEST_ID}${PROBLEM}"*.out > out.txt 2>/dev/null
    echo "Created out.txt"
fi

# Clean up individual test files if they exist
rm -f "${CONTEST_ID}${PROBLEM}"*.in "${CONTEST_ID}${PROBLEM}"*.out

if [ -f "in.txt" ] && [ -f "out.txt" ]; then
    echo "✓ Test cases pulled successfully!"
    echo "  Input: $(wc -l < in.txt) lines"
    echo "  Output: $(wc -l < out.txt) lines"
else
    echo "⚠ Could not automatically fetch test cases"
    echo "Please manually copy test cases from:"
    echo "  https://codeforces.com/contest/${CONTEST_ID}/problem/${PROBLEM}"
    echo ""
    echo "Create in.txt with sample inputs and out.txt with expected outputs"
fi
