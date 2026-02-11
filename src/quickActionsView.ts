import * as vscode from 'vscode';
import { getDesignSystemCSS } from './designSystem';
import { registerViewForCollapse } from './viewManager';

/**
 * Quick Actions webview — a card-based dashboard that surfaces every major
 * CP Studio action so users never have to hunt through tiny toolbar icons.
 */
export class QuickActionsViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'cfStudioQuickActions';
    private _view?: vscode.WebviewView;

    constructor(private readonly _context: vscode.ExtensionContext) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _ctx: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            enableCommandUris: true,
            localResourceRoots: [],
        };

        webviewView.webview.html = this.getHtml();

        // Auto-collapse integration
        registerViewForCollapse(QuickActionsViewProvider.viewType, webviewView);

        // Handle button clicks from the webview
        webviewView.webview.onDidReceiveMessage(async (msg) => {
            if (msg.command === 'run') {
                try {
                    await vscode.commands.executeCommand(msg.id);
                } catch (err: any) {
                    vscode.window.showErrorMessage(`Command failed: ${err?.message || err}`);
                }
            }
        });
    }

    /* ------------------------------------------------------------------ */

    private getHtml(): string {
        return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
${getDesignSystemCSS()}

/* ====== Quick Actions layout ====== */
.qa-container {
    padding: var(--cfx-space-md);
    display: flex;
    flex-direction: column;
    gap: var(--cfx-space-lg);
}

/* Section label */
.qa-section-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: var(--vscode-descriptionForeground);
    padding: 0 var(--cfx-space-xs);
    margin-bottom: calc(-1 * var(--cfx-space-sm));
}

/* Action grid — 2 columns on wider sidebars, 1 on narrow */
.qa-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--cfx-space-sm);
}

@media (max-width: 260px) {
    .qa-grid { grid-template-columns: 1fr; }
}

/* Full-width row variant */
.qa-grid--full {
    grid-template-columns: 1fr;
}

/* Action card button */
.qa-action {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--cfx-space-xs);
    padding: var(--cfx-space-md) var(--cfx-space-sm);
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: var(--cfx-radius-lg);
    cursor: pointer;
    transition: all var(--cfx-transition-fast);
    text-align: center;
    position: relative;
    overflow: hidden;
}

.qa-action:hover {
    border-color: var(--cfx-accent);
    background: var(--cfx-accent-light);
    transform: translateY(-1px);
    box-shadow: var(--cfx-shadow-sm);
}

.qa-action:active {
    transform: translateY(0);
}

.qa-action:focus-visible {
    outline: 2px solid var(--vscode-focusBorder);
    outline-offset: 2px;
}

