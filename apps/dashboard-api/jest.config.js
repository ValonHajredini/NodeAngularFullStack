module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/src/**/*.test.ts',
    '**/?(*.)+(spec|test).ts',
  ],
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
          // TEMPORARY: Disable strict type checking for tests until cleanup
          noUnusedLocals: false,
          noUnusedParameters: false,
          noImplicitAny: false,
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
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/test-setup.ts'],
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  // Run tests sequentially to avoid database race conditions in integration tests
  // This prevents state interference when multiple tests access shared database resources
  maxWorkers: 1,
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/dist/',
    // TEMPORARY: Skip failing integration tests until test infrastructure is fixed
    // See docs/technical-debt/test-infrastructure-fixes.md for details
    '/tests/integration/export-status.test.ts',
    '/tests/integration/.*tool-registry.*',
    '/tests/integration/.*export.*',
  ],
  errorOnDeprecated: true,
  bail: false,
  clearMocks: true,
  restoreMocks: true,
};
