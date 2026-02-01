# OpenRouter Setup Guide

## What is OpenRouter?

OpenRouter is a unified API that gives you access to multiple AI models (GPT-4, Claude, Llama, etc.) through a single API key. Perfect for CF Studio's AI analysis feature!

## Why OpenRouter?

✅ **One API key** for multiple models  
✅ **Access to best models** (GPT-4, Claude Opus, etc.)  
✅ **Pay-as-you-go** pricing  
✅ **Easy to use** - just get a key and start using

## Setup Instructions

### Step 1: Get Your OpenRouter API Key

1. Go to https://openrouter.ai
2. Sign up or log in
3. Go to **Keys** section
4. Create a new API key
5. Copy your key

### Step 2: Configure in CF Studio

1. Open Cursor Settings (`Cmd+,` / `Ctrl+,`)
2. Search for: `codeforces.aiApiKey`
3. Paste your OpenRouter API key
4. Set `codeforces.aiProvider` to: `openrouter` (default)
5. Set `codeforces.aiModel` to your preferred model (see below)

### Step 3: Choose a Model

Popular models for code analysis:

- `openai/gpt-4` - Best overall (default)
- `openai/gpt-4-turbo` - Faster, cheaper
- `anthropic/claude-3-opus` - Excellent for code review
- `anthropic/claude-3-sonnet` - Good balance
- `google/gemini-pro` - Alternative option

See all models at: https://openrouter.ai/models

### Step 4: Use AI Analysis

1. Open a `main.cpp` file in a contest directory
2. Click the ✨ (sparkle) button
3. Or use `Cmd+Shift+P` → `AI Analysis`
4. Get instant code review!

## Configuration Example

```json
{
  "codeforces.aiProvider": "openrouter",
  "codeforces.aiApiKey": "sk-or-v1-your-key-here",
  "codeforces.aiModel": "openai/gpt-4"
}
```

## Pricing

OpenRouter uses pay-as-you-go pricing. Check current rates at:
https://openrouter.ai/models

Most code analysis requests cost just a few cents.

## Troubleshooting

**"API key not configured"**

- Make sure you've set `codeforces.aiApiKey` in settings
- Check the key is correct (starts with `sk-or-v1-`)

**"API request failed"**

- Check your OpenRouter account has credits
- Verify the model name is correct
- Check Output channel for detailed errors

**Want to use a different provider?**

- Set `codeforces.aiProvider` to `openai` or `anthropic`
- Use the respective API keys

## Benefits of OpenRouter

- **Flexibility**: Switch between models easily
- **Cost-effective**: Pay only for what you use
- **No vendor lock-in**: Access multiple providers
- **Easy setup**: One key, multiple models

Enjoy AI-powered code analysis with CF Studio! 🚀
