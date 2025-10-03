import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for cross-browser testing.
 * Sets up test data and ensures the application is ready for testing.
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for cross-browser testing...');

  // Create a browser instance for setup operations
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Wait for the application to be available
    console.log('⏳ Waiting for application to be ready...');
    await page.goto('http://localhost:4200', { waitUntil: 'networkidle' });

    // Verify the application loads successfully
    await page.waitForSelector('app-root', { timeout: 30000 });
    console.log('✅ Application is ready for testing');

    // Set up any required test data or authentication here
    // For now, we'll just verify the API is available
    const apiResponse = await page.request.get('http://localhost:3000/health');
    if (!apiResponse.ok()) {
      throw new Error(`API health check failed: ${apiResponse.status()}`);
    }
    console.log('✅ API is ready for testing');

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }

  console.log('✅ Global setup completed successfully');
}

export default globalSetup;