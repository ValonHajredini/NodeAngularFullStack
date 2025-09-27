import { FullConfig } from '@playwright/test';

/**
 * Global teardown for cross-browser testing.
 * Cleans up any resources created during testing.
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown...');

  // Clean up any test data or resources here
  // For now, we just log completion

  console.log('✅ Global teardown completed successfully');
}

export default globalTeardown;