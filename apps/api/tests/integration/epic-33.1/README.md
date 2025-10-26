# Epic 33.1 Integration Tests

Comprehensive integration tests for Epic 33.1 Export Core Infrastructure.

## Overview

This directory contains integration tests that validate the complete export infrastructure
including:

- Export Orchestrator Service
- Export Jobs Database Schema
- Export Job Status Tracking
- Pre-flight Validation
- API Endpoints
- Error Handling and Rollback
- Concurrent Export Operations
- Filesystem Operations
- Performance Benchmarks

## Test Architecture

```
epic-33.1/
├── setup.ts                          # Test environment setup
├── teardown.ts                       # Test cleanup
├── helpers.ts                        # Test utility functions
├── db-helper.ts                      # Database helper class
├── export-workflow.test.ts           # Complete export workflow tests
├── export-strategies.test.ts         # Export strategy tests
├── database-operations.test.ts       # Database integration tests
├── pre-flight-validation.test.ts     # Validation tests
├── api-endpoints.test.ts             # API endpoint tests
├── error-scenarios.test.ts           # Error handling tests
├── cancellation.test.ts              # Cancellation flow tests
├── concurrent-exports.test.ts        # Concurrent operation tests
├── filesystem-operations.test.ts     # Filesystem tests
└── README.md                         # This file
```

## Prerequisites

Before running Epic 33.1 integration tests, ensure:

1. **PostgreSQL 14+ is running**:

   ```bash
   brew services start postgresql@14
   # OR
   pg_ctl -D /usr/local/var/postgresql@14 start
   ```

2. **Test database exists**:

   ```bash
   createdb nodeangularfullstack
   ```

3. **Database migrations have been run**:

   ```bash
   npm --workspace=apps/api run db:migrate
   ```

4. **Test data has been seeded**:

   ```bash
   npm --workspace=apps/api run db:seed
   ```

5. **Test export directory exists**:

   ```bash
   mkdir -p /tmp/test-exports
   chmod 755 /tmp/test-exports
   ```

6. **Required system commands available**:
   - `tar` - For creating .tar.gz archives
   - `docker` - For Docker configuration validation (optional, can be mocked)
   - `npm` - For package.json validation (optional, can be mocked)

## Running Tests

### Run All Epic 33.1 Tests

```bash
npm --workspace=apps/api run test:epic-33.1
```

### Run Integration Tests Only

```bash
npm --workspace=apps/api run test:epic-33.1:integration
```

### Run Performance Tests Only

```bash
npm --workspace=apps/api run test:epic-33.1:performance
```

### Run Specific Test File

```bash
# Export workflow test
npm --workspace=apps/api run test -- --testPathPattern="export-workflow.test.ts"

# Database operations test
npm --workspace=apps/api run test -- --testPathPattern="database-operations.test.ts"

# API endpoints test
npm --workspace=apps/api run test -- --testPathPattern="api-endpoints.test.ts"
```

### Run Tests with Coverage

```bash
npm --workspace=apps/api run test:coverage -- --testPathPattern="epic-33.1"
```

### Run Tests in Debug Mode

```bash
# Set DEBUG environment variable
DEBUG=export:* npm --workspace=apps/api run test -- --testPathPattern="epic-33.1"
```

### Run Tests in Watch Mode

```bash
npm --workspace=apps/api run test:watch -- --testPathPattern="epic-33.1"
```

## Test Data Fixtures

Test fixtures are provided in `tests/fixtures/epic-33.1/test-fixtures.ts`:

### Creating Test Tools

```typescript
import { createTestTool, createCompleteTestTool } from '../../fixtures/epic-33.1/test-fixtures';

// Create a simple test tool
const tool = await createTestTool(pool, {
  toolName: 'My Test Form',
  toolType: 'forms',
});

// Create a complete test tool with form schema and submissions
const { tool, formSchema } = await createCompleteTestTool(pool, {
  toolName: 'Contact Form',
  submissionCount: 10,
});
```

### Creating Test Users

