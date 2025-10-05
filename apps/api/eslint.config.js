import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // TypeScript-specific rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',

      // Security-focused rules
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',

      // Code quality rules
      'no-console': 'warn',
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      complexity: ['warn', 10],
      'max-depth': ['warn', 4],
      'max-lines-per-function': ['warn', 50],
      'no-magic-numbers': ['warn', { ignore: [0, 1, -1] }],
      'consistent-return': 'error',
      'no-duplicate-imports': 'error',
      'no-unreachable': 'error',
      'no-unused-expressions': 'error',

      // JSDoc requirements for public APIs (removed deprecated valid-jsdoc)
      // Note: JSDoc validation can be handled by TypeScript compiler strict mode
      // and documentation generators like JSDoc or TSDoc
    },
  },
  {
    files: [
      '**/*.test.ts',
      '**/*.spec.ts',
      'tests/**/*.ts',
      'database/**/*.ts',
      'jest.config.js',
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        // No project for test/config files
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    rules: {
      // Relax rules for test files
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      'no-console': 'off',
      'no-undef': 'off',
      'no-magic-numbers': 'off',
      'max-lines-per-function': 'off',
      complexity: 'off',
      'max-depth': 'off',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  }
);
