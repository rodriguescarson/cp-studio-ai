import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ChatManager, ChatSession } from './chatManager';
import { AIAnalyzer } from './aiAnalyzer';
import { CodeCopier } from './codeCopier';

export class ChatPanel {
    private static currentPanel: ChatPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _session: ChatSession;
    private readonly _chatManager: ChatManager;
    private readonly _aiAnalyzer: AIAnalyzer;
    private readonly _codeCopier: CodeCopier;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, session: ChatSession, context: vscode.ExtensionContext) {
        this._panel = panel;
        this._session = session;
        this._chatManager = ChatManager.getInstance(context);
        this._aiAnalyzer = new AIAnalyzer(context);
        this._codeCopier = new CodeCopier(context);

        // Set webview content
        this._panel.webview.html = this.getWebviewContent();

        // Handle messages from webview
        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'sendMessage':
                        await this.handleSendMessage(message.text);
                        break;
                    case 'analyzeCode':
                        await this.handleAnalyzeCode();
                        break;
                    case 'copyCode':
                        await this.handleCopyCode();
                        break;
                    case 'insertCode':
                        await this.handleInsertCode(message.code, message.mode);
                        break;
                    case 'newChat':
                        await this.handleNewChat();
                        break;
                }
            },
            null,
            this._disposables
        );

        // Handle panel disposal
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Send initial messages to webview
        this.updateWebview();
    }

    public static createOrShow(context: vscode.ExtensionContext, filePath?: string): ChatPanel {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        const chatManager = ChatManager.getInstance(context);
        const session = chatManager.getOrCreateSession(filePath);

        // If we already have a panel, show it
        if (ChatPanel.currentPanel) {
            ChatPanel.currentPanel._panel.reveal(column);
            return ChatPanel.currentPanel;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            'cfStudioChat',
            session.title || 'cfx - codeforce studio Chat',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: []
            }
        );

        ChatPanel.currentPanel = new ChatPanel(panel, session, context);
        return ChatPanel.currentPanel;
    }

    public static revive(panel: vscode.WebviewPanel, context: vscode.ExtensionContext, sessionId: string): void {
        const chatManager = ChatManager.getInstance(context);
        const session = chatManager.getSession(sessionId);
        if (session) {
            ChatPanel.currentPanel = new ChatPanel(panel, session, context);
        }
    }

    private async handleSendMessage(text: string): Promise<void> {
        if (!text.trim()) {
            return;
        }

        // Add user message to session
        this._chatManager.addMessage(this._session.id, 'user', text);
        this.updateWebview();

        // Show loading indicator
        this._panel.webview.postMessage({
            command: 'addMessage',
            message: { role: 'assistant', content: '...', loading: true }
        });

        try {
            // Get AI response
            const response = await this._aiAnalyzer.sendChatMessage(
                text,
                this._session.filePath,
                this._session.messages
            );

            // Add AI response to session
            this._chatManager.addMessage(this._session.id, 'assistant', response);
            this.updateWebview();
        } catch (error: any) {
            const errorMessage = `Error: ${error.message || 'Failed to get AI response'}`;
            this._chatManager.addMessage(this._session.id, 'assistant', errorMessage);
            this.updateWebview();
        }
    }

    private async handleAnalyzeCode(): Promise<void> {
        if (!this._session.filePath) {
            vscode.window.showWarningMessage('No file associated with this chat');
            return;
        }

        const prompt = 'Analyze this code and provide:\n1. Code review and potential bugs\n2. Time and space complexity analysis\n3. Suggestions for optimization\n4. Edge cases to consider\n5. Alternative approaches if applicable';
        
        await this.handleSendMessage(prompt);
    }

    private async handleCopyCode(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor');
            return;
        }

        await this._codeCopier.copyToClipboard(editor);
    }

    private async handleInsertCode(code: string, mode: 'replace' | 'insert' | 'replace-selection'): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor');
            return;
        }

        const edit = new vscode.WorkspaceEdit();

        if (mode === 'replace') {
            // Replace entire file
            const range = new vscode.Range(
                editor.document.positionAt(0),
                editor.document.positionAt(editor.document.getText().length)
            );
            edit.replace(editor.document.uri, range, code);
        } else if (mode === 'insert') {
            // Insert at cursor
            edit.insert(editor.document.uri, editor.selection.active, code);
        } else if (mode === 'replace-selection') {
            // Replace selection
            if (editor.selection.isEmpty) {
                vscode.window.showWarningMessage('No text selected');
                return;
            }
            edit.replace(editor.document.uri, editor.selection, code);
        }

        await vscode.workspace.applyEdit(edit);
        vscode.window.showInformationMessage(`Code ${mode === 'replace' ? 'replaced' : mode === 'insert' ? 'inserted' : 'replaced in selection'}`);
    }

    private async handleNewChat(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        const filePath = editor?.document.uri.fsPath;
        const newSession = this._chatManager.createNewSession(filePath);
        
        // Get context from ChatManager
        const context = this._chatManager.context;
        ChatPanel.createOrShow(context, newSession.filePath);
    }

    private updateWebview(): void {
        this._panel.webview.postMessage({
            command: 'updateMessages',
            messages: this._session.messages,
            filePath: this._session.filePath,
            contestId: this._session.contestId,
            problemIndex: this._session.problemIndex
        });
    }

    private getWebviewContent(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>cfx - codeforce studio Chat</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            height: 100vh;
            display: flex;
            flex-direction: column;
        }

        .chat-header {
            padding: 10px 15px;
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: var(--vscode-titleBar-activeBackground);
        }

        .chat-title {
            font-weight: 600;
            font-size: 13px;
        }

        .header-actions {
            display: flex;
            gap: 8px;
        }

        .header-btn {
            padding: 4px 8px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
        }

        .header-btn:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .messages-container {
            flex: 1;
            overflow-y: auto;
            padding: 15px;
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        .message {
            display: flex;
            flex-direction: column;
            max-width: 85%;
            animation: fadeIn 0.3s;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .message.user {
            align-self: flex-end;
        }

        .message.assistant {
            align-self: flex-start;
        }

        .message-header {
            font-size: 11px;
            opacity: 0.7;
            margin-bottom: 5px;
            font-weight: 500;
        }

        .message-content {
            padding: 10px 15px;
            border-radius: 8px;
            word-wrap: break-word;
            line-height: 1.5;
        }

        .message.user .message-content {
            background-color: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
        }

        .message.assistant .message-content {
            background-color: var(--vscode-textBlockQuote-background);
            border: 1px solid var(--vscode-panel-border);
        }

        .message.loading .message-content {
            opacity: 0.6;
            font-style: italic;
        }

        .code-block {
            background-color: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 10px;
            margin: 8px 0;
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
            overflow-x: auto;
        }

        .code-block-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            font-size: 11px;
            opacity: 0.8;
        }

        .code-actions {
            display: flex;
            gap: 5px;
            margin-top: 8px;
        }

        .action-btn {
            padding: 4px 8px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
        }

        .action-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .insert-dropdown {
            position: relative;
            display: inline-block;
        }

        .insert-dropdown-content {
            display: none;
            position: absolute;
            background-color: var(--vscode-dropdown-background);
            border: 1px solid var(--vscode-dropdown-border);
            border-radius: 3px;
            min-width: 180px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 1000;
            bottom: 100%;
            margin-bottom: 5px;
        }

        .insert-dropdown.show .insert-dropdown-content {
            display: block;
        }

        .insert-dropdown-item {
            padding: 8px 12px;
            cursor: pointer;
            font-size: 12px;
        }

        .insert-dropdown-item:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        .input-container {
            padding: 15px;
            border-top: 1px solid var(--vscode-panel-border);
            background-color: var(--vscode-input-background);
        }

        .input-wrapper {
            display: flex;
            gap: 10px;
            align-items: flex-end;
        }

        .quick-actions {
            display: flex;
            gap: 5px;
            margin-bottom: 8px;
        }

        .quick-action-btn {
            padding: 4px 10px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
        }

        .quick-action-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        #messageInput {
            flex: 1;
            padding: 8px 12px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            resize: none;
            min-height: 36px;
            max-height: 120px;
        }

        #messageInput:focus {
            outline: 1px solid var(--vscode-focusBorder);
            outline-offset: -1px;
        }

        #sendButton {
            padding: 8px 16px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
        }

        #sendButton:hover:not(:disabled) {
            background: var(--vscode-button-hoverBackground);
        }

        #sendButton:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        pre {
            margin: 0;
            white-space: pre-wrap;
        }

        code {
            font-family: var(--vscode-editor-font-family);
        }
    </style>
