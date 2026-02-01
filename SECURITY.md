# Security Policy

## 🔒 Supported Versions

We release patches for security vulnerabilities. Which versions are eligible for receiving such patches depends on the CVSS v3.0 Rating:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## 🚨 Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via one of the following methods:

- **Email**: rodriguescarson@gmail.com
- **GitHub Security Advisory**: Use the [Security tab](https://github.com/rodriguescarson/cp-studio-ai/security/advisories/new) in the repository

### What to Include

When reporting a security vulnerability, please include:

1. **Description**: Clear description of the vulnerability
2. **Steps to Reproduce**: Detailed steps to reproduce the issue
3. **Impact**: Potential impact of the vulnerability
4. **Suggested Fix**: If you have ideas on how to fix it
5. **Affected Versions**: Which versions are affected

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity (typically 30-90 days)

### Severity Levels

- **Critical**: Remote code execution, data breach, authentication bypass
- **High**: Privilege escalation, sensitive data exposure
- **Medium**: Information disclosure, denial of service
- **Low**: Minor security improvements

## 🔐 Security Best Practices

### For Users

1. **Keep CP Studio Updated**: Always use the latest version
2. **Protect API Keys**: Never share your API keys publicly
3. **Review Code**: Since CP Studio is open source, review code before using
4. **Report Issues**: Report security issues responsibly

### For Contributors

1. **Follow Secure Coding Practices**: Validate all inputs
2. **Never Commit Secrets**: Use environment variables or secure storage
3. **Review Dependencies**: Keep dependencies updated
4. **Security Audits**: Run security audits on dependencies

## 🛡️ Security Features

CP Studio implements the following security measures:

- ✅ **No Data Collection**: Extension doesn't collect or store user data
- ✅ **Local Storage**: All data stays on your machine
- ✅ **Encrypted Keys**: API keys stored securely in VS Code settings
- ✅ **HTTPS Only**: All API calls use secure connections
- ✅ **BYOK Model**: You provide your own API keys
- ✅ **Open Source**: Code is transparent and auditable

## 📋 Known Security Considerations

### API Keys

- API keys are stored in VS Code settings (encrypted by VS Code)
- Keys are never transmitted except to the API provider you configure
- Use environment variables for CI/CD environments

### External APIs

- CP Studio makes requests to:
  - Codeforces API (public, no auth required)
  - LeetCode (public scraping)
  - GeeksforGeeks (public scraping)
  - Your configured AI provider (OpenRouter, OpenAI, etc.)

### Code Execution

- Test runner compiles and executes C++ code locally
- Code execution happens in your local environment
- No remote code execution

## 🔍 Security Audit

To audit CP Studio's dependencies:

```bash
npm audit
```

To fix vulnerabilities:

```bash
npm audit fix
```

## 📧 Contact

For security concerns, contact: **rodriguescarson@gmail.com**

---

**Thank you for helping keep CP Studio secure!** 🔒
