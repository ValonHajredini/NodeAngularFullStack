# Theme Verification E2E Tests (Story 23.6)

Automated Playwright tests for verifying theme rendering across all form contexts.

---

## Quick Start

### Option 1: Run with Headed Browser (Recommended)

Watch the tests execute in a real browser window:

```bash
npm run test:e2e:themes
```

### Option 2: Run with UI Mode (Interactive)

Interactive test runner with time-travel debugging:

```bash
npm run test:e2e:themes:ui
```

### Option 3: Run Headless (CI/CD)

Run tests in background without browser window:

```bash
npx playwright test story-23.6-theme-verification
```

---

## Prerequisites

1. **Development servers running**:

   ```bash
   npm start
   ```

   - Frontend: http://localhost:4200
   - Backend: http://localhost:3000

2. **Database seeded** with themes and test data:

   ```bash
   npm --workspace=apps/api run db:seed
   ```

3. **Admin account** exists:
   - Email: admin@example.com
   - Password: User123!@#

---

## Test Coverage

### Test Suite: Quick Validation (75% confidence)

Execution time: ~2-3 minutes

| Test                          | Description               | Pass Criteria                                                               |
| ----------------------------- | ------------------------- | --------------------------------------------------------------------------- |
| **Canvas: Ocean Blue**        | Light theme with gradient | Canvas background shows blue gradient, CSS variables set, no console errors |
| **Canvas: Midnight Purple**   | Dark theme                | Canvas background changes to purple, text readable, smooth transition       |
| **Canvas: Default Styles**    | No theme selected         | Canvas reverts to default, theme CSS cleared                                |
| **Preview: Ocean Blue**       | Preview modal consistency | Preview matches canvas theme exactly                                        |
| **Preview: Midnight Purple**  | Preview modal dark theme  | Preview shows dark theme consistently                                       |
| **Public Form: Theme Update** | Public form rendering     | Form displays with theme, updates when theme changes                        |
| **Error Handling**            | Graceful degradation      | Form renders with defaults on API failure, warning logged                   |

---

## Test Execution

### Running All Theme Tests

```bash
# Headed mode (watch tests run)
npm run test:e2e:themes

# UI mode (interactive debugging)
npm run test:e2e:themes:ui

# Headless mode (CI/CD)
npx playwright test story-23.6-theme-verification
```

### Running Specific Tests

```bash
# Run only canvas tests
npx playwright test story-23.6-theme-verification -g "Canvas Theme Loading"

# Run only preview tests
npx playwright test story-23.6-theme-verification -g "Preview Modal"

# Run only error handling
npx playwright test story-23.6-theme-verification -g "Error Handling"
```

### Running in Specific Browser

```bash
# Chromium only
npx playwright test story-23.6-theme-verification --project=chromium

# Firefox only
npx playwright test story-23.6-theme-verification --project=firefox

# WebKit (Safari) only
npx playwright test story-23.6-theme-verification --project=webkit
```

---

## Test Output

### Successful Test Run

```
Running 7 tests using 1 worker

  ✓ Test 1: Canvas Theme Loading - Ocean Blue (3.2s)
  ✓ Test 1: Canvas Theme Loading - Midnight Purple (2.8s)
  ✓ Test 1: Canvas Theme Loading - None (2.5s)
  ✓ Test 2: Preview Modal Consistency - Ocean Blue (3.1s)
  ✓ Test 2: Preview Modal Consistency - Midnight Purple (2.9s)
  ✓ Test 3: Public Form Rendering - Ocean Blue to Sunset Orange (4.5s)
  ✓ Test 4: Error Handling - Graceful Degradation (3.0s)

  7 passed (22.0s)

Story 23.6 - Theme Verification Test Results
============================================================
Execution Date: 2025-10-17T15:30:00.000Z
Test Suite: Quick Validation (75% confidence)
Total Tests: 7

Test Coverage:
  ✓ Canvas Theme Loading (3 themes)
  ✓ Preview Modal Consistency (2 themes)
  ✓ Public Form Rendering (theme updates)
  ✓ Error Handling (graceful degradation)

Next Steps:
  - If all tests pass → Deploy with 75% confidence
  - For 100% confidence → Run comprehensive test suite
  - See: docs/qa/manual-tests/23.6-theme-verification-test-script.md
============================================================
```

