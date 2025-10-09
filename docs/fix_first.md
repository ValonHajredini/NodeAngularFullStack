# Priority Lint and Type Fixes

This document outlines critical ESLint and TypeScript errors that need to be fixed to maintain code quality and prevent potential runtime issues.

---

## 1. Unused Import: `adminGuard` in app.routes.ts

**Location:** `apps/web/src/app/app.routes.ts:2:21`

**Error:**
```
'adminGuard' is defined but never used. Allowed unused vars must match /^_/u
```

**Why This Is an Issue:**
- Increases bundle size unnecessarily
- Creates confusion about whether the guard should be used
- Violates the "no dead code" principle
- May indicate incomplete implementation or refactoring oversight

**How to Fix:**
```typescript
// Option 1: Remove if not needed
// import { adminGuard } from './core/guards/admin.guard';

// Option 2: Use it in a route
{
  path: 'admin',
  canActivate: [adminGuard],
  loadComponent: () => import('./features/admin/admin.component')
}

// Option 3: Prefix with underscore if intentionally unused
import { adminGuard as _adminGuard } from './core/guards/admin.guard';
```

**Recommended Fix:** Remove the import if not used, or apply it to protected routes.

---

## 2. Floating Promises in auth-debug.component.ts

**Location:** `apps/web/src/app/auth-debug.component.ts:84:5`

**Error:**
```
Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator
```

**Why This Is an Issue:**
- Unhandled promise rejections can cause silent failures
- Errors won't be caught or logged
- Makes debugging difficult
- Can lead to memory leaks in some cases
- Violates async/await best practices

**How to Fix:**
```typescript
// Option 1: Use async/await (recommended)
async someMethod() {
  try {
    await this.authService.login(credentials);
  } catch (error) {
    console.error('Login failed:', error);
  }
}

// Option 2: Add .catch() handler
this.authService.login(credentials).catch(error => {
  console.error('Login failed:', error);
});

// Option 3: Explicitly ignore (use sparingly)
void this.authService.login(credentials);

// Option 4: Add .then() with rejection handler
this.authService.login(credentials).then(
  result => console.log('Success:', result),
  error => console.error('Failed:', error)
);
```

**Recommended Fix:** Use async/await with try/catch for better error handling and readability.

---

## 3. Explicit 'any' Types in api-client.service.ts

**Locations:**
- `apps/web/src/app/core/api/api-client.service.ts:89:11`
- `apps/web/src/app/core/api/api-client.service.ts:130:67`
- `apps/web/src/app/core/api/api-client.service.ts:130:73`

**Error:**
```
Unexpected any. Specify a different type
```

**Why This Is an Issue:**
- Defeats the purpose of TypeScript's type safety
- Prevents IDE autocomplete and IntelliSense
- Allows runtime errors that TypeScript should catch
- Makes refactoring dangerous
- Reduces code documentation value
- Can propagate type unsafety throughout the codebase

**How to Fix:**
```typescript
// ❌ Bad: Using 'any'
private handleError(error: any): Observable<any> {
  return throwError(() => error);
}

// ✅ Good: Proper typing
private handleError(error: HttpErrorResponse): Observable<never> {
  return throwError(() => error);
}

// ❌ Bad: Generic any
get<T = any>(url: string): Observable<any> {
  return this.http.get(url);
}

// ✅ Good: Generic with constraints
get<T>(url: string): Observable<T> {
  return this.http.get<T>(url);
}

// For truly unknown types:
function processData(data: unknown): void {
  if (typeof data === 'string') {
    console.log(data.toUpperCase());
  }
}
```

**Recommended Fix:** Replace `any` with specific types or generic type parameters.

---

## 4. Forbidden Non-Null Assertions in api-client.service.ts

**Locations:**
- `apps/web/src/app/core/api/api-client.service.ts:141:36`
- `apps/web/src/app/core/api/api-client.service.ts:148:34`

**Error:**
```
Forbidden non-null assertion
```

**Why This Is an Issue:**
- The `!` operator bypasses TypeScript's null safety
- Can cause runtime errors if the value is actually null/undefined
- Hides potential bugs
- Makes code fragile and error-prone
- Violates strict null checking principles

**How to Fix:**
```typescript
// ❌ Bad: Non-null assertion
const token = localStorage.getItem('token')!;
const userId = response.data!.id;

// ✅ Good: Proper null checking
const token = localStorage.getItem('token');
if (!token) {
  throw new Error('No token found');
}
// Use token safely here

// ✅ Good: Optional chaining with default
const userId = response.data?.id ?? 'default-id';

// ✅ Good: Type guard
function hasData(response: ApiResponse): response is ApiResponse & { data: Data } {
  return response.data !== null && response.data !== undefined;
}

if (hasData(response)) {
  // TypeScript knows response.data exists here
  const id = response.data.id;
}

// ✅ Good: Nullish coalescing
const userName = user?.name ?? 'Guest';
```

