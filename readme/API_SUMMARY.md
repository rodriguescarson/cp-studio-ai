# API Summary & Production Setup

## Third-Party APIs Used

### 1. **OpenRouter API** ⭐ (Primary - Recommended)

- **Purpose**: AI-powered code analysis and chat
- **Endpoint**: `https://openrouter.ai/api/v1/chat/completions`
- **Authentication**: Bearer token (API key)
- **Setup**:
  - Get free API key at https://openrouter.ai
  - Configure: Settings → `codeforces.aiApiKey`
  - Or use command: `cfx: Configure API Key`
- **Cost**: Pay-as-you-go (typically $0.01-0.10 per analysis)
- **Rate Limits**: Based on your account tier
- **Required Headers**:
  ```
  Authorization: Bearer <your-api-key>
  HTTP-Referer: https://github.com/rodriguescarson/cf-studio
  X-Title: CF Studio
  ```

### 2. **Codeforces Public API** (Free)

- **Purpose**: Contest data, user profiles, submissions, ratings
- **Base URL**: `https://codeforces.com/api`
- **Authentication**: Optional (public API works without auth)
- **Endpoints Used**:
  - `GET /user.info?handles=<handle>` - User profile (includes avatar URL)
  - `GET /user.status?handle=<handle>` - User submissions
  - `GET /user.rating?handle=<handle>` - Rating history
  - `GET /contest.list?gym=false` - Contest list
  - `GET /contest.standings?contestId=<id>` - Contest standings
- **Rate Limits**:
  - Public: ~5 requests/second
  - Authenticated: Higher limits (requires KEY + SECRET in `.env`)
- **Setup**: No setup required (works out of the box)
- **Optional Auth**: Add to `.env`:
  ```env
  KEY=your_codeforces_api_key
  SECRET=your_codeforces_api_secret
  CF_USERNAME=your_handle
  ```

### 3. **Anthropic Claude API** (Optional Alternative)

- **Purpose**: Alternative AI provider
- **Endpoint**: `https://api.anthropic.com/v1/messages`
- **Authentication**: API key via `x-api-key` header
- **Setup**:
  - Get API key from https://console.anthropic.com
  - Set `codeforces.aiProvider` to `anthropic`
  - Set `codeforces.aiApiKey` to your Anthropic key
- **Cost**: Pay-per-use (check Anthropic pricing)

### 4. **OpenAI API** (Optional Alternative)

- **Purpose**: Alternative AI provider
- **Endpoint**: `https://api.openai.com/v1/chat/completions`
- **Authentication**: Bearer token
- **Setup**:
  - Get API key from https://platform.openai.com
  - Set `codeforces.aiProvider` to `openai`
  - Set `codeforces.aiApiKey` to your OpenAI key
- **Cost**: Pay-per-use (check OpenAI pricing)

## Production Deployment Requirements

### ✅ What's Already Set Up

1. **No Backend Required**: All API calls are client-side
2. **BYOK Model**: Users provide their own API keys
3. **Secure Storage**: API keys stored in VS Code settings (encrypted)
4. **HTTPS Only**: All API calls use secure connections

### 📋 Production Checklist

#### For Extension Developers:

- [x] All dependencies listed in `package.json`
- [x] TypeScript compilation configured
- [x] VS Code API compatibility verified
- [x] Error handling implemented
- [x] User documentation provided

#### For End Users:

- [ ] **AI Features** (Optional but recommended):
  - Get OpenRouter API key: https://openrouter.ai
  - Configure in Settings: `codeforces.aiApiKey`
  - Or use command: `cfx: Configure API Key`

- [ ] **Profile Features** (Optional):
  - Add to `.env` file: `CF_USERNAME=your_handle`
  - Or use command: `cfx: Setup Profile`
  - Profile images will automatically load from Codeforces

- [ ] **Contest Features** (Works out of the box):
  - No setup required
  - Uses public Codeforces API

## User Configuration Guide

### Minimum Setup (Basic Features)

No configuration needed! The extension works with:

- Contest setup from URL
- Test runner
- Code copying

### Recommended Setup (Full Features)

1. **Configure AI API Key**:

   ```
   Settings → Search "codeforces.aiApiKey" → Enter your OpenRouter key
   ```

   Or use command: `Cmd+Shift+P` → `cfx: Configure API Key`

2. **Configure Codeforces Username** (for profile features):
   Create `.env` file in workspace root:
   ```env
   CF_USERNAME=your_handle
   ```
   Or use command: `Cmd+Shift+P` → `cfx: Setup Profile`

### Advanced Setup (Authenticated Codeforces API)

For higher rate limits, add to `.env`:

```env
KEY=your_codeforces_api_key
SECRET=your_codeforces_api_secret
CF_USERNAME=your_handle
CONTEST_FILTER=div2,div3
REMINDER_TIMES=15,30,60
INCLUDE_GYM=false
```

Get Codeforces API credentials at: https://codeforces.com/settings/api

## Profile Image Support ✅

The extension now displays Codeforces profile images!

- **Avatar**: Automatically loaded from Codeforces API `user.avatar` field
- **Display**: Shows in profile view sidebar
- **Fallback**: Gracefully handles missing images
- **Additional Info**: Also displays name, organization, location if available

## Security & Privacy

- ✅ **No Data Collection**: Extension doesn't collect or store user data
- ✅ **Local Storage**: All data stays on user's machine
- ✅ **Encrypted Keys**: API keys stored securely in VS Code settings
- ✅ **HTTPS Only**: All API calls use secure connections
- ✅ **Client-Side Only**: No backend server required

## Troubleshooting

### API Key Issues

- Verify key is correct (no extra spaces)
- Check account has credits/balance
- Review Output channel for detailed errors

### Codeforces API Issues

- Check internet connection
- Verify username is correct
- Check rate limits (wait a few seconds between requests)

### Profile Image Not Showing

- Verify username is configured correctly
- Check Codeforces profile has an avatar set
- Check browser console for CORS errors (shouldn't happen with proper CSP)

## Support

- **Documentation**: See `PRODUCTION_DEPLOYMENT.md` for detailed deployment guide
- **Issues**: https://github.com/rodriguescarson/cp-studio-ai/issues
- **Setup Help**: See `OPENROUTER_SETUP.md` for AI setup guide
