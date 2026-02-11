import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface TestResult {
    index: number;
    passed: boolean;
    input: string;
    expected: string;
    actual: string;
    error?: string;
    timeMs?: number;
}

export class TestRunner {
    private context: vscode.ExtensionContext;
    private outputChannel: vscode.OutputChannel;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.outputChannel = vscode.window.createOutputChannel('CP Studio - Tests');
    }

    /**
     * Detect language from file extension
     */
    private detectLanguage(filePath: string): 'cpp' | 'python' | 'java' {
        if (filePath.endsWith('.py')) return 'python';
        if (filePath.endsWith('.java')) return 'java';
        return 'cpp';
    }

    /**
     * Find the main solution file in a problem directory, checking for all supported languages.
     */
    static findSolutionFile(problemDir: string): string | null {
        const candidates = ['main.cpp', 'main.py', 'Main.java'];
        for (const c of candidates) {
            const p = path.join(problemDir, c);
            if (fs.existsSync(p)) return p;
        }
        return null;
    }

    /**
     * Discover all test cases in a problem directory.
     * Supports: in.txt/out.txt (legacy single), in1.txt/out1.txt, in2.txt/out2.txt, etc.
     */
    private discoverTestCases(problemDir: string): Array<{ input: string; output: string; index: number }> {
        const cases: Array<{ input: string; output: string; index: number }> = [];

        // Check for numbered test cases first: in1.txt/out1.txt, in2.txt/out2.txt, ...
        for (let i = 1; i <= 100; i++) {
            const inFile = path.join(problemDir, `in${i}.txt`);
            const outFile = path.join(problemDir, `out${i}.txt`);
            if (fs.existsSync(inFile) && fs.existsSync(outFile)) {
                cases.push({
                    input: fs.readFileSync(inFile, 'utf-8'),
                    output: fs.readFileSync(outFile, 'utf-8').trim(),
                    index: i
                });
            } else {
                break;
            }
        }

        // If no numbered cases, fall back to in.txt/out.txt
        if (cases.length === 0) {
            const inFile = path.join(problemDir, 'in.txt');
            const outFile = path.join(problemDir, 'out.txt');
            if (fs.existsSync(inFile) && fs.existsSync(outFile)) {
                cases.push({
                    input: fs.readFileSync(inFile, 'utf-8'),
                    output: fs.readFileSync(outFile, 'utf-8').trim(),
                    index: 1
                });
            }
        }

        return cases;
    }

    async runTests(filePath: string): Promise<void> {
        const problemDir = path.dirname(filePath);
        const language = this.detectLanguage(filePath);
        const testCases = this.discoverTestCases(problemDir);

        if (testCases.length === 0) {
            // Create placeholder files
            const inFile = path.join(problemDir, 'in1.txt');
            const outFile = path.join(problemDir, 'out1.txt');
            fs.writeFileSync(inFile, '');
            fs.writeFileSync(outFile, '');
            vscode.window.showWarningMessage('No test cases found. Created in1.txt/out1.txt — add your test cases there.');
            return;
        }

        // Save file before running
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.uri.fsPath === filePath && editor.document.isDirty) {
            await editor.document.save();
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Running tests...',
            cancellable: true
        }, async (progress, token) => {
            const results: TestResult[] = [];

            try {
                // Compile (if needed)
                progress.report({ increment: 0, message: `Compiling (${language})...` });
                const executable = await this.compile(filePath, problemDir, language);

                if (token.isCancellationRequested) return;

                // Run each test case
                const totalTests = testCases.length;
                for (let i = 0; i < totalTests; i++) {
                    if (token.isCancellationRequested) return;

                    const tc = testCases[i];
                    const pct = Math.round(((i + 1) / totalTests) * 80) + 10;
                    progress.report({ increment: 0, message: `Test ${i + 1}/${totalTests}...` });

                    try {
                        const startTime = Date.now();
                        const actual = await this.executeTest(executable, tc.input, problemDir, language);
                        const timeMs = Date.now() - startTime;

                        results.push({
                            index: tc.index,
                            passed: actual.trim() === tc.output,
                            input: tc.input,
                            expected: tc.output,
                            actual: actual.trim(),
                            timeMs
                        });
                    } catch (error: any) {
                        results.push({
                            index: tc.index,
                            passed: false,
                            input: tc.input,
                            expected: tc.output,
                            actual: '',
                            error: error.message
                        });
                    }
                }

                progress.report({ increment: 100, message: 'Done!' });

                // Display results
                this.displayResults(results, language);

                // Cleanup executable
                this.cleanup(problemDir, language);
            } catch (error: any) {
                this.outputChannel.show();
                this.outputChannel.appendLine(`Error: ${error.message}`);
                vscode.window.showErrorMessage(`Test failed: ${error.message}`);
            }
        });
    }

    private async compile(filePath: string, problemDir: string, language: 'cpp' | 'python' | 'java'): Promise<string> {
        if (language === 'python') {
            return filePath; // No compilation needed
        }

        if (language === 'java') {
            const compileCmd = `javac "${filePath}"`;
            try {
                await execAsync(compileCmd, { timeout: 15000, cwd: problemDir });
            } catch (error: any) {
                throw new Error(`Java compilation failed:\n${error.stderr || error.message}`);
            }
            return path.join(problemDir, 'Main'); // class name
        }

        // C++
        const executable = path.join(problemDir, 'main');
        const compileCmd = `g++ -std=c++17 -O2 -Wall -o "${executable}" "${filePath}"`;
        try {
            await execAsync(compileCmd, { timeout: 15000 });
        } catch (error: any) {
            throw new Error(`C++ compilation failed:\n${error.stderr || error.message}`);
        }
        return executable;
    }

    private executeTest(executable: string, input: string, problemDir: string, language: 'cpp' | 'python' | 'java'): Promise<string> {
        return new Promise((resolve, reject) => {
            let runCmd: string;

            if (language === 'python') {
                runCmd = `python3 "${executable}"`;
            } else if (language === 'java') {
                runCmd = `java -cp "${problemDir}" Main`;
            } else {
                runCmd = `"${executable}"`;
            }

            const { exec: execRaw } = require('child_process');
            const child = execRaw(runCmd, {
                timeout: 10000,
                cwd: problemDir,
            }, (error: any, stdout: string, stderr: string) => {
                if (error) {
                    if (error.killed) {
                        reject(new Error('Time Limit Exceeded (10s)'));
                    } else {
                        reject(new Error(`Runtime error:\n${stderr || error.message}`));
                    }
                    return;
                }
                resolve(stdout);
            });

            // Write input to stdin
            if (child.stdin) {
                child.stdin.write(input);
                child.stdin.end();
            }
        });
    }

    private displayResults(results: TestResult[], language: string): void {
        const passed = results.filter(r => r.passed).length;
        const total = results.length;
        const allPassed = passed === total;

        this.outputChannel.clear();
        this.outputChannel.appendLine(`CP Studio Test Results (${language.toUpperCase()})`);
        this.outputChannel.appendLine('='.repeat(50));
        this.outputChannel.appendLine(`\nResult: ${passed}/${total} tests passed\n`);

        for (const r of results) {
            const status = r.passed ? '✓ PASS' : '✗ FAIL';
            const timeStr = r.timeMs !== undefined ? ` (${r.timeMs}ms)` : '';
            this.outputChannel.appendLine(`--- Test Case ${r.index} ${status}${timeStr} ---`);

            if (!r.passed) {
                if (r.error) {
                    this.outputChannel.appendLine(`Error: ${r.error}`);
                } else {
                    this.outputChannel.appendLine(`Input:\n${r.input}`);
                    this.outputChannel.appendLine(`Expected:\n${r.expected}`);
                    this.outputChannel.appendLine(`Got:\n${r.actual}`);

                    // Show line-by-line diff
                    const expectedLines = r.expected.split('\n');
                    const actualLines = r.actual.split('\n');
                    const maxLines = Math.max(expectedLines.length, actualLines.length);
                    
                    this.outputChannel.appendLine(`\nDiff:`);
                    for (let i = 0; i < maxLines; i++) {
                        const exp = expectedLines[i] || '<missing>';
                        const act = actualLines[i] || '<missing>';
                        if (exp !== act) {
                            this.outputChannel.appendLine(`  Line ${i + 1}: expected "${exp}" | got "${act}"`);
                        }
                    }
                }
                this.outputChannel.appendLine('');
            }
        }

        if (allPassed) {
            const totalTime = results.reduce((sum, r) => sum + (r.timeMs || 0), 0);
            vscode.window.showInformationMessage(
                `✓ All ${total} tests passed! (${totalTime}ms total)`,
                'View Output'
            ).then(selection => {
                if (selection === 'View Output') {
                    this.outputChannel.show();
                }
            });
        } else {
            this.outputChannel.show();
            
            // Show diff view for first failing test
            const firstFail = results.find(r => !r.passed && !r.error);
            if (firstFail) {
                this.showDiffView(firstFail);
            }

            vscode.window.showErrorMessage(
                `✗ ${total - passed}/${total} tests failed. Check output for details.`,
                'View Output'
            ).then(selection => {
                if (selection === 'View Output') {
                    this.outputChannel.show();
                }
            });
        }
    }

    /**
     * Show a side-by-side diff view for a failing test case.
     */
    private async showDiffView(result: TestResult): Promise<void> {
        try {
            // Create temporary files for diff
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) return;

            const tmpDir = path.join(workspaceFolder.uri.fsPath, '.cpstudio-tmp');
            if (!fs.existsSync(tmpDir)) {
                fs.mkdirSync(tmpDir, { recursive: true });
            }

            const expectedFile = path.join(tmpDir, `expected-test${result.index}.txt`);
            const actualFile = path.join(tmpDir, `actual-test${result.index}.txt`);

            fs.writeFileSync(expectedFile, result.expected);
            fs.writeFileSync(actualFile, result.actual);

            // Open VS Code diff view
            const expectedUri = vscode.Uri.file(expectedFile);
            const actualUri = vscode.Uri.file(actualFile);
            
            await vscode.commands.executeCommand('vscode.diff',
                expectedUri,
                actualUri,
                `Test ${result.index}: Expected vs Actual`
            );
        } catch (error) {
            // Silently fail - output channel already shows the diff
            console.log('Could not open diff view:', error);
        }
    }

    /**
     * Add a new test case to the current problem directory.
     */
    static async addTestCase(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor');
            return;
        }

        const problemDir = path.dirname(editor.document.uri.fsPath);

        // Find next available index
        let nextIndex = 1;
        while (fs.existsSync(path.join(problemDir, `in${nextIndex}.txt`))) {
            nextIndex++;
        }

        // If we're adding the first numbered test case and in.txt exists, migrate it
        if (nextIndex === 1 && fs.existsSync(path.join(problemDir, 'in.txt'))) {
            const existingIn = fs.readFileSync(path.join(problemDir, 'in.txt'), 'utf-8');
            const existingOut = fs.existsSync(path.join(problemDir, 'out.txt'))
                ? fs.readFileSync(path.join(problemDir, 'out.txt'), 'utf-8')
                : '';
            
            fs.writeFileSync(path.join(problemDir, 'in1.txt'), existingIn);
            fs.writeFileSync(path.join(problemDir, 'out1.txt'), existingOut);
            nextIndex = 2;
        }

        const inFile = path.join(problemDir, `in${nextIndex}.txt`);
        const outFile = path.join(problemDir, `out${nextIndex}.txt`);

        fs.writeFileSync(inFile, '');
        fs.writeFileSync(outFile, '');

        // Open the input file for the user to fill in
        const doc = await vscode.workspace.openTextDocument(inFile);
        await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);

        vscode.window.showInformationMessage(
            `Test case ${nextIndex} created. Edit in${nextIndex}.txt and out${nextIndex}.txt`,
            'Open Output File'
        ).then(async selection => {
            if (selection === 'Open Output File') {
                const outDoc = await vscode.workspace.openTextDocument(outFile);
                await vscode.window.showTextDocument(outDoc, vscode.ViewColumn.Beside);
            }
        });
    }

    private cleanup(problemDir: string, language: 'cpp' | 'python' | 'java'): void {
        try {
            if (language === 'cpp') {
                const executable = path.join(problemDir, 'main');
                if (fs.existsSync(executable)) fs.unlinkSync(executable);
            } else if (language === 'java') {
                const classFile = path.join(problemDir, 'Main.class');
                if (fs.existsSync(classFile)) fs.unlinkSync(classFile);
            }
            // Cleanup temp diff files
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (workspaceFolder) {
                const tmpDir = path.join(workspaceFolder.uri.fsPath, '.cpstudio-tmp');
                if (fs.existsSync(tmpDir)) {
                    fs.rmSync(tmpDir, { recursive: true, force: true });
                }
            }
        } catch {
            // Ignore cleanup errors
        }
    }
}
