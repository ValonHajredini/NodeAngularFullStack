import { Page, expect } from '@playwright/test';

/**
 * Navigation helpers for Epic 32.2 E2E tests.
 */

/**
 * Navigates to tools list page.
 */
export async function navigateToToolsList(page: Page): Promise<void> {
  await page.goto('/app/tools');
  await page.waitForLoadState('networkidle');
  console.log('[NavigationHelper] Navigated to tools list');
}

/**
 * Navigates to tool detail page by toolId.
 */
export async function navigateToToolDetail(page: Page, toolId: string): Promise<void> {
  await page.goto(`/app/tools/detail/${toolId}`);
  await page.waitForLoadState('networkidle');
  console.log(`[NavigationHelper] Navigated to tool detail: ${toolId}`);
}

/**
 * Clicks on a tool card in tools list to navigate to detail page.
 */
export async function clickToolCard(page: Page, name: string): Promise<void> {
  const toolCard = page.locator(`[data-testid="tool-card"]:has-text("${name}"), .tool-card:has-text("${name}")`).first();
  await toolCard.click();
  await page.waitForLoadState('networkidle');
  console.log(`[NavigationHelper] Clicked tool card: ${name}`);
}

/**
 * Verifies current page is tool detail page.
 */
export async function verifyToolDetailPage(page: Page, name: string): Promise<void> {
  await expect(page.locator('h1')).toContainText(name);
  await expect(page).toHaveURL(/\/app\/tools\/detail\//);
  console.log(`[NavigationHelper] Verified tool detail page: ${name}`);
}

/**
 * Clicks browser back button.
 */
export async function goBack(page: Page): Promise<void> {
  await page.goBack();
  await page.waitForLoadState('networkidle');
  console.log('[NavigationHelper] Navigated back');
}

/**
 * Clicks browser forward button.
 */
export async function goForward(page: Page): Promise<void> {
  await page.goForward();
  await page.waitForLoadState('networkidle');
  console.log('[NavigationHelper] Navigated forward');
}

/**
 * Switches to a tab in tool detail page.
 */
export async function switchTab(page: Page, tabName: 'Overview' | 'Config' | 'Manifest' | 'Analytics'): Promise<void> {
  const tab = page.locator(`[role="tab"]:has-text("${tabName}"), .p-tabview-nav-link:has-text("${tabName}")`);
  await tab.click();
  await page.waitForTimeout(300); // Wait for tab animation
  console.log(`[NavigationHelper] Switched to tab: ${tabName}`);
}

/**
 * Verifies breadcrumb trail.
 */
export async function verifyBreadcrumb(page: Page, expectedPath: string[]): Promise<void> {
  const breadcrumb = page.locator('.p-breadcrumb, [data-testid="breadcrumb"]');

  for (const item of expectedPath) {
    await expect(breadcrumb).toContainText(item);
  }

  console.log(`[NavigationHelper] Verified breadcrumb: ${expectedPath.join(' > ')}`);
}
