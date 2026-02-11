import * as vscode from 'vscode';
import * as path from 'path';
import { CodeforcesAPI } from './codeforcesApi';

export class StatusBarManager {
    private ratingItem: vscode.StatusBarItem;
    private problemItem: vscode.StatusBarItem;
    private runItem: vscode.StatusBarItem;
    private streakItem: vscode.StatusBarItem;
    private api: CodeforcesAPI;
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.api = new CodeforcesAPI();

        // Rating item (leftmost)
        this.ratingItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.ratingItem.command = 'cfStudioProfileView.focus';
        this.ratingItem.tooltip = 'CP Studio - Click to view profile';
        context.subscriptions.push(this.ratingItem);

        // Streak item
        this.streakItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
        this.streakItem.tooltip = 'Daily solving streak';
        context.subscriptions.push(this.streakItem);

        // Active problem item
        this.problemItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 98);
        this.problemItem.command = 'codeforces.showProblemStatement';
        this.problemItem.tooltip = 'Current problem - Click to view statement';
        context.subscriptions.push(this.problemItem);

        // Quick run button
        this.runItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 97);
        this.runItem.text = '$(play) Run';
        this.runItem.command = 'codeforces.runTests';
        this.runItem.tooltip = 'Run Tests (Ctrl+Shift+T)';
        context.subscriptions.push(this.runItem);

        // Listen for editor changes
        context.subscriptions.push(
            vscode.window.onDidChangeActiveTextEditor(() => this.updateProblemContext())
        );

        this.initialize();
    }

    private async initialize(): Promise<void> {
        await this.updateRating();
        this.updateProblemContext();
        this.updateStreak();
    }

    async updateRating(): Promise<void> {
        const username = this.api.getUsername();
        if (!username) {
            this.ratingItem.text = '$(account) CP Studio';
            this.ratingItem.show();
            return;
        }

        try {
            const users = await this.api.getUserInfo([username]);
            if (users && users.length > 0) {
                const user = users[0];
                const rating = user.rating || 0;
                const rank = user.rank || 'unrated';
                this.ratingItem.text = `$(star) ${username}: ${rating}`;
                this.ratingItem.tooltip = `${username} - ${rank} (${rating})\nClick to view profile`;
            } else {
                this.ratingItem.text = `$(account) ${username}`;
            }
        } catch {
            this.ratingItem.text = `$(account) ${username}`;
        }
        this.ratingItem.show();
    }

    updateStreak(): void {
        const streakData = this.context.globalState.get<{ count: number; lastDate: string }>('cfStudio.streak');
        if (streakData && streakData.count > 0) {
            this.streakItem.text = `$(flame) ${streakData.count}`;
            this.streakItem.tooltip = `${streakData.count}-day solving streak!`;
            this.streakItem.show();
        } else {
            this.streakItem.hide();
        }
    }

    private updateProblemContext(): void {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            this.problemItem.hide();
            this.runItem.hide();
            return;
        }

        const filePath = editor.document.uri.fsPath;
        const isContestFile = /\/(contests|leetcode|geeksforgeeks)\//.test(filePath) &&
            /\/(main\.cpp|main\.py|Main\.java)$/.test(filePath);

        if (isContestFile) {
            const parts = filePath.split(path.sep);
            const mainIdx = parts.findIndex(p => /^(main\.cpp|main\.py|Main\.java)$/.test(p));
            if (mainIdx >= 2) {
                const problemIndex = parts[mainIdx - 1];
                const contestId = parts[mainIdx - 2];
                // Determine platform
                const platformIdx = parts.findIndex(p => /^(contests|leetcode|geeksforgeeks)$/.test(p));
                const platform = platformIdx >= 0 ? parts[platformIdx] : 'contests';

                if (platform === 'contests') {
                    this.problemItem.text = `$(file-code) CF ${contestId}${problemIndex}`;
                } else if (platform === 'leetcode') {
                    this.problemItem.text = `$(file-code) LC: ${contestId}`;
                } else {
                    this.problemItem.text = `$(file-code) GFG: ${contestId}`;
                }
                this.problemItem.show();
                this.runItem.show();
            } else {
                this.problemItem.hide();
                this.runItem.hide();
            }
        } else {
            this.problemItem.hide();
            this.runItem.hide();
        }
    }

    dispose(): void {
        this.ratingItem.dispose();
        this.problemItem.dispose();
        this.runItem.dispose();
        this.streakItem.dispose();
    }
}
