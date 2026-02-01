# Quick Commands Reference

## Correct Directory

The extension is in: **`vscode-extension/`** (NOT `.vscode-extension/`)

## Common Commands

### From project root (`/Users/carson/cf`):

```bash
# Navigate to extension directory
cd vscode-extension

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode (for development)
npm run watch

# Package extension
vsce package

# Publish to marketplace (if you have an account)
vsce publish
```

### From extension directory (`/Users/carson/cf/vscode-extension`):

```bash
# All the above commands work here too
npm install
npm run compile
vsce package
```

## Install in Cursor

After packaging, install the `.vsix` file:

1. Open Cursor
2. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
3. Type: `Extensions: Install from VSIX...`
4. Select: `/Users/carson/cf/vscode-extension/codeforces-contest-helper-1.0.1.vsix`

## File Locations

- **Extension source**: `/Users/carson/cf/vscode-extension/`
- **Compiled output**: `/Users/carson/cf/vscode-extension/out/`
- **Packaged file**: `/Users/carson/cf/vscode-extension/codeforces-contest-helper-1.0.1.vsix`

## Troubleshooting

If you get "package.json not found":

- Make sure you're in `/Users/carson/cf/vscode-extension/` (not `.vscode-extension/`)
- Check: `ls package.json` should show the file
