<div align="center">

# CP Studio

**The All-in-One Competitive Programming Workspace for VS Code & Cursor**

[![VS Code](https://img.shields.io/badge/VS%20Code-Compatible-blue)](https://code.visualstudio.com/)
[![Cursor](https://img.shields.io/badge/Cursor-Compatible-green)](https://cursor.sh/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

_One extension. Multiple platforms. Zero confusion. Everything you need to master competitive programming—all in your editor._

</div>

---

## 📝 Description

**CP Studio** is a comprehensive VS Code and Cursor extension designed for competitive programmers who want a unified, distraction-free coding experience. Whether you're practicing on Codeforces, LeetCode, or GeeksforGeeks, CP Studio provides everything you need: instant problem setup, local testing, AI-powered code analysis, progress tracking, and seamless submission workflows—all without leaving your editor.

**Why CP Studio?** Because competitive programming shouldn't require juggling multiple tools, browser tabs, and workflows. One extension. One workflow. One focus: solving problems.

**Open Source:** CP Studio is open source software (MIT License). Contributions welcome! See the [Contributing](#-contributing) section for details.

**🌐 Project Page:** Visit [carsonrodrigues.com/cp-studio](https://www.carsonrodrigues.com/cp-studio) for more information, demos, and updates.

---

## ✨ Features

### 🎯 Multi-Platform Problem Setup

Setup problems from **Codeforces**, **LeetCode**, and **GeeksforGeeks** with a single command:

- ✅ **URL-Based Setup**: Paste any problem URL and get instant setup
  - Codeforces: `https://codeforces.com/contest/2112/problem/A`
  - LeetCode: `https://leetcode.com/problems/two-sum/`
  - GeeksforGeeks: `https://practice.geeksforgeeks.org/problems/two-sum/1`
- ✅ **Automatic Directory Structure**: Organized folders for each platform
  - Codeforces: `contests/{contestId}/{problem}/`
  - LeetCode: `leetcode/{slug}/`
  - GeeksforGeeks: `geeksforgeeks/{problemName}-{problemId}/`
- ✅ **Test Cases Auto-Fetch**: Input/output files downloaded automatically
- ✅ **Problem Statements**: Saved locally for offline reference
- ✅ **C++ Template**: Ready-to-code template file created instantly

**How to use:**
```
Cmd+Shift+P → "CP Studio: Setup Problem from URL"
→ Paste any supported URL
→ Start coding immediately!
```

### ⚡ Instant Test Runner

Compile and test your solutions with one click:

- ✅ **One-Click Testing**: Click ▶️ button in editor toolbar
- ✅ **Automatic Compilation**: Uses `g++` with optimized flags (`-std=c++17 -O2`)
- ✅ **Test Case Execution**: Runs against `in.txt` automatically
- ✅ **Output Comparison**: Compares with `out.txt` and shows differences
- ✅ **Detailed Results**: Pass/fail status with expected vs actual output
- ✅ **Runtime Error Detection**: Catches crashes and exceptions
- ✅ **Cross-Platform**: Works on macOS, Linux, and Windows

**How to use:**
1. Open `main.cpp` in any problem directory
2. Click the ▶️ **Run Tests** button
3. View results instantly in the Output panel

### 🤖 AI-Powered Code Analysis (BYOK)

Get intelligent feedback on your solutions using your own API key:

- ✅ **Code Review**: Automated analysis of your code quality
- ✅ **Bug Detection**: Identifies potential errors and edge cases
- ✅ **Complexity Analysis**: Time and space complexity breakdown
- ✅ **Optimization Suggestions**: Performance improvement recommendations
- ✅ **Alternative Approaches**: Different solution strategies
- ✅ **Privacy-First**: Uses YOUR API key (BYOK - Bring Your Own Key)
- ✅ **Multiple Providers**: Supports OpenRouter, OpenAI, Anthropic, or custom APIs
- ✅ **Web Search Integration**: Optional web search for latest solutions (GPT-4o:online)

**Supported AI Providers:**
- OpenRouter (recommended - access to multiple models)
- OpenAI (GPT-4, GPT-3.5, etc.)
- Anthropic (Claude)
- Custom API endpoints

**How to use:**
1. Configure API key: `Cmd+Shift+P` → "CP Studio: Configure API Key"
2. Click ✨ **AI Analysis** button for instant review
3. Or use 💬 **Open Chat** for interactive help

### 💬 Interactive Chat Assistant

Context-aware AI conversations about your code:

- ✅ **Context-Aware**: Automatically includes your current code and problem statement
- ✅ **Multiple Sessions**: Manage separate chats for different problems
- ✅ **Code Insertion**: Insert AI suggestions directly into your editor
  - Replace entire file
  - Insert at cursor
  - Replace selection
- ✅ **Chat History**: Access previous conversations
- ✅ **Problem-Specific**: Each chat session tied to a specific problem
- ✅ **Real-Time Updates**: Chat updates when you switch files

**How to use:**
1. Click 💬 **Open Chat** button
2. Ask questions about your code
3. Get help with debugging, optimization, or understanding algorithms

### 📊 Contest & Profile Dashboard

Stay organized and track your progress:

- ✅ **Upcoming Contests**: Browse Codeforces contests directly in sidebar
- ✅ **One-Click Setup**: Setup contest problems without leaving editor
- ✅ **Profile Stats**: View your Codeforces profile with avatar
- ✅ **Rating History**: Track your rating progress over time
- ✅ **Recent Submissions**: See your latest solved problems
- ✅ **Auto-Refresh**: Contests and profile update automatically

**How to use:**
- Open **CP Studio** sidebar (left panel)
- View contests, profile stats, and solved problems
- Click any contest to setup problems instantly

### 📚 Curated Problem Sets

Pull problems from popular curated lists:

- ✅ **A2OJ Ladders**: Codeforces problems organized by difficulty
- ✅ **NeetCode 150**: Essential LeetCode problems for interviews
- ✅ **NeetCode Blind 75**: Core interview problems
- ✅ **Love Babbar 450**: DSA sheet with GeeksforGeeks & LeetCode problems
- ✅ **Striver's Sheet**: Comprehensive LeetCode problem list
- ✅ **Pattern-Based**: Filter by algorithm patterns (DP, Graphs, etc.)

**How to use:**
1. Open CP Studio sidebar
2. Click problem set buttons (A2OJ, NeetCode, Love Babbar, Striver's)
3. Select a ladder/problem set
4. Choose a problem to setup
5. Start solving!

### ✅ Solved Problems Tracking

Track your progress across all platforms:

- ✅ **Auto-Detection**: Automatically detects solved Codeforces problems
- ✅ **Visual Indicators**: File decorations show which problems you've solved
- ✅ **Solved Problems View**: Browse all your solved problems
- ✅ **Quick Access**: Click to open solved problems instantly
- ✅ **Progress Tracking**: See your submission count and solve rate
- ✅ **Auto-Refresh**: Background refresh keeps data up-to-date
- ✅ **Cache System**: Fast access with intelligent caching

**How to use:**
- View solved problems in the **CP Studio** sidebar
- See checkmarks on solved problem files in explorer
- Refresh manually: `Cmd+Shift+P` → "CP Studio: Refresh Solved Problems"

### 📋 Quick Actions

Essential shortcuts for competitive programming:

- ✅ **Copy Code**: One-click copy to clipboard for submission
- ✅ **Setup from Contest**: Browse and setup from upcoming contests
- ✅ **Refresh Data**: Update contests, profile, and solved problems
- ✅ **Clear Chat**: Start fresh conversations
- ✅ **Chat History**: Access previous AI conversations

---

## 🎨 Theme Suggestions

CP Studio's logo features a **cyber-professional** aesthetic with electric blue, neon cyan, and dark obsidian colors. Here are theme recommendations that perfectly match this high-tech, competitive programming vibe:

### 🎯 Perfect Matches (Cyber-Professional):
- **One Dark Pro** ⭐ **RECOMMENDED** - Electric blue accents, dark obsidian base, neon highlights
- **Dracula** - Deep purple/blue tones with neon accents, matches the glowing aesthetic
- **Cyberpunk** - Neon cyan and electric blue highlights on dark backgrounds
- **Tokyo Night** - Dark obsidian with electric blue accents
- **Shades of Purple** - Dark base with vibrant blue/purple highlights

### 🔷 Blue-Toned Themes (Electric Blue Focus):
- **Nord** - Calming electric blue tones, professional look
- **GitHub Dark** - Clean dark with blue accents
- **Material Theme Darker** - Dark obsidian with blue highlights
- **Night Owl** - Dark theme optimized for blue tones

### ⚡ High-Contrast Cyber Themes:
- **Monokai** - Classic high contrast, great for spotting errors
- **Dark+** (Default Dark) - Clean and professional
- **Solarized Dark** - Professional dark theme with blue accents

### 🎨 Custom Theme Configuration:

To match CP Studio's cyber-professional aesthetic, customize your theme with:

```json
{
  "workbench.colorCustomizations": {
    "[Your Theme]": {
      "activityBar.background": "#0a0e1a",      // Dark obsidian
      "activityBar.foreground": "#00d9ff",      // Neon cyan
      "activityBarBadge.background": "#0066ff",  // Electric blue
      "statusBar.background": "#0a0e1a",        // Dark obsidian
      "statusBar.foreground": "#00d9ff",        // Neon cyan
      "titleBar.activeBackground": "#0a0e1a",    // Dark obsidian
      "titleBar.activeForeground": "#00d9ff"    // Neon cyan
    }
  }
}
```

### Color Palette Reference:
- **Electric Blue**: `#0066ff` / `#00a8ff` - Primary accent color
- **Neon Cyan**: `#00d9ff` / `#00ffff` - Secondary accent, highlights
- **Dark Obsidian**: `#0a0e1a` / `#1a1f2e` - Base background
- **Glow Effect**: Use subtle blue/cyan glows for active elements

### Why These Themes Work:
- **Dark obsidian backgrounds** reduce eye strain during long coding sessions
- **Electric blue accents** match the logo's lightning bolt aesthetic
- **Neon cyan highlights** provide clear visual feedback
- **High contrast** helps spot syntax errors quickly
- **Cyber-professional look** matches the competitive programming mindset

---

## 🎯 Vision

**One Sport. No Confusion.**

Competitive programming is about solving problems, not managing tools. CP Studio was built with a single vision: **eliminate distractions and let you focus on what matters—coding.**

### Our Philosophy:

1. **Unified Experience**: One extension for all platforms. No switching between tools.
2. **Zero Friction**: Setup problems in seconds. Test instantly. Submit confidently.
3. **Privacy First**: Your code stays local. Your API keys stay yours.
4. **Open & Transparent**: Built by a competitive programmer, for competitive programmers.
5. **One Workflow**: From problem to solution to submission—all in your editor.

### What Makes Us Different:

- ✅ **Multi-Platform**: Codeforces, LeetCode, GeeksforGeeks—all in one place
- ✅ **No Browser Required**: Everything happens in your editor
- ✅ **Local Testing**: Test before submitting, catch errors early
- ✅ **AI Integration**: Get help when you need it, not when a website decides
- ✅ **Progress Tracking**: See your growth, stay motivated
- ✅ **Curated Lists**: Access popular problem sets instantly

---

## 💡 Why CP Studio?

### For Competitive Programmers:

- **Save Time**: Setup problems in seconds, not minutes
- **Test Locally**: Catch bugs before submitting
- **Stay Focused**: No browser tabs, no distractions
- **Track Progress**: See your solved problems at a glance
- **Get Help**: AI assistance when you're stuck

### For Interview Preparation:

- **LeetCode Integration**: Practice interview problems seamlessly
- **NeetCode Support**: Access curated problem lists instantly
- **Pattern Learning**: Filter by algorithm patterns
- **Progress Tracking**: Monitor your preparation journey

### For Learning:

- **Problem Statements**: Saved locally for offline study
- **Test Cases**: Understand edge cases with real examples
- **AI Analysis**: Learn from code reviews and optimizations
- **Multiple Platforms**: Practice across different problem styles

### Technical Advantages:

- ✅ **Fast**: Local operations, minimal API calls
- ✅ **Reliable**: Works offline for most features
- ✅ **Secure**: Your code never leaves your machine (except AI analysis with your key)
- ✅ **Cross-Platform**: macOS, Linux, Windows support
- ✅ **Lightweight**: Minimal resource usage
- ✅ **Extensible**: Easy to add new platforms and features

---

## 🚀 Quick Start

### Step 1: Install Extension

**VS Code / Cursor:**
1. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type: `Extensions: Install from VSIX...`
3. Select the downloaded `.vsix` file
4. Or install from [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=rodriguescarson.cf-studio)

### Step 2: Install C++ Compiler

**macOS:**
```bash
xcode-select --install
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update && sudo apt install build-essential g++
```

**Windows:**
- Install [MinGW-w64](https://www.mingw-w64.org/downloads/) or
- Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/)

### Step 3: Configure (Optional)

1. **AI Features** (Recommended):
   - Get API key from [OpenRouter.ai](https://openrouter.ai)
   - `Cmd+Shift+P` → "CP Studio: Configure API Key"

2. **Codeforces Profile** (Optional):
   - `Cmd+Shift+P` → "CP Studio: Setup Profile"
   - Enter your Codeforces username

### Step 4: Start Solving!

1. `Cmd+Shift+P` → "CP Studio: Setup Problem from URL"
2. Paste: `https://codeforces.com/contest/2112/problem/A`
3. Code, test, and submit!

---

## 📖 Detailed Usage Guide

### Setting Up a Problem

**Method 1: From URL** (All Platforms)
```
Cmd+Shift+P → "CP Studio: Setup Problem from URL"
→ Paste URL (Codeforces/LeetCode/GeeksforGeeks)
```

**Method 2: From Contest List** (Codeforces)
- Open CP Studio sidebar
- Click any contest in "Upcoming Contests"
- Select a problem

**Method 3: From Problem Sets**
- Open CP Studio sidebar
- Click problem set button (A2OJ, NeetCode, etc.)
- Select ladder/problem set
- Choose a problem

### Running Tests

1. Open `main.cpp` in any problem directory
2. Click ▶️ **Run Tests** button
3. View results in Output panel

**What happens:**
- Code compiles with `g++ -std=c++17 -O2`
- Runs with `in.txt` as input
- Compares output with `out.txt`
- Shows detailed pass/fail results

### Using AI Features

**Quick Analysis:**
- Click ✨ **AI Analysis** button
- Get instant code review

**Interactive Chat:**
- Click 💬 **Open Chat** button
- Ask questions, get help
- Insert code suggestions directly

**Configure API:**
- `Cmd+Shift+P` → "CP Studio: Configure API Key"
- Or Settings → `codeforces.aiApiKey`

### Tracking Progress

- **View Solved Problems**: Open "Solved Problems" view in sidebar
- **File Decorations**: See checkmarks on solved problem files
- **Refresh**: `Cmd+Shift+P` → "CP Studio: Refresh Solved Problems"
- **Auto-Refresh**: Enabled by default (refreshes every hour)

---

## ⚙️ Configuration

### Settings

Open Settings (`Cmd+,` or `Ctrl+,`) and search for "codeforces":

| Setting | Description | Default |
|---------|-------------|---------|
| `codeforces.contestsPath` | Path to Codeforces contests directory | `${workspaceFolder}/contests` |
| `codeforces.leetcodePath` | Path to LeetCode problems directory | `${workspaceFolder}/leetcode` |
| `codeforces.geeksforgeeksPath` | Path to GeeksforGeeks problems directory | `${workspaceFolder}/geeksforgeeks` |
| `codeforces.aiProvider` | AI provider (`openrouter`, `openai`, `anthropic`, `custom`) | `openrouter` |
| `codeforces.aiApiKey` | Your API key for AI features | (empty) |
| `codeforces.aiModel` | Model to use (e.g., `openai/gpt-4o:online`) | `openai/gpt-4o:online` |
| `codeforces.aiBaseUrl` | Custom API base URL (for custom providers) | (empty) |
| `codeforces.username` | Codeforces username for profile features | (empty) |
| `codeforces.autoRefreshSolved` | Auto-refresh solved problems on activation | `true` |
| `codeforces.solvedProblemsRefreshInterval` | Refresh interval in milliseconds | `3600000` (1 hour) |

---

## 🔧 Requirements

### Required

- **VS Code** 1.80+ or **Cursor** (any version)
- **C++ Compiler** (`g++` recommended, or `cl.exe` on Windows)

### Optional

- **AI API Key** - For AI features (get from [OpenRouter.ai](https://openrouter.ai))
- **Codeforces Account** - For profile and solved problems tracking

### System Requirements

- **macOS**: 10.13+ (High Sierra or later)
- **Linux**: Ubuntu 18.04+, Fedora 30+, or any modern distribution
- **Windows**: Windows 10 or later
- **RAM**: 4GB minimum (8GB recommended)
- **Disk Space**: ~200MB for extension + compiler

---

## 🆘 Troubleshooting

### Extension Not Working

- **Check VS Code version**: Requires 1.80+
- **Reload window**: `Cmd+Shift+P` → "Developer: Reload Window"
- **Check Output**: View → Output → Select "CP Studio"

### Tests Not Running

- **Verify compiler**: Run `g++ --version` in terminal
- **Check file location**: Must be in `contests/{contestId}/{problem}/main.cpp` (or `leetcode/` or `geeksforgeeks/`)
- **Check test files**: Ensure `in.txt` and `out.txt` exist

### AI Features Not Working

- **Check API key**: Settings → `codeforces.aiApiKey`
- **Verify key is valid**: Test at [OpenRouter.ai](https://openrouter.ai)
- **Check account balance**: Ensure API account has credits

### Profile Not Loading

- **Verify username**: Settings → `codeforces.username`
- **Check internet**: Ensure Codeforces API is accessible
- **Try refresh**: `Cmd+Shift+P` → "CP Studio: Refresh Profile"

### Logo Display Issues

If the CP Studio logo appears white or not displaying properly:

- **Activity Bar Icon**: The logo should appear in the activity bar (left sidebar). If it's white, try:
  - Reload window: `Cmd+Shift+P` → "Developer: Reload Window"
  - Check if logo file exists: `resources/logo.png`
  - Ensure logo has transparent background (PNG format)
  
- **Editor Toolbar Icons**: Editor toolbar buttons use VS Code's codicons which automatically adapt to your theme. If icons appear white:
  - Try switching to a dark theme (recommended: One Dark Pro or Dracula)
  - Check theme contrast settings
  - Icons should automatically match your theme's foreground color

- **Theme Compatibility**: CP Studio's logo is optimized for dark themes. For best results, use one of the recommended cyber-professional themes listed in the Theme Suggestions section.

---

## 🔐 Privacy & Security

- ✅ **No Data Collection**: Extension doesn't collect or store user data
- ✅ **Local Storage**: All data stays on your machine
- ✅ **Encrypted Keys**: API keys stored securely in VS Code settings
- ✅ **HTTPS Only**: All API calls use secure connections
- ✅ **BYOK Model**: You provide your own API keys
- ✅ **Open Source**: Code is transparent and auditable

---

## 🤝 Contributing

**CP Studio is open source!** Contributions are welcome and greatly appreciated. This extension is built by the community, for the community.

### 🚀 Getting Started

1. **Fork the Repository**
   ```bash
   git clone https://github.com/rodriguescarson/cp-studio.git
   cd codeforces-contest-helper
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build the Extension**
   ```bash
   npm run compile
   # Or watch mode for development
   npm run watch
   ```

4. **Run in Development Mode**
   - Open the project in VS Code or Cursor
   - Press `F5` to launch Extension Development Host
   - A new window will open with the extension loaded
   - Make changes and reload the window (`Cmd+R` or `Ctrl+R`) to see updates

### 📝 Development Workflow

1. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make Your Changes**
   - Write clean, readable code
   - Follow TypeScript best practices
   - Add comments for complex logic
   - Update documentation if needed

3. **Test Your Changes**
   - Test in Extension Development Host (`F5`)
   - Verify features work across platforms (Codeforces, LeetCode, GeeksforGeeks)
   - Test edge cases and error handling

4. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   # Use conventional commits: feat:, fix:, docs:, refactor:, etc.
   ```

5. **Push and Create Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```
   - Open a Pull Request on GitHub
   - Fill out the PR template
   - Link any related issues

### 🎯 Contribution Guidelines

#### Code Style
- **TypeScript**: Use TypeScript for all new code
- **Formatting**: Follow existing code style
- **Naming**: Use descriptive variable and function names
- **Comments**: Add JSDoc comments for public functions
- **Error Handling**: Always handle errors gracefully

#### What to Contribute

**🐛 Bug Fixes**
- Fix bugs you encounter
- Improve error messages
- Add better error handling

**✨ New Features**
- Support for new competitive programming platforms
- UI/UX improvements
- Performance optimizations
- New problem set integrations

**📖 Documentation**
- Improve README
- Add code comments
- Write usage examples
- Create tutorials

**🧪 Testing**
- Add unit tests
- Test edge cases
- Verify cross-platform compatibility

#### Pull Request Process

1. **Before Submitting**
   - Ensure code compiles (`npm run compile`)
   - Test your changes thoroughly
   - Update documentation if needed
   - Follow the existing code style

2. **PR Description**
   - Clearly describe what changes you made
   - Explain why the changes are needed
   - Include screenshots for UI changes
   - Reference related issues

3. **Review Process**
   - Maintainers will review your PR
   - Address any feedback or requested changes
   - Be patient and responsive to comments

### 🏗️ Project Structure

```
cp-studio/
├── src/                    # TypeScript source files
│   ├── extension.ts        # Main entry point
│   ├── contestSetup.ts     # Problem setup logic
│   ├── testRunner.ts       # Test execution
│   ├── aiAnalyzer.ts       # AI integration
│   └── ...                 # Other modules
├── resources/              # Assets (logo, icons)
├── data/                   # Problem set data (A2OJ, NeetCode, etc.)
├── package.json            # Extension manifest
├── tsconfig.json           # TypeScript config
└── README.md               # Documentation
```

### 🐛 Reporting Issues

Found a bug or have a feature request?

1. **Check Existing Issues**
   - Search GitHub issues to avoid duplicates
   - Check if it's already being worked on

2. **Create an Issue**
   - Use the issue template
   - Provide clear description
   - Include steps to reproduce (for bugs)
   - Add screenshots if relevant
   - Specify your OS and VS Code/Cursor version

### 💡 Feature Requests

Have an idea for a new feature?

1. **Check Existing Requests**
   - Search for similar feature requests
   - Add your use case to existing discussions

2. **Create Feature Request**
   - Use the feature request template
   - Describe the feature clearly
   - Explain the use case
   - Consider implementation approach

### 📚 Resources for Contributors

- **VS Code Extension API**: https://code.visualstudio.com/api
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **VS Code Extension Samples**: https://github.com/microsoft/vscode-extension-samples

### 🤝 Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Celebrate contributions of all sizes

### 📧 Questions?

- 💬 Open a [Discussion](https://github.com/rodriguescarson/cp-studio/discussions)
- 🐛 Create an [Issue](https://github.com/rodriguescarson/cp-studio/issues)
- 📧 Email: rodriguescarson@gmail.com

**Thank you for contributing to CP Studio!** 🎉

---

## 📄 License

**CP Studio is open source software licensed under the MIT License.**

This means you are free to:
- ✅ Use CP Studio for any purpose (commercial or personal)
- ✅ Modify the code to suit your needs
- ✅ Distribute the software
- ✅ Use it privately

**Requirements:**
- Include the original copyright notice and license text

**No Warranty:**
- The software is provided "as is" without warranty

See the [LICENSE](LICENSE) file for full details.

**Why MIT?** MIT is one of the most permissive open source licenses, making it easy for developers to use, modify, and contribute to CP Studio. Perfect for a community-driven project!

---

## 👤 Author

**Carson Rodrigues**

Built with ❤️ for competitive programmers worldwide.

- 🌐 Website: [carsonrodrigues.com](https://carsonrodrigues.com)
- 🚀 CP Studio Page: [carsonrodrigues.com/cp-studio](https://www.carsonrodrigues.com/cp-studio)
- 💻 GitHub: [@rodriguescarson](https://github.com/rodriguescarson)
- 💼 LinkedIn: [rodriguescarson](https://linkedin.com/in/rodriguescarson)
- ☕ Buy Me a Coffee: [buymeacoffee.com/rodriguescarson](https://buymeacoffee.com/rodriguescarson)
- 📧 Email: rodriguescarson@gmail.com

---

## 🙏 Acknowledgments

- Built for the competitive programming community
- Powered by Codeforces API, LeetCode, and GeeksforGeeks
- AI features via OpenRouter, OpenAI, and Anthropic
- Inspired by the need for a unified competitive programming workspace

---

<div align="center">

**Made with ❤️ for competitive programmers**

[⭐ Star on GitHub](https://github.com/rodriguescarson/cp-studio) • [🌐 Project Page](https://www.carsonrodrigues.com/cp-studio) • [📝 Report Issue](https://github.com/rodriguescarson/cp-studio/issues) • [📖 Documentation](https://github.com/rodriguescarson/cp-studio#readme)

**One extension. Multiple platforms. Zero confusion.**

</div>
