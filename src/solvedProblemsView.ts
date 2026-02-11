import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { SolvedProblemsTracker } from './solvedTracker';
import { getDesignSystemCSS } from './designSystem';

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
        if (!this._view) return;

        try {
            if (this.isLoading) {
                this._view.webview.postMessage({ command: 'updateContent', content: this.getLoadingContent() });
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
                content: `<div class="error" role="alert">Error loading solved problems: ${error.message}</div>`
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
            const uri = vscode.Uri.file(problemDir);
            await vscode.commands.executeCommand('revealFileInOS', uri);
            vscode.window.showInformationMessage(
                `Problem directory: ${problemDir}. Use "CP Studio: Setup Problem from URL" to set it up.`
            );
        }
    }

    private getLoadingContent(): string {
        return `
            <div class="cfx-stagger" role="status" aria-label="Loading solved problems">
                <div class="cfx-skeleton cfx-skeleton-text" style="width:160px; height:20px;"></div>
                <div class="cfx-skeleton cfx-skeleton-card"></div>
                <div class="cfx-skeleton cfx-skeleton-card"></div>
                <div class="cfx-skeleton cfx-skeleton-card"></div>
                <div class="cfx-skeleton cfx-skeleton-card"></div>
                <span class="sr-only">Loading solved problems...</span>
            </div>
        `;
    }

    private getSolvedProblemsContent(problems: string[], cacheInfo: { lastRefresh: number | null; count: number } | null): string {
        if (problems.length === 0) {
            return `
                <div class="cfx-empty cfx-fade-in" role="region" aria-label="No solved problems">
                    <div class="cfx-empty-icon">
                        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                            <rect x="12" y="16" width="40" height="36" rx="4" stroke="currentColor" stroke-width="2" opacity="0.2"/>
                            <path d="M24 32l6 6 12-12" stroke="var(--cfx-accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.4"/>
                        </svg>
                    </div>
                    <div class="cfx-empty-title">No Solved Problems Yet</div>
                    <div class="cfx-empty-description">Set up your Codeforces username and start solving problems. Your progress will appear here.</div>
                    <button class="cfx-btn cfx-btn-primary" onclick="refreshSolved()" aria-label="Refresh solved problems">Refresh</button>
                </div>
            `;
        }

        const sortedProblems = problems.sort((a, b) => {
            const aMatch = a.match(/^(\d+)/);
            const bMatch = b.match(/^(\d+)/);
            return (bMatch ? parseInt(bMatch[1], 10) : 0) - (aMatch ? parseInt(aMatch[1], 10) : 0);
        });

        const lastRefresh = cacheInfo && cacheInfo.lastRefresh !== null
            ? new Date(cacheInfo.lastRefresh).toLocaleString()
            : 'Never';

        return `
            <div class="cfx-fade-in" role="region" aria-label="Solved problems list">
                <div class="header-section" style="margin-bottom:12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <div>
                            <span class="cfx-badge cfx-badge-success" aria-label="${problems.length} solved">${problems.length} solved</span>
                        </div>
                        <button class="cfx-btn cfx-btn-secondary cfx-btn-sm" onclick="refreshSolved()" aria-label="Refresh solved problems">Refresh</button>
                    </div>
                    <input type="text" class="cfx-input" id="search-input" placeholder="Search problems (e.g. 1234A)..." 
                           oninput="filterProblems()" aria-label="Search solved problems" style="margin-bottom:4px;" />
                    <div style="font-size:11px; opacity:0.5;">Last refresh: ${lastRefresh}</div>
                </div>
                <div id="problems-list" class="problems-list cfx-stagger" role="list" aria-label="Solved problems">
                    ${sortedProblems.map(problemId => {
                        const match = problemId.match(/^(\d+)([A-Z]+)$/);
                        if (!match) return '';
                        const contestId = match[1];
                        const problemIndex = match[2];
                        const problemUrl = `https://codeforces.com/problemset/problem/${contestId}/${problemIndex}`;
                        return `
                            <div class="problem-item" data-id="${problemId}" role="listitem" aria-label="Problem ${contestId}${problemIndex}">
                                <span class="problem-id">${contestId}${problemIndex}</span>
                                <div class="problem-actions">
                                    <button class="cfx-btn cfx-btn-secondary cfx-btn-sm" onclick="openProblem(${contestId}, '${problemIndex}')" aria-label="Open problem ${contestId}${problemIndex} locally">Open</button>
                                    <button class="cfx-btn cfx-btn-ghost cfx-btn-sm" onclick="openCodeforces('${problemUrl}')" aria-label="View ${contestId}${problemIndex} on Codeforces">CF</button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    private getWebviewContent(): string {
        const designCSS = getDesignSystemCSS();
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
    <title>Solved Problems</title>
    <style>
        ${designCSS}

        body { padding: 15px; }

        .problems-list { max-height: calc(100vh - 150px); overflow-y: auto; }

        .problem-item {
            display: flex; justify-content: space-between; align-items: center;
            padding: 10px 12px; margin-bottom: 4px;
            background: var(--vscode-editor-background);
            border-radius: var(--cfx-radius-md);
            transition: all var(--cfx-transition-fast);
        }
        .problem-item:hover {
            background: var(--vscode-list-hoverBackground);
            border-left: 2px solid var(--cfx-accent);
            padding-left: 10px;
        }
        .problem-id { font-family: var(--vscode-editor-font-family); font-weight: 600; font-size: 13px; }
        .problem-actions { display: flex; gap: 4px; }
        .error { color: var(--vscode-errorForeground); padding: 15px; }
    </style>
</head>
<body>
    <div id="content" role="main" aria-live="polite">
        <div class="cfx-stagger" role="status">
            <div class="cfx-skeleton cfx-skeleton-card"></div>
            <div class="cfx-skeleton cfx-skeleton-card"></div>
        </div>
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        const contentDiv = document.getElementById('content');

        function refreshSolved() { vscode.postMessage({ command: 'refresh' }); }
        function openProblem(contestId, problemIndex) { vscode.postMessage({ command: 'openProblem', contestId, problemIndex }); }
        function openCodeforces(url) { vscode.postMessage({ command: 'openCodeforces', url }); }

        function filterProblems() {
            const query = document.getElementById('search-input')?.value?.toLowerCase() || '';
            const items = document.querySelectorAll('.problem-item');
            items.forEach(item => {
                const id = (item.getAttribute('data-id') || '').toLowerCase();
                item.style.display = id.includes(query) ? '' : 'none';
            });
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
