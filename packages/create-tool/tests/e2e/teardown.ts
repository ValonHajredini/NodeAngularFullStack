/**
 * Global E2E Test Teardown
 *
 * Runs once after all E2E tests.
 * - Cleans up test data from database
 * - Removes test workspace directories
 *
 * @module tests/e2e/teardown
 */

import { DatabaseSeeder } from './utils/database';
import * as fs from 'fs/promises';

export default async function globalTeardown() {
  console.log('\n🧹 E2E Test Suite Teardown\n');

  // Clean up test data
  const seeder = new DatabaseSeeder();
  await seeder.cleanup();
  await seeder.close();

  // Clean up test workspaces
  try {
    await fs.rm('/tmp/create-tool-e2e', { recursive: true, force: true });
    console.log('✓ Test workspaces cleaned');
  } catch (error) {
    console.warn('Warning: Failed to clean test workspaces:', error);
  }

  console.log('✓ E2E teardown complete\n');
}
