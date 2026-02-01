import * as vscode from 'vscode';
import { CodeforcesAPI } from './codeforcesApi';
import { SolvedProblemsTracker } from './solvedTracker';

export class ProfileViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'cfStudioProfileView';
    private _view?: vscode.WebviewView;
    private api: CodeforcesAPI;
    private solvedTracker: SolvedProblemsTracker;
    private userInfo: any = null;
    private isLoading = false;

    constructor(context: vscode.ExtensionContext) {
        this.api = new CodeforcesAPI();
        this.solvedTracker = new SolvedProblemsTracker(context);
    }

    refresh(): void {
        this.loadUserInfo();
        if (this._view) {
            this.updateContent();
        }
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

        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'setupProfile':
                        await vscode.commands.executeCommand('codeforces.setupProfile');
                        break;
                    case 'changeUsername':
                        const newUsername = await vscode.window.showInputBox({
                            prompt: 'Enter your Codeforces username',
                            placeHolder: 'your_handle',
                            value: this.api.getUsername() || '',
                            validateInput: (value) => {
                                if (!value || value.trim() === '') {
                                    return 'Username cannot be empty';
                                }
                                return null;
                            }
                        });
                        if (newUsername) {
                            this.api.setUsername(newUsername);
                            this.userInfo = null; // Reset to force reload
                            this.refresh();
                        }
                        break;
                    case 'refresh':
                        this.refresh();
                        break;
                    case 'showSolvedProblems':
                        await vscode.commands.executeCommand('codeforces.showSolvedProblems');
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

    private async updateContent(): Promise<void> {
        if (!this._view) {
            return;
        }

        const username = this.api.getUsername();
        if (!username) {
            this._view.webview.postMessage({
                command: 'updateContent',
                content: this.getSetupContent()
            });
            return;
        }

        try {
            if (!this.userInfo && !this.isLoading) {
                await this.loadUserInfo();
            }

            if (this.isLoading) {
                this._view.webview.postMessage({
                    command: 'updateContent',
                    content: this.getLoadingContent()
                });
                return;
            }

            if (!this.userInfo) {
                this._view.webview.postMessage({
                    command: 'updateContent',
                    content: this.getSetupContent()
                });
                return;
            }

            const ratingHistory = await this.api.getUserRating(username);
            const recentSubmissions = await this.api.getUserStatus(username, 1, 10);
            
            // Get solved problems count
            let solvedCount = 0;
            try {
                solvedCount = await this.solvedTracker.getSolvedCount();
            } catch (error) {
                // Silently fail if solved check fails
                console.log('Could not get solved count:', error);
            }
            
            this._view.webview.postMessage({
                command: 'updateContent',
                content: this.getProfileContent(this.userInfo, ratingHistory, recentSubmissions, solvedCount)
            });
        } catch (error: any) {
            this._view.webview.postMessage({
                command: 'updateContent',
                content: `<div class="error">Error loading profile: ${error.message}</div>`
            });
        }
    }

    private async loadUserInfo(): Promise<void> {
        const username = this.api.getUsername();
        if (!username) {
            return;
        }

        this.isLoading = true;
        if (this._view) {
            this._view.webview.postMessage({
                command: 'updateContent',
                content: this.getLoadingContent()
            });
        }

        try {
            const users = await this.api.getUserInfo([username]);
            if (users && users.length > 0) {
                this.userInfo = users[0];
            }
        } catch (error) {
            console.error('Error loading user info:', error);
            this.userInfo = null;
        } finally {
            this.isLoading = false;
            if (this._view) {
                this.updateContent();
            }
        }
    }

    private getLoadingContent(): string {
        return `
            <div class="setup-container">
                <h2>Loading Profile...</h2>
                <p>Please wait while we fetch your Codeforces profile data.</p>
            </div>
        `;
    }

    private getSetupContent(): string {
        return `
            <div class="setup-container">
                <h2>Profile Setup</h2>
                <p>To view your Codeforces profile, please configure your username in the .env file:</p>
                <pre>CF_USERNAME=your_handle</pre>
                <p>Or use the setup command to configure it.</p>
                <button class="setup-btn" onclick="setupProfile()">Setup Profile</button>
            </div>
        `;
    }

    private getRatingColor(rating: number): string {
        if (rating === 0) return '#808080'; // Gray (Unrated)
        if (rating < 1200) return '#808080'; // Gray (Newbie)
        if (rating < 1400) return '#008000'; // Green (Pupil)
        if (rating < 1600) return '#03A89E'; // Cyan (Specialist)
        if (rating < 1900) return '#0000FF'; // Blue (Expert)
        if (rating < 2100) return '#AA00AA'; // Purple (Candidate Master)
        if (rating < 2300) return '#FF8C00'; // Orange (Master)
        if (rating < 2400) return '#FF8C00'; // Orange (International Master)
        if (rating < 2600) return '#FF0000'; // Red (Grandmaster)
        if (rating < 3000) return '#FF0000'; // Red (International Grandmaster)
        return '#FF0000'; // Red (Legendary Grandmaster)
    }

    private getProfileContent(user: any, ratingHistory: any[], recentSubmissions: any[], totalSolvedCount: number = 0): string {
        const rating = user.rating || 0;
        const rank = user.rank || 'unrated';
        const maxRating = user.maxRating || 0;
        const maxRank = user.maxRank || 'unrated';
        const recentSolvedCount = recentSubmissions.filter(s => s.verdict === 'OK').length;
        const avatarUrl = user.avatar || '';
        const titlePhotoUrl = user.titlePhoto || '';
        const ratingColor = this.getRatingColor(rating);
        const maxRatingColor = this.getRatingColor(maxRating);

        return `
            <div class="profile-container">
                <div class="profile-header">
                    <div class="profile-avatar-section">
                        ${avatarUrl ? `<img src="${avatarUrl}" alt="${user.handle || 'User'}" class="profile-avatar" onerror="this.style.display='none'">` : ''}
                        <div class="profile-info">
                            <h2>${user.handle || 'Unknown'}</h2>
                            ${user.firstName || user.lastName ? `<div class="profile-name">${[user.firstName, user.lastName].filter(Boolean).join(' ')}</div>` : ''}
                            ${user.organization ? `<div class="profile-org">${user.organization}</div>` : ''}
                            ${user.country || user.city ? `<div class="profile-location">${[user.city, user.country].filter(Boolean).join(', ')}</div>` : ''}
                        </div>
                    </div>
                    <div class="rating-info">
                        <div class="rating-item">
                            <span class="label">Current Rating:</span>
                            <span class="value" style="color: ${ratingColor};">${rating} (${rank})</span>
                        </div>
                        <div class="rating-item">
                            <span class="label">Max Rating:</span>
                            <span class="value" style="color: ${maxRatingColor};">${maxRating} (${maxRank})</span>
                        </div>
                    </div>
                    <div class="profile-header-actions">
                        <button class="action-btn" onclick="changeUsername()">Change Username</button>
                        <button class="action-btn" onclick="refreshProfile()">Refresh</button>
                    </div>
                </div>
                <div class="stats-section">
                    <h3>Statistics</h3>
                    <div class="stat-item">
                        <span class="stat-label">Rating Changes:</span>
                        <span class="stat-value">${ratingHistory.length}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Recent Solved:</span>
                        <span class="stat-value">${recentSolvedCount}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total Solved:</span>
                        <span class="stat-value">${totalSolvedCount}</span>
                    </div>
                    ${totalSolvedCount > 0 ? `
                    <div class="stat-item" style="margin-top: 10px;">
                        <button class="action-btn" onclick="showSolvedProblems()" style="width: 100%;">View All Solved Problems</button>
                    </div>
                    ` : ''}
                </div>
                <div class="recent-section">
                    <h3>Recent Submissions</h3>
                    <div class="submissions-list">
                        ${recentSubmissions.slice(0, 5).map(sub => {
                            const problem = sub.problem;
                            const verdict = sub.verdict || 'UNKNOWN';
                            const problemId = `${problem.contestId || ''}${problem.index || ''}`;
                            return `
                                <div class="submission-item">
                                    <span class="problem-id">${problemId}</span>
                                    <span class="verdict ${verdict.toLowerCase()}">${verdict}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
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
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: http: data:; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
    <title>CFX Profile</title>
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
            height: 100vh;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        #content {
            flex: 1;
            overflow-y: auto;
            padding: 15px;
            min-height: 0;
        }

        .setup-container, .profile-container {
            width: 100%;
        }

        h2 {
            font-size: 18px;
            margin-bottom: 10px;
            color: var(--vscode-foreground);
        }

        h3 {
            font-size: 14px;
            margin-top: 15px;
            margin-bottom: 8px;
            color: var(--vscode-foreground);
        }

        .profile-header {
            margin-bottom: 20px;
            padding: 16px;
            background: var(--vscode-card-background);
            border: 1px solid var(--vscode-card-border);
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .profile-avatar-section {
            display: flex;
            align-items: flex-start;
            gap: 16px;
            margin-bottom: 16px;
        }

        .profile-avatar {
            width: 80px;
            height: 80px;
            border-radius: 12px;
            object-fit: cover;
            border: 3px solid var(--vscode-panel-border);
            flex-shrink: 0;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .profile-info {
            flex: 1;
            min-width: 0;
        }

        .profile-info h2 {
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 6px;
            color: var(--vscode-foreground);
        }

        .profile-name {
            font-size: 14px;
            font-weight: 500;
            margin-top: 4px;
            opacity: 0.9;
        }

        .profile-org {
            font-size: 13px;
            margin-top: 6px;
            opacity: 0.85;
            font-weight: 500;
        }

        .profile-location {
            font-size: 12px;
            margin-top: 4px;
            opacity: 0.75;
        }

        .rating-info {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid var(--vscode-panel-border);
        }

        .rating-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding: 6px 0;
        }

        .label {
            font-weight: 500;
            opacity: 0.85;
            font-size: 13px;
        }

        .value {
            font-weight: 700;
            font-size: 14px;
            transition: color 0.2s;
        }

        .stats-section, .recent-section {
            margin-top: 20px;
            padding: 16px;
            background: var(--vscode-card-background);
            border: 1px solid var(--vscode-card-border);
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .stat-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding: 5px 0;
        }

        .stat-label {
            opacity: 0.8;
        }

        .stat-value {
            font-weight: 600;
        }

        .submissions-list {
            margin-top: 10px;
        }

        .submission-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            margin-bottom: 6px;
            background-color: var(--vscode-list-hoverBackground);
            border-radius: 6px;
            transition: background-color 0.2s;
        }

        .submission-item:hover {
            background-color: var(--vscode-list-activeSelectionBackground);
        }

        .problem-id {
            font-family: var(--vscode-editor-font-family);
            font-weight: 500;
        }

        .verdict {
            font-size: 11px;
            padding: 2px 6px;
            border-radius: 3px;
        }

        .verdict.ok {
            background-color: var(--vscode-testing-iconPassed);
            color: var(--vscode-foreground);
        }

        .verdict.wrong_answer, .verdict.runtime_error, .verdict.time_limit_exceeded {
            background-color: var(--vscode-testing-iconFailed);
            color: var(--vscode-foreground);
        }

        pre {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 8px;
            border-radius: 4px;
            margin: 10px 0;
            font-family: var(--vscode-editor-font-family);
        }

        .error {
            color: var(--vscode-errorForeground);
            padding: 10px;
        }

        .setup-btn {
            margin-top: 15px;
            padding: 8px 16px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
        }

        .setup-btn:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .profile-header-actions {
            display: flex;
            gap: 8px;
            margin-top: 12px;
        }

        .action-btn {
            padding: 6px 12px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }

        .action-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
    </style>
</head>
    <body>
    <div id="content" style="height: 100%; overflow-y: auto;">Loading...</div>
    <script>
        const vscode = acquireVsCodeApi();
        const contentDiv = document.getElementById('content');

        function setupProfile() {
            vscode.postMessage({ command: 'setupProfile' });
        }

        function refreshProfile() {
            vscode.postMessage({ command: 'refresh' });
        }

        function changeUsername() {
            vscode.postMessage({ command: 'changeUsername' });
        }

        function showSolvedProblems() {
            vscode.postMessage({ command: 'showSolvedProblems' });
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
