// Direct OpenAPI specification without swagger-jsdoc since it has issues with TypeScript
const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Node Angular Full Stack API',
    version: '1.0.0',
    description:
      'A comprehensive API for the Node Angular Full Stack application',
    contact: {
      name: 'API Support',
      email: 'support@example.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000/api/v1',
      description: 'Development server',
    },
    {
      url: 'https://api.example.com/v1',
      description: 'Production server',
    },
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Comprehensive health check',
        description:
          'Returns detailed health status including database connectivity and system metrics',
        tags: ['Health'],
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'healthy' },
                    timestamp: { type: 'string', format: 'date-time' },
                    uptime: {
                      type: 'number',
                      description: 'Process uptime in seconds',
                    },
                    database: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', example: 'connected' },
                        responseTime: {
                          type: 'number',
                          description: 'Database response time in ms',
                        },
                      },
                    },
                    environment: { type: 'string', example: 'development' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/health/readiness': {
      get: {
        summary: 'Kubernetes readiness probe',
        description:
          'Returns 200 if service is ready to accept traffic, 503 otherwise',
        tags: ['Health'],
        responses: {
          '200': {
            description: 'Service is ready',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ready' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/health/liveness': {
      get: {
        summary: 'Kubernetes liveness probe',
        description:
          'Returns 200 if service is alive, used to determine if container should be restarted',
        tags: ['Health'],
        responses: {
          '200': {
            description: 'Service is alive',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'alive' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/register': {
      post: {
        summary: 'Register a new user',
        description: 'Register a new user with email and password',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UserRegistration' },
              example: {
                email: 'user@example.com',
                password: 'SecurePass123!',
                firstName: 'John',
                lastName: 'Doe',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Registration successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
                example: {
                  message: 'User registered successfully',
                  data: {
                    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                    refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                    user: {
                      id: '123e4567-e89b-12d3-a456-426614174000',
                      email: 'user@example.com',
                      firstName: 'John',
                      lastName: 'Doe',
                      role: 'user',
                      tenantId: null,
                      avatarUrl: null,
                      isActive: true,
                      emailVerified: false,
                      createdAt: '2024-01-21T15:30:00.000Z',
                      updatedAt: '2024-01-21T15:30:00.000Z',
                    },
                  },
                  timestamp: '2024-01-21T15:30:00.000Z',
                },
              },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationError' },
              },
            },
          },
          '409': {
            description: 'Email already exists',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'User login',
        description: 'Authenticate user with email and password',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UserLogin' },
              example: {
                email: 'user@example.com',
                password: 'SecurePass123!',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
                example: {
                  message: 'Login successful',
                  data: {
                    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                    refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                    user: {
                      id: '123e4567-e89b-12d3-a456-426614174000',
                      email: 'user@example.com',
                      firstName: 'John',
                      lastName: 'Doe',
                      role: 'user',
                      tenantId: null,
                      avatarUrl:
                        'https://cdn.example.com/avatars/user-123/avatar.jpg',
                      isActive: true,
                      emailVerified: true,
                      createdAt: '2024-01-01T00:00:00.000Z',
                      updatedAt: '2024-01-21T15:30:00.000Z',
                    },
                  },
                  timestamp: '2024-01-21T15:30:00.000Z',
                },
              },
            },
          },
          '401': {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/auth/refresh': {
      post: {
        summary: 'Refresh access token',
        description: 'Refresh access token using a valid refresh token',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RefreshTokenRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Token refresh successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          '401': {
            description: 'Invalid or expired refresh token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/auth/logout': {
      post: {
        summary: 'Logout user',
        description: 'Logout user by invalidating refresh token',
        tags: ['Authentication'],
        responses: {
          '200': {
            description: 'Logout successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: {
                      type: 'string',
                      example: 'Logged out successfully',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/logout-all': {
      post: {
        summary: 'Logout from all devices',
        description:
          'Logout user from all devices by invalidating all refresh tokens',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Logout from all devices successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: {
                      type: 'string',
                      example: 'Logged out from all devices successfully',
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Authentication required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/auth/profile': {
      get: {
        summary: 'Get user profile',
        description: "Get authenticated user's profile information",
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'User profile retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserProfile' },
              },
            },
          },
          '401': {
            description: 'Authentication required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      patch: {
        summary: 'Update user profile',
        description: "Update authenticated user's profile information",
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UserUpdateRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Profile updated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserProfile' },
              },
            },
          },
          '401': {
            description: 'Authentication required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/auth/password-reset': {
      post: {
        summary: 'Request password reset',
        description:
          'Request password reset email (always returns success for security)',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PasswordResetRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Password reset email sent',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: {
                      type: 'string',
                      example: 'Password reset email sent if account exists',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/password-reset/confirm': {
      post: {
        summary: 'Confirm password reset',
        description: 'Confirm password reset with token and set new password',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PasswordResetConfirm' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Password reset successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: {
                      type: 'string',
                      example: 'Password reset successful',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/password-reset/validate/{token}': {
      get: {
        summary: 'Validate password reset token',
        description: 'Validate password reset token without using it',
        tags: ['Authentication'],
        parameters: [
          {
            in: 'path',
            name: 'token',
            required: true,
            schema: { type: 'string' },
            description: 'Password reset token to validate',
          },
        ],
        responses: {
          '200': {
            description: 'Token is valid',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    valid: { type: 'boolean', example: true },
                    expiresAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/test-credentials': {
      get: {
        summary: 'Get test credentials',
        description: 'Get test user credentials for development environment',
        tags: ['Authentication', 'Development'],
        responses: {
          '200': {
            description: 'Test credentials for development testing',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    testUsers: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          email: { type: 'string', format: 'email' },
                          password: { type: 'string' },
                          role: {
                            type: 'string',
                            enum: ['admin', 'user', 'readonly'],
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Get token information',
        description: 'Get user information from access token',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'User information from token',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/UserProfile' },
                    tokenInfo: {
                      type: 'object',
                      properties: {
                        issuedAt: { type: 'string', format: 'date-time' },
                        expiresAt: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/users': {
      post: {
        summary: 'Create a new user',
        description: 'Create a new user account (admin only)',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'firstName', 'lastName', 'role'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  firstName: { type: 'string', minLength: 1, maxLength: 50 },
                  lastName: { type: 'string', minLength: 1, maxLength: 50 },
                  role: { type: 'string', enum: ['admin', 'user', 'readonly'] },
                  password: { type: 'string', minLength: 8 },
                  isActive: { type: 'boolean', default: true },
                  emailVerified: { type: 'boolean', default: false },
                },
              },
              example: {
                email: 'newuser@example.com',
                firstName: 'John',
                lastName: 'Doe',
                role: 'user',
                password: 'TempPassword123!',
                isActive: true,
                emailVerified: false,
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'User created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
              },
            },
          },
          '403': {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      get: {
        summary: 'Get paginated list of users',
        description:
          'Get paginated list of users with search and filtering (admin only)',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'page',
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: 'Page number for pagination',
          },
          {
            in: 'query',
            name: 'limit',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            description: 'Number of items per page',
          },
          {
            in: 'query',
            name: 'search',
            schema: { type: 'string' },
            description: 'Search term for email, firstName, or lastName',
          },
          {
            in: 'query',
            name: 'role',
            schema: { type: 'string', enum: ['admin', 'user', 'readonly'] },
            description: 'Filter by user role',
          },
          {
            in: 'query',
            name: 'status',
            schema: {
              type: 'string',
              enum: ['active', 'inactive', 'all'],
              default: 'all',
            },
            description: 'Filter by user status',
          },
        ],
        responses: {
          '200': {
            description: 'Users retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/PaginationResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/User' },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },
    '/tokens': {
      post: {
        summary: 'Create a new API token',
        description: 'Creates a new API token for the authenticated user',
        tags: ['API Tokens'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiTokenRequest' },
              example: {
                name: 'Production API Access',
                scopes: ['read', 'write'],
                expiresAt: '2025-12-31T23:59:59.999Z',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Token created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/ApiTokenResponse' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid input data',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationError' },
              },
            },
          },
          '401': {
            description: 'Authentication required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '409': {
            description: 'Token name already exists for user',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      get: {
        summary: "List user's API tokens",
        description:
          'Returns all API tokens for the authenticated user (without token values)',
        tags: ['API Tokens'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Tokens retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/ApiTokenInfo' },
                    },
                    meta: {
                      type: 'object',
                      properties: {
                        total: { type: 'number', example: 3 },
                      },
                    },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
                example: {
                  success: true,
                  data: [
                    {
                      id: '123e4567-e89b-12d3-a456-426614174000',
                      name: 'Production API Access',
                      scopes: ['read', 'write'],
                      expiresAt: '2025-12-31T23:59:59.999Z',
                      createdAt: '2024-01-15T10:30:00.000Z',
                      lastUsedAt: '2024-01-20T14:45:30.000Z',
                      isActive: true,
                    },
                  ],
                  meta: { total: 3 },
                  timestamp: '2024-01-21T15:30:00.000Z',
                },
              },
            },
          },
          '401': {
            description: 'Authentication required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/tokens/{id}': {
      get: {
        summary: 'Get API token information',
        description:
          'Returns information about a specific API token (without token value)',
        tags: ['API Tokens'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Token ID',
            example: '123e4567-e89b-12d3-a456-426614174000',
          },
        ],
        responses: {
          '200': {
            description: 'Token information retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/ApiTokenInfo' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid token ID format',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationError' },
              },
            },
          },
          '401': {
            description: 'Authentication required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '404': {
            description: 'Token not found or access denied',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      patch: {
        summary: 'Update API token metadata',
        description: "Updates an API token's name, scopes, or active status",
        tags: ['API Tokens'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Token ID',
            example: '123e4567-e89b-12d3-a456-426614174000',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiTokenUpdateRequest' },
              example: {
                name: 'Updated Token Name',
                scopes: ['read'],
                isActive: false,
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Token updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/ApiTokenInfo' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid input data or token ID format',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationError' },
              },
            },
          },
          '401': {
            description: 'Authentication required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '404': {
            description: 'Token not found or access denied',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '409': {
            description: 'Token name already exists for user',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      delete: {
        summary: 'Revoke API token',
        description: 'Permanently revokes an API token by deleting it',
        tags: ['API Tokens'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Token ID',
            example: '123e4567-e89b-12d3-a456-426614174000',
          },
        ],
        responses: {
          '200': {
            description: 'Token revoked successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        message: {
                          type: 'string',
                          example: 'Token revoked successfully',
                        },
                      },
                    },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid token ID format',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationError' },
              },
            },
          },
          '401': {
            description: 'Authentication required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '404': {
            description: 'Token not found or access denied',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/tokens/{id}/usage': {
      get: {
        summary: 'Get token usage history',
        description: 'Returns paginated usage history for a specific API token',
        tags: ['API Tokens'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Token ID',
            example: '123e4567-e89b-12d3-a456-426614174000',
          },
          {
            in: 'query',
            name: 'page',
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: 'Page number for pagination',
          },
          {
            in: 'query',
            name: 'limit',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
            description: 'Number of records per page',
          },
          {
            in: 'query',
            name: 'from',
            schema: { type: 'string', format: 'date-time' },
            description: 'Start date for filtering usage records',
            example: '2024-01-01T00:00:00.000Z',
          },
          {
            in: 'query',
            name: 'to',
            schema: { type: 'string', format: 'date-time' },
            description: 'End date for filtering usage records',
            example: '2024-01-31T23:59:59.999Z',
          },
          {
            in: 'query',
            name: 'status',
            schema: { type: 'string' },
            description: 'Comma-separated HTTP status codes to filter by',
            example: '200,201,400',
          },
          {
            in: 'query',
            name: 'endpoint',
            schema: { type: 'string' },
            description: 'Filter by endpoint (partial match)',
            example: '/users',
          },
          {
            in: 'query',
            name: 'method',
            schema: {
              type: 'string',
              enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
            },
            description: 'Filter by HTTP method',
          },
        ],
        responses: {
          '200': {
            description: 'Usage history retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/TokenUsageResponse' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid query parameters',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationError' },
              },
            },
          },
          '401': {
            description: 'Authentication required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '404': {
            description: 'Token not found or access denied',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/tokens/{id}/usage/stats': {
      get: {
        summary: 'Get token usage statistics',
        description: 'Returns usage statistics for a specific API token',
        tags: ['API Tokens'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Token ID',
            example: '123e4567-e89b-12d3-a456-426614174000',
          },
          {
            in: 'query',
            name: 'from',
            schema: { type: 'string', format: 'date-time' },
            description: 'Start date for statistics calculation',
            example: '2024-01-01T00:00:00.000Z',
          },
          {
            in: 'query',
            name: 'to',
            schema: { type: 'string', format: 'date-time' },
            description: 'End date for statistics calculation',
            example: '2024-01-31T23:59:59.999Z',
          },
        ],
        responses: {
          '200': {
            description: 'Usage statistics retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/TokenUsageStats' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid query parameters',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationError' },
              },
            },
          },
          '401': {
            description: 'Authentication required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '404': {
            description: 'Token not found or access denied',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/tokens/{id}/usage/timeseries': {
      get: {
        summary: 'Get token usage time-series data',
        description: 'Returns time-series usage data for analytics and charts',
        tags: ['API Tokens'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Token ID',
            example: '123e4567-e89b-12d3-a456-426614174000',
          },
          {
            in: 'query',
            name: 'period',
            schema: { type: 'string', enum: ['hour', 'day'], default: 'day' },
            description: 'Aggregation period for time series',
          },
          {
            in: 'query',
            name: 'from',
            schema: { type: 'string', format: 'date-time' },
            description: 'Start date for time series',
            example: '2024-01-01T00:00:00.000Z',
          },
          {
            in: 'query',
            name: 'to',
            schema: { type: 'string', format: 'date-time' },
            description: 'End date for time series',
            example: '2024-01-31T23:59:59.999Z',
          },
        ],
        responses: {
          '200': {
            description: 'Time-series data retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/TokenUsageTimeSeries' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid query parameters',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationError' },
              },
            },
          },
          '401': {
            description: 'Authentication required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '404': {
            description: 'Token not found or access denied',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/users/avatar': {
      post: {
        summary: 'Upload user avatar',
        description: "Upload and update the authenticated user's avatar image",
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['avatar'],
                properties: {
                  avatar: {
                    type: 'string',
                    format: 'binary',
                    description:
                      'Avatar image file (jpg, png, gif, webp - max 5MB)',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Avatar uploaded successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: {
                      type: 'string',
                      example: 'Avatar uploaded successfully',
                    },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                        avatarUrl: {
                          type: 'string',
                          format: 'uri',
                          example:
                            'https://cdn.example.com/avatars/user-123/avatar.jpg',
                        },
                      },
                    },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Bad request - no file uploaded or validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '401': {
            description: 'Authentication required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '413': {
            description: 'File too large (exceeds 5MB)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '415': {
            description: 'Unsupported media type',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      delete: {
        summary: 'Delete user avatar',
        description: "Delete the authenticated user's avatar image",
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Avatar deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: {
                      type: 'string',
                      example: 'Avatar deleted successfully',
                    },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                      },
                    },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Authentication required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '404': {
            description: 'User not found or no avatar to delete',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/tools/short-links': {
      post: {
        summary: 'Create a new short link',
        description:
          'Create a new short link with optional custom name and expiration',
        tags: ['Tools - Short Links'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['originalUrl'],
                properties: {
                  originalUrl: {
                    type: 'string',
                    format: 'uri',
                    description: 'The original URL to shorten',
                    example: 'https://example.com/very/long/url/path',
                  },
                  customName: {
                    type: 'string',
                    minLength: 3,
                    maxLength: 30,
                    pattern: '^[a-zA-Z0-9-]+$',
                    description:
                      'Optional custom name (alphanumeric and hyphens only)',
                    example: 'my-custom-link',
                  },
                  expiresAt: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Optional expiration date',
                    example: '2025-12-31T23:59:59.000Z',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Short link created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        shortLink: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', format: 'uuid' },
                            code: { type: 'string', example: 'abc123' },
                            originalUrl: { type: 'string', format: 'uri' },
                            customName: { type: 'string', nullable: true },
                            expiresAt: {
                              type: 'string',
                              format: 'date-time',
                              nullable: true,
                            },
                            clickCount: { type: 'integer', example: 0 },
                            createdAt: { type: 'string', format: 'date-time' },
                            updatedAt: { type: 'string', format: 'date-time' },
                          },
                        },
                        shortUrl: {
                          type: 'string',
                          format: 'uri',
                          example: 'http://localhost:3000/s/abc123',
                        },
                      },
                    },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid request data',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '401': {
            description: 'Authentication required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      get: {
        summary: 'Get user short links',
        description: 'Retrieve short links created by the authenticated user',
        tags: ['Tools - Short Links'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'limit',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            description: 'Maximum number of results',
          },
          {
            in: 'query',
            name: 'offset',
            schema: { type: 'integer', minimum: 0, default: 0 },
            description: 'Number of results to skip',
          },
        ],
        responses: {
          '200': {
            description: 'Short links retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        shortLinks: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string', format: 'uuid' },
                              code: { type: 'string' },
                              originalUrl: { type: 'string', format: 'uri' },
                              customName: { type: 'string', nullable: true },
                              expiresAt: {
                                type: 'string',
                                format: 'date-time',
                                nullable: true,
                              },
                              clickCount: { type: 'integer' },
                              createdAt: {
                                type: 'string',
                                format: 'date-time',
                              },
                            },
                          },
                        },
                      },
                    },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/tools/short-links/check-availability/{customName}': {
      get: {
        summary: 'Check custom name availability',
        description: 'Check if a custom name is available for use',
        tags: ['Tools - Short Links'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'customName',
            required: true,
            schema: { type: 'string', minLength: 3, maxLength: 30 },
            description: 'Custom name to check',
            example: 'my-custom-link',
          },
        ],
        responses: {
          '200': {
            description: 'Availability check completed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        available: { type: 'boolean', example: true },
                        valid: { type: 'boolean', example: true },
                        error: { type: 'string', nullable: true },
                      },
                    },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/tools/short-links/{code}': {
      get: {
        summary: 'Resolve short link',
        description: 'Resolve a short code to get original URL information',
        tags: ['Tools - Short Links'],
        parameters: [
          {
            in: 'path',
            name: 'code',
            required: true,
            schema: { type: 'string', minLength: 6, maxLength: 8 },
            description: 'Short code to resolve',
            example: 'abc123',
          },
        ],
        responses: {
          '200': {
            description: 'Short link resolved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        shortLink: { type: 'object' },
                        originalUrl: { type: 'string', format: 'uri' },
                      },
                    },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Short link not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '410': {
            description: 'Short link has expired',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/tools/short-links/preview': {
      post: {
        summary: 'Preview URL',
        description: 'Preview URL information without creating a short link',
        tags: ['Tools - Short Links'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['url'],
                properties: {
                  url: {
                    type: 'string',
                    format: 'uri',
                    description: 'URL to preview',
                    example: 'https://example.com',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'URL preview generated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        valid: { type: 'boolean', example: true },
                        sanitizedUrl: { type: 'string', format: 'uri' },
                        domain: { type: 'string', example: 'example.com' },
                        isSecure: { type: 'boolean', example: true },
                      },
                    },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/tools': {
      get: {
        summary: 'Get public tools',
        description:
          'Retrieve list of enabled tools for feature gating (no authentication required)',
        tags: ['Tools - Public'],
        responses: {
          '200': {
            description: 'Public tools retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          key: { type: 'string', example: 'short-links' },
                          name: { type: 'string', example: 'Short Links' },
                          description: { type: 'string' },
                          slug: { type: 'string', example: 'short-links' },
                          enabled: { type: 'boolean', example: true },
                        },
                      },
                    },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/tools/{key}': {
      get: {
        summary: 'Get tool status',
        description:
          'Check if a specific tool is enabled (no authentication required)',
        tags: ['Tools - Public'],
        parameters: [
          {
            in: 'path',
            name: 'key',
            required: true,
            schema: { type: 'string' },
            description: 'Tool key (kebab-case)',
            example: 'short-links',
          },
        ],
        responses: {
          '200': {
            description: 'Tool status retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        key: { type: 'string', example: 'short-links' },
                        enabled: { type: 'boolean', example: true },
                        name: { type: 'string', example: 'Short Links' },
                      },
                    },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Tool not found or disabled',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/tools/slug/{slug}': {
      get: {
        summary: 'Get tool by slug',
        description:
          'Get tool information by slug for dynamic routing (no authentication required)',
        tags: ['Tools - Public'],
        parameters: [
          {
            in: 'path',
            name: 'slug',
            required: true,
            schema: { type: 'string' },
            description: 'Tool slug (URL-friendly identifier)',
            example: 'short-links',
          },
        ],
        responses: {
          '200': {
            description: 'Tool information retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        key: { type: 'string' },
                        name: { type: 'string' },
                        slug: { type: 'string' },
                        description: { type: 'string' },
                        enabled: { type: 'boolean' },
                      },
                    },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Tool not found or disabled',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/admin/tools': {
      get: {
        summary: 'Get all tools (admin)',
        description: 'Retrieve all tools in the registry (super admin only)',
        tags: ['Tools - Admin'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Tools retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          key: { type: 'string' },
                          name: { type: 'string' },
                          description: { type: 'string' },
                          slug: { type: 'string' },
                          enabled: { type: 'boolean' },
                          createdAt: { type: 'string', format: 'date-time' },
                          updatedAt: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '403': {
            description: 'Super admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create a new tool',
        description: 'Create a new tool in the registry (super admin only)',
        tags: ['Tools - Admin'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['key', 'name', 'slug'],
                properties: {
                  key: {
                    type: 'string',
                    pattern: '^[a-z0-9-]+$',
                    description: 'Unique tool key (kebab-case)',
                    example: 'short-links',
                  },
                  name: {
                    type: 'string',
                    description: 'Tool display name',
                    example: 'Short Links',
                  },
                  description: {
                    type: 'string',
                    description: 'Tool description',
                    example: 'Create and manage short URLs',
                  },
                  slug: {
                    type: 'string',
                    pattern: '^[a-z0-9-]+$',
                    description: 'URL-friendly slug',
                    example: 'short-links',
                  },
                  enabled: {
                    type: 'boolean',
                    default: true,
                    description: 'Whether the tool is enabled',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Tool created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'object' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid request data',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '403': {
            description: 'Super admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/admin/tools/{key}': {
      patch: {
        summary: 'Update tool status',
        description: 'Enable or disable a tool (super admin only)',
        tags: ['Tools - Admin'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'key',
            required: true,
            schema: { type: 'string' },
            description: 'Tool key',
            example: 'short-links',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['enabled'],
                properties: {
                  enabled: {
                    type: 'boolean',
                    description: 'Enable or disable the tool',
                    example: true,
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Tool updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'object' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '403': {
            description: 'Super admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '404': {
            description: 'Tool not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/users/{id}': {
      get: {
        summary: 'Get user by ID',
        description:
          'Get user by ID with role-based access control (admin can access any user, users can only access their own profile)',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'User ID (UUID)',
            example: '123e4567-e89b-12d3-a456-426614174000',
          },
        ],
        responses: {
          '200': {
            description: 'User retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
              },
            },
          },
          '404': {
            description: 'User not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      put: {
        summary: 'Update user (full replacement)',
        description: 'Update user with full replacement of data (admin only)',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'User ID (UUID)',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'firstName', 'lastName', 'role'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  firstName: { type: 'string', minLength: 1, maxLength: 50 },
                  lastName: { type: 'string', minLength: 1, maxLength: 50 },
                  role: { type: 'string', enum: ['admin', 'user', 'readonly'] },
                  isActive: { type: 'boolean' },
                  emailVerified: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'User updated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
              },
            },
          },
          '403': {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      patch: {
        summary: 'Partially update user',
        description:
          'Partially update user data (admin can update all fields, users can only update their own profile with limited fields)',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'User ID (UUID)',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                minProperties: 1,
                properties: {
                  email: { type: 'string', format: 'email' },
                  firstName: { type: 'string', minLength: 1, maxLength: 50 },
                  lastName: { type: 'string', minLength: 1, maxLength: 50 },
                  role: { type: 'string', enum: ['admin', 'user', 'readonly'] },
                  isActive: { type: 'boolean' },
                  emailVerified: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'User updated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
              },
            },
          },
        },
      },
      delete: {
        summary: 'Delete user (soft delete)',
        description:
          'Soft delete user account (admin only) - marks user as inactive rather than permanently deleting',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'User ID (UUID)',
          },
        ],
        responses: {
          '204': {
            description: 'User deleted successfully (no content)',
          },
          '403': {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT Authorization header using the Bearer scheme',
      },
    },
    schemas: {
      User: {
        type: 'object',
        required: ['id', 'email', 'firstName', 'lastName', 'role'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique identifier (UUID v4)',
            example: '123e4567-e89b-12d3-a456-426614174000',
          },
          email: {
            type: 'string',
            format: 'email',
            description: "User's email address (unique per tenant)",
            example: 'user@example.com',
          },
          firstName: {
            type: 'string',
            description: "User's first name",
            example: 'John',
          },
          lastName: {
            type: 'string',
            description: "User's last name",
            example: 'Doe',
          },
          role: {
            type: 'string',
            enum: ['admin', 'user', 'readonly'],
            description: 'User role determining permissions',
            example: 'user',
          },
          tenantId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'Optional tenant ID for multi-tenant mode',
            example: null,
          },
          avatarUrl: {
            type: 'string',
            format: 'uri',
            nullable: true,
            description: "URL to user's avatar image",
            example: 'https://cdn.example.com/avatars/user-123/avatar.jpg',
          },
          isActive: {
            type: 'boolean',
            description: 'Whether the user account is active',
            example: true,
          },
          emailVerified: {
            type: 'boolean',
            description: "Whether the user's email address has been verified",
            example: true,
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Account creation timestamp',
            example: '2024-01-01T00:00:00.000Z',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Last modification timestamp',
            example: '2024-01-15T10:30:00.000Z',
          },
        },
      },
      UserRegistration: {
        type: 'object',
        required: ['email', 'password', 'firstName', 'lastName'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address',
          },
          password: {
            type: 'string',
            minLength: 8,
            description: 'User password (min 8 characters)',
          },
          firstName: {
            type: 'string',
            description: 'User first name',
          },
          lastName: {
            type: 'string',
            description: 'User last name',
          },
        },
      },
      UserLogin: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address',
          },
          password: {
            type: 'string',
            description: 'User password',
          },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'JWT access token',
          },
          refreshToken: {
            type: 'string',
            description: 'JWT refresh token',
          },
          user: {
            $ref: '#/components/schemas/UserProfile',
          },
        },
      },
      UserProfile: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique identifier (UUID v4)',
            example: '123e4567-e89b-12d3-a456-426614174000',
          },
          email: {
            type: 'string',
            format: 'email',
            description: "User's email address (unique per tenant)",
            example: 'user@example.com',
          },
          firstName: {
            type: 'string',
            description: "User's first name",
            example: 'John',
          },
          lastName: {
            type: 'string',
            description: "User's last name",
            example: 'Doe',
          },
          role: {
            type: 'string',
            enum: ['admin', 'user', 'readonly'],
            description: 'User role determining permissions',
            example: 'user',
          },
          tenantId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'Optional tenant ID for multi-tenant mode',
            example: null,
          },
          avatarUrl: {
            type: 'string',
            format: 'uri',
            nullable: true,
            description: "URL to user's avatar image",
            example: 'https://cdn.example.com/avatars/user-123/avatar.jpg',
          },
          isActive: {
            type: 'boolean',
            description: 'Whether the user account is active',
            example: true,
          },
          emailVerified: {
            type: 'boolean',
            description: "Whether the user's email address has been verified",
            example: true,
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Account creation timestamp',
            example: '2024-01-01T00:00:00.000Z',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Last modification timestamp',
            example: '2024-01-15T10:30:00.000Z',
          },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'Error code identifier',
              },
              message: {
                type: 'string',
                description: 'Human-readable error message',
              },
              details: {
                type: 'object',
                description: 'Additional error details',
              },
              timestamp: {
                type: 'string',
                format: 'date-time',
                description: 'Error occurrence timestamp',
              },
              requestId: {
                type: 'string',
                description: 'Unique request identifier for tracking',
              },
            },
          },
        },
      },
      ValidationError: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Validation error message',
          },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: {
                  type: 'string',
                  description: 'Field name with validation error',
                },
                message: {
                  type: 'string',
                  description: 'Validation error message',
                },
              },
            },
          },
        },
      },
      RefreshTokenRequest: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: {
            type: 'string',
            description: 'Valid JWT refresh token',
          },
        },
      },
      UserUpdateRequest: {
        type: 'object',
        properties: {
          firstName: {
            type: 'string',
            description: 'Updated first name',
          },
          lastName: {
            type: 'string',
            description: 'Updated last name',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Updated email address',
          },
        },
      },
      PasswordResetRequest: {
        type: 'object',
        required: ['email'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'Email address for password reset',
          },
        },
      },
      PasswordResetConfirm: {
        type: 'object',
        required: ['token', 'newPassword'],
        properties: {
          token: {
            type: 'string',
            description: 'Password reset token',
          },
          newPassword: {
            type: 'string',
            minLength: 8,
            description: 'New password meeting security requirements',
          },
        },
      },
      PaginationResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: {},
            description: 'Array of data items',
          },
          pagination: {
            type: 'object',
            properties: {
              page: {
                type: 'integer',
                description: 'Current page number',
              },
              limit: {
                type: 'integer',
                description: 'Items per page',
              },
              total: {
                type: 'integer',
                description: 'Total number of items',
              },
              totalPages: {
                type: 'integer',
                description: 'Total number of pages',
              },
            },
          },
        },
      },
      ApiTokenRequest: {
        type: 'object',
        required: ['name', 'scopes'],
        properties: {
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
            description: 'User-friendly name for the API token',
            example: 'Production API Access',
          },
          scopes: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['read', 'write'],
            },
            minItems: 1,
            description: 'Array of permissions for the token',
            example: ['read', 'write'],
          },
          expiresAt: {
            type: 'string',
            format: 'date-time',
            description: 'Optional expiration date (defaults to 1 year)',
            example: '2025-12-31T23:59:59.999Z',
          },
        },
      },
      ApiTokenResponse: {
        type: 'object',
        properties: {
          token: {
            type: 'string',
            description:
              'The plaintext API token (only shown once on creation)',
            example:
              'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890123456',
          },
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique identifier for the token',
            example: '123e4567-e89b-12d3-a456-426614174000',
          },
          name: {
            type: 'string',
            description: 'User-friendly name for the token',
            example: 'Production API Access',
          },
          scopes: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of permissions for the token',
            example: ['read', 'write'],
          },
          expiresAt: {
            type: 'string',
            format: 'date-time',
            description: 'Token expiration timestamp',
            example: '2025-12-31T23:59:59.999Z',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Token creation timestamp',
            example: '2024-01-15T10:30:00.000Z',
          },
          isActive: {
            type: 'boolean',
            description: 'Whether the token is active',
            example: true,
          },
        },
      },
      ApiTokenInfo: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique identifier for the token',
            example: '123e4567-e89b-12d3-a456-426614174000',
          },
          name: {
            type: 'string',
            description: 'User-friendly name for the token',
            example: 'Production API Access',
          },
          scopes: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of permissions for the token',
            example: ['read', 'write'],
          },
          expiresAt: {
            type: 'string',
            format: 'date-time',
            description: 'Token expiration timestamp',
            example: '2025-12-31T23:59:59.999Z',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Token creation timestamp',
            example: '2024-01-15T10:30:00.000Z',
          },
          lastUsedAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description: 'Last time token was used for authentication',
            example: '2024-01-20T14:45:30.000Z',
          },
          isActive: {
            type: 'boolean',
            description: 'Whether the token is active',
            example: true,
          },
        },
      },
      ApiTokenUpdateRequest: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
            description: 'Updated user-friendly name for the token',
            example: 'Updated Token Name',
          },
          scopes: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['read', 'write'],
            },
            minItems: 1,
            description: 'Updated array of permissions for the token',
            example: ['read'],
          },
          isActive: {
            type: 'boolean',
            description: 'Updated active status for the token',
            example: false,
          },
        },
      },
      TokenUsageResponse: {
        type: 'object',
        properties: {
          usage: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  format: 'uuid',
                  example: '456e7890-e12b-34c5-d678-901234567890',
                },
                endpoint: {
                  type: 'string',
                  example: '/api/v1/users',
                },
                method: {
                  type: 'string',
                  example: 'GET',
                },
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                  example: '2024-01-20T14:30:00.000Z',
                },
                responseStatus: {
                  type: 'integer',
                  example: 200,
                },
                processingTime: {
                  type: 'integer',
                  description: 'Processing time in milliseconds',
                  example: 125,
                },
                ipAddress: {
                  type: 'string',
                  example: '192.168.1.100',
                },
              },
            },
          },
          pagination: {
            type: 'object',
            properties: {
              page: { type: 'integer', example: 1 },
              limit: { type: 'integer', example: 50 },
              total: { type: 'integer', example: 247 },
              totalPages: { type: 'integer', example: 5 },
            },
          },
        },
      },
      TokenUsageStats: {
        type: 'object',
        properties: {
          totalRequests: {
            type: 'integer',
            description: 'Total number of requests made with this token',
            example: 1250,
          },
          successfulRequests: {
            type: 'integer',
            description: 'Number of successful requests (2xx status)',
            example: 1180,
          },
          failedRequests: {
            type: 'integer',
            description: 'Number of failed requests (4xx, 5xx status)',
            example: 70,
          },
          averageResponseTime: {
            type: 'number',
            description: 'Average response time in milliseconds',
            example: 145.5,
          },
          topEndpoints: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                endpoint: {
                  type: 'string',
                  example: '/api/v1/users',
                },
                count: {
                  type: 'integer',
                  example: 487,
                },
              },
            },
            description: 'Most frequently accessed endpoints',
          },
          requestsByStatus: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                status: {
                  type: 'integer',
                  example: 200,
                },
                count: {
                  type: 'integer',
                  example: 1180,
                },
              },
            },
            description: 'Request count by HTTP status code',
          },
        },
      },
      TokenUsageTimeSeries: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['hour', 'day'],
            description: 'Time period for aggregation',
            example: 'day',
          },
          data: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                period: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Start of the time period',
                  example: '2024-01-20T00:00:00.000Z',
                },
                requests: {
                  type: 'integer',
                  description: 'Number of requests in this period',
                  example: 42,
                },
                averageResponseTime: {
                  type: 'number',
                  description: 'Average response time for this period in ms',
                  example: 138.5,
                },
              },
            },
          },
        },
      },
      FormTheme: {
        type: 'object',
        required: [
          'id',
          'name',
          'thumbnailUrl',
          'themeConfig',
          'usageCount',
          'isActive',
        ],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique identifier (UUID v4)',
            example: '123e4567-e89b-12d3-a456-426614174000',
          },
          name: {
            type: 'string',
            minLength: 3,
            maxLength: 100,
            description: 'Theme display name',
            example: 'Modern Blue',
          },
          description: {
            type: 'string',
            maxLength: 500,
            nullable: true,
            description: 'Optional theme description',
            example: 'Clean modern theme with blue accents',
          },
          thumbnailUrl: {
            type: 'string',
            format: 'uri',
            maxLength: 500,
            description: 'DigitalOcean Spaces URL for thumbnail image',
            example: 'https://spaces.example.com/theme-thumb.jpg',
          },
          themeConfig: {
            $ref: '#/components/schemas/ResponsiveThemeConfig',
          },
          usageCount: {
            type: 'integer',
            minimum: 0,
            description: 'Aggregate count of theme applications',
            example: 1234,
          },
          isActive: {
            type: 'boolean',
            description: 'Soft-delete flag',
            example: true,
          },
          createdBy: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'UUID reference to users(id)',
            example: '123e4567-e89b-12d3-a456-426614174000',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Theme creation timestamp',
            example: '2024-01-15T10:00:00.000Z',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Last modification timestamp',
            example: '2024-01-15T10:00:00.000Z',
          },
        },
      },
      ResponsiveThemeConfig: {
        type: 'object',
        required: ['desktop'],
        properties: {
          desktop: {
            $ref: '#/components/schemas/ThemeProperties',
          },
          mobile: {
            allOf: [
              { $ref: '#/components/schemas/ThemeProperties' },
              {
                type: 'object',
                description: 'All properties are optional for mobile overrides',
              },
            ],
          },
        },
      },
      ThemeProperties: {
        type: 'object',
        required: [
          'primaryColor',
          'secondaryColor',
          'backgroundColor',
          'textColorPrimary',
          'textColorSecondary',
          'fontFamilyHeading',
          'fontFamilyBody',
          'fieldBorderRadius',
          'fieldSpacing',
          'containerBackground',
          'containerOpacity',
          'containerPosition',
        ],
        properties: {
          primaryColor: {
            type: 'string',
            pattern: '^#[0-9A-Fa-f]{6}$',
            description: 'Primary color (hex format)',
            example: '#007bff',
          },
          secondaryColor: {
            type: 'string',
            pattern: '^#[0-9A-Fa-f]{6}$',
            description: 'Secondary color (hex format)',
            example: '#6c757d',
          },
          backgroundColor: {
            type: 'string',
            pattern: '^#[0-9A-Fa-f]{6}$',
            description: 'Background color (hex format)',
            example: '#ffffff',
          },
          textColorPrimary: {
            type: 'string',
            pattern: '^#[0-9A-Fa-f]{6}$',
            description: 'Primary text color (hex format)',
            example: '#212529',
          },
          textColorSecondary: {
            type: 'string',
            pattern: '^#[0-9A-Fa-f]{6}$',
            description: 'Secondary text color (hex format)',
            example: '#6c757d',
          },
          fontFamilyHeading: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
            description: 'Font family for headings',
            example: 'Roboto',
          },
          fontFamilyBody: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
            description: 'Font family for body text',
            example: 'Open Sans',
          },
          fieldBorderRadius: {
            type: 'string',
            minLength: 1,
            maxLength: 50,
            description: 'Field border radius (CSS value)',
            example: '8px',
          },
          fieldSpacing: {
            type: 'string',
            minLength: 1,
            maxLength: 50,
            description: 'Field spacing (CSS value)',
            example: '16px',
          },
          containerBackground: {
            type: 'string',
            pattern: '^#[0-9A-Fa-f]{6}$',
            description: 'Container background color (hex format)',
            example: '#f8f9fa',
          },
          containerOpacity: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Container opacity (0-1)',
            example: 0.95,
          },
          containerPosition: {
            type: 'string',
            enum: ['center', 'top', 'left', 'full-width'],
            description: 'Container position within form',
            example: 'center',
          },
          backgroundImageUrl: {
            type: 'string',
            format: 'uri',
            nullable: true,
            description: 'Optional background image URL',
            example: 'https://spaces.example.com/background.jpg',
          },
          backgroundImagePosition: {
            type: 'string',
            enum: ['cover', 'contain', 'repeat'],
            nullable: true,
            description: 'Background image positioning',
            example: 'cover',
          },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

export { swaggerSpec };
export default swaggerSpec;
