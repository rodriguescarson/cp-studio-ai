# Features Overview

## ✨ Core Features

### 1. URL-Based Setup

**What it does:**

- Paste a Codeforces contest/problem URL
- Automatically creates directory structure
- Fetches test cases (via `cf` CLI or web scraping)
- Creates `main.cpp` template
- Opens file ready for coding

**Supported URLs:**

- `https://codeforces.com/contest/2112/problem/A`
- `https://codeforces.com/problemset/problem/2112/A`

**How to use:**

- Command Palette: `Setup Contest from URL`
- Or right-click in Explorer → `Setup Contest from URL`

---

### 2. One-Click Test Runner

**What it does:**

- Compiles your C++ code
- Runs with `in.txt` as input
- Compares output with `out.txt`
- Shows pass/fail results

**Features:**

- ✅ Automatic compilation with `g++ -std=c++17 -O2`
- ✅ Runtime error detection
- ✅ Output comparison
- ✅ Detailed error messages

**How to use:**

- Click ▶️ button in editor toolbar
- Or Command Palette: `Run Tests`

---

### 3. AI Code Analysis (BYOK)

**What it does:**

- Analyzes your code using AI
- Provides code review
- Suggests optimizations
- Identifies potential bugs
- Analyzes time/space complexity

**Supported Providers:**

- OpenAI (GPT-4, GPT-3.5, etc.)
- Anthropic (Claude)
- Custom API endpoints

**What you get:**

1. Code review and bug detection
2. Complexity analysis
3. Optimization suggestions
4. Edge case identification
5. Alternative approaches

**How to use:**

1. Set your API key in Settings (`codeforces.aiApiKey`)
2. Click ✨ button in editor toolbar
3. Get instant analysis!

**Privacy:**

- Uses YOUR API key (BYOK - Bring Your Own Key)
- No data sent to third parties
- You control the AI provider

---

### 4. One-Click Copy to Clipboard

**What it does:**

- Copies entire code to clipboard
- Ready to paste into Codeforces
- Shows confirmation message

**How to use:**

- Click 📋 button in editor toolbar
- Or Command Palette: `Copy Code to Clipboard`

---

## 🎨 UI Integration

### Editor Toolbar Buttons

When you open a `main.cpp` file in a contest directory, you'll see:

- ▶️ **Run Tests** - Compile and test your solution
- ✨ **AI Analysis** - Get AI-powered code review
- 📋 **Copy Code** - Copy to clipboard for submission

### Command Palette

All features available via Command Palette (`Cmd+Shift+P`):

- `Codeforces: Setup Contest from URL`
- `Codeforces: Run Tests`
- `Codeforces: AI Analysis`
- `Codeforces: Copy Code to Clipboard`

---

## ⚙️ Configuration

### Settings

Access via `Cmd+,` (Mac) or `Ctrl+,` (Windows/Linux)

| Setting                   | Description                           | Default                       |
| ------------------------- | ------------------------------------- | ----------------------------- |
| `codeforces.contestsPath` | Path to contests directory            | `${workspaceFolder}/contests` |
| `codeforces.aiProvider`   | AI provider (openai/anthropic/custom) | `openai`                      |
| `codeforces.aiApiKey`     | Your API key for AI analysis          | (empty)                       |
| `codeforces.aiModel`      | Model to use                          | `gpt-4`                       |
| `codeforces.aiBaseUrl`    | Custom API base URL                   | (empty)                       |

---

## 🔧 Requirements

### Required

- VS Code or Cursor (v1.80+)
- C++ compiler (`g++`) for test runner

### Optional

- `cf` CLI tool for automatic test case fetching
- AI API key for code analysis feature

---

## 📝 File Structure Created

When you setup a contest, the extension creates:

```
contests/
└── 2112/
    └── A/
        ├── main.cpp    (template code)
        ├── in.txt      (test inputs)
        └── out.txt     (expected outputs)
```

---

## 🚀 Workflow Example

1. **Setup**: `Cmd+Shift+P` → "Setup Contest from URL" → Paste URL
2. **Code**: Write solution in `main.cpp`
3. **Test**: Click ▶️ → See results
4. **Analyze**: Click ✨ → Get AI feedback (optional)
5. **Fix**: Make improvements based on feedback
6. **Test Again**: Click ▶️ → Verify fixes
7. **Submit**: Click 📋 → Paste into Codeforces

---

## 💡 Tips

- **Test Cases**: If automatic fetching fails, manually copy from Codeforces website
- **AI Analysis**: Works best with GPT-4 or Claude Opus models
- **Keyboard Shortcuts**: Consider setting up custom keybindings for frequent commands
- **Multiple Problems**: Setup each problem separately using their URLs

---

## 🐛 Troubleshooting

**Extension not activating?**

- Check Output panel for errors
- Ensure `npm run compile` completed successfully
- Restart VS Code/Cursor

**Tests not running?**

- Verify `g++` is installed: `g++ --version`
- Check `in.txt` and `out.txt` exist
- Check Output panel for compilation errors

**AI analysis failing?**

- Verify API key is set correctly
- Check API provider settings
- Ensure you have API credits/quota
- Check Output panel for error details
