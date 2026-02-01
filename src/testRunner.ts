import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class TestRunner {
    private context: vscode.ExtensionContext;
    private outputChannel: vscode.OutputChannel;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.outputChannel = vscode.window.createOutputChannel('cfx - codeforce studio - Tests');
    }

    async runTests(filePath: string): Promise<void> {
        const problemDir = path.dirname(filePath);
        const inputFile = path.join(problemDir, 'in.txt');
        const outputFile = path.join(problemDir, 'out.txt');
        const executable = path.join(problemDir, 'main');

        // Check if test files exist
        if (!fs.existsSync(inputFile)) {
            vscode.window.showWarningMessage('No input file (in.txt) found. Creating placeholder...');
            fs.writeFileSync(inputFile, '# Add test cases here\n');
        }

        if (!fs.existsSync(outputFile)) {
            vscode.window.showWarningMessage('No output file (out.txt) found. Creating placeholder...');
            fs.writeFileSync(outputFile, '# Add expected outputs here\n');
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Running tests...',
            cancellable: false
        }, async (progress) => {
            try {
                progress.report({ increment: 0, message: 'Compiling...' });

                // Compile
                const compileCmd = `g++ -std=c++17 -O2 -Wall -o "${executable}" "${filePath}"`;
                try {
                    await execAsync(compileCmd, { timeout: 10000 });
                } catch (error: any) {
                    throw new Error(`Compilation failed: ${error.message}`);
                }

                progress.report({ increment: 50, message: 'Running tests...' });

                // Run tests
                const runCmd = `"${executable}" < "${inputFile}"`;
                let actualOutput: string;
                try {
                    const { stdout } = await execAsync(runCmd, { timeout: 5000 });
                    actualOutput = stdout;
                } catch (error: any) {
                    throw new Error(`Runtime error: ${error.message}`);
                }

                progress.report({ increment: 80, message: 'Comparing outputs...' });

                // Read expected output
                const expectedOutput = fs.readFileSync(outputFile, 'utf-8').trim();
                const actualOutputTrimmed = actualOutput.trim();

                progress.report({ increment: 100, message: 'Done!' });

                // Compare outputs
                if (actualOutputTrimmed === expectedOutput) {
                    vscode.window.showInformationMessage('✓ All tests passed!', 'View Output').then(selection => {
                        if (selection === 'View Output') {
                            this.outputChannel.show();
                        }
                    });
                    this.outputChannel.appendLine('✓ All tests passed!');
                    this.outputChannel.appendLine('\nYour output:');
                    this.outputChannel.appendLine(actualOutputTrimmed);
                } else {
                    this.outputChannel.show();
                    this.outputChannel.clear();
                    this.outputChannel.appendLine('✗ Output mismatch');
                    this.outputChannel.appendLine('\nYour output:');
                    this.outputChannel.appendLine(actualOutputTrimmed);
                    this.outputChannel.appendLine('\nExpected output:');
                    this.outputChannel.appendLine(expectedOutput);
                    
                    vscode.window.showErrorMessage('Tests failed! Check output channel for details.');
                }

            } catch (error: any) {
                this.outputChannel.show();
                this.outputChannel.appendLine(`Error: ${error.message}`);
                vscode.window.showErrorMessage(`Test failed: ${error.message}`);
            } finally {
                // Cleanup executable
                try {
                    if (fs.existsSync(executable)) {
                        fs.unlinkSync(executable);
                    }
                } catch (error) {
                    // Ignore cleanup errors
                }
            }
        });
    }
}