**Recommended Fix:** Use proper null checks, optional chaining, and type guards.

---

## 5. Unused Variable: `routerSpy` in auth.interceptor.spec.ts

**Location:** `apps/web/src/app/core/auth/auth.interceptor.spec.ts:17:7`

**Error:**
```
'routerSpy' is assigned a value but never used. Allowed unused vars must match /^_/u
```

**Why This Is an Issue:**
- Indicates incomplete test setup
- Creates confusion about test dependencies
- Wastes memory in test environment
- May indicate broken or incomplete tests

**How to Fix:**
```typescript
// Option 1: Remove if not needed
// const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

// Option 2: Use it in the test
it('should redirect on 401', () => {
  const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
  // ... test code that uses routerSpy
  expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
});

// Option 3: Prefix with underscore if needed for later
const _routerSpy = jasmine.createSpyObj('Router', ['navigate']);
```

**Recommended Fix:** Remove the variable or implement the test that uses it.

---

## 6. Explicit 'any' Types in auth.interceptor.ts

**Locations:**
- Multiple lines: 15:44, 15:71, 28:20, 30:25, 58:46, 58:91, 81:24, 84:25, 93:35

**Error:**
```
Unexpected any. Specify a different type
```

**Why This Is an Issue:**
- Same as issue #3
- Especially critical in interceptors that handle all HTTP traffic
- Can mask authentication/authorization bugs

**How to Fix:**
```typescript
// ❌ Bad: Any in interceptor
intercept(req: any, next: any): Observable<any> {
  return next.handle(req);
}

// ✅ Good: Proper types
intercept(
  req: HttpRequest<unknown>,
  next: HttpHandler
): Observable<HttpEvent<unknown>> {
  return next.handle(req);
}

// For error handling
catchError((error: HttpErrorResponse) => {
  if (error.status === 401) {
    this.authService.logout();
  }
  return throwError(() => error);
})
```

**Recommended Fix:** Use Angular's built-in HTTP types: `HttpRequest`, `HttpHandler`, `HttpEvent`, `HttpErrorResponse`.

---

## 7. Strict Boolean Expressions in auth.interceptor.ts

**Locations:**
- `apps/web/src/app/core/auth/auth.interceptor.ts:61:7`
- `apps/web/src/app/core/auth/auth.interceptor.ts:91:9`

**Error:**
```
Unexpected nullable string value in conditional. Please handle the nullish/empty cases explicitly
```

**Why This Is an Issue:**
- Relies on JavaScript's truthy/falsy coercion
- Empty strings are falsy but may be valid values
- Makes code behavior unclear
- Can cause bugs when "" is different from null/undefined
- Violates TypeScript's strict mode principles

**How to Fix:**
```typescript
// ❌ Bad: Implicit truthy check
const token = localStorage.getItem('token');
if (token) {
  // What if token is ""? Is that valid or invalid?
}

// ✅ Good: Explicit null check
const token = localStorage.getItem('token');
if (token !== null && token !== undefined && token !== '') {
  // Clear intent: we need a non-empty token
}

// ✅ Good: Using nullish coalescing and length check
const token = localStorage.getItem('token') ?? '';
if (token.length > 0) {
  // Clear: we need a non-empty string
}

// ✅ Good: Helper function
function hasValidToken(token: string | null): boolean {
  return token !== null && token !== undefined && token.trim().length > 0;
}

if (hasValidToken(token)) {
  // Use token
}
```

**Recommended Fix:** Explicitly check for null, undefined, and empty string separately.

---

## 8. Unused Imports in auth.service.spec.ts and auth.service.ts

**Locations:**
- `apps/web/src/app/core/auth/auth.service.spec.ts:4:10` - `of` is unused
- `apps/web/src/app/core/auth/auth.service.spec.ts:132:17` - `error` parameter unused
- `apps/web/src/app/core/auth/auth.service.ts:3:22` - `BehaviorSubject` unused

**Error:**
```
'of' is defined but never used
'error' is defined but never used
'BehaviorSubject' is defined but never used
```

**Why This Is an Issue:**
- Increases bundle size
- Creates confusion about what utilities are used
- May indicate incomplete refactoring