</head>
<body>
    <div class="chat-header">
        <div class="chat-title" id="chatTitle">cfx - codeforce studio Chat</div>
        <div class="header-actions">
            <button class="header-btn" onclick="analyzeCode()">Analyze Code</button>
            <button class="header-btn" onclick="copyCode()">Copy Code</button>
            <button class="header-btn" onclick="newChat()">New Chat</button>
        </div>
    </div>

    <div class="messages-container" id="messagesContainer">
        <div class="message assistant">
            <div class="message-header">cfx - codeforce studio</div>
            <div class="message-content">
                Welcome to cfx - codeforce studio Chat! I can help you with:
                <ul style="margin-top: 8px; margin-left: 20px;">
                    <li>Code analysis and review</li>
                    <li>Complexity analysis</li>
                    <li>Optimization suggestions</li>
                    <li>Debugging help</li>
                </ul>
                <p style="margin-top: 8px;">Use the buttons above or type your question below.</p>
            </div>
        </div>
    </div>

    <div class="input-container">
        <div class="quick-actions">
            <button class="quick-action-btn" onclick="analyzeCode()">🔍 Analyze Code</button>
            <button class="quick-action-btn" onclick="copyCode()">📋 Copy Code</button>
        </div>
        <div class="input-wrapper">
            <textarea id="messageInput" placeholder="Type your message..." rows="1"></textarea>
            <button id="sendButton" onclick="sendMessage()">Send</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let currentCode = '';

        const messagesContainer = document.getElementById('messagesContainer');
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        const chatTitle = document.getElementById('chatTitle');

        // Auto-resize textarea
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });

        // Send on Enter (Shift+Enter for new line)
        messageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        function sendMessage() {
            const text = messageInput.value.trim();
            if (!text) return;

            addUserMessage(text);
            messageInput.value = '';
            messageInput.style.height = 'auto';
            
            vscode.postMessage({
                command: 'sendMessage',
                text: text
            });
        }

        function analyzeCode() {
            vscode.postMessage({
                command: 'analyzeCode'
            });
        }

        function copyCode() {
            vscode.postMessage({
                command: 'copyCode'
            });
        }

        function newChat() {
            vscode.postMessage({
                command: 'newChat'
            });
        }

        function insertCode(code, mode) {
            vscode.postMessage({
                command: 'insertCode',
                code: code,
                mode: mode
            });
        }

        function addUserMessage(text) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message user';
            messageDiv.innerHTML = \`
                <div class="message-header">You</div>
                <div class="message-content">\${escapeHtml(text)}</div>
            \`;
            messagesContainer.appendChild(messageDiv);
            scrollToBottom();
        }

        function addAssistantMessage(content, loading = false) {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message assistant\${loading ? ' loading' : ''}\`;
            
            // Extract code blocks
            const codeBlocks = extractCodeBlocks(content);
            let htmlContent = escapeHtml(content);
            
            // Replace code blocks with formatted versions
            codeBlocks.forEach((block, index) => {
                const placeholder = \`__CODE_BLOCK_\${index}__\`;
                htmlContent = htmlContent.replace(block.fullMatch, placeholder);
            });

            let messageHtml = \`
                <div class="message-header">cfx - codeforce studio AI</div>
                <div class="message-content">\${htmlContent}</div>
            \`;

            // Add code blocks back with actions
            codeBlocks.forEach((block, index) => {
                const codeHtml = \`
                    <div class="code-block">
                        <div class="code-block-header">
                            <span>C++</span>
                            <div class="insert-dropdown">
                                <button class="action-btn" onclick="toggleInsertDropdown(\${index})">Insert Code ▼</button>
                                <div class="insert-dropdown-content" id="dropdown\${index}">
                                    <div class="insert-dropdown-item" onclick="insertCode('\${escapeForJs(block.code)}', 'replace')">Replace Entire File</div>
                                    <div class="insert-dropdown-item" onclick="insertCode('\${escapeForJs(block.code)}', 'insert')">Insert at Cursor</div>
                                    <div class="insert-dropdown-item" onclick="insertCode('\${escapeForJs(block.code)}', 'replace-selection')">Replace Selection</div>
                                </div>
                            </div>
                        </div>
                        <pre><code>\${escapeHtml(block.code)}</code></pre>
                    </div>
                \`;
                messageHtml = messageHtml.replace(\`__CODE_BLOCK_\${index}__\`, codeHtml);
            });

            messageDiv.innerHTML = messageHtml;
            messagesContainer.appendChild(messageDiv);
            scrollToBottom();
        }

        function extractCodeBlocks(text) {
            // Match code blocks with optional language specifier
            // Use String.fromCharCode to avoid template literal issues
            const backtick = String.fromCharCode(96);
            const codeBlockPattern = backtick + backtick + backtick + '(?:cpp|c\\\\+|cpp)?\\\\n([\\\\s\\\\S]*?)' + backtick + backtick + backtick;
            const codeBlockRegex = new RegExp(codeBlockPattern, 'g');
            const blocks = [];
            let match;
            while ((match = codeBlockRegex.exec(text)) !== null) {
                blocks.push({
                    fullMatch: match[0],
                    code: match[1].trim()
                });
            }
            return blocks;
        }

        function toggleInsertDropdown(index) {
            const dropdown = document.getElementById(\`dropdown\${index}\`);
            const container = dropdown.parentElement;
            
            // Close all other dropdowns
            document.querySelectorAll('.insert-dropdown').forEach(d => {
                if (d !== container) {
                    d.classList.remove('show');
                }
            });
            
            container.classList.toggle('show');
        }

        // Close dropdowns when clicking outside
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.insert-dropdown')) {
                document.querySelectorAll('.insert-dropdown').forEach(d => {
                    d.classList.remove('show');
                });
            }
        });

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML.replace(/\\n/g, '<br>');
        }

        function escapeForJs(text) {
            return text.replace(/\\\\/g, '\\\\\\\\')
                      .replace(/'/g, "\\\\'")
                      .replace(/\\n/g, '\\\\n')
                      .replace(/\\r/g, '\\\\r');
        }

        function scrollToBottom() {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
                case 'updateMessages':
                    messagesContainer.innerHTML = '';
                    message.messages.forEach(msg => {
                        if (msg.role === 'user') {
                            addUserMessage(msg.content);
                        } else {
                            addAssistantMessage(msg.content);
                        }
                    });
                    if (message.filePath) {
                        chatTitle.textContent = message.contestId && message.problemIndex 
                            ? \`Contest \${message.contestId} - Problem \${message.problemIndex}\`
                            : 'cfx - codeforce studio Chat';
                    }
                    scrollToBottom();
                    break;
                    
                case 'addMessage':
                    if (message.message.loading) {
                        addAssistantMessage(message.message.content, true);
                    } else {
                        // Remove loading message and add real one
                        const loadingMsg = messagesContainer.querySelector('.message.loading');
                        if (loadingMsg) {
                            loadingMsg.remove();
                        }
                        addAssistantMessage(message.message.content);
                    }
                    break;
            }
        });

        // Initial scroll
        scrollToBottom();
    </script>
</body>
</html>`;
    }

    public dispose(): void {
        ChatPanel.currentPanel = undefined;

        // Clean up
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
