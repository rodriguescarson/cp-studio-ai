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
import { StatusBarManager } from './statusBar';
import { StreakTracker } from './streakTracker';
import { AchievementManager } from './achievements';
import { ProblemViewerPanel } from './problemViewer';
import { QuickActionsViewProvider } from './quickActionsView';

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
let statusBarManager: StatusBarManager;
let streakTracker: StreakTracker;
let achievementManager: AchievementManager;


export async function activate(context: vscode.ExtensionContext) {
    console.log('CP Studio extension is now active!');
    extensionContext = context;

    // Check if this is the first activation after installation
    const isFirstActivation = context.globalState.get<boolean>('cfStudio.firstActivation', true);

    try {
        // Initialize components
        contestSetup = new ContestSetup(context);
        testRunner = new TestRunner(context);
        aiAnalyzer = new AIAnalyzer(context);
        codeCopier = new CodeCopier(context);
        streakTracker = new StreakTracker(context);
        achievementManager = new AchievementManager(context);

        // Initialize status bar
        statusBarManager = new StatusBarManager(context);

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

        // Initialize quick actions view
        const quickActionsProvider = new QuickActionsViewProvider(context);
        const quickActionsRegistration = vscode.window.registerWebviewViewProvider(
            QuickActionsViewProvider.viewType,
            quickActionsProvider,
            {
                webviewOptions: {
                    retainContextWhenHidden: true
                }
            }
        );
        context.subscriptions.push(quickActionsRegistration);

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
        await vscode.commands.executeCommand('setContext', 'cfStudio.quickActions.visible', false);
        await vscode.commands.executeCommand('setContext', 'cfStudio.solved.visible', false);

        // Auto-detect g++ availability
        detectCompiler();
    } catch (error: any) {
        console.error('Error initializing extension:', error);
        vscode.window.showErrorMessage(`Extension initialization failed: ${error?.message || error}`);
        return;
    }

    // Register commands
    const setupCommand = vscode.commands.registerCommand('codeforces.setupFromUrl', async (urlArg?: string) => {
        try {
            const url = urlArg || await vscode.window.showInputBox({
                prompt: 'Paste problem URL (Codeforces, LeetCode, or GeeksforGeeks)',
                placeHolder: 'https://codeforces.com/contest/2112/problem/A',
                validateInput: (value) => {
                    if (!value) {
                        return 'Please enter a URL';
                    }
                    const isValid = value.includes('codeforces.com') ||
                                    value.includes('leetcode.com') ||
                                    value.includes('geeksforgeeks.org');
                    if (!isValid) {
                        return 'Please enter a valid Codeforces, LeetCode, or GeeksforGeeks URL';
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
        const isContestFile = /\/(contests|leetcode|geeksforgeeks)\//.test(filePath) &&
            /\/(main\.cpp|main\.py|Main\.java)$/.test(filePath);

        if (!isContestFile) {
            vscode.window.showErrorMessage('Please open a solution file (main.cpp, main.py, or Main.java) in a contest directory');
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

            // Track AI usage for achievements
            await achievementManager.recordAiUse();

            if (chatViewProvider) {
                const filePath = editor.document.uri.fsPath;
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
            statusBarManager.updateRating();
        }
    });

    const refreshContestsCommand = vscode.commands.registerCommand('codeforces.refreshContests', () => {
        contestsProvider.refresh();
    });

    const refreshProfileCommand = vscode.commands.registerCommand('codeforces.refreshProfile', () => {
        profileViewProvider.refresh();
        statusBarManager.updateRating();
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

    // Add test case command
    const addTestCaseCommand = vscode.commands.registerCommand('codeforces.addTestCase', async () => {
        await TestRunner.addTestCase();
    });

    // Show problem statement command
    const showProblemStatementCommand = vscode.commands.registerCommand('codeforces.showProblemStatement', () => {
        ProblemViewerPanel.showForActiveEditor();
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

                // Check achievements
                await achievementManager.checkAchievements({ solved: solved.size });
                
                // Record streak activity
                const milestoneResult = await streakTracker.recordSolve();
                if (milestoneResult?.milestone) {
                    vscode.window.showInformationMessage(
                        `🔥 ${milestoneResult.message}`
                    );
                }
                statusBarManager.updateStreak();

                // Check streak achievement
                await achievementManager.checkAchievements({
                    solved: solved.size,
                    streak: streakTracker.getCount()
                });
                
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
        showSolvedProblemsCommand,
        addTestCaseCommand,
        showProblemStatementCommand
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

    // Handle first activation - show walkthrough
    if (isFirstActivation) {
        // Mark that we've activated at least once
        await context.globalState.update('cfStudio.firstActivation', false);
        
        // Open the getting started walkthrough
        setTimeout(async () => {
            try {
                await vscode.commands.executeCommand(
                    'workbench.action.openWalkthrough',
                    'rodriguescarson.cp-studio-ai#cpStudioGettingStarted',
                    false
                );
            } catch {
                // Fallback if walkthrough command fails
                try {
                    if (profileViewProvider) {
                        profileViewProvider.show();
                    }
                    await vscode.commands.executeCommand('cfStudioProfileView.focus');
                } catch (error) {
                    console.log('Could not open profile view:', error);
                }
                
                vscode.window.showInformationMessage(
                    'Welcome to CP Studio! Set up your profile to get started.',
                    'Setup Profile',
                    'Configure AI Key'
                ).then(selection => {
                    if (selection === 'Setup Profile') {
                        vscode.commands.executeCommand('codeforces.setupProfile');
                    } else if (selection === 'Configure AI Key') {
                        vscode.commands.executeCommand('codeforces.configureApiKey');
                    }
                });
            }
        }, 1500);
    } else {
        // Show welcome message for subsequent activations
        vscode.window.showInformationMessage('CP Studio is ready! Use the command palette to get started.');
    }
}

/**
 * Auto-detect compiler availability and show helpful messages.
 */
async function detectCompiler(): Promise<void> {
    const language = vscode.workspace.getConfiguration('codeforces').get<string>('language', 'cpp');
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
        if (language === 'cpp') {
            await execAsync('g++ --version');
        } else if (language === 'python') {
            await execAsync('python3 --version');
        } else if (language === 'java') {
            await execAsync('javac -version');
        }
    } catch {
        const compilerNames: Record<string, string> = {
            cpp: 'g++ (C++ compiler)',
            python: 'python3',
            java: 'javac (Java compiler)'
        };
        const installHints: Record<string, string> = {
            cpp: 'Install via: brew install gcc (macOS), sudo apt install g++ (Ubuntu), or download from mingw-w64.org (Windows)',
            python: 'Install from python.org or via: brew install python3 (macOS), sudo apt install python3 (Ubuntu)',
            java: 'Install JDK from adoptium.net or via: brew install openjdk (macOS), sudo apt install default-jdk (Ubuntu)'
        };

        vscode.window.showWarningMessage(
            `${compilerNames[language]} not found. ${installHints[language]}`,
            'Change Language'
        ).then(selection => {
            if (selection === 'Change Language') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'codeforces.language');
            }
        });
    }
}

export function deactivate() {}
