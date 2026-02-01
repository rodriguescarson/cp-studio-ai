import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ContestSetup } from './contestSetup';
import { TestRunner } from './testRunner';
import { AIAnalyzer } from './aiAnalyzer';
import { CodeCopier } from './codeCopier';
import { ChatPanel } from './chatPanel';
import { ChatManager } from './chatManager';
import { ChatViewProvider } from './chatView';
import { ProfileViewProvider } from './profileView';
import { ContestsProvider } from './contestsProvider';
import { ProblemStatementFetcher } from './problemStatementFetcher';
import { LadderLoader } from './ladderLoader';
import { SolvedProblemsTracker } from './solvedTracker';
import { SolvedProblemsViewProvider } from './solvedProblemsView';
import { ProblemFileDecorationProvider } from './fileDecorationProvider';
import { registerViewForCollapse } from './viewManager';

let contestSetup: ContestSetup;
let testRunner: TestRunner;
let aiAnalyzer: AIAnalyzer;
let codeCopier: CodeCopier;
let chatViewProvider: ChatViewProvider;
let profileViewProvider: ProfileViewProvider;
let contestsProvider: ContestsProvider;
let extensionContext: vscode.ExtensionContext;
let ladderLoader: LadderLoader;
let solvedTracker: SolvedProblemsTracker;
let solvedProblemsViewProvider: SolvedProblemsViewProvider;
let fileDecorationProvider: ProblemFileDecorationProvider;