/* Icon circle */
.qa-icon {
    width: 36px;
    height: 36px;
    border-radius: var(--cfx-radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
}

.qa-icon--purple  { background: rgba(124, 58, 237, 0.15); color: #a78bfa; }
.qa-icon--blue    { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
.qa-icon--green   { background: rgba(34, 197, 94, 0.15);  color: #4ade80; }
.qa-icon--orange  { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
.qa-icon--cyan    { background: rgba(0, 225, 255, 0.15);  color: #22d3ee; }
.qa-icon--red     { background: rgba(239, 68, 68, 0.15);  color: #f87171; }
.qa-icon--pink    { background: rgba(236, 72, 153, 0.15); color: #f472b6; }

/* Text */
.qa-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--vscode-foreground);
    line-height: 1.3;
}

.qa-sublabel {
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    line-height: 1.3;
}

/* Wide action (full row) */
.qa-action--wide {
    flex-direction: row;
    align-items: center;
    gap: var(--cfx-space-md);
    padding: var(--cfx-space-md) var(--cfx-space-lg);
    text-align: left;
}

.qa-action--wide .qa-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

/* Divider */
.qa-divider {
    height: 1px;
    background: var(--vscode-panel-border);
    margin: var(--cfx-space-xs) 0;
    opacity: 0.5;
}

/* Keyboard shortcut badge */
.qa-kbd {
    display: inline-block;
    padding: 1px 5px;
    font-size: 9px;
    font-family: var(--vscode-editor-font-family);
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    border-radius: 3px;
    margin-left: 4px;
    opacity: 0.7;
}

/* Staggered entrance */
.qa-container > * {
    animation: cfx-fadeIn 0.3s ease-out both;
}
.qa-container > *:nth-child(1) { animation-delay: 0ms; }
.qa-container > *:nth-child(2) { animation-delay: 40ms; }
.qa-container > *:nth-child(3) { animation-delay: 80ms; }
.qa-container > *:nth-child(4) { animation-delay: 120ms; }
.qa-container > *:nth-child(5) { animation-delay: 160ms; }
.qa-container > *:nth-child(6) { animation-delay: 200ms; }
.qa-container > *:nth-child(7) { animation-delay: 240ms; }
.qa-container > *:nth-child(8) { animation-delay: 280ms; }
.qa-container > *:nth-child(9) { animation-delay: 320ms; }
</style>
</head>
<body>
<div class="qa-container" role="navigation" aria-label="Quick Actions">

    <!-- ===== Testing & Analysis ===== -->
    <div class="qa-section-label">Testing &amp; Analysis</div>
    <div class="qa-grid">
        <button class="qa-action" data-cmd="codeforces.runTests" title="Run Tests (Cmd+Shift+T)" aria-label="Run Tests">
            <div class="qa-icon qa-icon--green">▶</div>
            <span class="qa-label">Run Tests</span>
            <span class="qa-sublabel">Compile &amp; test<span class="qa-kbd">⌘⇧T</span></span>
        </button>
        <button class="qa-action" data-cmd="codeforces.aiAnalysis" title="AI Analysis (Cmd+Shift+A)" aria-label="AI Analysis">
            <div class="qa-icon qa-icon--purple">✨</div>
            <span class="qa-label">AI Analysis</span>
            <span class="qa-sublabel">Review code<span class="qa-kbd">⌘⇧A</span></span>
        </button>
    </div>

    <!-- ===== Problem Setup ===== -->
    <div class="qa-section-label">Problem Setup</div>
    <div class="qa-grid--full">
        <button class="qa-action qa-action--wide" data-cmd="codeforces.setupFromUrl" title="Setup Problem from URL (Cmd+Shift+U)" aria-label="Setup from URL">
            <div class="qa-icon qa-icon--cyan">🔗</div>
            <div class="qa-text">
                <span class="qa-label">Setup from URL<span class="qa-kbd">⌘⇧U</span></span>
                <span class="qa-sublabel">Paste a Codeforces, LeetCode, or GFG link</span>
            </div>
        </button>
        <button class="qa-action qa-action--wide" data-cmd="codeforces.setupFromContest" title="Setup from Contest" aria-label="Setup from Contest">
            <div class="qa-icon qa-icon--blue">📅</div>
            <div class="qa-text">
                <span class="qa-label">Setup from Contest</span>
                <span class="qa-sublabel">Browse &amp; set up upcoming contests</span>
            </div>
        </button>
    </div>

    <div class="qa-divider"></div>

    <!-- ===== Curated Problem Sheets ===== -->
    <div class="qa-section-label">Problem Sheets</div>
    <div class="qa-grid">
        <button class="qa-action" data-cmd="codeforces.pullA2OJLadder" title="A2OJ Ladders" aria-label="A2OJ Ladders">
            <div class="qa-icon qa-icon--orange">📋</div>
            <span class="qa-label">A2OJ Ladders</span>
            <span class="qa-sublabel">By rating</span>
        </button>
        <button class="qa-action" data-cmd="codeforces.pullNeetCode" title="NeetCode 150" aria-label="NeetCode 150">
            <div class="qa-icon qa-icon--blue">📖</div>
            <span class="qa-label">NeetCode 150</span>
            <span class="qa-sublabel">Interview prep</span>
        </button>
        <button class="qa-action" data-cmd="codeforces.pullLoveBabbar" title="Love Babbar 450" aria-label="Love Babbar 450">
            <div class="qa-icon qa-icon--pink">✅</div>
            <span class="qa-label">Love Babbar</span>
            <span class="qa-sublabel">450 DSA sheet</span>
        </button>
        <button class="qa-action" data-cmd="codeforces.pullStrivers" title="Striver's Sheet" aria-label="Striver's Sheet">
            <div class="qa-icon qa-icon--red">⭐</div>
            <span class="qa-label">Striver's</span>
            <span class="qa-sublabel">SDE sheet</span>
        </button>
    </div>

    <div class="qa-divider"></div>

    <!-- ===== AI & Config ===== -->
    <div class="qa-section-label">AI &amp; Configuration</div>
    <div class="qa-grid">
        <button class="qa-action" data-cmd="codeforces.openChat" title="Open Chat (Cmd+Shift+I)" aria-label="Open Chat">
            <div class="qa-icon qa-icon--purple">💬</div>
            <span class="qa-label">Open Chat</span>
            <span class="qa-sublabel">AI assistant<span class="qa-kbd">⌘⇧I</span></span>
        </button>
        <button class="qa-action" data-cmd="codeforces.configureApiKey" title="Configure API Key" aria-label="Configure API Key">
            <div class="qa-icon qa-icon--orange">🔑</div>
            <span class="qa-label">API Key</span>
            <span class="qa-sublabel">Set provider key</span>
        </button>
    </div>

</div>

<script>
    const vscode = acquireVsCodeApi();

    document.querySelectorAll('.qa-action[data-cmd]').forEach(btn => {
        btn.addEventListener('click', () => {
            const cmd = btn.getAttribute('data-cmd');
            if (cmd) {
                vscode.postMessage({ command: 'run', id: cmd });
            }
        });
    });
</script>
</body>
</html>`;
    }
}
