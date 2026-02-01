#!/bin/bash

# Test runner for C++ Codeforces problems
# Usage: ./runtest.sh <problem_dir>
# Example: ./runtest.sh contests/2193/A

if [ $# -eq 0 ]; then
    echo "Usage: ./runtest.sh <problem_dir>"
    echo "Example: ./runtest.sh 2193/A"
    exit 1
fi

PROBLEM_DIR=$1
CPP_FILE="$PROBLEM_DIR/main.cpp"
INPUT_FILE="$PROBLEM_DIR/in.txt"
OUTPUT_FILE="$PROBLEM_DIR/out.txt"
EXECUTABLE="$PROBLEM_DIR/main"

if [ ! -f "$CPP_FILE" ]; then
    echo "Error: $CPP_FILE not found"
    exit 1
fi

echo "Compiling $CPP_FILE..."
g++ -std=c++17 -O2 -Wall -o "$EXECUTABLE" "$CPP_FILE"

if [ $? -ne 0 ]; then
    echo "Compilation failed!"
    exit 1
fi

echo "Running tests..."
if [ -f "$INPUT_FILE" ]; then
    if [ -f "$OUTPUT_FILE" ]; then
        echo "Comparing output with expected output..."
        "$EXECUTABLE" < "$INPUT_FILE" | diff - "$OUTPUT_FILE"
        if [ $? -eq 0 ]; then
            echo "✓ All tests passed!"
        else
            echo "✗ Output mismatch"
            echo "Your output:"
            "$EXECUTABLE" < "$INPUT_FILE"
            echo ""
            echo "Expected output:"
            cat "$OUTPUT_FILE"
        fi
    else
        echo "Running with input file..."
        "$EXECUTABLE" < "$INPUT_FILE"
    fi
else
    echo "No input file found. Running interactively..."
    "$EXECUTABLE"
fi

# Cleanup
rm -f "$EXECUTABLE"
