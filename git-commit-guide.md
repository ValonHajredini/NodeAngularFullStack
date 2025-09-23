# Git Commit Guide

This guide explains how to commit changes in this project, including the various scripts and hooks
configured.

## Quick Commit Commands

### Standard Commit (with all checks)

```bash
git add .
git commit -m "Your commit message"
```

### Skip Pre-commit Checks (when needed)

```bash
git commit --no-verify -m "Your commit message"
```

## Pre-commit Hooks

This project uses Husky for pre-commit hooks that automatically run:

1. **Linting** - ESLint for TypeScript/JavaScript files
2. **Formatting** - Prettier for code formatting
3. **Security Audit** - Checks for vulnerabilities in dependencies
4. **TypeScript Checking** - Type validation for all TypeScript files

## Commit Message Format

Follow this format for clear commit messages:

```
<type>: <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, semicolons, etc)
- **refactor**: Code refactoring
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **build**: Build system or dependency changes
- **ci**: CI/CD configuration changes
- **chore**: Maintenance tasks

### Examples

#### Simple commit

```bash
git commit -m "fix: resolve JWT token expiration issue"
```

#### Detailed commit with body

```bash
git commit -m "feat: add user authentication system

- Implement JWT-based authentication
- Add login/logout endpoints
- Create auth middleware
- Add refresh token support"
```

#### Multi-line commit using heredoc

```bash
git commit -m "$(cat <<'EOF'
fix: resolve development environment setup issues

- Add dotenv configuration to load environment variables
- Fix JWT expiration format handling
- Update config validation schema
- Add comprehensive documentation

This resolves backend startup issues and authentication errors.
EOF
)"
```

## Package.json Scripts for Quality Checks

Run these manually before committing:

```bash
# Run all quality checks
npm run quality:check

# Individual checks
npm run lint          # Lint all code
npm run typecheck     # TypeScript type checking
npm run format:check  # Check formatting
npm run security:audit # Security vulnerability scan
```

## Dealing with Pre-commit Hook Failures

### TypeScript Errors

If TypeScript checking fails:

```bash
# Check specific errors
npm run typecheck

# Fix issues, then commit
git add .
git commit -m "Your message"

# Or skip if errors are not critical
git commit --no-verify -m "Your message"
```

### Linting Errors

```bash
# Auto-fix linting issues
npm run lint:fix

# Then commit
git add .
git commit -m "Your message"
```

### Security Vulnerabilities

```bash
# View detailed audit
npm audit

# Fix vulnerabilities
npm audit fix

# Force fix (use carefully)
npm audit fix --force
```

## Git Workflow Best Practices

### 1. Before Starting Work

```bash
git pull origin main
git checkout -b feature/your-feature-name
```

### 2. Making Changes

```bash
# Make your changes
# Test locally
npm test

# Check everything works
npm run quality:check
```

### 3. Committing Changes

```bash
# Stage specific files
git add src/specific-file.ts

# Or stage all changes
git add .

# Commit with descriptive message
git commit -m "feat: implement new feature"
```

### 4. Pushing Changes

```bash
git push origin feature/your-feature-name
```

### 5. Creating Pull Request

```bash
# Using GitHub CLI
gh pr create --title "Feature: Your feature" --body "Description"

# Or push and create PR via GitHub web interface
git push origin feature/your-feature-name
```

## Troubleshooting

### Pre-commit hook takes too long

```bash
# Skip hooks temporarily
git commit --no-verify -m "wip: work in progress"

# Fix issues later
npm run quality:check
git add .
git commit --amend
```

### Husky not working

```bash
# Reinstall husky
npx husky install

# Re-run prepare script
npm run prepare
```

### Need to commit without running tests

```bash
# Use --no-verify flag
git commit --no-verify -m "Your urgent fix"
```

## Environment-specific Files

Remember that `.env` files are gitignored. Never commit:

- `apps/api/.env`
- `.env.local`
- Any file with real credentials

Instead, update `.env.example` files with dummy values.

## Automated CI/CD

After pushing, GitHub Actions will:

1. Run tests
2. Check code quality
3. Build the project
4. Deploy (if configured)

Monitor the Actions tab in GitHub to ensure your commit passes all checks.
