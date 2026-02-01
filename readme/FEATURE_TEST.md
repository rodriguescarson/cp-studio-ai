# Feature Testing Guide

## ✅ Feature 1: URL Setup

**Status:** Working ✓

**How to test:**

1. `Cmd+Shift+P` → `Setup Contest from URL`
2. Paste: `https://codeforces.com/contest/2112` or `https://codeforces.com/contest/2112/problem/A`
3. Should create files and open `main.cpp`

---

## 🧪 Feature 2: Test Runner

**Status:** Should work - needs testing

**How to test:**

1. Open a `main.cpp` file in a contest directory (e.g., `contests/2113/B/main.cpp`)
2. **Method 1:** Click the ▶️ (play) button in the editor toolbar (top right)
3. **Method 2:** `Cmd+Shift+P` → `Run Tests`

**Expected behavior:**

- Compiles your code
- Runs with `in.txt` as input
- Compares output with `out.txt`
- Shows pass/fail in output channel

**If buttons don't appear:**

- Make sure file path matches: `contests/*/main.cpp`
- File must be saved
- Reload Cursor window

---

## ✨ Feature 3: AI Analysis

**Status:** Should work - needs API key configuration

**How to test:**

1. **First, configure API key:**
   - `Cmd+,` (Settings)
   - Search: `codeforces.aiApiKey`
   - Enter your OpenAI/Anthropic API key
   - Set `codeforces.aiProvider` (openai/anthropic/custom)
   - Set `codeforces.aiModel` (e.g., gpt-4, claude-3-opus)

2. **Then use the feature:**
   - Open a `main.cpp` file
   - **Method 1:** Click the ✨ (sparkle) button in editor toolbar
   - **Method 2:** `Cmd+Shift+P` → `AI Analysis`

**Expected behavior:**

- Sends code to AI for analysis
- Shows results in output channel
- Opens a markdown document with analysis

**If it doesn't work:**

- Check API key is set correctly
- Check Output channel for errors
- Verify you have API credits/quota

---

## 📋 Feature 4: Copy Code

**Status:** Should work - needs testing

**How to test:**

1. Open a `main.cpp` file
2. **Method 1:** Click the 📋 (copy) button in editor toolbar
3. **Method 2:** `Cmd+Shift+P` → `Copy Code to Clipboard`
4. Paste somewhere to verify

**Expected behavior:**

- Copies entire file content to clipboard
- Shows confirmation message

---

## Troubleshooting

### Buttons not appearing in editor toolbar?

- File must be: `contests/*/main.cpp`
- File must be saved
- Reload Cursor: `Cmd+R` or `Developer: Reload Window`

### Commands not found?

- Check extension is installed and enabled
- Check Output panel for activation errors
- Reload Cursor window

### Test runner fails?

- Ensure `g++` is installed: `g++ --version`
- Check `in.txt` and `out.txt` exist
- Check Output channel for compilation errors

### AI Analysis fails?

- Verify API key is set in settings
- Check API provider settings
- Check Output channel for API errors
- Ensure you have API credits
