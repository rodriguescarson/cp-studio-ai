/**
 * Shared CSS design system for all CP Studio webviews.
 * Provides consistent spacing, colors, typography, animations, and component styles.
 */

export function getDesignSystemCSS(): string {
    return `
        /* ========== Design Tokens ========== */
        :root {
            /* Accent colors */
            --cfx-accent: #7c3aed;
            --cfx-accent-hover: #6d28d9;
            --cfx-accent-light: rgba(124, 58, 237, 0.15);
            --cfx-cyan: #00e1ff;
            --cfx-green: #22c55e;
            --cfx-red: #ef4444;
            --cfx-orange: #f59e0b;
            --cfx-blue: #3b82f6;
            
            /* Spacing scale */
            --cfx-space-xs: 4px;
            --cfx-space-sm: 8px;
            --cfx-space-md: 12px;
            --cfx-space-lg: 16px;
            --cfx-space-xl: 24px;
            --cfx-space-2xl: 32px;
            
            /* Border radius */
            --cfx-radius-sm: 4px;
            --cfx-radius-md: 8px;
            --cfx-radius-lg: 12px;
            --cfx-radius-xl: 16px;
            --cfx-radius-full: 9999px;
            
            /* Shadows */
            --cfx-shadow-sm: 0 1px 2px rgba(0,0,0,0.1);
            --cfx-shadow-md: 0 2px 8px rgba(0,0,0,0.15);
            --cfx-shadow-lg: 0 4px 16px rgba(0,0,0,0.2);
            
            /* Transitions */
            --cfx-transition-fast: 150ms ease;
            --cfx-transition-normal: 250ms ease;
            --cfx-transition-slow: 350ms ease;
        }

        /* ========== Base Reset ========== */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
            font-size: var(--vscode-font-size, 13px);
            color: var(--vscode-foreground);
            background: var(--vscode-sideBar-background);
            line-height: 1.5;
            -webkit-font-smoothing: antialiased;
        }

        /* ========== Buttons ========== */
        .cfx-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: var(--cfx-space-sm);
            padding: var(--cfx-space-sm) var(--cfx-space-lg);
            border: none;
            border-radius: var(--cfx-radius-md);
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all var(--cfx-transition-fast);
            white-space: nowrap;
            outline: none;
        }

        .cfx-btn:focus-visible {
            outline: 2px solid var(--vscode-focusBorder);
            outline-offset: 2px;
        }

        .cfx-btn-primary {
            background: var(--cfx-accent);
            color: #fff;
        }
        .cfx-btn-primary:hover { background: var(--cfx-accent-hover); }

        .cfx-btn-secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .cfx-btn-secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }

        .cfx-btn-ghost {
            background: transparent;
            color: var(--vscode-foreground);
            opacity: 0.8;
        }
        .cfx-btn-ghost:hover { background: var(--vscode-list-hoverBackground); opacity: 1; }

        .cfx-btn-danger {
            background: var(--cfx-red);
            color: #fff;
        }
        .cfx-btn-danger:hover { background: #dc2626; }

        .cfx-btn-sm {
            padding: var(--cfx-space-xs) var(--cfx-space-sm);
            font-size: 11px;
        }

        .cfx-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            pointer-events: none;
        }

        /* ========== Cards ========== */
        .cfx-card {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: var(--cfx-radius-lg);
            padding: var(--cfx-space-lg);
            transition: border-color var(--cfx-transition-fast), box-shadow var(--cfx-transition-fast);
        }

        .cfx-card:hover {
            border-color: var(--cfx-accent);
            box-shadow: var(--cfx-shadow-sm);
        }

        .cfx-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: var(--cfx-space-md);
        }

        .cfx-card-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--vscode-foreground);
        }

        /* ========== Inputs ========== */
        .cfx-input {
            width: 100%;
            padding: var(--cfx-space-sm) var(--cfx-space-md);
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
            border-radius: var(--cfx-radius-md);
            font-size: 13px;
            font-family: inherit;
            outline: none;
            transition: border-color var(--cfx-transition-fast);
        }
        .cfx-input:focus { border-color: var(--vscode-focusBorder); }
        .cfx-input::placeholder { color: var(--vscode-input-placeholderForeground); }

        /* ========== Badge ========== */
        .cfx-badge {
            display: inline-flex;
            align-items: center;
            padding: 2px 8px;
            font-size: 11px;
            font-weight: 600;
            border-radius: var(--cfx-radius-full);
            background: var(--cfx-accent-light);
            color: var(--cfx-accent);
        }

        .cfx-badge-success {
            background: rgba(34, 197, 94, 0.15);
            color: var(--cfx-green);
        }

        .cfx-badge-danger {
            background: rgba(239, 68, 68, 0.15);
            color: var(--cfx-red);
        }

        /* ========== Animations ========== */
        @keyframes cfx-fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes cfx-slideIn {
            from { opacity: 0; transform: translateX(-12px); }
            to { opacity: 1; transform: translateX(0); }
        }

        @keyframes cfx-scaleIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }

        @keyframes cfx-shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }

        @keyframes cfx-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
        }

        @keyframes cfx-bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
        }

        @keyframes cfx-celebrate {
            0% { transform: scale(1); }
            25% { transform: scale(1.2) rotate(-5deg); }
            50% { transform: scale(1.3) rotate(5deg); }
            75% { transform: scale(1.1) rotate(-2deg); }
            100% { transform: scale(1); }
        }

        .cfx-fade-in { animation: cfx-fadeIn 0.3s ease-out both; }
        .cfx-slide-in { animation: cfx-slideIn 0.3s ease-out both; }
        .cfx-scale-in { animation: cfx-scaleIn 0.2s ease-out both; }
        .cfx-celebrate { animation: cfx-celebrate 0.6s ease-out; }

        /* Staggered children animation */
        .cfx-stagger > * { animation: cfx-fadeIn 0.3s ease-out both; }
        .cfx-stagger > *:nth-child(1) { animation-delay: 0ms; }
        .cfx-stagger > *:nth-child(2) { animation-delay: 50ms; }
        .cfx-stagger > *:nth-child(3) { animation-delay: 100ms; }
        .cfx-stagger > *:nth-child(4) { animation-delay: 150ms; }
        .cfx-stagger > *:nth-child(5) { animation-delay: 200ms; }
        .cfx-stagger > *:nth-child(n+6) { animation-delay: 250ms; }

        /* ========== Skeleton Loading ========== */
        .cfx-skeleton {
            background: linear-gradient(90deg,
                var(--vscode-editor-background) 25%,
                var(--vscode-list-hoverBackground) 50%,
                var(--vscode-editor-background) 75%);
            background-size: 200% 100%;
            animation: cfx-shimmer 1.5s ease-in-out infinite;
            border-radius: var(--cfx-radius-md);
        }

        .cfx-skeleton-text {
            height: 14px;
            margin-bottom: var(--cfx-space-sm);
            width: 100%;
        }

        .cfx-skeleton-text-sm { width: 60%; }
        .cfx-skeleton-text-lg { width: 80%; }

        .cfx-skeleton-avatar {
            width: 64px;
            height: 64px;
            border-radius: var(--cfx-radius-lg);
        }

        .cfx-skeleton-card {
            height: 80px;
            margin-bottom: var(--cfx-space-md);
        }

        /* ========== Empty States ========== */
        .cfx-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: var(--cfx-space-2xl);
            text-align: center;
            animation: cfx-fadeIn 0.5s ease-out;
        }

        .cfx-empty-icon {
            font-size: 48px;
            margin-bottom: var(--cfx-space-lg);
            opacity: 0.3;
        }

        .cfx-empty-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: var(--cfx-space-sm);
            color: var(--vscode-foreground);
        }

        .cfx-empty-description {
            font-size: 13px;
            opacity: 0.7;
            max-width: 280px;
            line-height: 1.6;
            margin-bottom: var(--cfx-space-lg);
        }

        /* ========== Typing Indicator ========== */
        .cfx-typing {
            display: inline-flex;
            gap: 4px;
            padding: 8px 12px;
        }

        .cfx-typing-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--cfx-accent);
            animation: cfx-bounce 1.4s ease-in-out infinite;
        }

        .cfx-typing-dot:nth-child(2) { animation-delay: 0.16s; }
        .cfx-typing-dot:nth-child(3) { animation-delay: 0.32s; }

        /* ========== Heat Map ========== */
        .cfx-heatmap {
            display: grid;
            grid-template-columns: repeat(53, 1fr);
            gap: 2px;
        }

        .cfx-heatmap-cell {
            width: 10px;
            height: 10px;
            border-radius: 2px;
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            transition: background var(--cfx-transition-fast);
        }

        .cfx-heatmap-cell.active {
            background: var(--cfx-accent);
            border-color: var(--cfx-accent);
        }

        .cfx-heatmap-cell.active-light {
            background: var(--cfx-accent-light);
            border-color: rgba(124, 58, 237, 0.3);
        }

        /* ========== Accessibility ========== */
        .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        }

        /* Focus visible for keyboard navigation */
        *:focus-visible {
            outline: 2px solid var(--vscode-focusBorder);
            outline-offset: 2px;
        }

        /* High contrast mode adjustments */
        @media (forced-colors: active) {
            .cfx-btn { border: 1px solid ButtonText; }
            .cfx-card { border: 1px solid CanvasText; }
            .cfx-badge { border: 1px solid CanvasText; }
        }

        /* ========== Scroll to Bottom Button ========== */
        .cfx-scroll-bottom {
            position: fixed;
            bottom: 80px;
            right: 16px;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: var(--cfx-accent);
            color: #fff;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: var(--cfx-shadow-md);
            transition: all var(--cfx-transition-fast);
            opacity: 0;
            pointer-events: none;
            z-index: 100;
        }

        .cfx-scroll-bottom.visible {
            opacity: 1;
            pointer-events: auto;
        }

        .cfx-scroll-bottom:hover {
            transform: scale(1.1);
            background: var(--cfx-accent-hover);
        }

        /* ========== Diff View ========== */
        .cfx-diff {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2px;
            border-radius: var(--cfx-radius-md);
            overflow: hidden;
            margin: var(--cfx-space-md) 0;
        }

        .cfx-diff-panel {
            padding: var(--cfx-space-md);
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
            line-height: 1.6;
            white-space: pre-wrap;
        }

        .cfx-diff-expected {
            background: rgba(34, 197, 94, 0.08);
            border-left: 3px solid var(--cfx-green);
        }

        .cfx-diff-actual {
            background: rgba(239, 68, 68, 0.08);
            border-left: 3px solid var(--cfx-red);
        }

        .cfx-diff-label {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: var(--cfx-space-sm);
            opacity: 0.7;
        }

        .cfx-diff-line-match { opacity: 0.5; }
        .cfx-diff-line-diff { font-weight: 600; }
    `;
}
