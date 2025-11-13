/**
 * Jest configuration for unit tests only.
 * Unit tests should not depend on database connections.
 * Use jest.config.js for integration tests that require database access.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/tests/unit/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          target: 'ES2020',
          lib: ['ES2020'],
          module: 'commonjs',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          types: ['jest', 'node'],
        },
      },
    ],
    '^.+\\.js$': [
      'ts-jest',
      {
        tsconfig: {
          target: 'ES2020',
          lib: ['ES2020'],
          module: 'commonjs',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!(nanoid)/)'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/server.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  // CRITICAL: No setupFilesAfterEnv for unit tests - they must not depend on database
  testTimeout: 10000, // Shorter timeout for unit tests
  verbose: true,
  forceExit: false, // Unit tests should not need forced exit
  detectOpenHandles: false, // Unit tests should not leave handles open
  testPathIgnorePatterns: ['/node_modules/', '/coverage/', '/dist/', '/tests/integration/'],
  errorOnDeprecated: true,
  bail: false,
  clearMocks: true,
  restoreMocks: true,
};
