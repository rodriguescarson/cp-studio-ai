import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { ChatMessage, isValidFilePath } from './chatManager';

export class AIAnalyzer {
    private context: vscode.ExtensionContext;
    private outputChannel: vscode.OutputChannel;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.outputChannel = vscode.window.createOutputChannel('cfx - codeforce studio - AI Analysis');
    }

    async sendChatMessage(userMessage: string, filePath?: string, chatHistory: ChatMessage[] = []): Promise<string> {
        const config = vscode.workspace.getConfiguration('codeforces');
        const apiKey = config.get<string>('aiApiKey', '');
        const provider = config.get<string>('aiProvider', 'openrouter');
        // Default to gpt-4o:online for web search capability, or use openrouter's latest models
        const model = config.get<string>('aiModel', provider === 'openrouter' ? 'openai/gpt-4o:online' : 'gpt-4o');
        const baseUrl = config.get<string>('aiBaseUrl', '');

        if (!apiKey || apiKey.trim() === '') {
            const errorMsg = 'API key not configured. Please set codeforces.aiApiKey in settings or use the Configure API Key button.';
            throw new Error(errorMsg);
        }

        // Build context from file if available
        let systemContext = `You are an expert competitive programming coach and trainer specializing in Codeforces problems. Your role is to:

1. **Provide Solutions**: Give clear, well-explained solutions to Codeforces problems with proper C++ code
2. **Teach Concepts**: Explain algorithms, data structures, and problem-solving techniques
3. **Code Review**: Analyze code for bugs, edge cases, and optimization opportunities
4. **Complexity Analysis**: Provide time and space complexity analysis
5. **Best Practices**: Suggest improvements and alternative approaches

**IMPORTANT GUARDRAILS:**
- ONLY discuss Codeforces competitive programming problems and solutions
- DO NOT provide solutions to problems from other platforms unless explicitly asked
- DO NOT discuss topics unrelated to competitive programming
- DO NOT provide complete solutions without explanation - always explain your approach
- Focus on educational value and helping the user learn and improve
- If asked about non-programming topics, politely redirect to Codeforces problems
- **TRUST THE PROVIDED CONTEXT**: If problem context is provided (contest ID, problem name, problem statement, test cases), trust that the problem exists and work with the provided information. Do not claim the problem doesn't exist if context is provided.

Always provide:
- Clear explanation of the approach/algorithm
- Time and space complexity
- Edge cases to consider
- Complete, compilable C++ code when providing solutions
- Code comments explaining key logic`;
        let problemContext = '';

        const effectiveFilePath = filePath && isValidFilePath(filePath) ? filePath : undefined;
        if (effectiveFilePath) {
            try {
                const code = fs.readFileSync(effectiveFilePath, 'utf-8');
                const problemDir = path.dirname(effectiveFilePath);
                const problemName = path.basename(problemDir);
                const contestDir = path.dirname(problemDir);
                let contestId = path.basename(contestDir);
                let finalProblemName = problemName;
                
                // Validate contest ID and problem name are numeric/valid
                const isValidContestId = /^\d+$/.test(contestId);
                const isValidProblemName = /^[A-Z]$/.test(problemName);
                
                if (!isValidContestId || !isValidProblemName) {
                    // Try alternative path structure
                    const pathParts = effectiveFilePath.split(path.sep);
                    const contestsIndex = pathParts.indexOf('contests');
                    if (contestsIndex >= 0 && pathParts.length > contestsIndex + 2) {
                        const altContestId = pathParts[contestsIndex + 1];
                        const altProblemName = pathParts[contestsIndex + 2];
                        if (/^\d+$/.test(altContestId) && /^[A-Z]$/.test(altProblemName)) {
                            // Use alternative path structure
                            contestId = altContestId;
                            finalProblemName = altProblemName;
                        }
                    }
                }
                
                const problemUrl = `https://codeforces.com/contest/${contestId}/problem/${finalProblemName}`;
                problemContext = `\n\n=== PROBLEM CONTEXT ===\nContest ID: ${contestId}\nProblem Index: ${finalProblemName}\nProblem URL: ${problemUrl}\n\nIMPORTANT: This problem exists on Codeforces. Even if you cannot verify it online, please trust the provided context and work with the information given.\n\nCurrent Code:\n\`\`\`cpp\n${code}\n\`\`\``;

                // Read problem statement from problem_statement.txt (priority)
                const statementFile = path.join(problemDir, 'problem_statement.txt');
                let problemStatementText = '';
                
                if (fs.existsSync(statementFile)) {
                    try {
                        const statement = fs.readFileSync(statementFile, 'utf-8').trim();
                        
                        // Check if the file only contains a URL
                        const urlMatch = statement.match(/https?:\/\/[^\s]+/);
                        if (urlMatch && statement.length < 200) {
                            // File contains mostly just a URL, fetch the content
                            try {
                                this.outputChannel.appendLine(`Fetching problem statement from: ${urlMatch[0]}`);
                                problemStatementText = await this.fetchProblemStatementFromUrl(urlMatch[0]);
                                this.outputChannel.appendLine(`Successfully fetched problem statement (${problemStatementText.length} chars)`);
                            } catch (fetchError: any) {
                                // If fetch fails, include the URL and tell AI to use it
                                this.outputChannel.appendLine(`Failed to fetch problem statement: ${fetchError.message}`);
                                problemStatementText = `Problem statement URL: ${urlMatch[0]}\n\nNote: The problem statement could not be automatically fetched, but the problem exists. Please analyze the code and provide assistance based on the contest ID (${contestId}) and problem index (${finalProblemName}). If you need the problem statement, you can access it at the URL above.`;
                            }
                        } else {
                            // File has actual content
                            problemStatementText = statement;
                        }
                        
                        if (problemStatementText) {
                            problemContext += `\n\nProblem Statement:\n${problemStatementText}`;
                        }
                    } catch (error) {
                        // Statement read failed, try README as fallback
                        const readmeFile = path.join(contestDir, 'README.md');
                        if (fs.existsSync(readmeFile)) {
                            try {
                                const readme = fs.readFileSync(readmeFile, 'utf-8');
                                const problemSectionMatch = readme.match(new RegExp(`##?\\s*Problem\\s+${problemName}[\\s\\S]*?(?=##|$)`, 'i'));
                                if (problemSectionMatch) {
                                    problemContext += `\n\nProblem Statement:\n${problemSectionMatch[0]}`;
                                }
                            } catch (error) {
                                // README read failed, continue
                            }
                        }
                    }
                } else {
                    // If no statement file, try to fetch from URL directly
                    try {
                        this.outputChannel.appendLine(`Fetching problem statement from URL: ${problemUrl}`);
                        problemStatementText = await this.fetchProblemStatementFromUrl(problemUrl);
                        if (problemStatementText) {
                            this.outputChannel.appendLine(`Successfully fetched problem statement (${problemStatementText.length} chars)`);
                            problemContext += `\n\nProblem Statement:\n${problemStatementText}`;
                        }
                    } catch (fetchError: any) {
                        this.outputChannel.appendLine(`Failed to fetch from URL: ${fetchError.message}`);
                        // Add URL to context so AI knows where to find it
                        problemContext += `\n\nProblem Statement URL: ${problemUrl}\nNote: The problem exists at the above URL. Please analyze the code and provide assistance based on contest ${contestId}, problem ${finalProblemName}.`;
                        
                        // Try README as fallback
                        const readmeFile = path.join(contestDir, 'README.md');
                        if (fs.existsSync(readmeFile)) {
                            try {
                                const readme = fs.readFileSync(readmeFile, 'utf-8');
                                const problemSectionMatch = readme.match(new RegExp(`##?\\s*Problem\\s+${problemName}[\\s\\S]*?(?=##|$)`, 'i'));
                                if (problemSectionMatch) {
                                    problemContext += `\n\nProblem Statement (from README):\n${problemSectionMatch[0]}`;
                                }
                            } catch (error) {
                                // README read failed, continue
                            }
                        }
                    }
                }

                // Add test cases if available
                const inputFile = path.join(problemDir, 'in.txt');
                const outputFile = path.join(problemDir, 'out.txt');
                
                if (fs.existsSync(inputFile)) {
                    const input = fs.readFileSync(inputFile, 'utf-8');
                    problemContext += `\n\nSample Input:\n\`\`\`\n${input}\n\`\`\``;
                }
                
                if (fs.existsSync(outputFile)) {
                    const output = fs.readFileSync(outputFile, 'utf-8');
                    problemContext += `\n\nExpected Output:\n\`\`\`\n${output}\n\`\`\``;
                }
            } catch (error) {
                // File read failed, continue without context
                console.error('Error building problem context:', error);
            }
        }

        // Build messages array
        const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
            { role: 'system', content: systemContext }
        ];

        // Add chat history (last 10 messages to avoid token limits)
        const recentHistory = chatHistory.slice(-10);
        recentHistory.forEach(msg => {
            messages.push({
                role: msg.role,
                content: msg.content
            });
        });

        // Add current user message with context
        const fullUserMessage = problemContext 
            ? `${userMessage}${problemContext}`
            : userMessage;
        messages.push({ role: 'user', content: fullUserMessage });

        // Make API call
        try {
            let response: string;

            if (provider === 'openrouter' || provider === 'openai' || (provider === 'custom' && !baseUrl)) {
                const apiUrl = provider === 'openrouter' 
                    ? 'https://openrouter.ai/api/v1/chat/completions'
                    : (baseUrl || 'https://api.openai.com/v1/chat/completions');
                
                const headers: any = {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                };
                
                if (provider === 'openrouter') {
                    headers['HTTP-Referer'] = 'https://github.com/rodriguescarson/cf-studio';
                    headers['X-Title'] = 'CF Studio';
                }
                
                const response_data = await axios.post(
                    apiUrl,
                    {
                        model: model,
                        messages: messages,
                        temperature: 0.7,
                        max_tokens: 2000
                    },
                    {
                        headers: headers,
                        timeout: 30000
                    }
                );
                response = response_data.data.choices[0].message.content;
            } else if (provider === 'anthropic') {
                // Remove system message for Anthropic (they use different format)
                const anthropicMessages = messages.filter(m => m.role !== 'system');
                const response_data = await axios.post(
                    'https://api.anthropic.com/v1/messages',
                    {
                        model: model,
                        max_tokens: 2000,
                        messages: anthropicMessages
                    },
                    {
                        headers: {
                            'x-api-key': apiKey,
                            'anthropic-version': '2023-06-01',
                            'Content-Type': 'application/json'
                        },
                        timeout: 30000
                    }
                );
                response = response_data.data.content[0].text;
            } else {
                const apiUrl = baseUrl || 'https://api.openai.com/v1/chat/completions';
                const response_data = await axios.post(
                    apiUrl,
                    {
                        model: model,
                        messages: messages
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 30000
                    }
                );
                response = response_data.data.choices?.[0]?.message?.content || 
                          response_data.data.content?.[0]?.text || 
                          JSON.stringify(response_data.data);
            }

            return response;
        } catch (error: any) {
            // Handle 401 Unauthorized specifically
            if (error.response?.status === 401) {
                const errorMsg = 'API key is invalid or expired. Please check your API key in settings.';
                throw new Error(errorMsg);
            }
            // Handle network errors
            if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                throw new Error('Request timed out. Please try again.');
            }
            // Handle other errors
            const errorMessage = error.response?.data?.error?.message || 
                              error.response?.data?.error || 
                              error.message || 
                              'Unknown error';
            throw new Error(`AI request failed: ${errorMessage}`);
        }
    }

    async analyzeCode(filePath: string): Promise<void> {
        const config = vscode.workspace.getConfiguration('codeforces');
        const apiKey = config.get<string>('aiApiKey', '');
        const provider = config.get<string>('aiProvider', 'openrouter');
        // Default to gpt-4o:online for web search capability
        const model = config.get<string>('aiModel', provider === 'openrouter' ? 'openai/gpt-4o:online' : 'gpt-4o');
        const baseUrl = config.get<string>('aiBaseUrl', '');

        // Check if API key is set
        if (!apiKey) {
            const action = await vscode.window.showWarningMessage(
                'OpenRouter API key not configured. Please set codeforces.aiApiKey in settings. Get your key at https://openrouter.ai',
                'Open Settings',
                'Open OpenRouter'
            );

            if (action === 'Open Settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'codeforces.aiApiKey');
            } else if (action === 'Open OpenRouter') {
                vscode.env.openExternal(vscode.Uri.parse('https://openrouter.ai'));
            }
            return;
        }

        // Read code
        const code = fs.readFileSync(filePath, 'utf-8');
        const problemDir = path.dirname(filePath);
        const problemName = path.basename(problemDir);
        const contestId = path.basename(path.dirname(problemDir));

        // Read problem context if available
        let problemContext = '';
        const problemUrl = `https://codeforces.com/contest/${contestId}/problem/${problemName}`;
        
        // Try to read input/output files for context
        const inputFile = path.join(problemDir, 'in.txt');
        const outputFile = path.join(problemDir, 'out.txt');
        
        if (fs.existsSync(inputFile)) {
            const input = fs.readFileSync(inputFile, 'utf-8');
            problemContext += `\n\nSample Input:\n${input}`;
        }
        
        if (fs.existsSync(outputFile)) {
            const output = fs.readFileSync(outputFile, 'utf-8');
            problemContext += `\n\nExpected Output:\n${output}`;
        }

        const prompt = `You are analyzing a Codeforces competitive programming solution.

Problem: Contest ${contestId}, Problem ${problemName}
Problem URL: ${problemUrl}
${problemContext}

Code:
\`\`\`cpp
${code}
\`\`\`

Please provide:
1. Code review and potential bugs
2. Time and space complexity analysis
3. Suggestions for optimization
4. Edge cases to consider
5. Alternative approaches if applicable

Be concise but thorough.`;

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Analyzing code with AI...',
            cancellable: false
        }, async (progress) => {
            try {
                progress.report({ increment: 0, message: 'Sending request to AI...' });

                let response: string;
                
                if (provider === 'openrouter' || provider === 'openai' || (provider === 'custom' && !baseUrl)) {
                    // OpenRouter API (default) - supports multiple models
                    const apiUrl = provider === 'openrouter' 
                        ? 'https://openrouter.ai/api/v1/chat/completions'
                        : (baseUrl || 'https://api.openai.com/v1/chat/completions');
                    
                    const headers: any = {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    };
                    
                    // OpenRouter specific headers
                    if (provider === 'openrouter') {
                        headers['HTTP-Referer'] = 'https://github.com/rodriguescarson/cf-studio';
                        headers['X-Title'] = 'cfx - codeforce studio';
                    }
                    
                    const response_data = await axios.post(
                        apiUrl,
                        {
                            model: model,
                            messages: [
                                { role: 'system', content: 'You are a helpful competitive programming assistant.' },
                                { role: 'user', content: prompt }
                            ],
                            temperature: 0.7,
                            max_tokens: 2000
                        },
                        {
                            headers: headers,
                            timeout: 30000
                        }
                    );
                    response = response_data.data.choices[0].message.content;
                } else if (provider === 'anthropic') {
                    // Anthropic Claude API
                    const response_data = await axios.post(
                        'https://api.anthropic.com/v1/messages',
                        {
                            model: model,
                            max_tokens: 2000,
                            messages: [
                                { role: 'user', content: prompt }
                            ]
                        },
                        {
                            headers: {
                                'x-api-key': apiKey,
                                'anthropic-version': '2023-06-01',
                                'Content-Type': 'application/json'
                            },
                            timeout: 30000
                        }
                    );
                    response = response_data.data.content[0].text;
                } else {
                    // Custom provider
                    const apiUrl = baseUrl || 'https://api.openai.com/v1/chat/completions';
                    const response_data = await axios.post(
                        apiUrl,
                        {
                            model: model,
                            messages: [
                                { role: 'user', content: prompt }
                            ]
                        },
                        {
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                                'Content-Type': 'application/json'
                            },
                            timeout: 30000
                        }
                    );
                    response = response_data.data.choices?.[0]?.message?.content || 
                              response_data.data.content?.[0]?.text || 
                              JSON.stringify(response_data.data);
                }

                progress.report({ increment: 100, message: 'Done!' });

                // Show results
                this.outputChannel.show();
                this.outputChannel.clear();
                this.outputChannel.appendLine('AI Analysis Results:');
                this.outputChannel.appendLine('='.repeat(50));
                this.outputChannel.appendLine(response);

                // Also show in a new document
                const doc = await vscode.workspace.openTextDocument({
                    content: `AI Analysis for ${contestId}${problemName}\n\n${response}`,
                    language: 'markdown'
                });
                await vscode.window.showTextDocument(doc);

                vscode.window.showInformationMessage('AI analysis complete! Check the output channel.');

            } catch (error: any) {
                vscode.window.showErrorMessage(`AI analysis failed: ${error.message}`);
                this.outputChannel.show();
                this.outputChannel.appendLine(`Error: ${error.message}`);
            }
        });
    }

    private async fetchProblemStatementFromUrl(url: string): Promise<string> {
        try {
            this.outputChannel.appendLine(`Attempting to fetch: ${url}`);
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5'
                },
                timeout: 20000,
                maxRedirects: 5
            });

            const $ = cheerio.load(response.data);
            
            // Find the problem-statement div
            const problemDiv = $('div.problem-statement').first();
            
            if (problemDiv.length === 0) {
                throw new Error('No problem-statement div found');
            }
            
            let problemStatement = '';
            
            // Extract header information
            const header = problemDiv.find('div.header').first();
            if (header.length > 0) {
                const title = header.find('.title').text().trim();
                const timeLimit = header.find('.time-limit').text().trim();
                const memoryLimit = header.find('.memory-limit').text().trim();
                
                if (title) {
                    problemStatement += `# ${title}\n\n`;
                }
                if (timeLimit) problemStatement += `**Time Limit:** ${timeLimit}\n\n`;
                if (memoryLimit) problemStatement += `**Memory Limit:** ${memoryLimit}\n\n`;
            }
            
            // Extract sections
            problemDiv.find('> div').each((_, elem) => {
                const $elem = $(elem);
                const classList = $elem.attr('class') || '';
                
                if (classList.includes('header')) {
                    return;
                }
                
                const sectionTitle = $elem.find('.section-title').first();
                if (sectionTitle.length > 0) {
                    const titleText = sectionTitle.text().trim();
                    const $contentElem = $elem.clone();
                    $contentElem.find('.section-title').remove();
                    let content = $contentElem.text().trim();
                    
                    content = content.replace(/\n{3,}/g, '\n\n').trim();
                    
                    if (content && content.length > 5) {
                        const lowerContent = content.toLowerCase();
                        if (!lowerContent.includes('hello, codeforces') &&
                            !lowerContent.includes('invite you') &&
                            !lowerContent.includes('we are excited') &&
                            !lowerContent.includes('the round will be') &&
                            !lowerContent.includes('problems were authored')) {
                            problemStatement += `## ${titleText}\n\n${content}\n\n`;
                        }
                    }
                } else {
                    let content = $elem.text().trim();
                    content = content.replace(/\n{3,}/g, '\n\n').trim();
                    
                    if (content && content.length > 20) {
                        const lowerContent = content.toLowerCase();
                        if (!lowerContent.includes('hello, codeforces') &&
                            !lowerContent.includes('invite you') &&
                            !lowerContent.includes('we are excited')) {
                            problemStatement += `${content}\n\n`;
                        }
                    }
                }
            });
            
            // Validate we got actual problem content
            const lowerStatement = problemStatement.toLowerCase();
            if (lowerStatement.includes('hello, codeforces') ||
                lowerStatement.includes('invite you to participate') ||
                lowerStatement.includes('we are excited and pleased') ||
                problemStatement.length < 100) {
                throw new Error('Extracted content appears to be contest announcement');
            }
            
            const result = problemStatement
                .replace(/\n{3,}/g, '\n\n')
                .replace(/[ \t]+$/gm, '')
                .trim();
            
            if (!result || result.length < 50) {
                throw new Error('Extracted problem statement is too short or empty');
            }
            
            this.outputChannel.appendLine(`Successfully extracted problem statement (${result.length} characters)`);
            return result;
        } catch (error: any) {
            const errorMsg = error.message || String(error);
            this.outputChannel.appendLine(`Error fetching problem statement: ${errorMsg}`);
            if (error.response) {
                this.outputChannel.appendLine(`HTTP Status: ${error.response.status}`);
            }
            throw new Error(`Failed to fetch problem statement from URL: ${errorMsg}`);
        }
    }
}
