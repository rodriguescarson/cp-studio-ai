import * as vscode from 'vscode';
import { CodeforcesAPI } from './codeforcesApi';

interface SolvedProblemsData {
    problems: string[]; // Array of problem identifiers like "69A", "263A"
    lastRefresh: number; // Timestamp
    submissionsCount: number;
}

export class SolvedProblemsTracker {
    private context: vscode.ExtensionContext;
    private api: CodeforcesAPI;
    private cacheKey = 'solvedProblems';

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.api = new CodeforcesAPI();
    }

    /**
     * Get cached solved problems
     */
    private getCachedData(): SolvedProblemsData | null {
        const cached = this.context.globalState.get<SolvedProblemsData>(this.cacheKey);
        return cached || null;
    }

    /**
     * Save solved problems to cache
     */
    private async saveCachedData(data: SolvedProblemsData): Promise<void> {
        await this.context.globalState.update(this.cacheKey, data);
    }

    /**
     * Extract problem identifier from submission
     * Format: {contestId}{index} (e.g., "69A", "263A")
     */
    private getProblemIdentifier(submission: any): string | null {
        const problem = submission.problem;
        if (!problem) {
            return null;
        }

        const contestId = problem.contestId;
        const index = problem.index;

        if (contestId === undefined || !index) {
            return null;
        }

        return `${contestId}${index}`;
    }

    /**
     * Fetch solved problems from Codeforces API
     */
    async refreshSolvedProblems(): Promise<Set<string>> {
        const username = this.api.getUsername();
        if (!username) {
            throw new Error('Codeforces username not configured. Please set it using "cfx: Setup Profile"');
        }

        const solvedProblems = new Set<string>();
        let fromIndex = 1;
        const batchSize = 1000; // Codeforces API allows up to 1000 per request
        let totalFetched = 0;

        try {
            // Fetch submissions in batches
            while (true) {
                const submissions = await this.api.getUserStatus(username, fromIndex, batchSize);
                
                if (!submissions || submissions.length === 0) {
                    break;
                }

                // Filter for accepted solutions
                for (const submission of submissions) {
                    if (submission.verdict === 'OK') {
                        const problemId = this.getProblemIdentifier(submission);
                        if (problemId) {
                            solvedProblems.add(problemId);
                        }
                    }
                }

                totalFetched += submissions.length;
                
                // If we got fewer than batchSize, we've reached the end
                if (submissions.length < batchSize) {
                    break;
                }

                fromIndex += batchSize;

                // Rate limiting: small delay between batches
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Save to cache
            await this.saveCachedData({
                problems: Array.from(solvedProblems),
                lastRefresh: Date.now(),
                submissionsCount: totalFetched
            });

            return solvedProblems;
        } catch (error: any) {
            throw new Error(`Failed to fetch solved problems: ${error.message}`);
        }
    }

    /**
     * Get solved problems (from cache or refresh)
     */
    async getSolvedProblems(forceRefresh: boolean = false): Promise<Set<string>> {
        const cached = this.getCachedData();
        const config = vscode.workspace.getConfiguration('codeforces');
        const refreshInterval = config.get<number>('solvedProblemsRefreshInterval', 3600000); // 1 hour default

        // Check if cache is valid
        if (!forceRefresh && cached) {
            const age = Date.now() - cached.lastRefresh;
            if (age < refreshInterval) {
                return new Set(cached.problems);
            }
        }

        // Refresh if needed
        return await this.refreshSolvedProblems();
    }

    /**
     * Check if a specific problem is solved
     */
    async isProblemSolved(contestId: number, problemIndex: string): Promise<boolean> {
        const solved = await this.getSolvedProblems();
        const problemId = `${contestId}${problemIndex}`;
        return solved.has(problemId);
    }

    /**
     * Get solved problems count
     */
    async getSolvedCount(): Promise<number> {
        const solved = await this.getSolvedProblems();
        return solved.size;
    }

    /**
     * Clear cached solved problems
     */
    async clearCache(): Promise<void> {
        await this.context.globalState.update(this.cacheKey, undefined);
    }

    /**
     * Get cache info (last refresh time, count)
     */
    getCacheInfo(): { lastRefresh: number | null; count: number } | null {
        const cached = this.getCachedData();
        if (!cached) {
            return null;
        }

        return {
            lastRefresh: cached.lastRefresh,
            count: cached.problems.length
        };
    }
}
