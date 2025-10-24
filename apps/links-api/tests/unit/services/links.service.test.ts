import { LinksService } from '../../../src/services/links.service';
import { LinksRepository } from '../../../src/repositories/links.repository';
import { AnalyticsRepository } from '../../../src/repositories/analytics.repository';
import { ShortLink } from '../../../src/types';

// Mock repositories
jest.mock('../../../src/repositories/links.repository');
jest.mock('../../../src/repositories/analytics.repository');

describe('LinksService', () => {
  let service: LinksService;
  let linksRepo: jest.Mocked<LinksRepository>;
  let analyticsRepo: jest.Mocked<AnalyticsRepository>;

  beforeEach(() => {
    // Create mocked repositories
    linksRepo = new LinksRepository(null as any) as jest.Mocked<LinksRepository>;
    analyticsRepo = new AnalyticsRepository(null as any) as jest.Mocked<AnalyticsRepository>;

    service = new LinksService(linksRepo, analyticsRepo, 'http://localhost:3003');

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('generateShortLink', () => {
    it('should generate new short link', async () => {
      const mockShortLink: ShortLink = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: 'user-123',
        resourceType: 'form',
        resourceId: 'form-123',
        originalUrl: 'https://example.com/form',
        shortCode: 'ABC12345',
        clickCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      linksRepo.findByResource = jest.fn().mockResolvedValue(null);
      linksRepo.findByShortCode = jest.fn().mockResolvedValue(null);
      linksRepo.create = jest.fn().mockResolvedValue(mockShortLink);

      const result = await service.generateShortLink({
        userId: 'user-123',
        originalUrl: 'https://example.com/form',
        resourceType: 'form',
        resourceId: 'form-123',
      });

      expect(result).toHaveProperty('qrCode');
      expect(result).toHaveProperty('shortUrl');
      expect(result.shortUrl).toContain(mockShortLink.shortCode);
      expect(linksRepo.create).toHaveBeenCalled();
    });

    it('should return existing link if already exists', async () => {
      const existingLink: ShortLink = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: 'user-123',
        resourceType: 'form',
        resourceId: 'form-123',
        originalUrl: 'https://example.com/form',
        shortCode: 'EXISTING',
        clickCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      linksRepo.findByResource = jest.fn().mockResolvedValue(existingLink);

      const result = await service.generateShortLink({
        userId: 'user-123',
        originalUrl: 'https://example.com/form',
        resourceType: 'form',
        resourceId: 'form-123',
      });

      expect(result.shortCode).toBe('EXISTING');
      expect(linksRepo.create).not.toHaveBeenCalled();
    });

    it('should retry on short code collision', async () => {
      const mockShortLink: ShortLink = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: 'user-123',
        resourceType: 'generic',
        originalUrl: 'https://example.com/test',
        shortCode: 'NEWCODE1',
        clickCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // First call returns collision, second returns null (available)
      linksRepo.findByShortCode = jest
        .fn()
        .mockResolvedValueOnce({ shortCode: 'COLLISION' })
        .mockResolvedValueOnce(null);

      linksRepo.create = jest.fn().mockResolvedValue(mockShortLink);

      const result = await service.generateShortLink({
        userId: 'user-123',
        originalUrl: 'https://example.com/test',
      });

      expect(linksRepo.findByShortCode).toHaveBeenCalledTimes(2);
      expect(result.shortCode).toBe('NEWCODE1');
    });

    it('should throw error after max retry attempts', async () => {
      // Always return collision
      linksRepo.findByShortCode = jest.fn().mockResolvedValue({ shortCode: 'COLLISION' });

      await expect(
        service.generateShortLink({
          userId: 'user-123',
          originalUrl: 'https://example.com/test',
        })
      ).rejects.toThrow('Failed to generate unique short code');
    });
  });

  describe('redirect', () => {
    it('should redirect and track analytics', async () => {
      const mockLink: ShortLink = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: 'user-123',
        resourceType: 'form',
        originalUrl: 'https://example.com/destination',
        shortCode: 'REDIR001',
        clickCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      linksRepo.findByShortCode = jest.fn().mockResolvedValue(mockLink);
      analyticsRepo.create = jest.fn().mockResolvedValue({});
      linksRepo.incrementClickCount = jest.fn().mockResolvedValue(undefined);

      const metadata = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        referrer: 'https://google.com',
      };

      const result = await service.redirect('REDIR001', metadata);

      expect(result).toBe('https://example.com/destination');
      expect(analyticsRepo.create).toHaveBeenCalled();
      expect(linksRepo.incrementClickCount).toHaveBeenCalledWith(mockLink.id);
    });

    it('should throw error for non-existent short code', async () => {
      linksRepo.findByShortCode = jest.fn().mockResolvedValue(null);

      const metadata = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        referrer: '',
      };

      await expect(service.redirect('NOTFOUND', metadata)).rejects.toThrow('Short link not found');
    });

    it('should throw error for expired link', async () => {
      const expiredLink: ShortLink = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: 'user-123',
        resourceType: 'form',
        originalUrl: 'https://example.com/expired',
        shortCode: 'EXPIRED1',
        expiresAt: new Date('2020-01-01'), // Past date
        clickCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      linksRepo.findByShortCode = jest.fn().mockResolvedValue(expiredLink);

      const metadata = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        referrer: '',
      };

      await expect(service.redirect('EXPIRED1', metadata)).rejects.toThrow('Short link has expired');
    });

    it('should append token to URL if present', async () => {
      const mockLink: ShortLink = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: 'user-123',
        resourceType: 'form',
        originalUrl: 'https://example.com/form',
        shortCode: 'TOKEN001',
        token: 'secret-token-123',
        clickCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      linksRepo.findByShortCode = jest.fn().mockResolvedValue(mockLink);
      analyticsRepo.create = jest.fn().mockResolvedValue({});
      linksRepo.incrementClickCount = jest.fn().mockResolvedValue(undefined);

      const metadata = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        referrer: '',
      };

      const result = await service.redirect('TOKEN001', metadata);

      expect(result).toBe('https://example.com/form?token=secret-token-123');
    });

    it('should parse device type correctly', async () => {
      const mockLink: ShortLink = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: 'user-123',
        resourceType: 'form',
        originalUrl: 'https://example.com/form',
        shortCode: 'DEVICE01',
        clickCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      linksRepo.findByShortCode = jest.fn().mockResolvedValue(mockLink);
      analyticsRepo.create = jest.fn().mockResolvedValue({});
      linksRepo.incrementClickCount = jest.fn().mockResolvedValue(undefined);

      const metadata = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
        referrer: '',
      };

      await service.redirect('DEVICE01', metadata);

      expect(analyticsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceType: 'mobile',
          browser: expect.any(String),
          os: expect.any(String),
        })
      );
    });
  });

  describe('getUserLinks', () => {
    it('should return user links', async () => {
      const mockLinks: ShortLink[] = [
        {
          id: '1',
          userId: 'user-123',
          resourceType: 'form',
          originalUrl: 'https://example.com/1',
          shortCode: 'LINK0001',
          clickCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          userId: 'user-123',
          resourceType: 'svg',
          originalUrl: 'https://example.com/2',
          shortCode: 'LINK0002',
          clickCount: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      linksRepo.findByUserId = jest.fn().mockResolvedValue(mockLinks);

      const result = await service.getUserLinks('user-123');

      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe('user-123');
    });
  });

  describe('updateLink', () => {
    it('should update link for owner', async () => {
      const existingLink: ShortLink = {
        id: 'link-123',
        userId: 'user-123',
        resourceType: 'form',
        originalUrl: 'https://example.com/form',
        shortCode: 'UPDATE01',
        clickCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedLink: ShortLink = {
        ...existingLink,
        expiresAt: new Date('2025-12-31'),
      };

      linksRepo.findById = jest.fn().mockResolvedValue(existingLink);
      linksRepo.update = jest.fn().mockResolvedValue(updatedLink);

      const result = await service.updateLink('link-123', 'user-123', {
        expiresAt: new Date('2025-12-31'),
      });

      expect(result?.expiresAt).toBeTruthy();
      expect(linksRepo.update).toHaveBeenCalled();
    });

    it('should throw error for unauthorized user', async () => {
      const existingLink: ShortLink = {
        id: 'link-123',
        userId: 'user-123',
        resourceType: 'form',
        originalUrl: 'https://example.com/form',
        shortCode: 'UPDATE01',
        clickCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      linksRepo.findById = jest.fn().mockResolvedValue(existingLink);

      await expect(
        service.updateLink('link-123', 'wrong-user', { expiresAt: new Date() })
      ).rejects.toThrow('unauthorized');
    });
  });

  describe('deleteLink', () => {
    it('should delete link for owner', async () => {
      const existingLink: ShortLink = {
        id: 'link-123',
        userId: 'user-123',
        resourceType: 'form',
        originalUrl: 'https://example.com/form',
        shortCode: 'DELETE01',
        clickCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      linksRepo.findById = jest.fn().mockResolvedValue(existingLink);
      linksRepo.delete = jest.fn().mockResolvedValue(true);

      const result = await service.deleteLink('link-123', 'user-123');

      expect(result).toBe(true);
      expect(linksRepo.delete).toHaveBeenCalledWith('link-123');
    });

    it('should throw error for unauthorized user', async () => {
      const existingLink: ShortLink = {
        id: 'link-123',
        userId: 'user-123',
        resourceType: 'form',
        originalUrl: 'https://example.com/form',
        shortCode: 'DELETE01',
        clickCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      linksRepo.findById = jest.fn().mockResolvedValue(existingLink);

      await expect(service.deleteLink('link-123', 'wrong-user')).rejects.toThrow('unauthorized');
    });
  });
});
