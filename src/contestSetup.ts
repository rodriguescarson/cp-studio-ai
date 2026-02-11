import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { exec } from 'child_process';
import { promisify } from 'util';
import { CodeforcesAPI } from './codeforcesApi';
import { ProblemStatementFetcher } from './problemStatementFetcher';
import { SolvedProblemsTracker } from './solvedTracker';
import { LeetCodeFetcher } from './leetcodeFetcher';
import { GeeksforgeeksFetcher } from './geeksforgeeksFetcher';

const execAsync = promisify(exec);

interface ParsedProblemUrl {
    platform: 'codeforces' | 'leetcode' | 'geeksforgeeks';
    // Codeforces
    contestId?: number;
    problemIndex?: string;
    // LeetCode
    slug?: string;
    // GeeksforGeeks
    problemName?: string;
    problemId?: string;
    url: string;
}

export class ContestSetup {
    private context: vscode.ExtensionContext;
    private contestsPath: string;
    private leetcodePath: string;
    private geeksforgeeksPath: string;
    private api: CodeforcesAPI;
    private solvedTracker: SolvedProblemsTracker;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.api = new CodeforcesAPI();
        this.solvedTracker = new SolvedProblemsTracker(context);
        const config = vscode.workspace.getConfiguration('codeforces');
        
        // Get paths from configuration
        this.contestsPath = config.get<string>('contestsPath', '${workspaceFolder}/contests') || '';
        this.leetcodePath = config.get<string>('leetcodePath', '${workspaceFolder}/leetcode') || '';
        this.geeksforgeeksPath = config.get<string>('geeksforgeeksPath', '${workspaceFolder}/geeksforgeeks') || '';
        
        // Resolve workspace folder variables
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || os.homedir();
        
        // Resolve contests path
        if (this.contestsPath.includes('${workspaceFolder}')) {
            this.contestsPath = this.contestsPath.replace('${workspaceFolder}', workspaceFolder);
        } else if (!vscode.workspace.workspaceFolders) {
            this.contestsPath = path.join(os.homedir(), 'codeforces-contests');
        }
        if (!path.isAbsolute(this.contestsPath)) {
            this.contestsPath = path.resolve(workspaceFolder, this.contestsPath);
        }
        
        // Resolve leetcode path
        if (this.leetcodePath.includes('${workspaceFolder}')) {
            this.leetcodePath = this.leetcodePath.replace('${workspaceFolder}', workspaceFolder);
        } else if (!vscode.workspace.workspaceFolders) {
            this.leetcodePath = path.join(os.homedir(), 'leetcode');
        }
        if (!path.isAbsolute(this.leetcodePath)) {
            this.leetcodePath = path.resolve(workspaceFolder, this.leetcodePath);
        }
        
        // Resolve geeksforgeeks path
        if (this.geeksforgeeksPath.includes('${workspaceFolder}')) {
            this.geeksforgeeksPath = this.geeksforgeeksPath.replace('${workspaceFolder}', workspaceFolder);
        } else if (!vscode.workspace.workspaceFolders) {
            this.geeksforgeeksPath = path.join(os.homedir(), 'geeksforgeeks');
        }
        if (!path.isAbsolute(this.geeksforgeeksPath)) {
            this.geeksforgeeksPath = path.resolve(workspaceFolder, this.geeksforgeeksPath);
        }
        
