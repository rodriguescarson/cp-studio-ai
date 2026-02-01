<div align="center">

# CFX - Codeforces Studio

**The Professional Codeforces Contest Workspace for VS Code & Cursor**

[![VS Code](https://img.shields.io/badge/VS%20Code-Compatible-blue)](https://code.visualstudio.com/)
[![Cursor](https://img.shields.io/badge/Cursor-Compatible-green)](https://cursor.sh/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

_Setup contests, test solutions, get AI-powered analysis, and submit with confidence—all from your editor._

</div>

---

## 🚀 Quick Start

### Step 1: Install VS Code or Cursor

**VS Code:**
- **macOS**: Download from [code.visualstudio.com](https://code.visualstudio.com/download) or install via Homebrew:
  ```bash
  brew install --cask visual-studio-code
  ```
- **Linux**: Download from [code.visualstudio.com](https://code.visualstudio.com/download) or install via package manager:
  ```bash
  # Ubuntu/Debian
  sudo apt update && sudo apt install code
  
  # Fedora/RHEL
  sudo dnf install code
  ```
- **Windows**: Download installer from [code.visualstudio.com](https://code.visualstudio.com/download) and run the `.exe` file

**Cursor:**
- Download from [cursor.sh](https://cursor.sh) for your platform
- Follow the installation wizard

### Step 2: Install C++ Compiler

**macOS:**
```bash
# Install Xcode Command Line Tools (includes g++)
xcode-select --install

# Verify installation
g++ --version
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install build-essential g++

# Verify installation
g++ --version
```

**Linux (Fedora/RHEL):**
```bash
sudo dnf groupinstall "Development Tools"
sudo dnf install gcc-c++

# Verify installation
g++ --version
```

**Windows:**
- **Option 1: MinGW-w64** (Recommended)
  1. Download from [mingw-w64.org](https://www.mingw-w64.org/downloads/)
  2. Or use MSYS2:
     ```bash
     # Install MSYS2 from https://www.msys2.org/
     # Then in MSYS2 terminal:
     pacman -S mingw-w64-x86_64-gcc
     ```
  3. Add to PATH: `C:\msys64\mingw64\bin`
  4. Verify: Open Command Prompt and run `g++ --version`

- **Option 2: Visual Studio Build Tools**
  1. Download [Build Tools for Visual Studio](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022)
  2. Install "Desktop development with C++" workload
  3. Use `cl.exe` compiler (extension will auto-detect)

### Step 3: Install Extension

**Option 1: Install from VSIX** (Recommended)

1. Download the latest `.vsix` file from [Releases](https://github.com/rodriguescarson/codeforces-contest-helper/releases)
2. Open VS Code/Cursor
3. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
4. Type: `Extensions: Install from VSIX...`
5. Select the downloaded `.vsix` file
6. Reload the window when prompted

**Option 2: Install from Marketplace** (Coming Soon)

1. Open VS Code/Cursor
2. Go to Extensions (`Cmd+Shift+X` or `Ctrl+Shift+X`)
3. Search for "CFX - Codeforces Studio"
4. Click Install

**Option 3: Install from Source**

```bash
git clone https://github.com/rodriguescarson/codeforces-contest-helper.git
cd codeforces-contest-helper
npm install
npm run compile
# Then install the .vsix file created in the directory
```

### Step 4: Verify Installation

1. **Open VS Code/Cursor**
2. **Check Extension**: Look for "CFX Studio" icon in the Activity Bar (left sidebar)
3. **Test Compiler**: Open terminal (`Ctrl+`` or `Cmd+``) and run:
   ```bash
   g++ --version
   ```
   You should see version information. If not, check Step 2.

### Step 5: First-Time Setup

1. **Configure AI (Optional but Recommended)**
   - Get a free API key from [OpenRouter.ai](https://openrouter.ai) (supports GPT-4, Claude, and more)
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
   - Type: `cfx: Configure API Key`
   - Paste your API key when prompted
   - Or manually: Settings (`Cmd+,` or `Ctrl+,`) → Search `codeforces.aiApiKey` → Enter key

2. **Setup Your Profile (Optional)**
   - Press `Cmd+Shift+P` → `cfx: Setup Profile`
   - Enter your Codeforces username
   - Or add to `.env` file: `CF_USERNAME=your_handle`

3. **You're Ready!** Start solving contests right away.

### Step 6: Run Your First Problem

1. **Setup a Problem**:
   - Press `Cmd+Shift+P` → `cfx: Setup Contest from URL`
   - Paste: `https://codeforces.com/contest/2112/problem/A`
   - Wait for setup to complete

2. **Open the Problem**:
   - Navigate to `contests/2112/A/main.cpp` in the file explorer
   - The file will open automatically

3. **Write Your Solution**:
   - Edit `main.cpp` with your solution
   - Save the file (`Cmd+S` or `Ctrl+S`)

4. **Run Tests**:
   - Click the ▶️ **Run Tests** button in the editor toolbar
   - Or press `Cmd+Shift+P` → `cfx: Run Tests`
   - View results in the Output panel

5. **Get AI Help** (if configured):
   - Click ✨ **AI Analysis** for code review
   - Or click 💬 **Open Chat** for interactive help

---

## ✨ Features

### 🎯 One-Click Problem Setup

Paste any problem URL from **Codeforces**, **LeetCode**, or **GeeksforGeeks** and instantly get:

- ✅ Organized directory structure
  - Codeforces: `contests/{contestId}/{problem}/`
  - LeetCode: `leetcode/{slug}/`
  - GeeksforGeeks: `geeksforgeeks/{problemName}-{problemId}/`
- ✅ Test cases automatically fetched
- ✅ C++ template ready to code
- ✅ Input/output files prepared
- ✅ Problem statement saved

**How to use:**

1. Press `Cmd+Shift+P` → `cfx: Setup Contest from URL`
2. Paste any supported URL:
   - Codeforces: `https://codeforces.com/contest/2112/problem/A`
   - LeetCode: `https://leetcode.com/problems/two-sum/`
   - GeeksforGeeks: `https://practice.geeksforgeeks.org/problems/two-sum/1`
3. Start coding!

**Supported Platforms:**
- ✅ Codeforces (contests and problemset)
- ✅ LeetCode (all problems)
- ✅ GeeksforGeeks (practice problems)

### ⚡ Instant Test Runner

Compile and test your solution with one click:

- ✅ Automatic compilation
- ✅ Runs against test cases
- ✅ Shows pass/fail results
- ✅ Displays expected vs actual output

**How to use:**

1. Open `main.cpp` in a contest directory
2. Click the ▶️ **Run Tests** button in the editor toolbar
3. See results instantly

### 🤖 AI-Powered Code Analysis

Get intelligent feedback on your solutions:

- ✅ Code review and bug detection
- ✅ Time/space complexity analysis
- ✅ Optimization suggestions
- ✅ Edge case identification
- ✅ Alternative approaches

**How to use:**

1. Open `main.cpp` in a contest directory
2. Click the ✨ **AI Analysis** button
3. Get instant feedback in the chat sidebar

### 💬 Interactive Chat Assistant

Chat with AI about your code:

- ✅ Context-aware conversations
- ✅ Code insertion (replace/insert/selection)
- ✅ Multiple chat sessions
- ✅ Code analysis on demand

**How to use:**

1. Click the 💬 **Open Chat** button
2. Ask questions about your code
3. Get help with debugging and optimization

### 📊 Contest & Profile Dashboard

Stay organized and track your progress:

- ✅ Upcoming contests list
- ✅ Profile stats with avatar
- ✅ Rating history
- ✅ Recent submissions

**How to use:**

- Open the **CFX Studio** sidebar (left panel)
- View contests, profile, and chat sessions

### 📋 Quick Actions

- **Copy Code**: One-click copy to clipboard for submission
- **Setup from Contest**: Browse and setup from upcoming contests
- **Pull Problem Sets**: One-click pull from A2OJ Ladder, NeetCode 150, Love Babbar 450, Striver's Sheet
- **Refresh Data**: Update contests and profile info

### 📚 Problem Sets Integration

Pull problems from popular curated lists:

- **A2OJ Ladders**: Codeforces problems organized by difficulty
- **NeetCode 150**: Essential LeetCode problems
- **Love Babbar 450**: DSA sheet with GeeksforGeeks & LeetCode problems
- **Striver's Sheet**: Comprehensive LeetCode problem list

**How to use:**

1. Open CFX Studio sidebar
2. Click problem set buttons (A2OJ, NeetCode, Love Babbar, Striver's)
3. Select a ladder/problem set
4. Choose a problem to setup
5. Start solving!

---

## 📖 Detailed Usage Guide

### Setting Up a Problem

**Method 1: From URL** (Supports Codeforces, LeetCode, GeeksforGeeks)

```
Cmd+Shift+P → "cfx: Setup Contest from URL"
→ Paste any supported URL:
  - Codeforces: https://codeforces.com/contest/2112/problem/A
  - LeetCode: https://leetcode.com/problems/two-sum/
  - GeeksforGeeks: https://practice.geeksforgeeks.org/problems/two-sum/1
```

**Method 2: From Contest List** (Codeforces only)

1. Open CFX Studio sidebar
2. Click on any contest in "Upcoming Contests"
3. Select a problem to setup

**Method 3: From Problem Sets** (A2OJ, NeetCode, Love Babbar, Striver's)

1. Open CFX Studio sidebar
2. Click problem set button (A2OJ, NeetCode, Love Babbar, or Striver's)
3. Select a ladder/problem set
4. Choose a problem to setup

### Running Tests

1. **Open** `contests/{contestId}/{problem}/main.cpp` (or `leetcode/{slug}/main.cpp` or `geeksforgeeks/{problem}/main.cpp`)
2. **Click** the ▶️ button in editor toolbar
3. **View** results in Output channel

**What happens:**

- Code compiles with `g++` (or `cl.exe` on Windows if MinGW not available)
- Runs with `in.txt` as input
- Compares output with `out.txt`
- Shows detailed pass/fail results

**Command Line Alternative:**

```bash
# Navigate to problem directory
cd contests/2112/A

# Compile
g++ -std=c++17 -O2 -Wall -o main main.cpp

# Run with test input
./main < in.txt

# Compare output (Linux/macOS)
diff <(./main < in.txt) out.txt

# Windows (PowerShell)
Get-Content in.txt | .\main.exe | Out-File actual.txt
Compare-Object (Get-Content out.txt) (Get-Content actual.txt)
```

### Using AI Analysis

**Prerequisites:** Configure API key first (see Quick Start)

**Method 1: Quick Analysis**

- Click ✨ **AI Analysis** button
- Get instant review in output channel

**Method 2: Chat Interface**

- Click 💬 **Open Chat** button
- Ask specific questions
- Get interactive help

### Copying Code for Submission

1. Open `main.cpp`
2. Click 📋 **Copy Code** button
3. Paste directly into Codeforces submission form

---

## ⚙️ Configuration

### Settings

Open Settings (`Cmd+,` or `Ctrl+,`) and search for "codeforces":

| Setting                   | Description                                                 | Default                       |
| ------------------------- | ----------------------------------------------------------- | ----------------------------- |
| `codeforces.contestsPath` | Path to contests directory                                  | `${workspaceFolder}/contests` |
| `codeforces.leetcodePath` | Path to LeetCode problems directory                        | `${workspaceFolder}/leetcode` |
| `codeforces.geeksforgeeksPath` | Path to GeeksforGeeks problems directory                  | `${workspaceFolder}/geeksforgeeks` |
| `codeforces.aiProvider`   | AI provider (`openrouter`, `openai`, `anthropic`, `custom`) | `openrouter`                  |
| `codeforces.aiApiKey`     | Your API key for AI features                                | (empty)                       |
| `codeforces.aiModel`      | Model to use (e.g., `openai/gpt-4`)                         | `openai/gpt-4`                |
| `codeforces.aiBaseUrl`    | Custom API base URL (for custom providers)                  | (empty)                       |
| `codeforces.username`     | Codeforces username for profile features                    | (empty)                       |

### Environment Variables (Optional)

Create `.env` file in workspace root:

```env
# Codeforces API (optional - for authenticated access)
KEY=your_codeforces_api_key
SECRET=your_codeforces_api_secret
CF_USERNAME=your_handle

# Contest Filters (optional)
CONTEST_FILTER=div2,div3
REMINDER_TIMES=15,30,60
INCLUDE_GYM=false
```

**Get Codeforces API credentials:** https://codeforces.com/settings/api

---

## 🎨 UI Overview

### Sidebar Panels

**CFX Studio** sidebar contains:

- 📅 **Upcoming Contests** - Browse and setup contests
- 👤 **Profile** - View stats, rating, submissions
- 💬 **Chats** - Manage AI chat sessions

### Editor Toolbar Buttons

When editing `main.cpp` in a contest directory:

- ▶️ **Run Tests** - Compile and test
- ✨ **AI Analysis** - Get code review
- 💬 **Open Chat** - Start AI conversation
- 📋 **Copy Code** - Copy to clipboard

### Commands

Access via Command Palette (`Cmd+Shift+P`):

- `cfx: Setup Contest from URL`
- `cfx: Run Tests`
- `cfx: Open Chat`
- `cfx: Configure API Key`
- `cfx: Setup Profile`
- `cfx: Refresh Contests`
- `cfx: Refresh Profile`

---

## 🔧 Requirements

### Required

- **VS Code** 1.80+ or **Cursor** (any version)
- **C++ Compiler** (`g++` recommended, or `cl.exe` on Windows)
  - macOS: Xcode Command Line Tools
  - Linux: `build-essential` package (Ubuntu/Debian) or `Development Tools` (Fedora/RHEL)
  - Windows: MinGW-w64 or Visual Studio Build Tools

### Optional

- **AI API Key** - For AI features (get from [OpenRouter.ai](https://openrouter.ai))
- **Codeforces Account** - For profile features
- **`cf` CLI Tool** - Alternative test case fetcher (install separately)

### System Requirements

- **macOS**: 10.13+ (High Sierra or later)
- **Linux**: Any modern distribution (Ubuntu 18.04+, Fedora 30+, etc.)
- **Windows**: Windows 10 or later
- **RAM**: 4GB minimum (8GB recommended)
- **Disk Space**: ~200MB for extension + compiler

---

## 🆘 Troubleshooting

### Extension Not Working

- **Check VS Code version**: Requires 1.80+
- **Reload window**: `Cmd+Shift+P` → "Developer: Reload Window"
- **Check Output**: View → Output → Select "cfx - codeforce studio"

### Tests Not Running

- **Verify compiler**: 
  - Open terminal (`Ctrl+`` or `Cmd+``)
  - Run `g++ --version` (should show version info)
  - If not found, see [Step 2: Install C++ Compiler](#step-2-install-c-compiler) above
- **Check file location**: Must be in `contests/{contestId}/{problem}/main.cpp` (or `leetcode/{slug}/main.cpp` or `geeksforgeeks/{problem}/main.cpp`)
- **Check test files**: Ensure `in.txt` and `out.txt` exist in the same directory as `main.cpp`
- **Windows-specific**: Ensure MinGW or Visual Studio compiler is in your PATH

### AI Features Not Working

- **Check API key**: Settings → `codeforces.aiApiKey`
- **Verify key is valid**: Test at [OpenRouter.ai](https://openrouter.ai)
- **Check account balance**: Ensure API account has credits
- **View errors**: Check Output channel for details

### Profile Not Loading

- **Verify username**: Check `.env` file or settings
- **Check internet**: Ensure Codeforces API is accessible
- **Try refresh**: Use `cfx: Refresh Profile` command

### Need More Help?

- 📖 See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed solutions
- 🐛 [Report Issues](https://github.com/rodriguescarson/codeforces-contest-helper/issues)
- 💬 Check [API_SUMMARY.md](API_SUMMARY.md) for API setup help

---

## 🎯 Use Cases

### Competitive Programming Practice

- Setup problems instantly
- Test solutions locally
- Get AI feedback before submitting
- Track progress with profile stats

### Contest Preparation

- Browse upcoming contests
- Setup problems in advance
- Practice with test cases
- Review solutions with AI

### Learning & Improvement

- Understand code complexity
- Learn optimization techniques
- Get alternative approaches
- Review edge cases

---

## 🔐 Privacy & Security

- ✅ **No Data Collection**: Extension doesn't collect or store user data
- ✅ **Local Storage**: All data stays on your machine
- ✅ **Encrypted Keys**: API keys stored securely in VS Code settings
- ✅ **HTTPS Only**: All API calls use secure connections
- ✅ **BYOK Model**: You provide your own API keys

---

## 📚 Additional Resources

- 📖 [OpenRouter Setup Guide](OPENROUTER_SETUP.md) - Detailed AI setup
- 🔌 [API Summary](API_SUMMARY.md) - All APIs explained
- 🚀 [Production Deployment](PRODUCTION_DEPLOYMENT.md) - For developers
- 🐛 [Troubleshooting Guide](TROUBLESHOOTING.md) - Common issues

---

## 🤝 Contributing

Contributions welcome! See our [GitHub](https://github.com/rodriguescarson/codeforces-contest-helper) for:

- Bug reports
- Feature requests
- Pull requests
- Documentation improvements

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built for the competitive programming community
- Powered by Codeforces API
- AI features via OpenRouter, OpenAI, and Anthropic

---

<div align="center">

**Made with ❤️ for competitive programmers**

[⭐ Star on GitHub](https://github.com/rodriguescarson/codeforces-contest-helper) • [📝 Report Issue](https://github.com/rodriguescarson/codeforces-contest-helper/issues) • [📖 Documentation](https://github.com/rodriguescarson/codeforces-contest-helper#readme)

</div>

Your extension is published.
Listing (after it’s indexed): https://marketplace.visualstudio.com/items?itemName=rodriguescarson.cf-studio
Manage / future versions: https://marketplace.visualstudio.com/manage/publishers/rodriguescarson/extensions/cf-studio/hub
