import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class ProblemViewerPanel {
    public static currentPanel: ProblemViewerPanel | undefined;
    private static readonly viewType = 'cfStudioProblemViewer';

    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(problemDir: string): void {
        const statementPath = path.join(problemDir, 'problem_statement.txt');
        
        if (!fs.existsSync(statementPath)) {
            vscode.window.showWarningMessage('No problem statement found. Set up the problem first.');
            return;
        }

        const content = fs.readFileSync(statementPath, 'utf-8');
        const column = vscode.ViewColumn.Beside;

        if (ProblemViewerPanel.currentPanel) {
            ProblemViewerPanel.currentPanel._panel.reveal(column);
            ProblemViewerPanel.currentPanel.updateContent(content, problemDir);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            ProblemViewerPanel.viewType,
            'Problem Statement',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: []
            }
        );

        ProblemViewerPanel.currentPanel = new ProblemViewerPanel(panel, content, problemDir);
    }

    /**
     * Open the problem statement for the currently active editor file.
     */
    public static showForActiveEditor(): void {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor');
            return;
        }

        const filePath = editor.document.uri.fsPath;
        const problemDir = path.dirname(filePath);
        ProblemViewerPanel.createOrShow(problemDir);
    }

    private constructor(panel: vscode.WebviewPanel, content: string, problemDir: string) {
        this._panel = panel;
        this.updateContent(content, problemDir);

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    private updateContent(content: string, problemDir: string): void {
        // Parse problem directory name for title
        const parts = problemDir.split(path.sep);
        const dirName = parts[parts.length - 1];
        const parentName = parts[parts.length - 2];
        const title = `${parentName}/${dirName}`;

        this._panel.title = `Problem: ${title}`;
        this._panel.webview.html = this.getHtml(content, title);
    }

    private getHtml(content: string, title: string): string {
        // Escape HTML in content but preserve markdown formatting
        const escapedContent = content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
    <title>Problem Statement</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
            font-size: 14px;
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            padding: 24px;
            line-height: 1.7;
        }

        .problem-title {
            font-size: 22px;
            font-weight: 700;
            margin-bottom: 8px;
            color: var(--vscode-foreground);
            padding-bottom: 12px;
            border-bottom: 2px solid #7c3aed;
        }

        .problem-meta {
            display: flex;
            gap: 16px;
            margin-bottom: 20px;
            font-size: 12px;
            opacity: 0.8;
        }

        .problem-meta span {
            padding: 3px 10px;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            border-radius: 12px;
        }

        .content {
            white-space: pre-wrap;
            word-wrap: break-word;
        }

        .content h1, .content h2, .content h3 {
            margin-top: 24px;
            margin-bottom: 12px;
            color: var(--vscode-foreground);
        }

        .content h1 { font-size: 20px; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 8px; }
        .content h2 { font-size: 17px; color: #7c3aed; }
        .content h3 { font-size: 15px; }

        .content p { margin-bottom: 12px; }

        .content strong { color: var(--vscode-foreground); font-weight: 600; }

        .content code {
            background: var(--vscode-textCodeBlock-background);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: var(--vscode-editor-font-family);
            font-size: 13px;
        }

        .content pre {
            background: var(--vscode-textCodeBlock-background);
            padding: 14px 18px;
            border-radius: 8px;
            margin: 12px 0;
            overflow-x: auto;
            font-family: var(--vscode-editor-font-family);
            font-size: 13px;
            line-height: 1.5;
            border-left: 3px solid #7c3aed;
        }

        .sample-section {
            margin: 16px 0;
            padding: 16px;
            background: var(--vscode-textCodeBlock-background);
            border-radius: 8px;
            border: 1px solid var(--vscode-panel-border);
        }

        .sample-label {
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
            color: #7c3aed;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
        }

        body { animation: fadeIn 0.3s ease-out; }
    </style>
</head>
<body>
    <div class="content" id="content"></div>
    <script>
        const raw = ${JSON.stringify(content)};
        const container = document.getElementById('content');
        
        // Simple markdown-like rendering
        let html = raw;
        
        // Headers
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
        
        // Bold
        html = html.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
        
        // Code blocks
        html = html.replace(/\`\`\`([\\s\\S]*?)\`\`\`/g, '<pre>$1</pre>');
        
        // Inline code
        html = html.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
        
        // LaTeX (simple display)
        html = html.replace(/\\$([^\\$]+)\\$/g, '<code class="math">$1</code>');
        
        // Line breaks for paragraphs
        html = html.replace(/\\n\\n/g, '</p><p>');
        html = '<p>' + html + '</p>';
        
        container.innerHTML = html;
    </script>
</body>
</html>`;
    }

    private dispose(): void {
        ProblemViewerPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const d = this._disposables.pop();
            if (d) { d.dispose(); }
        }
    }
}
