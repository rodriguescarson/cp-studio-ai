import * as vscode from 'vscode';
import { CodeforcesAPI } from './codeforcesApi';
import { SolvedProblemsTracker } from './solvedTracker';
import { getDesignSystemCSS } from './designSystem';

export class ProfileViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'cfStudioProfileView';
    private _view?: vscode.WebviewView;
    private api: CodeforcesAPI;
    private solvedTracker: SolvedProblemsTracker;
    private userInfo: any = null;
    private isLoading = false;
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.api = new CodeforcesAPI();
        this.solvedTracker = new SolvedProblemsTracker(context);
    }

    refresh(): void {
        this.loadUserInfo();
        if (this._view) {
            this.updateContent();
        }
    }

    public show(): void {
        if (this._view) {
            this._view.show(true);
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

        // Register with view manager for single-tab behavior
        const { registerViewForCollapse } = require('./viewManager');
        registerViewForCollapse(ProfileViewProvider.viewType, webviewView);

        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'setupProfile':
                        await vscode.commands.executeCommand('codeforces.setupProfile');
                        break;
                    case 'setupFromUrl':
                        if (message.url && message.url.trim()) {
                            await vscode.commands.executeCommand('codeforces.setupFromUrl', message.url.trim());
                        }
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
                            this.userInfo = null;
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
        if (!this._view) return;

        const username = this.api.getUsername();
        if (!username) {
            this._view.webview.postMessage({ command: 'updateContent', content: this.getSetupContent() });
            return;
        }

        try {
            if (!this.userInfo && !this.isLoading) {
                await this.loadUserInfo();
            }

            if (this.isLoading) {
                this._view.webview.postMessage({ command: 'updateContent', content: this.getLoadingContent() });
                return;
            }

            if (!this.userInfo) {
                this._view.webview.postMessage({ command: 'updateContent', content: this.getSetupContent() });
                return;
            }

            const ratingHistory = await this.api.getUserRating(username);
            const recentSubmissions = await this.api.getUserStatus(username, 1, 10);
            
            let solvedCount = 0;
            try { solvedCount = await this.solvedTracker.getSolvedCount(); } catch {}

            // Get streak data
            const streakData = this.context.globalState.get<{ count: number; lastDate: string }>('cfStudio.streak');
            const streakCount = streakData?.count || 0;

            // Get achievement data
            let achievements: any[] = [];
            try {
                const { AchievementManager } = require('./achievements');
                const am = new AchievementManager(this.context);
                achievements = am.getAllAchievements();
            } catch {}

            // Get heat map data
            let heatMapData: Array<{ date: string; active: boolean }> = [];
            try {
                const { StreakTracker } = require('./streakTracker');
                const st = new StreakTracker(this.context);
                heatMapData = st.getActivityHeatMap(90);
            } catch {}

            // Count problems by difficulty
            const difficultyStats: Record<string, number> = {};
            recentSubmissions.filter((s: any) => s.verdict === 'OK').forEach((s: any) => {
                const idx = s.problem?.index?.[0] || '?';
                difficultyStats[idx] = (difficultyStats[idx] || 0) + 1;
            });
            
            this._view.webview.postMessage({
                command: 'updateContent',
                content: this.getProfileContent(this.userInfo, ratingHistory, recentSubmissions, solvedCount, streakCount, achievements, heatMapData, difficultyStats)
            });
        } catch (error: any) {
            this._view.webview.postMessage({
                command: 'updateContent',
                content: `<div class="error" role="alert">Error loading profile: ${error.message}</div>`
            });
        }
    }

    private async loadUserInfo(): Promise<void> {
        const username = this.api.getUsername();
        if (!username) return;

        this.isLoading = true;
        if (this._view) {
            this._view.webview.postMessage({ command: 'updateContent', content: this.getLoadingContent() });
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
            if (this._view) { this.updateContent(); }
        }
    }

    private getLoadingContent(): string {
        return `
            <div class="cfx-stagger" role="status" aria-label="Loading profile">
                <div class="cfx-card" style="margin-bottom: 16px;">
                    <div style="display:flex; gap:16px; align-items:flex-start;">
                        <div class="cfx-skeleton cfx-skeleton-avatar"></div>
                        <div style="flex:1;">
                            <div class="cfx-skeleton cfx-skeleton-text" style="width:120px; height:20px;"></div>
                            <div class="cfx-skeleton cfx-skeleton-text cfx-skeleton-text-sm" style="margin-top:8px;"></div>
                        </div>
                    </div>
                    <div style="margin-top:16px;">
                        <div class="cfx-skeleton cfx-skeleton-text"></div>
                        <div class="cfx-skeleton cfx-skeleton-text cfx-skeleton-text-lg"></div>
                    </div>
                </div>
                <div class="cfx-skeleton cfx-skeleton-card"></div>
                <div class="cfx-skeleton cfx-skeleton-card"></div>
                <span class="sr-only">Loading profile data...</span>
            </div>
        `;
    }

    private getSetupContent(): string {
        return `
            <div class="cfx-empty cfx-fade-in" role="region" aria-label="Profile setup required">
                <div class="cfx-empty-icon">
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="32" cy="24" r="12" stroke="currentColor" stroke-width="2" opacity="0.3"/>
                        <path d="M12 52c0-11.046 8.954-20 20-20s20 8.954 20 20" stroke="currentColor" stroke-width="2" opacity="0.3"/>
                        <circle cx="32" cy="24" r="4" fill="var(--cfx-accent)" opacity="0.6"/>
                    </svg>
                </div>
                <div class="cfx-empty-title">Welcome to CP Studio</div>
                <div class="cfx-empty-description">Connect your Codeforces profile to track your rating, solved problems, and contest history.</div>
                <button class="cfx-btn cfx-btn-primary" onclick="setupProfile()" aria-label="Set up your Codeforces profile">
                    Set Up Profile
                </button>
            </div>
        `;
    }

    private getRatingColor(rating: number): string {
        if (rating === 0) return '#808080';
        if (rating < 1200) return '#808080';
        if (rating < 1400) return '#008000';
        if (rating < 1600) return '#03A89E';
        if (rating < 1900) return '#0000FF';
        if (rating < 2100) return '#AA00AA';
        if (rating < 2400) return '#FF8C00';
        if (rating < 2600) return '#FF0000';
        return '#FF0000';
    }

    private getProfileContent(user: any, ratingHistory: any[], recentSubmissions: any[], totalSolvedCount: number, streakCount: number, achievements: any[], heatMapData: any[], difficultyStats: Record<string, number>): string {
        const rating = user.rating || 0;
        const rank = user.rank || 'unrated';
        const maxRating = user.maxRating || 0;
        const maxRank = user.maxRank || 'unrated';
        const ratingColor = this.getRatingColor(rating);
        const maxRatingColor = this.getRatingColor(maxRating);
        const avatarUrl = user.avatar || '';

        const unlockedCount = achievements.filter((a: any) => !a.locked).length;

        // Build heat map HTML
        const heatMapCells = heatMapData.map((d: any) => 
            `<div class="cfx-heatmap-cell ${d.active ? 'active' : ''}" title="${d.date}${d.active ? ' - Active' : ''}"></div>`
        ).join('');

        // Build achievements HTML
        const achievementsHtml = achievements.slice(0, 8).map((a: any) => `
            <div class="achievement-item ${a.locked ? 'locked' : 'unlocked'}" title="${a.name}: ${a.description}" role="listitem" aria-label="${a.name} - ${a.locked ? 'Locked' : 'Unlocked'}: ${a.description}">
                <span class="achievement-icon">${a.locked ? '🔒' : a.icon}</span>
                <span class="achievement-name">${a.name}</span>
            </div>
        `).join('');

        // Build difficulty chart HTML
        const difficulties = ['A', 'B', 'C', 'D', 'E', 'F'];
        const maxDiff = Math.max(...difficulties.map(d => difficultyStats[d] || 0), 1);
        const difficultyBars = difficulties.map(d => {
            const count = difficultyStats[d] || 0;
            const pct = Math.round((count / maxDiff) * 100);
            return `<div class="diff-bar-item" aria-label="${d}: ${count} problems">
                <div class="diff-label">${d}</div>
                <div class="diff-bar"><div class="diff-bar-fill" style="width:${pct}%;"></div></div>
                <div class="diff-count">${count}</div>
            </div>`;
        }).join('');

        return `
            <div class="cfx-stagger" role="main" aria-label="Profile dashboard">
                <!-- Profile Card -->
                <div class="cfx-card" role="region" aria-label="Profile information">
                    <div style="display:flex; gap:16px; align-items:flex-start;">
                        ${avatarUrl ? `<img src="${avatarUrl}" alt="${user.handle}" class="profile-avatar" onerror="this.style.display='none'">` : ''}
                        <div style="flex:1; min-width:0;">
                            <div style="font-size:18px; font-weight:700;">${user.handle || 'Unknown'}</div>
                            ${user.firstName || user.lastName ? `<div style="font-size:13px; opacity:0.8; margin-top:4px;">${[user.firstName, user.lastName].filter(Boolean).join(' ')}</div>` : ''}
                            ${user.organization ? `<div style="font-size:12px; opacity:0.7; margin-top:2px;">${user.organization}</div>` : ''}
                        </div>
                    </div>
                    <div class="rating-row" style="margin-top:16px; padding-top:12px; border-top:1px solid var(--vscode-panel-border);">
                        <div class="rating-item">
                            <span style="opacity:0.7; font-size:12px;">Rating</span>
                            <span style="font-size:18px; font-weight:700; color:${ratingColor};" aria-label="Current rating ${rating} ${rank}">${rating}</span>
                            <span class="cfx-badge" style="font-size:10px;">${rank}</span>
                        </div>
                        <div class="rating-item">
                            <span style="opacity:0.7; font-size:12px;">Max</span>
                            <span style="font-size:16px; font-weight:600; color:${maxRatingColor};" aria-label="Max rating ${maxRating} ${maxRank}">${maxRating}</span>
                            <span style="font-size:10px; opacity:0.6;">${maxRank}</span>
                        </div>
                    </div>
                    <div style="display:flex; gap:8px; margin-top:12px;">
                        <button class="cfx-btn cfx-btn-secondary cfx-btn-sm" onclick="changeUsername()" aria-label="Change username">Change</button>
                        <button class="cfx-btn cfx-btn-secondary cfx-btn-sm" onclick="refreshProfile()" aria-label="Refresh profile">Refresh</button>
                    </div>
                </div>

                <!-- Stats Row -->
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-top:12px;" role="region" aria-label="Quick stats">
                    <div class="stat-card cfx-card" style="text-align:center; padding:12px;">
                        <div style="font-size:22px; font-weight:700; color:var(--cfx-green);">${totalSolvedCount}</div>
                        <div style="font-size:11px; opacity:0.7;">Solved</div>
                    </div>
                    <div class="stat-card cfx-card" style="text-align:center; padding:12px;">
                        <div style="font-size:22px; font-weight:700; color:var(--cfx-orange);">${streakCount}</div>
                        <div style="font-size:11px; opacity:0.7;">🔥 Streak</div>
                    </div>
                    <div class="stat-card cfx-card" style="text-align:center; padding:12px;">
                        <div style="font-size:22px; font-weight:700; color:var(--cfx-accent);">${ratingHistory.length}</div>
                        <div style="font-size:11px; opacity:0.7;">Contests</div>
                    </div>
                </div>

                <!-- Difficulty Breakdown -->
                <div class="cfx-card" style="margin-top:12px;" role="region" aria-label="Difficulty breakdown">
                    <div class="cfx-card-header"><div class="cfx-card-title">Difficulty Breakdown</div></div>
                    <div class="diff-chart">${difficultyBars}</div>
                </div>

                <!-- Activity Heat Map (last 90 days) -->
                <div class="cfx-card" style="margin-top:12px;" role="region" aria-label="Activity heat map - last 90 days">
                    <div class="cfx-card-header">
                        <div class="cfx-card-title">Activity (90 days)</div>
                    </div>
                    <div class="heatmap-container">${heatMapCells}</div>
                </div>

                <!-- Achievements -->
                <div class="cfx-card" style="margin-top:12px;" role="region" aria-label="Achievements ${unlockedCount} of ${achievements.length} unlocked">
                    <div class="cfx-card-header">
                        <div class="cfx-card-title">Achievements</div>
                        <span class="cfx-badge">${unlockedCount}/${achievements.length}</span>
                    </div>
                    <div class="achievements-grid" role="list">${achievementsHtml}</div>
                </div>

                <!-- Recent Submissions -->
                <div class="cfx-card" style="margin-top:12px;" role="region" aria-label="Recent submissions">
                    <div class="cfx-card-header"><div class="cfx-card-title">Recent Submissions</div></div>
                    <div class="cfx-stagger" role="list">
                        ${recentSubmissions.slice(0, 5).map((sub: any) => {
                            const problem = sub.problem;
                            const verdict = sub.verdict || 'UNKNOWN';
                            const problemId = `${problem.contestId || ''}${problem.index || ''}`;
                            const isOK = verdict === 'OK';
                            return `
                                <div class="submission-item" role="listitem" aria-label="Problem ${problemId} verdict ${verdict}">
                                    <span class="problem-id">${problemId}</span>
                                    <span class="cfx-badge ${isOK ? 'cfx-badge-success' : 'cfx-badge-danger'}">${verdict}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    ${totalSolvedCount > 0 ? `
                    <button class="cfx-btn cfx-btn-secondary" style="width:100%; margin-top:12px;" onclick="showSolvedProblems()" aria-label="View all ${totalSolvedCount} solved problems">
                        View All Solved Problems
                    </button>` : ''}
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
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: http: data:; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
    <title>CP Studio Profile</title>
    <style>
        ${designCSS}

        body { padding: 0; overflow: hidden; display: flex; flex-direction: column; height: 100vh; }

        #quick-setup { margin: 12px 12px 0 12px; flex-shrink: 0; }
        #content { flex: 1; overflow-y: auto; padding: 12px; min-height: 0; }

        .profile-avatar {
            width: 64px; height: 64px;
            border-radius: var(--cfx-radius-lg);
            object-fit: cover;
            border: 2px solid var(--vscode-panel-border);
            flex-shrink: 0;
        }

        .rating-row {
            display: flex; gap: 24px;
        }
        .rating-item {
            display: flex; flex-direction: column; gap: 2px;
        }

        .diff-chart { display: flex; flex-direction: column; gap: 6px; }
        .diff-bar-item { display: flex; align-items: center; gap: 8px; }
        .diff-label { width: 16px; font-weight: 600; font-size: 12px; text-align: center; }
        .diff-bar { flex: 1; height: 8px; background: var(--vscode-editor-background); border-radius: 4px; overflow: hidden; }
        .diff-bar-fill { height: 100%; background: var(--cfx-accent); border-radius: 4px; transition: width 0.5s ease; }
        .diff-count { width: 24px; font-size: 11px; text-align: right; opacity: 0.7; }

        .heatmap-container {
            display: grid;
            grid-template-columns: repeat(13, 1fr);
            gap: 2px;
        }
        .cfx-heatmap-cell { width: 100%; aspect-ratio: 1; min-width: 0; }

        .achievements-grid {
            display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;
        }
        .achievement-item {
            display: flex; align-items: center; gap: 8px;
            padding: 8px; border-radius: var(--cfx-radius-md);
            background: var(--vscode-editor-background);
            transition: all var(--cfx-transition-fast);
            font-size: 12px;
        }
        .achievement-item:hover { background: var(--vscode-list-hoverBackground); }
        .achievement-item.locked { opacity: 0.4; }
        .achievement-item.unlocked { border-left: 2px solid var(--cfx-accent); }
        .achievement-icon { font-size: 18px; }
        .achievement-name { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .submission-item {
            display: flex; justify-content: space-between; align-items: center;
            padding: 8px 12px; margin-bottom: 4px;
            background: var(--vscode-editor-background);
            border-radius: var(--cfx-radius-md);
            transition: background var(--cfx-transition-fast);
        }
        .submission-item:hover { background: var(--vscode-list-hoverBackground); }
        .problem-id { font-family: var(--vscode-editor-font-family); font-weight: 600; font-size: 13px; }

        .error { color: var(--vscode-errorForeground); padding: 16px; }

        .quick-setup {
            padding: 14px; background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: var(--cfx-radius-lg);
        }
        .quick-setup h3 { margin: 0 0 10px 0; font-size: 13px; font-weight: 600; }
        .quick-setup-row { display: flex; gap: 6px; }
        .quick-setup-error { margin-top: 6px; font-size: 11px; color: var(--vscode-errorForeground); display: none; }
        .quick-setup-hint { margin-top: 8px; font-size: 11px; opacity: 0.6; }
    </style>
</head>
<body>
    <div id="quick-setup" class="quick-setup" role="search" aria-label="Quick problem setup">
        <h3>&#9889; Problem Setup</h3>
        <div class="quick-setup-row">
            <input type="text" id="url-input" class="cfx-input"
                   placeholder="Paste problem or contest URL..."
                   spellcheck="false" autocomplete="off"
                   aria-label="Problem URL input" />
            <button id="setup-btn" class="cfx-btn cfx-btn-primary cfx-btn-sm" onclick="setupFromUrl()" aria-label="Set up problem from URL">Setup</button>
        </div>
        <div id="url-error" class="quick-setup-error" role="alert"></div>
        <div class="quick-setup-hint">Codeforces, LeetCode, GeeksforGeeks</div>
    </div>
    <div id="content" role="main" aria-live="polite" style="flex: 1; overflow-y: auto; padding: 12px;">
        <div class="cfx-stagger" role="status" aria-label="Loading">
            <div class="cfx-skeleton cfx-skeleton-card"></div>
            <div class="cfx-skeleton cfx-skeleton-card"></div>
        </div>
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        const contentDiv = document.getElementById('content');
        const urlInput = document.getElementById('url-input');
        const urlError = document.getElementById('url-error');
        const setupBtn = document.getElementById('setup-btn');

        function isValidUrl(url) {
            return url && (url.includes('codeforces.com') || url.includes('leetcode.com') || url.includes('geeksforgeeks.org'));
        }

        function setupFromUrl() {
            const url = urlInput.value.trim();
            if (!url) { urlError.textContent = 'Please enter a URL'; urlError.style.display = 'block'; return; }
            if (!isValidUrl(url)) { urlError.textContent = 'Unsupported URL. Use Codeforces, LeetCode, or GeeksforGeeks.'; urlError.style.display = 'block'; return; }
            urlError.style.display = 'none';
            setupBtn.disabled = true;
            setupBtn.textContent = 'Setting up...';
            vscode.postMessage({ command: 'setupFromUrl', url: url });
            setTimeout(() => { setupBtn.disabled = false; setupBtn.textContent = 'Setup'; urlInput.value = ''; }, 3000);
        }

        urlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') setupFromUrl();
            urlError.style.display = 'none';
        });

        function setupProfile() { vscode.postMessage({ command: 'setupProfile' }); }
        function refreshProfile() { vscode.postMessage({ command: 'refresh' }); }
        function changeUsername() { vscode.postMessage({ command: 'changeUsername' }); }
        function showSolvedProblems() { vscode.postMessage({ command: 'showSolvedProblems' }); }

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
