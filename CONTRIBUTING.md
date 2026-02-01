# Contributing to CP Studio

Thank you for your interest in contributing to CP Studio! This document provides guidelines and instructions for contributing to the project.

## 🚀 Quick Start

1. **Fork and Clone**
   ```bash
   git clone https://github.com/rodriguescarson/cp-studio-ai.git
   cd cp-studio-ai
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build**
   ```bash
   npm run compile
   ```

4. **Run in Development**
   - Open in VS Code/Cursor
   - Press `F5` to launch Extension Development Host
   - Make changes and reload (`Cmd+R` / `Ctrl+R`)

## 📋 Development Setup

### Prerequisites

- **Node.js** 18+ and npm
- **VS Code** 1.80+ or **Cursor**
- **TypeScript** (installed via npm)
- **C++ Compiler** (for testing test runner)

### Project Structure

```
cp-studio-ai/
├── src/                    # TypeScript source files
│   ├── extension.ts        # Main entry point
│   ├── contestSetup.ts     # Problem setup logic
│   ├── testRunner.ts       # Test execution
│   ├── aiAnalyzer.ts       # AI integration
│   ├── chatView.ts         # Chat UI
│   ├── profileView.ts      # Profile dashboard
│   └── ...                 # Other modules
├── resources/              # Assets (logo, icons)
├── data/                   # Problem set data
│   ├── neetcode150.json
│   ├── striverssheet.json
│   └── ...
├── package.json            # Extension manifest
├── tsconfig.json           # TypeScript config
└── README.md               # Documentation
```

### Key Files

- **`src/extension.ts`**: Main activation and command registration
- **`src/contestSetup.ts`**: Handles problem setup from URLs
- **`src/testRunner.ts`**: Compiles and runs C++ code
- **`src/aiAnalyzer.ts`**: AI code analysis integration
- **`package.json`**: Extension configuration and commands

## 🎯 How to Contribute

### Reporting Bugs

1. **Check Existing Issues**: Search GitHub issues first
2. **Create Issue**: Use the bug report template
3. **Include**:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - OS and VS Code/Cursor version
   - Screenshots if relevant

### Suggesting Features

1. **Check Existing Requests**: Search for similar ideas
2. **Create Issue**: Use the feature request template
3. **Describe**:
   - Use case and problem it solves
   - Proposed solution
   - Alternatives considered

### Submitting Code

1. **Create Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make Changes**
   - Write clean, readable code
   - Follow existing code style
   - Add comments for complex logic
   - Update tests if applicable

3. **Test Thoroughly**
   - Test in Extension Development Host
   - Test across platforms (Codeforces, LeetCode, GeeksforGeeks)
   - Test edge cases
   - Verify error handling

4. **Commit**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```
   Use conventional commits:
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation
   - `refactor:` Code refactoring
   - `style:` Formatting
   - `test:` Tests
   - `chore:` Maintenance

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   - Open Pull Request on GitHub
   - Fill out PR template
   - Link related issues
   - Wait for review

## 📝 Code Guidelines

### TypeScript Style

- Use TypeScript for all new code
- Follow existing code patterns
- Use descriptive names
- Add JSDoc comments for public functions
- Handle errors gracefully

### Example Code Style

```typescript
/**
 * Sets up a problem from a URL
 * @param url The problem URL (Codeforces, LeetCode, or GeeksforGeeks)
 * @returns Promise that resolves when setup is complete
 */
async setupFromUrl(url: string): Promise<void> {
    try {
        // Implementation
    } catch (error: any) {
        vscode.window.showErrorMessage(`Setup failed: ${error.message}`);
        throw error;
    }
}
```

### File Naming

- Use camelCase for files: `contestSetup.ts`
- Use PascalCase for classes: `ContestSetup`
- Use descriptive names

### Error Handling

- Always use try-catch for async operations
- Show user-friendly error messages
- Log errors to output channel for debugging
- Don't swallow errors silently

## 🧪 Testing

### Manual Testing

1. **Launch Extension Development Host** (`F5`)
2. **Test Core Features**:
   - Setup problem from URL
   - Run tests
   - AI analysis
   - Profile view
   - Chat interface

3. **Test Across Platforms**:
   - Codeforces problems
   - LeetCode problems
   - GeeksforGeeks problems

4. **Test Edge Cases**:
   - Invalid URLs
   - Network errors
   - Missing files
   - Invalid code

### Testing Checklist

- [ ] Code compiles without errors
- [ ] Extension loads in Development Host
- [ ] Core features work as expected
- [ ] Error handling works correctly
- [ ] UI updates properly
- [ ] No console errors

## 📚 Resources

- **VS Code Extension API**: https://code.visualstudio.com/api
- **TypeScript Docs**: https://www.typescriptlang.org/docs/
- **VS Code Extension Samples**: https://github.com/microsoft/vscode-extension-samples
- **Conventional Commits**: https://www.conventionalcommits.org/

## 🤝 Code Review Process

1. **Submit PR**: Create pull request with clear description
2. **Automated Checks**: Wait for CI checks (if configured)
3. **Review**: Maintainers will review your code
4. **Feedback**: Address any requested changes
5. **Approval**: Once approved, PR will be merged

### PR Best Practices

- Keep PRs focused (one feature/fix per PR)
- Write clear PR descriptions
- Include screenshots for UI changes
- Reference related issues
- Respond to feedback promptly

## 🎨 Areas for Contribution

### High Priority

- **New Platform Support**: Add support for more competitive programming platforms
- **UI/UX Improvements**: Better user experience
- **Performance**: Optimize slow operations
- **Error Handling**: Better error messages and recovery

### Medium Priority

- **Documentation**: Improve docs and add examples
- **Testing**: Add automated tests
- **Accessibility**: Improve accessibility
- **Internationalization**: Add multi-language support

### Nice to Have

- **Themes**: Custom theme support
- **Plugins**: Plugin system for extensibility
- **Analytics**: Usage analytics (privacy-preserving)
- **Tutorials**: Interactive tutorials

## 📧 Getting Help

- 💬 [GitHub Discussions](https://github.com/rodriguescarson/cp-studio-ai/discussions)
- 🐛 [GitHub Issues](https://github.com/rodriguescarson/cp-studio-ai/issues)
- 📧 Email: rodriguescarson@gmail.com

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🙏 Thank You!

Thank you for contributing to CP Studio! Your contributions help make competitive programming more accessible and enjoyable for everyone.

---

**Happy Coding!** 🚀
