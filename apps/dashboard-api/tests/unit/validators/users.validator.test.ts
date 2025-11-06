import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import {
  createUserValidator,
  updateUserValidator,
  patchUserValidator,
  userIdValidator,
  getUsersValidator,
  sanitizeUserInput,
  xssProtection
} from '../../../src/validators/users.validator';
import { usersService } from '../../../src/services/users.service';

// Mock the service
jest.mock('../../../src/services/users.service');

/**
 * Unit tests for user validators.
 * Tests validation rules and middleware functions.
 */
describe('Users Validators', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    mockRequest = {
      body: {},
      params: {},
      query: {},
      user: { id: 'user-id', email: 'test@example.com', role: 'user', tenantId: 'tenant-id' }
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('createUserValidator', () => {
    it('should pass validation with valid user data', async () => {
      const validData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user'
      };

      (usersService.emailExists as jest.Mock).mockResolvedValue(false);

      mockRequest.body = validData;

      // Run all validators
      for (const validator of createUserValidator) {
        await validator(mockRequest as Request, mockResponse as Response, mockNext);
      }

      const errors = validationResult(mockRequest as Request);
      expect(errors.isEmpty()).toBe(true);
    });

    it('should fail validation for invalid email format', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user'
      };

      mockRequest.body = invalidData;

      // Run email validator
      await createUserValidator[0](mockRequest as Request, mockResponse as Response, mockNext);

      const errors = validationResult(mockRequest as Request);
      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()).toContainEqual(
        expect.objectContaining({
          path: 'email',
          msg: 'Must be a valid email address'
        })
      );
    });

    it('should fail validation for weak password', async () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'weak',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user'
      };

      mockRequest.body = invalidData;

      // Run password validator
      await createUserValidator[1](mockRequest as Request, mockResponse as Response, mockNext);

      const errors = validationResult(mockRequest as Request);
      expect(errors.isEmpty()).toBe(false);

      const passwordErrors = errors.array().filter((error: any) => error.path === 'password');
      expect(passwordErrors.length).toBeGreaterThan(0);
    });

    it('should fail validation for existing email', async () => {
      const invalidData = {
        email: 'existing@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user'
      };

      (usersService.emailExists as jest.Mock).mockResolvedValue(true);

      mockRequest.body = invalidData;

      // Run email validator
      await createUserValidator[0](mockRequest as Request, mockResponse as Response, mockNext);

      const errors = validationResult(mockRequest as Request);
      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()).toContainEqual(
        expect.objectContaining({
          path: 'email',
          msg: 'Email already exists'
        })
      );
    });

    it('should fail validation for invalid first name', async () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'J@hn123', // Invalid characters
        lastName: 'Doe',
        role: 'user'
      };

      mockRequest.body = invalidData;

      // Run first name validator
      await createUserValidator[2](mockRequest as Request, mockResponse as Response, mockNext);

      const errors = validationResult(mockRequest as Request);
      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()).toContainEqual(
        expect.objectContaining({
          path: 'firstName',
          msg: 'First name can only contain letters, spaces, hyphens, apostrophes, and periods'
        })
      );
    });

    it('should fail validation for invalid role', async () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'invalid_role'
      };

      mockRequest.body = invalidData;

      // Run role validator
      await createUserValidator[4](mockRequest as Request, mockResponse as Response, mockNext);

      const errors = validationResult(mockRequest as Request);
      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()).toContainEqual(
        expect.objectContaining({
          path: 'role',
          msg: 'Role must be one of: admin, user, readonly'
        })
      );
    });
  });

  describe('updateUserValidator', () => {
    it('should pass validation with valid update data', async () => {
      const validData = {
        email: 'updated@example.com',
        firstName: 'Updated',
        lastName: 'User',
        role: 'admin',
        isActive: true,
        emailVerified: true
      };

      (usersService.getUserByEmail as jest.Mock).mockResolvedValue(null);

      mockRequest.params = { id: 'user-id' };
      mockRequest.body = validData;

      // Run all validators
      for (const validator of updateUserValidator) {
        await validator(mockRequest as Request, mockResponse as Response, mockNext);
      }

      const errors = validationResult(mockRequest as Request);
      expect(errors.isEmpty()).toBe(true);
    });

    it('should fail validation for missing required fields', async () => {
      const incompleteData = {
        email: 'incomplete@example.com'
        // Missing required fields for PUT
      };

      mockRequest.params = { id: 'user-id' };
      mockRequest.body = incompleteData;

      // Run validators that expect required fields
      await updateUserValidator[2](mockRequest as Request, mockResponse as Response, mockNext); // firstName

      const errors = validationResult(mockRequest as Request);
      expect(errors.isEmpty()).toBe(false);
    });

    it('should fail validation when updating to existing email', async () => {
      const invalidData = {
        email: 'existing@example.com',
        firstName: 'Updated',
        lastName: 'User',
        role: 'user'
      };

      const existingUser = {
        id: 'other-user-id',
        email: 'existing@example.com'
      };

      (usersService.getUserByEmail as jest.Mock).mockResolvedValue(existingUser);

      mockRequest.params = { id: 'user-id' };
      mockRequest.body = invalidData;

      // Run email validator
      await updateUserValidator[1](mockRequest as Request, mockResponse as Response, mockNext);

      const errors = validationResult(mockRequest as Request);
      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()).toContainEqual(
        expect.objectContaining({
          path: 'email',
          msg: 'Email already exists'
        })
      );
    });
  });

  describe('patchUserValidator', () => {
    it('should pass validation with partial update data', async () => {
      const validData = {
        firstName: 'Patched'
      };

      mockRequest.params = { id: 'user-id' };
      mockRequest.body = validData;

      // Run all validators
      for (const validator of patchUserValidator) {
        await validator(mockRequest as Request, mockResponse as Response, mockNext);
      }

      const errors = validationResult(mockRequest as Request);
      expect(errors.isEmpty()).toBe(true);
    });

    it('should fail validation when no fields provided', async () => {
      mockRequest.params = { id: 'user-id' };
      mockRequest.body = {};

      // Run the custom validator that checks for at least one field
      const customValidator = patchUserValidator[patchUserValidator.length - 1];
      await customValidator(mockRequest as Request, mockResponse as Response, mockNext);

      const errors = validationResult(mockRequest as Request);
      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()).toContainEqual(
        expect.objectContaining({
          msg: 'At least one field must be provided for update'
        })
      );
    });
  });

  describe('userIdValidator', () => {
    it('should pass validation with valid UUID', async () => {
      mockRequest.params = { id: '123e4567-e89b-12d3-a456-426614174000' };

      await userIdValidator[0](mockRequest as Request, mockResponse as Response, mockNext);

      const errors = validationResult(mockRequest as Request);
      expect(errors.isEmpty()).toBe(true);
    });

    it('should fail validation with invalid UUID', async () => {
      mockRequest.params = { id: 'invalid-uuid' };

      await userIdValidator[0](mockRequest as Request, mockResponse as Response, mockNext);

      const errors = validationResult(mockRequest as Request);
      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()).toContainEqual(
        expect.objectContaining({
          path: 'id',
          msg: 'User ID must be a valid UUID'
        })
      );
    });
  });

  describe('getUsersValidator', () => {
    it('should pass validation with valid query parameters', async () => {
      mockRequest.query = {
        page: '1',
        limit: '20',
        search: 'john',
        role: 'user',
        status: 'active'
      };

      // Run all validators
      for (const validator of getUsersValidator) {
        await validator(mockRequest as Request, mockResponse as Response, mockNext);
      }

      const errors = validationResult(mockRequest as Request);
      expect(errors.isEmpty()).toBe(true);
    });

    it('should fail validation with invalid page number', async () => {
      mockRequest.query = { page: '0' }; // Page must be positive

      await getUsersValidator[0](mockRequest as Request, mockResponse as Response, mockNext);

      const errors = validationResult(mockRequest as Request);
      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()).toContainEqual(
        expect.objectContaining({
          path: 'page',
          msg: 'Page must be a positive integer'
        })
      );
    });

    it('should fail validation with limit exceeding maximum', async () => {
      mockRequest.query = { limit: '150' }; // Exceeds max limit of 100

      await getUsersValidator[1](mockRequest as Request, mockResponse as Response, mockNext);

      const errors = validationResult(mockRequest as Request);
      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()).toContainEqual(
        expect.objectContaining({
          path: 'limit',
          msg: 'Limit must be between 1 and 100'
        })
      );
    });

    it('should fail validation with invalid search characters', async () => {
      mockRequest.query = { search: '<script>' }; // Invalid characters

      await getUsersValidator[2](mockRequest as Request, mockResponse as Response, mockNext);

      const errors = validationResult(mockRequest as Request);
      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()).toContainEqual(
        expect.objectContaining({
          path: 'search',
          msg: 'Search term contains invalid characters'
        })
      );
    });

    it('should fail validation with invalid role filter', async () => {
      mockRequest.query = { role: 'invalid_role' };

      await getUsersValidator[3](mockRequest as Request, mockResponse as Response, mockNext);

      const errors = validationResult(mockRequest as Request);
      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()).toContainEqual(
        expect.objectContaining({
          path: 'role',
          msg: 'Role filter must be one of: admin, user, readonly'
        })
      );
    });

    it('should fail validation with invalid status filter', async () => {
      mockRequest.query = { status: 'invalid_status' };

      await getUsersValidator[4](mockRequest as Request, mockResponse as Response, mockNext);

      const errors = validationResult(mockRequest as Request);
      expect(errors.isEmpty()).toBe(false);
      expect(errors.array()).toContainEqual(
        expect.objectContaining({
          path: 'status',
          msg: 'Status filter must be one of: active, inactive, all'
        })
      );
    });
  });

  describe('sanitizeUserInput middleware', () => {
    it('should remove sensitive fields from request body', () => {
      mockRequest.body = {
        email: 'test@example.com',
        firstName: 'John',
        id: 'malicious-id',
        passwordHash: 'malicious-hash',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: new Date()
      };

      sanitizeUserInput(mockRequest, mockResponse, mockNext);

      expect(mockRequest.body).toEqual({
        email: 'test@example.com',
        firstName: 'John',
        tenantId: 'tenant-id' // Added from authenticated user
      });

      expect(mockRequest.body.id).toBeUndefined();
      expect(mockRequest.body.passwordHash).toBeUndefined();
      expect(mockRequest.body.createdAt).toBeUndefined();
      expect(mockRequest.body.updatedAt).toBeUndefined();
      expect(mockRequest.body.lastLogin).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should add tenantId from authenticated user', () => {
      mockRequest.body = { email: 'test@example.com' };

      sanitizeUserInput(mockRequest, mockResponse, mockNext);

      expect(mockRequest.body.tenantId).toBe('tenant-id');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should not add tenantId when user has no tenantId', () => {
      mockRequest.user = { id: 'user-id', email: 'test@example.com', role: 'user' }; // No tenantId
      mockRequest.body = { email: 'test@example.com' };

      sanitizeUserInput(mockRequest, mockResponse, mockNext);

      expect(mockRequest.body.tenantId).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('xssProtection middleware', () => {
    it('should allow safe input to pass through', () => {
      mockRequest.body = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      };

      xssProtection(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should block script tags', () => {
      mockRequest.body = {
        firstName: '<script>alert("xss")</script>',
        lastName: 'Doe'
      };

      xssProtection(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'SECURITY_ERROR',
          message: 'Potential XSS attack detected in field: firstName'
        },
        timestamp: expect.any(String)
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block javascript: protocol', () => {
      mockRequest.body = {
        website: 'javascript:alert("xss")',
        firstName: 'John'
      };

      xssProtection(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'SECURITY_ERROR',
          message: 'Potential XSS attack detected in field: website'
        },
        timestamp: expect.any(String)
      });
    });

    it('should block onload and other event handlers', () => {
      mockRequest.body = {
        firstName: 'John',
        description: 'Hello <img onload="alert(1)" src="x">'
      };

      xssProtection(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'SECURITY_ERROR',
          message: 'Potential XSS attack detected in field: description'
        },
        timestamp: expect.any(String)
      });
    });

    it('should block iframe tags', () => {
      mockRequest.body = {
        bio: 'Check this out: <iframe src="http://malicious.com"></iframe>'
      };

      xssProtection(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'SECURITY_ERROR',
          message: 'Potential XSS attack detected in field: bio'
        },
        timestamp: expect.any(String)
      });
    });

    it('should handle nested objects', () => {
      mockRequest.body = {
        user: {
          profile: {
            bio: '<script>alert("nested xss")</script>'
          }
        }
      };

      xssProtection(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'SECURITY_ERROR',
          message: 'Potential XSS attack detected in field: bio'
        },
        timestamp: expect.any(String)
      });
    });
  });
});