        console.log(`Contests path: ${this.contestsPath}`);
        console.log(`LeetCode path: ${this.leetcodePath}`);
        console.log(`GeeksforGeeks path: ${this.geeksforgeeksPath}`);
    }

    async setupFromContestId(contestId: number): Promise<void> {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Setting up contest...',
            cancellable: false
        }, async (progress) => {
            try {
                progress.report({ increment: 0, message: 'Fetching contest problems...' });
                const problems = await this.getContestProblems(contestId);
                
                if (problems.length === 0) {
                    throw new Error('No problems found for this contest');
                }

                // Show quick pick to select problem or setup all
                const problemItems = [
                    {
                        label: 'Setup All Problems',
                        description: 'Set up all problems in this contest',
                        problemIndex: null
                    },
                    ...problems.map(p => ({
                        label: `${p.index}: ${p.name}`,
                        description: `Problem ${p.index}`,
                        problemIndex: p.index
                    }))
                ];

                const selected = await vscode.window.showQuickPick(problemItems, {
                    placeHolder: 'Select a problem to set up, or choose "Setup All Problems"'
                });

                if (!selected) {
                    return; // User cancelled
                }

                if (selected.problemIndex === null) {
                    // Setup all problems
                    progress.report({ increment: 10, message: `Setting up all problems for contest ${contestId}...` });
                    for (const problem of problems) {
                        const problemDir = path.join(this.contestsPath, contestId.toString(), problem.index);
                        await this.createDirectory(problemDir);
                        await this.setupProblem(contestId, problem.index, problemDir, progress);
                    }
                    vscode.window.showInformationMessage(`Successfully set up ${problems.length} problems for contest ${contestId}`);
                } else {
                    // Setup single problem
                    progress.report({ increment: 20, message: `Setting up contest ${contestId}, problem ${selected.problemIndex}...` });
                    const problemDir = path.join(this.contestsPath, contestId.toString(), selected.problemIndex);
                    await this.createDirectory(problemDir);
                    await this.setupProblem(contestId, selected.problemIndex, problemDir, progress);
                }
            } catch (error: any) {
                const errorMessage = error?.message || String(error);
                vscode.window.showErrorMessage(`Setup failed: ${errorMessage}`);
            }
        });
    }

    async setupFromUrl(url: string): Promise<void> {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Setting up problem...',
            cancellable: false
        }, async (progress) => {
            try {
                progress.report({ increment: 0, message: 'Parsing URL...' });

                // Parse URL to determine platform
                const parsed = this.parseProblemUrl(url);
                if (!parsed) {
                    throw new Error('Invalid problem URL. Supported platforms: Codeforces, LeetCode, GeeksforGeeks');
                }

                switch (parsed.platform) {
                    case 'codeforces':
                        await this.setupCodeforcesProblem(parsed, progress);
                        break;
                    case 'leetcode':
                        await this.setupLeetCodeProblem(parsed, progress);
                        break;
                    case 'geeksforgeeks':
                        await this.setupGeeksforgeeksProblem(parsed, progress);
                        break;
                    default:
                        throw new Error(`Unsupported platform: ${parsed.platform}`);
                }
            } catch (error: any) {
                const errorMessage = error?.message || String(error);
                const errorStack = error?.stack || 'No stack trace';
                console.error('Setup error:', errorMessage, errorStack);
                
                vscode.window.showErrorMessage(`Setup failed: ${errorMessage}`);
                
                // Show detailed error in output
                const outputChannel = vscode.window.createOutputChannel('CP Studio');
                outputChannel.appendLine(`Error in setupFromUrl:`);
                outputChannel.appendLine(`Message: ${errorMessage}`);
                outputChannel.appendLine(`Stack: ${errorStack}`);
                outputChannel.show();
            }
        });
    }

    /**
     * Parse problem URL to determine platform and extract identifiers
     */
    private parseProblemUrl(url: string): ParsedProblemUrl | null {
        // LeetCode URLs: leetcode.com/problems/{slug}/
        const leetcodeMatch = url.match(/leetcode\.com\/problems\/([^\/\?]+)/);
        if (leetcodeMatch) {
            return {
                platform: 'leetcode',
                slug: leetcodeMatch[1],
                url: url
            };
        }

        // GeeksforGeeks URLs: practice.geeksforgeeks.org/problems/{problem-name}/{id}
        const geeksforgeeksMatch = url.match(/geeksforgeeks\.org\/problems\/([^\/]+)\/(\d+)/);
        if (geeksforgeeksMatch) {
            return {
                platform: 'geeksforgeeks',
                problemName: geeksforgeeksMatch[1],
                problemId: geeksforgeeksMatch[2],
                url: url
            };
        }

        // Codeforces URLs: codeforces.com/contest/{contestId}/problem/{index}
        const contestMatch = url.match(/contest\/(\d+)/);
        const problemMatch = url.match(/problem\/([A-Z])/i);

        if (contestMatch && problemMatch) {
            return {
                platform: 'codeforces',
                contestId: parseInt(contestMatch[1]),
                problemIndex: problemMatch[1].toUpperCase(),
                url: url
            };
        }

        // Try problemset format: codeforces.com/problemset/problem/{contestId}/{index}
        const problemsetMatch = url.match(/problemset\/problem\/(\d+)\/([A-Z])/i);
        if (problemsetMatch) {
            return {
                platform: 'codeforces',
                contestId: parseInt(problemsetMatch[1]),
                problemIndex: problemsetMatch[2].toUpperCase(),
                url: url
            };
        }

        // Match contest-only URL (no problem specified)
        if (contestMatch && !problemMatch) {
            return {
                platform: 'codeforces',
                contestId: parseInt(contestMatch[1]),
                problemIndex: undefined,  // Will prompt user or fetch all problems
                url: url
            };
        }

        return null;
    }

    private async setupCodeforcesProblem(parsed: ParsedProblemUrl, progress: vscode.Progress<{ message?: string; increment?: number }>): Promise<void> {
        const { contestId, problemIndex } = parsed;
        
        if (!contestId) {
            throw new Error('Invalid Codeforces URL: contest ID not found');
        }

        // If no problem index specified, fetch contest problems and let user choose
        if (!problemIndex) {
            progress.report({ increment: 10, message: 'Fetching contest problems...' });
            const problems = await this.getContestProblems(contestId);
            
            if (problems.length === 0) {
                throw new Error('No problems found for this contest');
            }

            // Show quick pick to select problem
            const problemItems = problems.map(p => ({
                label: `${p.index}: ${p.name}`,
                description: `Problem ${p.index}`,
                problemIndex: p.index
            }));

            const selected = await vscode.window.showQuickPick(problemItems, {
                placeHolder: 'Select a problem to set up'
            });

            if (!selected) {
                return; // User cancelled
            }

            const problemDir = path.join(this.contestsPath, contestId.toString(), selected.problemIndex);
            await this.createDirectory(problemDir);
            await this.setupProblem(contestId, selected.problemIndex, problemDir, progress);
        } else {
            // Setup single problem
            progress.report({ increment: 20, message: `Setting up contest ${contestId}, problem ${problemIndex}...` });
            const problemDir = path.join(this.contestsPath, contestId.toString(), problemIndex);
            await this.createDirectory(problemDir);
            await this.setupProblem(contestId, problemIndex, problemDir, progress);
        }
    }

    private async setupLeetCodeProblem(parsed: ParsedProblemUrl, progress: vscode.Progress<{ message?: string; increment?: number }>): Promise<void> {
        const { slug, url } = parsed;
        
        if (!slug) {
            throw new Error('Invalid LeetCode URL: problem slug not found');
        }

        progress.report({ increment: 10, message: `Fetching LeetCode problem: ${slug}...` });
        
        // Fetch problem statement
        const statement = await LeetCodeFetcher.fetchProblemStatement(slug);
        if (!statement) {
            throw new Error(`Failed to fetch problem statement for ${slug}`);
        }

        progress.report({ increment: 30, message: 'Fetching test cases...' });
        
        // Fetch test cases
        const { inputs, outputs } = await LeetCodeFetcher.fetchTestCases(slug);

        // Create problem directory
        const problemDir = path.join(this.leetcodePath, slug);
        await this.createDirectory(problemDir);

        progress.report({ increment: 50, message: 'Creating files...' });

        // Write problem statement
        const statementPath = path.join(problemDir, 'problem_statement.txt');
        const statementContent = LeetCodeFetcher.formatAsMarkdown(statement);
        fs.writeFileSync(statementPath, statementContent, 'utf-8');

        // Write test cases
        if (inputs.length > 0 && outputs.length > 0) {
            // Use first test case for in.txt/out.txt
            fs.writeFileSync(path.join(problemDir, 'in.txt'), inputs[0], 'utf-8');
            fs.writeFileSync(path.join(problemDir, 'out.txt'), outputs[0], 'utf-8');
            
            // Write additional test cases if available
            if (inputs.length > 1) {
                const additionalTests = inputs.slice(1).map((input, idx) => 
                    `Test Case ${idx + 2}:\n${input}\n`
                ).join('\n');
                fs.writeFileSync(path.join(problemDir, 'additional_tests.txt'), additionalTests, 'utf-8');
            }
        } else {
            // Create placeholder files
            fs.writeFileSync(path.join(problemDir, 'in.txt'), '// Add your test input here\n', 'utf-8');
            fs.writeFileSync(path.join(problemDir, 'out.txt'), '// Add expected output here\n', 'utf-8');
        }

        // Create template main.cpp
        const templatePath = path.join(problemDir, 'main.cpp');
        if (!fs.existsSync(templatePath)) {
            await this.createMainCpp(templatePath);
        }

        progress.report({ increment: 100, message: 'Complete!' });

        // Open main.cpp in editor
        const doc = await vscode.workspace.openTextDocument(templatePath);
        await vscode.window.showTextDocument(doc);

        vscode.window.showInformationMessage(`Successfully set up LeetCode problem: ${statement.title}`);
    }

    private async setupGeeksforgeeksProblem(parsed: ParsedProblemUrl, progress: vscode.Progress<{ message?: string; increment?: number }>): Promise<void> {
        const { problemName, problemId, url } = parsed;
        
        if (!problemName || !problemId) {
            throw new Error('Invalid GeeksforGeeks URL: problem name or ID not found');
        }

        progress.report({ increment: 10, message: `Fetching GeeksforGeeks problem...` });
        
        // Fetch problem statement
        const statement = await GeeksforgeeksFetcher.fetchProblemStatement(url);
        if (!statement) {
            throw new Error(`Failed to fetch problem statement from ${url}`);
        }

        progress.report({ increment: 30, message: 'Fetching test cases...' });
        
        // Fetch test cases
        const { inputs, outputs } = await GeeksforgeeksFetcher.fetchTestCases(url);

        // Create problem directory (format: {problemName}-{problemId})
        const dirName = `${problemName}-${problemId}`;
        const problemDir = path.join(this.geeksforgeeksPath, dirName);
        await this.createDirectory(problemDir);

        progress.report({ increment: 50, message: 'Creating files...' });

        // Write problem statement
        const statementPath = path.join(problemDir, 'problem_statement.txt');
        const statementContent = GeeksforgeeksFetcher.formatAsMarkdown(statement);
        fs.writeFileSync(statementPath, statementContent, 'utf-8');

        // Write test cases
        if (inputs.length > 0 && outputs.length > 0) {
            // Use first test case for in.txt/out.txt
            fs.writeFileSync(path.join(problemDir, 'in.txt'), inputs[0], 'utf-8');
            fs.writeFileSync(path.join(problemDir, 'out.txt'), outputs[0], 'utf-8');
            
            // Write additional test cases if available
            if (inputs.length > 1) {
                const additionalTests = inputs.slice(1).map((input, idx) => 
                    `Test Case ${idx + 2}:\n${input}\n`
                ).join('\n');
                fs.writeFileSync(path.join(problemDir, 'additional_tests.txt'), additionalTests, 'utf-8');
            }
        } else {
            // Create placeholder files
            fs.writeFileSync(path.join(problemDir, 'in.txt'), '// Add your test input here\n', 'utf-8');
            fs.writeFileSync(path.join(problemDir, 'out.txt'), '// Add expected output here\n', 'utf-8');
        }

        // Create template main.cpp
        const templatePath = path.join(problemDir, 'main.cpp');
        if (!fs.existsSync(templatePath)) {
            await this.createMainCpp(templatePath);
        }

        progress.report({ increment: 100, message: 'Complete!' });

        // Open main.cpp in editor
        const doc = await vscode.workspace.openTextDocument(templatePath);
        await vscode.window.showTextDocument(doc);

        vscode.window.showInformationMessage(`Successfully set up GeeksforGeeks problem: ${statement.title}`);
    }

    /**
     * Legacy method for backward compatibility
     */
    private parseCodeforcesUrl(url: string): { contestId: number; problemIndex: string | null } | null {
        const parsed = this.parseProblemUrl(url);
        if (parsed && parsed.platform === 'codeforces' && parsed.contestId) {
            return {
                contestId: parsed.contestId,
                problemIndex: parsed.problemIndex || null
            };
        }
        return null;
    }

    private async createDirectory(dirPath: string): Promise<void> {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    private async fetchTestCasesWithCF(contestId: number, problemIndex: string, problemDir: string): Promise<boolean> {
        try {
            const { stdout, stderr } = await execAsync(
                `cd "${problemDir}" && cf parse ${contestId} ${problemIndex}`,
                { timeout: 30000 }
            );

            // Check if cf created test files
            const files = fs.readdirSync(problemDir);
            const inputFiles = files.filter(f => f.includes('.in') || f.includes('input'));
            const outputFiles = files.filter(f => f.includes('.out') || f.includes('output'));

            if (inputFiles.length > 0 && outputFiles.length > 0) {
                // Combine input files
                let allInputs = '';
                for (const file of inputFiles.sort()) {
                    const content = fs.readFileSync(path.join(problemDir, file), 'utf-8');
                    allInputs += content + '\n';
                }

                // Combine output files
                let allOutputs = '';
                for (const file of outputFiles.sort()) {
                    const content = fs.readFileSync(path.join(problemDir, file), 'utf-8');
                    allOutputs += content + '\n';
                }

                fs.writeFileSync(path.join(problemDir, 'in.txt'), allInputs.trim());
                fs.writeFileSync(path.join(problemDir, 'out.txt'), allOutputs.trim());

                // Clean up individual files
                [...inputFiles, ...outputFiles].forEach(file => {
                    fs.unlinkSync(path.join(problemDir, file));
                });

                return true;
            }
        } catch (error) {
            // CF tool failed, return false
        }
        return false;
    }

    private async fetchProblemStatement(contestId: number, problemIndex: string, problemDir: string): Promise<void> {
        const url = `https://codeforces.com/contest/${contestId}/problem/${problemIndex}`;
        
        try {
            // Use the new ProblemStatementFetcher utility
            const statement = await ProblemStatementFetcher.fetchWithRetry(contestId, problemIndex, 3);
            
            if (statement) {
                const statementPath = path.join(problemDir, 'problem_statement.txt');
                const markdown = ProblemStatementFetcher.formatAsMarkdown(statement);
                fs.writeFileSync(statementPath, markdown);
                return;
            }
            
            // Fallback to old method if new fetcher fails
            throw new Error('ProblemStatementFetcher returned null');
        } catch (error: any) {
            // Fallback: try original method with improved formatting
            try {
                const response = await axios.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                    },
                    timeout: 15000
                });

                const $ = cheerio.load(response.data);
                const problemDivs = $('div.problem-statement');
                
                if (problemDivs.length === 0) {
                    throw new Error('No problem-statement div found');
                }
                
                const problemDiv = problemDivs.first();
                let problemStatement = '';
                
                const header = problemDiv.find('div.header').first();
                if (header.length > 0) {
                    const title = header.find('.title').text().trim();
                    
                    // Properly extract time/memory limit values (strip property-title text)
                    const timeLimitEl = header.find('.time-limit').first();
                    const timeLimitTitle = timeLimitEl.find('.property-title').text().trim();
                    const timeLimit = timeLimitEl.text().trim().replace(timeLimitTitle, '').trim();
                    
                    const memoryLimitEl = header.find('.memory-limit').first();
                    const memoryLimitTitle = memoryLimitEl.find('.property-title').text().trim();
                    const memoryLimit = memoryLimitEl.text().trim().replace(memoryLimitTitle, '').trim();
                    
                    if (title) problemStatement += `# ${title}\n\n`;
                    if (timeLimit) problemStatement += `**Time Limit:** ${timeLimit}\n\n`;
                    if (memoryLimit) problemStatement += `**Memory Limit:** ${memoryLimit}\n\n`;
                }
                
                problemDiv.find('> div').each((_, elem) => {
                    const $elem = $(elem);
                    const classList = $elem.attr('class') || '';
                    if (classList.includes('header')) return;
                    
                    // Handle sample-tests section specially
                    if (classList.includes('sample-tests')) {
                        let exampleText = '';
                        const sampleTitle = $elem.find('> .section-title').first().text().trim();
                        
                        $elem.find('.sample-test').each((__, sampleElem) => {
                            const $sample = $(sampleElem);
                            $sample.find('.input, .output').each((___, ioElem) => {
                                const $io = $(ioElem);
                                const ioTitle = $io.find('.section-title').text().trim();
                                const preElem = $io.find('pre');
                                const preText = ProblemStatementFetcher.extractPreText($, preElem);
                                if (preText) {
                                    exampleText += `**${ioTitle}:**\n\`\`\`\n${preText}\n\`\`\`\n\n`;
                                }
                            });
                        });
                        
                        if (exampleText) {
                            problemStatement += `## ${sampleTitle || 'Examples'}\n\n${exampleText}`;
                        }
                        return;
                    }
                    
                    const sectionTitle = $elem.find('.section-title').first();
                    const $contentElem = $elem.clone();
                    $contentElem.find('.section-title').remove();
                    let content = $contentElem.text().trim().replace(/\n{3,}/g, '\n\n');
                    // Convert Codeforces LaTeX $$$...$$ to standard $...$
                    content = content.replace(/\$\$\$(.*?)\$\$\$/g, '$$$1$$');
                    
                    if (content && content.length > 5) {
                        const lowerContent = content.toLowerCase();
                        if (!lowerContent.includes('hello, codeforces') &&
                            !lowerContent.includes('invite you') &&
                            !lowerContent.includes('we are excited')) {
                            if (sectionTitle.length > 0) {
                                problemStatement += `## ${sectionTitle.text().trim()}\n\n${content}\n\n`;
                            } else {
                                problemStatement += `${content}\n\n`;
                            }
                        }
                    }
                });
                
                const lowerStatement = problemStatement.toLowerCase();
                if (lowerStatement.includes('hello, codeforces') ||
                    lowerStatement.includes('invite you to participate') ||
                    problemStatement.length < 100) {
                    throw new Error('Extracted content appears to be contest announcement');
                }
                
                if (problemStatement && problemStatement.length > 100) {
                    problemStatement = problemStatement.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+$/gm, '').trim();
                    const statementPath = path.join(problemDir, 'problem_statement.txt');
                    fs.writeFileSync(statementPath, problemStatement);
                } else {
                    throw new Error('Could not extract sufficient problem statement content');
                }
            } catch (fallbackError: any) {
                // If all methods fail, create a placeholder with the URL
                const statementPath = path.join(problemDir, 'problem_statement.txt');
                if (!fs.existsSync(statementPath)) {
                    fs.writeFileSync(statementPath, `Problem Statement for Contest ${contestId}, Problem ${problemIndex}\n\nView the full problem statement at:\n${url}\n`);
                }
                throw fallbackError;
            }
        }
    }

    private async fetchTestCasesFromWeb(contestId: number, problemIndex: string, problemDir: string): Promise<void> {
        const url = `https://codeforces.com/contest/${contestId}/problem/${problemIndex}`;
        
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const inputs: string[] = [];
        const outputs: string[] = [];

        // Use extractPreText to properly handle <br> and <div> tags inside <pre>
        $('div.input pre').each((_, elem) => {
            const text = ProblemStatementFetcher.extractPreText($, $(elem));
            if (text) {
                inputs.push(text);
            }
        });

        $('div.output pre').each((_, elem) => {
            const text = ProblemStatementFetcher.extractPreText($, $(elem));
            if (text) {
                outputs.push(text);
            }
        });

        if (inputs.length > 0 && outputs.length > 0) {
            // Write each test case separated by blank lines
            fs.writeFileSync(path.join(problemDir, 'in.txt'), inputs.join('\n\n'));
            fs.writeFileSync(path.join(problemDir, 'out.txt'), outputs.join('\n\n'));
        } else {
            throw new Error('Could not extract test cases from page');
        }
    }

    private async createPlaceholderFiles(problemDir: string, contestId: number, problemIndex: string): Promise<void> {
        const inPath = path.join(problemDir, 'in.txt');
        const outPath = path.join(problemDir, 'out.txt');

        if (!fs.existsSync(inPath)) {
            fs.writeFileSync(inPath, `# Add sample test case inputs here\n# Copy from: https://codeforces.com/contest/${contestId}/problem/${problemIndex}\n`);
        }

        if (!fs.existsSync(outPath)) {
            fs.writeFileSync(outPath, `# Add expected outputs here\n# Copy from: https://codeforces.com/contest/${contestId}/problem/${problemIndex}\n`);
        }
    }

    private async createMainCpp(filePath: string): Promise<void> {
        const template = `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <cmath>
#include <set>
#include <map>
#include <unordered_map>
#include <unordered_set>
#include <queue>
#include <stack>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    // TODO: Implement solution
    
    return 0;
}
`;
        fs.writeFileSync(filePath, template);
    }

    private async getContestProblems(contestId: number): Promise<Array<{ index: string; name: string }>> {
        // Try using ProblemStatementFetcher's API method first
        try {
            const problems = await ProblemStatementFetcher.getContestProblems(contestId);
            if (problems && problems.length > 0) {
                return problems;
            }
        } catch (error: any) {
            console.warn(`ProblemStatementFetcher API failed: ${error?.message}`);
        }
        
        // Fallback to existing API
        try {
            // API example uses from=1, count=5; some versions reject count=1
            const standings = await this.api.getContestStandings(contestId, undefined, 1, 5);
            
            // Codeforces API returns { problems: [...], rows: [...] }
            if (standings && standings.problems && Array.isArray(standings.problems) && standings.problems.length > 0) {
                const problems = standings.problems;
                const mappedProblems = problems.map((p: any) => ({
                    index: p.index || p.letter || '',
                    name: p.name || `Problem ${p.index || p.letter || ''}`
                })).filter((p: any) => p.index); // Filter out any without index
                
                if (mappedProblems.length > 0) {
                    return mappedProblems;
                }
            }
            
            console.warn('Contest standings API returned no problems. Response:', JSON.stringify(standings).substring(0, 200));
        } catch (error: any) {
            const errorMessage = error?.message || String(error);
            console.warn(`Contest ${contestId} problems from API (using fallback): ${errorMessage}`);
        }
        
        // Fallback: return common problem indices
        return [
            { index: 'A', name: 'Problem A' },
            { index: 'B', name: 'Problem B' },
            { index: 'C', name: 'Problem C' },
            { index: 'D', name: 'Problem D' },
            { index: 'E', name: 'Problem E' },
            { index: 'F', name: 'Problem F' }
        ];
    }

    private async setupProblem(contestId: number, problemIndex: string, problemDir: string, progress: vscode.Progress<{ message?: string; increment?: number }>): Promise<void> {
        progress.report({ increment: 30, message: 'Fetching problem statement...' });

        // Fetch problem statement
        try {
            await this.fetchProblemStatement(contestId, problemIndex, problemDir);
        } catch (error: any) {
            console.log('Failed to fetch problem statement:', error?.message || error);
        }

        progress.report({ increment: 50, message: 'Fetching test cases...' });

        // Try to fetch test cases using cf CLI tool first
        let testCasesFetched = false;
        try {
            testCasesFetched = await this.fetchTestCasesWithCF(contestId, problemIndex, problemDir);
        } catch (error: any) {
            console.log('CF CLI tool failed:', error?.message || error);
        }

        // If CF tool failed, try web scraping
        if (!testCasesFetched) {
            try {
                await this.fetchTestCasesFromWeb(contestId, problemIndex, problemDir);
                testCasesFetched = true;
            } catch (error: any) {
                console.log('Web scraping failed:', error?.message || error);
                // Create placeholder files
                await this.createPlaceholderFiles(problemDir, contestId, problemIndex);
            }
        }

        progress.report({ increment: 80, message: 'Creating template files...' });

        // Create main.cpp if it doesn't exist
        const mainCppPath = path.join(problemDir, 'main.cpp');
        if (!fs.existsSync(mainCppPath)) {
            await this.createMainCpp(mainCppPath);
        }

        progress.report({ increment: 100, message: 'Done!' });

        // Check if problem is solved
        let isSolved = false;
        try {
            isSolved = await this.solvedTracker.isProblemSolved(contestId, problemIndex);
        } catch (error) {
            // Silently fail if solved check fails (e.g., username not set)
            console.log('Could not check solved status:', error);
        }

        // Open the main.cpp file
        const uri = vscode.Uri.file(mainCppPath);
        await vscode.window.showTextDocument(uri);

        const solvedBadge = isSolved ? ' ✓ Solved' : '';
        vscode.window.showInformationMessage(
            `Contest ${contestId} problem ${problemIndex} setup complete!${solvedBadge}`,
            'Run Tests'
        ).then(selection => {
            if (selection === 'Run Tests') {
                vscode.commands.executeCommand('codeforces.runTests');
            }
        });
    }
}
