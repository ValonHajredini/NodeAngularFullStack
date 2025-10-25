import { Page } from '@playwright/test';

/**
 * Authentication helpers for Epic 32.2 E2E tests.
 */

export interface LoginOptions {
  email?: string;
  password?: string;
  rememberMe?: boolean;
}

/**
 * Logs in as admin user.
 */
export async function loginAsAdmin(page: Page, options: LoginOptions = {}): Promise<void> {
  const email = options.email || 'admin@example.com';
  const password = options.password || 'Admin123!@#';

  await page.goto('/auth/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);

  if (options.rememberMe) {
    await page.check('input[name="rememberMe"]');
  }

  await page.click('button[type="submit"]');

  // Wait for navigation to dashboard/tools
  await page.waitForURL(/\/(app\/dashboard|app\/tools)/);
  console.log(`[AuthHelper] Logged in as admin: ${email}`);
}

/**
 * Logs in as regular user.
 */
export async function loginAsUser(page: Page, options: LoginOptions = {}): Promise<void> {
  const email = options.email || 'user@example.com';
  const password = options.password || 'User123!@#';

  await page.goto('/auth/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);

  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(app\/dashboard|app\/tools)/);
  console.log(`[AuthHelper] Logged in as user: ${email}`);
}

/**
 * Logs in as readonly user.
 */
export async function loginAsReadOnly(page: Page, options: LoginOptions = {}): Promise<void> {
  const email = options.email || 'readonly@example.com';
  const password = options.password || 'Read123!@#';

  await page.goto('/auth/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);

  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(app\/dashboard|app\/tools)/);
  console.log(`[AuthHelper] Logged in as readonly: ${email}`);
}

/**
 * Logs out current user.
 */
export async function logout(page: Page): Promise<void> {
  // Click user menu
  await page.click('[data-testid="user-menu"], .user-menu-button');

  // Click logout
  await page.click('button:has-text("Logout"), a:has-text("Logout")');

  // Wait for redirect to login
  await page.waitForURL(/\/auth\/login/);
  console.log('[AuthHelper] Logged out successfully');
}

/**
 * Checks if user is authenticated.
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  // Check for auth-related elements
  const isLoggedIn = await page.locator('[data-testid="user-menu"], .user-menu-button').isVisible().catch(() => false);
  return isLoggedIn;
}

/**
 * Sets up mock authentication token (for API mocking).
 */
export async function setMockAuthToken(page: Page, token: string): Promise<void> {
  await page.evaluate((mockToken) => {
    localStorage.setItem('authToken', mockToken);
  }, token);
  console.log('[AuthHelper] Mock auth token set');
}
