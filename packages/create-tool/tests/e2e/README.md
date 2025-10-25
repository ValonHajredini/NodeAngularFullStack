# End-to-End (E2E) Tests for Create Tool CLI

Comprehensive E2E tests that validate the complete CLI tool generation workflow, from user input
through file generation, backend index updates, API registration, and code quality validation.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Running Tests Locally](#running-tests-locally)
- [Test Suites](#test-suites)
- [Debugging Failed Tests](#debugging-failed-tests)
- [Common Failures & Solutions](#common-failures--solutions)
- [CI/CD Integration](#cicd-integration)
- [Test Architecture](#test-architecture)
- [Performance Expectations](#performance-expectations)

---

## Overview

These E2E tests validate 8 acceptance criteria (AC1-AC8) for the CLI tool generation feature:

1. **AC1**: E2E test framework setup (Jest, utilities, global setup/teardown)
2. **AC2**: Full CLI workflow (file generation, content validation, index updates)
3. **AC3**: API registration integration (database persistence, cache updates)
4. **AC4**: Conflict handling (duplicate tools, --force, --skip-existing flags)
5. **AC5**: Generated tool smoke tests (typecheck, lint, build validation)
6. **AC6**: Error scenario tests (invalid inputs, network failures, permissions)
7. **AC7**: CI/CD pipeline integration (GitHub Actions workflow)
8. **AC8**: Test coverage & documentation (this README)

**Test Statistics**:

- **34+ E2E test cases** across 5 test suites
- **70+ utility unit tests** (TestWorkspace class)
- **≥80% coverage** for E2E utilities
- **≤5 minute execution time** for full suite

---

## Prerequisites

Before running E2E tests, ensure you have:

### 1. PostgreSQL Database

```bash
# Install PostgreSQL 15+ (macOS)
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Verify PostgreSQL is running
pg_isready

# Create test database (if not exists)
createdb test_db
```

### 2. Redis (Optional but Recommended)

```bash
# Install Redis (macOS)
brew install redis

# Start Redis service
brew services start redis

# Verify Redis is running
redis-cli ping
# Expected output: PONG
```

### 3. Node.js Dependencies

```bash
# From project root
npm install

# Build shared package (required before tests)
npm run build:shared
```

### 4. Environment Configuration

Create `.env.e2e` file in `packages/create-tool/`:

```bash
# Database
DATABASE_URL=postgresql://test_user:test_password@localhost:5432/test_db

# API
API_BASE_URL=http://localhost:3000

# Admin credentials for registration tests
CREATE_TOOL_ADMIN_EMAIL=e2e-admin@example.com
CREATE_TOOL_ADMIN_PASSWORD=E2eAdmin123!@#

# CLI options
CREATE_TOOL_WORKSPACE=/tmp/create-tool-e2e

# Timeouts
CLI_TIMEOUT=60000
API_TIMEOUT=30000

# Environment
NODE_ENV=test
```

**Security Note**: Never commit `.env.e2e` with real credentials. Use test-only credentials.

---

## Running Tests Locally

### 1. Prepare Environment

```bash
# Start PostgreSQL and Redis
brew services start postgresql@15
brew services start redis

# Run database migrations
npm --workspace=apps/api run db:migrate

# Seed database with test data
npm --workspace=apps/api run db:seed
```

### 2. Start Backend API Server

```bash
# In one terminal window
npm --workspace=apps/api run dev

# Wait for server to start (you should see "Server listening on port 3000")
```

### 3. Run E2E Tests

```bash
# In another terminal window
cd packages/create-tool

# Run all E2E tests
npm run test:e2e

# Run specific test suite
npm run test:e2e -- full-workflow.e2e.test.ts
npm run test:e2e -- registration.e2e.test.ts
npm run test:e2e -- conflict-handling.e2e.test.ts
npm run test:e2e -- smoke-tests.e2e.test.ts
npm run test:e2e -- error-scenarios.e2e.test.ts

# Run single test by name
npm run test:e2e -- --testNamePattern="should generate tool with all files"

# Run with coverage report
npm run test:e2e:coverage

# Run in watch mode (auto-rerun on file changes)
npm run test:e2e:watch

# Run in debug mode (attach debugger)
npm run test:e2e:debug
```

### 4. Expected Output (Success)

```
🧪 E2E Test Suite Setup

✓ Admin user seeded: e2e-admin@example.com
✓ Test tools cleared from registry
✓ E2E setup complete

PASS tests/e2e/full-workflow.e2e.test.ts (45.2s)
  ✓ should generate tool with all files (42s)
  ✓ should register tool with API (30s)
  ✓ should error on duplicate tool ID (25s)
  ...

PASS tests/e2e/smoke-tests.e2e.test.ts (120.5s)
  ✓ should build shared package successfully (60s)
  ✓ should typecheck backend files without errors (30s)
  ...

Test Suites: 5 passed, 5 total
Tests:       34 passed, 34 total
Time:        180s (~3 minutes)

🧹 E2E Test Suite Teardown

✓ Test data cleaned up
✓ Test workspaces cleaned
✓ E2E teardown complete
```

---

## Test Suites

### 1. Full Workflow Tests (`full-workflow.e2e.test.ts`)

**Purpose**: Validate end-to-end CLI execution from prompts to file generation.

**Tests**:

- Generate tool with all files (9 files: component, service, routes, controller, etc.)
- Validate file contents match expected patterns
- Verify backend index files updated with new exports
- Test tool name with spaces (converted to kebab-case)
- Test minimal configuration (default values)
- Test comprehensive configuration (all features, permissions)

**Duration**: ~45 seconds

### 2. API Registration Tests (`registration.e2e.test.ts`)

**Purpose**: Validate tool registration with backend API.

**Tests**:

- Register tool with `--register` flag
- Verify tool saved in database (`tool_registry` table)
- Check registration cache updated (`~/.create-tool/registrations.json`)
- Validate manifest JSON structure
- Test `--skip-registration` flag (files generated, no API call)
- Handle offline API (files generated, registration warning)
- Handle invalid credentials (clear error message)
- Handle duplicate tool registration (409 Conflict)

**Duration**: ~30 seconds

### 3. Conflict Handling Tests (`conflict-handling.e2e.test.ts`)

**Purpose**: Validate behavior when regenerating existing tools.

**Tests**:

- Error on duplicate tool ID (without flags)
- Overwrite with `--force` flag (backup created)
- Skip existing files with `--skip-existing` flag (modified files preserved)
- Handle partial conflicts (some files exist, others don't)
- Validate backup directory naming
- Test conflict detection for each file type

**Duration**: ~25 seconds

### 4. Smoke Tests (`smoke-tests.e2e.test.ts`)

**Purpose**: Validate generated code quality (compiles, lints, builds).

**Tests**:

- Build shared package successfully
- Typecheck backend files (no TypeScript errors)
- Typecheck frontend files (no TypeScript errors)
- Lint backend files (no ESLint errors)
- Lint frontend files (no ESLint errors)
- Comprehensive workflow (all quality checks pass)

**Duration**: ~120 seconds (longest test suite due to build/typecheck)

### 5. Error Scenario Tests (`error-scenarios.e2e.test.ts`)

**Purpose**: Validate graceful error handling for edge cases.

**Tests**:

- Reject uppercase tool ID (validation error)
- Reject tool ID with underscores (validation error)
- Reject tool ID with special characters (validation error)
- Handle missing admin credentials (clear error)
- Handle network failure during registration (warning, files generated)
- Handle database connection failure (warning, files generated)
- Handle file system permission errors (clear error)
- Reject empty tool name (validation error)
- Reject tool ID too short (< 3 characters)
- Reject tool ID too long (> 50 characters)
- Handle invalid icon name (fallback to default or error)

**Duration**: ~60 seconds

---

## Debugging Failed Tests

### Method 1: Inspect Test Output

```bash
# Run tests with verbose output
npm run test:e2e -- --verbose

# Check stdout/stderr for error messages
npm run test:e2e 2>&1 | tee test-output.log
```

### Method 2: Inspect Generated Files

After a test failure, inspect the test workspace:

```bash
# List test workspace directories
ls -la /tmp/create-tool-e2e/

# Navigate to test workspace (UUID-based directory)
cd /tmp/create-tool-e2e/<uuid>

# Inspect generated files
cat apps/web/src/app/features/test-tool/test-tool.component.ts
cat apps/api/src/controllers/test-tool.controller.ts

# Check backend index files
cat apps/api/src/services/index.ts
cat apps/api/src/controllers/index.ts
```

### Method 3: Debug with Chrome DevTools

```bash
# Run test in debug mode
npm run test:e2e:debug -- --testNamePattern="should register tool with API"

# Chrome DevTools opens automatically
# Set breakpoints in test files or utilities
# Step through CLI execution line by line
```

### Method 4: Check Database State

```bash
# Connect to test database
psql postgresql://test_user:test_password@localhost:5432/test_db

# Query tool registry
SELECT * FROM tool_registry WHERE tool_id LIKE 'e2e-test-%';

# Query admin user
SELECT * FROM users WHERE email = 'e2e-admin@example.com';

# Exit psql
\q
```

### Method 5: Check API Server Logs

```bash
# In terminal running API server, check for errors
# Look for:
# - Database connection errors
# - Authentication failures
# - Validation errors
# - 500 Internal Server Errors
```

---

## Common Failures & Solutions

### ❌ "Database connection failed"

**Cause**: PostgreSQL not running or wrong credentials.

**Solution**:

```bash
# Check PostgreSQL status
brew services list

# Start PostgreSQL
brew services start postgresql@15

# Verify connection
psql postgresql://test_user:test_password@localhost:5432/test_db

# If database doesn't exist, create it
createdb test_db
```

---

### ❌ "API server not reachable"

**Cause**: Backend API server not running.

**Solution**:

```bash
# Start API server in separate terminal
npm --workspace=apps/api run dev

# Wait for "Server listening on port 3000" message
# Then re-run tests
```

---

### ❌ "Admin user not found" or "Authentication failed"

**Cause**: Database not seeded with admin user.

**Solution**:

```bash
# Run database migrations
npm --workspace=apps/api run db:migrate

# Seed database
npm --workspace=apps/api run db:seed

# Verify admin user exists
psql test_db -c "SELECT * FROM users WHERE email = 'admin@example.com';"
```

---

### ❌ "Shared package not built"

**Cause**: `@nodeangularfullstack/shared` package not compiled.

**Solution**:

```bash
# Build shared package
npm run build:shared

# Verify build output exists
ls -la packages/shared/dist/
```

---

### ❌ "Test timeout after 60000ms"

**Cause**: Tests taking longer than expected (slow machine, heavy load).

**Solution**:

```bash
# Increase timeout in jest.e2e.config.js
# testTimeout: 120000 (2 minutes instead of 1 minute)

# Or run tests with increased timeout
npm run test:e2e -- --testTimeout=120000
```

---

### ❌ "File permission denied (EACCES)"

**Cause**: Test workspace directory is read-only or lacks permissions.

**Solution**:

```bash
# Remove old test workspace
rm -rf /tmp/create-tool-e2e

# Verify /tmp is writable
touch /tmp/test-write && rm /tmp/test-write

# Re-run tests
npm run test:e2e
```

---

### ❌ "CLI execution timeout"

**Cause**: CLI hanging on prompts (Inquirer not receiving answers).

**Solution**:

- Check `CliRunner.provideAnswers()` method
- Ensure prompt detection strings match actual CLI prompts
- Add debug logging to see what prompts CLI is showing
- Verify CLI is running in non-interactive mode

---

### ❌ "Tests pass locally but fail in CI"

**Cause**: Environment differences (Node version, database version, etc.).

**Solution**:

```bash
# Check Node version matches CI (Node 20)
node --version

# Check PostgreSQL version matches CI (PostgreSQL 15)
psql --version

# Verify .env.e2e is not committed
git status packages/create-tool/.env.e2e

# Check GitHub Actions logs for specific error messages
```

---

### ❌ "Jest warning: 'A worker process has failed to exit gracefully'"

**Cause**: Database connections or file handles not properly closed.

**Solution**:

- Ensure `DatabaseSeeder.close()` is called in `globalTeardown()`
- Verify `TestWorkspace.cleanup()` removes all files
- Add `--forceExit` flag as last resort:
  ```bash
  npm run test:e2e -- --forceExit
  ```

---

## CI/CD Integration

E2E tests run automatically in GitHub Actions workflow (`.github/workflows/create-tool-e2e.yml`).

### Workflow Triggers

- **Pull Requests** to `main` or `develop` branches
- **Pushes** to `main` or `develop` branches
- **Manual dispatch** via GitHub Actions UI

### Workflow Steps

1. **Setup**: Checkout code, setup Node.js 20, install dependencies
2. **Build**: Build shared package
3. **Database**: Run migrations and seed test data
4. **API Server**: Start backend API in background
5. **Tests**: Run all 5 E2E test suites sequentially
6. **Cleanup**: Stop API server, clean test workspace
7. **Artifacts**: Upload test results and generated files (on failure)

### Viewing Test Results in CI

1. Navigate to **Actions** tab in GitHub repository
2. Click on **E2E Tests - Create Tool CLI** workflow
3. Click on specific workflow run
4. View test output in **e2e-cli-tests** job logs
5. Download artifacts (if tests failed):
   - `create-tool-e2e-test-results` (coverage reports)
   - `create-tool-e2e-artifacts` (generated files, logs)

### Required for PR Merge

E2E tests **must pass** before pull requests can be merged. This is enforced via branch protection
rules.

---

## Test Architecture

### Utility Classes

#### 1. TestWorkspace (`utils/test-workspace.ts`)

Manages isolated test workspaces for each test.

**Methods**:

- `create()`: Create UUID-based workspace directory
- `getPath(relativePath)`: Get absolute path within workspace
- `writeFile(path, content)`: Write file to workspace
- `readFile(path)`: Read file from workspace
- `listFiles()`: Recursively list all files
- `checkFileExists(path)`: Verify file exists
- `createBackup()`: Backup workspace for --force tests
- `cleanup()`: Remove workspace directory

**Unit Tests**: 70+ test cases covering all methods and edge cases

#### 2. CliRunner (`utils/cli-runner.ts`)

Executes CLI commands programmatically with answer automation.

**Methods**:

- `run(options)`: Execute CLI with prompt answers and flags
- `provideAnswers()`: Automatically answer Inquirer prompts
- `expectSuccess(result)`: Assert CLI exited with code 0
- `expectError(result, message?)`: Assert CLI failed with error message

**Features**:

- Timeout handling (default 30s, configurable)
- Stdout/stderr capture
- Exit code validation
- Duration measurement

#### 3. DatabaseSeeder (`utils/database.ts`)

Manages test database state and authentication.

**Methods**:

- `seedAdminUser()`: Create admin user for registration tests
- `clearToolRegistry()`: Remove test tools from database
- `getAuthToken(email, password)`: Authenticate and get JWT token
- `verifyToolRegistered(toolId)`: Check if tool exists in database
- `getToolById(toolId)`: Fetch tool record from database
- `checkConnection()`: Verify database connectivity
- `cleanup()`: Remove test data from database

**Best Practices**:

- Uses parameterized queries (SQL injection safe)
- Retry logic for transient failures
- Connection pooling for performance

### Global Setup & Teardown

**`setup.ts`** (runs once before all tests):

- Check database connection
- Seed admin user
- Clear old test tools from registry

**`teardown.ts`** (runs once after all tests):

- Clean up test data from database
- Remove all test workspaces from `/tmp`
- Close database connections

---

## Performance Expectations

### Execution Time Targets

| Test Suite        | Target   | Typical  | Max Acceptable   |
| ----------------- | -------- | -------- | ---------------- |
| Full Workflow     | 45s      | 42s      | 60s              |
| Registration      | 30s      | 28s      | 45s              |
| Conflict Handling | 25s      | 23s      | 40s              |
| Smoke Tests       | 120s     | 115s     | 180s             |
| Error Scenarios   | 60s      | 55s      | 90s              |
| **TOTAL**         | **280s** | **263s** | **300s (5 min)** |

### Performance Tips

1. **Run tests in parallel** (not implemented yet, future enhancement)
2. **Use database connection pooling** (already implemented)
3. **Cache shared package builds** (already done in CI)
4. **Run smoke tests last** (slowest suite, fail fast on other tests)
5. **Skip smoke tests in local dev** (run only before PR submission)

### Monitoring Performance

```bash
# Run tests with duration reporting
npm run test:e2e -- --verbose

# Each test shows duration in output:
# ✓ should generate tool with all files (42s)

# If tests exceed 5 minutes, investigate:
# - Slow database queries
# - Network timeouts
# - File I/O bottlenecks
# - Unnecessary retries
```

---

## Troubleshooting Resources

- **Main Project README**: `../../README.md` (setup instructions)
- **Create Tool README**: `../README.md` (CLI usage guide)
- **Architecture Docs**: `docs/architecture/` (system design)
- **QA Gates**: `docs/qa/gates/31.2.5-end-to-end-cli-tests.yml` (quality criteria)

For additional help, consult:

- GitHub Issues for known problems
- Team documentation for project-specific setup
- Jest documentation for debugging test framework issues

---

## Contributing

When adding new E2E tests:

1. **Follow naming conventions**: `*.e2e.test.ts` for test files
2. **Use test utilities**: `TestWorkspace`, `CliRunner`, `DatabaseSeeder`
3. **Clean up resources**: Always call `cleanup()` in `afterEach` hooks
4. **Set appropriate timeouts**: Use 60s-120s for individual tests
5. **Write descriptive test names**: "should do X when Y" format
6. **Add JSDoc comments**: Document test purpose and acceptance criteria
7. **Update this README**: Document new test suites and common failures

---

**Last Updated**: 2025-10-25 **Story**: 31.2.5 - End-to-End CLI Tests **Maintainer**: Backend
Developer Team
