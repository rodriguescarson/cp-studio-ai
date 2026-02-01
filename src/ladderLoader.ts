import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface ProblemInfo {
    id: number;
    url: string;
    contestId?: number;
    problemIndex?: string;
    name?: string;
    difficulty?: string;
    pattern?: string;
    source: 'codeforces' | 'leetcode' | 'geeksforgeeks';
}

export interface LadderData {
    [ladderName: string]: string[];
}

export interface NeetCodeProblem {
    problem: string;
    pattern: string;
    link: string;
    code: string;
    difficulty: string;
    video?: string;
    neetcode150?: boolean;
    blind75?: boolean;
}

export interface LoveBabbarQuestion {
    Topic: string;
    Problem: string;
    Done: boolean;
    URL: string;
}

export interface LoveBabbarTopic {
    topicName: string;
    position: number;
    started: boolean;
    doneQuestions: number;
    questions: LoveBabbarQuestion[];
}

// Striver's sheet uses the same structure as Love Babbar
export interface StriversTopic {
    topicName: string;
    position: number;
    started: boolean;
    doneQuestions: number;
    questions: Array<{
        Topic: string;
        Problem: string;
        Done: boolean;
        URL: string;
    }>;
}

export class LadderLoader {
    private ladderData: LadderData | null = null;
    private neetcodeData: NeetCodeProblem[] | null = null;
    private loveBabbarData: LoveBabbarTopic[] | null = null;
    private striversData: StriversTopic[] | null = null;
    private ladderJsonPath: string;
    private neetcodeJsonPath: string;
    private loveBabbarTsPath: string;
    private striversJsonPath: string;

    constructor(context: vscode.ExtensionContext) {
        // Get the extension path and construct paths to data files
        const extensionPath = context.extensionPath;
        this.ladderJsonPath = path.join(extensionPath, 'data', 'A0jladder.json');
        this.neetcodeJsonPath = path.join(extensionPath, 'data', 'neetcode150.json');
        this.loveBabbarTsPath = path.join(extensionPath, 'data', '450LoveBabbar.ts');
        this.striversJsonPath = path.join(extensionPath, 'data', 'striverssheet.json');
    }

