import axios from 'axios';
import * as cheerio from 'cheerio';
import { ProblemStatement } from './problemStatementFetcher';

export class LeetCodeFetcher {
    /**
     * Fetch problem statement from LeetCode using web scraping
     */
    static async fetchProblemStatement(slug: string): Promise<ProblemStatement | null> {
        const url = `https://leetcode.com/problems/${slug}/`;
        
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5'
                },
                timeout: 30000
            });
            
            const $ = cheerio.load(response.data);
            
            // LeetCode stores problem data in a script tag with __NEXT_DATA__
            const nextDataScript = $('script#__NEXT_DATA__').html();
            if (nextDataScript) {
                try {
                    const nextData = JSON.parse(nextDataScript);
                    const problemData = nextData?.props?.pageProps?.dehydratedState?.queries?.[0]?.state?.data?.question;
                    
                    if (problemData) {
                        const title = problemData.title || slug;
                        const description = problemData.content || problemData.questionFrontendId || '';
                        const difficulty = problemData.difficulty || '';
                        
                        // Extract examples
                        const examples: Array<{ input: string; output: string; explanation?: string }> = [];
                        if (problemData.exampleTestcases) {
                            // LeetCode provides example test cases
                            const testCases = problemData.exampleTestcases.split('\n');
                            // Parse test cases (format varies)
                            for (let i = 0; i < testCases.length; i += 2) {
                                if (i + 1 < testCases.length) {
                                    examples.push({
                                        input: testCases[i],
                                        output: testCases[i + 1]
                                    });
                                }
                            }
                        }
                        
                        // Extract constraints
                        let constraints = '';
                        if (problemData.metaData) {
                            constraints = JSON.stringify(problemData.metaData, null, 2);
                        }
                        
                        return {
                            title: `${problemData.questionFrontendId || ''} ${title}`.trim(),
                            description: description || 'Problem description not available',
                            url,
                            platform: 'leetcode',
                            constraints: constraints || undefined,
                            examples: examples.length > 0 ? examples : undefined
                        };
                    }
                } catch (e) {
                    console.log('Failed to parse __NEXT_DATA__:', e);
                }
            }
            
            // Fallback: Try to parse from HTML directly
            const title = $('div[data-cy="question-title"]').text().trim() || 
                         $('h3').first().text().trim() ||
                         slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            // Try to find problem description in various possible locations
            let description = '';
            const descriptionSelectors = [
                'div[data-cy="question-description"]',
                'div.question-content__JfgR',
                'div.content__u3I1',
                'div[class*="description"]'
            ];
            
            for (const selector of descriptionSelectors) {
                const desc = $(selector).first();
                if (desc.length > 0) {
                    description = desc.text().trim();
                    if (description.length > 100) {
                        break;
                    }
                }
            }
            
            // Extract examples from HTML
            const examples: Array<{ input: string; output: string; explanation?: string }> = [];
            $('pre').each((_, elem) => {
                const text = $(elem).text().trim();
                if (text.includes('Input:') || text.includes('Output:')) {
                    // Try to parse example format
                    const lines = text.split('\n');
                    let input = '';
                    let output = '';
                    for (const line of lines) {
                        if (line.includes('Input:')) {
                            input = line.replace('Input:', '').trim();
                        } else if (line.includes('Output:')) {
                            output = line.replace('Output:', '').trim();
                        }
                    }
                    if (input && output) {
                        examples.push({ input, output });
                    }
                }
            });
            
            if (!description || description.length < 50) {
                description = `LeetCode Problem: ${title}\n\nView the full problem at: ${url}`;
            }
            
            return {
                title: title || slug,
                description,
                url,
                platform: 'leetcode',
                examples: examples.length > 0 ? examples : undefined
            };
        } catch (error: any) {
            console.error(`Error fetching LeetCode problem ${slug}:`, error.message);
            return null;
        }
    }
    
    /**
     * Extract test cases from LeetCode problem
     */
    static async fetchTestCases(slug: string): Promise<{ inputs: string[]; outputs: string[] }> {
        const statement = await this.fetchProblemStatement(slug);
        const inputs: string[] = [];
        const outputs: string[] = [];
        
        if (statement?.examples) {
            for (const example of statement.examples) {
                if (example.input) {
                    inputs.push(example.input);
                }
                if (example.output) {
                    outputs.push(example.output);
                }
            }
        }
        
        return { inputs, outputs };
    }
    
    /**
     * Format problem statement as markdown
     */
    static formatAsMarkdown(statement: ProblemStatement): string {
        let markdown = `# ${statement.title}\n\n`;
        
        if (statement.constraints) {
            markdown += `**Constraints:**\n\`\`\`\n${statement.constraints}\n\`\`\`\n\n`;
        }
        
        markdown += `${statement.description}\n\n`;
        
        if (statement.examples && statement.examples.length > 0) {
            markdown += `## Examples\n\n`;
            statement.examples.forEach((example, index) => {
                markdown += `### Example ${index + 1}\n\n`;
                markdown += `**Input:**\n\`\`\`\n${example.input}\n\`\`\`\n\n`;
                markdown += `**Output:**\n\`\`\`\n${example.output}\n\`\`\`\n\n`;
                if (example.explanation) {
                    markdown += `**Explanation:** ${example.explanation}\n\n`;
                }
            });
        }
        
        markdown += `**Problem URL:** ${statement.url}`;
        
        return markdown;
    }
}
