import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { UsersController } from '../../../src/controllers/users.controller';
import { usersService } from '../../../src/services/users.service';

// Mock the services
jest.mock('../../../src/services/users.service');
jest.mock('express-validator');

/**
 * Unit tests for UsersController.
 * Tests controller logic without database dependencies.
 */
describe('UsersController', () => {
  let usersController: UsersController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    usersController = new UsersController();

    mockRequest = {
      body: {},
      params: {},
      query: {},
      user: {
        id: 'admin-id',
        email: 'admin@example.com',
        role: 'admin',
        tenantId: 'tenant-id'
      }
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    beforeEach(() => {
      (validationResult as jest.Mock).mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });
    });

    it('should create user successfully with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user'
      };

      const createdUser = {
        id: 'user-id',
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        isActive: true,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRequest.body = userData;
      (usersService.createUser as jest.Mock).mockResolvedValue(createdUser);

      await usersController.createUser(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(usersService.createUser).toHaveBeenCalledWith({
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        tenantId: 'tenant-id'
      });

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User created successfully',
        data: createdUser,
        timestamp: expect.any(String)
      });
    });

    it('should handle validation errors', async () => {
      (validationResult as jest.Mock).mockReturnValue({
        isEmpty: () => false,
        array: () => [
          { field: 'email', message: 'Invalid email format' }
        ]
      });

      await usersController.createUser(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: [{ field: 'email', message: 'Invalid email format' }]
        },
        timestamp: expect.any(String)
      });
    });

    it('should handle duplicate email error', async () => {
      mockRequest.body = {
        email: 'existing@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user'
      };

      (usersService.createUser as jest.Mock).mockRejectedValue(
        new Error('Email already exists')
      );

      await usersController.createUser(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'Email already exists'
        },
        timestamp: expect.any(String)
      });
    });

    it('should pass other errors to next middleware', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user'
      };

      const unexpectedError = new Error('Database connection failed');
      (usersService.createUser as jest.Mock).mockRejectedValue(unexpectedError);

      await usersController.createUser(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(unexpectedError);
    });
  });

  describe('getUsers', () => {
    it('should return paginated users successfully', async () => {
      const mockUsers = [
        {
          id: 'user1',
          email: 'user1@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'user',
          isActive: true
        },
        {
          id: 'user2',
          email: 'user2@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          role: 'admin',
          isActive: true
        }
      ];

      const mockResult = {
        users: mockUsers,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          pages: 1,
          hasNext: false,
          hasPrev: false
        }
      };

      mockRequest.query = {
        page: '1',
        limit: '20',
        search: 'john',
        role: 'user'
      };

      (usersService.getUsers as jest.Mock).mockResolvedValue(mockResult);

      await usersController.getUsers(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(usersService.getUsers).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        search: 'john',
        role: 'user',
        status: undefined,
        tenantId: 'tenant-id'
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Users retrieved successfully',
        data: {
          users: mockUsers,
          pagination: mockResult.pagination
        },
        timestamp: expect.any(String)
      });
    });

    it('should handle pagination with default values', async () => {
      mockRequest.query = {};

      const mockResult = {
        users: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0,
          hasNext: false,
          hasPrev: false
        }
      };

      (usersService.getUsers as jest.Mock).mockResolvedValue(mockResult);

      await usersController.getUsers(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(usersService.getUsers).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        search: undefined,
        role: undefined,
        status: undefined,
        tenantId: 'tenant-id'
      });
    });

    it('should enforce maximum limit', async () => {
      mockRequest.query = { limit: '150' }; // Above max

      const mockResult = {
        users: [],
        pagination: {
          page: 1,
          limit: 100,
          total: 0,
          pages: 0,
          hasNext: false,
          hasPrev: false
        }
      };

      (usersService.getUsers as jest.Mock).mockResolvedValue(mockResult);

      await usersController.getUsers(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(usersService.getUsers).toHaveBeenCalledWith({
        page: 1,
        limit: 100, // Should be capped at 100
        search: undefined,
        role: undefined,
        status: undefined,
        tenantId: 'tenant-id'
      });
    });
  });

  describe('getUserById', () => {
    it('should return user by ID successfully', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user',
        isActive: true
      };

      mockRequest.params = { id: 'user-id' };
      (usersService.validateUserAccess as jest.Mock).mockReturnValue(true);
      (usersService.getUserById as jest.Mock).mockResolvedValue(mockUser);

      await usersController.getUserById(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(usersService.validateUserAccess).toHaveBeenCalledWith(
        'admin-id',
        'user-id',
        'admin'
      );
      expect(usersService.getUserById).toHaveBeenCalledWith('user-id');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User retrieved successfully',
        data: mockUser,
        timestamp: expect.any(String)
      });
    });

    it('should return 404 when user not found', async () => {
      mockRequest.params = { id: 'nonexistent-id' };
      (usersService.validateUserAccess as jest.Mock).mockReturnValue(true);
      (usersService.getUserById as jest.Mock).mockResolvedValue(null);

      await usersController.getUserById(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found'
        },
        timestamp: expect.any(String)
      });
    });

    it('should return 403 when user lacks access', async () => {
      mockRequest.params = { id: 'other-user-id' };
      mockRequest.user = { id: 'user-id', email: 'user@example.com', role: 'user' }; // Regular user

      (usersService.validateUserAccess as jest.Mock).mockReturnValue(false);

      await usersController.getUserById(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions to access this user'
        },
        timestamp: expect.any(String)
      });
    });

    it('should return 401 when user not authenticated', async () => {
      mockRequest.params = { id: 'user-id' };
      mockRequest.user = undefined;

      await usersController.getUserById(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        timestamp: expect.any(String)
      });
    });
  });

  describe('updateUser', () => {
    beforeEach(() => {
      (validationResult as jest.Mock).mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });
    });

    it('should update user successfully', async () => {
      const updateData = {
        email: 'updated@example.com',
        firstName: 'Updated',
        lastName: 'User',
        role: 'admin',
        isActive: true,
        emailVerified: true
      };

      const updatedUser = {
        id: 'user-id',
        ...updateData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRequest.params = { id: 'user-id' };
      mockRequest.body = updateData;
      (usersService.updateUser as jest.Mock).mockResolvedValue(updatedUser);

      await usersController.updateUser(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(usersService.updateUser).toHaveBeenCalledWith('user-id', updateData);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User updated successfully',
        data: updatedUser,
        timestamp: expect.any(String)
      });
    });

    it('should handle user not found error', async () => {
      mockRequest.params = { id: 'nonexistent-id' };
      mockRequest.body = { firstName: 'Updated' };

      (usersService.updateUser as jest.Mock).mockRejectedValue(
        new Error('User not found')
      );

      await usersController.updateUser(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found'
        },
        timestamp: expect.any(String)
      });
    });

    it('should handle email conflict error', async () => {
      mockRequest.params = { id: 'user-id' };
      mockRequest.body = { email: 'existing@example.com' };

      (usersService.updateUser as jest.Mock).mockRejectedValue(
        new Error('Email already exists')
      );

      await usersController.updateUser(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'Email already exists'
        },
        timestamp: expect.any(String)
      });
    });
  });

  describe('patchUser', () => {
    beforeEach(() => {
      (validationResult as jest.Mock).mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });
    });

    it('should patch user successfully (admin)', async () => {
      const patchData = { firstName: 'Patched' };
      const updatedUser = {
        id: 'user-id',
        email: 'user@example.com',
        firstName: 'Patched',
        lastName: 'User',
        role: 'user',
        isActive: true
      };

      mockRequest.params = { id: 'user-id' };
      mockRequest.body = patchData;
      (usersService.validateUserAccess as jest.Mock).mockReturnValue(true);
      (usersService.updateUser as jest.Mock).mockResolvedValue(updatedUser);

      await usersController.patchUser(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(usersService.updateUser).toHaveBeenCalledWith('user-id', patchData);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should allow self-update for regular users with limited fields', async () => {
      const patchData = { firstName: 'SelfPatched', role: 'admin' }; // Role should be ignored
      const updatedUser = {
        id: 'user-id',
        email: 'user@example.com',
        firstName: 'SelfPatched',
        lastName: 'User',
        role: 'user', // Role unchanged
        isActive: true
      };

      mockRequest.params = { id: 'user-id' };
      mockRequest.body = patchData;
      mockRequest.user = { id: 'user-id', email: 'user@example.com', role: 'user' }; // Self-update
      (usersService.validateUserAccess as jest.Mock).mockReturnValue(true);
      (usersService.updateUser as jest.Mock).mockResolvedValue(updatedUser);

      await usersController.patchUser(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      // Should only pass allowed fields for regular users
      expect(usersService.updateUser).toHaveBeenCalledWith('user-id', {
        firstName: 'SelfPatched'
        // role should not be included
      });
    });

    it('should return 403 when user lacks access', async () => {
      mockRequest.params = { id: 'other-user-id' };
      mockRequest.body = { firstName: 'Unauthorized' };
      mockRequest.user = { id: 'user-id', email: 'user@example.com', role: 'user' };

      (usersService.validateUserAccess as jest.Mock).mockReturnValue(false);

      await usersController.patchUser(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions to update this user'
        },
        timestamp: expect.any(String)
      });
    });
  });

  describe('deleteUser', () => {
    it('should soft delete user successfully', async () => {
      mockRequest.params = { id: 'user-id' };
      (usersService.deleteUser as jest.Mock).mockResolvedValue(true);

      await usersController.deleteUser(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(usersService.deleteUser).toHaveBeenCalledWith('user-id');
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it('should return 404 when user not found', async () => {
      mockRequest.params = { id: 'nonexistent-id' };
      (usersService.deleteUser as jest.Mock).mockResolvedValue(false);

      await usersController.deleteUser(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found or already deleted'
        },
        timestamp: expect.any(String)
      });
    });

    it('should handle service errors', async () => {
      mockRequest.params = { id: 'user-id' };
      const serviceError = new Error('User not found');
      (usersService.deleteUser as jest.Mock).mockRejectedValue(serviceError);

      await usersController.deleteUser(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found'
        },
        timestamp: expect.any(String)
      });
    });
  });
});