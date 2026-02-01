import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface ProblemInfo {
    id: number;
    url: string;
    contestId: number;
    problemIndex: string;
}

export interface LadderData {
    [ladderName: string]: string[];
}

export class LadderLoader {
    private ladderData: LadderData | null = null;
    private jsonPath: string;

    constructor(context: vscode.ExtensionContext) {
        // Get the extension path and construct path to data file
        const extensionPath = context.extensionPath;
        this.jsonPath = path.join(extensionPath, 'data', 'A0jladder.json');
    }

    /**
     * Load ladder data from JSON file
     */
    private async loadLadderData(): Promise<LadderData> {
        if (this.ladderData) {
            return this.ladderData;
        }

        try {
            const fileContent = await fs.promises.readFile(this.jsonPath, 'utf-8');
            this.ladderData = JSON.parse(fileContent) as LadderData;
            return this.ladderData;
        } catch (error: any) {
            throw new Error(`Failed to load ladder data: ${error.message}`);
        }
    }

    /**
     * Parse Codeforces URL to extract contest ID and problem index
     * Format: http://codeforces.com/problemset/problem/{contestId}/{index}
     */
    private parseCodeforcesUrl(url: string): { contestId: number; problemIndex: string } | null {
        // Match both http and https, and handle problemset/problem format
        const match = url.match(/codeforces\.com\/problemset\/problem\/(\d+)\/([A-Z])/i);
        if (match) {
            return {
                contestId: parseInt(match[1], 10),
                problemIndex: match[2].toUpperCase()
            };
        }
        return null;
    }

    /**
     * Get list of available ladders/categories
     */
    async getAvailableLadders(): Promise<Array<{ name: string; codeforcesCount: number; totalCount: number }>> {
        const data = await this.loadLadderData();
        const ladders: Array<{ name: string; codeforcesCount: number; totalCount: number }> = [];

        for (const [ladderName, urls] of Object.entries(data)) {
            // Skip the Categories.html key which is just a list of category names
            if (ladderName === 'Categories.html') {
                continue;
            }

            const codeforcesUrls = urls.filter(url => 
                url.includes('codeforces.com/problemset/problem')
            );

            if (codeforcesUrls.length > 0) {
                ladders.push({
                    name: ladderName,
                    codeforcesCount: codeforcesUrls.length,
                    totalCount: urls.length
                });
            }
        }

        // Sort by name for easier selection
        ladders.sort((a, b) => a.name.localeCompare(b.name));

        return ladders;
    }

    /**
     * Get problems from a specific ladder
     */
    async getLadderProblems(ladderName: string): Promise<ProblemInfo[]> {
        const data = await this.loadLadderData();
        const urls = data[ladderName];

        if (!urls || !Array.isArray(urls)) {
            throw new Error(`Ladder "${ladderName}" not found`);
        }

        const problems: ProblemInfo[] = [];
        let id = 1;

        for (const url of urls) {
            // Only process Codeforces problems
            if (!url.includes('codeforces.com/problemset/problem')) {
                continue;
            }

            const parsed = this.parseCodeforcesUrl(url);
            if (parsed) {
                problems.push({
                    id: id++,
                    url: url,
                    contestId: parsed.contestId,
                    problemIndex: parsed.problemIndex
                });
            }
        }

        return problems;
    }

    /**
     * Check if a ladder exists and has Codeforces problems
     */
    async hasCodeforcesProblems(ladderName: string): Promise<boolean> {
        try {
            const problems = await this.getLadderProblems(ladderName);
            return problems.length > 0;
        } catch {
            return false;
        }
    }
}
