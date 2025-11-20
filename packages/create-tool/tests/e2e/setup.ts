/**
 * Global E2E Test Setup
 *
 * Runs once before all E2E tests.
 * - Verifies database connection
 * - Seeds admin user
 * - Clears old test data
 *
 * @module tests/e2e/setup
 */

import { DatabaseSeeder } from './utils/database';

export default async function globalSetup() {
  console.log('\n🧪 E2E Test Suite Setup\n');

  // Check database connection
  const seeder = new DatabaseSeeder();
  const isConnected = await seeder.checkConnection();

  if (!isConnected) {
    throw new Error(
      'Database connection failed. Ensure PostgreSQL is running and DATABASE_URL is set.'
    );
  }

  console.log('✓ Database connection verified');

  // Seed admin user
  await seeder.seedAdminUser();

  // Clear old test data
  await seeder.clearToolRegistry();

  await seeder.close();

  console.log('✓ E2E setup complete\n');
}
