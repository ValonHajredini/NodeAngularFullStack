import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { ShortLinksRepository } from '../../../src/repositories/short-links.repository';
import type {
  ShortLink,
  CreateShortLinkData,
} from '@nodeangularfullstack/shared';
import { databaseService } from '../../../src/services/database.service';

// Mock the database service
jest.mock('../../../src/services/database.service', () => ({
  databaseService: {
    getPool: jest.fn(),
  },
}));

/**
 * Unit tests for ShortLinksRepository
 * Tests data access layer functionality for short links
 */
describe('ShortLinksRepository', () => {
  let repository: ShortLinksRepository;
  let mockPool: any;
  let mockClient: any;

  beforeEach(() => {
    // Mock client for transactions
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    // Mock the database pool
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
    };

    // Setup connect to return mockClient
    // @ts-ignore - Mock setup
    mockPool.connect.mockResolvedValue(mockClient);

    // Make mockClient.query return the same as mockPool.query by default
    // @ts-ignore - Mock setup
    mockClient.query.mockImplementation((...args: any[]) =>
      mockPool.query(...args)
    );

    // Mock databaseService to return our mock pool
    // @ts-ignore - Mock setup
    databaseService.getPool.mockReturnValue(mockPool);

    repository = new ShortLinksRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a short link successfully', async () => {
      const mockShortLink: ShortLink = {
        id: 'test-uuid',
        code: 'abc123',
        originalUrl: 'https://example.com',
        expiresAt: null,
        createdBy: 'user-id',
        clickCount: 0,
        lastAccessedAt: null,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:00:00Z'),
      };

      const createData: CreateShortLinkData = {
        code: 'abc123',
        originalUrl: 'https://example.com',
        expiresAt: null,
        createdBy: 'user-id',
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockShortLink],
        rowCount: 1,
      } as any);

      const result = await repository.create(createData);

      expect(result).toEqual(mockShortLink);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO short_links'),
        expect.arrayContaining([
          'abc123',
          'https://example.com',
          null,
          'user-id',
        ])
      );
    });

    it('should handle creation with expiration date', async () => {
      const expiresAt = new Date('2025-12-31T23:59:59Z');
      const createData: CreateShortLinkData = {
        code: 'xyz789',
        originalUrl: 'https://example.org',
        expiresAt,
        createdBy: null,
      };

      const mockShortLink: ShortLink = {
        id: 'test-uuid-2',
        code: 'xyz789',
        originalUrl: 'https://example.org',
        expiresAt,
        createdBy: null,
        clickCount: 0,
        lastAccessedAt: null,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:00:00Z'),
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockShortLink],
        rowCount: 1,
      } as any);

      const result = await repository.create(createData);

      expect(result).toEqual(mockShortLink);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO short_links'),
        expect.arrayContaining([
          'xyz789',
          'https://example.org',
          expiresAt,
          null,
        ])
      );
    });

    it('should throw error when database insert fails', async () => {
      const createData: CreateShortLinkData = {
        code: 'fail123',
        originalUrl: 'https://example.com',
        expiresAt: null,
        createdBy: 'user-id',
      };

      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(repository.create(createData)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('findByCode', () => {
    it('should find short link by code', async () => {
      const mockShortLink: ShortLink = {
        id: 'test-uuid',
        code: 'abc123',
        originalUrl: 'https://example.com',
        expiresAt: null,
        createdBy: 'user-id',
        clickCount: 5,
        lastAccessedAt: new Date('2025-01-01T12:00:00Z'),
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:00:00Z'),
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockShortLink],
        rowCount: 1,
      } as any);

      const result = await repository.findByCode('abc123');

      expect(result).toEqual(mockShortLink);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM short_links WHERE code = $1'),
        ['abc123']
      );
    });

    it('should return null when code not found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await repository.findByCode('notfound');

      expect(result).toBeNull();
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM short_links WHERE code = $1'),
        ['notfound']
      );
    });

    it('should handle database query error', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Connection failed'));

      await expect(repository.findByCode('abc123')).rejects.toThrow(
        'Connection failed'
      );
    });
  });

  describe('incrementClickCount', () => {
    it('should increment click count and update last accessed', async () => {
      const updatedShortLink: ShortLink = {
        id: 'test-uuid',
        code: 'abc123',
        originalUrl: 'https://example.com',
        expiresAt: null,
        createdBy: 'user-id',
        clickCount: 6,
        lastAccessedAt: new Date('2025-01-01T13:00:00Z'),
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T13:00:00Z'),
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [updatedShortLink],
        rowCount: 1,
      } as any);

      const result = await repository.incrementClickCount('abc123');

      expect(result).toEqual(updatedShortLink);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining(
          'UPDATE short_links SET click_count = click_count + 1'
        ),
        ['abc123']
      );
    });

    it('should return null when code not found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await repository.incrementClickCount('notfound');

      expect(result).toBeNull();
    });

    it('should handle database update error', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Update failed'));

      await expect(repository.incrementClickCount('abc123')).rejects.toThrow(
        'Update failed'
      );
    });
  });

  // TODO: getStatistics method not implemented in repository yet
  // describe('getStatistics', () => {
  //   it('should return statistics for a user', async () => {
  //     const mockStats = {
  //       totalLinks: 10,
  //       totalClicks: 150,
  //       recentLinks: [
  //         {
  //           id: 'uuid1',
  //           code: 'abc123',
  //           originalUrl: 'https://example.com',
  //           clickCount: 25,
  //           createdAt: new Date('2025-01-01T00:00:00Z'),
  //         },
  //       ],
  //     };

  //     mockPool.query.mockImplementation((query: string) => {
  //       if (query.includes('COUNT(*)')) {
  //         return Promise.resolve({
  //           rows: [{ total_links: 10, total_clicks: 150 }],
  //           rowCount: 1,
  //         } as any);
  //       } else {
  //         return Promise.resolve({
  //           rows: mockStats.recentLinks,
  //           rowCount: 1,
  //         } as any);
  //       }
  //     });

  //     const result = await repository.getStatistics('user-id');

  //     expect(result.totalLinks).toBe(10);
  //     expect(result.totalClicks).toBe(150);
  //     expect(result.recentLinks).toHaveLength(1);
  //     expect(mockPool.query).toHaveBeenCalledTimes(2);
  //   });

  //   it('should handle statistics query error', async () => {
  //     mockPool.query.mockRejectedValueOnce(new Error('Stats query failed'));

  //     await expect(repository.getStatistics('user-id')).rejects.toThrow(
  //       'Stats query failed'
  //     );
  //   });

  //   it('should return zero stats when no links found', async () => {
  //     mockPool.query.mockImplementation((query: string) => {
  //       if (query.includes('COUNT(*)')) {
  //         return Promise.resolve({
  //           rows: [{ total_links: 0, total_clicks: 0 }],
  //           rowCount: 1,
  //         } as any);
  //       } else {
  //         return Promise.resolve({
  //           rows: [],
  //           rowCount: 0,
  //         } as any);
  //       }
  //     });

  //     const result = await repository.getStatistics('user-id');

  //     expect(result.totalLinks).toBe(0);
  //     expect(result.totalClicks).toBe(0);
  //     expect(result.recentLinks).toHaveLength(0);
  //   });
  // });

  describe('findByUser', () => {
    it('should find links by user with pagination', async () => {
      const mockLinks: ShortLink[] = [
        {
          id: 'uuid1',
          code: 'abc123',
          originalUrl: 'https://example.com',
          expiresAt: null,
          createdBy: 'user-id',
          clickCount: 5,
          lastAccessedAt: null,
          createdAt: new Date('2025-01-01T00:00:00Z'),
          updatedAt: new Date('2025-01-01T00:00:00Z'),
        },
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockLinks,
        rowCount: 1,
      } as any);

      const result = await repository.findByUser('user-id', 10, 0);

      expect(result).toEqual(mockLinks);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE created_by = $1'),
        ['user-id', 10, 0]
      );
    });

    it('should return empty array when no links found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await repository.findByUser('user-id', 10, 0);

      expect(result).toEqual([]);
    });

    it('should handle pagination correctly', async () => {
      await repository.findByUser('user-id', 5, 10);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        ['user-id', 5, 10]
      );
    });
  });

  describe('deleteExpired', () => {
    it('should delete expired links', async () => {
      mockPool.query.mockResolvedValueOnce({
        rowCount: 3,
      } as any);

      const result = await repository.deleteExpired();

      expect(result).toBe(3);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining(
          'DELETE FROM short_links WHERE expires_at < NOW()'
        )
      );
    });

    it('should return 0 when no expired links found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rowCount: 0,
      } as any);

      const result = await repository.deleteExpired();

      expect(result).toBe(0);
    });

    it('should handle delete error', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Delete failed'));

      await expect(repository.deleteExpired()).rejects.toThrow('Delete failed');
    });
  });
});
