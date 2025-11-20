/**
 * Epic 33.1 Integration Test Teardown
 * Cleanup logic for Epic 33.1 tests.
 */

import {
  cleanEpic33_1TestData,
  cleanTestFilesystem,
  teardownEpic33_1Tests,
} from './setup';

/**
 * Global teardown function for Epic 33.1 tests.
 * Called after all tests complete.
 */
export default async function globalTeardown(): Promise<void> {
  console.log('🧹 Cleaning up Epic 33.1 test environment...');

  try {
    await teardownEpic33_1Tests();
    console.log('✅ Epic 33.1 test cleanup complete');
  } catch (error) {
    console.error('❌ Error during Epic 33.1 test teardown:', error);
    throw error;
  }
}

/**
 * Per-test cleanup function.
 * Call this in afterEach() hooks to clean up after individual tests.
 */
export const cleanupAfterTest = async (): Promise<void> => {
  await cleanEpic33_1TestData();
  await cleanTestFilesystem();
};
