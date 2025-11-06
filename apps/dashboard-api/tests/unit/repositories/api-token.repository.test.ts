// @ts-nocheck - Test file with complex mocking
import { Pool, PoolClient } from 'pg';
import {
  ApiTokenRepository,
  ApiTokenEntity,
  CreateApiTokenData,
  UpdateApiTokenData,
} from '../../../src/repositories/api-token.repository';
import { databaseService } from '../../../src/services/database.service';

// Mock database service
jest.mock('../../../src/services/database.service');

const mockDatabaseService = databaseService as jest.Mocked<
  typeof databaseService
>;

describe('ApiTokenRepository', () => {
  let repository: ApiTokenRepository;
  let mockPool: jest.Mocked<Pool>;
  let mockClient: jest.Mocked<PoolClient>;

  // Test data fixtures
  const mockTokenEntity: ApiTokenEntity = {
    id: 'token-123',
    userId: 'user-123',
    tenantId: 'tenant-123',
    tokenHash: 'hashed_token_value',
    name: 'Test API Token',
    scopes: ['read', 'write'],
    expiresAt: new Date('2025-12-31T23:59:59.999Z'),
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    lastUsedAt: new Date('2024-06-01T12:00:00.000Z'),
    isActive: true,
  };

  const createTokenData: CreateApiTokenData = {
    userId: 'user-123',
    tenantId: 'tenant-123',
    tokenHash: 'hashed_token_value',
    name: 'Test API Token',
    scopes: ['read', 'write'],
    expiresAt: new Date('2025-12-31T23:59:59.999Z'),
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup mock client
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    } as any;

    // Setup mock pool
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
    } as any;

    // Setup database service mock
    mockDatabaseService.getPool.mockReturnValue(mockPool);

    // Create repository instance
    repository = new ApiTokenRepository();
  });

  describe('create', () => {
    it('should create a new API token successfully', async () => {
      const mockResult = { rows: [mockTokenEntity], rowCount: 1 };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await repository.create(createTokenData);

      expect(result).toEqual(mockTokenEntity);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO api_tokens'),
        [
          'user-123',
          'tenant-123',
          'hashed_token_value',
          'Test API Token',
          ['read', 'write'],
          new Date('2025-12-31T23:59:59.999Z'),
        ]
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should create token without tenant ID', async () => {
      const dataWithoutTenant = { ...createTokenData, tenantId: undefined };
      const mockResult = {
        rows: [{ ...mockTokenEntity, tenantId: null }],
        rowCount: 1,
      };
      mockClient.query.mockResolvedValue(mockResult);

      await repository.create(dataWithoutTenant);

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        'user-123',
        null, // tenantId becomes null
        'hashed_token_value',
        'Test API Token',
        ['read', 'write'],
        expect.any(Date),
      ]);
    });

    it('should use default expiration when not provided', async () => {
      const dataWithoutExpiry = { ...createTokenData, expiresAt: undefined };
      const mockResult = { rows: [mockTokenEntity], rowCount: 1 };
      mockClient.query.mockResolvedValue(mockResult);

      await repository.create(dataWithoutExpiry);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          'user-123',
          'tenant-123',
          'hashed_token_value',
          'Test API Token',
          ['read', 'write'],
          expect.any(Date), // Default 1 year expiration
        ])
      );
    });

    it('should throw error when token creation fails', async () => {
      const mockResult = { rows: [], rowCount: 0 };
      mockClient.query.mockResolvedValue(mockResult);

      await expect(repository.create(createTokenData)).rejects.toThrow(
        'Failed to create API token'
      );
    });

    it('should handle unique constraint violation for token name', async () => {
      const constraintError = new Error('Duplicate key value') as any;
      constraintError.code = '23505';
      constraintError.constraint = 'unique_token_name_per_user';
      mockClient.query.mockRejectedValue(constraintError);

      await expect(repository.create(createTokenData)).rejects.toThrow(
        'Token name already exists for this user'
      );

      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle other database errors', async () => {
      const dbError = new Error('Connection timeout');
      mockClient.query.mockRejectedValue(dbError);

      await expect(repository.create(createTokenData)).rejects.toThrow(
        'API token creation failed: Connection timeout'
      );

      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should release client on success', async () => {
      const mockResult = { rows: [mockTokenEntity], rowCount: 1 };
      mockClient.query.mockResolvedValue(mockResult);

      await repository.create(createTokenData);

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findByTokenHash', () => {
    it('should find token by hash successfully', async () => {
      const mockResult = { rows: [mockTokenEntity] };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await repository.findByTokenHash('hashed_token_value');

      expect(result).toEqual(mockTokenEntity);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE token_hash = $1'),
        ['hashed_token_value']
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return null when token not found', async () => {
      const mockResult = { rows: [] };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await repository.findByTokenHash('nonexistent_hash');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockClient.query.mockRejectedValue(dbError);

      await expect(repository.findByTokenHash('hash')).rejects.toThrow(
        'Failed to find API token: Database error'
      );

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should find token by ID successfully', async () => {
      const mockResult = { rows: [mockTokenEntity] };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await repository.findById('token-123');

      expect(result).toEqual(mockTokenEntity);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        ['token-123']
      );
    });

    it('should find token by ID with tenant filtering', async () => {
      const mockResult = { rows: [mockTokenEntity] };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await repository.findById('token-123', 'tenant-123');

      expect(result).toEqual(mockTokenEntity);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1 AND tenant_id = $2'),
        ['token-123', 'tenant-123']
      );
    });

    it('should return null when token not found', async () => {
      const mockResult = { rows: [] };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockClient.query.mockRejectedValue(dbError);

      await expect(repository.findById('token-123')).rejects.toThrow(
        'Failed to find API token: Database error'
      );
    });
  });

  describe('findByUserId', () => {
    const multipleTokens = [
      mockTokenEntity,
      { ...mockTokenEntity, id: 'token-456', name: 'Another Token' },
    ];

    it('should find all tokens for a user', async () => {
      const mockResult = { rows: multipleTokens };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await repository.findByUserId('user-123');

      expect(result).toEqual(multipleTokens);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        ['user-123']
      );
    });

    it('should find tokens with tenant filtering', async () => {
      const mockResult = { rows: multipleTokens };
      mockClient.query.mockResolvedValue(mockResult);

      await repository.findByUserId('user-123', 'tenant-123');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1 AND tenant_id = $2'),
        ['user-123', 'tenant-123']
      );
    });

    it('should return empty array when no tokens found', async () => {
      const mockResult = { rows: [] };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await repository.findByUserId('user-123');

      expect(result).toEqual([]);
    });

    it('should order results by created_at DESC', async () => {
      mockClient.query.mockResolvedValue({ rows: multipleTokens });

      await repository.findByUserId('user-123');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        ['user-123']
      );
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockClient.query.mockRejectedValue(dbError);

      await expect(repository.findByUserId('user-123')).rejects.toThrow(
        'Failed to find API tokens: Database error'
      );
    });
  });

  describe('update', () => {
    const updateData: UpdateApiTokenData = {
      name: 'Updated Token',
      scopes: ['read'],
      isActive: false,
      lastUsedAt: new Date('2024-07-01T12:00:00.000Z'),
    };

    it('should update token successfully', async () => {
      const updatedToken = { ...mockTokenEntity, ...updateData };
      const mockResult = { rows: [updatedToken], rowCount: 1 };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await repository.update('token-123', updateData);

      expect(result).toEqual(updatedToken);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining(
          'SET name = $1, scopes = $2, is_active = $3, last_used_at = $4'
        ),
        expect.arrayContaining([
          'Updated Token',
          ['read'],
          false,
          new Date('2024-07-01T12:00:00.000Z'),
          'token-123',
        ])
      );
    });

    it('should update with tenant filtering', async () => {
      const mockResult = { rows: [mockTokenEntity], rowCount: 1 };
      mockClient.query.mockResolvedValue(mockResult);

      await repository.update('token-123', updateData, 'tenant-123');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $5 AND tenant_id = $6'),
        expect.arrayContaining(['token-123', 'tenant-123'])
      );
    });

    it('should update only provided fields', async () => {
      const partialUpdate = { name: 'New Name' };
      const mockResult = {
        rows: [{ ...mockTokenEntity, name: 'New Name' }],
        rowCount: 1,
      };
      mockClient.query.mockResolvedValue(mockResult);

      await repository.update('token-123', partialUpdate);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringMatching(
          /SET name = \$1, updated_at = CURRENT_TIMESTAMP WHERE id = \$2/
        ),
        ['New Name', 'token-123']
      );
    });

    it('should return null when token not found', async () => {
      const mockResult = { rows: [], rowCount: 0 };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await repository.update('nonexistent', updateData);

      expect(result).toBeNull();
    });

    it('should throw error when no fields to update', async () => {
      await expect(repository.update('token-123', {})).rejects.toThrow(
        'No fields to update'
      );
    });

    it('should always include updated_at timestamp', async () => {
      const mockResult = { rows: [mockTokenEntity], rowCount: 1 };
      mockClient.query.mockResolvedValue(mockResult);

      await repository.update('token-123', { name: 'Test' });

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('updated_at = CURRENT_TIMESTAMP'),
        expect.any(Array)
      );
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockClient.query.mockRejectedValue(dbError);

      await expect(repository.update('token-123', updateData)).rejects.toThrow(
        'Failed to update API token: Database error'
      );
    });
  });

  describe('delete', () => {
    it('should delete token successfully', async () => {
      const mockResult = { rowCount: 1 };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await repository.delete('token-123');

      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM api_tokens WHERE id = $1',
        ['token-123']
      );
    });

    it('should delete with tenant filtering', async () => {
      const mockResult = { rowCount: 1 };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await repository.delete('token-123', 'tenant-123');

      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM api_tokens WHERE id = $1 AND tenant_id = $2',
        ['token-123', 'tenant-123']
      );
    });

    it('should return false when token not found', async () => {
      const mockResult = { rowCount: 0 };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await repository.delete('nonexistent');

      expect(result).toBe(false);
    });

    it('should handle null rowCount', async () => {
      const mockResult = { rowCount: null };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await repository.delete('token-123');

      expect(result).toBe(false);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockClient.query.mockRejectedValue(dbError);

      await expect(repository.delete('token-123')).rejects.toThrow(
        'Failed to delete API token: Database error'
      );
    });
  });

  describe('updateLastUsed', () => {
    it('should update last used timestamp successfully', async () => {
      mockClient.query.mockResolvedValue({ rowCount: 1 });

      await repository.updateLastUsed('hashed_token_value');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SET last_used_at = CURRENT_TIMESTAMP'),
        ['hashed_token_value']
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database error');
      mockClient.query.mockRejectedValue(dbError);
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // Should not throw, just log error
      await repository.updateLastUsed('hashed_token_value');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to update token last used timestamp: Database error'
      );
      expect(mockClient.release).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should release client even on error', async () => {
      const dbError = new Error('Database error');
      mockClient.query.mockRejectedValue(dbError);
      jest.spyOn(console, 'error').mockImplementation(() => {});

      await repository.updateLastUsed('hash');

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('tenant isolation', () => {
    it('should isolate tokens by tenant in findById', async () => {
      // Setup: token exists but for different tenant
      const mockResult = { rows: [] }; // Simulate no results due to tenant filter
      mockClient.query.mockResolvedValue(mockResult);

      const result = await repository.findById('token-123', 'wrong-tenant');

      expect(result).toBeNull();
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('AND tenant_id = $2'),
        ['token-123', 'wrong-tenant']
      );
    });

    it('should isolate tokens by tenant in findByUserId', async () => {
      const mockResult = { rows: [] };
      mockClient.query.mockResolvedValue(mockResult);

      await repository.findByUserId('user-123', 'tenant-123');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('AND tenant_id = $2'),
        ['user-123', 'tenant-123']
      );
    });

    it('should isolate tokens by tenant in update', async () => {
      const mockResult = { rows: [], rowCount: 0 };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await repository.update(
        'token-123',
        { name: 'New' },
        'tenant-123'
      );

      expect(result).toBeNull();
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('AND tenant_id = $3'),
        expect.arrayContaining(['token-123', 'tenant-123'])
      );
    });

    it('should isolate tokens by tenant in delete', async () => {
      const mockResult = { rowCount: 0 };
      mockClient.query.mockResolvedValue(mockResult);

      const result = await repository.delete('token-123', 'tenant-123');

      expect(result).toBe(false);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('AND tenant_id = $2'),
        ['token-123', 'tenant-123']
      );
    });
  });

  describe('connection handling', () => {
    it('should properly acquire and release connections', async () => {
      const mockResult = { rows: [mockTokenEntity] };
      mockClient.query.mockResolvedValue(mockResult);

      await repository.findById('token-123');

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should release connection on error', async () => {
      const dbError = new Error('Query failed');
      mockClient.query.mockRejectedValue(dbError);

      await expect(repository.findById('token-123')).rejects.toThrow();

      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle connection acquisition failures', async () => {
      const connectionError = new Error('Connection failed');
      mockPool.connect.mockRejectedValue(connectionError);

      await expect(repository.findById('token-123')).rejects.toThrow();
    });
  });
});
