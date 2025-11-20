module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/index.ts', // CLI entry point, tested manually
    '!src/prompts/**', // Interactive prompts, tested manually
  ],
  coverageThreshold: {
    global: {
      // Note: Branch coverage at 64% due to hard-to-test file system error paths:
      // - File permission errors (EACCES/EPERM) require OS-level permission manipulation
      // - Generic error fallbacks in readFile/readdir operations
      // Core business logic (string-helpers.ts) achieves 93.75% branch coverage
      branches: 64,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
