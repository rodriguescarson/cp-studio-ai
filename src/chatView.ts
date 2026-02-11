import * as vscode from 'vscode';
import { ChatManager, ChatSession, isValidFilePath } from './chatManager';
import { AIAnalyzer } from './aiAnalyzer';
import { CodeCopier } from './codeCopier';
import * as path from 'path';

export class ChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'cfStudioChatView';
    private _view?: vscode.WebviewView;
    private _session?: ChatSession;
    private _pendingFilePath?: string;
    private readonly _chatManager: ChatManager;
    private readonly _aiAnalyzer: AIAnalyzer;
    private readonly _codeCopier: CodeCopier;
    private readonly _context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this._context = context;
        this._chatManager = ChatManager.getInstance(context);
        this._aiAnalyzer = new AIAnalyzer(context);
        this._codeCopier = new CodeCopier(context);
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: []
        };

        webviewView.webview.html = this.getWebviewContent();

        // Register with view manager for single-tab behavior
        const { registerViewForCollapse } = require('./viewManager');
        registerViewForCollapse(ChatViewProvider.viewType, webviewView);

        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(
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
                    case 'configureApiKey':
                        await this.handleConfigureApiKey();
                        break;
                    case 'selectChat':
                        await this.handleSelectChat(message.sessionId);
                        break;
                    case 'deleteChat':
                        await this.handleDeleteChat(message.sessionId);
                        break;
                    case 'showHistory':
                        await this.handleShowHistory();
                        break;
                    case 'copyCodeBlock':
                        await this.handleCopyCodeBlock(message.code);
                        break;
                    case 'attachFile':
                        await this.handleAttachFile();
                        break;
                    case 'runTests':
                        await this.handleRunTests();
                        break;
                    case 'selectFile':
                        await this.handleSelectFile();
                        break;
                    case 'refreshContext':
                        this.updateSession();
                        break;
                    case 'clearChat':
                        this.handleClearChat();
                        break;
                }
            }
        );

        // Update when view becomes visible
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                if (this._pendingFilePath) {
                    const session = this._chatManager.getOrCreateSession(this._pendingFilePath);
                    this._session = session;
                    this._pendingFilePath = undefined;
                    this.updateWebview();
                } else {
                    // Always update session to refresh context from active editor
                    this.updateSession();
                }
            }
        });

        // Handle pending file path if set before view was resolved
        if (this._pendingFilePath) {
            const session = this._chatManager.getOrCreateSession(this._pendingFilePath);
            this._session = session;
            this._pendingFilePath = undefined;
            this.updateWebview();
            webviewView.show(true);
        } else {
            // Initialize with current editor context
            this.updateSession();
        }
    }

    public async show(filePath?: string): Promise<void> {
        try {
            // If no filePath provided, get from active editor
            if (!filePath) {
                const editor = vscode.window.activeTextEditor;
                filePath = editor?.document.uri.fsPath;
            }
            
            this._pendingFilePath = filePath;
            const session = this._chatManager.getOrCreateSession(filePath);
            this._session = session;
            
            if (this._view) {
                this._pendingFilePath = undefined;
                this._view.show(true);
                // Force update session to refresh context
                this.updateSession();
                return;
            }
            
            // Show info message - user can click the sidebar icon manually
            vscode.window.showInformationMessage(
                'Please click the "CP Studio" icon in the sidebar to open the chat view.'
            );
        } catch (error: any) {
            console.error('Error showing chat view:', error);
            vscode.window.showErrorMessage(`Failed to open chat: ${error.message || error}`);
        }
    }

    public updateSession(): void {
        const editor = vscode.window.activeTextEditor;
        const filePath = editor?.document.uri.fsPath;
        
        // Always create/update session with current file path
        const session = this._chatManager.getOrCreateSession(filePath);
        this._session = session;
        
        // Update webview with current context immediately
        if (this._view) {
            this.updateWebview();
        }
        
        // Log for debugging
        if (filePath) {
            console.log(`[ChatView] Updated session with file: ${filePath}`);
        } else {
            console.log(`[ChatView] Updated session - no file (editor: ${editor ? 'exists' : 'null'})`);
        }
    }

    private async handleSelectChat(sessionId: string): Promise<void> {
        const session = this._chatManager.getSession(sessionId);
        if (session) {
            this._session = session;
            this.updateWebview();
        }
    }

    private async handleDeleteChat(sessionId: string): Promise<void> {
        const deleted = this._chatManager.deleteSession(sessionId);
        if (deleted) {
            if (this._session?.id === sessionId) {
                const sessions = this._chatManager.getAllSessions();
                if (sessions.length > 0) {
                    this._session = sessions[0];
                } else {
                    const editor = vscode.window.activeTextEditor;
                    const filePath = editor?.document.uri.fsPath;
                    this._session = this._chatManager.getOrCreateSession(filePath);
                }
            }
            this.updateWebview();
            vscode.window.showInformationMessage('Chat deleted');
        }
    }

    private async handleShowHistory(): Promise<void> {
        // Toggle history popover - handled in frontend
        if (this._view) {
            this._view.webview.postMessage({
                command: 'toggleHistory'
            });
        }
    }

    /** Toggle history popover (used by History button in panel title bar). */
    public showHistory(): void {
        this.handleShowHistory();
    }

    private async handleCopyCodeBlock(code: string): Promise<void> {
        await vscode.env.clipboard.writeText(code);
        vscode.window.showInformationMessage('Code copied to clipboard');
    }

    private async handleAttachFile(): Promise<void> {
        // Placeholder for attach file functionality
        vscode.window.showInformationMessage('Attach file feature coming soon');
    }

    private async handleRunTests(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor');
            return;
        }

        const filePath = editor.document.uri.fsPath;
        if (!filePath.includes('contests') || !filePath.endsWith('main.cpp')) {
            vscode.window.showWarningMessage('Please open a main.cpp file in a contest directory');
            return;
        }

        await vscode.commands.executeCommand('codeforces.runTests');
    }

    private async handleSelectFile(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        
        if (editor && !editor.document.isClosed) {
            // Use current active editor
            const filePath = editor.document.uri.fsPath;
            const session = this._chatManager.getOrCreateSession(filePath);
            this._session = session;
            this.updateWebview();
            vscode.window.showInformationMessage(`File selected: ${path.basename(filePath)}`);
        } else {
            // Show file picker
            const fileUri = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Select File',
                filters: {
                    'C++ Files': ['cpp', 'cxx', 'cc'],
                    'All Files': ['*']
                }
            });

            if (fileUri && fileUri[0]) {
                const filePath = fileUri[0].fsPath;
                const session = this._chatManager.getOrCreateSession(filePath);
                this._session = session;
                this.updateWebview();
                vscode.window.showInformationMessage(`File selected: ${path.basename(filePath)}`);
            }
        }
    }

    private async handleSendMessage(text: string): Promise<void> {
        if (!text.trim()) {
            return;
        }
        
        // Ensure we have a session
        if (!this._session) {
            this.updateSession();
        }
        
        if (!this._session) {
            vscode.window.showWarningMessage('No active session. Please open a file or create a new chat.');
            return;
        }

        this._chatManager.addMessage(this._session.id, 'user', text);
        this.updateWebview();

        this._view?.webview.postMessage({
            command: 'addMessage',
            message: { role: 'assistant', content: '...', loading: true }
        });

        try {
            const effectivePath = this.getEffectiveFilePath();
            const response = await this._aiAnalyzer.sendChatMessage(
                text,
                effectivePath,
                this._session.messages
            );

            this._chatManager.addMessage(this._session.id, 'assistant', response);
            this.updateWebview();
        } catch (error: any) {
            let errorMessage = `Error: ${error.message || 'Failed to get AI response'}`;
            
            if (error.message?.includes('API key') || error.message?.includes('401') || error.message?.includes('invalid')) {
                errorMessage = `🔑 Authentication Error: ${error.message}\n\nPlease configure your API key using the "Configure API Key" button above.`;
            }
            
            this._chatManager.addMessage(this._session.id, 'assistant', errorMessage);
            this.updateWebview();
            
            if (error.message?.includes('API key') || error.message?.includes('401')) {
                vscode.window.showWarningMessage('API key not configured. Click "Configure API Key" to set it up.');
            }
        }
    }

    private async handleAnalyzeCode(): Promise<void> {
        this.updateSession();
        const effectivePath = this.getEffectiveFilePath();
        if (!effectivePath) {
            vscode.window.showWarningMessage('Open a contest file (e.g. main.cpp) or select a file to analyze.');
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
            const range = new vscode.Range(
                editor.document.positionAt(0),
                editor.document.positionAt(editor.document.getText().length)
            );
            edit.replace(editor.document.uri, range, code);
        } else if (mode === 'insert') {
            edit.insert(editor.document.uri, editor.selection.active, code);
        } else if (mode === 'replace-selection') {
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
        this._session = newSession;
        this.updateWebview();
    }

    /** Clear messages for the current chat (used by Clear Chat button in panel header). */
    public clearCurrentChat(): void {
        if (!this._session) {
            this.updateSession();
        }
        if (this._session) {
            this._chatManager.clearSessionMessages(this._session.id);
            this.updateWebview();
        }
    }

    /** Run analysis on current file (used by Analyze button in panel header). Opens chat and sends analysis prompt. */
    public async runAnalysis(): Promise<void> {
        await this.handleAnalyzeCode();
    }

    private async handleClearChat(): Promise<void> {
        this.clearCurrentChat();
    }

    private async handleConfigureApiKey(): Promise<void> {
        const config = vscode.workspace.getConfiguration('codeforces');
        const currentKey = config.get<string>('aiApiKey', '');
        
        const apiKey = await vscode.window.showInputBox({
            prompt: 'Enter your OpenRouter API key',
            placeHolder: 'sk-or-v1-...',
            value: currentKey || '',
            password: true,
            ignoreFocusOut: true,
            validateInput: (value) => {
                if (!value || value.trim() === '') {
                    return 'API key cannot be empty';
                }
                return null;
            }
        });

        if (apiKey !== undefined) {
            await config.update('aiApiKey', apiKey.trim(), vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage('API key configured successfully!');
        }
    }

    /** Resolve file path for sending to AI: prefer active editor, then valid session path. */
    private getEffectiveFilePath(): string | undefined {
        const editor = vscode.window.activeTextEditor;
        if (editor && !editor.document.isClosed) {
            const p = editor.document.uri.fsPath;
            if (isValidFilePath(p)) return p;
        }
        if (this._session?.filePath && isValidFilePath(this._session.filePath)) {
            return this._session.filePath;
        }
        return undefined;
    }

    private getCurrentContext(): { fileName: string; filePath?: string } {
        // Always prefer active editor so pill shows current file
        const editor = vscode.window.activeTextEditor;
        if (editor && !editor.document.isClosed) {
            const filePath = editor.document.uri.fsPath;
            if (isValidFilePath(filePath)) {
                return {
                    fileName: path.basename(filePath),
                    filePath
                };
            }
        }
        if (this._session?.filePath && isValidFilePath(this._session.filePath)) {
            return {
                fileName: path.basename(this._session.filePath),
                filePath: this._session.filePath
            };
        }
        return { fileName: 'No file' };
    }

    private updateWebview(): void {
        if (!this._view) {
            return;
        }

        const sessions = this._chatManager.getAllSessions();
        const globalChats: ChatSession[] = [];
        const contestGroups: Map<string, ChatSession[]> = new Map();

        sessions.forEach(session => {
            if (!session.filePath) {
                globalChats.push(session);
            } else if (session.contestId) {
                const key = session.contestId;
                if (!contestGroups.has(key)) {
                    contestGroups.set(key, []);
                }
                contestGroups.get(key)!.push(session);
            } else {
                globalChats.push(session);
            }
        });

        // Get context - prioritize active editor, then valid session file path (never use invalid paths)
        const context = this.getCurrentContext();
        if (context.filePath) {
            console.log(`[ChatView] Context: ${context.filePath}`);
        } else {
            console.log(`[ChatView] No file context (pill will show "No file")`);
        }
        
        const chatTitle = this._session?.contestId && this._session?.problemIndex
            ? `Contest ${this._session.contestId} - Problem ${this._session.problemIndex}`
            : this._session?.title || 'CP Studio Chat';

        const hasContestFile = context.filePath && context.filePath.includes('contests') && context.filePath.endsWith('main.cpp');
        const welcomeMessage = hasContestFile && this._session?.contestId && this._session?.problemIndex
            ? `Chat for <strong>Contest ${this._session.contestId} - Problem ${this._session.problemIndex}</strong>. Your code and the problem statement are included with each message. Use the Test and Analyze buttons in the panel header.`
            : hasContestFile
                ? 'Your code and problem context are sent with each message.'
                : 'Open a contest problem (<code>main.cpp</code> in a contest folder) to chat with full problem context—statement, samples, and code.';

        // Get recent chats (last 3, excluding current)
        const allSessions = [...globalChats, ...Array.from(contestGroups.values()).flat()];
        const recentChats = allSessions
            .filter(s => s.id !== this._session?.id)
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
            .slice(0, 3)
            .map(s => ({
                id: s.id,
                title: s.contestId && s.problemIndex 
                    ? `Contest ${s.contestId} - Problem ${s.problemIndex}`
                    : s.title || 'Global Chat'
            }));

        this._view.webview.postMessage({
            command: 'updateMessages',
            messages: this._session?.messages || [],
            filePath: context.filePath || this._session?.filePath,
            contestId: this._session?.contestId,
            problemIndex: this._session?.problemIndex,
            currentSessionId: this._session?.id,
            chatTitle: chatTitle,
            context: context,
            welcomeMessage: welcomeMessage,
            recentChats: recentChats,
            sessions: {
                globalChats,
                contestGroups: Array.from(contestGroups.entries()).map(([contestId, sessions]) => ({
                    contestId,
                    sessions: sessions.sort((a, b) => (a.problemIndex || '').localeCompare(b.problemIndex || ''))
                })).sort((a, b) => parseInt(b.contestId) - parseInt(a.contestId))
            }
        });
    }

    private getWebviewContent(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CP Studio Chat</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@vscode/codicons@0.0.1/dist/codicon.css">
    <style>
        :root {
            --cfx-accent-primary: #7c3aed;
            --cfx-accent-cyan: #00e1ff;
            --cfx-chat-bg: var(--vscode-editor-background, #1e1e1e);
            --cfx-input-bg: var(--vscode-input-background, #252526);
            --cfx-input-border: var(--vscode-widget-border, #3c3c3c);
            --cfx-code-bg: var(--vscode-textCodeBlock-background, #1e1e1e);
            --cfx-diff-insert: var(--vscode-diffEditor-insertedTextBackground, #233925);
            --cfx-diff-delete: var(--vscode-diffEditor-removedTextBackground, #3e2526);
        }

        /* ===== Typing Indicator ===== */
        .typing-indicator {
            display: inline-flex;
            gap: 4px;
            padding: 10px 14px;
            background: var(--vscode-sideBar-background);
            border-radius: 12px;
            margin: 4px 0;
        }
        .typing-dot {
            width: 6px; height: 6px;
            border-radius: 50%;
            background: var(--cfx-accent-primary);
            animation: typingBounce 1.4s ease-in-out infinite;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.16s; }
        .typing-dot:nth-child(3) { animation-delay: 0.32s; }
        @keyframes typingBounce {
            0%, 100% { transform: translateY(0); opacity: 0.4; }
            50% { transform: translateY(-4px); opacity: 1; }
        }

        /* ===== Scroll to Bottom ===== */
        .scroll-to-bottom {
            position: absolute;
            bottom: 80px;
            right: 16px;
            width: 32px; height: 32px;
            border-radius: 50%;
            background: var(--cfx-accent-primary);
            color: #fff;
            border: none;
            cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s, transform 0.2s;
            z-index: 100;
            font-size: 14px;
        }
        .scroll-to-bottom.visible { opacity: 1; pointer-events: auto; }
        .scroll-to-bottom:hover { transform: scale(1.1); }

        /* ===== Message Timestamps ===== */
        .message-time {
            font-size: 10px;
            opacity: 0.4;
            margin-top: 4px;
            transition: opacity 0.2s;
        }
        .message:hover .message-time { opacity: 0.7; }

        /* ===== Message Animations ===== */
        @keyframes messageSlideIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .message { animation: messageSlideIn 0.3s ease-out; }

        /* ===== Collapsible Code Blocks ===== */
        .code-collapse-btn {
            display: block;
            width: 100%;
            padding: 4px 8px;
            background: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-panel-border);
            border-bottom: none;
            border-radius: 6px 6px 0 0;
            color: var(--vscode-foreground);
            font-size: 11px;
            cursor: pointer;
            text-align: left;
            opacity: 0.7;
        }
        .code-collapse-btn:hover { opacity: 1; }
        .code-block-collapsed { display: none; }

        /* ===== Focus Visible ===== */
        *:focus-visible {
            outline: 2px solid var(--vscode-focusBorder);
            outline-offset: 2px;
        }

        /* ===== High Contrast ===== */
        @media (forced-colors: active) {
            .toolbar-btn, .action-btn-small { border: 1px solid ButtonText; }
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--cfx-chat-bg);
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        /* Minimal Header */
        .chat-header {
            padding: 8px 16px;
            border-bottom: none;
            display: flex;
            align-items: center;
            background-color: var(--cfx-chat-bg);
            flex-shrink: 0;
            min-height: 36px;
        }

        .chat-title {
            font-weight: 600;
            font-size: 13px;
            color: var(--vscode-foreground);
        }
        .chat-toolbar {
            display: flex;
            gap: 2px;
            padding: 4px 12px 8px;
            border-bottom: 1px solid var(--vscode-panel-border);
            background-color: var(--cfx-chat-bg);
            flex-shrink: 0;
        }
        .toolbar-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            padding: 0;
            border: none;
            background: transparent;
            color: var(--vscode-foreground);
            cursor: pointer;
            border-radius: 4px;
        }
        .toolbar-btn:hover {
            background: var(--vscode-toolbar-hoverBackground);
        }
        .toolbar-btn .codicon { font-size: 16px; }

        .header-actions {
            display: flex;
            gap: 4px;
            align-items: center;
        }

        .action-buttons {
            display: flex;
            gap: 6px;
            align-items: center;
            margin-right: 8px;
        }

        .action-btn-small {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 4px 10px;
            background-color: rgba(0, 225, 255, 0.1);
            border: 1px solid var(--cfx-accent-cyan);
            border-radius: 12px;
            font-size: 11px;
            color: var(--cfx-accent-cyan);
            white-space: nowrap;
            flex-shrink: 0;
            cursor: pointer;
            transition: all 0.2s;
        }

        .action-btn-small:hover {
            background-color: rgba(0, 225, 255, 0.2);
            border-color: var(--cfx-accent-cyan);
        }

        .action-btn-small .codicon {
            font-size: 12px;
        }

        .header-btn {
            padding: 6px;
            background: transparent;
            color: var(--vscode-icon-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 28px;
            height: 28px;
            transition: all 0.2s;
        }

        .header-btn:hover {
            background: var(--vscode-toolbar-hoverBackground);
            color: var(--cfx-accent-cyan);
        }

        .header-btn .codicon {
            font-size: 16px;
        }

        /* Messages Container */
        .messages-container {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 20px 16px 100px;
            display: flex;
            flex-direction: column;
            gap: 20px;
            scroll-behavior: smooth;
        }

        .message {
            display: flex;
            flex-direction: column;
            max-width: 90%;
            animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .message.user {
            align-self: flex-end;
        }

        .message.assistant {
            align-self: flex-start;
        }

        .message-content {
            padding: 12px 16px;
            border-radius: 8px;
            word-wrap: break-word;
            line-height: 1.6;
            background-color: var(--vscode-input-background);
            border: 1px solid transparent;
        }

        .message.user .message-content {
            background-color: var(--vscode-input-background);
            border-color: var(--vscode-input-border);
        }

        .message.assistant .message-content {
            background-color: transparent;
            border: none;
            padding: 0;
        }

        .message.loading .message-content {
            opacity: 0.6;
            font-style: italic;
        }

        /* Code Blocks */
        .code-block {
            background-color: var(--cfx-code-bg);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            margin: 8px 0;
            overflow: hidden;
        }

        .code-block-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            background-color: rgba(255, 255, 255, 0.05);
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .code-block-header .language {
            font-size: 11px;
            opacity: 0.8;
            font-weight: 500;
        }

        .code-block-actions {
            display: flex;
            gap: 8px;
        }

        .code-action-btn {
            padding: 4px 8px;
            background: transparent;
            color: var(--vscode-icon-foreground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            transition: all 0.2s;
        }

        .code-action-btn:hover {
            background: var(--vscode-button-hoverBackground);
            border-color: var(--cfx-accent-cyan);
            color: var(--cfx-accent-cyan);
        }

        .code-block pre {
            margin: 0;
            padding: 12px;
            overflow-x: auto;
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
            line-height: 1.5;
        }

        .code-block code {
            font-family: var(--vscode-editor-font-family);
        }

        .code-block-footer {
            padding: 8px 12px;
            background-color: rgba(255, 255, 255, 0.03);
            border-top: 1px solid var(--vscode-panel-border);
            display: flex;
            justify-content: flex-end;
        }

        .insert-code-btn {
            padding: 6px 12px;
            background: var(--cfx-accent-primary);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .insert-code-btn:hover {
            background: var(--cfx-accent-cyan);
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0, 225, 255, 0.3);
        }

        .insert-code-btn .codicon {
            font-size: 14px;
        }

        /* Markdown styling */
        .message-content h1,
        .message-content h2,
        .message-content h3,
        .message-content h4,
        .message-content h5,
        .message-content h6 {
            margin-top: 16px;
            margin-bottom: 8px;
            font-weight: 600;
            line-height: 1.3;
        }

        .message-content h1 {
            font-size: 20px;
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 8px;
        }

        .message-content h2 {
            font-size: 18px;
            margin-top: 20px;
        }

        .message-content h3 {
            font-size: 16px;
        }

        .message-content p {
            margin: 8px 0;
            line-height: 1.6;
        }

        .message-content ul,
        .message-content ol {
            margin: 8px 0;
            padding-left: 24px;
            line-height: 1.6;
        }

        .message-content li {
            margin: 4px 0;
        }

        .message-content strong {
            font-weight: 600;
        }

        .message-content em {
            font-style: italic;
        }

        .message-content blockquote {
            border-left: 3px solid var(--cfx-accent-cyan);
            padding-left: 12px;
            margin: 12px 0;
            opacity: 0.8;
            font-style: italic;
        }

        .message-content a {
            color: var(--cfx-accent-cyan);
            text-decoration: none;
        }

        .message-content a:hover {
            text-decoration: underline;
        }

        .message-content table {
            border-collapse: collapse;
            margin: 12px 0;
            width: 100%;
        }

        .message-content th,
        .message-content td {
            border: 1px solid var(--vscode-panel-border);
            padding: 8px;
            text-align: left;
        }

        .message-content th {
            background-color: rgba(255, 255, 255, 0.05);
            font-weight: 600;
        }
        }

        /* Diff Views */
        .diff-block {
            background-color: var(--cfx-code-bg);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            margin: 8px 0;
            overflow: hidden;
        }

        .diff-line {
            padding: 4px 12px;
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
            line-height: 1.5;
        }

        .diff-line.insert {
            background-color: var(--cfx-diff-insert);
        }

        .diff-line.delete {
            background-color: var(--cfx-diff-delete);
        }

        .diff-line.context {
            opacity: 0.7;
        }

        /* Floating Capsule Input Bar */
        .input-container {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 12px 16px;
            background-color: var(--cfx-chat-bg);
            border-top: 1px solid var(--vscode-panel-border);
            z-index: 100;
        }

        .input-capsule {
            display: flex;
            align-items: center;
            background-color: var(--cfx-input-bg);
            border: 1px solid var(--cfx-input-border);
            border-radius: 24px;
            padding: 4px 4px 4px 12px;
            gap: 8px;
            max-width: 100%;
            transition: all 0.2s;
        }

        .input-capsule:focus-within {
            border-color: var(--cfx-accent-primary);
            box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2);
        }

        .context-pill {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            background-color: rgba(0, 225, 255, 0.1);
            border: 1px solid var(--cfx-accent-cyan);
            border-radius: 12px;
            font-size: 11px;
            color: var(--cfx-accent-cyan);
            white-space: nowrap;
            flex-shrink: 0;
            cursor: pointer;
            transition: all 0.2s;
        }

        .context-pill:hover {
            background-color: rgba(0, 225, 255, 0.2);
            border-color: var(--cfx-accent-cyan);
        }

        .context-pill .codicon {
            font-size: 12px;
        }

        .input-field {
            flex: 1;
            padding: 8px 12px;
            background: transparent;
            color: var(--vscode-input-foreground);
            border: none;
            outline: none;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            resize: none;
            min-height: 20px;
            max-height: 120px;
            overflow-y: auto;
        }

        .input-field::placeholder {
            color: var(--vscode-input-placeholderForeground);
        }

        .input-actions {
            display: flex;
            align-items: center;
            gap: 4px;
            flex-shrink: 0;
        }

        .input-action-btn {
            padding: 6px;
            background: transparent;
            color: var(--vscode-icon-foreground);
            border: none;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            transition: all 0.2s;
        }

        .input-action-btn:hover {
            background: var(--vscode-toolbar-hoverBackground);
            color: var(--cfx-accent-cyan);
        }

        .send-btn {
            background: var(--cfx-accent-primary);
            color: white;
            box-shadow: 0 0 12px rgba(124, 58, 237, 0.4);
            pointer-events: auto;
            z-index: 10;
        }

        .send-btn:hover {
            background: #6d28d9;
            box-shadow: 0 0 16px rgba(124, 58, 237, 0.6);
            transform: scale(1.05);
        }

        .send-btn:active {
            transform: scale(0.95);
        }

        .send-btn .codicon {
            font-size: 18px;
            pointer-events: none;
        }

        /* History Popover */
        .history-popover {
            position: absolute;
            bottom: 60px;
            left: 16px;
            right: 16px;
            max-height: 400px;
            background-color: var(--vscode-dropdown-background);
            border: 1px solid var(--vscode-dropdown-border);
            border-radius: 8px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
            display: none;
            flex-direction: column;
            z-index: 200;
            overflow: hidden;
        }

        .history-popover.visible {
            display: flex;
        }

        .history-header {
            padding: 12px 16px;
            border-bottom: 1px solid var(--vscode-panel-border);
            font-weight: 600;
            font-size: 13px;
        }

        .history-content {
            flex: 1;
            overflow-y: auto;
            padding: 8px;
        }

        .history-item {
            padding: 10px 12px;
            margin-bottom: 4px;
            border-radius: 6px;
            cursor: pointer;
            transition: background-color 0.2s;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .history-item:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        .history-item.active {
            background-color: var(--vscode-list-activeSelectionBackground);
        }

        .history-item-label {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 12px;
        }

        .history-item-delete {
            opacity: 0;
            transition: opacity 0.2s;
        }

        .history-item:hover .history-item-delete {
            opacity: 1;
        }

        .history-item.active {
            background-color: var(--vscode-list-activeSelectionBackground);
            color: var(--vscode-list-activeSelectionForeground);
        }

        .history-group-header {
            padding: 8px 12px;
            font-weight: 600;
            font-size: 11px;
            opacity: 0.8;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 12px;
            margin-bottom: 4px;
        }

        .history-group-header:first-child {
            margin-top: 0;
        }

        .history-empty {
            padding: 20px;
            text-align: center;
            opacity: 0.6;
            font-size: 12px;
        }

        /* Past Chats Mini UI */
        .past-chats-mini {
            position: fixed;
            top: 48px;
            left: 16px;
            right: 16px;
            background-color: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 4px 6px;
            opacity: 0.35;
            transition: opacity 0.2s;
            z-index: 50;
            max-height: 50px;
            overflow: hidden;
            display: none;
        }

        .past-chats-mini:hover {
            opacity: 0.7;
        }

        .past-chats-mini.expanded {
            opacity: 1;
            max-height: 200px;
            overflow-y: auto;
        }

        .past-chats-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
        }

        .past-chats-title {
            font-size: 8px;
            opacity: 0.5;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 500;
        }

        .past-chats-toggle {
            font-size: 8px;
            opacity: 0.6;
            cursor: pointer;
            color: var(--cfx-accent-cyan);
            padding: 1px 3px;
            border-radius: 2px;
            transition: all 0.2s;
        }

        .past-chats-toggle:hover {
            background-color: var(--vscode-list-hoverBackground);
            opacity: 1;
        }

        .past-chats-list {
            display: flex;
            flex-direction: column;
            gap: 1px;
            margin-top: 2px;
        }

        .past-chat-item-mini {
            font-size: 9px;
            opacity: 0.6;
            cursor: pointer;
            padding: 2px 4px;
            border-radius: 2px;
            transition: all 0.2s;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            line-height: 1.3;
        }

        .past-chat-item-mini:hover {
            background-color: var(--vscode-list-hoverBackground);
            opacity: 0.9;
        }

        .codicon {
            font-family: codicon;
            font-size: 14px;
            line-height: 1;
            display: inline-block;
        }

        /* Insert Dropdown */
        .insert-dropdown {
            position: relative;
            display: inline-block;
        }

        .insert-dropdown-content {
            display: none;
            position: absolute;
            background-color: var(--vscode-dropdown-background);
            border: 1px solid var(--vscode-dropdown-border);
            border-radius: 4px;
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
    </style>
</head>
<body>
    <!-- Scroll to Bottom Button -->
    <button class="scroll-to-bottom" id="scrollToBottom" onclick="scrollToBottom()" aria-label="Scroll to latest message" title="Scroll to bottom">&#x25BC;</button>

    <!-- Define functions IMMEDIATELY before any HTML with onclick handlers -->
    <script>
        // Define all window functions FIRST before HTML is parsed
        (function() {
            const vscode = acquireVsCodeApi();
            
            // Helper functions
            function escapeHtml(text) {
                const div = document.createElement('div');
                div.textContent = text;
                // Use split/join instead of regex to avoid escaping issues
                return div.innerHTML.split('\\n').join('<br>');
            }
            
            function scrollToBottom() {
                const messagesContainer = document.getElementById('messagesContainer');
                if (messagesContainer) {
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
            }
            
            window.sendMessage = function() {
                const messageInput = document.getElementById('messageInput');
                if (!messageInput) return;
                const text = messageInput.value.trim();
                if (!text) return;
                messageInput.value = '';
                messageInput.style.height = 'auto';
                const messagesContainer = document.getElementById('messagesContainer');
                if (messagesContainer) {
                    const messageDiv = document.createElement('div');
                    messageDiv.className = 'message user';
                    messageDiv.innerHTML = '<div class="message-content">' + escapeHtml(text) + '</div>';
                    messagesContainer.appendChild(messageDiv);
                    scrollToBottom();
                }
                try {
                    vscode.postMessage({ command: 'sendMessage', text: text });
                } catch (error) {
                    console.error('Error sending message:', error);
                }
            };
            
            window.runTests = function() { vscode.postMessage({ command: 'runTests' }); };
            window.analyzeCode = function() { vscode.postMessage({ command: 'analyzeCode' }); };
            window.clearChat = function() { vscode.postMessage({ command: 'clearChat' }); };
            window.newChat = function() {
                vscode.postMessage({ command: 'newChat' });
            };
            
            window.showHistory = function() {
                const historyPopover = document.getElementById('historyPopover');
                if (!historyPopover) return;
                const historyVisible = historyPopover.classList.contains('visible');
                historyPopover.classList.toggle('visible', !historyVisible);
            };
            
            window.attachFile = function() {
                vscode.postMessage({ command: 'attachFile' });
            };
            
            window.configureApiKey = function() {
                vscode.postMessage({ command: 'configureApiKey' });
            };
            
            window.selectFile = function() {
                vscode.postMessage({ command: 'selectFile' });
            };
            
            window.refreshContext = function() {
                vscode.postMessage({ command: 'refreshContext' });
            };
            
            window.togglePastChats = function() {
                vscode.postMessage({ command: 'togglePastChats' });
            };
            
            window.selectChat = function(sessionId) {
                vscode.postMessage({ command: 'selectChat', sessionId: sessionId });
            };
            
            window.deleteChat = function(sessionId, event) {
                if (event) event.stopPropagation();
                if (confirm('Delete this chat?')) {
                    vscode.postMessage({ command: 'deleteChat', sessionId: sessionId });
                }
            };
            
            window.insertCode = function(code, mode) {
                vscode.postMessage({ command: 'insertCode', code: code, mode: mode });
            };
            
            window.copyCodeBlock = function(code) {
                vscode.postMessage({ command: 'copyCodeBlock', code: code });
            };
            
            window.toggleInsertDropdown = function(index) {
                const dropdown = document.getElementById('dropdown' + index);
                if (!dropdown) return;
                const container = dropdown.parentElement;
                document.querySelectorAll('.insert-dropdown').forEach(d => {
                    if (d !== container) d.classList.remove('show');
                });
                container.classList.toggle('show');
            };
        })();
    </script>
    
    <!-- Row 1: only contest title -->
    <div class="chat-header">
        <div class="chat-title" id="chatTitle">CP Studio Chat</div>
    </div>
    <!-- Row 2: all actions (kept separate from title; also in panel bar when visible) -->
    <div class="chat-toolbar">
        <button class="toolbar-btn" onclick="window.runTests()" title="Run Tests"><span class="codicon codicon-play"></span></button>
        <button class="toolbar-btn" onclick="window.analyzeCode()" title="Analyze"><span class="codicon codicon-sparkle"></span></button>
        <button class="toolbar-btn" onclick="window.clearChat()" title="Clear Chat"><span class="codicon codicon-clear-all"></span></button>
        <button class="toolbar-btn" onclick="window.newChat()" title="New Chat"><span class="codicon codicon-add"></span></button>
        <button class="toolbar-btn" onclick="window.showHistory()" title="History"><span class="codicon codicon-history"></span></button>
        <button class="toolbar-btn" onclick="window.configureApiKey()" title="Configure API Key"><span class="codicon codicon-key"></span></button>
    </div>

    <!-- Past Chats Mini UI -->
    <div class="past-chats-mini" id="pastChatsMini">
        <div class="past-chats-header">
            <span class="past-chats-title">Recent</span>
            <span class="past-chats-toggle" onclick="window.togglePastChats()" id="pastChatsToggle">show more</span>
        </div>
        <div class="past-chats-list" id="pastChatsList"></div>
    </div>

    <!-- Messages Container -->
    <div class="messages-container" id="messagesContainer">
        <div class="message assistant">
            <div class="message-content">
                Welcome to CP Studio Chat! I can help you with:
                <ul style="margin-top: 12px; margin-left: 20px; line-height: 1.8;">
                    <li>Code analysis and review</li>
                    <li>Complexity analysis</li>
                    <li>Optimization suggestions</li>
                    <li>Debugging help</li>
                </ul>
            </div>
        </div>
    </div>

    <!-- History Popover -->
    <div class="history-popover" id="historyPopover">
        <div class="history-header">Chat History</div>
        <div class="history-content" id="historyContent"></div>
    </div>

    <!-- Floating Capsule Input Bar -->
    <div class="input-container">
        <div class="input-capsule">
            <div class="context-pill" id="contextPill" onclick="window.selectFile()" title="Click to select file">
                <span class="codicon codicon-file-code"></span>
                <span id="contextFileName">No file</span>
                <span class="codicon codicon-chevron-down" style="font-size: 10px; opacity: 0.7;"></span>
            </div>
            <textarea class="input-field" id="messageInput" placeholder="Ask a question..." rows="1"></textarea>
            <div class="input-actions">
                <button class="input-action-btn" onclick="window.attachFile()" title="Attach File">
                    <span class="codicon codicon-attach"></span>
                </button>
                <button class="input-action-btn send-btn" onclick="window.sendMessage()" title="Send" id="sendButton">
                    <span class="codicon codicon-arrow-up"></span>
                </button>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js"></script>
    <script>
        // Functions are already defined in the first script block above
        // This script block handles the rest of the functionality
        
        // Get DOM elements
        // Get DOM elements (functions already defined above)
        const messagesContainer = document.getElementById('messagesContainer');
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        const chatTitle = document.getElementById('chatTitle');
        const contextPill = document.getElementById('contextPill');
        const contextFileName = document.getElementById('contextFileName');
        const historyPopover = document.getElementById('historyPopover');
        const historyContent = document.getElementById('historyContent');
        const historyBtn = document.getElementById('historyBtn');
        const pastChatsMini = document.getElementById('pastChatsMini');
        const pastChatsList = document.getElementById('pastChatsList');
        const pastChatsToggle = document.getElementById('pastChatsToggle');

        // Auto-resize textarea - moved after function definitions
        if (messageInput) {
            messageInput.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = Math.min(this.scrollHeight, 120) + 'px';
            });
        }

        // Send on Enter (Shift+Enter for new line) - moved after function definitions
        if (messageInput) {
            messageInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    window.sendMessage();
                }
            });
        }
        
        // Also attach click handler programmatically as backup
        if (sendButton) {
            sendButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                window.sendMessage();
            });
        }

        // State variables
        let historyVisible = false;
        let pastChatsExpanded = false;
        
        // Override functions to use state variables
        const originalShowHistory = window.showHistory;
        window.showHistory = function() {
            const historyPopover = document.getElementById('historyPopover');
            if (!historyPopover) return;
            historyVisible = !historyVisible;
            historyPopover.classList.toggle('visible', historyVisible);
            if (historyVisible) {
                // History will be rendered by updateMessages command
            } else {
                // Also collapse past chats mini if expanded
                if (pastChatsExpanded) {
                    pastChatsExpanded = false;
                    const pastChatsMini = document.getElementById('pastChatsMini');
                    const pastChatsToggle = document.getElementById('pastChatsToggle');
                    if (pastChatsMini) pastChatsMini.classList.remove('expanded');
                    if (pastChatsToggle) pastChatsToggle.textContent = 'show more';
                }
            }
        };
        
        const originalTogglePastChats = window.togglePastChats;
        window.togglePastChats = function() {
            const pastChatsMini = document.getElementById('pastChatsMini');
            const pastChatsToggle = document.getElementById('pastChatsToggle');
            if (!pastChatsMini || !pastChatsToggle) return;
            
            if (!pastChatsExpanded) {
                pastChatsExpanded = true;
                pastChatsMini.classList.add('expanded');
                pastChatsToggle.textContent = 'show less';
                window.showHistory();
            } else {
                pastChatsExpanded = false;
                pastChatsMini.classList.remove('expanded');
                pastChatsToggle.textContent = 'show more';
                if (historyVisible) {
                    window.showHistory();
                }
            }
        };
        
        const originalSelectChat = window.selectChat;
        window.selectChat = function(sessionId) {
            vscode.postMessage({
                command: 'selectChat',
                sessionId: sessionId
            });
            historyVisible = false;
            const historyPopover = document.getElementById('historyPopover');
            if (historyPopover) historyPopover.classList.remove('visible');
        };

        function renderHistory() {
            // This will be populated by updateMessages command
        }

        function addUserMessage(text) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message user';
            messageDiv.innerHTML = '<div class="message-content">' + escapeHtml(text) + '</div>';
            messagesContainer.appendChild(messageDiv);
            scrollToBottom();
        }

        function addAssistantMessage(content, loading = false) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message assistant' + (loading ? ' loading' : '');
            
            // Extract code blocks and diff blocks BEFORE markdown processing
            const codeBlocks = extractCodeBlocks(content);
            const diffBlocks = extractDiffBlocks(content);
            
            // Replace code blocks with placeholders before markdown rendering
            let contentForMarkdown = content;
            codeBlocks.forEach((block, index) => {
                const placeholder = '__CODE_BLOCK_' + index + '__';
                contentForMarkdown = contentForMarkdown.replace(block.fullMatch, placeholder);
            });

            // Replace diff blocks with placeholders
            diffBlocks.forEach((block, index) => {
                const placeholder = '__DIFF_BLOCK_' + index + '__';
                contentForMarkdown = contentForMarkdown.replace(block.fullMatch, placeholder);
            });

            // Render markdown (if marked is available)
            let htmlContent;
            if (typeof marked !== 'undefined') {
                try {
                    // Configure marked to preserve code block placeholders
                    htmlContent = marked.parse(contentForMarkdown, {
                        breaks: true,
                        gfm: true,
                        headerIds: false,
                        mangle: false
                    });
                } catch (e) {
                    console.error('Markdown parsing error:', e);
                    htmlContent = escapeHtml(contentForMarkdown).replace(/\\n/g, '<br>');
                }
            } else {
                // Fallback if marked is not loaded
                htmlContent = escapeHtml(contentForMarkdown).replace(/\\n/g, '<br>');
            }

            let messageHtml = '<div class="message-content">' + htmlContent + '</div>';

            // Add code blocks back
            codeBlocks.forEach((block, index) => {
                const escapedCode = escapeForJs(block.code);
                const escapedHtmlCode = escapeHtml(block.code);
                const language = block.language || 'C++';
                const escapedCodeAttr = escapeForHtmlAttr(escapedCode);
                const codeHtml = '<div class="code-block">' +
                    '<div class="code-block-header">' +
                    '<span class="language">' + language + '</span>' +
                    '<div class="code-block-actions">' +
                    '<button class="code-action-btn" onclick="window.copyCodeBlock(\\'' + escapedCodeAttr + '\\')">Copy</button>' +
                    '<div class="insert-dropdown">' +
                    '<button class="code-action-btn" onclick="window.toggleInsertDropdown(' + index + ')">Insert ▼</button>' +
                    '<div class="insert-dropdown-content" id="dropdown' + index + '">' +
                    '<div class="insert-dropdown-item" onclick="window.insertCode(\\'' + escapedCodeAttr + '\\', \\'replace\\')">Replace Entire File</div>' +
                    '<div class="insert-dropdown-item" onclick="window.insertCode(\\'' + escapedCodeAttr + '\\', \\'insert\\')">Insert at Cursor</div>' +
                    '<div class="insert-dropdown-item" onclick="window.insertCode(\\'' + escapedCodeAttr + '\\', \\'replace-selection\\')">Replace Selection</div>' +
                    '</div></div></div></div>' +
                    '<pre><code>' + escapedHtmlCode + '</code></pre>' +
                    '<div class="code-block-footer">' +
                    '<button class="insert-code-btn" onclick="window.insertCode(\\'' + escapedCodeAttr + '\\', \\'replace\\')">' +
                    '<span class="codicon codicon-insert"></span>' +
                    '<span>Insert Code</span>' +
                    '</button>' +
                    '</div>' +
                    '</div>';
                messageHtml = messageHtml.replace('__CODE_BLOCK_' + index + '__', codeHtml);
            });

            // Add diff blocks back
            diffBlocks.forEach((block, index) => {
                const diffLines = block.lines.map(line => {
                    return '<div class="diff-line ' + line.type + '">' + escapeHtml(line.content) + '</div>';
                }).join('');
                const diffHtml = '<div class="diff-block">' + diffLines + '</div>';
                messageHtml = messageHtml.replace('__DIFF_BLOCK_' + index + '__', diffHtml);
            });

            messageDiv.innerHTML = messageHtml;
            messagesContainer.appendChild(messageDiv);
            scrollToBottom();
        }

        function extractCodeBlocks(text) {
            // Match code blocks with triple backticks
            const backtick = String.fromCharCode(96);
            const pattern = backtick + backtick + backtick + '(\\w+)?\\n([\\s\\S]*?)' + backtick + backtick + backtick;
            const codeBlockPattern = new RegExp(pattern, 'g');
            const blocks = [];
            let match;
            while ((match = codeBlockPattern.exec(text)) !== null) {
                const language = match[1] || 'cpp';
                const code = match[2].trim();
                blocks.push({
                    fullMatch: match[0],
                    language: language,
                    code: code
                });
            }
            return blocks;
        }

        function extractDiffBlocks(text) {
            // Build regex from string: in template \\n emits \\n in output so regex matches newline
            const diffPattern = new RegExp('(?:^|\\n)([+-][^\\n]*(?:\\n[+-][^\\n]*)*)', 'gm');
            const blocks = [];
            let match;
            while ((match = diffPattern.exec(text)) !== null) {
                const lines = match[1].split('\\n').map(line => ({
                    type: line.startsWith('+') ? 'insert' : line.startsWith('-') ? 'delete' : 'context',
                    content: line.substring(1) || line
                }));
                blocks.push({
                    fullMatch: match[0],
                    lines: lines
                });
            }
            return blocks;
        }

        window.copyCodeBlock = function(code) {
            vscode.postMessage({
                command: 'copyCodeBlock',
                code: code
            });
        };

        window.toggleInsertDropdown = function(index) {
            const dropdown = document.getElementById('dropdown' + index);
            if (!dropdown) return;
            const container = dropdown.parentElement;
            
            document.querySelectorAll('.insert-dropdown').forEach(d => {
                if (d !== container) {
                    d.classList.remove('show');
                }
            });
            
            container.classList.toggle('show');
        };

        document.addEventListener('click', function(e) {
            if (!e.target.closest('.insert-dropdown')) {
                document.querySelectorAll('.insert-dropdown').forEach(d => {
                    d.classList.remove('show');
                });
            }
            if (!e.target.closest('.history-popover') && !e.target.closest('#historyBtn')) {
                historyVisible = false;
                historyPopover.classList.remove('visible');
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

        function escapeForHtmlAttr(text) {
            return text.replace(/&/g, '&amp;')
                      .replace(/"/g, '&quot;')
                      .replace(/'/g, '&#39;')
                      .replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;');
        }

        function scrollToBottom() {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        let currentSessionId = null;

        function renderPastChatsMini(recentChats) {
            if (!recentChats || recentChats.length === 0) {
                if (pastChatsMini) pastChatsMini.style.display = 'none';
                return;
            }
            
            if (pastChatsMini) {
                pastChatsMini.style.display = 'block';
            }
            if (pastChatsList) {
                pastChatsList.innerHTML = '';
                
                recentChats.forEach(chat => {
                    const item = document.createElement('div');
                    item.className = 'past-chat-item-mini';
                    item.textContent = chat.title;
                    item.onclick = () => window.selectChat(chat.id);
                    pastChatsList.appendChild(item);
                });
            }
        }

        function renderHistoryList(sessions, activeSessionId) {
            currentSessionId = activeSessionId;
            historyContent.innerHTML = '';
            
            let hasSessions = false;
            
            if (sessions.globalChats && sessions.globalChats.length > 0) {
                hasSessions = true;
                sessions.globalChats.forEach(session => {
                    const item = document.createElement('div');
                    item.className = 'history-item' + (activeSessionId === session.id ? ' active' : '');
                    item.onclick = () => window.selectChat(session.id);
                    const sessionTitle = escapeHtml(session.title || 'Global Chat');
                    const sessionId = session.id;
                    const escapedSessionId = escapeForHtmlAttr(sessionId);
                    item.innerHTML = '<span class="history-item-label">' + sessionTitle + '</span>' +
                        '<span class="history-item-delete">' +
                        '<button class="input-action-btn" onclick="window.deleteChat(\\'' + escapedSessionId + '\\', event)">' +
                        '<span class="codicon codicon-trash"></span>' +
                        '</button></span>';
                    historyContent.appendChild(item);
                });
            }

            if (sessions.contestGroups && sessions.contestGroups.length > 0) {
                hasSessions = true;
                sessions.contestGroups.forEach(group => {
                    const groupHeader = document.createElement('div');
                    groupHeader.className = 'history-group-header';
                    groupHeader.textContent = 'Contest ' + group.contestId;
                    historyContent.appendChild(groupHeader);
                    
                    group.sessions.forEach(session => {
                        const item = document.createElement('div');
                        item.className = 'history-item' + (activeSessionId === session.id ? ' active' : '');
                        item.onclick = () => window.selectChat(session.id);
                        const label = 'Problem ' + (session.problemIndex || '?');
                        const sessionId = session.id;
                        const escapedSessionId2 = escapeForHtmlAttr(sessionId);
                        item.innerHTML = '<span class="history-item-label">' + escapeHtml(label) + '</span>' +
                            '<span class="history-item-delete">' +
                            '<button class="input-action-btn" onclick="deleteChat(\\'' + escapedSessionId2 + '\\', event)">' +
                            '<span class="codicon codicon-trash"></span>' +
                            '</button></span>';
                        historyContent.appendChild(item);
                    });
                });
            }
            
            if (!hasSessions) {
                const emptyMsg = document.createElement('div');
                emptyMsg.className = 'history-empty';
                emptyMsg.textContent = 'No chat history yet. Start a new chat!';
                historyContent.appendChild(emptyMsg);
            }
        }

        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
                case 'updateMessages':
                    messagesContainer.innerHTML = '';
                    if (message.messages && message.messages.length > 0) {
                        message.messages.forEach(msg => {
                            if (msg.role === 'user') {
                                addUserMessage(msg.content);
                            } else {
                                addAssistantMessage(msg.content);
                            }
                        });
                    } else {
                        // Show welcome message if no messages (problem-aware when context available)
                        const welcomeDiv = document.createElement('div');
                        welcomeDiv.className = 'message assistant';
                        const welcomeHtml = (message.welcomeMessage && typeof message.welcomeMessage === 'string')
                            ? message.welcomeMessage
                            : 'Welcome to CP Studio Chat! I can help you with: ' +
                              '<ul style="margin-top: 12px; margin-left: 20px; line-height: 1.8;">' +
                              '<li>Code analysis and review</li><li>Complexity analysis</li>' +
                              '<li>Optimization suggestions</li><li>Debugging help</li></ul>';
                        welcomeDiv.innerHTML = '<div class="message-content">' + welcomeHtml + '</div>';
                        messagesContainer.appendChild(welcomeDiv);
                    }
                    if (message.chatTitle) {
                        chatTitle.textContent = message.chatTitle;
                    }
                    if (message.context) {
                        if (contextFileName) {
                            contextFileName.textContent = message.context.fileName;
                            console.log('[Webview] Updated context file name:', message.context.fileName);
                        }
                        if (contextPill) {
                            // Update title to show full path on hover
                            if (message.context.filePath) {
                                contextPill.title = message.context.filePath;
                            } else {
                                contextPill.title = 'Click to select file';
                            }
                        }
                    }
                    if (message.sessions) {
                        renderHistoryList(message.sessions, message.currentSessionId);
                    }
                    if (message.recentChats) {
                        renderPastChatsMini(message.recentChats);
                    }
                    scrollToBottom();
                    break;
                    
                case 'addMessage':
                    if (message.message.loading) {
                        // Show typing indicator instead of "..."
                        const typingDiv = document.createElement('div');
                        typingDiv.className = 'message assistant loading';
                        typingDiv.setAttribute('role', 'status');
                        typingDiv.setAttribute('aria-label', 'AI is thinking');
                        typingDiv.innerHTML = '<div class="message-content"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>';
                        messagesContainer.appendChild(typingDiv);
                        scrollToBottom();
                    } else {
                        const loadingMsg = messagesContainer.querySelector('.message.loading');
                        if (loadingMsg) {
                            loadingMsg.remove();
                        }
                        addAssistantMessage(message.message.content);
                    }
                    break;

                case 'toggleHistory':
                    showHistory();
                    break;
            }
        });

        scrollToBottom();

        // Scroll-to-bottom button visibility
        const scrollBtn = document.getElementById('scrollToBottom');
        if (messagesContainer && scrollBtn) {
            messagesContainer.addEventListener('scroll', () => {
                const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
                const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
                scrollBtn.classList.toggle('visible', !isNearBottom);
            });
        }

        // Add ARIA attributes to message container
        if (messagesContainer) {
            messagesContainer.setAttribute('role', 'log');
            messagesContainer.setAttribute('aria-label', 'Chat messages');
            messagesContainer.setAttribute('aria-live', 'polite');
        }
    </script>
</body>
</html>`;
    }
}
