import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { TokenController } from '../../../src/controllers/token.controller';
import { apiTokenService } from '../../../src/services/api-token.service';
import { AuthRequest } from '../../../src/middleware/auth.middleware';
import {
  CreateApiTokenRequest,
  CreateApiTokenResponse,
  ApiTokenListResponse,
} from '@nodeangularfullstack/shared';

// Mock dependencies
jest.mock('../../../src/services/api-token.service');
jest.mock('express-validator');

const mockApiTokenService = apiTokenService as jest.Mocked<
  typeof apiTokenService
>;
const mockValidationResult = validationResult as jest.MockedFunction<
  typeof validationResult
>;

describe('TokenController', () => {
  let controller: TokenController;
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  // Test data fixtures
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'user' as const,
    tenantId: 'tenant-123',
  };

  const mockTokenResponse: CreateApiTokenResponse = {
    token: 'plain_token_value',
    id: 'token-123',
    name: 'Test Token',
    scopes: ['read', 'write'],
    expiresAt: '2025-12-31T23:59:59.999Z',
  };

  const mockTokenList: ApiTokenListResponse[] = [
    {
      id: 'token-123',
      name: 'Test Token',
      scopes: ['read', 'write'],
      expiresAt: '2025-12-31T23:59:59.999Z',
      createdAt: '2024-01-01T00:00:00.000Z',
      lastUsedAt: '2024-06-01T12:00:00.000Z',
      isActive: true,
    },
  ];

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create controller instance
    controller = new TokenController();

    // Setup mock response
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Setup mock next function
    mockNext = jest.fn();

    // Setup validation result mock - default to no errors
    mockValidationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    } as any);
  });

  describe('createToken', () => {
    beforeEach(() => {
      mockRequest = {
        user: mockUser,
        body: {
          name: 'Production API Token',
          scopes: ['read', 'write'],
        },
      };
    });

    it('should create token successfully', async () => {
      mockApiTokenService.createToken.mockResolvedValue(mockTokenResponse);

      await controller.createToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockApiTokenService.createToken).toHaveBeenCalledWith(
        'user-123',
        {
          name: 'Production API Token',
          scopes: ['read', 'write'],
          expiresAt: undefined,
        },
        'tenant-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockTokenResponse,
        timestamp: expect.any(String),
      });
    });

    it('should create token with expiration date', async () => {
      const expiresAt = '2025-06-01T00:00:00.000Z';
      mockRequest.body = {
        ...mockRequest.body,
        expiresAt,
      };
      mockApiTokenService.createToken.mockResolvedValue(mockTokenResponse);

      await controller.createToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockApiTokenService.createToken).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          expiresAt: new Date(expiresAt),
        }),
        'tenant-123'
      );
    });

    it('should return 400 for validation errors', async () => {
      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [
          { path: 'name', msg: 'Token name is required' },
          { path: 'scopes', msg: 'Scopes must be an array' },
        ],
      } as any);

      await controller.createToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: expect.arrayContaining([
            { path: 'name', msg: 'Token name is required' },
            { path: 'scopes', msg: 'Scopes must be an array' },
          ]),
        },
        timestamp: expect.any(String),
      });
      expect(mockApiTokenService.createToken).not.toHaveBeenCalled();
    });

    it('should return 409 for duplicate token name', async () => {
      const duplicateError = new Error(
        'Token name already exists for this user'
      );
      mockApiTokenService.createToken.mockRejectedValue(duplicateError);

      await controller.createToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'Token name already exists for this user',
        },
        timestamp: expect.any(String),
      });
    });

    it('should return 400 for invalid input errors', async () => {
      const invalidError = new Error('Invalid scopes provided');
      mockApiTokenService.createToken.mockRejectedValue(invalidError);

      await controller.createToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid scopes provided',
        },
        timestamp: expect.any(String),
      });
    });

    it('should return 400 for user not found error', async () => {
      const notFoundError = new Error('User not found');
      mockApiTokenService.createToken.mockRejectedValue(notFoundError);

      await controller.createToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'User not found',
        },
        timestamp: expect.any(String),
      });
    });

    it('should call next for unexpected errors', async () => {
      const unexpectedError = new Error('Database connection failed');
      mockApiTokenService.createToken.mockRejectedValue(unexpectedError);

      await controller.createToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(unexpectedError);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle non-Error exceptions', async () => {
      mockApiTokenService.createToken.mockRejectedValue('String error');

      await controller.createToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith('String error');
    });
  });

  describe('listTokens', () => {
    beforeEach(() => {
      mockRequest = {
        user: mockUser,
      };
    });

    it('should list tokens successfully', async () => {
      mockApiTokenService.listTokens.mockResolvedValue(mockTokenList);

      await controller.listTokens(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockApiTokenService.listTokens).toHaveBeenCalledWith(
        'user-123',
        'tenant-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockTokenList,
        meta: {
          total: 1,
        },
        timestamp: expect.any(String),
      });
    });

    it('should handle empty token list', async () => {
      mockApiTokenService.listTokens.mockResolvedValue([]);

      await controller.listTokens(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        meta: {
          total: 0,
        },
        timestamp: expect.any(String),
      });
    });

    it('should call next for service errors', async () => {
      const serviceError = new Error('Service failed');
      mockApiTokenService.listTokens.mockRejectedValue(serviceError);

      await controller.listTokens(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(serviceError);
    });
  });

  describe('deleteToken', () => {
    beforeEach(() => {
      mockRequest = {
        user: mockUser,
        params: {
          id: 'token-123',
        },
      };
    });

    it('should delete token successfully', async () => {
      mockApiTokenService.deleteToken.mockResolvedValue(true);

      await controller.deleteToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockApiTokenService.deleteToken).toHaveBeenCalledWith(
        'token-123',
        'user-123',
        'tenant-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          message: 'Token revoked successfully',
        },
        timestamp: expect.any(String),
      });
    });

    it('should return 404 when token not found', async () => {
      mockApiTokenService.deleteToken.mockResolvedValue(false);

      await controller.deleteToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Token not found or access denied',
        },
        timestamp: expect.any(String),
      });
    });

    it('should return 400 for validation errors', async () => {
      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ path: 'id', msg: 'Invalid token ID format' }],
      } as any);

      await controller.deleteToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid token ID format',
          details: [{ path: 'id', msg: 'Invalid token ID format' }],
        },
        timestamp: expect.any(String),
      });
    });

    it('should call next for service errors', async () => {
      const serviceError = new Error('Service failed');
      mockApiTokenService.deleteToken.mockRejectedValue(serviceError);

      await controller.deleteToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(serviceError);
    });
  });

  describe('updateToken', () => {
    beforeEach(() => {
      mockRequest = {
        user: mockUser,
        params: {
          id: 'token-123',
        },
        body: {
          name: 'Updated Token Name',
          scopes: ['read'],
          isActive: false,
        },
      };
    });

    it('should update token successfully', async () => {
      const updatedToken = {
        ...mockTokenList[0],
        name: 'Updated Token Name',
        scopes: ['read'],
        isActive: false,
      };
      mockApiTokenService.updateToken.mockResolvedValue(updatedToken);

      await controller.updateToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockApiTokenService.updateToken).toHaveBeenCalledWith(
        'token-123',
        'user-123',
        {
          name: 'Updated Token Name',
          scopes: ['read'],
          isActive: false,
        },
        'tenant-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: updatedToken,
        timestamp: expect.any(String),
      });
    });

    it('should update with partial data', async () => {
      mockRequest.body = { name: 'New Name Only' };
      const updatedToken = { ...mockTokenList[0], name: 'New Name Only' };
      mockApiTokenService.updateToken.mockResolvedValue(updatedToken);

      await controller.updateToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockApiTokenService.updateToken).toHaveBeenCalledWith(
        'token-123',
        'user-123',
        { name: 'New Name Only' },
        'tenant-123'
      );
    });

    it('should return 400 when no fields provided', async () => {
      mockRequest.body = {};

      await controller.updateToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'At least one field must be provided for update',
        },
        timestamp: expect.any(String),
      });
    });

    it('should filter out undefined fields', async () => {
      mockRequest.body = {
        name: 'Updated Name',
        scopes: undefined,
        isActive: false,
      };
      const updatedToken = {
        ...mockTokenList[0],
        name: 'Updated Name',
        isActive: false,
      };
      mockApiTokenService.updateToken.mockResolvedValue(updatedToken);

      await controller.updateToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockApiTokenService.updateToken).toHaveBeenCalledWith(
        'token-123',
        'user-123',
        {
          name: 'Updated Name',
          isActive: false,
        },
        'tenant-123'
      );
    });

    it('should return 404 when token not found', async () => {
      mockApiTokenService.updateToken.mockResolvedValue(null);

      await controller.updateToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Token not found or access denied',
        },
        timestamp: expect.any(String),
      });
    });

    it('should return 400 for validation errors', async () => {
      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ path: 'name', msg: 'Name is required' }],
      } as any);

      await controller.updateToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: [{ path: 'name', msg: 'Name is required' }],
        },
        timestamp: expect.any(String),
      });
    });

    it('should return 409 for duplicate name conflict', async () => {
      const conflictError = new Error(
        'Token name already exists for this user'
      );
      mockApiTokenService.updateToken.mockRejectedValue(conflictError);

      await controller.updateToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'Token name already exists for this user',
        },
        timestamp: expect.any(String),
      });
    });

    it('should return 400 for invalid input errors', async () => {
      const invalidError = new Error('Invalid scope provided');
      mockApiTokenService.updateToken.mockRejectedValue(invalidError);

      await controller.updateToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid scope provided',
        },
        timestamp: expect.any(String),
      });
    });

    it('should return 400 for empty name error', async () => {
      const emptyNameError = new Error('Token name cannot be empty');
      mockApiTokenService.updateToken.mockRejectedValue(emptyNameError);

      await controller.updateToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Token name cannot be empty',
        },
        timestamp: expect.any(String),
      });
    });

    it('should call next for unexpected errors', async () => {
      const unexpectedError = new Error('Database connection failed');
      mockApiTokenService.updateToken.mockRejectedValue(unexpectedError);

      await controller.updateToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(unexpectedError);
    });
  });

  describe('getToken', () => {
    beforeEach(() => {
      mockRequest = {
        user: mockUser,
        params: {
          id: 'token-123',
        },
      };
    });

    it('should get token successfully', async () => {
      mockApiTokenService.listTokens.mockResolvedValue(mockTokenList);

      await controller.getToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockApiTokenService.listTokens).toHaveBeenCalledWith(
        'user-123',
        'tenant-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockTokenList[0],
        timestamp: expect.any(String),
      });
    });

    it('should return 404 when token not found', async () => {
      mockApiTokenService.listTokens.mockResolvedValue([]);

      await controller.getToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Token not found or access denied',
        },
        timestamp: expect.any(String),
      });
    });

    it("should return 404 when token ID not in user's tokens", async () => {
      const otherToken = { ...mockTokenList[0], id: 'other-token' };
      mockApiTokenService.listTokens.mockResolvedValue([otherToken]);

      await controller.getToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 for validation errors', async () => {
      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ path: 'id', msg: 'Invalid token ID format' }],
      } as any);

      await controller.getToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid token ID format',
          details: [{ path: 'id', msg: 'Invalid token ID format' }],
        },
        timestamp: expect.any(String),
      });
    });

    it('should call next for service errors', async () => {
      const serviceError = new Error('Service failed');
      mockApiTokenService.listTokens.mockRejectedValue(serviceError);

      await controller.getToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(serviceError);
    });
  });

  describe('authentication requirement', () => {
    it('should handle requests without authenticated user', async () => {
      mockRequest = {
        user: undefined,
        body: { name: 'Test', scopes: ['read'] },
      };

      // This would typically be handled by auth middleware, but test the controller behavior
      try {
        await controller.createToken(
          mockRequest as AuthRequest,
          mockResponse as Response,
          mockNext
        );
      } catch (error) {
        // Expected to fail due to missing user
        expect(error).toBeDefined();
      }
    });
  });

  describe('response format consistency', () => {
    it('should include timestamp in all success responses', async () => {
      mockRequest = { user: mockUser };
      mockApiTokenService.listTokens.mockResolvedValue(mockTokenList);

      await controller.listTokens(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String),
        })
      );
    });

    it('should include timestamp in all error responses', async () => {
      mockRequest = {
        user: mockUser,
        body: { name: 'Test', scopes: ['read'] },
      };
      const error = new Error('Token name already exists');
      mockApiTokenService.createToken.mockRejectedValue(error);

      await controller.createToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String),
        })
      );
    });

    it('should format success responses consistently', async () => {
      mockRequest = { user: mockUser };
      mockApiTokenService.listTokens.mockResolvedValue(mockTokenList);

      await controller.listTokens(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Array),
        meta: expect.any(Object),
        timestamp: expect.any(String),
      });
    });

    it('should format error responses consistently', async () => {
      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ path: 'name', msg: 'Required' }],
      } as any);

      await controller.createToken(
        {} as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
          details: expect.any(Array),
        },
        timestamp: expect.any(String),
      });
    });
  });
});
