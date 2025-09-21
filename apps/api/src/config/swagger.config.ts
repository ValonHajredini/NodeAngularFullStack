// Direct OpenAPI specification without swagger-jsdoc since it has issues with TypeScript
const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Node Angular Full Stack API',
    version: '1.0.0',
    description: 'A comprehensive API for the Node Angular Full Stack application',
    contact: {
      name: 'API Support',
      email: 'support@example.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000/api/v1',
      description: 'Development server'
    },
    {
      url: 'https://api.example.com/v1',
      description: 'Production server'
    }
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Comprehensive health check',
        description: 'Returns detailed health status including database connectivity and system metrics',
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
                    uptime: { type: 'number', description: 'Process uptime in seconds' },
                    database: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', example: 'connected' },
                        responseTime: { type: 'number', description: 'Database response time in ms' }
                      }
                    },
                    environment: { type: 'string', example: 'development' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/health/readiness': {
      get: {
        summary: 'Kubernetes readiness probe',
        description: 'Returns 200 if service is ready to accept traffic, 503 otherwise',
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
                    timestamp: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/health/liveness': {
      get: {
        summary: 'Kubernetes liveness probe',
        description: 'Returns 200 if service is alive, used to determine if container should be restarted',
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
                    timestamp: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      }
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
                lastName: 'Doe'
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Registration successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' }
              }
            }
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationError' }
              }
            }
          },
          '409': {
            description: 'Email already exists',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
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
                password: 'SecurePass123!'
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' }
              }
            }
          },
          '401': {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
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
              schema: { $ref: '#/components/schemas/RefreshTokenRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Token refresh successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' }
              }
            }
          },
          '401': {
            description: 'Invalid or expired refresh token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
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
                    message: { type: 'string', example: 'Logged out successfully' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/auth/logout-all': {
      post: {
        summary: 'Logout from all devices',
        description: 'Logout user from all devices by invalidating all refresh tokens',
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
                    message: { type: 'string', example: 'Logged out from all devices successfully' }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Authentication required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/auth/profile': {
      get: {
        summary: 'Get user profile',
        description: 'Get authenticated user\'s profile information',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'User profile retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserProfile' }
              }
            }
          },
          '401': {
            description: 'Authentication required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      },
      patch: {
        summary: 'Update user profile',
        description: 'Update authenticated user\'s profile information',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UserUpdateRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Profile updated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserProfile' }
              }
            }
          },
          '401': {
            description: 'Authentication required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/auth/password-reset': {
      post: {
        summary: 'Request password reset',
        description: 'Request password reset email (always returns success for security)',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PasswordResetRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Password reset email sent',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Password reset email sent if account exists' }
                  }
                }
              }
            }
          }
        }
      }
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
              schema: { $ref: '#/components/schemas/PasswordResetConfirm' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Password reset successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Password reset successful' }
                  }
                }
              }
            }
          }
        }
      }
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
            description: 'Password reset token to validate'
          }
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
                    expiresAt: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      }
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
                          role: { type: 'string', enum: ['admin', 'user', 'readonly'] }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
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
                        expiresAt: { type: 'string', format: 'date-time' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
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
                  emailVerified: { type: 'boolean', default: false }
                }
              },
              example: {
                email: 'newuser@example.com',
                firstName: 'John',
                lastName: 'Doe',
                role: 'user',
                password: 'TempPassword123!',
                isActive: true,
                emailVerified: false
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'User created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' }
              }
            }
          },
          '403': {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      },
      get: {
        summary: 'Get paginated list of users',
        description: 'Get paginated list of users with search and filtering (admin only)',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'page',
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: 'Page number for pagination'
          },
          {
            in: 'query',
            name: 'limit',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            description: 'Number of items per page'
          },
          {
            in: 'query',
            name: 'search',
            schema: { type: 'string' },
            description: 'Search term for email, firstName, or lastName'
          },
          {
            in: 'query',
            name: 'role',
            schema: { type: 'string', enum: ['admin', 'user', 'readonly'] },
            description: 'Filter by user role'
          },
          {
            in: 'query',
            name: 'status',
            schema: { type: 'string', enum: ['active', 'inactive', 'all'], default: 'all' },
            description: 'Filter by user status'
          }
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
                          items: { $ref: '#/components/schemas/User' }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    '/users/{id}': {
      get: {
        summary: 'Get user by ID',
        description: 'Get user by ID with role-based access control (admin can access any user, users can only access their own profile)',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'User ID (UUID)',
            example: '123e4567-e89b-12d3-a456-426614174000'
          }
        ],
        responses: {
          '200': {
            description: 'User retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' }
              }
            }
          },
          '404': {
            description: 'User not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
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
            description: 'User ID (UUID)'
          }
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
                  emailVerified: { type: 'boolean' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'User updated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' }
              }
            }
          },
          '403': {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      },
      patch: {
        summary: 'Partially update user',
        description: 'Partially update user data (admin can update all fields, users can only update their own profile with limited fields)',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'User ID (UUID)'
          }
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
                  emailVerified: { type: 'boolean' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'User updated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' }
              }
            }
          }
        }
      },
      delete: {
        summary: 'Delete user (soft delete)',
        description: 'Soft delete user account (admin only) - marks user as inactive rather than permanently deleting',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'User ID (UUID)'
          }
        ],
        responses: {
          '204': {
            description: 'User deleted successfully (no content)'
          },
          '403': {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT Authorization header using the Bearer scheme'
      }
    },
    schemas: {
      User: {
        type: 'object',
        required: ['id', 'email', 'firstName', 'lastName', 'role'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique identifier (UUID v4)'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User\'s email address (unique per tenant)'
          },
          firstName: {
            type: 'string',
            description: 'User\'s first name'
          },
          lastName: {
            type: 'string',
            description: 'User\'s last name'
          },
          role: {
            type: 'string',
            enum: ['admin', 'user', 'readonly'],
            description: 'User role determining permissions'
          },
          tenantId: {
            type: 'string',
            format: 'uuid',
            description: 'Optional tenant ID for multi-tenant mode'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Account creation timestamp'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Last modification timestamp'
          }
        }
      },
      UserRegistration: {
        type: 'object',
        required: ['email', 'password', 'firstName', 'lastName'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address'
          },
          password: {
            type: 'string',
            minLength: 8,
            description: 'User password (min 8 characters)'
          },
          firstName: {
            type: 'string',
            description: 'User first name'
          },
          lastName: {
            type: 'string',
            description: 'User last name'
          }
        }
      },
      UserLogin: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address'
          },
          password: {
            type: 'string',
            description: 'User password'
          }
        }
      },
      AuthResponse: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'JWT access token'
          },
          refreshToken: {
            type: 'string',
            description: 'JWT refresh token'
          },
          user: {
            $ref: '#/components/schemas/UserProfile'
          }
        }
      },
      UserProfile: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique identifier (UUID v4)'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User\'s email address (unique per tenant)'
          },
          firstName: {
            type: 'string',
            description: 'User\'s first name'
          },
          lastName: {
            type: 'string',
            description: 'User\'s last name'
          },
          role: {
            type: 'string',
            enum: ['admin', 'user', 'readonly'],
            description: 'User role determining permissions'
          },
          tenantId: {
            type: 'string',
            format: 'uuid',
            description: 'Optional tenant ID for multi-tenant mode'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Account creation timestamp'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Last modification timestamp'
          }
        }
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'Error code identifier'
              },
              message: {
                type: 'string',
                description: 'Human-readable error message'
              },
              details: {
                type: 'object',
                description: 'Additional error details'
              },
              timestamp: {
                type: 'string',
                format: 'date-time',
                description: 'Error occurrence timestamp'
              },
              requestId: {
                type: 'string',
                description: 'Unique request identifier for tracking'
              }
            }
          }
        }
      },
      ValidationError: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Validation error message'
          },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: {
                  type: 'string',
                  description: 'Field name with validation error'
                },
                message: {
                  type: 'string',
                  description: 'Validation error message'
                }
              }
            }
          }
        }
      },
      RefreshTokenRequest: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: {
            type: 'string',
            description: 'Valid JWT refresh token'
          }
        }
      },
      UserUpdateRequest: {
        type: 'object',
        properties: {
          firstName: {
            type: 'string',
            description: 'Updated first name'
          },
          lastName: {
            type: 'string',
            description: 'Updated last name'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Updated email address'
          }
        }
      },
      PasswordResetRequest: {
        type: 'object',
        required: ['email'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'Email address for password reset'
          }
        }
      },
      PasswordResetConfirm: {
        type: 'object',
        required: ['token', 'newPassword'],
        properties: {
          token: {
            type: 'string',
            description: 'Password reset token'
          },
          newPassword: {
            type: 'string',
            minLength: 8,
            description: 'New password meeting security requirements'
          }
        }
      },
      PaginationResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: {},
            description: 'Array of data items'
          },
          pagination: {
            type: 'object',
            properties: {
              page: {
                type: 'integer',
                description: 'Current page number'
              },
              limit: {
                type: 'integer',
                description: 'Items per page'
              },
              total: {
                type: 'integer',
                description: 'Total number of items'
              },
              totalPages: {
                type: 'integer',
                description: 'Total number of pages'
              }
            }
          }
        }
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ]
};

export { swaggerSpec };
export default swaggerSpec;