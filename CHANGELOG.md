# Changelog

All notable changes to CP Studio will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- (Future changes)

## [1.0.13] - 2026-02-11

### Added
- **Single-panel sidebar** – Only one view expands at a time; opening a view auto-collapses the others so content always gets maximum space
- **Sidebar Command Center README section** – Dedicated documentation spotlight for every toolbar button across all four sidebar views and the editor toolbar

### Changed
- Views default to collapsed on first install except Profile Stats (initial visibility)
- View manager rewritten with proper ES module imports and debounced collapse logic

## [1.0.12] - 2026-02-11

### Added
- **Get Started walkthrough** – 5-step guided setup (profile, API key, first problem, first test, chat)
- **Status bar** – Rating, active problem context, streak count, and quick Run button
- **Multi-language support** – Python and Java alongside C++ (templates and test runner; setting: `codeforces.language`)
- **Multiple test cases** – `in1.txt`/`out1.txt`, `in2.txt`/`out2.txt`, etc., with per-case pass/fail and timing
- **Add Test Case** – Editor toolbar button to add new test case files
- **Problem Statement viewer** – Side panel with formatted problem statement (markdown-style)
- **Keyboard shortcuts** – Run Tests (`Ctrl+Shift+T`), AI Analysis (`Ctrl+Shift+A`), Setup from URL (`Ctrl+Shift+U`), Open Chat (`Ctrl+Shift+I`)
- **Daily streak tracker** – Consecutive days of solving with milestone celebrations
- **Achievement badges** – 14 milestones (First Blood, Century, Rising Star, etc.) with unlock notifications
- **Enhanced profile dashboard** – Difficulty breakdown, 90-day activity heat map, streak and achievement display
- **Design system** – Shared CSS tokens, skeleton loaders, micro-animations, empty-state illustrations
- **Chat UI polish** – Typing indicator, scroll-to-bottom button, message animations
- **Diff view on test failure** – Side-by-side expected vs actual output
- **Search in Solved Problems** – Filter by problem ID
- **Accessibility** – ARIA labels, keyboard navigation, screen reader support, high-contrast considerations
- **Unit tests** – Test runner, streak, and achievement logic; run with `npm test`; CI runs tests on push/PR

### Changed
- First activation opens Get Started walkthrough instead of only a reload prompt
- Compiler auto-detection on startup with install hints per OS
- Profile and solved-problems views use new design system and loading states

## [1.0.7] - 2026-02-01

### Changed
- Rebranded from "cfx - codeforce studio" to "CP Studio"
- Updated all UI text and commands
- Enhanced README with comprehensive documentation
- Added contributing guidelines

### Added
- GitHub issue templates
- Pull request template
- CI/CD workflow
- CODEOWNERS file
- Dependabot configuration
- FUNDING.yml for sponsorships
- CONTRIBUTING.md guide

## [1.0.6] - Previous

### Added
- LeetCode support
- GeeksforGeeks support
- Solved problems tracking
- File decorations for solved problems

## [1.0.5] - Previous

### Added
- Profile dashboard
- Contest list view
- Chat interface improvements

## [1.0.4] - Previous

### Added
- AI code analysis
- Chat assistant
- Test runner improvements

## [1.0.0] - Initial Release

### Added
- Codeforces contest setup
- Test runner
- Code copier
- Basic UI

---

For detailed information about each release, visit the [GitHub Releases](https://github.com/rodriguescarson/cp-studio-ai/releases) page.
