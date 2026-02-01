import * as vscode from 'vscode';
import { CodeforcesAPI } from './codeforcesApi';
import { SolvedProblemsTracker } from './solvedTracker';

export class ContestsProvider implements vscode.TreeDataProvider<ContestTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ContestTreeItem | undefined | null | void> = new vscode.EventEmitter<ContestTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ContestTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
    
    private api: CodeforcesAPI;
    private solvedTracker: SolvedProblemsTracker | null = null;
    private contests: any[] = [];
    private isLoading = false;

    constructor(context?: vscode.ExtensionContext) {
        this.api = new CodeforcesAPI();
        if (context) {
            this.solvedTracker = new SolvedProblemsTracker(context);
        }
        this.refresh();
    }

    setSolvedTracker(tracker: SolvedProblemsTracker): void {
        this.solvedTracker = tracker;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
        this.loadContests();
    }

    getTreeItem(element: ContestTreeItem): vscode.TreeItem {
        const treeItem = element;
        if (element.contestId) {
            treeItem.command = {
                command: 'codeforces.setupFromContest',
                title: 'Setup Contest',
                arguments: [element.contestId]
            };
        }
        return treeItem;
    }

    async getChildren(element?: ContestTreeItem): Promise<ContestTreeItem[]> {
        if (!element) {
            // Root level - show contests
            if (this.isLoading) {
                return [
                    new ContestTreeItem(
                        'Loading contests...',
                        '',
                        vscode.TreeItemCollapsibleState.None,
                        '$(sync~spin)',
                        undefined
                    )
                ];
            }

            if (this.contests.length === 0) {
                return [
                    new ContestTreeItem(
                        'No upcoming contests',
                        'Click refresh to reload',
                        vscode.TreeItemCollapsibleState.None,
                        '$(info)',
                        undefined
                    )
                ];
            }

            return this.contests.map(contest => {
                const startTime = new Date((contest.startTimeSeconds || 0) * 1000);
                const duration = contest.durationSeconds || 0;
                const hours = Math.floor(duration / 3600);
                const minutes = Math.floor((duration % 3600) / 60);
                const durationStr = `${hours}h ${minutes}m`;

                const timeUntil = this.getTimeUntil(startTime);
                const description = `${timeUntil} • ${durationStr}`;

                return new ContestTreeItem(
                    contest.name || `Contest ${contest.id}`,
                    description,
                    vscode.TreeItemCollapsibleState.None,
                    '$(calendar)',
                    contest.id
                );
            });
        }

        return [];
    }

    private async loadContests(): Promise<void> {
        this.isLoading = true;
        this._onDidChangeTreeData.fire();

        try {
            this.contests = await this.api.getUpcomingContests();
        } catch (error) {
            console.error('Error loading contests:', error);
            this.contests = [];
        } finally {
            this.isLoading = false;
            this._onDidChangeTreeData.fire();
        }
    }

    private getTimeUntil(date: Date): string {
        const now = new Date();
        const diff = date.getTime() - now.getTime();
        
        if (diff < 0) {
            return 'Started';
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) {
            return `in ${days}d ${hours}h`;
        } else if (hours > 0) {
            return `in ${hours}h ${minutes}m`;
        } else {
            return `in ${minutes}m`;
        }
    }
}

export class ContestTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly description: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly icon: string,
        public readonly contestId?: number,
        public readonly isSolved?: boolean
    ) {
        super(label, collapsibleState);
        this.tooltip = `${label}\n${description}${isSolved ? '\n✓ Solved' : ''}`;
        this.description = description;
        
        // Use checkmark icon if solved, otherwise use the provided icon
        const iconName = isSolved ? 'check' : icon.replace('$(', '').replace(')', '');
        this.iconPath = new vscode.ThemeIcon(iconName);
        this.contextValue = contestId ? 'contest' : 'info';
    }
}
