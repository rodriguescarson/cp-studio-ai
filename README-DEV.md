# Developer Guide

## Setup

```bash
npm install
npm run compile
```

## Test

Run the unit test suite (TestRunner, StreakTracker, Achievement logic):

```bash
npm test
```

This compiles the project and runs Mocha on `out/test/**/*.test.js`.

## Build VSIX (repackage)

All packaged VSIX files go to the **`builds/`** folder.

```bash
npm run package
```

This runs `vsce package --out builds`, producing e.g. `builds/cp-studio-ai-1.0.12.vsix`.

To package manually with a custom path:

```bash
vsce package --out builds
```

## Publish

**Upload via web:**  
Upload the `.vsix` from `builds/` at [VS Marketplace](https://marketplace.visualstudio.com/manage/publishers/rodriguescarson/extensions).

**Publish via CLI** (requires PAT with publish rights):

```bash
vsce publish
```

## Version bump before release

1. Update `version` in `package.json` (e.g. `1.0.11` → `1.0.12`).
2. Optionally add an entry to `CHANGELOG.md`.
3. Run `npm run package` to produce the new VSIX.
4. Publish as above.

## Key project details

- **Extension ID:** `rodriguescarson.cp-studio-ai`
- **Package name:** `cp-studio-ai`
- **Walkthrough:** Get Started walkthrough is defined under `contributes.walkthroughs` in `package.json` (id: `cpStudioGettingStarted`).
- **New features (v1.0.12+):** Status bar, multi-language (C++/Python/Java), multiple test cases, problem statement viewer, keyboard shortcuts, streaks, achievements, design system, accessibility.

## Links

- **Marketplace listing:** https://marketplace.visualstudio.com/items?itemName=rodriguescarson.cp-studio-ai  
- **Manage / versions:** https://marketplace.visualstudio.com/manage/publishers/rodriguescarson