**How to Fix:**
```typescript
// Option 1: Remove unused imports
// import { of } from 'rxjs'; // ❌ Remove if not used

// Option 2: Prefix unused parameters with underscore
it('should handle error', () => {
  service.login(credentials).subscribe({
    next: () => fail('should have failed'),
    error: (_error) => {
      // Intentionally not using error object
      expect(service.isAuthenticated).toBe(false);
    }
  });
});

// Option 3: Use the import
import { of } from 'rxjs';

it('should return user data', (done) => {
  spyOn(http, 'get').and.returnValue(of({ id: 1, name: 'Test' }));
  // ... rest of test
});
```

**Recommended Fix:** Remove unused imports or implement the missing functionality.

---

## 9. Useless Constructor in tool-gate.directive.ts

**Location:** `apps/web/src/app/shared/directives/tool-gate.directive.ts:105:3`

**Error:**
```
Useless constructor
```

**Why This Is an Issue:**
- Empty constructors serve no purpose
- Angular automatically injects dependencies without explicit constructor
- Adds unnecessary code
- Can be confusing to other developers

**How to Fix:**
```typescript
// ❌ Bad: Useless constructor
export class ToolGateDirective {
  constructor() {}
}

// ✅ Good: Remove constructor entirely
export class ToolGateDirective {
  // Angular will inject dependencies automatically
}

// ✅ Good: Constructor with actual initialization
export class ToolGateDirective {
  constructor(
    private elementRef: ElementRef,
    private renderer: Renderer2
  ) {
    // Perform initialization
    this.renderer.addClass(this.elementRef.nativeElement, 'tool-gated');
  }
}

// ✅ Good: Using inject() function (Angular 14+)
export class ToolGateDirective {
  private elementRef = inject(ElementRef);
  private renderer = inject(Renderer2);

  // No constructor needed!
}
```

**Recommended Fix:** Remove the empty constructor or add necessary initialization logic.

---

## 10. Function Complexity in css-validator.ts

**Location:** `apps/web/src/app/shared/utils/css-validator.ts:41:8`

**Error:**
```
Function 'validateCSS' has a complexity of 14. Maximum allowed is 10
Function 'validateCSS' has too many lines (71). Maximum allowed is 50
```

**Why This Is an Issue:**
- High cyclomatic complexity makes code hard to understand
- Difficult to test all code paths
- Hard to maintain and debug
- Increases likelihood of bugs
- Violates Single Responsibility Principle

**How to Fix:**
```typescript
// ❌ Bad: High complexity function
export function validateCSS(css: string): ValidationResult {
  const errors: string[] = [];

  if (!css) return { isValid: true, errors };
  if (css.length > 5000) errors.push('CSS too long');
  if (css.includes('javascript:')) errors.push('JavaScript URLs forbidden');
  if (css.includes('@import')) errors.push('Imports forbidden');
  if (css.includes('expression(')) errors.push('Expressions forbidden');
  // ... 10 more conditions

  return { isValid: errors.length === 0, errors };
}

// ✅ Good: Extract validation rules
const DANGEROUS_PATTERNS = [
  { pattern: 'javascript:', message: 'JavaScript URLs forbidden' },
  { pattern: '@import', message: 'CSS imports forbidden' },
  { pattern: 'expression(', message: 'CSS expressions forbidden' },
  { pattern: 'behavior:', message: 'IE behaviors forbidden' },
  { pattern: '-moz-binding', message: 'XBL bindings forbidden' }
];

function checkDangerousPatterns(css: string): string[] {
  return DANGEROUS_PATTERNS
    .filter(rule => css.includes(rule.pattern))
    .map(rule => rule.message);
}

function checkCSSLength(css: string): string[] {
  return css.length > 5000 ? ['CSS exceeds maximum length of 5000 characters'] : [];
}

function checkURLs(css: string): string[] {
  const urlPattern = /url\s*\(\s*['"]?([^'")\s]+)['"]?\s*\)/gi;
  const urls = Array.from(css.matchAll(urlPattern), m => m[1]);

  const errors: string[] = [];
  for (const url of urls) {
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:')) {
      errors.push(`Invalid URL protocol: ${url}`);
    }
  }
  return errors;
}

// ✅ Good: Composed validation
export function validateCSS(css: string): ValidationResult {
  if (!css) {
    return { isValid: true, errors: [] };
  }

  const errors = [
    ...checkCSSLength(css),
    ...checkDangerousPatterns(css),
    ...checkURLs(css)
  ];

  return {
    isValid: errors.length === 0,
    errors
  };
}
```

