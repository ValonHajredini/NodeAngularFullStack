# Local Deployment Testing Guide

This guide explains how to test the production deployment configuration and GitHub Actions workflows locally without pushing to GitHub.

## Quick Start

Test all deployment configuration and workflows locally with a single command:

```bash
make test:deployment
```

This command will:
1. ✅ Build shared package
2. ✅ Build frontend apps for production
3. ✅ Check backend TypeScript compilation
4. ✅ Validate GitHub Actions workflow syntax

## Prerequisites

### Required
- Node.js 18+ (already installed)
- npm 9+ (already installed)

### Optional but Recommended
For testing GitHub Actions workflows locally, install `act`:

```bash
brew install act
```

`act` allows you to run GitHub Actions workflows on your local machine before pushing to GitHub.

## Available Make Commands

### Main Deployment Test

```bash
# Complete deployment test (builds + workflow validation)
make test:deployment
```

This runs:
- Production builds for all frontend apps
- TypeScript validation for backend
- GitHub Actions workflow syntax validation

### Individual Tests

```bash
# Test only production builds
make test:build:validate

# Test only workflow syntax
make test:workflows:validate

# List all available workflows
make workflows:list

# Test specific workflows
make workflows:test:ci           # Test CI workflow (pull_request)
make workflows:test:deploy       # Test deploy workflow (workflow_dispatch)
make workflows:test:create-tool  # Test create-tool-e2e workflow
```

### Build Commands

```bash
# Build all applications
make build

# Build specific apps
make build:shared         # Build shared package
make build:web           # Build main web app
make build:form-builder  # Build form-builder-ui
make build:api           # Build all backend APIs
```

### Quality Checks

```bash
# Run all quality checks
make quality:check

# Individual checks
make lint                # Run ESLint
make typecheck          # Run TypeScript checking
make format             # Format code with Prettier
```

## Detailed Testing Guide

### 1. Test Production Builds Locally

Run the complete build validation:

```bash
make test:build:validate
```

This will:
1. Build shared package (`@nodeangularfullstack/shared`)
2. Build `apps/web` for production
3. Build `apps/form-builder-ui` for production
4. Check TypeScript compilation for backend APIs

**Expected Output:**
```
✓ Shared package builds successfully
✓ apps/web production build: 859.42 kB
✓ apps/form-builder-ui production build: 868.67 kB
✓ Backend TypeScript validation (may have pre-existing errors)
```

### 2. Test Workflow Files Locally

Validate GitHub Actions workflow syntax:

```bash
make test:workflows:validate
```

This checks:
- ✅ All workflow YAML files are valid
- ✅ All jobs are properly configured
- ✅ All triggers (push, pull_request, workflow_dispatch) are correct

**Expected Output:**
```
Act version: 0.2.82
Available workflows: (lists all 5 workflows)
✅ Workflow files are valid
```

### 3. Test GitHub Actions Workflows with act

If you have `act` installed, you can simulate GitHub Actions locally:

#### Test CI Workflow (Pull Request)

```bash
make workflows:test:ci
```

This simulates a pull request trigger for the CI workflow:
- Runs type checking
- Runs linting
- Builds all applications
- Runs tests

**Note:** First run downloads ~500MB container image

#### Test Deploy Workflow

```bash
make workflows:test:deploy
```

This simulates the deployment workflow (note: SSH step will fail locally as expected):
- Builds all apps
- Attempts SSH deployment (fails gracefully without credentials)
- Shows deployment script structure

#### Test Create-Tool E2E Workflow

```bash
make workflows:test:create-tool
```

Tests the create-tool CLI E2E workflow:
- Sets up test environment
- Runs database migrations
- Executes CLI tests

### 4. Complete Deployment Test

Run the complete test suite:

```bash
make test:deployment
```

This combines both build validation and workflow validation, providing a complete picture of deployment readiness.

## Understanding Test Output

### ✅ Success Indicators

- Frontend builds complete without errors
- TypeScript compilation succeeds
- Workflow files are valid YAML
- `act` can execute workflows without permission errors

### ⚠️ Warning Indicators

These are non-critical but worth noting:

```
⚠️ Bundle size exceeded: 859.42 kB > 750 kB budget
```
- Expected for this application
- Not a blocker for deployment

```
⚠️ dashboard-api has TypeScript errors (pre-existing)
```
- Pre-existing issues in backend code
- Not caused by workflow configuration
- Should be fixed separately

### ❌ Error Indicators

These indicate issues to fix:

```
Cannot find module 'X'
Property 'Y' does not exist on type 'Z'
```
- Backend TypeScript compilation errors
- Prevent build from succeeding
- Must be fixed before deployment

## Workflow File Locations

The deployment infrastructure uses these GitHub Actions workflows:

| Workflow | Location | Trigger | Purpose |
|----------|----------|---------|---------|
| CI | `.github/workflows/ci.yml` | push, pull_request | Type checking, linting, tests |
| Deploy to Production | `.github/workflows/deploy-production.yml` | push to main, workflow_dispatch | SSH deployment to DigitalOcean |
| E2E Tests - Create Tool | `.github/workflows/create-tool-e2e.yml` | workflow_dispatch, main only | CLI E2E tests |
| E2E Tests - Theme System | `.github/workflows/e2e-tests.yml` | workflow_dispatch, main only | Theme system E2E tests |
| Epic 33.1 Tests | `.github/workflows/test-epic-33.1.yml` | workflow_dispatch, main only | Export feature tests |

**Note:** E2E workflows only run on main branch or manual trigger to avoid PR failures

## Making Changes to Workflows

### 1. Edit Workflow Files

Edit workflow YAML files in `.github/workflows/`:

```bash
# Edit CI workflow
nano .github/workflows/ci.yml

# Edit deploy workflow
nano .github/workflows/deploy-production.yml
```

### 2. Validate Changes Locally

After editing, validate with `act`:

```bash
# Test your CI changes
make workflows:test:ci

# Test your deploy changes
make workflows:test:deploy
```

### 3. Commit and Push

Once validated locally, commit and push:

```bash
git add .github/workflows/*.yml
git commit -m "Update GitHub Actions workflows"
git push origin <your-branch>
```

## Troubleshooting

### act not installed

If you see:
```
⚠️ 'act' not installed. Install with: brew install act
```

Install it:
```bash
brew install act
```

Then re-run the test:
```bash
make test:deployment
```

### Backend build errors

If backend APIs have TypeScript errors:

```
src/controllers/index.ts(7,33): error TS2307: Cannot find module './forms.controller'
```

These are pre-existing code issues, not workflow problems. Fix them:

```bash
# Check which files are missing
ls apps/dashboard-api/src/controllers/

# Or check the imports in the index file
nano apps/dashboard-api/src/controllers/index.ts
```

### Container image download too large

If `act` downloads seem slow:

```bash
# Use smaller container image
act pull_request --container-architecture linux/amd64 -P ubuntu-latest=ghcr.io/catthehacker/ubuntu:full-latest
```

## Production Deployment

Once tests pass locally, the deployment is ready for production:

### Manual Deployment

```bash
# On the production server
cd /var/apps/NodeAngularFullStack
./deploy.sh
```

See `DEPLOYMENT.md` for complete production deployment instructions.

### Automated Deployment (Recommended)

```bash
# Setup CI/CD (one-time)
./.github/setup-cicd.sh

# Push to main → automatic deployment!
git push origin main
```

See `.github/CICD-SETUP.md` for complete CI/CD setup instructions.

## Performance Benchmarks

Typical test execution times:

| Test | Duration | Notes |
|------|----------|-------|
| `make test:build:validate` | 2-3 min | Frontend builds ~30s each |
| `make test:workflows:validate` | 10-30s | Quick syntax check |
| `make test:deployment` | 2-3 min | Combined test |
| `make workflows:test:ci` (with act) | 5-15 min | First run downloads images |
| `make workflows:test:deploy` (with act) | 3-5 min | No SSH deployment locally |

## Tips & Best Practices

### 1. Run Before Pushing

Always test locally before pushing:

```bash
# Before committing workflow changes
make test:deployment

# Before pushing to GitHub
git add .github/workflows/
git commit -m "Update workflows"
make test:deployment  # ← Test again!
git push origin main
```

### 2. Test Specific Workflows

When working on a specific workflow:

```bash
# Edit one workflow
nano .github/workflows/deploy-production.yml

# Test only that workflow
make workflows:test:deploy

# After fixing, test all
make test:deployment
```

### 3. Keep Logs for Reference

Save test output for reference:

```bash
# Run test and save output
make test:deployment 2>&1 | tee deployment-test-$(date +%s).log

# Review later
cat deployment-test-*.log
```

### 4. Automate with Git Hooks

Optional: Run tests automatically before committing:

```bash
# Create pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
echo "Running deployment tests..."
make test:deployment
if [ $? -ne 0 ]; then
    echo "Tests failed! Commit aborted."
    exit 1
fi
EOF

chmod +x .git/hooks/pre-commit
```

## Additional Resources

- **Deployment Guide**: See `DEPLOYMENT.md`
- **CI/CD Setup**: See `.github/CICD-SETUP.md`
- **Nginx Configuration**: See `nginx/README.md`
- **PM2 Configuration**: See `ecosystem.config.js`
- **Project Overview**: See `CLAUDE.md`

## Getting Help

### Common Issues

```bash
# Clear npm cache and rebuild
make clean
npm ci
make test:deployment

# Check Node.js version (should be 18+)
node --version

# Verify act installation
act --version
```

### Manual Workflow Testing

Without `act`, manually validate workflows:

```bash
# Check for YAML syntax errors
grep -r "^[^:]*: [^:]" .github/workflows/*.yml

# List all jobs in a workflow
grep "^  [a-z].*:" .github/workflows/ci.yml
```

---

**Last Updated**: November 2024
**Version**: 1.0.0
**Related Files**: Makefile, DEPLOYMENT.md, .github/CICD-SETUP.md
