# Cursor IDE Compatibility Guide

## ✅ Full Compatibility Confirmed

This extension is **100% compatible** with Cursor IDE. Cursor is built as a fork of VS Code and maintains full API compatibility.

## Installation in Cursor

### Method 1: Install from VSIX (Recommended)

1. Package the extension: `vsce package` (in `.vscode-extension` directory)
2. Open Cursor
3. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
4. Type: `Extensions: Install from VSIX...`
5. Select the `.vsix` file

### Method 2: Development Mode

1. Open the `.vscode-extension` folder in Cursor
2. Press `F5` to launch Extension Development Host
3. The extension will be active in the new window

## Features That Work in Cursor

✅ **All features work identically:**

1. **URL-Based Setup**
   - Command Palette: `Setup Contest from URL`
   - Works exactly as in VS Code

2. **Test Runner**
   - Editor toolbar button (▶️) appears when editing `main.cpp`
   - Command Palette: `Run Tests`
   - Compiles and tests your code

3. **AI Analysis**
   - Editor toolbar button (✨) appears when editing `main.cpp`
   - Uses YOUR API key (BYOK)
   - Works independently of Cursor's built-in AI
   - Command Palette: `AI Analysis`

4. **Copy Code**
   - Editor toolbar button (📋) appears when editing `main.cpp`
   - Command Palette: `Copy Code to Clipboard`
   - One-click copy for submission

## Configuration

Settings work exactly the same as VS Code:

1. Open Settings: `Cmd+,` (Mac) or `Ctrl+,` (Windows/Linux)
2. Search for "codeforces"
3. Configure:
   - `codeforces.contestsPath`
   - `codeforces.aiApiKey` (for AI analysis)
   - `codeforces.aiProvider`
   - `codeforces.aiModel`

## Command Palette Access

All commands available via Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`):

- `Codeforces: Setup Contest from URL`
- `Codeforces: Run Tests`
- `Codeforces: AI Analysis`
- `Codeforces: Copy Code to Clipboard`

## Editor Toolbar Buttons

When you open a `main.cpp` file in a contest directory (`contests/*/main.cpp`), you'll see three buttons in the editor toolbar:

- ▶️ **Run Tests** - Compile and test your solution
- ✨ **AI Analysis** - Get AI-powered code review (uses your API key)
- 📋 **Copy Code** - Copy code to clipboard

## Differences from VS Code

**None!** The extension uses standard VS Code APIs that Cursor fully supports:

- `vscode.window.withProgress()` ✅
- `vscode.window.showInputBox()` ✅
- `vscode.commands.registerCommand()` ✅
- `vscode.env.clipboard` ✅
- All other VS Code APIs ✅

## Troubleshooting

### Extension not showing up?

- Make sure you've installed the `.vsix` file
- Check Output panel for errors
- Restart Cursor

### Buttons not appearing?

- Ensure you're editing a `main.cpp` file
- File path must match: `contests/*/main.cpp`
- Check file is saved

### Commands not working?

- Check Output panel for error messages
- Verify extension is activated (check Extensions view)
- Restart Cursor if needed

## Testing

To test the extension in Cursor:

1. **Development Mode:**

   ```bash
   cd .vscode-extension
   npm install
   npm run compile
   ```

   Then press `F5` in Cursor

2. **Installed Extension:**
   ```bash
   cd .vscode-extension
   vsce package
   ```
   Then install the `.vsix` file in Cursor

## Summary

✅ **Works perfectly in Cursor**  
✅ **All features functional**  
✅ **Same API as VS Code**  
✅ **No special configuration needed**

The extension is designed to work seamlessly in both VS Code and Cursor IDE!
