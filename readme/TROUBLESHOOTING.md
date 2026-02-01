# Troubleshooting Guide

## "Setup Contest from URL" Command Error

If you see an error when running the "Setup Contest from URL" command, follow these steps:

### Step 1: Check the Output Channel

1. In Cursor, go to **View → Output** (or `Cmd+Shift+U` / `Ctrl+Shift+U`)
2. Select **"Codeforces Helper"** from the dropdown
3. Look for error messages - they will show:
   - The error message
   - Stack trace (if available)
   - What went wrong

### Step 2: Common Issues and Fixes

#### Issue: "Cannot find module 'axios'" or similar

**Fix:** Dependencies not bundled properly

```bash
cd vscode-extension
npm install
npm run compile
```

Then reinstall the extension.

#### Issue: "Invalid Codeforces URL"

**Fix:** Make sure your URL format is correct:

- ✅ `https://codeforces.com/contest/2112/problem/A`
- ✅ `https://codeforces.com/problemset/problem/2112/A`
- ❌ `https://codeforces.com/contest/2112` (missing problem)

#### Issue: Path resolution errors

**Fix:** Set the contests path in settings:

1. Open Settings (`Cmd+,` / `Ctrl+,`)
2. Search for `codeforces.contestsPath`
3. Set it to an absolute path like: `/Users/yourname/cf/contests`

#### Issue: Workspace folder not found

**Fix:** The extension needs a workspace folder:

1. Open a folder in Cursor (File → Open Folder)
2. Or set `codeforces.contestsPath` to an absolute path

### Step 3: Check Console Logs

1. Open **Help → Toggle Developer Tools**
2. Go to **Console** tab
3. Look for errors starting with "Codeforces" or "Setup error"

### Step 4: Reinstall Extension

If nothing works:

1. Uninstall the extension
2. Delete the `.vsix` file
3. Recompile: `cd vscode-extension && npm run compile`
4. Repackage: `vsce package`
5. Reinstall the new `.vsix` file

### Step 5: Manual Test

Try running the command and check:

1. Does the input box appear? (URL validation working)
2. Does progress indicator show? (command executing)
3. What error message appears? (check Output channel)

## Getting Help

If you're still having issues:

1. Check the **Output** channel for detailed errors
2. Check **Developer Tools Console** for stack traces
3. Note the exact error message
4. Check if you have a workspace folder open

## Quick Debug Checklist

- [ ] Extension is installed and activated
- [ ] Workspace folder is open
- [ ] `codeforces.contestsPath` is set correctly
- [ ] URL format is correct
- [ ] Check Output channel for errors
- [ ] Check Console for stack traces
- [ ] Dependencies installed (`npm install`)
