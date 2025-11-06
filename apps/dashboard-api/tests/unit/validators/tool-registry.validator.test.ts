import { Request, Response, NextFunction } from 'express';
import {
  validateRegistration,
  validateUpdate,
} from '../../../src/validators/tool-registry.validator';

/**
 * Unit Tests for Tool Registry Validators
 *
 * Tests all validation rules for tool registration and update endpoints.
 * Ensures proper validation of input data before reaching service layer.
 */

describe('Tool Registry Validators', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('validateRegistration', () => {
    describe('Valid Input', () => {
      it('should pass validation with valid data', async () => {
        mockReq.body = {
          toolId: 'my-tool',
          name: 'My Tool',
          version: '1.0.0',
          route: '/tools/my-tool',
          apiBase: '/api/tools/my-tool',
          manifestJson: { id: 'my-tool' },
        };

        // Run all validation middleware in sequence
        for (const middleware of validateRegistration) {
          await middleware(mockReq as Request, mockRes as Response, mockNext);
        }

        // Verify next() was called (validation passed)
        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      });

      it('should pass validation with optional permissions array', async () => {
        mockReq.body = {
          toolId: 'test-tool',
          name: 'Test Tool',
          version: '2.5.3',
          route: '/tools/test-tool',
          apiBase: '/api/tools/test-tool',
          permissions: ['read', 'write'],
          manifestJson: { id: 'test-tool' },
        };

        for (const middleware of validateRegistration) {
          await middleware(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      });

      it('should pass validation with optional status', async () => {
        mockReq.body = {
          toolId: 'beta-tool',
          name: 'Beta Tool',
          version: '0.1.0',
          route: '/tools/beta-tool',
          apiBase: '/api/tools/beta-tool',
          status: 'beta',
          manifestJson: { id: 'beta-tool' },
        };

        for (const middleware of validateRegistration) {
          await middleware(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      });
    });

    describe('toolId Validation', () => {
      it('should reject missing toolId', async () => {
        mockReq.body = {
          name: 'Test',
          version: '1.0.0',
          route: '/tools/test',
          apiBase: '/api/tools/test',
          manifestJson: {},
        };

        for (const middleware of validateRegistration) {
          await middleware(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Validation failed',
            details: expect.arrayContaining([
              expect.objectContaining({
                msg: 'Tool ID is required',
                path: 'toolId',
              }),
            ]),
          })
        );
      });

      it('should reject toolId with uppercase letters', async () => {
        mockReq.body = {
          toolId: 'MyTool',
          name: 'Test',
          version: '1.0.0',
          route: '/tools/test',
          apiBase: '/api/tools/test',
          manifestJson: {},
        };

        for (const middleware of validateRegistration) {
          await middleware(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Validation failed',
            details: expect.arrayContaining([
              expect.objectContaining({
                msg: 'Tool ID must be lowercase kebab-case',
                path: 'toolId',
              }),
            ]),
          })
        );
      });

      it('should reject toolId with underscores', async () => {
        mockReq.body = {
          toolId: 'my_tool',
          name: 'Test',
          version: '1.0.0',
          route: '/tools/test',
          apiBase: '/api/tools/test',
          manifestJson: {},
        };

        for (const middleware of validateRegistration) {
          await middleware(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Validation failed',
            details: expect.arrayContaining([
              expect.objectContaining({
                msg: 'Tool ID must be lowercase kebab-case',
                path: 'toolId',
              }),
            ]),
          })
        );
      });

      it('should reject toolId starting with number', async () => {
        mockReq.body = {
          toolId: '1-tool',
          name: 'Test',
          version: '1.0.0',
          route: '/tools/test',
          apiBase: '/api/tools/test',
          manifestJson: {},
        };

        for (const middleware of validateRegistration) {
          await middleware(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Validation failed',
            details: expect.arrayContaining([
              expect.objectContaining({
                msg: 'Tool ID must be lowercase kebab-case',
                path: 'toolId',
              }),
            ]),
          })
        );
      });
    });

    describe('name Validation', () => {
      it('should reject missing name', async () => {
        mockReq.body = {
          toolId: 'test',
          version: '1.0.0',
          route: '/tools/test',
          apiBase: '/api/tools/test',
          manifestJson: {},
        };

        for (const middleware of validateRegistration) {
          await middleware(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Validation failed',
            details: expect.arrayContaining([
              expect.objectContaining({
                msg: 'Tool name is required',
                path: 'name',
              }),
            ]),
          })
        );
      });

      it('should reject name too short (< 3 characters)', async () => {
        mockReq.body = {
          toolId: 'test',
          name: 'AB',
          version: '1.0.0',
          route: '/tools/test',
          apiBase: '/api/tools/test',
          manifestJson: {},
        };

        for (const middleware of validateRegistration) {
          await middleware(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Validation failed',
            details: expect.arrayContaining([
              expect.objectContaining({
                msg: 'Tool name must be 3-255 characters',
                path: 'name',
              }),
            ]),
          })
        );
      });

      it('should reject name too long (> 255 characters)', async () => {
        mockReq.body = {
          toolId: 'test',
          name: 'A'.repeat(256),
          version: '1.0.0',
          route: '/tools/test',
          apiBase: '/api/tools/test',
          manifestJson: {},
        };

        for (const middleware of validateRegistration) {
          await middleware(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Validation failed',
            details: expect.arrayContaining([
              expect.objectContaining({
                msg: 'Tool name must be 3-255 characters',
                path: 'name',
              }),
            ]),
          })
        );
      });
    });

    describe('version Validation', () => {
      it('should reject missing version', async () => {
        mockReq.body = {
          toolId: 'test',
          name: 'Test',
          route: '/tools/test',
          apiBase: '/api/tools/test',
          manifestJson: {},
        };

        for (const middleware of validateRegistration) {
          await middleware(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Validation failed',
            details: expect.arrayContaining([
              expect.objectContaining({
                msg: 'Version is required',
                path: 'version',
              }),
            ]),
          })
        );
      });

      it('should reject invalid version format (two parts)', async () => {
        mockReq.body = {
          toolId: 'test',
          name: 'Test',
          version: '1.0',
          route: '/tools/test',
          apiBase: '/api/tools/test',
          manifestJson: {},
        };

        for (const middleware of validateRegistration) {
          await middleware(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Validation failed',
            details: expect.arrayContaining([
              expect.objectContaining({
                msg: 'Version must be semver format (e.g., 1.0.0)',
                path: 'version',
              }),
            ]),
          })
        );
      });

      it('should reject invalid version format (with v prefix)', async () => {
        mockReq.body = {
          toolId: 'test',
          name: 'Test',
          version: 'v1.0.0',
          route: '/tools/test',
          apiBase: '/api/tools/test',
          manifestJson: {},
        };

        for (const middleware of validateRegistration) {
          await middleware(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Validation failed',
            details: expect.arrayContaining([
              expect.objectContaining({
                msg: 'Version must be semver format (e.g., 1.0.0)',
                path: 'version',
              }),
            ]),
          })
        );
      });

      it('should reject invalid version format (with prerelease tag)', async () => {
        mockReq.body = {
          toolId: 'test',
          name: 'Test',
          version: '1.0.0-beta',
          route: '/tools/test',
          apiBase: '/api/tools/test',
          manifestJson: {},
        };

        for (const middleware of validateRegistration) {
          await middleware(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Validation failed',
            details: expect.arrayContaining([
              expect.objectContaining({
                msg: 'Version must be semver format (e.g., 1.0.0)',
                path: 'version',
              }),
            ]),
          })
        );
      });
    });

    describe('route Validation', () => {
      it('should reject missing route', async () => {
        mockReq.body = {
          toolId: 'test',
          name: 'Test',
          version: '1.0.0',
          apiBase: '/api/tools/test',
          manifestJson: {},
        };

        for (const middleware of validateRegistration) {
          await middleware(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Validation failed',
            details: expect.arrayContaining([
              expect.objectContaining({
                msg: 'Route is required',
                path: 'route',
              }),
            ]),
          })
        );
      });

      it('should reject route not starting with /tools/', async () => {
        mockReq.body = {
          toolId: 'test',
          name: 'Test',
          version: '1.0.0',
          route: '/api/test',
          apiBase: '/api/tools/test',
          manifestJson: {},
        };

        for (const middleware of validateRegistration) {
          await middleware(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Validation failed',
            details: expect.arrayContaining([
              expect.objectContaining({
                msg: 'Route must be /tools/{tool-id}',
                path: 'route',
              }),
            ]),
          })
        );
      });
    });

    describe('apiBase Validation', () => {
      it('should reject missing apiBase', async () => {
        mockReq.body = {
          toolId: 'test',
          name: 'Test',
          version: '1.0.0',
          route: '/tools/test',
          manifestJson: {},
        };

        for (const middleware of validateRegistration) {
          await middleware(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Validation failed',
            details: expect.arrayContaining([
              expect.objectContaining({
                msg: 'API base is required',
                path: 'apiBase',
              }),
            ]),
          })
        );
      });

      it('should reject apiBase not starting with /api/tools/', async () => {
        mockReq.body = {
          toolId: 'test',
          name: 'Test',
          version: '1.0.0',
          route: '/tools/test',
          apiBase: '/api/test',
          manifestJson: {},
        };

        for (const middleware of validateRegistration) {
          await middleware(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Validation failed',
            details: expect.arrayContaining([
              expect.objectContaining({
                msg: 'API base must be /api/tools/{tool-id}',
                path: 'apiBase',
              }),
            ]),
          })
        );
      });
    });

    describe('status Validation', () => {
      it('should reject invalid status value', async () => {
        mockReq.body = {
          toolId: 'test',
          name: 'Test',
          version: '1.0.0',
          route: '/tools/test',
          apiBase: '/api/tools/test',
          status: 'invalid',
          manifestJson: {},
        };

        for (const middleware of validateRegistration) {
          await middleware(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Validation failed',
            details: expect.arrayContaining([
              expect.objectContaining({
                msg: 'Invalid status',
                path: 'status',
              }),
            ]),
          })
        );
      });

      it('should accept valid status: alpha', async () => {
        mockReq.body = {
          toolId: 'test',
          name: 'Test',
          version: '1.0.0',
          route: '/tools/test',
          apiBase: '/api/tools/test',
          status: 'alpha',
          manifestJson: {},
        };

        for (const middleware of validateRegistration) {
          await middleware(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      });

      it('should accept valid status: deprecated', async () => {
        mockReq.body = {
          toolId: 'test',
          name: 'Test',
          version: '1.0.0',
          route: '/tools/test',
          apiBase: '/api/tools/test',
          status: 'deprecated',
          manifestJson: {},
        };

        for (const middleware of validateRegistration) {
          await middleware(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      });
    });

    describe('permissions Validation', () => {
      it('should reject permissions that is not an array', async () => {
        mockReq.body = {
          toolId: 'test',
          name: 'Test',
          version: '1.0.0',
          route: '/tools/test',
          apiBase: '/api/tools/test',
          permissions: 'not-array',
          manifestJson: {},
        };

        for (const middleware of validateRegistration) {
          await middleware(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Validation failed',
            details: expect.arrayContaining([
              expect.objectContaining({
                msg: 'Permissions must be an array',
                path: 'permissions',
              }),
            ]),
          })
        );
      });
    });

    describe('manifestJson Validation', () => {
      it('should reject missing manifestJson', async () => {
        mockReq.body = {
          toolId: 'test',
          name: 'Test',
          version: '1.0.0',
          route: '/tools/test',
          apiBase: '/api/tools/test',
        };

        for (const middleware of validateRegistration) {
          await middleware(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Validation failed',
            details: expect.arrayContaining([
              expect.objectContaining({
                msg: 'Tool manifest is required',
                path: 'manifestJson',
              }),
            ]),
          })
        );
      });

      it('should reject manifestJson that is not an object', async () => {
        mockReq.body = {
          toolId: 'test',
          name: 'Test',
          version: '1.0.0',
          route: '/tools/test',
          apiBase: '/api/tools/test',
          manifestJson: 'not-object',
        };

        for (const middleware of validateRegistration) {
          await middleware(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Validation failed',
            details: expect.arrayContaining([
              expect.objectContaining({
                msg: 'Manifest must be a JSON object',
                path: 'manifestJson',
              }),
            ]),
          })
        );
      });
    });

    describe('Error Response Format', () => {
      it('should return field-level details for multiple errors', async () => {
        mockReq.body = {
          toolId: 'Invalid_Tool',
          name: 'AB',
          version: '1.0',
        };

        for (const middleware of validateRegistration) {
          await middleware(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockRes.status).toHaveBeenCalledWith(400);
        const callArg = (mockRes.json as jest.Mock).mock.calls[0][0];
        expect(callArg.error).toBe('Validation failed');
        expect(callArg.details).toBeInstanceOf(Array);
        expect(callArg.details.length).toBeGreaterThan(1);

        // Verify each error has required fields
        callArg.details.forEach((detail: any) => {
          expect(detail).toHaveProperty('msg');
          expect(detail).toHaveProperty('path');
          expect(detail).toHaveProperty('location');
        });
      });
    });
  });

  describe('validateUpdate', () => {
    describe('Valid Input', () => {
      it('should pass validation with valid partial update', async () => {
        mockReq.body = {
          name: 'Updated Tool Name',
          version: '2.0.0',
          status: 'active',
        };

        for (const middleware of validateUpdate) {
          await middleware(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      });

      it('should pass validation with empty body (all fields optional)', async () => {
        mockReq.body = {};

        for (const middleware of validateUpdate) {
          await middleware(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      });

      it('should pass validation with only name', async () => {
        mockReq.body = {
          name: 'New Name',
        };

        for (const middleware of validateUpdate) {
          await middleware(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      });

      it('should pass validation with only version', async () => {
        mockReq.body = {
          version: '3.1.4',
        };

        for (const middleware of validateUpdate) {
          await middleware(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      });

      it('should pass validation with only status', async () => {
        mockReq.body = {
          status: 'deprecated',
        };

        for (const middleware of validateUpdate) {
          await middleware(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      });
    });

    describe('name Validation', () => {
      it('should reject name too short (< 3 characters)', async () => {
        mockReq.body = {
          name: 'AB',
        };

        for (const middleware of validateUpdate) {
          await middleware(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Validation failed',
            details: expect.arrayContaining([
              expect.objectContaining({
                msg: 'Tool name must be 3-255 characters',
                path: 'name',
              }),
            ]),
          })
        );
      });

      it('should reject name too long (> 255 characters)', async () => {
        mockReq.body = {
          name: 'A'.repeat(256),
        };

        for (const middleware of validateUpdate) {
          await middleware(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Validation failed',
            details: expect.arrayContaining([
              expect.objectContaining({
                msg: 'Tool name must be 3-255 characters',
                path: 'name',
              }),
            ]),
          })
        );
      });
    });

    describe('version Validation', () => {
      it('should reject invalid version format', async () => {
        mockReq.body = {
          version: '1.0',
        };

        for (const middleware of validateUpdate) {
          await middleware(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Validation failed',
            details: expect.arrayContaining([
              expect.objectContaining({
                msg: 'Version must be semver format',
                path: 'version',
              }),
            ]),
          })
        );
      });
    });

    describe('status Validation', () => {
      it('should reject invalid status value', async () => {
        mockReq.body = {
          status: 'invalid',
        };

        for (const middleware of validateUpdate) {
          await middleware(mockReq as Request, mockRes as Response, mockNext);
        }

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Validation failed',
            details: expect.arrayContaining([
              expect.objectContaining({
                msg: 'Invalid status',
                path: 'status',
              }),
            ]),
          })
        );
      });
    });
  });
});
