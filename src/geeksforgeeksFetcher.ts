import axios from 'axios';
import * as cheerio from 'cheerio';
import { ProblemStatement } from './problemStatementFetcher';

export class GeeksforgeeksFetcher {
    /**
     * Fetch problem statement from GeeksforGeeks
     */
    static async fetchProblemStatement(url: string): Promise<ProblemStatement | null> {
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
            
            // Extract title
            const title = $('h1.gfg_h1').first().text().trim() ||
                         $('h1').first().text().trim() ||
                         'GeeksforGeeks Problem';
            
            // Extract problem description
            let description = '';
            const descriptionSelectors = [
                'div.problem-statement',
                'div.content',
                'div[class*="problem"]',
                'article'
            ];
            
            for (const selector of descriptionSelectors) {
                const desc = $(selector).first();
                if (desc.length > 0) {
                    // Remove script and style tags
                    desc.find('script, style').remove();
                    description = desc.text().trim();
                    if (description.length > 200) {
                        break;
                    }
                }
            }
            
            // Extract constraints/time complexity
            let constraints = '';
            $('strong').each((_, elem) => {
                const text = $(elem).text().trim();
                if (text.includes('Time Complexity') || text.includes('Space Complexity') || text.includes('Constraints')) {
                    const constraintText = $(elem).parent().text().trim();
                    if (constraintText) {
                        constraints += constraintText + '\n';
                    }
                }
            });
            
            // Extract examples/test cases
            const examples: Array<{ input: string; output: string; explanation?: string }> = [];
            
            // Look for example sections
            $('div').each((_, elem) => {
                const $elem = $(elem);
                const text = $elem.text().trim();
                if (text.includes('Example') || text.includes('Sample')) {
                    // Try to find input/output in this section
                    const preTags = $elem.find('pre');
                    if (preTags.length >= 2) {
                        const input = preTags.eq(0).text().trim();
                        const output = preTags.eq(1).text().trim();
                        if (input && output) {
                            examples.push({ input, output });
                        }
                    }
                }
            });
            
            // Also check for pre tags directly (common GeeksforGeeks format)
            const preTags = $('pre');
            if (preTags.length >= 2 && examples.length === 0) {
                for (let i = 0; i < preTags.length - 1; i += 2) {
                    const input = preTags.eq(i).text().trim();
                    const output = preTags.eq(i + 1).text().trim();
                    if (input && output && input.length > 0 && output.length > 0) {
                        examples.push({ input, output });
                    }
                }
            }
            
            if (!description || description.length < 100) {
                description = `GeeksforGeeks Problem: ${title}\n\nView the full problem at: ${url}`;
            }
            
            return {
                title: title,
                description: description,
                url,
                platform: 'geeksforgeeks',
                constraints: constraints || undefined,
                examples: examples.length > 0 ? examples : undefined
            };
        } catch (error: any) {
            console.error(`Error fetching GeeksforGeeks problem:`, error.message);
            return null;
        }
    }
    
    /**
     * Extract test cases from GeeksforGeeks problem
     */
    static async fetchTestCases(url: string): Promise<{ inputs: string[]; outputs: string[] }> {
        const statement = await this.fetchProblemStatement(url);
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
        
        if (statement.timeLimit) {
            markdown += `**Time Limit:** ${statement.timeLimit}\n\n`;
        }
        
        if (statement.memoryLimit) {
            markdown += `**Memory Limit:** ${statement.memoryLimit}\n\n`;
        }
        
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
