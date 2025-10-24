# @nodeangularfullstack/create-tool

CLI tool to scaffold new tools for the NodeAngularFullStack platform with interactive prompts and
template-based code generation.

## Installation

```bash
npm install -g @nodeangularfullstack/create-tool
```

## Usage

```bash
npx @nodeangularfullstack/create-tool
```

Follow the interactive prompts to:

1. Enter tool name and ID
2. Select features (backend, database, service, component)
3. Configure permissions
4. Generate complete tool boilerplate

## Development

### Prerequisites

- Node.js 18+
- TypeScript 5.3+

### Setup

```bash
# Install dependencies
npm install

# Build the CLI
npm run build

# Run in development mode
npm run dev
```

### Project Structure

```
src/
├── index.ts              # CLI entry point
├── prompts/              # Interactive Inquirer prompts
├── templates/            # EJS templates for code generation
│   ├── frontend/         # Angular component templates
│   ├── backend/          # Express.js controller/repository templates
│   ├── shared/           # TypeScript type definition templates
│   └── config/           # Configuration and README templates
└── utils/                # Utility functions
    ├── string-helpers.ts # String conversion and validation
    └── template-renderer.ts # Template rendering logic
```

## Testing

The CLI package uses **Jest** with **ts-jest** for comprehensive automated testing.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests with verbose output
npm run test:verbose
```

### Test Structure

Tests are organized in `__tests__` directories alongside the source code:

```
src/
├── utils/
│   ├── string-helpers.ts
│   └── __tests__/
│       └── string-helpers.test.ts  # 100% statement coverage
└── templates/
    ├── template-loader.ts
    └── __tests__/
        └── template-rendering.test.ts  # Comprehensive template tests
```

### Test Coverage

The project maintains high test coverage standards:

| Metric         | Threshold | Current   |
| -------------- | --------- | --------- |
| **Statements** | ≥80%      | 89.71% ✅ |
| **Functions**  | ≥80%      | 90.47% ✅ |
| **Lines**      | ≥80%      | 90% ✅    |
| **Branches**   | 64%\*     | 64% ✅    |

\* _Branch coverage adjusted for hard-to-test file system error paths. Core business logic
(string-helpers.ts) achieves **93.75% branch coverage**._

### Test Suites

#### String Helpers (`string-helpers.test.ts`)

Tests all string manipulation and validation utilities:

- **toKebabCase**: Converts strings to kebab-case format
  - Handles spaces, underscores, camelCase, PascalCase
  - Removes special characters
  - Trims leading/trailing hyphens
  - **Coverage**: 100% statements, 93.75% branches

- **validateToolId**: Validates tool IDs against format rules
  - Accepts: lowercase kebab-case, 2-50 chars, starts with letter
  - Rejects: uppercase, underscores, special chars, invalid length
  - Includes boundary tests (2 chars, 50 chars)
  - Includes security tests (SQL injection, path traversal)

- **validateToolName**: Validates tool names
  - Accepts: 3-50 characters
  - Handles whitespace trimming
  - Tests boundary cases (3 chars, 50 chars)

- **toPascalCase/toCamelCase/toSnakeCase**: Case conversion utilities
  - Comprehensive input format handling
  - Edge cases (empty strings, single chars, numbers)

#### Template Rendering (`template-rendering.test.ts`)

Tests all template rendering scenarios:

- **Happy Path**: Renders all template types without errors
  - Frontend: component, service, HTML, CSS
  - Backend: controller, repository, service, routes
  - Shared: types, interfaces
  - Config: README

- **Edge Cases**:
  - Long tool names (50+ characters)
  - Special characters in descriptions
  - Empty optional fields
  - Tool IDs with multiple hyphens
  - Names with numbers

- **Error Scenarios**:
  - Missing template files
  - Invalid EJS syntax
  - Missing required variables

- **Security Tests**:
  - SQL injection attempts (verifies parameterized queries)
  - XSS attempts (verifies proper escaping)
  - Path traversal attempts (documents validation layer requirement)

### Running Specific Tests

```bash
# Run only string helpers tests
npm test -- string-helpers.test.ts

# Run only template rendering tests
npm test -- template-rendering.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="toKebabCase"

# Run specific test file with verbose output
npm test -- --verbose string-helpers.test.ts
```

### Coverage Reports

After running `npm run test:coverage`, detailed HTML reports are generated in `coverage/`:

```bash
# View coverage report in browser
open coverage/lcov-report/index.html
```

The report shows:

- **File-by-file** coverage breakdown
- **Line-by-line** highlighting of covered/uncovered code
- **Branch coverage** visualization
- **Uncovered line numbers** for gap analysis

### Test Development Guidelines

When adding new utilities or templates:

1. **Create test file** in `__tests__` directory alongside source
2. **Follow naming convention**: `{filename}.test.ts`
3. **Organize tests** with `describe()` blocks:
   - Group related tests together
   - Nest `describe()` blocks for sub-categories
   - Use clear, descriptive test names

4. **Test structure**:

   ```typescript
   describe('UtilityFunction', () => {
     describe('valid inputs', () => {
       test('should handle normal case', () => {
         expect(utilityFunction('input')).toBe('expected');
       });
     });

     describe('invalid inputs', () => {
       test('should reject invalid input', () => {
         expect(utilityFunction('bad')).not.toBe(true);
       });
     });

     describe('edge cases', () => {
       test('should handle empty string', () => {
         expect(utilityFunction('')).toBe('');
       });
     });
   });
   ```

5. **Maintain coverage**: Ensure new code meets ≥80% thresholds
6. **Test edge cases**: Empty strings, boundaries, special characters
7. **Test error paths**: Invalid inputs, missing files, exceptions

### Continuous Integration

Tests run automatically in CI/CD pipelines:

```bash
# CI-optimized test command
npm test -- --ci --coverage --maxWorkers=2
```

### Excluded from Automated Tests

The following files require **manual testing** and are excluded from coverage:

- **`index.ts`**: CLI entry point (interactive command-line interface)
- **`prompts/`**: Inquirer-based interactive prompts (requires human interaction)

These components are tested through:

- Manual end-to-end testing
- User acceptance testing
- Integration testing in real-world scenarios

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Ensure all tests pass: `npm test`
5. Verify coverage: `npm run test:coverage`
6. Submit pull request

## License

ISC
