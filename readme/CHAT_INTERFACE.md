# Chat Interface Feature

## Overview

CF Studio now includes a full-featured chat interface for AI-powered code analysis and assistance, replacing the command-based approach with an interactive chat experience.

## Features

### 1. Interactive Chat Interface

- **Webview Panel**: Opens in the editor area
- **Message History**: Persistent chat sessions per problem
- **Real-time Messaging**: Send messages and get AI responses
- **Code Block Detection**: Automatically detects and formats code blocks in responses

### 2. Code Insertion

- **Replace Entire File**: Replace all code in the file
- **Insert at Cursor**: Insert code at current cursor position
- **Replace Selection**: Replace selected text with new code
- **Dropdown Menu**: Easy access to all insertion modes

### 3. Quick Actions

- **Analyze Code Button**: One-click code analysis
- **Copy Code Button**: Copy current code to clipboard
- **New Chat Button**: Start a fresh chat session

### 4. Sidebar Integration

- **Chat List**: View all your chat sessions
- **Grouped by Contest**: Chats organized by contest ID
- **Global Chats**: Separate global chat sessions
- **Click to Open**: Click any chat to open it
- **Delete Chats**: Right-click to delete chat sessions

## How to Use

### Opening Chat

**Method 1: Command Palette**

- `Cmd+Shift+P` / `Ctrl+Shift+P`
- Type: `Open Chat` or `New Chat`

**Method 2: From Editor**

- Click ✨ (sparkle) button in editor toolbar
- Opens chat for current file

**Method 3: Sidebar**

- Click CF Studio icon in activity bar
- Click any chat session to open

### Using the Chat

1. **Type your message** in the input field
2. **Press Enter** to send (Shift+Enter for new line)
3. **AI responds** with analysis, suggestions, or code
4. **Use action buttons**:
   - Click "Insert Code ▼" on code blocks
   - Choose insertion mode from dropdown
   - Use "Analyze Code" for quick analysis
   - Use "Copy Code" to copy current file

### Code Insertion

When AI provides code in a code block:

1. Click **"Insert Code ▼"** button
2. Choose insertion mode:
   - **Replace Entire File**: Replaces all code
   - **Insert at Cursor**: Adds code at cursor
   - **Replace Selection**: Replaces selected text
3. Code is inserted automatically

### Creating New Chats

- Click **"New Chat"** button in chat header
- Or use command: `New Chat`
- Creates a fresh session (keeps old one)

### Sidebar Features

- **View All Chats**: See all your chat sessions
- **Organized by Contest**: Chats grouped by contest
- **Global Chats**: Shown at top
- **Refresh**: Click refresh icon to update list
- **Delete**: Right-click chat → Delete

## Commands

- `codeforces.openChat` - Open chat for current file
- `codeforces.newChat` - Create new chat session
- `codeforces.insertCode` - Insert code from chat (internal)
- `codeforces.openChatFromSidebar` - Open chat from sidebar
- `codeforces.deleteChatFromSidebar` - Delete chat from sidebar
- `codeforces.refreshChatSidebar` - Refresh sidebar

## Configuration

Chat uses the same AI settings as before:

- `codeforces.aiApiKey` - Your OpenRouter API key
- `codeforces.aiProvider` - Provider (openrouter/openai/anthropic)
- `codeforces.aiModel` - Model to use

## Chat Sessions

- **Per-Problem**: Each problem gets its own chat session
- **Global**: Global chat for general questions
- **Persistent**: Chat history saved across sessions
- **Context-Aware**: Automatically includes code and test cases

## UI Features

- **Message Bubbles**: User messages on right, AI on left
- **Code Highlighting**: Syntax-highlighted code blocks
- **Loading Indicators**: Shows when AI is thinking
- **Error Handling**: Clear error messages
- **Responsive Design**: Adapts to VS Code theme

## Technical Details

- **Storage**: Chat history stored in workspace state
- **Webview**: Uses VS Code WebviewPanel API
- **Message Passing**: Secure communication via postMessage
- **Code Extraction**: Regex-based code block detection
- **Session Management**: Centralized ChatManager

## Migration from Old Feature

The old `AI Analysis` command now opens the chat interface instead of showing output in a channel. All functionality is preserved but with a better UX.

## Tips

- Use **"Analyze Code"** button for quick analysis
- **Code blocks** in AI responses have insertion buttons
- **Multiple chats** can be open for different problems
- **Chat history** persists across Cursor restarts
- **Global chat** is great for general questions

Enjoy the new chat interface! 🚀
