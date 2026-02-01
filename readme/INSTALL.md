# Installation Guide

## Quick Install

1. **Install dependencies:**

   ```bash
   cd .vscode-extension
   npm install
   ```

2. **Compile the extension:**

   ```bash
   npm run compile
   ```

3. **Install in VS Code/Cursor:**
   - Press `F5` to open Extension Development Host
   - Or package and install manually (see below)

## Manual Installation

### Option 1: Development Mode (Recommended for testing)

1. Open VS Code/Cursor
2. Open the `.vscode-extension` folder
3. Press `F5` to launch Extension Development Host
4. The extension will be active in the new window

### Option 2: Package and Install

1. **Install vsce (VS Code Extension Manager):**

   ```bash
   npm install -g @vscode/vsce
   ```

2. **Package the extension:**

   ```bash
   cd .vscode-extension
   vsce package
   ```

3. **Install the .vsix file:**
   - In VS Code/Cursor, go to Extensions
   - Click the "..." menu
   - Select "Install from VSIX..."
   - Choose the generated `.vsix` file

## Configuration

After installation, configure the extension:

1. Open Settings (`Cmd+,` or `Ctrl+,`)
2. Search for "codeforces"
3. Set:
   - `codeforces.contestsPath`: Your contests directory path
   - `codeforces.aiApiKey`: Your AI API key (for AI analysis feature)
   - `codeforces.aiProvider`: Choose `openai`, `anthropic`, or `custom`

## Troubleshooting

### Extension not activating

- Make sure you've compiled: `npm run compile`
- Check the Output panel for errors
- Restart VS Code/Cursor

### Test runner not working

- Ensure `g++` is installed and in PATH
- Check that `in.txt` and `out.txt` exist in the problem directory

### AI analysis not working

- Verify your API key is set correctly
- Check your API provider settings
- Check the Output panel for error messages
