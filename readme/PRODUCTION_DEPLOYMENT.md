# Production Deployment Guide

## Third-Party APIs Used

This extension uses the following third-party APIs:

### 1. **OpenRouter API** (Primary AI Provider)

- **Purpose**: AI-powered code analysis and chat functionality
- **Endpoint**: `https://openrouter.ai/api/v1/chat/completions`
- **Authentication**: Bearer token (API key)
- **Setup Required**:
  - Get API key from https://openrouter.ai
  - Configure via VS Code settings: `codeforces.aiApiKey`
  - Or use command: `cfx: Configure API Key`
- **Rate Limits**: Pay-as-you-go, check https://openrouter.ai/models for pricing
- **Headers Required**:
  - `Authorization: Bearer <api-key>`
  - `HTTP-Referer: https://github.com/rodriguescarson/cf-studio`
  - `X-Title: CF Studio`
- **Production Considerations**:
  - Users must provide their own API key (BYOK - Bring Your Own Key)
  - No backend server needed - all requests are client-side
  - API key stored securely in VS Code settings (encrypted)

### 2. **Codeforces Public API**

- **Purpose**: Fetch contest data, user profiles, submissions, ratings
- **Endpoint**: `https://codeforces.com/api`
- **Authentication**: Optional (public API works without auth)
- **Methods Used**:
  - `user.info` - Get user profile information
  - `user.status` - Get user submissions
  - `user.rating` - Get user rating history
  - `contest.list` - Get list of contests
  - `contest.standings` - Get contest standings
- **Rate Limits**:
  - Public API: ~5 requests per second
  - Authenticated API: Higher limits (requires KEY and SECRET)
- **Production Considerations**:
  - No API key required for basic functionality
  - For authenticated features, users can add KEY and SECRET to `.env` file
  - All requests are client-side, no backend needed

### 3. **Anthropic Claude API** (Optional Alternative)

- **Purpose**: Alternative AI provider for code analysis
- **Endpoint**: `https://api.anthropic.com/v1/messages`
- **Authentication**: API key via `x-api-key` header
- **Setup**: Configure `codeforces.aiProvider` to `anthropic` and set API key
- **Production Considerations**: Same as OpenRouter - BYOK model

### 4. **OpenAI API** (Optional Alternative)

- **Purpose**: Alternative AI provider for code analysis
- **Endpoint**: `https://api.openai.com/v1/chat/completions`
- **Authentication**: Bearer token
- **Setup**: Configure `codeforces.aiProvider` to `openai` and set API key
- **Production Considerations**: Same as OpenRouter - BYOK model

## Production Deployment Checklist

### Pre-Deployment

- [ ] **Version Number**: Update version in `package.json`
- [ ] **Publisher**: Verify publisher name matches VS Code Marketplace account
- [ ] **Dependencies**: Ensure all dependencies are listed in `package.json`
- [ ] **Build**: Run `npm run compile` to ensure TypeScript compiles without errors
- [ ] **Test**: Test all features in Extension Development Host
- [ ] **Documentation**: Update README.md with latest features

### Building for Production

1. **Install Dependencies**:

   ```bash
   cd vscode-extension
   npm install
   ```

2. **Compile TypeScript**:

   ```bash
   npm run compile
   ```

3. **Package Extension**:
   ```bash
   npm install -g vsce
   vsce package
   ```
   This creates a `.vsix` file ready for distribution.

### Publishing to VS Code Marketplace

1. **Install vsce** (VS Code Extension Manager):

   ```bash
   npm install -g @vscode/vsce
   ```

2. **Login to Marketplace**:

   ```bash
   vsce login <publisher-name>
   ```

3. **Publish**:

   ```bash
   vsce publish
   ```

   Or publish a specific version:

   ```bash
   vsce publish <version>
   ```

### Manual Distribution (.vsix file)

1. **Package Extension**:

   ```bash
   vsce package
   ```

2. **Distribute**:
   - Share `.vsix` file via GitHub Releases
   - Users can install via: `code --install-extension <extension>.vsix`
   - Or in VS Code: Extensions → "..." → "Install from VSIX..."

### Environment Variables (Optional)

For users who want authenticated Codeforces API access:

Create `.env` file in workspace root:

```env
KEY=your_codeforces_api_key
SECRET=your_codeforces_api_secret
CF_USERNAME=your_handle
CONTEST_FILTER=div2,div3
REMINDER_TIMES=15,30,60
INCLUDE_GYM=false
```

**Note**: These are optional. The extension works without them using public API.

### Security Considerations

1. **API Keys**:
   - All API keys are stored in VS Code settings (encrypted)
   - Never hardcode API keys in source code
   - Users provide their own keys (BYOK model)

2. **Network Requests**:
   - All requests are made client-side
   - No backend server required
   - HTTPS only for all API calls

3. **User Data**:
   - No user data is collected or stored
   - All data stays local to user's machine

### Testing Before Release

- [ ] Test extension installation from `.vsix` file
- [ ] Test all commands in Command Palette
- [ ] Test AI analysis with valid API key
- [ ] Test Codeforces API calls (contests, profile)
- [ ] Test contest setup from URL
- [ ] Test test runner functionality
- [ ] Test chat interface
- [ ] Test profile view with and without username configured
- [ ] Verify no console errors in Extension Development Host

### Post-Deployment

1. **Monitor**: Check VS Code Marketplace for user reviews/issues
2. **Update**: Fix bugs and release updates as needed
3. **Documentation**: Keep README and setup guides updated

## Configuration for End Users

Users need to configure:

1. **AI API Key** (for AI features):
   - Get key from https://openrouter.ai (recommended)
   - Or use OpenAI/Anthropic keys
   - Configure via Settings → `codeforces.aiApiKey`
   - Or use command: `cfx: Configure API Key`

2. **Codeforces Username** (optional, for profile features):
   - Add to `.env` file: `CF_USERNAME=your_handle`
   - Or use command: `cfx: Setup Profile`

3. **Contests Path** (optional):
   - Default: `${workspaceFolder}/contests`
   - Configure via Settings → `codeforces.contestsPath`

## Troubleshooting Production Issues

### Extension Not Installing

- Check VS Code version compatibility (`engines.vscode` in package.json)
- Verify `.vsix` file is not corrupted
- Check VS Code logs: Help → Toggle Developer Tools

### API Errors

- Verify API keys are correctly configured
- Check network connectivity
- Review Output channel for detailed error messages

### Codeforces API Rate Limits

- Public API: ~5 requests/second
- Consider caching responses
- Use authenticated API for higher limits

## Support

For issues or questions:

- GitHub Issues: https://github.com/rodriguescarson/cp-studio/issues
- Check TROUBLESHOOTING.md for common issues