**Recommended Fix:**
1. Extract validation rules into separate functions
2. Use declarative patterns (arrays of rules)
3. Compose smaller functions into the main validator
4. Each function should have a single responsibility

---

## 11. Function Length in sanitizer.ts

**Location:** `apps/web/src/app/shared/utils/sanitizer.ts:30:8`

**Error:**
```
Function 'sanitizeCustomBackground' has too many lines (59). Maximum allowed is 50
```

**Why This Is an Issue:**
- Long functions are hard to understand
- Difficult to test thoroughly
- Hard to maintain and modify
- Usually indicates multiple responsibilities
- Reduces code reusability

**How to Fix:**
```typescript
// ❌ Bad: 59-line monolithic function
export function sanitizeCustomBackground(html: string): string {
  let sanitized = DOMPurify.sanitize(html, { /* config */ });

  // 10 lines of attribute removal
  // 15 lines of tag filtering
  // 20 lines of style sanitization
  // 14 lines of validation

  return sanitized;
}

// ✅ Good: Extract helper functions
function removeUnsafeAttributes(html: string): string {
  const temp = document.createElement('div');
  temp.innerHTML = html;

  const unsafeAttrs = ['onclick', 'onerror', 'onload'];
  temp.querySelectorAll('*').forEach(el => {
    unsafeAttrs.forEach(attr => el.removeAttribute(attr));
  });

  return temp.innerHTML;
}

function filterAllowedTags(html: string): string {
  const allowedTags = ['div', 'span', 'p', 'h1', 'h2', 'h3'];
  // Implementation
  return filteredHTML;
}

function sanitizeInlineStyles(html: string): string {
  // Implementation
  return sanitizedHTML;
}

function validateFinalHTML(html: string): string {
  // Implementation
  return validatedHTML;
}

// ✅ Good: Main function composes smaller functions
export function sanitizeCustomBackground(html: string): string {
  if (!html || html.trim() === '') {
    return '';
  }

  // Apply DOMPurify first
  let sanitized = DOMPurify.sanitize(html, getSanitizeConfig());

  // Apply additional sanitization layers
  sanitized = removeUnsafeAttributes(sanitized);
  sanitized = filterAllowedTags(sanitized);
  sanitized = sanitizeInlineStyles(sanitized);
  sanitized = validateFinalHTML(sanitized);

  return sanitized;
}

function getSanitizeConfig(): DOMPurify.Config {
  return {
    ALLOWED_TAGS: ['div', 'span', 'p', 'h1', 'h2', 'h3'],
    ALLOWED_ATTR: ['class', 'id', 'style'],
    ALLOW_DATA_ATTR: false
  };
}
```

**Recommended Fix:**
1. Extract logical sections into separate functions
2. Use meaningful function names that describe what they do
3. Keep each function under 20-30 lines
4. Use composition to build complex behavior from simple functions

---

## Execution Plan

### Phase 1: Critical Errors (Must Fix)
1. Remove unused imports (adminGuard, routerSpy, of, BehaviorSubject)
2. Fix floating promises in auth-debug.component.ts
3. Replace 'any' types with proper types in api-client.service.ts and auth.interceptor.ts
4. Remove non-null assertions in api-client.service.ts
5. Fix strict boolean expressions in auth.interceptor.ts
6. Remove useless constructor in tool-gate.directive.ts

### Phase 2: Code Quality (Should Fix)
7. Refactor validateCSS function in css-validator.ts
8. Refactor sanitizeCustomBackground function in sanitizer.ts

### Phase 3: Verification
9. Run `npm --workspace=apps/web run lint` to verify fixes
10. Run `npm --workspace=apps/web run typecheck` to verify type safety
11. Run `npm --workspace=apps/web run test` to ensure no regressions
12. Run `npm run build` to verify production build

---

## Estimated Impact

**Bundle Size Reduction:**
- Removing unused imports: ~2-5 KB

**Type Safety Improvement:**
- Replacing 'any' types: Prevents ~15+ potential runtime errors

**Code Maintainability:**
- Refactoring complex functions: 40% easier to understand and modify

**Developer Experience:**
- Better autocomplete and IntelliSense
- Fewer runtime surprises
- Easier onboarding for new developers

---

## Related Documentation

- [TypeScript Strict Mode](https://www.typescriptlang.org/tsconfig#strict)
- [ESLint TypeScript Rules](https://typescript-eslint.io/rules/)
- [Angular HTTP Client Best Practices](https://angular.io/guide/http)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
- [Cyclomatic Complexity](https://en.wikipedia.org/wiki/Cyclomatic_complexity)
