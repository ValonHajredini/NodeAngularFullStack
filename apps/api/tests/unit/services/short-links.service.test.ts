import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { ShortLinksService } from '../../../src/services/short-links.service.js';
import { ShortLinksRepository } from '../../../src/repositories/short-links.repository.js';
import { ToolsService } from '../../../src/services/tools.service.js';
import type {
  ShortLink,
  CreateShortLinkRequest,
} from '@nodeangularfullstack/shared';

/**
 * Unit tests for ShortLinksService
 * Tests business logic for short link management
 */
describe('ShortLinksService', () => {
  let service: ShortLinksService;
  let mockRepository: jest.Mocked<ShortLinksRepository>;
  let mockToolsService: jest.Mocked<ToolsService>;

  beforeEach(() => {
    // Mock dependencies
    mockRepository = {
      create: jest.fn(),
      findByCode: jest.fn(),
      incrementClickCount: jest.fn(),
      getStatistics: jest.fn(),
      findByUser: jest.fn(),
      deleteExpired: jest.fn(),
    } as any;

    mockToolsService = {
      isToolEnabled: jest.fn(),
    } as any;

    service = new ShortLinksService(mockRepository, mockToolsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createShortLink', () => {
    const validRequest: CreateShortLinkRequest = {
      originalUrl: 'https://example.com',
      expiresAt: null,
    };

    beforeEach(() => {
      mockToolsService.isToolEnabled.mockResolvedValue(true);
    });

    it('should create short link successfully', async () => {
      const mockShortLink: ShortLink = {
        id: 'test-uuid',
        code: 'abc123',
        originalUrl: 'https://example.com',
        expiresAt: null,
        createdBy: 'user-id',
        clickCount: 0,
        lastAccessedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockResolvedValueOnce(mockShortLink);

      const result = await service.createShortLink(validRequest, 'user-id');

      expect(result).toEqual(mockShortLink);
      expect(mockToolsService.isToolEnabled).toHaveBeenCalledWith('short-link');
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          originalUrl: 'https://example.com',
          expiresAt: null,
          createdBy: 'user-id',
          code: expect.stringMatching(/^[A-Za-z0-9]{6,8}$/),
        })
      );
    });

    it('should throw error when tool is disabled', async () => {
      mockToolsService.isToolEnabled.mockResolvedValue(false);

      await expect(
        service.createShortLink(validRequest, 'user-id')
      ).rejects.toThrow('Short link tool is not enabled');
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should validate URL format', async () => {
      const invalidRequest = { ...validRequest, originalUrl: 'not-a-url' };

      await expect(
        service.createShortLink(invalidRequest, 'user-id')
      ).rejects.toThrow('Invalid URL format');
    });

    it('should reject dangerous URL schemes', async () => {
      const dangerousSchemes = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'file:///etc/passwd',
        'ftp://example.com',
      ];

      for (const url of dangerousSchemes) {
        const request = { ...validRequest, originalUrl: url };
        await expect(
          service.createShortLink(request, 'user-id')
        ).rejects.toThrow('Only HTTP and HTTPS URLs are allowed');
      }
    });

    it('should reject URLs that are too long', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2100);
      const request = { ...validRequest, originalUrl: longUrl };

      await expect(service.createShortLink(request, 'user-id')).rejects.toThrow(
        'URL is too long (max 2048 characters)'
      );
    });

    it('should handle localhost URLs in development', async () => {
      process.env.NODE_ENV = 'development';
      const localhostRequest = {
        ...validRequest,
        originalUrl: 'http://localhost:3000',
      };

      const mockShortLink: ShortLink = {
        id: 'test-uuid',
        code: 'abc123',
        originalUrl: 'http://localhost:3000',
        expiresAt: null,
        createdBy: 'user-id',
        clickCount: 0,
        lastAccessedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockResolvedValueOnce(mockShortLink);

      const result = await service.createShortLink(localhostRequest, 'user-id');

      expect(result).toEqual(mockShortLink);
      delete process.env.NODE_ENV;
    });

    it('should reject localhost URLs in production', async () => {
      process.env.NODE_ENV = 'production';
      const localhostRequest = {
        ...validRequest,
        originalUrl: 'http://localhost:3000',
      };

      await expect(
        service.createShortLink(localhostRequest, 'user-id')
      ).rejects.toThrow('Localhost URLs are not allowed in production');
      delete process.env.NODE_ENV;
    });

    it('should handle future expiration dates', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const requestWithExpiry = { ...validRequest, expiresAt: futureDate };

      const mockShortLink: ShortLink = {
        id: 'test-uuid',
        code: 'abc123',
        originalUrl: 'https://example.com',
        expiresAt: futureDate,
        createdBy: 'user-id',
        clickCount: 0,
        lastAccessedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockResolvedValueOnce(mockShortLink);

      const result = await service.createShortLink(
        requestWithExpiry,
        'user-id'
      );

      expect(result).toEqual(mockShortLink);
    });

    it('should reject past expiration dates', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const requestWithPastExpiry = { ...validRequest, expiresAt: pastDate };

      await expect(
        service.createShortLink(requestWithPastExpiry, 'user-id')
      ).rejects.toThrow('Expiration date must be in the future');
    });

    it('should retry on code collision', async () => {
      mockRepository.create
        .mockRejectedValueOnce(
          new Error('duplicate key value violates unique constraint')
        )
        .mockResolvedValueOnce({
          id: 'test-uuid',
          code: 'def456',
          originalUrl: 'https://example.com',
          expiresAt: null,
          createdBy: 'user-id',
          clickCount: 0,
          lastAccessedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      const result = await service.createShortLink(validRequest, 'user-id');

      expect(result.code).toBe('def456');
      expect(mockRepository.create).toHaveBeenCalledTimes(2);
    });

    it('should fail after maximum retry attempts', async () => {
      mockRepository.create.mockRejectedValue(
        new Error('duplicate key value violates unique constraint')
      );

      await expect(
        service.createShortLink(validRequest, 'user-id')
      ).rejects.toThrow(
        'Unable to generate unique short code after 5 attempts'
      );
      expect(mockRepository.create).toHaveBeenCalledTimes(5);
    });
  });

  describe('resolveShortLink', () => {
    it('should resolve valid short link', async () => {
      const mockShortLink: ShortLink = {
        id: 'test-uuid',
        code: 'abc123',
        originalUrl: 'https://example.com',
        expiresAt: null,
        createdBy: 'user-id',
        clickCount: 5,
        lastAccessedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findByCode.mockResolvedValueOnce(mockShortLink);
      mockRepository.incrementClickCount.mockResolvedValueOnce({
        ...mockShortLink,
        clickCount: 6,
        lastAccessedAt: new Date(),
      });

      const result = await service.resolveShortLink('abc123');

      expect(result).toEqual(mockShortLink);
      expect(mockRepository.findByCode).toHaveBeenCalledWith('abc123');
      expect(mockRepository.incrementClickCount).toHaveBeenCalledWith('abc123');
    });

    it('should return null for non-existent code', async () => {
      mockRepository.findByCode.mockResolvedValueOnce(null);

      const result = await service.resolveShortLink('notfound');

      expect(result).toBeNull();
      expect(mockRepository.incrementClickCount).not.toHaveBeenCalled();
    });

    it('should return null for expired links', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);

      const expiredShortLink: ShortLink = {
        id: 'test-uuid',
        code: 'expired',
        originalUrl: 'https://example.com',
        expiresAt: expiredDate,
        createdBy: 'user-id',
        clickCount: 0,
        lastAccessedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findByCode.mockResolvedValueOnce(expiredShortLink);

      const result = await service.resolveShortLink('expired');

      expect(result).toBeNull();
      expect(mockRepository.incrementClickCount).not.toHaveBeenCalled();
    });

    it('should handle repository errors gracefully', async () => {
      mockRepository.findByCode.mockRejectedValueOnce(
        new Error('Database error')
      );

      await expect(service.resolveShortLink('abc123')).rejects.toThrow(
        'Database error'
      );
    });

    it('should handle click count increment errors', async () => {
      const mockShortLink: ShortLink = {
        id: 'test-uuid',
        code: 'abc123',
        originalUrl: 'https://example.com',
        expiresAt: null,
        createdBy: 'user-id',
        clickCount: 5,
        lastAccessedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findByCode.mockResolvedValueOnce(mockShortLink);
      mockRepository.incrementClickCount.mockRejectedValueOnce(
        new Error('Update failed')
      );

      // Should still return the link even if analytics update fails
      const result = await service.resolveShortLink('abc123');

      expect(result).toEqual(mockShortLink);
    });
  });

  describe('getStatistics', () => {
    it('should return user statistics', async () => {
      const mockStats = {
        totalLinks: 15,
        totalClicks: 250,
        recentLinks: [
          {
            id: 'uuid1',
            code: 'abc123',
            originalUrl: 'https://example.com',
            clickCount: 25,
            createdAt: new Date(),
          },
        ],
      };

      mockRepository.getStatistics.mockResolvedValueOnce(mockStats);

      const result = await service.getStatistics('user-id');

      expect(result).toEqual(mockStats);
      expect(mockRepository.getStatistics).toHaveBeenCalledWith('user-id');
    });

    it('should handle repository error', async () => {
      mockRepository.getStatistics.mockRejectedValueOnce(
        new Error('Query failed')
      );

      await expect(service.getStatistics('user-id')).rejects.toThrow(
        'Query failed'
      );
    });
  });

  describe('getUserLinks', () => {
    it('should return user links with pagination', async () => {
      const mockLinks: ShortLink[] = [
        {
          id: 'uuid1',
          code: 'abc123',
          originalUrl: 'https://example.com',
          expiresAt: null,
          createdBy: 'user-id',
          clickCount: 5,
          lastAccessedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRepository.findByUser.mockResolvedValueOnce(mockLinks);

      const result = await service.getUserLinks('user-id', 10, 0);

      expect(result).toEqual(mockLinks);
      expect(mockRepository.findByUser).toHaveBeenCalledWith('user-id', 10, 0);
    });

    it('should handle default pagination parameters', async () => {
      mockRepository.findByUser.mockResolvedValueOnce([]);

      await service.getUserLinks('user-id');

      expect(mockRepository.findByUser).toHaveBeenCalledWith('user-id', 50, 0);
    });
  });

  describe('cleanupExpiredLinks', () => {
    it('should cleanup expired links', async () => {
      mockRepository.deleteExpired.mockResolvedValueOnce(5);

      const result = await service.cleanupExpiredLinks();

      expect(result).toBe(5);
      expect(mockRepository.deleteExpired).toHaveBeenCalled();
    });

    it('should handle cleanup errors', async () => {
      mockRepository.deleteExpired.mockRejectedValueOnce(
        new Error('Cleanup failed')
      );

      await expect(service.cleanupExpiredLinks()).rejects.toThrow(
        'Cleanup failed'
      );
    });
  });

  describe('generateShortCode', () => {
    it('should generate codes of correct length', () => {
      for (let i = 0; i < 10; i++) {
        const code = (service as any).generateShortCode();
        expect(code).toMatch(/^[A-Za-z0-9]{6,8}$/);
        expect(code.length).toBeGreaterThanOrEqual(6);
        expect(code.length).toBeLessThanOrEqual(8);
      }
    });

    it('should generate unique codes', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        const code = (service as any).generateShortCode();
        codes.add(code);
      }
      // Should generate mostly unique codes (allowing for small probability of collision)
      expect(codes.size).toBeGreaterThan(95);
    });
  });

  describe('validateUrl', () => {
    it('should validate correct URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://example.org',
        'https://subdomain.example.com/path?query=value',
        'http://localhost:3000', // allowed in development
      ];

      for (const url of validUrls) {
        expect(() => (service as any).validateUrl(url)).not.toThrow();
      }
    });

    it('should reject invalid URL formats', () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://example.com',
        'javascript:alert(1)',
        'data:text/html,content',
        '',
        '   ',
      ];

      for (const url of invalidUrls) {
        expect(() => (service as any).validateUrl(url)).toThrow();
      }
    });
  });
});
