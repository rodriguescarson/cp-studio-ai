import * as vscode from 'vscode';
import { ChatManager, ChatSession } from './chatManager';
import { ChatPanel } from './chatPanel';

export class ChatSidebarProvider implements vscode.TreeDataProvider<ChatTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ChatTreeItem | undefined | null | void> = new vscode.EventEmitter<ChatTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ChatTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
    
    private chatManager: ChatManager;
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.chatManager = ChatManager.getInstance(context);
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ChatTreeItem): vscode.TreeItem {
        const treeItem = element;
        if (!element.isContestGroup && element.session) {
            treeItem.command = {
                command: 'codeforces.openChatFromSidebar',
                title: 'Open Chat',
                arguments: [element]
            };
        }
        return treeItem;
    }

    getChildren(element?: ChatTreeItem): Thenable<ChatTreeItem[]> {
        if (!element) {
            // Root level - show all chats
            const sessions = this.chatManager.getAllSessions();
            const items: ChatTreeItem[] = [];

            // Group by contest
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

            // Add global chats
            if (globalChats.length > 0) {
                globalChats.forEach(session => {
                    items.push(new ChatTreeItem(
                        session.title || 'Global Chat',
                        session.id,
                        vscode.TreeItemCollapsibleState.None,
                        '$(comment-discussion)',
                        session
                    ));
                });
            }

            // Add contest groups
            Array.from(contestGroups.entries()).sort((a, b) => parseInt(b[0]) - parseInt(a[0])).forEach(([contestId, sessions]) => {
                const contestItem = new ChatTreeItem(
                    `Contest ${contestId}`,
                    `contest-${contestId}`,
                    vscode.TreeItemCollapsibleState.Expanded,
                    '$(folder)',
                    undefined,
                    true
                );
                items.push(contestItem);
            });

            return Promise.resolve(items);
        } else if (element.isContestGroup) {
            // Show problem chats for this contest
            const contestId = element.id.replace('contest-', '');
            const sessions = this.chatManager.getAllSessions().filter(
                s => s.contestId === contestId
            );

            return Promise.resolve(
                sessions
                    .sort((a, b) => (a.problemIndex || '').localeCompare(b.problemIndex || ''))
                    .map(session => new ChatTreeItem(
                        session.title || `Problem ${session.problemIndex}`,
                        session.id,
                        vscode.TreeItemCollapsibleState.None,
                        '$(file-code)',
                        session
                    ))
            );
        }

        return Promise.resolve([]);
    }

    async openChat(sessionId: string): Promise<void> {
        const session = this.chatManager.getSession(sessionId);
        if (session) {
            // Use the command to open chat, which will handle the view provider
            await vscode.commands.executeCommand('codeforces.openChatFromSidebar', 
                new ChatTreeItem(
                    session.title || 'Chat',
                    session.id,
                    vscode.TreeItemCollapsibleState.None,
                    '$(comment-discussion)',
                    session
                )
            );
        } else {
            vscode.window.showErrorMessage('Chat session not found');
        }
    }

    async createNewChat(filePath?: string): Promise<void> {
        const session = this.chatManager.createNewSession(filePath);
        ChatPanel.createOrShow(this.context, session.filePath);
        this.refresh();
    }

    async deleteChat(sessionId: string): Promise<void> {
        const deleted = this.chatManager.deleteSession(sessionId);
        if (deleted) {
            this.refresh();
            vscode.window.showInformationMessage('Chat deleted');
        }
    }
}

export class ChatTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly id: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly icon: string,
        public readonly session?: ChatSession,
        public readonly isContestGroup: boolean = false
    ) {
        super(label, collapsibleState);

        this.tooltip = session?.filePath || label;
        this.description = session?.filePath 
            ? (session.contestId && session.problemIndex 
                ? `Problem ${session.problemIndex}` 
                : '')
            : '';

        if (icon) {
            this.iconPath = new vscode.ThemeIcon(icon.replace('$(', '').replace(')', ''));
        }

        this.contextValue = isContestGroup 
            ? 'contestGroup' 
            : session?.id === 'global' 
                ? 'globalChat' 
                : 'chatSession';
    }
}
