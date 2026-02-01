import * as vscode from 'vscode';

export class CodeCopier {
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    async copyToClipboard(editor: vscode.TextEditor): Promise<void> {
        const document = editor.document;
        const text = document.getText();

        if (!text || text.trim().length === 0) {
            vscode.window.showWarningMessage('No code to copy');
            return;
        }

        try {
            await vscode.env.clipboard.writeText(text);
            
            // Show notification
            const message = `Code copied to clipboard! (${text.split('\n').length} lines)`;
            vscode.window.showInformationMessage(message);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to copy: ${error.message}`);
        }
    }
}
