import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { ApiTokenService } from '../../../src/services/api-token.service';
import {
  ApiTokenRepository,
  ApiTokenEntity,
} from '../../../src/repositories/api-token.repository';
import { usersRepository } from '../../../src/repositories/users.repository';
import { CreateApiTokenRequest } from '@nodeangularfullstack/shared';

// Mock dependencies
jest.mock('../../../src/repositories/api-token.repository');
jest.mock('../../../src/repositories/users.repository');
jest.mock('bcryptjs');
jest.mock('crypto');

const MockedApiTokenRepository = ApiTokenRepository as jest.MockedClass<
  typeof ApiTokenRepository
>;
const mockedUsersRepository = usersRepository as jest.Mocked<
  typeof usersRepository
>;
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockedCrypto = crypto as jest.Mocked<typeof crypto>;

describe('ApiTokenService', () => {
  let apiTokenService: ApiTokenService;
  let mockRepository: jest.Mocked<ApiTokenRepository>;

  // Test data fixtures
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'user' as const,
    isActive: true,
    tenantId: 'tenant-123',
    passwordHash: 'hashed_password',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    emailVerified: true,
  };

  const mockTokenEntity: ApiTokenEntity = {
    id: 'token-123',
    userId: 'user-123',
    tenantId: 'tenant-123',
    tokenHash: 'hashed_token',
    name: 'Test Token',
    scopes: ['read', 'write'],
    expiresAt: new Date('2025-12-31'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastUsedAt: undefined,
    isActive: true,
  };

  const validTokenRequest: CreateApiTokenRequest = {
    name: 'Production API Token',
    scopes: ['read', 'write'],
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup repository mock
    mockRepository = {
      create: jest.fn(),
      findByTokenHash: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateLastUsed: jest.fn().mockResolvedValue(undefined),
    } as any;

    MockedApiTokenRepository.mockImplementation(() => mockRepository);

    // Create service instance
    apiTokenService = new ApiTokenService();

    // Setup crypto mock
    (mockedCrypto.randomBytes as jest.Mock).mockReturnValue(
      Buffer.from('random_token_data')
    );

    // Setup bcrypt mock
    (mockedBcrypt.hash as jest.Mock).mockResolvedValue('hashed_token');
    (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);

    // Setup users repository mock
    mockedUsersRepository.findById.mockResolvedValue(mockUser);
  });

  describe('generateToken', () => {
    it('should generate a secure token with hash', async () => {
      const result = await (apiTokenService as any).generateToken();

      expect(result).toHaveProperty('plainToken');
      expect(result).toHaveProperty('hashedToken');
      expect(result.plainToken).toBe('72616e646f6d5f746f6b656e5f64617461');
      expect(result.hashedToken).toBe('hashed_token');
      expect(mockedCrypto.randomBytes).toHaveBeenCalledWith(32);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(
        '72616e646f6d5f746f6b656e5f64617461',
        12
      );
    });

    it('should throw error if token generation fails', async () => {
      mockedCrypto.randomBytes.mockImplementation(() => {
        throw new Error('Crypto failure');
      });

      await expect((apiTokenService as any).generateToken()).rejects.toThrow(
        'Token generation failed: Crypto failure'
      );
    });

    it('should throw error if hashing fails', async () => {
      (mockedBcrypt.hash as jest.Mock).mockRejectedValue(
        new Error('Hash failure')
      );

      await expect((apiTokenService as any).generateToken()).rejects.toThrow(
        'Token generation failed: Hash failure'
      );
    });
  });

  describe('validateScopes', () => {
    it('should accept valid scopes', () => {
      const result = (apiTokenService as any).validateScopes(['read', 'write']);
      expect(result).toBe(true);
    });

    it('should accept partial valid scopes', () => {
      const result = (apiTokenService as any).validateScopes(['read']);
      expect(result).toBe(true);
    });

    it('should reject invalid scopes', () => {
      const result = (apiTokenService as any).validateScopes([
        'invalid',
        'scope',
      ]);
      expect(result).toBe(false);
    });

    it('should reject mixed valid/invalid scopes', () => {
      const result = (apiTokenService as any).validateScopes([
        'read',
        'invalid',
      ]);
      expect(result).toBe(false);
    });

    it('should reject empty array', () => {
      const result = (apiTokenService as any).validateScopes([]);
      expect(result).toBe(false);
    });

    it('should reject non-array input', () => {
      const result = (apiTokenService as any).validateScopes(null as any);
      expect(result).toBe(false);
    });
  });

  describe('createToken', () => {
    it('should create token successfully with valid data', async () => {
      mockRepository.create.mockResolvedValue(mockTokenEntity);

      const result = await apiTokenService.createToken(
        'user-123',
        validTokenRequest,
        'tenant-123'
      );

      expect(result).toEqual({
        token: '72616e646f6d5f746f6b656e5f64617461',
        id: 'token-123',
        name: 'Test Token',
        scopes: ['read', 'write'],
        expiresAt: mockTokenEntity.expiresAt.toISOString(),
      });

      expect(mockedUsersRepository.findById).toHaveBeenCalledWith('user-123');
      expect(mockRepository.create).toHaveBeenCalledWith({
        userId: 'user-123',
        tenantId: 'tenant-123',
        tokenHash: 'hashed_token',
        name: 'Production API Token',
        scopes: ['read', 'write'],
        expiresAt: expect.any(Date),
      });
    });

    it('should create token without tenant ID', async () => {
      mockRepository.create.mockResolvedValue({
        ...mockTokenEntity,
        tenantId: undefined,
      });

      await apiTokenService.createToken('user-123', validTokenRequest);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          tenantId: undefined,
        })
      );
    });

    it('should throw error for missing user ID', async () => {
      await expect(
        apiTokenService.createToken('', validTokenRequest)
      ).rejects.toThrow('Token creation failed: User ID is required');
    });

    it('should throw error for missing token name', async () => {
      await expect(
        apiTokenService.createToken('user-123', {
          ...validTokenRequest,
          name: '',
        })
      ).rejects.toThrow('Token creation failed: Token name is required');
    });

    it('should throw error for token name too long', async () => {
      const longName = 'a'.repeat(101);
      await expect(
        apiTokenService.createToken('user-123', {
          ...validTokenRequest,
          name: longName,
        })
      ).rejects.toThrow(
        'Token creation failed: Token name must be 100 characters or less'
      );
    });

    it('should throw error for invalid scopes', async () => {
      await expect(
        apiTokenService.createToken('user-123', {
          ...validTokenRequest,
          scopes: ['invalid'],
        })
      ).rejects.toThrow(
        'Token creation failed: Invalid scopes. Valid scopes are: read, write'
      );
    });

    it('should throw error for non-existent user', async () => {
      mockedUsersRepository.findById.mockResolvedValue(null);

      await expect(
        apiTokenService.createToken('user-123', validTokenRequest)
      ).rejects.toThrow('Token creation failed: User not found');
    });

    it('should throw error for tenant mismatch', async () => {
      await expect(
        apiTokenService.createToken(
          'user-123',
          validTokenRequest,
          'wrong-tenant'
        )
      ).rejects.toThrow(
        'Token creation failed: User does not belong to specified tenant'
      );
    });

    it('should throw error for past expiration date', async () => {
      const pastDate = new Date('2020-01-01');
      await expect(
        apiTokenService.createToken('user-123', {
          ...validTokenRequest,
          expiresAt: pastDate,
        })
      ).rejects.toThrow(
        'Token creation failed: Expiration date must be in the future'
      );
    });

    it('should trim token name', async () => {
      mockRepository.create.mockResolvedValue(mockTokenEntity);

      await apiTokenService.createToken('user-123', {
        ...validTokenRequest,
        name: '  Trimmed Name  ',
      });

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Trimmed Name',
        })
      );
    });

    it('should handle repository errors', async () => {
      mockRepository.create.mockRejectedValue(new Error('Database error'));

      await expect(
        apiTokenService.createToken('user-123', validTokenRequest)
      ).rejects.toThrow('Token creation failed: Database error');
    });
  });

  describe('validateToken', () => {
    beforeEach(() => {
      // Mock getAllActiveTokens method
      jest
        .spyOn(apiTokenService as any, 'getAllActiveTokens')
        .mockResolvedValue([mockTokenEntity]);
    });

    it('should validate active token successfully', async () => {
      const result = await apiTokenService.validateToken('plain_token');

      expect(result.isValid).toBe(true);
      expect(result.token).toEqual(mockTokenEntity);
      expect(result.user).toEqual(mockUser);
      expect(result.tenant).toEqual({ id: 'tenant-123' });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        'plain_token',
        'hashed_token'
      );
      expect(mockRepository.updateLastUsed).toHaveBeenCalledWith(
        'hashed_token'
      );
    });

    it('should return invalid for empty token', async () => {
      const result = await apiTokenService.validateToken('');
      expect(result.isValid).toBe(false);
    });

    it('should return invalid for non-matching token', async () => {
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await apiTokenService.validateToken('wrong_token');
      expect(result.isValid).toBe(false);
    });

    it('should return invalid for inactive token', async () => {
      const inactiveToken = { ...mockTokenEntity, isActive: false };
      jest
        .spyOn(apiTokenService as any, 'getAllActiveTokens')
        .mockResolvedValue([inactiveToken]);

      const result = await apiTokenService.validateToken('plain_token');
      expect(result.isValid).toBe(false);
    });

    it('should return invalid for expired token', async () => {
      const expiredToken = {
        ...mockTokenEntity,
        expiresAt: new Date('2020-01-01'),
      };
      jest
        .spyOn(apiTokenService as any, 'getAllActiveTokens')
        .mockResolvedValue([expiredToken]);

      const result = await apiTokenService.validateToken('plain_token');
      expect(result.isValid).toBe(false);
    });

    it('should return invalid for inactive user', async () => {
      mockedUsersRepository.findById.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      const result = await apiTokenService.validateToken('plain_token');
      expect(result.isValid).toBe(false);
    });

    it('should return invalid for non-existent user', async () => {
      mockedUsersRepository.findById.mockResolvedValue(null);

      const result = await apiTokenService.validateToken('plain_token');
      expect(result.isValid).toBe(false);
    });

    it('should handle bcrypt comparison errors gracefully', async () => {
      (mockedBcrypt.compare as jest.Mock).mockRejectedValue(
        new Error('Bcrypt error')
      );

      const result = await apiTokenService.validateToken('plain_token');
      expect(result.isValid).toBe(false);
    });

    it('should handle token without tenant', async () => {
      const tokenWithoutTenant = { ...mockTokenEntity, tenantId: undefined };
      jest
        .spyOn(apiTokenService as any, 'getAllActiveTokens')
        .mockResolvedValue([tokenWithoutTenant]);

      const result = await apiTokenService.validateToken('plain_token');
      expect(result.tenant).toBeUndefined();
    });

    it('should handle updateLastUsed errors silently', async () => {
      mockRepository.updateLastUsed.mockRejectedValue(
        new Error('Update failed')
      );
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = await apiTokenService.validateToken('plain_token');
      expect(result.isValid).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to update token last used timestamp:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('listTokens', () => {
    const mockTokens = [
      mockTokenEntity,
      { ...mockTokenEntity, id: 'token-456', name: 'Another Token' },
    ];

    it('should list tokens successfully', async () => {
      mockRepository.findByUserId.mockResolvedValue(mockTokens);

      const result = await apiTokenService.listTokens('user-123', 'tenant-123');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'token-123',
        name: 'Test Token',
        scopes: ['read', 'write'],
        expiresAt: mockTokenEntity.expiresAt.toISOString(),
        createdAt: mockTokenEntity.createdAt.toISOString(),
        lastUsedAt: undefined,
        isActive: true,
      });
      expect(mockRepository.findByUserId).toHaveBeenCalledWith(
        'user-123',
        'tenant-123'
      );
    });

    it('should list tokens without tenant filtering', async () => {
      mockRepository.findByUserId.mockResolvedValue(mockTokens);

      await apiTokenService.listTokens('user-123');
      expect(mockRepository.findByUserId).toHaveBeenCalledWith(
        'user-123',
        undefined
      );
    });

    it('should throw error for missing user ID', async () => {
      await expect(apiTokenService.listTokens('')).rejects.toThrow(
        'Token listing failed: User ID is required'
      );
    });

    it('should handle repository errors', async () => {
      mockRepository.findByUserId.mockRejectedValue(
        new Error('Database error')
      );

      await expect(apiTokenService.listTokens('user-123')).rejects.toThrow(
        'Token listing failed: Database error'
      );
    });

    it('should format lastUsedAt correctly when present', async () => {
      const tokenWithLastUsed = {
        ...mockTokenEntity,
        lastUsedAt: new Date('2024-06-01'),
      };
      mockRepository.findByUserId.mockResolvedValue([tokenWithLastUsed]);

      const result = await apiTokenService.listTokens('user-123');
      expect(result[0].lastUsedAt).toBe('2024-06-01T00:00:00.000Z');
    });
  });

  describe('deleteToken', () => {
    it('should delete token successfully', async () => {
      mockRepository.findById.mockResolvedValue(mockTokenEntity);
      mockRepository.delete.mockResolvedValue(true);

      const result = await apiTokenService.deleteToken(
        'token-123',
        'user-123',
        'tenant-123'
      );

      expect(result).toBe(true);
      expect(mockRepository.findById).toHaveBeenCalledWith(
        'token-123',
        'tenant-123'
      );
      expect(mockRepository.delete).toHaveBeenCalledWith(
        'token-123',
        'tenant-123'
      );
    });

    it('should return false for non-existent token', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await apiTokenService.deleteToken('token-123', 'user-123');
      expect(result).toBe(false);
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it('should return false for token belonging to different user', async () => {
      const otherUserToken = { ...mockTokenEntity, userId: 'other-user' };
      mockRepository.findById.mockResolvedValue(otherUserToken);

      const result = await apiTokenService.deleteToken('token-123', 'user-123');
      expect(result).toBe(false);
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw error for missing token ID', async () => {
      await expect(apiTokenService.deleteToken('', 'user-123')).rejects.toThrow(
        'Token deletion failed: Token ID and User ID are required'
      );
    });

    it('should throw error for missing user ID', async () => {
      await expect(
        apiTokenService.deleteToken('token-123', '')
      ).rejects.toThrow(
        'Token deletion failed: Token ID and User ID are required'
      );
    });

    it('should handle repository errors', async () => {
      mockRepository.findById.mockResolvedValue(mockTokenEntity);
      mockRepository.delete.mockRejectedValue(new Error('Database error'));

      await expect(
        apiTokenService.deleteToken('token-123', 'user-123')
      ).rejects.toThrow('Token deletion failed: Database error');
    });
  });

  describe('updateToken', () => {
    const updateData = {
      name: 'Updated Token',
      scopes: ['read'],
      isActive: false,
    };

    it('should update token successfully', async () => {
      mockRepository.findById.mockResolvedValue(mockTokenEntity);
      const updatedToken = { ...mockTokenEntity, ...updateData };
      mockRepository.update.mockResolvedValue(updatedToken);

      const result = await apiTokenService.updateToken(
        'token-123',
        'user-123',
        updateData,
        'tenant-123'
      );

      expect(result).toEqual({
        id: 'token-123',
        name: 'Updated Token',
        scopes: ['read'],
        expiresAt: mockTokenEntity.expiresAt.toISOString(),
        createdAt: mockTokenEntity.createdAt.toISOString(),
        lastUsedAt: undefined,
        isActive: false,
      });
      expect(mockRepository.update).toHaveBeenCalledWith(
        'token-123',
        updateData,
        'tenant-123'
      );
    });

    it('should return null for non-existent token', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await apiTokenService.updateToken(
        'token-123',
        'user-123',
        updateData
      );
      expect(result).toBeNull();
    });

    it('should return null for token belonging to different user', async () => {
      const otherUserToken = { ...mockTokenEntity, userId: 'other-user' };
      mockRepository.findById.mockResolvedValue(otherUserToken);

      const result = await apiTokenService.updateToken(
        'token-123',
        'user-123',
        updateData
      );
      expect(result).toBeNull();
    });

    it('should throw error for invalid scopes', async () => {
      await expect(
        apiTokenService.updateToken('token-123', 'user-123', {
          scopes: ['invalid'],
        })
      ).rejects.toThrow(
        'Token update failed: Invalid scopes. Valid scopes are: read, write'
      );
    });

    it('should throw error for empty token name', async () => {
      await expect(
        apiTokenService.updateToken('token-123', 'user-123', { name: '' })
      ).rejects.toThrow('Token update failed: Token name cannot be empty');
    });

    it('should throw error for token name too long', async () => {
      const longName = 'a'.repeat(101);
      await expect(
        apiTokenService.updateToken('token-123', 'user-123', { name: longName })
      ).rejects.toThrow(
        'Token update failed: Token name must be 100 characters or less'
      );
    });

    it('should trim token name', async () => {
      mockRepository.findById.mockResolvedValue(mockTokenEntity);
      mockRepository.update.mockResolvedValue({
        ...mockTokenEntity,
        name: 'Trimmed',
      });

      await apiTokenService.updateToken('token-123', 'user-123', {
        name: '  Trimmed  ',
      });

      expect(mockRepository.update).toHaveBeenCalledWith(
        'token-123',
        { name: 'Trimmed' },
        undefined
      );
    });

    it('should handle missing required parameters', async () => {
      await expect(
        apiTokenService.updateToken('', 'user-123', updateData)
      ).rejects.toThrow(
        'Token update failed: Token ID and User ID are required'
      );

      await expect(
        apiTokenService.updateToken('token-123', '', updateData)
      ).rejects.toThrow(
        'Token update failed: Token ID and User ID are required'
      );
    });
  });

  describe('hasScope', () => {
    it('should return true for valid scope', () => {
      const result = apiTokenService.hasScope(mockTokenEntity, 'read');
      expect(result).toBe(true);
    });

    it('should return false for invalid scope', () => {
      const result = apiTokenService.hasScope(mockTokenEntity, 'admin');
      expect(result).toBe(false);
    });

    it('should handle token with limited scopes', () => {
      const limitedToken = { ...mockTokenEntity, scopes: ['read'] };
      expect(apiTokenService.hasScope(limitedToken, 'read')).toBe(true);
      expect(apiTokenService.hasScope(limitedToken, 'write')).toBe(false);
    });
  });

  describe('getAllActiveTokens', () => {
    it('should fetch active tokens successfully', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [mockTokenEntity] }),
        release: jest.fn(),
      };

      const mockPool = {
        connect: jest.fn().mockResolvedValue(mockClient),
      };

      (apiTokenService as any).apiTokenRepository = { pool: mockPool };

      const result = await (apiTokenService as any).getAllActiveTokens();

      expect(result).toEqual([mockTokenEntity]);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE is_active = true')
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const mockClient = {
        query: jest.fn().mockRejectedValue(new Error('Database error')),
        release: jest.fn(),
      };

      const mockPool = {
        connect: jest.fn().mockResolvedValue(mockClient),
      };

      (apiTokenService as any).apiTokenRepository = { pool: mockPool };
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = await (apiTokenService as any).getAllActiveTokens();

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to fetch active tokens:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});
