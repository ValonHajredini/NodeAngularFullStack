/**
 * Jest E2E Test Configuration
 *
 * Configuration for end-to-end tests that validate the complete
 * CLI workflow with real file system, database, and API interactions.
 */

module.exports = {
  displayName: 'create-tool-e2e',
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/e2e'],
  testMatch: ['**/*.e2e.test.ts', '**/utils/__tests__/**/*.test.ts'],

  // E2E tests need more time than unit tests
  testTimeout: 60000, // 60 seconds per test

  // Global setup/teardown
  globalSetup: '<rootDir>/tests/e2e/setup.ts',
  globalTeardown: '<rootDir>/tests/e2e/teardown.ts',

  // Coverage configuration for E2E test utilities
  collectCoverageFrom: [
    'tests/e2e/utils/**/*.ts',
    '!tests/e2e/utils/**/*.test.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
  },

  // Verbose output for debugging E2E test failures
  verbose: true,

  // Environment variables setup
  setupFiles: ['<rootDir>/tests/e2e/setup-env.ts'],

  // Module file extensions
  moduleFileExtensions: ['ts', 'js', 'json'],

  // Coverage directory
  coverageDirectory: '<rootDir>/coverage/e2e',

  // Ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};
