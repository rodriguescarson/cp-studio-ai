# Where to Find the ✨ Button

## Editor Toolbar Buttons

The ✨ (sparkle) button should appear in the **editor toolbar** (top right of the editor) when you have a `main.cpp` file open in a contest directory.

### Requirements for Button to Appear:

1. ✅ File must be `main.cpp`
2. ✅ File path must match: `contests/*/main.cpp`
3. ✅ File must be saved
4. ✅ Extension must be active

### Your Current File:

- Path: `/Users/carson/cf/contests/2113/B/main.cpp`
- ✅ Matches pattern: `contests/2113/B/main.cpp`
- ✅ Should show buttons

## If Button Doesn't Appear:

### Step 1: Reload Cursor

- `Cmd+Shift+P` / `Ctrl+Shift+P`
- Type: `Developer: Reload Window`
- Press Enter

### Step 2: Check Extension is Active

- Open Output panel (`Cmd+Shift+U` / `Ctrl+Shift+U`)
- Select "Log (Extension Host)"
- Look for: `"CF Studio extension is now active!"`

### Step 3: Use Command Palette Instead

- `Cmd+Shift+P` / `Ctrl+Shift+P`
- Type: `Open Chat` or `AI Analysis`
- This will open the chat interface

### Step 4: Check File Path

The button only appears for files matching:

- Pattern: `contests/*/main.cpp`
- Your file: `contests/2113/B/main.cpp` ✅

## Alternative Ways to Open Chat:

1. **Command Palette**: `Cmd+Shift+P` → `Open Chat`
2. **Sidebar**: Click CF Studio icon → Click any chat
3. **Command**: `Cmd+Shift+P` → `AI Analysis` (opens chat)

## Buttons You Should See:

When editing `contests/2113/B/main.cpp`, you should see in the editor toolbar (top right):

- ▶️ **Run Tests** - Compile and test your code
- ✨ **Open Chat** - Open AI chat interface
- 📋 **Copy Code** - Copy code to clipboard

If you don't see them, try reloading Cursor window!
