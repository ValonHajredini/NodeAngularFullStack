import { Pool } from 'pg';
import { LinksRepository } from '../../../src/repositories/links.repository';
import { CreateShortLinkDto } from '../../../src/types';

describe('LinksRepository', () => {
  let pool: Pool;
  let repository: LinksRepository;

  beforeAll(() => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://dbuser:dbpassword@localhost:5435/links_db',
    });
    repository = new LinksRepository(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up test data
    await pool.query('TRUNCATE TABLE short_links CASCADE');
  });

  describe('create', () => {
    it('should create a new short link', async () => {
      const dto: CreateShortLinkDto = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        resourceType: 'form',
        resourceId: '123e4567-e89b-12d3-a456-426614174001',
        originalUrl: 'https://example.com/test',
        shortCode: 'ABC123XY',
      };

      const result = await repository.create(dto);

      expect(result).toHaveProperty('id');
      expect(result.userId).toBe(dto.userId);
      expect(result.resourceType).toBe(dto.resourceType);
      expect(result.originalUrl).toBe(dto.originalUrl);
      expect(result.shortCode).toBe(dto.shortCode);
      expect(result.clickCount).toBe(0);
    });

    it('should create link with expiration date', async () => {
      const expiresAt = new Date('2025-12-31');
      const dto: CreateShortLinkDto = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        resourceType: 'generic',
        originalUrl: 'https://example.com/expire',
        shortCode: 'EXPIRE01',
        expiresAt,
      };

      const result = await repository.create(dto);

      expect(result.expiresAt).toBeTruthy();
      expect(new Date(result.expiresAt!).toISOString()).toBe(expiresAt.toISOString());
    });

    it('should throw error for duplicate short code', async () => {
      const dto: CreateShortLinkDto = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        resourceType: 'form',
        originalUrl: 'https://example.com/test',
        shortCode: 'DUPLICATE',
      };

      await repository.create(dto);

      await expect(repository.create(dto)).rejects.toThrow();
    });
  });

  describe('findByShortCode', () => {
    it('should find existing short link', async () => {
      const dto: CreateShortLinkDto = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        resourceType: 'form',
        originalUrl: 'https://example.com/find',
        shortCode: 'FINDME01',
      };

      await repository.create(dto);
      const result = await repository.findByShortCode('FINDME01');

      expect(result).toBeTruthy();
      expect(result?.shortCode).toBe('FINDME01');
    });

    it('should return null for non-existent code', async () => {
      const result = await repository.findByShortCode('NOTFOUND');
      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should find all links for user', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';

      await repository.create({
        userId,
        resourceType: 'form',
        originalUrl: 'https://example.com/link1',
        shortCode: 'LINK0001',
      });

      await repository.create({
        userId,
        resourceType: 'svg',
        originalUrl: 'https://example.com/link2',
        shortCode: 'LINK0002',
      });

      const results = await repository.findByUserId(userId);

      expect(results).toHaveLength(2);
      expect(results[0].userId).toBe(userId);
      expect(results[1].userId).toBe(userId);
    });

    it('should return empty array for user with no links', async () => {
      const results = await repository.findByUserId('123e4567-e89b-12d3-a456-999999999999');
      expect(results).toHaveLength(0);
    });
  });

  describe('findByResource', () => {
    it('should find link by resource type and ID', async () => {
      const resourceId = '123e4567-e89b-12d3-a456-426614174001';
      const dto: CreateShortLinkDto = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        resourceType: 'form',
        resourceId,
        originalUrl: 'https://example.com/form',
        shortCode: 'FORM0001',
      };

      await repository.create(dto);
      const result = await repository.findByResource('form', resourceId);

      expect(result).toBeTruthy();
      expect(result?.resourceType).toBe('form');
      expect(result?.resourceId).toBe(resourceId);
    });

    it('should return null for non-existent resource', async () => {
      const result = await repository.findByResource('form', '123e4567-e89b-12d3-a456-999999999999');
      expect(result).toBeNull();
    });
  });

  describe('incrementClickCount', () => {
    it('should increment click count', async () => {
      const dto: CreateShortLinkDto = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        resourceType: 'form',
        originalUrl: 'https://example.com/click',
        shortCode: 'CLICK001',
      };

      const created = await repository.create(dto);
      expect(created.clickCount).toBe(0);

      await repository.incrementClickCount(created.id);
      await repository.incrementClickCount(created.id);

      const updated = await repository.findById(created.id);
      expect(updated?.clickCount).toBe(2);
    });
  });

  describe('update', () => {
    it('should update expiration date', async () => {
      const dto: CreateShortLinkDto = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        resourceType: 'form',
        originalUrl: 'https://example.com/update',
        shortCode: 'UPDATE01',
      };

      const created = await repository.create(dto);
      const newExpiry = new Date('2025-06-30');

      const updated = await repository.update(created.id, { expiresAt: newExpiry });

      expect(updated).toBeTruthy();
      expect(new Date(updated!.expiresAt!).toISOString()).toBe(newExpiry.toISOString());
    });
  });

  describe('delete', () => {
    it('should delete short link', async () => {
      const dto: CreateShortLinkDto = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        resourceType: 'form',
        originalUrl: 'https://example.com/delete',
        shortCode: 'DELETE01',
      };

      const created = await repository.create(dto);
      const deleted = await repository.delete(created.id);

      expect(deleted).toBe(true);

      const notFound = await repository.findById(created.id);
      expect(notFound).toBeNull();
    });

    it('should return false for non-existent link', async () => {
      const deleted = await repository.delete('123e4567-e89b-12d3-a456-999999999999');
      expect(deleted).toBe(false);
    });
  });

  describe('deleteExpired', () => {
    it('should delete expired links', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow

      await repository.create({
        userId: '123e4567-e89b-12d3-a456-426614174000',
        resourceType: 'form',
        originalUrl: 'https://example.com/expired',
        shortCode: 'EXPIRED1',
        expiresAt: pastDate,
      });

      await repository.create({
        userId: '123e4567-e89b-12d3-a456-426614174000',
        resourceType: 'form',
        originalUrl: 'https://example.com/valid',
        shortCode: 'VALID001',
        expiresAt: futureDate,
      });

      const deletedCount = await repository.deleteExpired();

      expect(deletedCount).toBe(1);

      const expired = await repository.findByShortCode('EXPIRED1');
      const valid = await repository.findByShortCode('VALID001');

      expect(expired).toBeNull();
      expect(valid).toBeTruthy();
    });
  });
});
