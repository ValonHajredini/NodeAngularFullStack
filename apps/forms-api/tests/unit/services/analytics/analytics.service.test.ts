/**
 * AnalyticsService Unit Tests
 *
 * Tests analytics service high-level operations and registry integration.
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.2: Backend Analytics Strategy Pattern and Base Infrastructure
 */

import { AnalyticsService } from '../../../../src/services/analytics/analytics.service';
import * as analyticsRepositoryModule from '../../../../src/repositories/analytics.repository';
import { TemplateCategory } from '@nodeangularfullstack/shared';

// Mock the repository at module level
jest.mock('../../../../src/repositories/analytics.repository');

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let mockRepository: jest.Mocked<any>;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup default mock behavior
    mockRepository = {
      getSubmissionCounts: jest.fn().mockResolvedValue({
        totalSubmissions: 0,
        firstSubmissionAt: null,
        lastSubmissionAt: null,
      }),
      getChoiceBreakdown: jest.fn().mockResolvedValue([]),
      getSubmissionsByTimeWindow: jest.fn().mockResolvedValue([]),
      getAllSubmissionValues: jest.fn().mockResolvedValue([]),
    };

    // Replace the singleton instance
    (analyticsRepositoryModule.analyticsRepository as any) = mockRepository;

    service = new AnalyticsService();
  });

  describe('Constructor', () => {
    it('should initialize with generic fallback strategy', () => {
      expect(service).toBeInstanceOf(AnalyticsService);
    });

    it('should have data_collection strategy registered initially', () => {
      const categories = service.getSupportedCategories();
      expect(categories).toContain('data_collection');
      expect(categories.length).toBe(1);
    });
  });

  describe('getFormAnalytics', () => {
    it('should throw error for invalid UUID format', async () => {
      await expect(
        service.getFormAnalytics('invalid-uuid', null, null)
      ).rejects.toThrow('Invalid form ID format');
    });

    it('should throw error for empty formId', async () => {
      await expect(
        service.getFormAnalytics('', null, null)
      ).rejects.toThrow('Invalid form ID format');
    });

    it('should accept valid UUID v4 format', async () => {
      const validUUID = '123e4567-e89b-42d3-a456-426614174000';

      const result = await service.getFormAnalytics(validUUID, null, null);

      expect(result).toBeDefined();
      expect(result.category).toBe('data_collection');
      expect(mockRepository.getSubmissionCounts).toHaveBeenCalledWith(validUUID, null);
    });

    it('should pass category to registry', async () => {
      const validUUID = '123e4567-e89b-42d3-a456-426614174000';

      const result = await service.getFormAnalytics(validUUID, TemplateCategory.POLLS, null);

      // Falls back to generic strategy since no poll strategy is registered
      expect(result).toBeDefined();
      expect(result.category).toBe('data_collection');
    });

    it('should pass tenantId to registry', async () => {
      const validUUID = '123e4567-e89b-42d3-a456-426614174000';
      const tenantId = 'tenant-abc';

      await service.getFormAnalytics(validUUID, null, tenantId);

      expect(mockRepository.getSubmissionCounts).toHaveBeenCalledWith(validUUID, tenantId);
    });

    it('should return CategoryMetrics from registry', async () => {
      const validUUID = '123e4567-e89b-42d3-a456-426614174000';

      mockRepository.getSubmissionCounts.mockResolvedValue({
        totalSubmissions: 150,
        firstSubmissionAt: '2025-01-01T00:00:00Z',
        lastSubmissionAt: '2025-01-15T12:30:00Z',
      });

      const result = await service.getFormAnalytics(validUUID, null, null);

      expect(result.category).toBe('data_collection');
      expect(result.totalSubmissions).toBe(150);
      expect(result.firstSubmissionAt).toBe('2025-01-01T00:00:00Z');
      expect(result.lastSubmissionAt).toBe('2025-01-15T12:30:00Z');
    });

    it('should log error when registry fails', async () => {
      const validUUID = '123e4567-e89b-42d3-a456-426614174000';
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockRepository.getSubmissionCounts.mockRejectedValue(new Error('Database error'));

      await expect(
        service.getFormAnalytics(validUUID, null, null)
      ).rejects.toThrow('Failed to get form analytics');

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle null category', async () => {
      const validUUID = '123e4567-e89b-42d3-a456-426614174000';

      const result = await service.getFormAnalytics(validUUID, null, null);

      expect(result).toBeDefined();
      expect(result.category).toBe('data_collection');
    });

    it('should handle undefined category', async () => {
      const validUUID = '123e4567-e89b-42d3-a456-426614174000';

      const result = await service.getFormAnalytics(validUUID, undefined, null);

      expect(result).toBeDefined();
      expect(result.category).toBe('data_collection');
    });

    it('should validate UUID case-insensitively', async () => {
      const validUUID = '123E4567-E89B-42D3-A456-426614174000'; // Uppercase hex

      const result = await service.getFormAnalytics(validUUID, null, null);

      expect(result).toBeDefined();
    });

    it('should reject UUIDs with wrong version', async () => {
      // UUID v1 format (not v4) - third group must start with 4
      const uuidV1 = '123e4567-e89b-12d3-8456-426614174000';

      await expect(
        service.getFormAnalytics(uuidV1, null, null)
      ).rejects.toThrow('Invalid form ID format');
    });

    it('should reject malformed UUIDs', async () => {
      const malformedUUIDs = [
        '123e4567-e89b-12d3-a456',            // Too short
        '123e4567-e89b-12d3-a456-426614174000-extra', // Too long
        '123e4567e89b12d3a456426614174000',  // Missing hyphens
        'xxxxxxxx-xxxx-4xxx-axxx-xxxxxxxxxxxx', // Invalid hex
      ];

      for (const uuid of malformedUUIDs) {
        await expect(
          service.getFormAnalytics(uuid, null, null)
        ).rejects.toThrow('Invalid form ID format');
      }
    });
  });

  describe('hasSpecializedStrategy', () => {
    it('should return false for null category', () => {
      expect(service.hasSpecializedStrategy(null)).toBe(false);
    });

    it('should return false for undefined category', () => {
      expect(service.hasSpecializedStrategy(undefined)).toBe(false);
    });

    it('should return false for any category (only generic fallback)', () => {
      expect(service.hasSpecializedStrategy(TemplateCategory.POLLS)).toBe(false);
      expect(service.hasSpecializedStrategy(TemplateCategory.QUIZ)).toBe(false);
      expect(service.hasSpecializedStrategy(TemplateCategory.ECOMMERCE)).toBe(false);
    });
  });

  describe('getSupportedCategories', () => {
    it('should return data_collection category', () => {
      const categories = service.getSupportedCategories();
      expect(categories).toContain('data_collection');
      expect(categories.length).toBe(1);
    });
  });

  describe('UUID Validation', () => {
    it('should accept valid UUIDs with different formats', async () => {
      const validUUIDs = [
        '123e4567-e89b-42d3-a456-426614174000',
        'abcdef12-3456-4789-abcd-ef1234567890',
        '00000000-0000-4000-8000-000000000000',
        'ffffffff-ffff-4fff-afff-ffffffffffff',
      ];

      for (const uuid of validUUIDs) {
        const result = await service.getFormAnalytics(uuid, null, null);
        expect(result).toBeDefined();
        expect(mockRepository.getSubmissionCounts).toHaveBeenCalled();
        mockRepository.getSubmissionCounts.mockClear();
      }
    });
  });
});
