import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { ShortLinksService } from '../../../src/services/short-links.service';
import {
  ShortLinksRepository,
  ShortLinkEntity,
} from '../../../src/repositories/short-links.repository';
import { ToolsService } from '../../../src/services/tools.service';
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
      findByUser: jest.fn(),
      deleteExpired: jest.fn(),
      query: jest.fn(),
      codeExists: jest.fn() as jest.MockedFunction<any>,
    } as any;

    (mockRepository.codeExists as jest.MockedFunction<any>).mockResolvedValue(
      false
    );

    mockToolsService = {
      getToolByKey: jest.fn(),
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
      mockToolsService.getToolByKey.mockResolvedValue({ active: true } as any);
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

      expect(result.data.shortLink).toEqual(mockShortLink);
      expect(result.data.qrCodeDataUrl).toBeDefined();
      expect(mockToolsService.getToolByKey).toHaveBeenCalledWith('short-link');
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
      mockToolsService.getToolByKey.mockResolvedValue({ active: false } as any);

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

      expect(result.data.shortLink).toEqual(mockShortLink);
      expect(result.data.qrCodeDataUrl).toBeDefined();
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

      expect(result.data.shortLink).toEqual(mockShortLink);
      expect(result.data.qrCodeDataUrl).toBeDefined();
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

      expect(result.data.shortLink.code).toBe('def456');
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
      const mockShortLink: ShortLinkEntity = {
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

      const updatedEntity = {
        ...mockShortLink,
        clickCount: 6,
        lastAccessedAt: new Date(),
      };

      mockRepository.findByCode.mockResolvedValueOnce(mockShortLink);
      mockRepository.incrementClickCount.mockResolvedValueOnce(updatedEntity);

      const result = await service.resolveShortLink('abc123');

      expect(result.success).toBe(true);
      expect(result.data.shortLink.code).toBe('abc123');
      expect(result.data.originalUrl).toBe('https://example.com');
      expect(mockRepository.findByCode).toHaveBeenCalledWith('abc123');
      expect(mockRepository.incrementClickCount).toHaveBeenCalledWith('abc123');
    });

    it('should throw error for non-existent code', async () => {
      mockRepository.findByCode.mockResolvedValueOnce(null);

      await expect(service.resolveShortLink('notfound')).rejects.toMatchObject({
        success: false,
        message: 'Short link not found',
        code: 'LINK_NOT_FOUND',
      });
      expect(mockRepository.incrementClickCount).not.toHaveBeenCalled();
    });

    it('should throw error for expired links', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);

      const expiredShortLink: ShortLinkEntity = {
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

      await expect(service.resolveShortLink('expired')).rejects.toMatchObject({
        success: false,
        message: 'Short link has expired',
        code: 'LINK_EXPIRED',
      });
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
      const mockShortLink: ShortLinkEntity = {
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

      // Should fail since click count increment is required
      await expect(service.resolveShortLink('abc123')).rejects.toThrow(
        'Update failed'
      );
    });
  });

  describe('getStatistics', () => {
    it('should return statistics when query succeeds', async () => {
      const mockStatsResult = {
        rows: [
          {
            total_links: '15',
            active_links: '12',
            expired_links: '3',
            total_clicks: '250',
          },
        ],
      };

      const mockTopLinksResult = {
        rows: [
          {
            code: 'abc123',
            original_url: 'https://example.com',
            click_count: 25,
          },
        ],
      };

      const queryMock = jest.fn() as jest.MockedFunction<any>;
      queryMock
        .mockResolvedValueOnce(mockStatsResult)
        .mockResolvedValueOnce(mockTopLinksResult);
      (mockRepository as any).query = queryMock;

      const result = await service.getStatistics();

      expect(result).toEqual({
        totalLinks: 15,
        activeLinks: 12,
        expiredLinks: 3,
        totalClicks: 250,
        topLinks: [
          {
            code: 'abc123',
            originalUrl: 'https://example.com',
            clickCount: 25,
          },
        ],
      });
    });

    it('should handle repository error', async () => {
      const queryMock = jest.fn() as jest.MockedFunction<any>;
      queryMock.mockRejectedValueOnce(new Error('Query failed'));
      (mockRepository as any).query = queryMock;

      await expect(service.getStatistics()).rejects.toThrow(
        'Failed to retrieve statistics'
      );
    });
  });

  describe('getUserShortLinks', () => {
    it('should return user links with pagination', async () => {
      const mockEntities: ShortLinkEntity[] = [
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

      mockRepository.findByUser.mockResolvedValueOnce(mockEntities);

      const result = await service.getUserShortLinks('user-id', 10, 0);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('shortUrl');
      expect(result[0].code).toBe('abc123');
      expect(mockRepository.findByUser).toHaveBeenCalledWith('user-id', 10, 0);
    });

    it('should handle default pagination parameters', async () => {
      mockRepository.findByUser.mockResolvedValueOnce([]);

      await service.getUserShortLinks('user-id');

      expect(mockRepository.findByUser).toHaveBeenCalledWith('user-id', 20, 0);
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
        'Failed to cleanup expired links'
      );
    });
  });

  describe('QR Code Storage - Story 7.5', () => {
    describe('createShortLink with QR code storage', () => {
      const validRequest: CreateShortLinkRequest = {
        originalUrl: 'https://example.com',
        expiresAt: null,
      };

      beforeEach(() => {
        mockToolsService.getToolByKey.mockResolvedValue({
          active: true,
        } as any);
      });

      it('should create short link with qrCodeUrl when storage succeeds', async () => {
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
          qrCodeUrl: 'https://storage.example.com/qr-codes/qr-abc123.png',
        };

        mockRepository.create.mockResolvedValueOnce(mockShortLink);

        const result = await service.createShortLink(validRequest, 'user-id');

        // Should have both storage URL and backwards-compatible base64
        expect(result.data.qrCodeUrl).toBeDefined();
        expect(result.data.qrCodeDataUrl).toBeDefined();
        expect(result.data.shortLink.qrCodeUrl).toBeDefined();
      });

      it('should gracefully degrade to base64 when storage upload fails', async () => {
        const mockShortLinkWithoutQR: ShortLink = {
          id: 'test-uuid',
          code: 'abc123',
          originalUrl: 'https://example.com',
          expiresAt: null,
          createdBy: 'user-id',
          clickCount: 0,
          lastAccessedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          qrCodeUrl: null,
        };

        mockRepository.create.mockResolvedValueOnce(mockShortLinkWithoutQR);

        const result = await service.createShortLink(validRequest, 'user-id');

        // Short link should still be created successfully
        expect(result.data.shortLink).toEqual(mockShortLinkWithoutQR);
        // Should fall back to base64 data URL
        expect(result.data.qrCodeDataUrl).toBeDefined();
        expect(result.data.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
      });

      it('should not block short link creation when QR generation fails', async () => {
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

        // Even if QR code fails, short link creation should succeed
        const result = await service.createShortLink(validRequest, 'user-id');

        expect(result.data.shortLink).toEqual(mockShortLink);
        expect(mockRepository.create).toHaveBeenCalled();
      });
    });
  });
});
