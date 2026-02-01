import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/** Returns true if the string looks like a real file path we can read (not an output channel id, etc.). */
export function isValidFilePath(filePath: string | undefined): boolean {
    if (!filePath || typeof filePath !== 'string' || filePath.trim() === '') return false;
    if (filePath.includes('extension-output') || filePath.startsWith('vscode-webview://')) return false;
    if (!path.isAbsolute(filePath) && !filePath.includes(path.sep)) return false;
    try {
        return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
    } catch {
        return false;
    }
}

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

export interface ChatSession {
    id: string;
    messages: ChatMessage[];
    filePath?: string;
    contestId?: string;
    problemIndex?: string;
    createdAt: number;
    title?: string;
}

export class ChatManager {
    private static instance: ChatManager;
    private sessions: Map<string, ChatSession> = new Map();
    private globalSessionId = 'global';
    public context: vscode.ExtensionContext; // Public access for context

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.loadSessions();
    }

    public static getInstance(context?: vscode.ExtensionContext): ChatManager {
        if (!ChatManager.instance && context) {
            ChatManager.instance = new ChatManager(context);
        }
        return ChatManager.instance;
    }

    public getOrCreateSession(filePath?: string): ChatSession {
        const sessionId = filePath ? this.getSessionId(filePath) : this.globalSessionId;
        
        if (!this.sessions.has(sessionId)) {
            const session: ChatSession = {
                id: sessionId,
                messages: [],
                filePath: filePath,
                createdAt: Date.now(),
                title: filePath ? this.getSessionTitle(filePath) : 'Global Chat'
            };

            if (filePath) {
                const { contestId, problemIndex } = this.parseFilePath(filePath);
                session.contestId = contestId;
                session.problemIndex = problemIndex;
            }

            this.sessions.set(sessionId, session);
            this.saveSessions();
        }

        return this.sessions.get(sessionId)!;
    }

    public getSession(sessionId: string): ChatSession | undefined {
        return this.sessions.get(sessionId);
    }

    public getAllSessions(): ChatSession[] {
        return Array.from(this.sessions.values());
    }

    public addMessage(sessionId: string, role: 'user' | 'assistant', content: string): void {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.messages.push({
                role,
                content,
                timestamp: Date.now()
            });
            this.saveSessions();
        }
    }

    /** Clear all messages in a session (keeps the session). */
    public clearSessionMessages(sessionId: string): boolean {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.messages = [];
            this.saveSessions();
            return true;
        }
        return false;
    }

    public deleteSession(sessionId: string): boolean {
        if (sessionId === this.globalSessionId) {
            // Reset global session instead of deleting
            const session = this.sessions.get(sessionId);
            if (session) {
                session.messages = [];
                this.saveSessions();
                return true;
            }
            return false;
        }

        const deleted = this.sessions.delete(sessionId);
        if (deleted) {
            this.saveSessions();
        }
        return deleted;
    }

    public createNewSession(filePath?: string): ChatSession {
        const sessionId = filePath 
            ? `${this.getSessionId(filePath)}-${Date.now()}`
            : `global-${Date.now()}`;

        const session: ChatSession = {
            id: sessionId,
            messages: [],
            filePath: filePath,
            createdAt: Date.now(),
            title: filePath ? `${this.getSessionTitle(filePath)} (New)` : 'New Global Chat'
        };

        if (filePath) {
            const { contestId, problemIndex } = this.parseFilePath(filePath);
            session.contestId = contestId;
            session.problemIndex = problemIndex;
        }

        this.sessions.set(sessionId, session);
        this.saveSessions();
        return session;
    }

    private getSessionId(filePath: string): string {
        return `chat-${filePath.replace(/[^a-zA-Z0-9]/g, '-')}`;
    }

    private getSessionTitle(filePath: string): string {
        const { contestId, problemIndex } = this.parseFilePath(filePath);
        if (contestId && problemIndex) {
            return `Contest ${contestId} - Problem ${problemIndex}`;
        }
        return path.basename(filePath);
    }

    private parseFilePath(filePath: string): { contestId?: string; problemIndex?: string } {
        const contestsMatch = filePath.match(/contests[\/\\](\d+)[\/\\]([A-Z])/);
        if (contestsMatch) {
            return {
                contestId: contestsMatch[1],
                problemIndex: contestsMatch[2]
            };
        }
        return {};
    }

    private saveSessions(): void {
        const sessionsData = Array.from(this.sessions.entries()).map(([id, session]) => ({
            id: session.id,
            messages: session.messages,
            filePath: session.filePath,
            contestId: session.contestId,
            problemIndex: session.problemIndex,
            createdAt: session.createdAt,
            title: session.title
        }));

        this.context.workspaceState.update('cfStudio.chatSessions', sessionsData);
    }

    private loadSessions(): void {
        const sessionsData = this.context.workspaceState.get<Array<Partial<ChatSession>>>('cfStudio.chatSessions', []);
        
        sessionsData.forEach(data => {
            if (data.id) {
                const filePath = data.filePath && isValidFilePath(data.filePath) ? data.filePath : undefined;
                const session: ChatSession = {
                    id: data.id,
                    messages: (data.messages || []).map(msg => ({
                        role: msg.role || 'user',
                        content: msg.content || '',
                        timestamp: msg.timestamp || Date.now()
                    })),
                    filePath,
                    contestId: data.contestId,
                    problemIndex: data.problemIndex,
                    createdAt: data.createdAt || Date.now(),
                    title: data.title
                };
                this.sessions.set(session.id, session);
            }
        });
    }
}
