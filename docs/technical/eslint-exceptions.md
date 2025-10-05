# ESLint Exceptions Documentation

This document defines when and where ESLint rule exceptions are permitted in the codebase.

## Overview

While strict linting rules maintain code quality, certain contexts require flexibility. This
document outlines approved exceptions to our ESLint rules and provides justification for each.

## Test Files

**Scope:** `**/*.test.ts`, `**/*.spec.ts`, `tests/**/*.ts`

### Disabled Rules

- `@typescript-eslint/no-explicit-any` - **OFF**
- `@typescript-eslint/strict-boolean-expressions` - **OFF**
- `@typescript-eslint/explicit-function-return-type` - **OFF**
- `no-magic-numbers` - **OFF**
- `max-lines-per-function` - **OFF**
- `complexity` - **OFF**
- `no-console` - **OFF**

### Justification

Test files require flexibility for:

1. **Mocking and Stubbing**: Third-party libraries may require `any` types for mocks
2. **Test Data**: Magic numbers are common in test scenarios (HTTP status codes, timeouts)
3. **Setup/Teardown**: Test setup functions can legitimately exceed line limits
4. **Debugging**: `console.log` statements are valuable during test development

### Example Usage

```typescript
// ✅ Permitted in test files
it('should handle complex mock scenarios', () => {
  const mockService = jasmine.createSpyObj('Service', ['method']);
  mockService.method.and.callFake((options: any) => {
    return options.callback();
  });
});

// ✅ Permitted: Magic numbers for test data
expect(response.status).toBe(200);
expect(result.length).toBe(42);

// ✅ Permitted: Console for debugging
console.log('Test state:', component.internalState);
```

## Debug Components

**Scope:** `*-debug.component.ts`, `test-*.component.ts`

### Permitted Exception

```typescript
/* eslint-disable no-console */
```

### Justification

Debug components exist explicitly for development and troubleshooting:

1. Console output is their primary purpose
2. These components are excluded from production builds
3. Console statements provide critical debugging information

### Example Usage

```typescript
/* eslint-disable no-console */
import { Component } from '@angular/core';

@Component({
  selector: 'app-auth-debug',
  template: `<div>{{ debugInfo }}</div>`,
})
export class AuthDebugComponent {
  logAuthState(): void {
    console.log('Current auth state:', this.authService.user());
    console.log('Token expiry:', this.authService.tokenExpiry());
  }
}
```

## Configuration Files

**Scope:** Database configuration, environment setup

### Permitted `any` Usage

```typescript
// ✅ Permitted: Third-party configuration objects
export const databaseConfig: any = {
  client: 'postgresql',
  connection: process.env.DATABASE_URL,
  pool: { min: 2, max: 10 },
};
```

### Justification

1. **Third-Party Integration**: Libraries like Knex.js have complex configuration types
2. **Dynamic Configuration**: Environment-based configs may vary in structure
3. **Type Definition Complexity**: Fully typing all configuration objects provides minimal value

## Callback Functions

**Scope:** Event handlers, third-party library callbacks

### Permitted `any` Usage

```typescript
// ✅ Permitted: Third-party callback parameters
element.addEventListener('custom-event', (event: any) => {
  handleCustomEvent(event.detail);
});

// ✅ Permitted: Unknown library callback types
thirdPartyLib.subscribe((data: any) => {
  processData(data);
});
```

### Justification

1. **Library Integration**: External libraries may not provide TypeScript definitions
2. **Custom Events**: Browser custom events have dynamic payloads
3. **Gradual Migration**: Legacy code integration during TypeScript migration

## JSON Processing

**Scope:** API responses, file parsing

### Permitted `any` Usage

```typescript
// ✅ Permitted: Dynamic JSON parsing
function parseApiResponse(json: string): any {
  return JSON.parse(json);
}

// ✅ Better: Parse then validate
function parseAndValidate(json: string): User {
  const data = JSON.parse(json) as any;
  return validateUser(data);
}
```

### Justification

1. **JSON.parse()** returns `any` by design
2. Dynamic data should be validated after parsing
3. Runtime validation provides better safety than static types

## Migration Paths

### Preferred Alternatives to `any`

1. **Use `unknown` instead of `any`**

   ```typescript
   // ❌ Avoid
   function process(data: any) {}

   // ✅ Preferred
   function process(data: unknown) {
     if (typeof data === 'string') {
       // Type narrowing
     }
   }
   ```

2. **Generic Types**

   ```typescript
   // ❌ Avoid
   function identity(arg: any): any {
     return arg;
   }

   // ✅ Preferred
   function identity<T>(arg: T): T {
     return arg;
   }
   ```

3. **Type Guards**
   ```typescript
   // ✅ Preferred
   function isUser(obj: unknown): obj is User {
     return typeof obj === 'object' && obj !== null && 'id' in obj && 'email' in obj;
   }
   ```

## Console Statement Guidelines

### Production Code

**Rule:** `'no-console': 'warn'`

- Console statements should be avoided in production code
- Use proper logging libraries (Winston, Logtail)
- Exceptions must be explicitly disabled with inline comments

### Debug Components

**Rule:** `'no-console': 'off'` (automatic via ESLint config)

- Full console access for debugging
- These components are development-only

### Inline Exceptions

```typescript
// ✅ Permitted: Bootstrap error handling
bootstrapApplication(App, appConfig)
  // eslint-disable-next-line no-console
  .catch((err) => console.error(err));
```

## Enforcement

### Pre-commit Hooks

ESLint runs automatically via `lint-staged` on all commits. Violations in non-exempt files will
prevent commits.

### CI/CD Pipeline

Full lint checks run in CI:

```bash
npm run lint        # Must pass for merge
npm run typecheck   # Must pass for merge
```

### Code Review

Reviewers should verify:

1. `any` usage is in exempt contexts
2. Inline exceptions have justification comments
3. Test files follow testing best practices
4. Debug components are properly excluded from production

## Updates

This document should be updated when:

1. New exception categories are added
2. Rules are modified in ESLint configuration
3. Team conventions change

Last updated: 2025-10-04 (Story 10.7.5)
