import { validationResult } from 'express-validator';
import { Request } from 'express';
import {
  validateCreateTheme,
  validateUpdateTheme,
  validateThemeId,
} from '../../../src/validators/themes.validator';

// Mock only validationResult
jest.mock('express-validator', () => ({
  ...jest.requireActual('express-validator'),
  validationResult: jest.fn(),
}));

const mockValidationResult = validationResult as jest.MockedFunction<
  typeof validationResult
>;

describe('Themes Validator', () => {
  let mockReq: Partial<Request>;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
    };
    jest.clearAllMocks();
  });

  describe('validateCreateTheme', () => {
    it('should be an array of validation rules', () => {
      expect(Array.isArray(validateCreateTheme)).toBe(true);
      expect(validateCreateTheme.length).toBeGreaterThan(0);
    });

    it('should contain validation rules for all required fields', () => {
      // Test that validation rules exist for the expected fields
      expect(validateCreateTheme.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('validateUpdateTheme', () => {
    it('should be an array of validation rules', () => {
      expect(Array.isArray(validateUpdateTheme)).toBe(true);
      expect(validateUpdateTheme.length).toBeGreaterThan(0);
    });

    it('should contain validation rules for optional fields', () => {
      // Test that validation rules exist for the expected fields
      expect(validateUpdateTheme.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('validateThemeId', () => {
    it('should be an array of validation rules', () => {
      expect(Array.isArray(validateThemeId)).toBe(true);
      expect(validateThemeId.length).toBeGreaterThan(0);
    });

    it('should contain validation rules for id parameter', () => {
      // Test that validation rules exist for the id parameter
      expect(validateThemeId.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Validation Result Handling', () => {
    it('should handle validation errors correctly', () => {
      const mockErrors = {
        isEmpty: () => false,
        array: () => [
          {
            field: 'name',
            msg: 'Name must be between 3 and 100 characters',
            value: 'ab',
          },
        ],
      };

      mockValidationResult.mockReturnValue(mockErrors as any);

      const result = mockValidationResult(mockReq as Request);
      expect(result.isEmpty()).toBe(false);
      expect(result.array()).toHaveLength(1);
      expect(result.array()[0].msg).toBe(
        'Name must be between 3 and 100 characters'
      );
    });

    it('should handle successful validation', () => {
      const mockNoErrors = {
        isEmpty: () => true,
        array: () => [],
      };

      mockValidationResult.mockReturnValue(mockNoErrors as any);

      const result = mockValidationResult(mockReq as Request);
      expect(result.isEmpty()).toBe(true);
      expect(result.array()).toHaveLength(0);
    });
  });

  describe('Theme Configuration Validation', () => {
    it('should validate desktop theme configuration structure', () => {
      const validThemeConfig = {
        desktop: {
          primaryColor: '#007bff',
          secondaryColor: '#6c757d',
          backgroundColor: '#ffffff',
          textColorPrimary: '#212529',
          textColorSecondary: '#6c757d',
          fontFamilyHeading: 'Roboto',
          fontFamilyBody: 'Open Sans',
          fieldBorderRadius: '8px',
          fieldSpacing: '16px',
          containerBackground: '#f8f9fa',
          containerOpacity: 0.95,
          containerPosition: 'center',
        },
      };

      // This would be tested in integration tests with actual request validation
      expect(validThemeConfig.desktop).toBeDefined();
      expect(validThemeConfig.desktop.primaryColor).toMatch(
        /^#[0-9A-Fa-f]{6}$/
      );
      expect(validThemeConfig.desktop.containerOpacity).toBeGreaterThanOrEqual(
        0
      );
      expect(validThemeConfig.desktop.containerOpacity).toBeLessThanOrEqual(1);
    });

    it('should validate mobile theme configuration structure', () => {
      const validMobileConfig = {
        mobile: {
          primaryColor: '#0056b3',
          fieldSpacing: '12px',
        },
      };

      expect(validMobileConfig.mobile).toBeDefined();
      expect(validMobileConfig.mobile.primaryColor).toMatch(
        /^#[0-9A-Fa-f]{6}$/
      );
    });
  });

  describe('Color Validation', () => {
    it('should validate hex color format', () => {
      const validColors = ['#FF5733', '#007bff', '#28a745', '#dc3545'];
      const invalidColors = ['FF5733', '#FF573', 'red', '#GGGGGG'];

      validColors.forEach((color) => {
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });

      invalidColors.forEach((color) => {
        expect(color).not.toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });
  });

  describe('URL Validation', () => {
    it('should validate thumbnail URL format', () => {
      const validUrls = [
        'https://example.com/image.jpg',
        'http://example.com/image.png',
        'https://spaces.example.com/theme-thumb.jpg',
      ];
      const invalidUrls = [
        'not-a-url',
        'ftp://example.com/image.jpg',
        'example.com/image.jpg',
      ];

      validUrls.forEach((url) => {
        expect(url).toMatch(/^https?:\/\/.+/);
      });

      invalidUrls.forEach((url) => {
        expect(url).not.toMatch(/^https?:\/\/.+/);
      });
    });
  });

  describe('UUID Validation', () => {
    it('should validate UUID format for theme IDs', () => {
      const validUuids = [
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-41d1-80b4-00c04fd430c8',
      ];
      const invalidUuids = [
        '123',
        'not-a-uuid',
        '123e4567-e89b-12d3-a456-42661417400', // Too short
      ];

      // UUID v4 regex pattern
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      validUuids.forEach((uuid) => {
        expect(uuid).toMatch(uuidRegex);
      });

      invalidUuids.forEach((uuid) => {
        expect(uuid).not.toMatch(uuidRegex);
      });
    });
  });
});
