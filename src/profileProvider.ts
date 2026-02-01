import * as vscode from 'vscode';
import { CodeforcesAPI } from './codeforcesApi';

export class ProfileProvider implements vscode.TreeDataProvider<ProfileTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ProfileTreeItem | undefined | null | void> = new vscode.EventEmitter<ProfileTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ProfileTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
    
    private api: CodeforcesAPI;
    private userInfo: any = null;
    private isLoading = false;

    constructor() {
        this.api = new CodeforcesAPI();
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
        this.loadUserInfo();
    }

    getTreeItem(element: ProfileTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: ProfileTreeItem): Promise<ProfileTreeItem[]> {
        const username = this.api.getUsername();
        
        if (!username) {
            return [
                new ProfileTreeItem(
                    'Setup Required',
                    'Click to configure your Codeforces username',
                    vscode.TreeItemCollapsibleState.None,
                    '$(warning)',
                    'setup'
                )
            ];
        }

        if (!element) {
            // Root level - show user info
            if (!this.userInfo && !this.isLoading) {
                this.loadUserInfo();
            }

            if (this.isLoading) {
                return [
                    new ProfileTreeItem(
                        'Loading...',
                        '',
                        vscode.TreeItemCollapsibleState.None,
                        '$(sync~spin)',
                        'loading'
                    )
                ];
            }

            if (!this.userInfo) {
                return [
                    new ProfileTreeItem(
                        'Failed to load profile',
                        'Click to retry',
                        vscode.TreeItemCollapsibleState.None,
                        '$(error)',
                        'error'
                    )
                ];
            }

            const items: ProfileTreeItem[] = [];
            
            // User handle
            items.push(new ProfileTreeItem(
                `Handle: ${this.userInfo.handle || username}`,
                '',
                vscode.TreeItemCollapsibleState.None,
                '$(account)',
                'handle'
            ));

            // Rating
            const rating = this.userInfo.rating || 0;
            const rank = this.userInfo.rank || 'unrated';
            items.push(new ProfileTreeItem(
                `Rating: ${rating} (${rank})`,
                '',
                vscode.TreeItemCollapsibleState.None,
                '$(star-full)',
                'rating'
            ));

            // Max rating
            const maxRating = this.userInfo.maxRating || 0;
            const maxRank = this.userInfo.maxRank || 'unrated';
            items.push(new ProfileTreeItem(
                `Max Rating: ${maxRating} (${maxRank})`,
                '',
                vscode.TreeItemCollapsibleState.None,
                '$(star-full)',
                'maxRating'
            ));

            // View full profile
            items.push(new ProfileTreeItem(
                'View Full Profile',
                'Open profile webview',
                vscode.TreeItemCollapsibleState.None,
                '$(go-to-file)',
                'viewProfile'
            ));

            return items;
        }

        return [];
    }

    private async loadUserInfo(): Promise<void> {
        const username = this.api.getUsername();
        if (!username) {
            return;
        }

        this.isLoading = true;
        this._onDidChangeTreeData.fire();

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
            this._onDidChangeTreeData.fire();
        }
    }

    getUserInfo(): any {
        return this.userInfo;
    }
}

export class ProfileTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly tooltip: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly icon: string,
        public readonly id: string
    ) {
        super(label, collapsibleState);
        this.tooltip = tooltip;
        this.iconPath = new vscode.ThemeIcon(icon.replace('$(', '').replace(')', ''));
        this.contextValue = id;
    }
}