export function activate(context: vscode.ExtensionContext) {
    console.log('CP Studio extension is now active!');
    extensionContext = context;

    try {
        // Initialize components
        contestSetup = new ContestSetup(context);
        testRunner = new TestRunner(context);
        aiAnalyzer = new AIAnalyzer(context);
        codeCopier = new CodeCopier(context);

        // Initialize chat manager
        ChatManager.getInstance(context);

        // Initialize chat view provider (merged chat list and chat interface)
        chatViewProvider = new ChatViewProvider(context);
        const chatProviderRegistration = vscode.window.registerWebviewViewProvider(
            ChatViewProvider.viewType, 
            chatViewProvider,
            {
                webviewOptions: {
                    retainContextWhenHidden: true
                }
            }
        );
        context.subscriptions.push(chatProviderRegistration);

        // Initialize profile view provider (merged profile and profile stats)
        profileViewProvider = new ProfileViewProvider(context);
        const profileProviderRegistration = vscode.window.registerWebviewViewProvider(
            ProfileViewProvider.viewType,
            profileViewProvider,
            {
                webviewOptions: {
                    retainContextWhenHidden: true
                }
            }
        );
        context.subscriptions.push(profileProviderRegistration);

        // Initialize ladder loader and solved tracker
        ladderLoader = new LadderLoader(context);
        solvedTracker = new SolvedProblemsTracker(context);

        // Initialize contests provider (with solved tracker)
        contestsProvider = new ContestsProvider(context);
        contestsProvider.setSolvedTracker(solvedTracker);
        const contestsProviderRegistration = vscode.window.registerTreeDataProvider('cfStudioContests', contestsProvider);
        context.subscriptions.push(contestsProviderRegistration);

        // Initialize solved problems view provider
        solvedProblemsViewProvider = new SolvedProblemsViewProvider(context);
        const solvedProblemsProviderRegistration = vscode.window.registerWebviewViewProvider(
            SolvedProblemsViewProvider.viewType,
            solvedProblemsViewProvider,
            {
                webviewOptions: {
                    retainContextWhenHidden: true
                }
            }
        );
        context.subscriptions.push(solvedProblemsProviderRegistration);

        // Initialize file decoration provider for solved problems
        fileDecorationProvider = new ProblemFileDecorationProvider(solvedTracker);
        const fileDecorationProviderRegistration = vscode.window.registerFileDecorationProvider(fileDecorationProvider);
        context.subscriptions.push(fileDecorationProviderRegistration);

        // Initialize view manager context variables
        // Set initial context - all views start as not explicitly visible
        // The first view that becomes visible will be tracked
        await vscode.commands.executeCommand('setContext', 'cfStudio.contests.visible', false);
        await vscode.commands.executeCommand('setContext', 'cfStudio.chat.visible', false);
        await vscode.commands.executeCommand('setContext', 'cfStudio.profile.visible', false);
        await vscode.commands.executeCommand('setContext', 'cfStudio.solved.visible', false);

        // Update chat view when active editor changes
        // Note: File change handler is registered below after chatViewProvider is created
    } catch (error: any) {
        console.error('Error initializing extension:', error);
        vscode.window.showErrorMessage(`Extension initialization failed: ${error?.message || error}`);
        return;
    }

    // Register commands
    const setupCommand = vscode.commands.registerCommand('codeforces.setupFromUrl', async () => {
        try {
            const url = await vscode.window.showInputBox({
                prompt: 'Paste Codeforces contest/problem URL',
                placeHolder: 'https://codeforces.com/contest/2112/problem/A',
                validateInput: (value) => {
                    if (!value || !value.includes('codeforces.com')) {
                        return 'Please enter a valid Codeforces URL';
                    }
                    return null;
                }
            });

            if (url) {
                await contestSetup.setupFromUrl(url);
                contestsProvider.refresh();
            }
        } catch (error: any) {
            const errorMessage = error?.message || String(error);
            console.error('Setup command error:', error);
            vscode.window.showErrorMessage(`Setup failed: ${errorMessage}`);
            
            // Show output channel for detailed error
            const outputChannel = vscode.window.createOutputChannel('CP Studio');
            outputChannel.appendLine(`Error in setupFromUrl: ${errorMessage}`);
            outputChannel.appendLine(`Stack: ${error?.stack || 'No stack trace'}`);
            outputChannel.show();
        }
    });

    const runTestsCommand = vscode.commands.registerCommand('codeforces.runTests', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        const filePath = editor.document.uri.fsPath;
        if (!filePath.includes('contests') || !filePath.endsWith('main.cpp')) {
            vscode.window.showErrorMessage('Please open a main.cpp file in a contest directory');
            return;
        }

        await testRunner.runTests(filePath);
    });

    const aiAnalysisCommand = vscode.commands.registerCommand('codeforces.aiAnalysis', async () => {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active editor');
                return;
            }

            const filePath = editor.document.uri.fsPath;
            if (!filePath.includes('contests') || !filePath.endsWith('main.cpp')) {
                vscode.window.showErrorMessage('Please open a main.cpp file in a contest directory');
                return;
            }

            if (chatViewProvider) {
                await chatViewProvider.show(filePath);
                await chatViewProvider.runAnalysis();
            } else {
                vscode.window.showErrorMessage('Chat view provider not initialized');
            }
        } catch (error: any) {
            console.error('Error in aiAnalysis command:', error);
            vscode.window.showErrorMessage(`Failed to open chat: ${error.message || error}`);
        }
    });

    const openChatCommand = vscode.commands.registerCommand('codeforces.openChat', async () => {
        try {
            const editor = vscode.window.activeTextEditor;
            const filePath = editor?.document.uri.fsPath;
            // Show sidebar chat view
            if (chatViewProvider) {
                await chatViewProvider.show(filePath);
            } else {
                vscode.window.showErrorMessage('Chat view provider not initialized');
            }
        } catch (error: any) {
            console.error('Error in openChat command:', error);
            vscode.window.showErrorMessage(`Failed to open chat: ${error.message || error}`);
        }
    });

    const newChatCommand = vscode.commands.registerCommand('codeforces.newChat', async () => {
        const editor = vscode.window.activeTextEditor;
        const filePath = editor?.document.uri.fsPath;
        const chatManager = ChatManager.getInstance(context);
        const newSession = chatManager.createNewSession(filePath);
        // Show sidebar chat view with new session
        await chatViewProvider.show(newSession.filePath);
    });

    const insertCodeCommand = vscode.commands.registerCommand('codeforces.insertCode', async (code: string, mode: 'replace' | 'insert' | 'replace-selection') => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor');
            return;
        }

        const edit = new vscode.WorkspaceEdit();
        if (mode === 'replace') {
            const range = new vscode.Range(
                editor.document.positionAt(0),
                editor.document.positionAt(editor.document.getText().length)
            );
            edit.replace(editor.document.uri, range, code);
        } else if (mode === 'insert') {
            edit.insert(editor.document.uri, editor.selection.active, code);
        } else if (mode === 'replace-selection') {
            if (editor.selection.isEmpty) {
                vscode.window.showWarningMessage('No text selected');
                return;
            }
            edit.replace(editor.document.uri, editor.selection, code);
        }

        await vscode.workspace.applyEdit(edit);
    });


    const setupFromContestCommand = vscode.commands.registerCommand('codeforces.setupFromContest', async (contestId: number) => {
        try {
            if (!contestId) {
                vscode.window.showErrorMessage('No contest ID provided');
                return;
            }
            await contestSetup.setupFromContestId(contestId);
            contestsProvider.refresh();
        } catch (error: any) {
            const errorMessage = error?.message || String(error);
            vscode.window.showErrorMessage(`Setup contest failed: ${errorMessage}`);
            console.error('Setup contest error:', error);
        }
    });

    const setupProfileCommand = vscode.commands.registerCommand('codeforces.setupProfile', async () => {
        const username = await vscode.window.showInputBox({
            prompt: 'Enter your Codeforces username',
            placeHolder: 'your_handle',
            validateInput: (value) => {
                if (!value || value.trim() === '') {
                    return 'Username cannot be empty';
                }
                return null;
            }
        });

        if (username) {
            // Store in VS Code settings (allows dynamic changes without editing .env)
            const config = vscode.workspace.getConfiguration('codeforces');
            await config.update('username', username.trim(), vscode.ConfigurationTarget.Global);
            
            vscode.window.showInformationMessage(`Username set to: ${username.trim()}`);
            profileViewProvider.refresh();
        }
    });

    const refreshContestsCommand = vscode.commands.registerCommand('codeforces.refreshContests', () => {
        contestsProvider.refresh();
    });

    const refreshProfileCommand = vscode.commands.registerCommand('codeforces.refreshProfile', () => {
        profileViewProvider.refresh();
    });

    const clearChatCommand = vscode.commands.registerCommand('codeforces.clearChat', () => {
        chatViewProvider.clearCurrentChat();
    });

    const showChatHistoryCommand = vscode.commands.registerCommand('codeforces.showChatHistory', () => {
        chatViewProvider.showHistory();
    });

    const copyCodeCommand = vscode.commands.registerCommand('codeforces.copyCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        await codeCopier.copyToClipboard(editor);
    });

    const configureApiKeyCommand = vscode.commands.registerCommand('codeforces.configureApiKey', async () => {
        const config = vscode.workspace.getConfiguration('codeforces');
        const currentKey = config.get<string>('aiApiKey', '');
        
        const apiKey = await vscode.window.showInputBox({
            prompt: 'Enter your OpenRouter API key',
            placeHolder: 'sk-or-v1-...',
            value: currentKey || '',
            password: true,
            ignoreFocusOut: true,
            validateInput: (value) => {
                if (!value || value.trim() === '') {
                    return 'API key cannot be empty';
                }
                return null;
            }
        });

        if (apiKey !== undefined) {
            await config.update('aiApiKey', apiKey.trim(), vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage('API key configured successfully!');
        }
    });

    // Helper function to show problem selection and handle setup/browsing
    async function showProblemSelection(ladders: Array<{ name: string; codeforcesCount: number; totalCount: number; source: 'a2oj' | 'neetcode' | 'lovebabbar' | 'strivers' }>, sourceFilter?: 'a2oj' | 'neetcode' | 'lovebabbar' | 'strivers'): Promise<void> {
        // Filter by source if specified
        const filteredLadders = sourceFilter 
            ? ladders.filter(l => l.source === sourceFilter)
            : ladders;

        if (filteredLadders.length === 0) {
            vscode.window.showErrorMessage(`No ${sourceFilter || 'ladders or problem sets'} found`);
            return;
        }

        // Show quick pick to select ladder
        const items = filteredLadders.map(ladder => {
            let description = '';
            let detail = '';
            
            if (ladder.source === 'neetcode') {
                description = `${ladder.totalCount} LeetCode problems`;
                detail = 'NeetCode 150 - LeetCode problems';
            } else if (ladder.source === 'lovebabbar') {
                description = `${ladder.totalCount} problems`;
                detail = 'Love Babbar 450 DSA Sheet - GeeksforGeeks & LeetCode';
            } else if (ladder.source === 'strivers') {
                description = `${ladder.totalCount} problems`;
                detail = "Striver's Sheet - LeetCode problems";
            } else {
                // A2OJ ladders
                description = `${ladder.codeforcesCount} Codeforces problems`;
                detail = ladder.totalCount > ladder.codeforcesCount 
                    ? `Total: ${ladder.totalCount} problems (${ladder.totalCount - ladder.codeforcesCount} non-Codeforces)`
                    : 'A2OJ Ladder - Codeforces problems';
            }
            
            return {
                label: ladder.name.replace('.html', ''),
                description: description,
                detail: detail,
                ladderName: ladder.name,
                source: ladder.source
            };
        });

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: `Select from ${sourceFilter || 'available options'}`,
            matchOnDescription: true
        });

        if (!selected) {
            return; // User cancelled
        }

        // Get problems from selected ladder
        const problems = await ladderLoader.getLadderProblems(selected.ladderName);
        
        if (problems.length === 0) {
            vscode.window.showWarningMessage(`No problems found in ${selected.label}`);
            return;
        }

        // Show problem selection for all platforms (unified experience)
        const problemItems = problems.map(p => {
            let label = p.name || p.url;
            let description = '';
            
            if (p.source === 'codeforces' && p.contestId && p.problemIndex) {
                description = `Codeforces ${p.contestId}${p.problemIndex}`;
            } else if (p.source === 'leetcode') {
                description = p.difficulty ? `${p.difficulty} • ${p.pattern || ''}` : 'LeetCode';
            } else if (p.source === 'geeksforgeeks') {
                description = p.difficulty ? `${p.difficulty}` : 'GeeksforGeeks';
            }
            
            return {
                label: label,
                description: description,
                detail: p.url,
                url: p.url,
                source: p.source
            };
        });

        const chosen = await vscode.window.showQuickPick(problemItems, {
            placeHolder: `Select a problem from ${selected.label} (${problems.length} problems)`,
            canPickMany: false
        });

        if (!chosen) {
            return; // User cancelled
        }

        // Use unified setup for all platforms
        try {
            await contestSetup.setupFromUrl(chosen.url);
        } catch (error: any) {
            const errorMessage = error?.message || String(error);
            vscode.window.showErrorMessage(`Failed to setup problem: ${errorMessage}`);
            console.error('Problem setup error:', error);
        }
    }

    const pullLadderCommand = vscode.commands.registerCommand('codeforces.pullLadder', async () => {
        try {
            const ladders = await ladderLoader.getAvailableLadders();
            await showProblemSelection(ladders);
        } catch (error: any) {
            const errorMessage = error?.message || String(error);
            console.error('Pull ladder error:', error);
            vscode.window.showErrorMessage(`Failed to pull ladder: ${errorMessage}`);
        }
    });

    const pullA2OJLadderCommand = vscode.commands.registerCommand('codeforces.pullA2OJLadder', async () => {
        try {
            const ladders = await ladderLoader.getAvailableLadders();
            await showProblemSelection(ladders, 'a2oj');
        } catch (error: any) {
            const errorMessage = error?.message || String(error);
            console.error('Pull A2OJ ladder error:', error);
            vscode.window.showErrorMessage(`Failed to pull A2OJ ladder: ${errorMessage}`);
        }
    });

    const pullNeetCodeCommand = vscode.commands.registerCommand('codeforces.pullNeetCode', async () => {
        try {
            const ladders = await ladderLoader.getAvailableLadders();
            await showProblemSelection(ladders, 'neetcode');
        } catch (error: any) {
            const errorMessage = error?.message || String(error);
            console.error('Pull NeetCode error:', error);
            vscode.window.showErrorMessage(`Failed to pull NeetCode problems: ${errorMessage}`);
        }
    });

    const pullLoveBabbarCommand = vscode.commands.registerCommand('codeforces.pullLoveBabbar', async () => {
        try {
            const ladders = await ladderLoader.getAvailableLadders();
            await showProblemSelection(ladders, 'lovebabbar');
        } catch (error: any) {
            const errorMessage = error?.message || String(error);
            console.error('Pull Love Babbar error:', error);
            vscode.window.showErrorMessage(`Failed to pull Love Babbar problems: ${errorMessage}`);
        }
    });

    const pullStriversCommand = vscode.commands.registerCommand('codeforces.pullStrivers', async () => {
        try {
            const ladders = await ladderLoader.getAvailableLadders();
            await showProblemSelection(ladders, 'strivers');
        } catch (error: any) {
            const errorMessage = error?.message || String(error);
            console.error('Pull Striver\'s error:', error);
            vscode.window.showErrorMessage(`Failed to pull Striver's problems: ${errorMessage}`);
        }
    });

    const refreshSolvedProblemsCommand = vscode.commands.registerCommand('codeforces.refreshSolvedProblems', async () => {
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Refreshing solved problems...',
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: 'Fetching submissions from Codeforces...' });
                const solved = await solvedTracker.refreshSolvedProblems();
                progress.report({ increment: 100, message: 'Done!' });
                
                // Refresh the view if it exists
                if (solvedProblemsViewProvider) {
                    solvedProblemsViewProvider.refresh();
                }
                
                // Refresh file decorations
                if (fileDecorationProvider) {
                    await fileDecorationProvider.refreshSolvedProblems();
                }
                
                vscode.window.showInformationMessage(
                    `Refreshed solved problems: ${solved.size} problems solved`
                );
            });
        } catch (error: any) {
            const errorMessage = error?.message || String(error);
            vscode.window.showErrorMessage(`Failed to refresh solved problems: ${errorMessage}`);
        }
    });

    const showSolvedProblemsCommand = vscode.commands.registerCommand('codeforces.showSolvedProblems', async () => {
        // Show the solved problems view
        await vscode.commands.executeCommand('cfStudioSolvedProblemsView.focus');
    });

    context.subscriptions.push(
        setupCommand, 
        runTestsCommand, 
        aiAnalysisCommand, 
        copyCodeCommand,
        openChatCommand,
        newChatCommand,
        insertCodeCommand,
        configureApiKeyCommand,
        setupFromContestCommand,
        setupProfileCommand,
        refreshContestsCommand,
        refreshProfileCommand,
        clearChatCommand,
        showChatHistoryCommand,
        pullLadderCommand,
        pullA2OJLadderCommand,
        pullNeetCodeCommand,
        pullLoveBabbarCommand,
        pullStriversCommand,
        refreshSolvedProblemsCommand,
        showSolvedProblemsCommand
    );

    // Update chat view when active editor changes
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(async (editor) => {
            if (editor && chatViewProvider && !editor.document.isClosed) {
                const filePath = editor.document.uri.fsPath;
                console.log(`[Extension] Active editor changed: ${filePath}`);
                // Always update for any file, not just contest files
                await chatViewProvider.show(filePath);
            } else if (chatViewProvider) {
                // Refresh context even if no editor
                chatViewProvider.updateSession();
            }
        })
    );

    // Auto-refresh solved problems on activation if configured
    const config = vscode.workspace.getConfiguration('codeforces');
    const autoRefreshSolved = config.get<boolean>('autoRefreshSolved', true);
    if (autoRefreshSolved) {
        // Refresh in background without blocking
        solvedTracker.getSolvedProblems(false).catch(error => {
            console.log('Background solved problems refresh failed:', error);
        });
    }

    // Show welcome message
    vscode.window.showInformationMessage('CP Studio is ready! Use the command palette to get started.');
}

export function deactivate() {}
