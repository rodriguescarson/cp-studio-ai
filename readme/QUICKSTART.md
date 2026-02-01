# Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Install Dependencies

```bash
cd .vscode-extension
npm install
npm run compile
```

### Step 2: Launch Extension

- Press `F5` in VS Code/Cursor to open Extension Development Host
- The extension will be active in the new window

### Step 3: Use It!

#### Setup a Contest Problem

1. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type: `Setup Contest from URL`
3. Paste: `https://codeforces.com/contest/2112/problem/A`
4. ✨ Magic! Files are created automatically

#### Run Tests

- Click the ▶️ (play) button in the editor toolbar
- Or use command: `Run Tests`

#### AI Analysis

1. Configure your API key in Settings:
   - Search: `codeforces.aiApiKey`
   - Enter your OpenAI/Anthropic API key
2. Click the ✨ (sparkle) button in the editor toolbar
3. Get instant code analysis!

#### Copy Code

- Click the 📋 (copy) button in the editor toolbar
- Your code is copied, ready to paste!

## 📋 Configuration Checklist

- [ ] Set `codeforces.contestsPath` (default: `${workspaceFolder}/contests`)
- [ ] Set `codeforces.aiApiKey` (for AI analysis)
- [ ] Choose `codeforces.aiProvider` (openai/anthropic/custom)
- [ ] Install `g++` compiler (for test runner)

## 🎯 Example Workflow

1. **Setup**: `Cmd+Shift+P` → "Setup Contest from URL" → Paste URL
2. **Code**: Write your solution in `main.cpp`
3. **Test**: Click ▶️ button to run tests
4. **Analyze**: Click ✨ button for AI feedback (optional)
5. **Submit**: Click 📋 button → Paste into Codeforces

That's it! Happy coding! 🎉