    /**
     * Load ladder data from JSON file
     */
    private async loadLadderData(): Promise<LadderData> {
        if (this.ladderData) {
            return this.ladderData;
        }

        try {
            const fileContent = await fs.promises.readFile(this.ladderJsonPath, 'utf-8');
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
     * Load NeetCode data from JSON file
     */
    private async loadNeetCodeData(): Promise<NeetCodeProblem[]> {
        if (this.neetcodeData) {
            return this.neetcodeData;
        }

        try {
            const fileContent = await fs.promises.readFile(this.neetcodeJsonPath, 'utf-8');
            this.neetcodeData = JSON.parse(fileContent) as NeetCodeProblem[];
            return this.neetcodeData;
        } catch (error: any) {
            // NeetCode file is optional, return empty array if not found
            console.log(`NeetCode data not available: ${error.message}`);
            return [];
        }
    }

    /**
     * Load Love Babbar 450 DSA sheet from TypeScript file
     */
    private async loadLoveBabbarData(): Promise<LoveBabbarTopic[]> {
        if (this.loveBabbarData) {
            return this.loveBabbarData;
        }

        try {
            const fileContent = await fs.promises.readFile(this.loveBabbarTsPath, 'utf-8');
            
            // Extract the QuestionData array from the TypeScript file
            // The file exports: export const QuestionData: Array<QuestionMigrationDataInterface> = [...]
            const arrayStart = fileContent.indexOf('export const QuestionData');
            if (arrayStart === -1) {
                throw new Error('Could not find QuestionData export');
            }

            // Find the opening bracket of the array
            let bracketCount = 0;
            let arrayContentStart = -1;
            for (let i = arrayStart; i < fileContent.length; i++) {
                if (fileContent[i] === '[') {
                    arrayContentStart = i;
                    bracketCount = 1;
                    break;
                }
            }

            if (arrayContentStart === -1) {
                throw new Error('Could not find array start');
            }

            // Find the matching closing bracket
            let arrayContentEnd = -1;
            for (let i = arrayContentStart + 1; i < fileContent.length; i++) {
                if (fileContent[i] === '[') bracketCount++;
                if (fileContent[i] === ']') bracketCount--;
                if (bracketCount === 0) {
                    arrayContentEnd = i + 1;
                    break;
                }
            }

            if (arrayContentEnd === -1) {
                throw new Error('Could not find array end');
            }

            let jsonContent = fileContent.substring(arrayContentStart, arrayContentEnd);
            
            // Convert TypeScript object syntax to JSON
            // Replace single quotes with double quotes (but be careful with strings)
            jsonContent = jsonContent
                .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')  // Quote property names
                .replace(/'/g, '"')  // Replace single quotes with double quotes
                .replace(/:\s*true/g, ': true')  // Keep boolean true
                .replace(/:\s*false/g, ': false')  // Keep boolean false
                .replace(/,\s*}/g, '}')  // Remove trailing commas
                .replace(/,\s*]/g, ']');  // Remove trailing commas in arrays

            this.loveBabbarData = JSON.parse(jsonContent) as LoveBabbarTopic[];
            return this.loveBabbarData;
        } catch (error: any) {
            // Love Babbar file is optional, return empty array if not found
            console.log(`Love Babbar data not available: ${error.message}`);
            return [];
        }
    }

    /**
     * Load Striver's sheet from JSON file
     */
    private async loadStriversData(): Promise<StriversTopic[]> {
        if (this.striversData) {
            return this.striversData;
        }

        try {
            const fileContent = await fs.promises.readFile(this.striversJsonPath, 'utf-8');
            this.striversData = JSON.parse(fileContent) as StriversTopic[];
            return this.striversData;
        } catch (error: any) {
            // Striver's file is optional, return empty array if not found
            console.log(`Striver's sheet data not available: ${error.message}`);
            return [];
        }
    }

    /**
     * Get list of available ladders/categories (A2OJ, NeetCode, Love Babbar, and Striver's)
     */
    async getAvailableLadders(): Promise<Array<{ name: string; codeforcesCount: number; totalCount: number; source: 'a2oj' | 'neetcode' | 'lovebabbar' | 'strivers' }>> {
        const ladders: Array<{ name: string; codeforcesCount: number; totalCount: number; source: 'a2oj' | 'neetcode' | 'lovebabbar' | 'strivers' }> = [];

        // Load A2OJ ladders
        try {
            const data = await this.loadLadderData();
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
                        totalCount: urls.length,
                        source: 'a2oj'
                    });
                }
            }
        } catch (error) {
            console.log('A2OJ ladders not available:', error);
        }

        // Load NeetCode categories/patterns
        try {
            const neetcodeProblems = await this.loadNeetCodeData();
            const patterns = new Map<string, NeetCodeProblem[]>();
            
            for (const problem of neetcodeProblems) {
                const pattern = problem.pattern || 'Uncategorized';
                if (!patterns.has(pattern)) {
                    patterns.set(pattern, []);
                }
                patterns.get(pattern)!.push(problem);
            }

            for (const [pattern, problems] of patterns.entries()) {
                ladders.push({
                    name: `NeetCode: ${pattern}`,
                    codeforcesCount: 0, // LeetCode problems, not Codeforces
                    totalCount: problems.length,
                    source: 'neetcode'
                });
            }

            // Add special NeetCode collections
            const neetcode150 = neetcodeProblems.filter(p => p.neetcode150);
            const blind75 = neetcodeProblems.filter(p => p.blind75);
            
            if (neetcode150.length > 0) {
                ladders.push({
                    name: 'NeetCode: NeetCode 150',
                    codeforcesCount: 0,
                    totalCount: neetcode150.length,
                    source: 'neetcode'
                });
            }
            
            if (blind75.length > 0) {
                ladders.push({
                    name: 'NeetCode: Blind 75',
                    codeforcesCount: 0,
                    totalCount: blind75.length,
                    source: 'neetcode'
                });
            }
        } catch (error) {
            console.log('NeetCode data not available:', error);
        }

        // Load Love Babbar 450 DSA sheet
        try {
            const loveBabbarTopics = await this.loadLoveBabbarData();
            
            for (const topic of loveBabbarTopics) {
                ladders.push({
                    name: `Love Babbar 450: ${topic.topicName}`,
                    codeforcesCount: 0, // Mix of GeeksforGeeks and LeetCode
                    totalCount: topic.questions.length,
                    source: 'lovebabbar'
                });
            }

            // Add overall collection
            const totalProblems = loveBabbarTopics.reduce((sum, topic) => sum + topic.questions.length, 0);
            if (totalProblems > 0) {
                ladders.push({
                    name: 'Love Babbar 450: All Problems',
                    codeforcesCount: 0,
                    totalCount: totalProblems,
                    source: 'lovebabbar'
                });
            }
        } catch (error) {
            console.log('Love Babbar data not available:', error);
        }

        // Load Striver's sheet
        try {
            const striversTopics = await this.loadStriversData();
            
            for (const topic of striversTopics) {
                ladders.push({
                    name: `Striver's Sheet: ${topic.topicName}`,
                    codeforcesCount: 0, // Mostly LeetCode problems
                    totalCount: topic.questions.length,
                    source: 'strivers'
                });
            }

            // Add overall collection
            const totalProblems = striversTopics.reduce((sum, topic) => sum + topic.questions.length, 0);
            if (totalProblems > 0) {
                ladders.push({
                    name: "Striver's Sheet: All Problems",
                    codeforcesCount: 0,
                    totalCount: totalProblems,
                    source: 'strivers'
                });
            }
        } catch (error) {
            console.log("Striver's sheet data not available:", error);
        }

        // Sort by name for easier selection
        ladders.sort((a, b) => a.name.localeCompare(b.name));

        return ladders;
    }

    /**
     * Get problems from a specific ladder (A2OJ, NeetCode, Love Babbar, or Striver's)
     */
    async getLadderProblems(ladderName: string): Promise<ProblemInfo[]> {
        // Check if it's a NeetCode ladder
        if (ladderName.startsWith('NeetCode:')) {
            return await this.getNeetCodeProblems(ladderName);
        }

        // Check if it's a Love Babbar ladder
        if (ladderName.startsWith('Love Babbar 450:')) {
            return await this.getLoveBabbarProblems(ladderName);
        }

        // Check if it's Striver's sheet
        if (ladderName.startsWith("Striver's Sheet:")) {
            return await this.getStriversProblems(ladderName);
        }

        // Otherwise, it's an A2OJ ladder
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
                    problemIndex: parsed.problemIndex,
                    source: 'codeforces'
                });
            }
        }

        return problems;
    }

    /**
     * Get NeetCode problems by category/pattern or collection
     */
    private async getNeetCodeProblems(ladderName: string): Promise<ProblemInfo[]> {
        const neetcodeProblems = await this.loadNeetCodeData();
        let filteredProblems: NeetCodeProblem[] = [];

        if (ladderName === 'NeetCode: NeetCode 150') {
            filteredProblems = neetcodeProblems.filter(p => p.neetcode150);
        } else if (ladderName === 'NeetCode: Blind 75') {
            filteredProblems = neetcodeProblems.filter(p => p.blind75);
        } else if (ladderName.startsWith('NeetCode: ')) {
            const pattern = ladderName.replace('NeetCode: ', '');
            filteredProblems = neetcodeProblems.filter(p => p.pattern === pattern);
        } else {
            filteredProblems = neetcodeProblems;
        }

        const problems: ProblemInfo[] = [];
        let id = 1;

        for (const problem of filteredProblems) {
            const leetcodeUrl = `https://leetcode.com/problems/${problem.link}`;
            problems.push({
                id: id++,
                url: leetcodeUrl,
                name: problem.problem,
                difficulty: problem.difficulty,
                pattern: problem.pattern,
                source: 'leetcode'
            });
        }

        return problems;
    }

    /**
     * Get Love Babbar problems by topic or all problems
     */
    private async getLoveBabbarProblems(ladderName: string): Promise<ProblemInfo[]> {
        const loveBabbarTopics = await this.loadLoveBabbarData();
        let filteredQuestions: LoveBabbarQuestion[] = [];

        if (ladderName === 'Love Babbar 450: All Problems') {
            // Get all problems from all topics
            for (const topic of loveBabbarTopics) {
                filteredQuestions.push(...topic.questions);
            }
        } else if (ladderName.startsWith('Love Babbar 450: ')) {
            const topicName = ladderName.replace('Love Babbar 450: ', '');
            const topic = loveBabbarTopics.find(t => t.topicName === topicName);
            if (topic) {
                filteredQuestions = topic.questions;
            }
        } else {
            filteredQuestions = [];
        }

        const problems: ProblemInfo[] = [];
        let id = 1;

        for (const question of filteredQuestions) {
            // Determine source based on URL
            let source: 'codeforces' | 'leetcode' = 'leetcode';
            if (question.URL.includes('geeksforgeeks')) {
                source = 'leetcode'; // Treat GeeksforGeeks as LeetCode-like (view only)
            } else if (question.URL.includes('leetcode')) {
                source = 'leetcode';
            } else if (question.URL.includes('codeforces')) {
                source = 'codeforces';
            }

            problems.push({
                id: id++,
                url: question.URL,
                name: question.Problem,
                source: source
            });
        }

        return problems;
    }

    /**
     * Get Striver's sheet problems by topic or all problems
     */
    private async getStriversProblems(ladderName: string): Promise<ProblemInfo[]> {
        const striversTopics = await this.loadStriversData();
        let filteredQuestions: Array<{ Topic: string; Problem: string; Done: boolean; URL: string }> = [];

        if (ladderName === "Striver's Sheet: All Problems") {
            // Get all problems from all topics
            for (const topic of striversTopics) {
                filteredQuestions.push(...topic.questions);
            }
        } else if (ladderName.startsWith("Striver's Sheet: ")) {
            const topicName = ladderName.replace("Striver's Sheet: ", '');
            const topic = striversTopics.find(t => t.topicName === topicName);
            if (topic) {
                filteredQuestions = topic.questions;
            }
        } else {
            filteredQuestions = [];
        }

        const problems: ProblemInfo[] = [];
        let id = 1;

        for (const question of filteredQuestions) {
            // Skip problems without URLs
            if (!question.URL || question.URL.trim() === '') {
                continue;
            }

            // Determine source based on URL
            let source: 'codeforces' | 'leetcode' = 'leetcode';
            if (question.URL.includes('leetcode')) {
                source = 'leetcode';
            } else if (question.URL.includes('codeforces')) {
                source = 'codeforces';
            }

            problems.push({
                id: id++,
                url: question.URL,
                name: question.Problem,
                source: source
            });
        }

        return problems;
    }

    /**
     * Check if a ladder exists and has problems
     */
    async hasProblems(ladderName: string): Promise<boolean> {
        try {
            const problems = await this.getLadderProblems(ladderName);
            return problems.length > 0;
        } catch {
            return false;
        }
    }

    /**
     * Check if a ladder has Codeforces problems (for backward compatibility)
     */
    async hasCodeforcesProblems(ladderName: string): Promise<boolean> {
        if (ladderName.startsWith('NeetCode:') || 
            ladderName.startsWith('Love Babbar 450:') || 
            ladderName.startsWith("Striver's Sheet:")) {
            return false; // These problem sets are mostly LeetCode/GeeksforGeeks, not Codeforces
        }
        return this.hasProblems(ladderName);
    }
}
