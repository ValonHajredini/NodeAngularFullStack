/**
 * User test fixtures for consistent test data across test suites.
 * Provides predefined test users and data scenarios.
 */

export const userFixtures = {
  // Valid test users
  validUsers: {
    admin: {
      email: 'test-admin@example.com',
      password: 'AdminTest123!@#',
      firstName: 'Test',
      lastName: 'Admin',
      role: 'admin' as const
    },
    user: {
      email: 'test-user@example.com',
      password: 'UserTest123!@#',
      firstName: 'Test',
      lastName: 'User',
      role: 'user' as const
    },
    readonly: {
      email: 'test-readonly@example.com',
      password: 'ReadonlyTest123!@#',
      firstName: 'Test',
      lastName: 'Readonly',
      role: 'readonly' as const
    }
  },

  // Seed users (predefined in database)
  seedUsers: {
    admin: {
      email: 'admin@example.com',
      password: 'AdminPass123!',
      expectedRole: 'admin'
    },
    user: {
      email: 'user@example.com',
      password: 'UserPass123!',
      expectedRole: 'user'
    },
    readonly: {
      email: 'readonly@example.com',
      password: 'ReadonlyPass123!',
      expectedRole: 'readonly'
    }
  },

  // Invalid user data for validation testing
  invalidUsers: {
    missingEmail: {
      password: 'ValidPass123!@#',
      firstName: 'Test',
      lastName: 'User',
      role: 'user'
    },
    missingPassword: {
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'user'
    },
    invalidEmail: {
      email: 'not-an-email',
      password: 'ValidPass123!@#',
      firstName: 'Test',
      lastName: 'User',
      role: 'user'
    },
    weakPassword: {
      email: 'test@example.com',
      password: '123',
      firstName: 'Test',
      lastName: 'User',
      role: 'user'
    },
    invalidRole: {
      email: 'test@example.com',
      password: 'ValidPass123!@#',
      firstName: 'Test',
      lastName: 'User',
      role: 'superuser'
    }
  },

  // Edge case users
  edgeCases: {
    unicodeNames: {
      email: 'unicode@example.com',
      password: 'ValidPass123!@#',
      firstName: '测试',
      lastName: 'García',
      role: 'user' as const
    },
    longNames: {
      email: 'longnames@example.com',
      password: 'ValidPass123!@#',
      firstName: 'A'.repeat(50),
      lastName: 'B'.repeat(50),
      role: 'user' as const
    },
    minimalNames: {
      email: 'minimal@example.com',
      password: 'ValidPass123!@#',
      firstName: 'A',
      lastName: 'B',
      role: 'user' as const
    }
  },

  // Performance testing users
  performanceUsers: {
    bulkUserTemplate: {
      password: 'BulkTest123!@#',
      role: 'user' as const
    },
    concurrentUserTemplate: {
      password: 'ConcurrentTest123!@#',
      role: 'user' as const
    }
  },

  // Security testing data
  securityTestData: {
    sqlInjectionAttempts: [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "'; DELETE FROM users; --",
      "' UNION SELECT * FROM users --"
    ],
    xssAttempts: [
      '<script>alert("xss")</script>',
      '<img src="x" onerror="alert(\'xss\')">',
      'javascript:alert("xss")',
      '<svg onload="alert(\'xss\')">'
    ],
    invalidTokens: [
      'invalid.jwt.token',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
      '',
      'null',
      'undefined'
    ]
  }
};

export const authFixtures = {
  // Valid login credentials
  validCredentials: {
    admin: {
      email: 'admin@example.com',
      password: 'AdminPass123!'
    },
    user: {
      email: 'user@example.com',
      password: 'UserPass123!'
    },
    readonly: {
      email: 'readonly@example.com',
      password: 'ReadonlyPass123!'
    }
  },

  // Invalid login attempts
  invalidCredentials: {
    wrongPassword: {
      email: 'user@example.com',
      password: 'WrongPassword123!'
    },
    nonexistentUser: {
      email: 'nonexistent@example.com',
      password: 'ValidPass123!@#'
    },
    emptyCredentials: {
      email: '',
      password: ''
    },
    malformedEmail: {
      email: 'not-an-email',
      password: 'ValidPass123!@#'
    }
  },

  // Rate limiting test data
  rateLimitData: {
    bruteForceAttempts: Array.from({ length: 20 }, (_, i) => ({
      email: 'victim@example.com',
      password: `wrongpass${i}`
    })),
    rapidRegistrations: Array.from({ length: 15 }, (_, i) => ({
      email: `rapid${i}@example.com`,
      password: 'RapidTest123!@#',
      firstName: 'Rapid',
      lastName: `User${i}`,
      role: 'user' as const
    }))
  }
};

export const apiFixtures = {
  // Standard API response structures
  successResponse: {
    success: true,
    data: {}
  },
  errorResponse: {
    success: false,
    error: {
      code: 'ERROR_CODE',
      message: 'Error message',
      timestamp: new Date().toISOString()
    }
  },

  // Pagination test data
  paginationParams: {
    valid: [
      { page: 1, limit: 10 },
      { page: 2, limit: 20 },
      { page: 1, limit: 50 }
    ],
    invalid: [
      { page: 0, limit: 10 },
      { page: -1, limit: 10 },
      { page: 1, limit: 0 },
      { page: 'abc', limit: 10 },
      { page: 1, limit: 'xyz' }
    ]
  },

  // Search query test data
  searchQueries: {
    valid: ['Test', 'User', 'Admin', 'test@example.com'],
    malicious: [
      '<script>alert("xss")</script>',
      "'; DROP TABLE users; --",
      '../../../etc/passwd',
      '%00'
    ]
  }
};

export const performanceFixtures = {
  // Load testing scenarios
  loadTestScenarios: [
    { name: 'Light Load', concurrent: 5, duration: 10 },
    { name: 'Medium Load', concurrent: 10, duration: 20 },
    { name: 'Heavy Load', concurrent: 20, duration: 30 }
  ],

  // Performance thresholds (in milliseconds)
  performanceThresholds: {
    authentication: 2000,
    profileOperations: 1000,
    userList: 1500,
    userCreation: 2000,
    tokenRefresh: 1000
  },

  // Database performance test data
  databaseScenarios: [
    { description: 'Small Dataset', userCount: 10 },
    { description: 'Medium Dataset', userCount: 100 },
    { description: 'Large Dataset', userCount: 1000 }
  ]
};