import * as vscode from 'vscode';
import * as path from 'path';
import { SolvedProblemsTracker } from './solvedTracker';

export class ProblemFileDecorationProvider implements vscode.FileDecorationProvider {
    private solvedTracker: SolvedProblemsTracker;
    private solvedProblems: Set<string> = new Set();
    private _onDidChangeFileDecorations: vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined> = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();
    readonly onDidChangeFileDecorations: vscode.Event<vscode.Uri | vscode.Uri[] | undefined> = this._onDidChangeFileDecorations.event;

    constructor(solvedTracker: SolvedProblemsTracker) {
        this.solvedTracker = solvedTracker;
        this.refreshSolvedProblems();
    }

    async refreshSolvedProblems(): Promise<void> {
        try {
            this.solvedProblems = await this.solvedTracker.getSolvedProblems();
            // Notify VS Code that decorations need to be updated
            this._onDidChangeFileDecorations.fire(undefined);
        } catch (error) {
            console.log('Could not refresh solved problems for decorations:', error);
        }
    }

    provideFileDecoration(uri: vscode.Uri, token: vscode.CancellationToken): vscode.ProviderResult<vscode.FileDecoration> {
        // Only decorate directories in the contests folder
        const uriPath = uri.fsPath;
        if (!uriPath.includes('contests')) {
            return undefined;
        }

        // Extract contest ID and problem index from path
        // Path format: .../contests/{contestId}/{problemIndex}/
        const contestsMatch = uriPath.match(/contests[\/\\](\d+)[\/\\]([A-Z]+)[\/\\]?$/);
        if (!contestsMatch) {
            return undefined;
        }

        const contestId = parseInt(contestsMatch[1], 10);
        const problemIndex = contestsMatch[2];
        const problemId = `${contestId}${problemIndex}`;

        if (this.solvedProblems.has(problemId)) {
            return {
                badge: '✓',
                tooltip: 'Solved',
                color: new vscode.ThemeColor('testing.iconPassed')
            };
        }

        return undefined;
    }
}
