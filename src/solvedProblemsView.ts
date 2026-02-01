import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { SolvedProblemsTracker } from './solvedTracker';

export class SolvedProblemsViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'cfStudioSolvedProblemsView';
    private _view?: vscode.WebviewView;
    private solvedTracker: SolvedProblemsTracker;
    private isLoading = false;

    constructor(context: vscode.ExtensionContext) {
        this.solvedTracker = new SolvedProblemsTracker(context);
    }

    refresh(): void {
        this.updateContent();
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [],
            enableCommandUris: true
        };

        webviewView.webview.html = this.getWebviewContent();

        // Register with view manager for single-tab behavior
        const { registerViewForCollapse } = require('./viewManager');
        registerViewForCollapse(SolvedProblemsViewProvider.viewType, webviewView);

        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'refresh':
                        await this.refreshSolvedProblems();
                        break;
                    case 'openProblem':
                        await this.openProblem(message.contestId, message.problemIndex);
                        break;
                    case 'openCodeforces':
                        await vscode.env.openExternal(vscode.Uri.parse(message.url));
                        break;
                }
            }
        );

        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                this.updateContent();
            }
        });

        this.updateContent();
    }

    private async refreshSolvedProblems(): Promise<void> {
        try {
            this.isLoading = true;
            if (this._view) {
                this._view.webview.postMessage({
                    command: 'updateContent',
                    content: this.getLoadingContent()
                });
            }

            await this.solvedTracker.refreshSolvedProblems();
            await this.updateContent();
            
            const count = await this.solvedTracker.getSolvedCount();
            vscode.window.showInformationMessage(`Refreshed: ${count} solved problems`);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to refresh: ${error.message}`);
        } finally {
            this.isLoading = false;
        }
    }

    private async updateContent(): Promise<void> {
        if (!this._view) {
            return;
        }

        try {
            if (this.isLoading) {
                this._view.webview.postMessage({
                    command: 'updateContent',
                    content: this.getLoadingContent()
                });
                return;
            }

            const solved = await this.solvedTracker.getSolvedProblems();
            const cacheInfo = this.solvedTracker.getCacheInfo();
            
            this._view.webview.postMessage({
                command: 'updateContent',
                content: this.getSolvedProblemsContent(Array.from(solved), cacheInfo)
            });
        } catch (error: any) {
            this._view.webview.postMessage({
                command: 'updateContent',
                content: `<div class="error">Error loading solved problems: ${error.message}</div>`
            });
        }
    }

    private async openProblem(contestId: number, problemIndex: string): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showWarningMessage('No workspace folder open');
            return;
        }

        const config = vscode.workspace.getConfiguration('codeforces');
        const contestsPath = config.get<string>('contestsPath', '${workspaceFolder}/contests') || '';
        let problemDir = contestsPath.replace('${workspaceFolder}', workspaceFolder.uri.fsPath);
        problemDir = path.join(problemDir, contestId.toString(), problemIndex);

        const mainCppPath = path.join(problemDir, 'main.cpp');
        
        if (fs.existsSync(mainCppPath)) {
            const uri = vscode.Uri.file(mainCppPath);
            await vscode.window.showTextDocument(uri);
        } else {
            // Open the problem directory in explorer
            const uri = vscode.Uri.file(problemDir);
            await vscode.commands.executeCommand('revealFileInOS', uri);
            vscode.window.showInformationMessage(
                `Problem directory: ${problemDir}. Use "cfx: Setup Contest from URL" to set it up.`
            );
        }
    }

    private getLoadingContent(): string {
        return `
            <div class="container">
                <h2>Loading Solved Problems...</h2>
                <p>Please wait while we fetch your solved problems from Codeforces.</p>
            </div>
        `;
    }

    private getSolvedProblemsContent(problems: string[], cacheInfo: { lastRefresh: number | null; count: number } | null): string {
        // Sort problems by contest ID
        const sortedProblems = problems.sort((a, b) => {
            // Extract contest ID (numbers before the letter)
            const aMatch = a.match(/^(\d+)/);
            const bMatch = b.match(/^(\d+)/);
            const aId = aMatch ? parseInt(aMatch[1], 10) : 0;
            const bId = bMatch ? parseInt(bMatch[1], 10) : 0;
            return aId - bId;
        });

        const lastRefresh = cacheInfo && cacheInfo.lastRefresh !== null
            ? new Date(cacheInfo.lastRefresh).toLocaleString()
            : 'Never';

        return `
            <div class="container">
                <div class="header">
                    <h2>Solved Problems</h2>
                    <div class="stats">
                        <span class="count">${problems.length} solved</span>
                        <span class="last-refresh">Last refresh: ${lastRefresh}</span>
                    </div>
                    <button class="refresh-btn" onclick="refreshSolved()">Refresh</button>
                </div>
                <div class="problems-list">
                    ${sortedProblems.length === 0 
                        ? '<div class="empty">No solved problems found. Make sure your Codeforces username is configured.</div>'
                        : sortedProblems.map(problemId => {
                            // Parse contestId and problemIndex from format like "69A"
                            const match = problemId.match(/^(\d+)([A-Z]+)$/);
                            if (!match) return '';
                            
                            const contestId = match[1];
                            const problemIndex = match[2];
                            const problemUrl = `https://codeforces.com/problemset/problem/${contestId}/${problemIndex}`;
                            
                            return `
                                <div class="problem-item">
                                    <span class="problem-id">${contestId}${problemIndex}</span>
                                    <div class="problem-actions">
                                        <button class="action-btn" onclick="openProblem(${contestId}, '${problemIndex}')">Open</button>
                                        <button class="action-btn" onclick="openCodeforces('${problemUrl}')">View on CF</button>
                                    </div>
                                </div>
                            `;
                        }).join('')
                    }
                </div>
            </div>
        `;
    }

    private getWebviewContent(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
    <title>Solved Problems</title>
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
            background-color: var(--vscode-sideBar-background);
            padding: 15px;
        }

        .container {
            width: 100%;
        }

        .header {
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        h2 {
            font-size: 18px;
            margin-bottom: 8px;
        }

        .stats {
            display: flex;
            gap: 15px;
            font-size: 12px;
            opacity: 0.8;
            margin-bottom: 10px;
        }

        .count {
            font-weight: 600;
            color: var(--vscode-testing-iconPassed);
        }

        .refresh-btn {
            padding: 6px 12px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }

        .refresh-btn:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .problems-list {
            max-height: calc(100vh - 150px);
            overflow-y: auto;
        }

        .problem-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            margin-bottom: 6px;
            background-color: var(--vscode-list-hoverBackground);
            border-radius: 6px;
            transition: background-color 0.2s;
        }

        .problem-item:hover {
            background-color: var(--vscode-list-activeSelectionBackground);
        }

        .problem-id {
            font-family: var(--vscode-editor-font-family);
            font-weight: 600;
            font-size: 14px;
        }

        .problem-actions {
            display: flex;
            gap: 6px;
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

        .empty {
            text-align: center;
            padding: 40px 20px;
            opacity: 0.7;
        }

        .error {
            color: var(--vscode-errorForeground);
            padding: 15px;
        }
    </style>
</head>
<body>
    <div id="content">Loading...</div>
    <script>
        const vscode = acquireVsCodeApi();
        const contentDiv = document.getElementById('content');

        function refreshSolved() {
            vscode.postMessage({ command: 'refresh' });
        }

        function openProblem(contestId, problemIndex) {
            vscode.postMessage({ command: 'openProblem', contestId, problemIndex });
        }

        function openCodeforces(url) {
            vscode.postMessage({ command: 'openCodeforces', url });
        }

        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'updateContent') {
                contentDiv.innerHTML = message.content;
            }
        });
    </script>
</body>
</html>`;
    }
}