```typescript
import { createTestUser, SEED_USERS } from '../../fixtures/epic-33.1/test-fixtures';

// Create a test user
const user = await createTestUser(pool, {
  email: 'testuser@example.com',
  role: 'admin',
});

// Use seed users
const adminCredentials = SEED_USERS.admin;
// email: 'admin@example.com', password: 'Admin123!@#'
```

## Test Helpers

Helper functions are available in `helpers.ts`:

### Polling Export Job Status

```typescript
import { pollExportJobStatus } from './helpers';

const result = await pollExportJobStatus(pool, jobId, {
  maxAttempts: 60,
  intervalMs: 1000,
  expectedStatus: ['completed', 'failed'],
});

console.log(result.status); // 'completed'
console.log(result.stepsCompleted); // 8
```

### Verifying Export Package

```typescript
import { verifyExportPackage, extractExportPackage, verifyBoilerplateFiles } from './helpers';

// Verify package exists and is valid
const packageInfo = await verifyExportPackage(packagePath);
console.log(packageInfo.exists); // true
console.log(packageInfo.sizeBytes); // 1024000
console.log(packageInfo.contents); // ['package.json', 'Dockerfile', ...]

// Extract and verify contents
const extractDir = '/tmp/test-extracts';
const files = await extractExportPackage(packagePath, extractDir);

// Verify required files
const { missing, present } = verifyBoilerplateFiles(files, 'forms');
console.log(missing); // []
console.log(present); // ['package.json', 'Dockerfile', ...]
```

### Measuring Performance

```typescript
import { measureExecutionTime } from './helpers';

const { result, durationMs } = await measureExecutionTime(async () => {
  return await exportService.startExport(toolId, userId);
});

console.log(`Export completed in ${durationMs}ms`);
expect(durationMs).toBeLessThan(2000); // < 2 seconds
```

## Database Helper

Database helper class for test queries:

```typescript
import { TestDatabaseHelper } from './db-helper';

const dbHelper = await TestDatabaseHelper.initialize();

// Execute query
const result = await dbHelper.query('SELECT * FROM export_jobs WHERE job_id = $1', [jobId]);

// Execute in transaction
await dbHelper.transaction(async (client) => {
  await client.query('INSERT INTO export_jobs ...');
  await client.query('INSERT INTO tool_registry ...');
});

// Check table exists
const exists = await dbHelper.tableExists('export_jobs');

// Get statistics
const stats = await dbHelper.getExportJobStatistics();
console.log(stats.byStatus); // { pending: 2, completed: 5, failed: 1 }
```

## Test Patterns

### Pattern 1: Complete Export Workflow

```typescript
describe('Export Workflow', () => {
  it('should complete full export: start → in_progress → completed', async () => {
    // 1. Create test tool
    const { tool } = await createCompleteTestTool(pool);

    // 2. Start export
    const response = await request(app)
      .post(`/api/tool-registry/tools/${tool.toolId}/export`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    const jobId = response.body.jobId;

    // 3. Poll until completed
    const result = await pollExportJobStatus(pool, jobId);

    // 4. Verify status
    expect(result.status).toBe('completed');
    expect(result.packagePath).toBeTruthy();

    // 5. Verify package
    const packageInfo = await verifyExportPackage(result.packagePath!);
    expect(packageInfo.exists).toBe(true);
  });
});
```

### Pattern 2: Error Scenario Testing

```typescript
describe('Error Scenarios', () => {
  it('should rollback on step failure', async () => {
    // 1. Mock step to throw error
    jest.spyOn(exportStrategy, 'execute').mockRejectedValueOnce(new Error('Step failed'));

    // 2. Start export
    const { jobId } = await exportService.startExport(toolId, userId);

    // 3. Wait for failure
    const result = await pollExportJobStatus(pool, jobId, {
      expectedStatus: ['failed'],
    });

    // 4. Verify status
    expect(result.status).toBe('failed');
    expect(result.errorMessage).toContain('Step failed');

    // 5. Verify rollback occurred
    const workingDir = `/tmp/test-exports/${jobId}`;
    const exists = await fs
      .access(workingDir)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(false);
  });
});
```

### Pattern 3: Concurrent Operations

