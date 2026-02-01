import axios from 'axios';
import * as cheerio from 'cheerio';

// Import codeforces-api-ts if available, otherwise use fallback
let CodeforcesAPI: any = null;
try {
    CodeforcesAPI = require('codeforces-api-ts').CodeforcesAPI;
} catch (e) {
    // Package not available, will use fallback methods
    console.warn('codeforces-api-ts not available, using fallback methods');
}

export interface ProblemStatement {
    title: string;
    description: string;
    url: string;
    platform: 'codeforces' | 'leetcode' | 'geeksforgeeks';
    // Optional fields
    timeLimit?: string;
    memoryLimit?: string;
    constraints?: string;
    examples?: Array<{ input: string; output: string; explanation?: string }>;
}

export class ProblemStatementFetcher {
    /**
     * Fetch problem statement from Codeforces using web scraping
     */
    static async fetchFromWeb(contestId: number, problemIndex: string): Promise<ProblemStatement | null> {
        const url = `https://codeforces.com/contest/${contestId}/problem/${problemIndex}`;
        
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                timeout: 30000
            });
            
            const $ = cheerio.load(response.data);
            const problemStatement = $('.problem-statement');
            
            if (problemStatement.length === 0) {
                return null;
            }
            
            // Extract header information
            const title = problemStatement.find('.title').first().text().trim();
            const timeLimit = problemStatement.find('.time-limit').text().trim();
            const memoryLimit = problemStatement.find('.memory-limit').text().trim();
            
            // Extract problem description sections
            let description = '';
            problemStatement.find('> div').each((_, elem) => {
                const $elem = $(elem);
                const classList = $elem.attr('class') || '';
                
                // Skip header
                if (classList.includes('header')) {
                    return;
                }
                
                // Get section content
                const sectionTitle = $elem.find('.section-title').first();
                let content = $elem.clone();
                content.find('.section-title').remove();
                let text = content.text().trim();
                
                if (text && text.length > 5) {
                    // Validate it's not contest announcement
                    const lowerText = text.toLowerCase();
                    if (!lowerText.includes('hello, codeforces') &&
                        !lowerText.includes('invite you') &&
                        !lowerText.includes('we are excited')) {
                        if (sectionTitle.length > 0) {
                            description += `## ${sectionTitle.text().trim()}\n\n${text}\n\n`;
                        } else {
                            description += `${text}\n\n`;
                        }
                    }
                }
            });
            
            // Clean up description
            description = description
                .replace(/\n{3,}/g, '\n\n')
                .replace(/[ \t]+$/gm, '')
                .trim();
            
            // Final validation
            const lowerDesc = description.toLowerCase();
            if (lowerDesc.includes('hello, codeforces') ||
                lowerDesc.includes('invite you to participate') ||
                description.length < 100) {
                return null;
            }
            
            return {
                title: title || `Problem ${problemIndex}`,
                timeLimit: timeLimit || 'time limit per test2 seconds',
                memoryLimit: memoryLimit || 'memory limit per test256 megabytes',
                description,
                url,
                platform: 'codeforces'
            };
        } catch (error: any) {
            console.error(`Error fetching problem statement from ${url}:`, error.message);
            return null;
        }
    }

    /**
     * Get contest problems list from Codeforces API
     */
    static async getContestProblems(contestId: number): Promise<Array<{ index: string; name: string }>> {
        if (!CodeforcesAPI) {
            return [];
        }
        
        try {
            const response = await CodeforcesAPI.call('contest.standings', {
                contestId: contestId,
                from: 1,
                count: 1
            });
            
            if (response.status === 'OK' && response.result && response.result.problems) {
                return response.result.problems.map((p: any) => ({
                    index: p.index,
                    name: p.name
                }));
            }
        } catch (error: any) {
            console.error(`Error fetching contest problems from API:`, error.message);
        }
        
        return [];
    }

    /**
     * Fetch problem statement with retry logic
     */
    static async fetchWithRetry(
        contestId: number, 
        problemIndex: string, 
        maxRetries: number = 3
    ): Promise<ProblemStatement | null> {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            const result = await this.fetchFromWeb(contestId, problemIndex);
            if (result) {
                return result;
            }
            
            if (attempt < maxRetries) {
                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
        
        return null;
    }

    /**
     * Format problem statement as markdown
     */
    static formatAsMarkdown(statement: ProblemStatement): string {
        return `# ${statement.title}\n\n` +
               `**Time Limit:** ${statement.timeLimit}\n\n` +
               `**Memory Limit:** ${statement.memoryLimit}\n\n` +
               `**Input File:** inputstandard input\n\n` +
               `**Output File:** outputstandard output\n\n` +
               `${statement.description}\n\n` +
               `**Problem URL:** ${statement.url}`;
    }

    /**
     * Fetch multiple problem statements in parallel (with rate limiting)
     */
    static async fetchMultiple(
        contestId: number,
        problemIndices: string[],
        onProgress?: (index: string, success: boolean) => void
    ): Promise<Map<string, ProblemStatement | null>> {
        const results = new Map<string, ProblemStatement | null>();
        
        // Fetch with small delays to avoid rate limiting
        for (const index of problemIndices) {
            const statement = await this.fetchWithRetry(contestId, index, 2);
            results.set(index, statement);
            if (onProgress) {
                onProgress(index, statement !== null);
            }
            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        return results;
    }
}
