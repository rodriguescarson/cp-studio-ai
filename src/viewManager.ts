import * as vscode from 'vscode';

/**
 * View manager that enforces single-panel-open behavior.
 *
 * VS Code sidebar views are accordion-style: each view has a header bar that
 * the user can click to expand/collapse. There is no public API to
 * programmatically collapse a webview panel, but we CAN:
 *
 *   1. Focus the active panel  (command `<viewId>.focus`)
 *      – VS Code will scroll it into view and give it keyboard focus.
 *
 *   2. Resize panels using `workbench.action.focusView` + context keys.
 *
 *   3. Set `"initialSize"` (VS Code >=1.87) on view containers, but that
 *      doesn't help after the first layout.
 *
 * **Our strategy:**
 *   - Set the view's `"visibility"` to `"collapsed"` for all but the first view
 *     so that on first open only Profile Stats is expanded.
 *   - When a view becomes visible (via its `onDidChangeVisibility` event) we
 *     record it and try to collapse the others by executing their
 *     `<viewId>.collapseAll` or `<viewId>.resetViewContainerVisibility`.
 *   - For tree views (`cfStudioContests`) we use `collapseAll`.
 *   - We set context keys (`cfStudio.<name>.visible`) so that `when` clauses
 *     can show/hide appropriate toolbar icons.
 */

interface RegisteredView {
    view: vscode.WebviewView;
    onDispose: vscode.Disposable[];
}

class ViewManager {
    private views: Map<string, RegisteredView> = new Map();
    private isTransitioning = false;
    private activeViewId: string | null = null;
    private debounceTimer: NodeJS.Timeout | null = null;

    /** All view IDs in the sidebar, in order. */
    private static readonly VIEW_IDS = [
        'cfStudioProfileView',
        'cfStudioQuickActions',
        'cfStudioContests',
        'cfStudioChatView',
        'cfStudioSolvedProblemsView',
    ];

    /** Map from viewId to the context key segment. */
    private static readonly CONTEXT_KEYS: Record<string, string> = {
        cfStudioProfileView: 'cfStudio.profile.visible',
        cfStudioQuickActions: 'cfStudio.quickActions.visible',
        cfStudioContests: 'cfStudio.contests.visible',
        cfStudioChatView: 'cfStudio.chat.visible',
        cfStudioSolvedProblemsView: 'cfStudio.solved.visible',
    };

    registerView(viewId: string, webviewView: vscode.WebviewView): void {
        // Clean up previous registration
        const prev = this.views.get(viewId);
        if (prev) {
            prev.onDispose.forEach(d => d.dispose());
        }

        const disposables: vscode.Disposable[] = [];

        disposables.push(
            webviewView.onDidChangeVisibility(() => {
                if (webviewView.visible) {
                    this.onViewBecameVisible(viewId);
                } else if (this.activeViewId === viewId) {
                    // Update context key
                    const ctxKey = ViewManager.CONTEXT_KEYS[viewId];
                    if (ctxKey) {
                        vscode.commands.executeCommand('setContext', ctxKey, false);
                    }
                }
            })
        );

        disposables.push(
            webviewView.onDidDispose(() => {
                this.views.delete(viewId);
            })
        );

        this.views.set(viewId, { view: webviewView, onDispose: disposables });

        // If this is the first view to appear, mark it active
        if (!this.activeViewId && webviewView.visible) {
            this.activeViewId = viewId;
            this.setContextKeys(viewId);
        }
    }

    /**
     * Called when a panel becomes visible. We:
     *  1. Record it as the active view.
     *  2. Update context keys.
     *  3. Collapse every OTHER panel by executing focus on the active one
     *     and using the `collapseAll` trick for tree views.
     */
    private onViewBecameVisible(viewId: string): void {
        if (this.isTransitioning) {
            return;
        }

        if (this.activeViewId === viewId) {
            return; // Already the active one
        }

        // Debounce: rapid events from VS Code layout engine
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(() => {
            this.performCollapse(viewId);
        }, 100);
    }

    private async performCollapse(viewId: string): Promise<void> {
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        const previousActiveId = this.activeViewId;
        this.activeViewId = viewId;
        this.setContextKeys(viewId);

        try {
            // Collapse other views by resetting the view container and re-focusing.
            // The key trick: VS Code sidebar panels are like an accordion.
            // When we maximize one, the others naturally get minimal height.
            //
            // Step 1: Collapse tree views (contests)
            if (viewId !== 'cfStudioContests') {
                try {
                    // This collapses all tree items so the tree view shrinks to header-only
                    await vscode.commands.executeCommand(
                        'workbench.actions.treeView.cfStudioContests.collapseAll'
                    );
                } catch {
                    // May not be available
                }
            }

            // Step 2: Focus the target view — this causes VS Code to expand it
            // and scroll it into view, naturally pushing others to minimum size.
            try {
                await vscode.commands.executeCommand(`${viewId}.focus`);
            } catch {
                // View might not be focusable yet
            }

            // Step 3: For the previously active webview, we can call resetViewSize
            // to release any extra height it held onto.
            if (previousActiveId && previousActiveId !== viewId) {
                try {
                    await vscode.commands.executeCommand(
                        `${previousActiveId}.resetViewSize`
                    );
                } catch {
                    // resetViewSize may not exist for all views; that's fine.
                }
            }

        } finally {
            setTimeout(() => {
                this.isTransitioning = false;
            }, 200);
        }
    }

    /**
     * Set context keys so that `when` clauses work properly.
     * Only the active view gets `true`; all others get `false`.
     */
    private setContextKeys(activeViewId: string): void {
        for (const [vid, ctxKey] of Object.entries(ViewManager.CONTEXT_KEYS)) {
            vscode.commands.executeCommand('setContext', ctxKey, vid === activeViewId);
        }
    }
}

// Singleton
const viewManager = new ViewManager();

/**
 * Called by each webview provider in its `resolveWebviewView` to register
 * itself for the auto-collapse behavior.
 */
export function registerViewForCollapse(
    viewId: string,
    view: vscode.WebviewView
): void {
    viewManager.registerView(viewId, view);
}
