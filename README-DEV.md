# Developer Guide

## Setup

```bash
npm install
npm run compile
```

## Build VSIX (repackage)

All packaged VSIX files go to the **`builds/`** folder.

```bash
npm run package
```

This runs `vsce package --out builds`, producing e.g. `builds/cf-studio-1.0.0.vsix`.

To package manually with a custom path:

```bash
vsce package --out builds
```

## Publish

**Upload via web:**  
Upload the `.vsix` from `builds/` at [VS Marketplace](https://marketplace.visualstudio.com/manage/publishers/rodriguescarson/extensions/cf-studio/hub).

**Publish via CLI** (requires PAT with publish rights):

```bash
vsce publish
```

## Links

- **Listing (after indexing):** https://marketplace.visualstudio.com/items?itemName=rodriguescarson.cf-studio  
- **Manage / versions:** https://marketplace.visualstudio.com/manage/publishers/rodriguescarson/extensions/cf-studio/hub
