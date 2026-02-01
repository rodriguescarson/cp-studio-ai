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

const execAsync = promisify(exec);

export class ContestSetup {
    private context: vscode.ExtensionContext;
    private contestsPath: string;
    private api: CodeforcesAPI;
    private solvedTracker: SolvedProblemsTracker;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.api = new CodeforcesAPI();
        this.solvedTracker = new SolvedProblemsTracker(context);
        const config = vscode.workspace.getConfiguration('codeforces');
        this.contestsPath = config.get<string>('contestsPath', '${workspaceFolder}/contests') || '';
        
        // Resolve workspace folder variables
        if (vscode.workspace.workspaceFolders && this.contestsPath.includes('${workspaceFolder}')) {
            this.contestsPath = this.contestsPath.replace('${workspaceFolder}', vscode.workspace.workspaceFolders[0].uri.fsPath);
        } else if (!vscode.workspace.workspaceFolders) {
            // Fallback if no workspace folder
            this.contestsPath = path.join(os.homedir(), 'codeforces-contests');
        }
        
        // Ensure contests path is absolute
        if (!path.isAbsolute(this.contestsPath)) {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || os.homedir();
            this.contestsPath = path.resolve(workspaceFolder, this.contestsPath);
        }
        
        console.log(`Contests path configured: ${this.contestsPath}`);
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
            title: 'Setting up contest...',
            cancellable: false
        }, async (progress) => {
            try {
                progress.report({ increment: 0, message: 'Parsing URL...' });

                // Parse URL to extract contest ID and problem index
                const parsed = this.parseCodeforcesUrl(url);
                if (!parsed) {
                    throw new Error('Invalid Codeforces URL. Expected format: https://codeforces.com/contest/2112/problem/A or https://codeforces.com/contest/2112');
                }

                const { contestId, problemIndex } = parsed;

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

                    // Use selected problem
                    const selectedProblemIndex = selected.problemIndex;
                    progress.report({ increment: 20, message: `Setting up contest ${contestId}, problem ${selectedProblemIndex}...` });
                    
                    const problemDir = path.join(this.contestsPath, contestId.toString(), selectedProblemIndex);
                    await this.createDirectory(problemDir);
                    await this.setupProblem(contestId, selectedProblemIndex, problemDir, progress);
                } else {
                    progress.report({ increment: 20, message: `Setting up contest ${contestId}, problem ${problemIndex}...` });

                    // Create directory structure
                    const problemDir = path.join(this.contestsPath, contestId.toString(), problemIndex);
                    await this.createDirectory(problemDir);
                    await this.setupProblem(contestId, problemIndex, problemDir, progress);
                }


            } catch (error: any) {
                const errorMessage = error?.message || String(error);
                const errorStack = error?.stack || 'No stack trace';
                console.error('Setup error:', errorMessage, errorStack);
                
                vscode.window.showErrorMessage(`Setup failed: ${errorMessage}`);
                
                // Show detailed error in output
                const outputChannel = vscode.window.createOutputChannel('cfx - codeforce studio');
                outputChannel.appendLine(`Error in setupFromUrl:`);
                outputChannel.appendLine(`Message: ${errorMessage}`);
                outputChannel.appendLine(`Stack: ${errorStack}`);
                outputChannel.show();
            }
        });
    }

    private parseCodeforcesUrl(url: string): { contestId: number; problemIndex: string | null } | null {
        // Match patterns like:
        // https://codeforces.com/contest/2112/problem/A
        // https://codeforces.com/problemset/problem/2112/A
        const contestMatch = url.match(/contest\/(\d+)/);
        const problemMatch = url.match(/problem\/([A-Z])/i);

        if (contestMatch && problemMatch) {
            return {
                contestId: parseInt(contestMatch[1]),
                problemIndex: problemMatch[1].toUpperCase()
            };
        }

        // Try problemset format
        const problemsetMatch = url.match(/problemset\/problem\/(\d+)\/([A-Z])/i);
        if (problemsetMatch) {
            return {
                contestId: parseInt(problemsetMatch[1]),
                problemIndex: problemsetMatch[2].toUpperCase()
            };
        }

        // Match contest-only URL (no problem specified)
        // https://codeforces.com/contest/2112
        if (contestMatch && !problemMatch) {
            return {
                contestId: parseInt(contestMatch[1]),
                problemIndex: null  // Will prompt user or fetch all problems
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
            // Fallback: try original method
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
                    const timeLimit = header.find('.time-limit').text().trim();
                    const memoryLimit = header.find('.memory-limit').text().trim();
                    
                    if (title) problemStatement += `# ${title}\n\n`;
                    if (timeLimit) problemStatement += `**Time Limit:** ${timeLimit}\n\n`;
                    if (memoryLimit) problemStatement += `**Memory Limit:** ${memoryLimit}\n\n`;
                }
                
                problemDiv.find('> div').each((_, elem) => {
                    const $elem = $(elem);
                    const classList = $elem.attr('class') || '';
                    if (classList.includes('header')) return;
                    
                    const sectionTitle = $elem.find('.section-title').first();
                    const $contentElem = $elem.clone();
                    $contentElem.find('.section-title').remove();
                    let content = $contentElem.text().trim().replace(/\n{3,}/g, '\n\n');
                    
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

        $('div.input pre').each((_, elem) => {
            const text = $(elem).text().trim();
            if (text) {
                inputs.push(text);
            }
        });

        $('div.output pre').each((_, elem) => {
            const text = $(elem).text().trim();
            if (text) {
                outputs.push(text);
            }
        });

        if (inputs.length > 0 && outputs.length > 0) {
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
