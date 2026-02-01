import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import axios from 'axios';

interface EnvConfig {
    key?: string;
    secret?: string;
    username?: string;
    contestFilter?: string[];
    reminderTimes?: number[];
    includeGym?: boolean;
}

export class CodeforcesAPI {
    private apiKey?: string;
    private apiSecret?: string;
    private username?: string;
    private baseUrl = 'https://codeforces.com/api';
    private envConfig: EnvConfig = {};

    constructor() {
        this.loadEnvConfig();
    }

    private loadEnvConfig(): void {
        try {
            // Try to find .env file in workspace root
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                return;
            }

            const envPath = path.join(workspaceFolder.uri.fsPath, '.env');
            if (!fs.existsSync(envPath)) {
                return;
            }

            const envContent = fs.readFileSync(envPath, 'utf-8');
            const lines = envContent.split('\n');

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) {
                    continue;
                }

                const [key, ...valueParts] = trimmed.split('=');
                if (!key || valueParts.length === 0) {
                    continue;
                }

                const value = valueParts.join('=').trim();

                switch (key.trim()) {
                    case 'KEY':
                        this.envConfig.key = value;
                        this.apiKey = value;
                        break;
                    case 'SECRET':
                        this.envConfig.secret = value;
                        this.apiSecret = value;
                        break;
                    case 'CF_USERNAME':
                        this.envConfig.username = value;
                        this.username = value;
                        break;
                    case 'CONTEST_FILTER':
                        this.envConfig.contestFilter = value.split(',').map(f => f.trim().toLowerCase());
                        break;
                    case 'REMINDER_TIMES':
                        this.envConfig.reminderTimes = value.split(',').map(t => parseInt(t.trim(), 10)).filter(t => !isNaN(t));
                        break;
                    case 'INCLUDE_GYM':
                        this.envConfig.includeGym = value.toLowerCase() === 'true';
                        break;
                }
            }
        } catch (error) {
            console.error('Error loading .env config:', error);
        }
    }

    private generateApiSig(methodName: string, params: Record<string, string>): { rand: string; sig: string } | null {
        if (!this.apiKey || !this.apiSecret) {
            return null;
        }

        // Generate random 6-character string
        const rand = Math.random().toString(36).substring(2, 8);

        // Sort parameters by key
        const sortedParams = Object.keys(params).sort();
        const paramStr = sortedParams.map(k => `${k}=${params[k]}`).join('&');

        // Create signature string: rand + /api/methodName + ?params + #secret
        const sigString = `${rand}/api/${methodName}?${paramStr}#${this.apiSecret}`;

        // Hash with SHA512
        const sig = crypto.createHash('sha512').update(sigString).digest('hex');

        return { rand, sig };
    }

    private async makeRequest(methodName: string, params: Record<string, any> = {}, authenticated: boolean = false): Promise<any> {
        const url = `${this.baseUrl}/${methodName}`;
        const requestParams: Record<string, string> = {};

        // Convert params to strings
        Object.keys(params).forEach(key => {
            requestParams[key] = String(params[key]);
        });

        // Add authentication if needed
        if (authenticated && this.apiKey && this.apiSecret) {
            requestParams['apiKey'] = this.apiKey;
            requestParams['time'] = String(Math.floor(Date.now() / 1000));
            const sig = this.generateApiSig(methodName, requestParams);
            if (sig) {
                requestParams['apiSig'] = sig.rand + sig.sig;
            }
        }

        try {
            const response = await axios.get(url, { params: requestParams, timeout: 10000 });
            const data = response.data;

            if (data.status === 'FAILED') {
                throw new Error(`API Error: ${data.comment || 'Unknown error'}`);
            }

            return data.result;
        } catch (error: any) {
            if (error.response) {
                throw new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
            }
            throw new Error(`Network error: ${error.message}`);
        }
    }

    // User methods
    async getUserInfo(handles: string[]): Promise<any[]> {
        return this.makeRequest('user.info', { handles: handles.join(';') });
    }

    async getUserStatus(handle: string, fromIndex: number = 1, count: number = 10): Promise<any[]> {
        return this.makeRequest('user.status', {
            handle: handle,
            from: fromIndex,
            count: count
        });
    }

    async getUserRating(handle: string): Promise<any[]> {
        return this.makeRequest('user.rating', { handle: handle });
    }

    // Contest methods
    async getContestList(gym: boolean = false): Promise<any[]> {
        return this.makeRequest('contest.list', { gym: String(gym).toLowerCase() });
    }

    async getContestStandings(contestId: number, handle?: string, fromIndex: number = 1, count: number = 100): Promise<any> {
        const params: Record<string, any> = {
            contestId: contestId,
            from: fromIndex,
            count: count
        };
        if (handle) {
            params.handles = handle;
        }
        return this.makeRequest('contest.standings', params);
    }

    async getUpcomingContests(): Promise<any[]> {
        const contests = await this.getContestList(this.envConfig.includeGym || false);
        const currentTime = Math.floor(Date.now() / 1000);
        const filters = this.envConfig.contestFilter || ['div2', 'div3'];

        return contests
            .filter((contest: any) => {
                const startTime = contest.startTimeSeconds || 0;
                if (startTime <= currentTime) {
                    return false;
                }

                const phase = (contest.phase || '').toUpperCase();
                if (phase !== 'BEFORE' && phase !== 'CODING') {
                    return false;
                }

                // Filter by division
                if (filters.length > 0 && filters[0] !== 'all') {
                    const contestName = (contest.name || '').toLowerCase();
                    const matches = filters.some(filter => {
                        if (filter === 'div1' && (contestName.includes('div. 1') || contestName.includes('div1'))) {
                            return true;
                        }
                        if (filter === 'div2' && (contestName.includes('div. 2') || contestName.includes('div2'))) {
                            return true;
                        }
                        if (filter === 'div3' && (contestName.includes('div. 3') || contestName.includes('div3'))) {
                            return true;
                        }
                        if (filter === 'div4' && (contestName.includes('div. 4') || contestName.includes('div4'))) {
                            return true;
                        }
                        return false;
                    });
                    if (!matches) {
                        return false;
                    }
                }

                // Exclude gym unless specified
                if (contest.type === 'GYM' && !this.envConfig.includeGym) {
                    return false;
                }

                return true;
            })
            .sort((a: any, b: any) => (a.startTimeSeconds || 0) - (b.startTimeSeconds || 0));
    }

    getUsername(): string | undefined {
        // First check VS Code settings (allows dynamic changes)
        const config = vscode.workspace.getConfiguration('codeforces');
        const settingsUsername = config.get<string>('username', '');
        if (settingsUsername && settingsUsername.trim() !== '') {
            return settingsUsername.trim();
        }
        
        // Fall back to .env file
        return this.username;
    }
    
    setUsername(username: string): void {
        // Update VS Code settings
        const config = vscode.workspace.getConfiguration('codeforces');
        config.update('username', username.trim(), vscode.ConfigurationTarget.Global);
        
        // Also update internal state
        this.username = username.trim();
        this.envConfig.username = username.trim();
    }

    getEnvConfig(): EnvConfig {
        return { ...this.envConfig };
    }
}