### Failed Test Example

```
  1) Test 1: Canvas Theme Loading - Ocean Blue

    Error: expect(received).toBeTruthy()

    Expected: truthy
    Received: ""

      78 |       // Verify theme CSS variable is set
      79 |       const primaryColor = await getCSSVariable(page, '--theme-primary-color');
    > 80 |       expect(primaryColor).toBeTruthy();
         |                            ^
      81 |       expect(primaryColor).toContain('#'); // Should be a color value
      82 |     });
```

---

## Debugging Failed Tests

### Method 1: UI Mode (Recommended)

```bash
npm run test:e2e:themes:ui
```

- Click on failed test
- Use time-travel to step through test execution
- Inspect DOM, network, console logs
- Re-run individual steps

### Method 2: Headed Mode with Pause

Add `await page.pause();` to test file at failure point:

```typescript
await test.step('Verify theme CSS variable is set', async () => {
  await page.pause(); // Debugger will pause here
  const primaryColor = await getCSSVariable(page, '--theme-primary-color');
  expect(primaryColor).toBeTruthy();
});
```

### Method 3: Screenshots on Failure

Playwright automatically captures screenshots on failure in `test-results/` directory.

### Method 4: Video Recording

Enable video recording in `playwright.config.ts`:

```typescript
use: {
  video: 'on',
}
```

---

## Common Issues

### Issue: "Browser is already in use"

**Solution**: Close any existing Playwright browser instances

```bash
pkill -f playwright
```

### Issue: "page.goto: Timeout 30000ms exceeded"

**Cause**: Frontend or backend not running **Solution**: Ensure development servers are running:

```bash
npm start
```

### Issue: "Unable to login as admin"

**Cause**: Database not seeded or admin account locked **Solution**: Reset database:

```bash
npm --workspace=apps/api run db:reset
npm --workspace=apps/api run db:seed
```

### Issue: "Theme dropdown not found"

**Cause**: Form Builder UI structure changed **Solution**: Update test selectors in
`story-23.6-theme-verification.spec.ts`

---

## Confidence Levels

| Test Result   | Confidence | Next Steps                                                          |
| ------------- | ---------- | ------------------------------------------------------------------- |
| **7/7 Pass**  | 75%        | Deploy to production or run comprehensive tests for 100% confidence |
| **6/7 Pass**  | ~65%       | Investigate failed test, fix issues, re-run                         |
| **5/7 Pass**  | ~50%       | Review failed tests, consider running manual validation             |
| **<5/7 Pass** | <50%       | Stop deployment, investigate failures, run manual QA                |

---

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Theme Verification Tests

on:
  pull_request:
    paths:
      - 'apps/web/src/app/features/**'
      - 'apps/api/src/controllers/forms.controller.ts'

jobs:
  theme-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm start &
      - run: npx wait-on http://localhost:4200 http://localhost:3000
      - run: npx playwright test story-23.6-theme-verification
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: test-results
          path: test-results/
```

---

## Next Steps

### For 75% Confidence (Current)

- All 7 E2E tests pass
- Deploy to production with monitoring

### For 100% Confidence

Execute comprehensive manual test suite:

```bash
open docs/qa/manual-tests/23.6-theme-verification-test-script.md
```

- Test all 9 seeded themes (not just 3)
- Create and test custom themes
- Verify forms without themes
- Test all 45 scenarios

---

## Related Documentation

- **Story**: `docs/stories/23.6.apply-themes-all-rendering-contexts.md`
- **Quality Gate**: `docs/qa/gates/23.6-apply-themes-all-rendering-contexts.yml`
- **Manual Test Script**: `docs/qa/manual-tests/23.6-theme-verification-test-script.md`
- **Quick Validation Guide**: `docs/qa/manual-tests/23.6-quick-theme-validation.md`

---

## Support

**Questions or Issues?**

- Review test file: `tests/e2e/story-23.6-theme-verification.spec.ts`
- Check Playwright docs: https://playwright.dev
- File issue in project repository

---

**Last Updated**: 2025-10-17 **Version**: 1.0 **Maintainer**: QA Team (Quinn - Test Architect)
