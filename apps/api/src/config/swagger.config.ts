import swaggerJsdoc, { Options } from 'swagger-jsdoc';

const options: Options = {
  definition: {
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
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/middleware/*.ts'
  ]
};

export const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;