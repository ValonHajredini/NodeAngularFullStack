import swaggerJsdoc from 'swagger-jsdoc';
import { swaggerSpec } from '../../../src/config/swagger.config';

/**
 * Unit tests for OpenAPI specification generation and validation.
 * Tests the configuration and structure of the generated OpenAPI spec.
 */
describe('OpenAPI Configuration Unit Tests', () => {
  describe('Swagger Specification Generation', () => {
    it('should generate a valid OpenAPI specification object', () => {
      expect(swaggerSpec).toBeDefined();
      expect(typeof swaggerSpec).toBe('object');
    });

    it('should have correct OpenAPI version', () => {
      expect(swaggerSpec.openapi).toBe('3.0.0');
    });

    it('should include required top-level properties', () => {
      expect(swaggerSpec).toHaveProperty('info');
      expect(swaggerSpec).toHaveProperty('paths');
      expect(swaggerSpec).toHaveProperty('components');
      expect(swaggerSpec).toHaveProperty('servers');
    });
  });

  describe('API Information', () => {
    it('should have correct API information', () => {
      const { info } = swaggerSpec;

      expect(info).toHaveProperty('title', 'Node Angular Full Stack API');
      expect(info).toHaveProperty('version', '1.0.0');
      expect(info).toHaveProperty('description');
      expect(typeof info.description).toBe('string');
      expect(info.description.length).toBeGreaterThan(0);
    });

    it('should include contact information', () => {
      const { info } = swaggerSpec;

      expect(info).toHaveProperty('contact');
      expect(info.contact).toHaveProperty('name');
      expect(info.contact).toHaveProperty('email');
    });

    it('should include license information', () => {
      const { info } = swaggerSpec;

      expect(info).toHaveProperty('license');
      expect(info.license).toHaveProperty('name');
      expect(info.license).toHaveProperty('url');
    });
  });

  describe('Server Configuration', () => {
    it('should include development and production servers', () => {
      const { servers } = swaggerSpec;

      expect(Array.isArray(servers)).toBe(true);
      expect(servers).toHaveLength(2);
    });

    it('should have correctly configured development server', () => {
      const { servers } = swaggerSpec;
      const devServer = servers.find(s => s.description === 'Development server');

      expect(devServer).toBeDefined();
      expect(devServer?.url).toBe('http://localhost:3000/api/v1');
    });

    it('should have correctly configured production server', () => {
      const { servers } = swaggerSpec;
      const prodServer = servers.find(s => s.description === 'Production server');

      expect(prodServer).toBeDefined();
      expect(prodServer?.url).toBe('https://api.example.com/v1');
    });
  });

  describe('Security Schemes', () => {
    it('should include Bearer authentication scheme', () => {
      const { components } = swaggerSpec;

      expect(components).toHaveProperty('securitySchemes');
      expect(components.securitySchemes).toHaveProperty('bearerAuth');
    });

    it('should have correctly configured Bearer auth', () => {
      const { bearerAuth } = swaggerSpec.components.securitySchemes;

      expect(bearerAuth).toHaveProperty('type', 'http');
      expect(bearerAuth).toHaveProperty('scheme', 'bearer');
      expect(bearerAuth).toHaveProperty('bearerFormat', 'JWT');
      expect(bearerAuth).toHaveProperty('description');
      expect(typeof bearerAuth.description).toBe('string');
    });

    it('should include global security configuration', () => {
      expect(swaggerSpec).toHaveProperty('security');
      expect(Array.isArray(swaggerSpec.security)).toBe(true);
      expect(swaggerSpec.security).toContainEqual({ bearerAuth: [] });
    });
  });

  describe('Schema Definitions', () => {
    let schemas: any;

    beforeEach(() => {
      schemas = swaggerSpec.components.schemas;
    });

    it('should include all core schemas', () => {
      const requiredSchemas = [
        'User',
        'UserProfile',
        'UserRegistration',
        'UserLogin',
        'AuthResponse',
        'Error',
        'ValidationError'
      ];

      requiredSchemas.forEach(schemaName => {
        expect(schemas).toHaveProperty(schemaName);
        expect(schemas[schemaName]).toHaveProperty('type', 'object');
      });
    });

    it('should include additional utility schemas', () => {
      const utilitySchemas = [
        'RefreshTokenRequest',
        'UserUpdateRequest',
        'PasswordResetRequest',
        'PasswordResetConfirm',
        'PaginationResponse'
      ];

      utilitySchemas.forEach(schemaName => {
        expect(schemas).toHaveProperty(schemaName);
        expect(schemas[schemaName]).toHaveProperty('type', 'object');
      });
    });

    describe('User Schema', () => {
      it('should have correct structure and required fields', () => {
        const userSchema = schemas.User;

        expect(userSchema).toHaveProperty('required');
        expect(userSchema.required).toContain('id');
        expect(userSchema.required).toContain('email');
        expect(userSchema.required).toContain('firstName');
        expect(userSchema.required).toContain('lastName');
        expect(userSchema.required).toContain('role');
      });

      it('should have proper property types', () => {
        const { properties } = schemas.User;

        expect(properties.id).toHaveProperty('type', 'string');
        expect(properties.id).toHaveProperty('format', 'uuid');
        expect(properties.email).toHaveProperty('type', 'string');
        expect(properties.email).toHaveProperty('format', 'email');
        expect(properties.role).toHaveProperty('type', 'string');
        expect(properties.role).toHaveProperty('enum');
        expect(properties.role.enum).toEqual(['admin', 'user', 'readonly']);
      });

      it('should include timestamp fields', () => {
        const { properties } = schemas.User;

        expect(properties.createdAt).toHaveProperty('type', 'string');
        expect(properties.createdAt).toHaveProperty('format', 'date-time');
        expect(properties.updatedAt).toHaveProperty('type', 'string');
        expect(properties.updatedAt).toHaveProperty('format', 'date-time');
      });
    });

    describe('AuthResponse Schema', () => {
      it('should include both access and refresh tokens', () => {
        const { properties } = schemas.AuthResponse;

        expect(properties).toHaveProperty('accessToken');
        expect(properties.accessToken).toHaveProperty('type', 'string');
        expect(properties).toHaveProperty('refreshToken');
        expect(properties.refreshToken).toHaveProperty('type', 'string');
      });

      it('should reference UserProfile schema', () => {
        const { properties } = schemas.AuthResponse;

        expect(properties).toHaveProperty('user');
        expect(properties.user).toHaveProperty('$ref', '#/components/schemas/UserProfile');
      });
    });

    describe('Error Schema', () => {
      it('should follow standardized error structure', () => {
        const errorSchema = schemas.Error;

        expect(errorSchema.properties).toHaveProperty('error');
        expect(errorSchema.properties.error).toHaveProperty('type', 'object');
      });

      it('should include all error fields', () => {
        const { properties } = schemas.Error.properties.error;

        expect(properties).toHaveProperty('code');
        expect(properties).toHaveProperty('message');
        expect(properties).toHaveProperty('details');
        expect(properties).toHaveProperty('timestamp');
        expect(properties).toHaveProperty('requestId');

        expect(properties.timestamp).toHaveProperty('format', 'date-time');
      });
    });

    describe('ValidationError Schema', () => {
      it('should include detailed validation information', () => {
        const validationErrorSchema = schemas.ValidationError;

        expect(validationErrorSchema.properties).toHaveProperty('error');
        expect(validationErrorSchema.properties).toHaveProperty('details');
        expect(validationErrorSchema.properties.details).toHaveProperty('type', 'array');
      });

      it('should define validation error item structure', () => {
        const { items } = schemas.ValidationError.properties.details;

        expect(items).toHaveProperty('type', 'object');
        expect(items.properties).toHaveProperty('field');
        expect(items.properties).toHaveProperty('message');
      });
    });

    describe('Request Schemas', () => {
      it('should have proper UserRegistration schema', () => {
        const regSchema = schemas.UserRegistration;

        expect(regSchema).toHaveProperty('required');
        expect(regSchema.required).toContain('email');
        expect(regSchema.required).toContain('password');
        expect(regSchema.required).toContain('firstName');
        expect(regSchema.required).toContain('lastName');
      });

      it('should have proper UserLogin schema', () => {
        const loginSchema = schemas.UserLogin;

        expect(loginSchema).toHaveProperty('required');
        expect(loginSchema.required).toContain('email');
        expect(loginSchema.required).toContain('password');
      });

      it('should have proper RefreshTokenRequest schema', () => {
        const refreshSchema = schemas.RefreshTokenRequest;

        expect(refreshSchema).toHaveProperty('required');
        expect(refreshSchema.required).toContain('refreshToken');
        expect(refreshSchema.properties.refreshToken).toHaveProperty('type', 'string');
      });
    });

    describe('Password Reset Schemas', () => {
      it('should have proper PasswordResetRequest schema', () => {
        const resetSchema = schemas.PasswordResetRequest;

        expect(resetSchema).toHaveProperty('required');
        expect(resetSchema.required).toContain('email');
        expect(resetSchema.properties.email).toHaveProperty('format', 'email');
      });

      it('should have proper PasswordResetConfirm schema', () => {
        const confirmSchema = schemas.PasswordResetConfirm;

        expect(confirmSchema).toHaveProperty('required');
        expect(confirmSchema.required).toContain('token');
        expect(confirmSchema.required).toContain('newPassword');
        expect(confirmSchema.properties.newPassword).toHaveProperty('minLength', 8);
      });
    });

    describe('Pagination Schema', () => {
      it('should have proper PaginationResponse structure', () => {
        const paginationSchema = schemas.PaginationResponse;

        expect(paginationSchema.properties).toHaveProperty('data');
        expect(paginationSchema.properties.data).toHaveProperty('type', 'array');
        expect(paginationSchema.properties).toHaveProperty('pagination');
        expect(paginationSchema.properties.pagination).toHaveProperty('type', 'object');
      });

      it('should include pagination metadata fields', () => {
        const { properties } = schemas.PaginationResponse.properties.pagination;

        expect(properties).toHaveProperty('page');
        expect(properties).toHaveProperty('limit');
        expect(properties).toHaveProperty('total');
        expect(properties).toHaveProperty('totalPages');

        // All should be integers
        expect(properties.page).toHaveProperty('type', 'integer');
        expect(properties.limit).toHaveProperty('type', 'integer');
        expect(properties.total).toHaveProperty('type', 'integer');
        expect(properties.totalPages).toHaveProperty('type', 'integer');
      });
    });
  });

  describe('File Path Configuration', () => {
    it('should include correct API file paths', () => {
      // This test verifies that the swagger configuration includes the right file paths
      // for JSDoc scanning. Since we can't directly test the internal swaggerJsdoc config,
      // we'll verify that the spec includes paths from our route files.

      expect(swaggerSpec.paths).toBeDefined();
      expect(Object.keys(swaggerSpec.paths).length).toBeGreaterThan(0);
    });

    it('should include paths from route files', () => {
      const pathKeys = Object.keys(swaggerSpec.paths);

      // Should include auth routes
      const authPaths = pathKeys.filter(path => path.includes('/auth/'));
      expect(authPaths.length).toBeGreaterThan(0);

      // Should include health routes
      const healthPaths = pathKeys.filter(path => path.includes('/health'));
      expect(healthPaths.length).toBeGreaterThan(0);
    });
  });

  describe('Specification Validation', () => {
    it('should generate specification without errors', () => {
      // This test ensures the swagger configuration doesn't throw errors during generation
      expect(() => {
        swaggerJsdoc({
          definition: swaggerSpec,
          apis: ['./src/routes/*.ts', './src/controllers/*.ts', './src/middleware/*.ts']
        });
      }).not.toThrow();
    });

    it('should have consistent schema references', () => {
      // Verify that all $ref references point to existing schemas
      const schemas = swaggerSpec.components.schemas;

      function findReferences(obj: any): string[] {
        const refs: string[] = [];

        function traverse(item: any) {
          if (item && typeof item === 'object') {
            if (item.$ref && typeof item.$ref === 'string') {
              refs.push(item.$ref);
            }
            Object.values(item).forEach(traverse);
          }
        }

        traverse(obj);
        return refs;
      }

      const allRefs = findReferences(swaggerSpec);
      const schemaRefs = allRefs.filter(ref => ref.startsWith('#/components/schemas/'));

      schemaRefs.forEach(ref => {
        const schemaName = ref.replace('#/components/schemas/', '');
        expect(schemas).toHaveProperty(schemaName);
      });
    });

    it('should not contain undefined or null values in critical sections', () => {
      expect(swaggerSpec.openapi).toBeDefined();
      expect(swaggerSpec.info).toBeDefined();
      expect(swaggerSpec.paths).toBeDefined();
      expect(swaggerSpec.components).toBeDefined();
      expect(swaggerSpec.servers).toBeDefined();

      expect(swaggerSpec.openapi).not.toBeNull();
      expect(swaggerSpec.info).not.toBeNull();
      expect(swaggerSpec.paths).not.toBeNull();
      expect(swaggerSpec.components).not.toBeNull();
      expect(swaggerSpec.servers).not.toBeNull();
    });
  });
});