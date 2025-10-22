/**
 * Test data factory for generating consistent test fixtures.
 * Provides utilities for creating various test data scenarios.
 */

import { TestUser } from './auth-helper';

/**
 * Generate valid user registration data.
 */
export const generateValidUserData = (
  overrides: Partial<TestUser> = {}
): TestUser => {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substr(2, 9);

  return {
    email: `test-${timestamp}-${randomId}@example.com`,
    password: 'ValidPass123!@#',
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    ...overrides,
  };
};

/**
 * Generate invalid user data for testing validation.
 */
export const generateInvalidUserData = () => {
  return {
    // Email validation test cases
    invalidEmails: [
      '',
      'invalid-email',
      'test@',
      '@example.com',
      'test.example.com',
      'test@.com',
      'test@example.',
      'test spaces@example.com',
    ],

    // Password validation test cases
    invalidPasswords: [
      '',
      '123', // Too short
      'password', // No numbers or special chars
      'PASSWORD123', // No lowercase or special chars
      'password123', // No uppercase or special chars
      'Password123', // No special chars
      'a'.repeat(129), // Too long
    ],

    // Name validation test cases
    invalidNames: [
      '',
      'a', // Too short
      'a'.repeat(51), // Too long
      '123Name', // Starts with number
      'Name@123', // Special characters
      '<script>alert("xss")</script>', // XSS attempt
    ],

    // Role validation test cases
    invalidRoles: ['superuser', 'guest', 'moderator', '', 123, null],
  };
};

/**
 * Generate SQL injection test payloads.
 */
export const generateSQLInjectionPayloads = () => {
  return [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    "'; DELETE FROM users WHERE '1'='1'; --",
    "' UNION SELECT * FROM users --",
    "'; INSERT INTO users (email, password) VALUES ('hacker@evil.com', 'hacked'); --",
    "'; UPDATE users SET role='admin' WHERE email='user@example.com'; --",
  ];
};

/**
 * Generate XSS test payloads.
 */
export const generateXSSPayloads = () => {
  return [
    '<script>alert("xss")</script>',
    '<img src="x" onerror="alert(\'xss\')">',
    'javascript:alert("xss")',
    '<svg onload="alert(\'xss\')">',
    '"><script>alert("xss")</script>',
    '<iframe src="javascript:alert(\'xss\')"></iframe>',
    '<body onload="alert(\'xss\')">',
    '<input type="text" value="\" onfocus=\"alert(\'xss\')\"">',
  ];
};

/**
 * Generate edge case test data.
 */
export const generateEdgeCaseData = () => {
  return {
    // Unicode and special characters
    unicodeStrings: [
      '测试用户', // Chinese characters
      'тестовыйпользователь', // Cyrillic
      '🎉🚀💡', // Emojis
      'café', // Accented characters
      'naïve résumé', // Multiple accents
    ],

    // Boundary value testing
    boundaryValues: {
      emails: {
        shortest: 'a@b.co',
        longest: 'a'.repeat(64) + '@' + 'b'.repeat(63) + '.com',
      },
      passwords: {
        shortest: 'Aa1!',
        longest:
          'A'.repeat(64) + 'a'.repeat(32) + '1'.repeat(16) + '!'.repeat(16),
      },
      names: {
        shortest: 'A',
        longest: 'A'.repeat(50),
      },
    },

    // Performance testing data
    largeDataSets: {
      generateUsers: (count: number) => {
        return Array.from({ length: count }, (_, i) =>
          generateValidUserData({
            email: `bulk-user-${i}@example.com`,
            firstName: `BulkUser${i}`,
            lastName: `Test${i}`,
          })
        );
      },
    },
  };
};

/**
 * Generate test scenarios for concurrent operations.
 */
export const generateConcurrencyTestData = () => {
  return {
    // Generate data for testing concurrent user creation
    concurrentRegistrations: (count: number) => {
      return Array.from({ length: count }, (_, i) =>
        generateValidUserData({
          email: `concurrent-${i}-${Date.now()}@example.com`,
        })
      );
    },

    // Generate data for testing concurrent login attempts
    concurrentLogins: (userCount: number) => {
      return Array.from({ length: userCount }, (_, i) => ({
        email: `concurrent-login-${i}@example.com`,
        password: 'ConcurrentTest123!',
      }));
    },
  };
};

/**
 * Generate test data for pagination testing.
 */
export const generatePaginationTestData = () => {
  return {
    // Standard pagination test cases
    validPaginationParams: [
      { page: 1, limit: 10 },
      { page: 2, limit: 20 },
      { page: 1, limit: 50 },
      { page: 5, limit: 5 },
    ],

    // Invalid pagination parameters
    invalidPaginationParams: [
      { page: 0, limit: 10 }, // Page cannot be 0
      { page: -1, limit: 10 }, // Negative page
      { page: 1, limit: 0 }, // Limit cannot be 0
      { page: 1, limit: -5 }, // Negative limit
      { page: 1, limit: 101 }, // Limit too high
      { page: 'abc', limit: 10 }, // Non-numeric page
      { page: 1, limit: 'xyz' }, // Non-numeric limit
    ],
  };
};

/**
 * Generate performance test scenarios.
 */
export const generatePerformanceTestData = () => {
  return {
    // Response time test scenarios
    responseTimeScenarios: [
      { description: 'Single user operation', concurrent: 1 },
      { description: 'Light load', concurrent: 5 },
      { description: 'Medium load', concurrent: 10 },
      { description: 'Heavy load', concurrent: 20 },
      { description: 'Stress test', concurrent: 50 },
    ],

    // Database performance scenarios
    databaseScenarios: [
      { description: 'Small dataset', userCount: 10 },
      { description: 'Medium dataset', userCount: 100 },
      { description: 'Large dataset', userCount: 1000 },
    ],
  };
};

/**
 * Generate valid form data for testing.
 */
export const generateValidFormData = (overrides: any = {}) => {
  const timestamp = Date.now();

  return {
    title: `Test Form ${timestamp}`,
    description: `Test form created at ${new Date().toISOString()}`,
    status: 'draft',
    ...overrides,
  };
};

/**
 * Generate form schema data for testing publish workflows.
 */
export const generateFormSchemaData = (formId: string, overrides: any = {}) => {
  const timestamp = Date.now();

  return {
    formId,
    version: 1,
    fields: [
      {
        id: `field-${timestamp}-1`,
        type: 'text' as any,
        label: 'Full Name',
        fieldName: 'fullName',
        required: true,
        order: 0,
      },
      {
        id: `field-${timestamp}-2`,
        type: 'email' as any,
        label: 'Email Address',
        fieldName: 'email',
        required: true,
        order: 1,
      },
    ],
    settings: {
      layout: { columns: 1 as const, spacing: 'medium' as const },
      submission: {
        showSuccessMessage: true,
        successMessage: 'Thank you for your submission!',
        allowMultipleSubmissions: false,
      },
    },
    isPublished: false,
    ...overrides,
  };
};

/**
 * Generate form publish request data.
 */
export const generateFormPublishData = (overrides: any = {}) => {
  return {
    expiresInDays: 30,
    notifyOnSubmission: false,
    ...overrides,
  };
};

/**
 * Generate complete form with schema for testing.
 */
export const generateCompleteFormWithSchema = (
  userOverrides: any = {},
  formOverrides: any = {},
  schemaOverrides: any = {}
) => {
  const formData = generateValidFormData(formOverrides);

  return {
    userData: generateValidUserData(userOverrides),
    formData,
    schemaData: (formId: string) =>
      generateFormSchemaData(formId, schemaOverrides),
    publishData: generateFormPublishData(),
  };
};