```typescript
describe('Concurrent Exports', () => {
  it('should handle multiple simultaneous exports', async () => {
    const { tool } = await createCompleteTestTool(pool);

    // Start 3 exports simultaneously
    const exports = await Promise.all([
      exportService.startExport(tool.toolId, userId1),
      exportService.startExport(tool.toolId, userId2),
      exportService.startExport(tool.toolId, userId3),
    ]);

    // Poll all exports
    const results = await Promise.all(exports.map((exp) => pollExportJobStatus(pool, exp.jobId)));

    // Verify all completed
    results.forEach((result) => {
      expect(result.status).toBe('completed');
    });
  });
});
```

## Troubleshooting

### Database Connection Errors

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution**: Ensure PostgreSQL is running:

```bash
brew services start postgresql@14
# OR
pg_ctl -D /usr/local/var/postgresql@14 start
```

### Table Does Not Exist Errors

```
Error: relation "export_jobs" does not exist
```

**Solution**: Run database migrations:

```bash
npm --workspace=apps/api run db:migrate
```

### Permission Denied on /tmp/test-exports

```
Error: EACCES: permission denied, mkdir '/tmp/test-exports'
```

**Solution**: Create directory with proper permissions:

```bash
sudo mkdir -p /tmp/test-exports
sudo chmod 777 /tmp/test-exports
```

### Test Timeouts

```
Timeout - Async callback was not invoked within the 30000 ms timeout
```

**Solution**: Increase Jest timeout in test file:

```typescript
jest.setTimeout(120000); // 2 minutes
```

Or set timeout per test:

```typescript
it('should complete export', async () => {
  // test code
}, 120000); // 2 minute timeout
```

### Disk Space Errors

```
Error: ENOSPC: no space left on device
```

**Solution**: Clean up test export directory:

```bash
rm -rf /tmp/test-exports/*
```

## Performance Benchmarks

Expected performance targets for Epic 33.1:

| Operation                 | Target         | Measurement           |
| ------------------------- | -------------- | --------------------- |
| Export completion (forms) | < 2 minutes    | Total workflow time   |
| Status polling response   | < 100ms        | API response time     |
| Database query            | < 50ms         | Query execution time  |
| Package generation        | < 10 seconds   | Archive creation time |
| Concurrent exports (10)   | No degradation | Same as single export |

## Coverage Targets

Epic 33.1 integration tests aim for:

- **Statement Coverage**: ≥ 85%
- **Branch Coverage**: ≥ 85%
- **Function Coverage**: ≥ 80%
- **Line Coverage**: ≥ 85%

Generate coverage report:

```bash
npm --workspace=apps/api run test:coverage -- --testPathPattern="epic-33.1"
```

View HTML coverage report:

```bash
open apps/api/coverage/lcov-report/index.html
```

## CI/CD Integration

Epic 33.1 tests run automatically in CI/CD pipeline:

- **GitHub Actions**: `.github/workflows/test-epic-33.1.yml`
- **Trigger**: Push to Epic 33.1 files or pull requests
- **Environment**: PostgreSQL service container
- **Artifacts**: Test reports and coverage data

## Best Practices

1. **Clean up after tests**: Use `afterEach()` or `afterAll()` to clean test data
2. **Use transactions**: Wrap tests in transactions for isolation
3. **Mock external dependencies**: Mock Docker, npm commands when appropriate
4. **Test real paths**: Use real database, filesystem (not mocks) for integration
5. **Measure performance**: Track execution time for performance regression detection
6. **Verify cleanup**: Ensure working directories are deleted after tests
7. **Use fixtures**: Reuse test data fixtures for consistency
8. **Poll with timeout**: Always set max attempts when polling job status

## Contributing

When adding new Epic 33.1 tests:

1. Follow existing test patterns
2. Use provided fixtures and helpers
3. Clean up test data in `afterEach()` or `afterAll()`
4. Document new test scenarios in this README
5. Update QA gate file with new test coverage
6. Ensure tests pass locally before committing

## References

- Story 33.1.5: Integration Tests for Epic 33.1
- Epic 33.1: Export Core Infrastructure
- QA Gate: `docs/qa/gates/33.1.5-integration-tests-epic-33.1.yml`
