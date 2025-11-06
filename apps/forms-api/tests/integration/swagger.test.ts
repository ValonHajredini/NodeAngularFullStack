import request from 'supertest';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';

/**
 * Integration tests for Swagger OpenAPI documentation.
 * Tests the accessibility, generation, and functionality of API documentation.
 */
describe('Swagger Documentation Integration Tests', () => {
  let app: express.Application;
  let swaggerSpec: any;

  beforeAll(() => {
    // Create swagger spec with proper paths relative to project root
    const apiDir = path.resolve(__dirname, '../../src');

    const swaggerOptions = {
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
        path.join(apiDir, 'routes/*.ts'),
        path.join(apiDir, 'controllers/*.ts'),
        path.join(apiDir, 'middleware/*.ts')
      ]
    };

    swaggerSpec = swaggerJsdoc(swaggerOptions);

    // Create a minimal Express app for testing Swagger
    app = express();

    // Serve the swagger.json directly BEFORE the UI middleware
    app.get('/api-docs/swagger.json', (_req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.json(swaggerSpec);
    });

    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'NodeAngularFullStack API Documentation',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: true
      }
    }));
  });

  describe('Swagger UI Interface', () => {
    it('should serve Swagger UI at /api-docs endpoint', async () => {
      const response = await request(app)
        .get('/api-docs/')
        .expect(200);

      expect(response.text).toContain('NodeAngularFullStack API Documentation');
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });

    it('should have proper HTML structure for Swagger UI', async () => {
      const response = await request(app)
        .get('/api-docs/')
        .expect(200);

      expect(response.text).toContain('swagger-ui-bundle');
      expect(response.text).toContain('swagger-ui-standalone-preset');
      expect(response.text).toContain('NodeAngularFullStack API Documentation');
    });
  });

  describe('OpenAPI Specification Generation', () => {
    it('should generate valid OpenAPI 3.0 specification', async () => {
      const response = await request(app)
        .get('/api-docs/swagger.json')
        .expect(200)
        .expect('Content-Type', /application\/json/);

      const spec = response.body;

      // Validate basic OpenAPI structure
      expect(spec).toHaveProperty('openapi', '3.0.0');
      expect(spec).toHaveProperty('info');
      expect(spec).toHaveProperty('paths');
      expect(spec).toHaveProperty('components');
      expect(spec).toHaveProperty('servers');
    });

    it('should include correct API information', () => {
      expect(swaggerSpec.info).toHaveProperty('title', 'Node Angular Full Stack API');
      expect(swaggerSpec.info).toHaveProperty('version', '1.0.0');
      expect(swaggerSpec.info).toHaveProperty('description');
      expect(swaggerSpec.info).toHaveProperty('contact');
      expect(swaggerSpec.info).toHaveProperty('license');
    });

    it('should include development and production servers', () => {
      expect(swaggerSpec.servers).toHaveLength(2);
      expect(swaggerSpec.servers[0]).toHaveProperty('url', 'http://localhost:3000/api/v1');
      expect(swaggerSpec.servers[0]).toHaveProperty('description', 'Development server');
      expect(swaggerSpec.servers[1]).toHaveProperty('url', 'https://api.example.com/v1');
      expect(swaggerSpec.servers[1]).toHaveProperty('description', 'Production server');
    });
  });

  describe('Authentication Endpoints Documentation', () => {

    it('should document all authentication endpoints', () => {
      const paths = swaggerSpec.paths;

      // Check all required authentication endpoints are documented
      expect(paths).toHaveProperty('/api/v1/auth/register');
      expect(paths).toHaveProperty('/api/v1/auth/login');
      expect(paths).toHaveProperty('/api/v1/auth/refresh');
      expect(paths).toHaveProperty('/api/v1/auth/logout');
      expect(paths).toHaveProperty('/api/v1/auth/logout-all');
      expect(paths).toHaveProperty('/api/v1/auth/profile');
      expect(paths).toHaveProperty('/api/v1/auth/password-reset');
      expect(paths).toHaveProperty('/api/v1/auth/password-reset/confirm');
      expect(paths).toHaveProperty('/api/v1/auth/me');
    });

    it('should include proper HTTP methods for auth endpoints', () => {
      const paths = swaggerSpec.paths;

      // Registration and login endpoints
      expect(paths['/api/v1/auth/register']).toHaveProperty('post');
      expect(paths['/api/v1/auth/login']).toHaveProperty('post');
      expect(paths['/api/v1/auth/refresh']).toHaveProperty('post');

      // Logout endpoints
      expect(paths['/api/v1/auth/logout']).toHaveProperty('post');
      expect(paths['/api/v1/auth/logout-all']).toHaveProperty('post');

      // Profile endpoints
      expect(paths['/api/v1/auth/profile']).toHaveProperty('get');
      expect(paths['/api/v1/auth/profile']).toHaveProperty('patch');

      // Password reset endpoints
      expect(paths['/api/v1/auth/password-reset']).toHaveProperty('post');
      expect(paths['/api/v1/auth/password-reset/confirm']).toHaveProperty('post');

      // Token info endpoint
      expect(paths['/api/v1/auth/me']).toHaveProperty('get');
    });

    it('should include Authentication tags for all auth endpoints', () => {
      const paths = swaggerSpec.paths;

      // Check that all auth endpoints have Authentication tag
      const authEndpoints = [
        '/api/v1/auth/register',
        '/api/v1/auth/login',
        '/api/v1/auth/refresh',
        '/api/v1/auth/logout',
        '/api/v1/auth/logout-all',
        '/api/v1/auth/profile',
        '/api/v1/auth/password-reset',
        '/api/v1/auth/password-reset/confirm',
        '/api/v1/auth/me'
      ];

      authEndpoints.forEach(endpoint => {
        const methods = Object.keys(paths[endpoint]);
        methods.forEach(method => {
          expect(paths[endpoint][method]).toHaveProperty('tags');
          expect(paths[endpoint][method].tags).toContain('Authentication');
        });
      });
    });
  });

  describe('Health Check Endpoints Documentation', () => {

    it('should document health check endpoints', () => {
      const paths = swaggerSpec.paths;

      expect(paths).toHaveProperty('/api/v1/health');
      expect(paths).toHaveProperty('/api/v1/health/readiness');
      expect(paths).toHaveProperty('/api/v1/health/liveness');
      expect(paths).toHaveProperty('/health');
    });

    it('should include Health tags for health endpoints', () => {
      const paths = swaggerSpec.paths;

      const healthEndpoints = [
        '/api/v1/health',
        '/api/v1/health/readiness',
        '/api/v1/health/liveness',
        '/health'
      ];

      healthEndpoints.forEach(endpoint => {
        if (paths[endpoint]) {
          const methods = Object.keys(paths[endpoint]);
          methods.forEach(method => {
            expect(paths[endpoint][method]).toHaveProperty('tags');
            expect(paths[endpoint][method].tags).toContain('Health');
          });
        }
      });
    });
  });

  describe('Security Schemes Documentation', () => {

    it('should include JWT Bearer authentication scheme', () => {
      expect(swaggerSpec.components).toHaveProperty('securitySchemes');
      expect(swaggerSpec.components.securitySchemes).toHaveProperty('bearerAuth');

      const bearerAuth = swaggerSpec.components.securitySchemes.bearerAuth;
      expect(bearerAuth).toHaveProperty('type', 'http');
      expect(bearerAuth).toHaveProperty('scheme', 'bearer');
      expect(bearerAuth).toHaveProperty('bearerFormat', 'JWT');
      expect(bearerAuth).toHaveProperty('description');
    });

    it('should apply security to protected endpoints', () => {
      const paths = swaggerSpec.paths;

      // Protected endpoints should have security requirements
      const protectedEndpoints = [
        { path: '/api/v1/auth/profile', method: 'get' },
        { path: '/api/v1/auth/profile', method: 'patch' },
        { path: '/api/v1/auth/logout-all', method: 'post' },
        { path: '/api/v1/auth/me', method: 'get' }
      ];

      protectedEndpoints.forEach(({ path, method }) => {
        if (paths[path] && paths[path][method]) {
          expect(paths[path][method]).toHaveProperty('security');
          expect(paths[path][method].security).toContainEqual({ bearerAuth: [] });
        }
      });
    });
  });

  describe('Schema Definitions', () => {

    it('should include all required schemas', () => {
      const schemas = swaggerSpec.components.schemas;

      // Core schemas
      expect(schemas).toHaveProperty('User');
      expect(schemas).toHaveProperty('UserProfile');
      expect(schemas).toHaveProperty('UserRegistration');
      expect(schemas).toHaveProperty('UserLogin');
      expect(schemas).toHaveProperty('AuthResponse');
      expect(schemas).toHaveProperty('Error');
      expect(schemas).toHaveProperty('ValidationError');

      // Additional schemas
      expect(schemas).toHaveProperty('RefreshTokenRequest');
      expect(schemas).toHaveProperty('UserUpdateRequest');
      expect(schemas).toHaveProperty('PasswordResetRequest');
      expect(schemas).toHaveProperty('PasswordResetConfirm');
      expect(schemas).toHaveProperty('PaginationResponse');
    });

    it('should have proper User schema structure', () => {
      const userSchema = swaggerSpec.components.schemas.User;

      expect(userSchema).toHaveProperty('type', 'object');
      expect(userSchema).toHaveProperty('required');
      expect(userSchema.required).toContain('id');
      expect(userSchema.required).toContain('email');
      expect(userSchema.required).toContain('firstName');
      expect(userSchema.required).toContain('lastName');
      expect(userSchema.required).toContain('role');

      // Check properties
      expect(userSchema.properties).toHaveProperty('id');
      expect(userSchema.properties.id).toHaveProperty('type', 'string');
      expect(userSchema.properties.id).toHaveProperty('format', 'uuid');

      expect(userSchema.properties).toHaveProperty('role');
      expect(userSchema.properties.role).toHaveProperty('enum');
      expect(userSchema.properties.role.enum).toEqual(['admin', 'user', 'readonly']);
    });

    it('should have proper AuthResponse schema structure', () => {
      const authResponseSchema = swaggerSpec.components.schemas.AuthResponse;

      expect(authResponseSchema).toHaveProperty('type', 'object');
      expect(authResponseSchema.properties).toHaveProperty('accessToken');
      expect(authResponseSchema.properties).toHaveProperty('refreshToken');
      expect(authResponseSchema.properties).toHaveProperty('user');
      expect(authResponseSchema.properties.user).toHaveProperty('$ref', '#/components/schemas/UserProfile');
    });

    it('should have proper Error schema structure', () => {
      const errorSchema = swaggerSpec.components.schemas.Error;

      expect(errorSchema).toHaveProperty('type', 'object');
      expect(errorSchema.properties).toHaveProperty('error');
      expect(errorSchema.properties.error).toHaveProperty('type', 'object');

      const errorProperties = errorSchema.properties.error.properties;
      expect(errorProperties).toHaveProperty('code');
      expect(errorProperties).toHaveProperty('message');
      expect(errorProperties).toHaveProperty('details');
      expect(errorProperties).toHaveProperty('timestamp');
      expect(errorProperties).toHaveProperty('requestId');
    });
  });

  describe('Response Status Codes', () => {

    it('should document proper status codes for login endpoint', () => {
      const loginEndpoint = swaggerSpec.paths['/api/v1/auth/login'].post;

      expect(loginEndpoint.responses).toHaveProperty('200');
      expect(loginEndpoint.responses).toHaveProperty('400');
      expect(loginEndpoint.responses).toHaveProperty('401');

      // Check response descriptions
      expect(loginEndpoint.responses['200']).toHaveProperty('description', 'Login successful');
      expect(loginEndpoint.responses['400']).toHaveProperty('description', 'Validation error');
      expect(loginEndpoint.responses['401']).toHaveProperty('description', 'Invalid credentials');
    });

    it('should document proper status codes for registration endpoint', () => {
      const registerEndpoint = swaggerSpec.paths['/api/v1/auth/register'].post;

      expect(registerEndpoint.responses).toHaveProperty('201');
      expect(registerEndpoint.responses).toHaveProperty('400');
      expect(registerEndpoint.responses).toHaveProperty('409');

      // Check response descriptions
      expect(registerEndpoint.responses['201']).toHaveProperty('description', 'Registration successful');
      expect(registerEndpoint.responses['400']).toHaveProperty('description', 'Validation error');
      expect(registerEndpoint.responses['409']).toHaveProperty('description', 'Email already exists');
    });

    it('should document proper status codes for protected endpoints', () => {
      const profileEndpoint = swaggerSpec.paths['/api/v1/auth/profile'].get;

      expect(profileEndpoint.responses).toHaveProperty('200');
      expect(profileEndpoint.responses).toHaveProperty('401');
      expect(profileEndpoint.responses).toHaveProperty('404');

      // Check response descriptions
      expect(profileEndpoint.responses['200']).toHaveProperty('description', 'User profile retrieved successfully');
      expect(profileEndpoint.responses['401']).toHaveProperty('description', 'Authentication required');
      expect(profileEndpoint.responses['404']).toHaveProperty('description', 'User not found');
    });
  });

  describe('Request/Response Examples', () => {

    it('should include request examples for registration', () => {
      const registerEndpoint = swaggerSpec.paths['/api/v1/auth/register'].post;

      expect(registerEndpoint.requestBody).toHaveProperty('content');
      expect(registerEndpoint.requestBody.content).toHaveProperty('application/json');
      expect(registerEndpoint.requestBody.content['application/json']).toHaveProperty('example');

      const example = registerEndpoint.requestBody.content['application/json'].example;
      expect(example).toHaveProperty('email');
      expect(example).toHaveProperty('password');
      expect(example).toHaveProperty('firstName');
      expect(example).toHaveProperty('lastName');
    });

    it('should include request examples for login', () => {
      const loginEndpoint = swaggerSpec.paths['/api/v1/auth/login'].post;

      expect(loginEndpoint.requestBody).toHaveProperty('content');
      expect(loginEndpoint.requestBody.content).toHaveProperty('application/json');
      expect(loginEndpoint.requestBody.content['application/json']).toHaveProperty('example');

      const example = loginEndpoint.requestBody.content['application/json'].example;
      expect(example).toHaveProperty('email');
      expect(example).toHaveProperty('password');
    });

    it('should include request examples for refresh token', () => {
      const refreshEndpoint = swaggerSpec.paths['/api/v1/auth/refresh'].post;

      expect(refreshEndpoint.requestBody).toHaveProperty('content');
      expect(refreshEndpoint.requestBody.content).toHaveProperty('application/json');
      expect(refreshEndpoint.requestBody.content['application/json']).toHaveProperty('example');

      const example = refreshEndpoint.requestBody.content['application/json'].example;
      expect(example).toHaveProperty('refreshToken');
    });
  });
});