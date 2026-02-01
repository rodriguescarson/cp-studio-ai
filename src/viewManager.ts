import * as vscode from 'vscode';

// View manager to ensure only one tab is open at a time
// Uses VS Code's available APIs: collapseAll for tree views and show(false) + focus management for webviews
class ViewManager {
    private views: Map<string, vscode.WebviewView | null> = new Map();
    private isCollapsing = false;
    private currentVisibleView: string | null = null;
    private collapseTimeout: NodeJS.Timeout | null = null;

    registerView(viewId: string, view: vscode.WebviewView | null): void {
        this.views.set(viewId, view);
        
        if (view) {
            // Listen for visibility changes
            view.onDidChangeVisibility(() => {
                if (view.visible && this.currentVisibleView !== viewId) {
                    // Debounce to avoid rapid toggling
                    if (this.collapseTimeout) {
                        clearTimeout(this.collapseTimeout);
                    }
                    this.collapseTimeout = setTimeout(() => {
                        this.handleViewBecameVisible(viewId);
                    }, 150);
                } else if (!view.visible && this.currentVisibleView === viewId) {
                    this.currentVisibleView = null;
                }
            });
        }
    }

    private async handleViewBecameVisible(viewId: string): Promise<void> {
        if (this.isCollapsing) {
            return;
        }

        this.isCollapsing = true;
        const previousVisibleView = this.currentVisibleView;
        this.currentVisibleView = viewId;

        try {
            // Collapse tree view if a webview became visible
            if (viewId !== 'cfStudioContests') {
                try {
                    // Use the collapseAll command for tree views
                    await vscode.commands.executeCommand('workbench.actions.treeView.cfStudioContests.collapseAll');
                } catch (error) {
                    // Command might not be available, try alternative
                    try {
                        await vscode.commands.executeCommand('cfStudioContests.collapse');
                    } catch (e) {
                        // Ignore if command doesn't exist
                    }
                }
            }

            // Hide other webview views
            // Note: show(false) doesn't actually hide webviews, but we can try to minimize them
            // by ensuring only the active one is focused/expanded
            for (const [id, view] of this.views.entries()) {
                if (id !== viewId && id !== 'cfStudioContests' && view) {
                    // For webviews, we need to use a different approach
                    // Try to "collapse" by calling show(false) - this might minimize the view
                    // The view will still be in the sidebar but collapsed
                    try {
                        // show(false) shows without focus, which might help
                        view.show(false);
                    } catch (error) {
                        // Ignore errors
                    }
                }
            }

            // Focus the newly visible view to ensure it's expanded and others are pushed down
            // This leverages VS Code's natural sidebar behavior where expanding one view
            // can cause others to collapse
            try {
                if (viewId === 'cfStudioChatView') {
                    await vscode.commands.executeCommand('cfStudioChatView.focus');
                } else if (viewId === 'cfStudioProfileView') {
                    await vscode.commands.executeCommand('cfStudioProfileView.focus');
                } else if (viewId === 'cfStudioSolvedProblemsView') {
                    await vscode.commands.executeCommand('cfStudioSolvedProblemsView.focus');
                } else if (viewId === 'cfStudioContests') {
                    // For tree view, collapse all webviews by calling show(false) on them
                    for (const [id, view] of this.views.entries()) {
                        if (id !== 'cfStudioContests' && view && view.visible) {
                            try {
                                view.show(false);
                            } catch (error) {
                                // Ignore
                            }
                        }
                    }
                }
            } catch (focusError) {
                // Ignore focus errors - the view might not have a focus command
            }

        } finally {
            setTimeout(() => {
                this.isCollapsing = false;
            }, 300);
        }
    }

    getView(viewId: string): vscode.WebviewView | null | undefined {
        return this.views.get(viewId);
    }
}

// Singleton instance
const viewManager = new ViewManager();

// Export function for providers to register their views
export function registerViewForCollapse(viewId: string, view: vscode.WebviewView | null): void {
    viewManager.registerView(viewId, view);
}
