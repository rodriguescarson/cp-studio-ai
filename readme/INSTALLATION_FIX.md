# Fix: "Command not found" Error

If you're getting `command 'codeforces.setupFromUrl' not found`, follow these steps:

## Step 1: Uninstall Old Version

1. Open Cursor
2. Go to Extensions view (`Cmd+Shift+X` / `Ctrl+Shift+X`)
3. Search for "Codeforces Contest Helper"
4. Click the gear icon → Uninstall
5. **Reload Cursor** (important!)

## Step 2: Install Fresh Version

1. Package the extension:

   ```bash
   cd /Users/carson/cf/vscode-extension
   npm run compile
   vsce package
   ```

2. Install the new `.vsix`:
   - Press `Cmd+Shift+P` / `Ctrl+Shift+P`
   - Type: `Extensions: Install from VSIX...`
   - Select: `codeforces-contest-helper-1.0.0.vsix`

3. **Reload Cursor** after installation

## Step 3: Verify Extension is Active

1. Open Developer Tools: `Help → Toggle Developer Tools`
2. Go to Console tab
3. Look for: `"Codeforces Contest Helper extension is now active!"`
4. If you see errors, check the Output panel

## Step 4: Check Output Panel

1. View → Output (`Cmd+Shift+U` / `Ctrl+Shift+U`)
2. Select "Log (Extension Host)" from dropdown
3. Look for errors related to "codeforces"

## Step 5: Try Command Again

1. Press `Cmd+Shift+P` / `Ctrl+Shift+P`
2. Type: `Setup Contest from URL`
3. Should work now!

## Common Issues

### Extension not activating

- Check Developer Console for errors
- Make sure all dependencies are installed: `npm install`
- Recompile: `npm run compile`

### Command still not found

- Reload Cursor window: `Cmd+R` / `Ctrl+R` or `Developer: Reload Window`
- Check if extension is enabled in Extensions view
- Try uninstalling and reinstalling

### Dependencies missing

```bash
cd /Users/carson/cf/vscode-extension
npm install
npm run compile
vsce package
```

Then reinstall the `.vsix` file.

## Quick Fix Script

```bash
cd /Users/carson/cf/vscode-extension
npm install
npm run compile
vsce package
```

Then install the new `.vsix` file and reload Cursor.
