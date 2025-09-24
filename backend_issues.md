# Backend TypeScript Issues

## Overview

The backend API has 32 TypeScript errors that need to be resolved. These errors were discovered when
running `npm run typecheck` and are preventing the TypeScript compilation from succeeding.

## Error Categories and Details

### 1. Unused Parameters (11 errors)

These are parameters declared but never used in middleware functions. TypeScript's
`noUnusedParameters` rule is catching these.

#### Files Affected:

- **`src/middleware/config.middleware.ts`**
  - Line 41: `res` parameter unused
  - Lines 78-79: `req` and `res` parameters unused
  - Lines 97-98: `req` and `res` parameters unused
  - Line 117: `res` parameter unused
  - Lines 156-157: `req` and `res` parameters unused
  - Lines 194-195: `req` and `res` parameters unused
  - Line 228: `req` parameter unused

- **`src/middleware/security.middleware.ts`**
  - Line 201: `res` parameter unused

- **`src/middleware/tenant-security.middleware.ts`**
  - Line 3: `AuditService` import unused
  - Line 32: `res` parameter unused

**Fix:** Prefix unused parameters with underscore (e.g., `_req`, `_res`) or remove if not needed.

---

### 2. Type Incompatibilities (8 errors)

#### Tenant Interface Issues:

- **`src/middleware/tenant.middleware.ts`**
  - Line 9: `TenantRequest` interface incorrectly extends Express Request
  - Line 36: Type mismatch when passing `TenantRequest` to a function expecting Express Request

  **Problem:** The `Tenant` type is missing required properties: `features: string[]` and
  `limits: Record<string, number>`

  **Fix:** Update the `Tenant` interface to include missing properties or update the extended
  interface definition.

#### Package Version Type Issues:

- **`src/utils/logger.utils.ts`**
  - Lines 53, 75, 110, 112, 139: `package.json` version is `string | number | true` but expected
    `string`

- **`src/utils/monitoring.utils.ts`**
  - Lines 23, 25: Same version type issue

**Fix:** Cast version to string: `String(packageJson.version)`

---

### 3. API/Library Issues (5 errors)

#### Sentry SDK Breaking Changes:

- **`src/utils/monitoring.utils.ts`**
  - Lines 37, 40, 46: `Sentry.Integrations` no longer exists in newer version

  **Problem:** Sentry SDK v7+ changed the API. Instead of `Sentry.Integrations.Http`, use specific
  integration imports.

  **Fix:**

  ```typescript
  import { httpIntegration, postgresIntegration } from '@sentry/node';
  ```

#### Helmet Configuration:

- **`src/middleware/security.middleware.ts`**
  - Line 115: `permissionsPolicy` is not a valid Helmet option

  **Fix:** Remove `permissionsPolicy` or check if it should be `permissionPolicy` (singular).

---

### 4. Code Logic Issues (3 errors)

- **`src/middleware/security.middleware.ts`**
  - Line 210: Cannot assign to `ip` because it's a read-only property
    - **Fix:** Create a new variable or use type assertion

  - Line 254: Function missing return statement in some code paths
    - **Fix:** Ensure all code paths return a value

- **`src/utils/performance.utils.ts`**
  - Line 50: Unsafe type conversion
    - **Fix:** Use explicit cast through `unknown`: `return fn as unknown as T`

---

### 5. Missing Properties (2 errors)

- **`src/utils/logger.utils.ts`**
  - Line 41: Property 'stack' doesn't exist on formatted log object

  **Fix:** Check if stack exists before accessing: `info.stack ? info.stack : ''`

- **`src/utils/performance.utils.ts`**
  - Line 239: `tenantContext` declared but never used

  **Fix:** Remove unused variable or prefix with underscore

---

## Priority Order for Fixes

1. **Critical - Tenant Interface Issues** (Blocks multi-tenancy functionality)
   - Fix missing `features` and `limits` properties in Tenant interface

2. **High - Library Breaking Changes** (Blocks monitoring/security features)
   - Update Sentry integration code
   - Fix Helmet configuration

3. **Medium - Type Safety Issues**
   - Fix version type casting
   - Fix unsafe type conversions

4. **Low - Code Quality** (Doesn't block functionality)
   - Clean up unused parameters
   - Remove unused imports and variables

---

## Quick Commands

To see all errors:

```bash
npm run typecheck:api
```

To see errors in a specific file:

```bash
npx tsc --noEmit --project apps/api/tsconfig.json | grep "specific-file.ts"
```

---

## Notes

- All errors must be fixed before the pre-commit hooks will allow commits
- Consider updating TypeScript config to be less strict temporarily if needed
- Some errors may require package updates (especially Sentry)
