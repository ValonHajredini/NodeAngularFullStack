import { Pool } from 'pg';
import { databaseService } from '../../src/services/database.service';
import { themesRepository } from '../../src/repositories/themes.repository';
import {
  CreateCustomThemeRequest,
  ResponsiveThemeConfig,
} from '@nodeangularfullstack/shared';

describe('Custom Themes Integration Tests', () => {
  let pool: Pool;
  let testUserId: string;
  const createdThemeIds: string[] = [];

  beforeAll(async () => {
    pool = databaseService.getPool();

    // Create a test user for theme creation
    const userResult = await pool.query(
      `
      INSERT INTO users (email, password_hash, first_name, last_name, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `,
      [
        'test-theme-creator@example.com',
        'hashed_password',
        'Theme',
        'Creator',
        'user',
      ]
    );

    testUserId = userResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up created themes
    if (createdThemeIds.length > 0) {
      await pool.query(`DELETE FROM form_themes WHERE id = ANY($1)`, [
        createdThemeIds,
      ]);
    }

    // Clean up test user
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
  });

  describe('validateThemeDefinitionSize', () => {
    it('should validate theme definition within 50KB limit', () => {
      const smallThemeDefinition = {
        customCss: '.form-container { background: #fff; }',
        settings: { enabled: true },
      };

      const result =
        themesRepository.validateThemeDefinitionSize(smallThemeDefinition);

      expect(result.valid).toBe(true);
      expect(result.sizeInBytes).toBeDefined();
      expect(result.sizeInBytes!).toBeLessThan(51200); // 50KB
      expect(result.error).toBeUndefined();
    });

    it('should reject theme definition exceeding 50KB limit', () => {
      // Create a large theme definition (over 50KB)
      const largeCssString = 'a'.repeat(52000); // Over 50KB
      const largeThemeDefinition = {
        customCss: largeCssString,
        settings: { enabled: true },
      };

      const result =
        themesRepository.validateThemeDefinitionSize(largeThemeDefinition);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum size of 50KB');
      expect(result.sizeInBytes).toBeGreaterThan(51200);
    });

    it('should handle invalid JSON data gracefully', () => {
      const circularRef: any = {};
      circularRef.self = circularRef; // Create circular reference

      const result = themesRepository.validateThemeDefinitionSize(circularRef);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid theme definition');
    });
  });

  describe('createCustomTheme', () => {
    it('should create a custom theme with valid data', async () => {
      const themeConfig: ResponsiveThemeConfig = {
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

      const customThemeData: CreateCustomThemeRequest = {
        name: 'Test Custom Theme',
        description: 'A test custom theme',
        thumbnailUrl: 'https://spaces.example.com/custom-thumb.png',
        themeConfig,
        creatorId: testUserId,
        themeDefinition: {
          customCss: '.custom-form { border: 2px solid #007bff; }',
          settings: { customFeatures: true },
        },
      };

      const createdTheme =
        await themesRepository.createCustomTheme(customThemeData);
      createdThemeIds.push(createdTheme.id);

      expect(createdTheme).toBeDefined();
      expect(createdTheme.id).toBeDefined();
      expect(createdTheme.name).toBe('Test Custom Theme');
      expect(createdTheme.isCustom).toBe(true);
      expect(createdTheme.creatorId).toBe(testUserId);
      expect(createdTheme.themeDefinition).toBeDefined();
      expect(createdTheme.themeDefinition.customCss).toContain('.custom-form');
      expect(createdTheme.usageCount).toBe(0);
      expect(createdTheme.isActive).toBe(true);
    });

    it('should reject custom theme with oversized theme definition', async () => {
      const themeConfig: ResponsiveThemeConfig = {
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

      const largeCssString = 'a'.repeat(52000); // Over 50KB
      const customThemeData: CreateCustomThemeRequest = {
        name: 'Oversized Custom Theme',
        description: 'A custom theme with oversized definition',
        thumbnailUrl: 'https://spaces.example.com/oversized-thumb.png',
        themeConfig,
        creatorId: testUserId,
        themeDefinition: {
          customCss: largeCssString,
          settings: { customFeatures: true },
        },
      };

      await expect(
        themesRepository.createCustomTheme(customThemeData)
      ).rejects.toThrow('exceeds maximum size of 50KB');
    });
  });

  describe('findCustomThemesByCreator', () => {
    let customThemeId: string;

    beforeAll(async () => {
      // Create a custom theme for testing
      const themeConfig: ResponsiveThemeConfig = {
        desktop: {
          primaryColor: '#ff6b35',
          secondaryColor: '#f7931e',
          backgroundColor: '#ffffff',
          textColorPrimary: '#2c3e50',
          textColorSecondary: '#7f8c8d',
          fontFamilyHeading: 'Poppins',
          fontFamilyBody: 'Lato',
          fieldBorderRadius: '12px',
          fieldSpacing: '20px',
          containerBackground: '#ffeaa7',
          containerOpacity: 0.9,
          containerPosition: 'center',
        },
      };

      const customThemeData: CreateCustomThemeRequest = {
        name: 'Find Test Custom Theme',
        description: 'A custom theme for find tests',
        thumbnailUrl: 'https://spaces.example.com/find-test-thumb.png',
        themeConfig,
        creatorId: testUserId,
        themeDefinition: {
          customCss:
            '.find-test-form { background: linear-gradient(45deg, #ff6b35, #f7931e); }',
          settings: { findTest: true },
        },
      };

      const createdTheme =
        await themesRepository.createCustomTheme(customThemeData);
      customThemeId = createdTheme.id;
      createdThemeIds.push(customThemeId);
    });

    it('should find custom themes by creator ID', async () => {
      const customThemes = await themesRepository.findCustomThemesByCreator(
        testUserId,
        true
      );

      expect(customThemes).toBeDefined();
      expect(Array.isArray(customThemes)).toBe(true);
      expect(customThemes.length).toBeGreaterThan(0);

      const findTestTheme = customThemes.find(
        (theme) => theme.id === customThemeId
      );
      expect(findTestTheme).toBeDefined();
      expect(findTestTheme!.name).toBe('Find Test Custom Theme');
      expect(findTestTheme!.isCustom).toBe(true);
      expect(findTestTheme!.creatorId).toBe(testUserId);
      expect(findTestTheme!.themeDefinition).toBeDefined();
      expect(findTestTheme!.themeDefinition.settings.findTest).toBe(true);
    });

    it('should return empty array for non-existent creator', async () => {
      const nonExistentUserId = '00000000-0000-0000-0000-000000000000';
      const customThemes = await themesRepository.findCustomThemesByCreator(
        nonExistentUserId,
        true
      );

      expect(customThemes).toBeDefined();
      expect(Array.isArray(customThemes)).toBe(true);
      expect(customThemes.length).toBe(0);
    });
  });

  describe('findPredefinedThemes', () => {
    it('should find predefined themes (excluding custom themes)', async () => {
      const predefinedThemes =
        await themesRepository.findPredefinedThemes(true);

      expect(predefinedThemes).toBeDefined();
      expect(Array.isArray(predefinedThemes)).toBe(true);

      // All returned themes should be predefined (not custom)
      predefinedThemes.forEach((theme) => {
        expect(theme.isCustom).toBe(false);
        expect(theme.creatorId).toBeNull();
        expect(theme.themeDefinition).toBeNull();
      });
    });

    it('should exclude custom themes from predefined themes query', async () => {
      // Create a custom theme first
      const themeConfig: ResponsiveThemeConfig = {
        desktop: {
          primaryColor: '#e74c3c',
          secondaryColor: '#c0392b',
          backgroundColor: '#ffffff',
          textColorPrimary: '#2c3e50',
          textColorSecondary: '#7f8c8d',
          fontFamilyHeading: 'Merriweather',
          fontFamilyBody: 'Open Sans',
          fieldBorderRadius: '6px',
          fieldSpacing: '14px',
          containerBackground: '#fadbd8',
          containerOpacity: 0.85,
          containerPosition: 'center',
        },
      };

      const customThemeData: CreateCustomThemeRequest = {
        name: 'Exclusion Test Custom Theme',
        description: 'Should not appear in predefined themes',
        thumbnailUrl: 'https://spaces.example.com/exclusion-test-thumb.png',
        themeConfig,
        creatorId: testUserId,
        themeDefinition: {
          customCss: '.exclusion-test { color: #e74c3c; }',
          settings: { exclusionTest: true },
        },
      };

      const customTheme =
        await themesRepository.createCustomTheme(customThemeData);
      createdThemeIds.push(customTheme.id);

      // Query predefined themes
      const predefinedThemes =
        await themesRepository.findPredefinedThemes(true);

      // Ensure the custom theme is not included
      const foundCustomTheme = predefinedThemes.find(
        (theme) => theme.id === customTheme.id
      );
      expect(foundCustomTheme).toBeUndefined();
    });
  });

  describe('Database schema validation', () => {
    it('should enforce custom theme requirements constraint', async () => {
      // Try to insert a custom theme without creator_id (should fail)
      const invalidCustomThemeQuery = `
        INSERT INTO form_themes (
          name, thumbnail_url, theme_config, is_custom, creator_id, theme_definition
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `;

      await expect(
        pool.query(invalidCustomThemeQuery, [
          'Invalid Custom Theme',
          'https://example.com/thumb.png',
          JSON.stringify({ desktop: { primaryColor: '#000000' } }),
          true, // is_custom = true
          null, // creator_id = null (should violate constraint)
          JSON.stringify({ test: true }),
        ])
      ).rejects.toThrow(); // Should violate check_custom_theme_requirements constraint
    });

    it('should allow predefined themes without creator_id and theme_definition', async () => {
      const validPredefinedThemeQuery = `
        INSERT INTO form_themes (
          name, thumbnail_url, theme_config, is_custom, creator_id, theme_definition
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;

      const result = await pool.query(validPredefinedThemeQuery, [
        'Test Predefined Theme',
        'https://example.com/predefined-thumb.png',
        JSON.stringify({
          desktop: {
            primaryColor: '#007bff',
            secondaryColor: '#6c757d',
            backgroundColor: '#ffffff',
            textColorPrimary: '#212529',
            textColorSecondary: '#6c757d',
            fontFamilyHeading: 'Roboto',
            fontFamilyBody: 'Open Sans',
            fieldBorderRadius: '4px',
            fieldSpacing: '12px',
            containerBackground: '#f8f9fa',
            containerOpacity: 1.0,
            containerPosition: 'center',
          },
        }),
        false, // is_custom = false
        null, // creator_id = null (allowed for predefined themes)
        null, // theme_definition = null (allowed for predefined themes)
      ]);

      expect(result.rows[0].id).toBeDefined();
      createdThemeIds.push(result.rows[0].id);
    });
  });

  describe('Epic 20-21 backward compatibility', () => {
    it('should maintain existing theme queries without breaking changes', async () => {
      // Test that existing Epic 20-21 queries still work
      const legacyThemeQuery = `
        SELECT
          id, name, description, thumbnail_url, theme_config,
          usage_count, is_active, created_by, created_at, updated_at
        FROM form_themes
        WHERE is_active = true
        ORDER BY usage_count DESC
      `;

      const result = await pool.query(legacyThemeQuery);
      expect(result.rows).toBeDefined();
      expect(Array.isArray(result.rows)).toBe(true);

      // Verify that queries work with both predefined and custom themes
      result.rows.forEach((row) => {
        expect(row.id).toBeDefined();
        expect(row.name).toBeDefined();
        expect(row.theme_config).toBeDefined();
        expect(typeof row.usage_count).toBe('number');
        expect(typeof row.is_active).toBe('boolean');
      });
    });
  });
});
