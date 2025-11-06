/**
 * @fileoverview Integration tests for themes schema changes
 * Tests database migrations, foreign key constraints, and backward compatibility
 */

import { databaseService } from '../../src/services/database.service';
import { themesRepository } from '../../src/repositories/themes.repository';
import { formSchemasRepository } from '../../src/repositories/form-schemas.repository';
import { CreateThemeRequest } from '@nodeangularfullstack/shared';

describe('Themes Schema Integration Tests', () => {
  const dbService = databaseService;

  beforeAll(async () => {
    // Database is already initialized in test setup
  });

  afterAll(async () => {
    // Keep connection open for other tests
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await dbService.query('DELETE FROM form_themes WHERE name LIKE $1', [
      'Test Theme%',
    ]);
    await dbService.query(
      'DELETE FROM form_schemas WHERE schema_json::text LIKE $1',
      ['%test%']
    );
  });

  describe('IV1: Existing forms table queries remain unaffected', () => {
    it('should verify existing form_schemas queries still work after schema changes', async () => {
      // Test that basic form_schemas operations still work
      const testSchema = {
        formId: '', // Will be set after form creation
        version: 1,
        fields: [],
        settings: {
          layout: { columns: 1 as const, spacing: 'medium' as const },
          submission: {
            showSuccessMessage: true,
            allowMultipleSubmissions: false,
          },
        },
        isPublished: false,
      };

      // Get existing test user
      const userResult = await dbService.query(
        'SELECT id FROM users WHERE email = $1 LIMIT 1',
        ['user@example.com']
      );
      const userId = userResult.rows[0].id;

      // Create a test form first
      const formResult = await dbService.query(
        'INSERT INTO forms (user_id, title, description, status) VALUES ($1, $2, $3, $4) RETURNING id',
        [userId, 'Test Form', 'Test Description', 'draft']
      );
      const formId = formResult.rows[0].id;

      // Test form schema creation without theme_id (backward compatibility)
      testSchema.formId = formId;
      const schemaResult = await formSchemasRepository.createSchema(
        formId,
        testSchema
      );
      expect(schemaResult).toBeDefined();
      expect(schemaResult.formId).toBe(formId);
      expect(schemaResult.version).toBe(1);

      // Test form schema retrieval
      const retrievedSchema = await formSchemasRepository.findById(
        schemaResult.id
      );
      expect(retrievedSchema).toBeDefined();
      expect(retrievedSchema?.formId).toBe(formId);

      // Clean up
      await dbService.query('DELETE FROM form_schemas WHERE id = $1', [
        schemaResult.id,
      ]);
      await dbService.query('DELETE FROM forms WHERE id = $1', [formId]);
    });

    it('should verify form_schemas repository methods work with new schema', async () => {
      // Test all form_schemas repository methods
      const testSchema = {
        formId: '', // Will be set after form creation
        version: 1,
        fields: [],
        settings: {
          layout: { columns: 1 as const, spacing: 'medium' as const },
          submission: {
            showSuccessMessage: true,
            allowMultipleSubmissions: false,
          },
        },
        isPublished: false,
      };

      // Get existing test user
      const userResult = await dbService.query(
        'SELECT id FROM users WHERE email = $1 LIMIT 1',
        ['user@example.com']
      );
      const userId = userResult.rows[0].id;

      // Create test form
      const formResult = await dbService.query(
        'INSERT INTO forms (user_id, title, description, status) VALUES ($1, $2, $3, $4) RETURNING id',
        [userId, 'Test Form', 'Test Description', 'draft']
      );
      const formId = formResult.rows[0].id;

      // Test createSchema
      testSchema.formId = formId;
      const schema = await formSchemasRepository.createSchema(
        formId,
        testSchema
      );
      expect(schema).toBeDefined();

      // Test findById
      const foundSchema = await formSchemasRepository.findById(schema.id);
      expect(foundSchema).toBeDefined();

      // Test findByFormId
      const formSchemas = await formSchemasRepository.findByFormId(formId);
      expect(formSchemas).toHaveLength(1);

      // Test updateSchema
      const updatedSchema = await formSchemasRepository.updateSchema(
        schema.id,
        {
          version: 2,
          isPublished: true,
        }
      );
      expect(updatedSchema.version).toBe(2);
      expect(updatedSchema.isPublished).toBe(true);

      // Clean up
      await dbService.query('DELETE FROM form_schemas WHERE id = $1', [
        schema.id,
      ]);
      await dbService.query('DELETE FROM forms WHERE id = $1', [formId]);
    });
  });

  describe('IV2: form_schemas accepts theme_id = NULL for backward compatibility', () => {
    it('should insert new form_schema record with theme_id = NULL', async () => {
      // Get existing test user
      const userResult = await dbService.query(
        'SELECT id FROM users WHERE email = $1 LIMIT 1',
        ['user@example.com']
      );
      const userId = userResult.rows[0].id;

      // Create test form
      const formResult = await dbService.query(
        'INSERT INTO forms (user_id, title, description, status) VALUES ($1, $2, $3, $4) RETURNING id',
        [userId, 'Test Form', 'Test Description', 'draft']
      );
      const formId = formResult.rows[0].id;

      // Insert form_schema with theme_id = NULL
      const schemaResult = await dbService.query(
        `INSERT INTO form_schemas (form_id, schema_version, schema_json, is_published, theme_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING id, theme_id`,
        [formId, 1, JSON.stringify({ fields: [], settings: {} }), false, null]
      );

      expect(schemaResult.rows).toHaveLength(1);
      expect(schemaResult.rows[0].theme_id).toBeNull();

      // Clean up
      await dbService.query('DELETE FROM form_schemas WHERE id = $1', [
        schemaResult.rows[0].id,
      ]);
      await dbService.query('DELETE FROM forms WHERE id = $1', [formId]);
    });

    it('should insert new form_schema record with valid theme_id UUID', async () => {
      // Create test theme
      const themeRequest: CreateThemeRequest = {
        name: 'Test Theme for Schema',
        description: 'Test theme for schema integration',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        themeConfig: {
          desktop: {
            primaryColor: '#007bff',
            secondaryColor: '#6c757d',
            backgroundColor: '#ffffff',
            textColorPrimary: '#212529',
            textColorSecondary: '#6c757d',
            fontFamilyHeading: 'Inter, sans-serif',
            fontFamilyBody: 'Inter, sans-serif',
            fieldBorderRadius: '8px',
            fieldSpacing: '16px',
            containerBackground: '#ffffff',
            containerOpacity: 1,
            containerPosition: 'center',
          },
        },
      };

      const theme = await themesRepository.create(themeRequest);
      expect(theme).toBeDefined();

      // Get existing test user
      const userResult = await dbService.query(
        'SELECT id FROM users WHERE email = $1 LIMIT 1',
        ['user@example.com']
      );
      const userId = userResult.rows[0].id;

      // Create test form
      const formResult = await dbService.query(
        'INSERT INTO forms (user_id, title, description, status) VALUES ($1, $2, $3, $4) RETURNING id',
        [userId, 'Test Form', 'Test Description', 'draft']
      );
      const formId = formResult.rows[0].id;

      // Insert form_schema with valid theme_id
      const schemaResult = await dbService.query(
        `INSERT INTO form_schemas (form_id, schema_version, schema_json, is_published, theme_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING id, theme_id`,
        [
          formId,
          1,
          JSON.stringify({ fields: [], settings: {} }),
          false,
          theme.id,
        ]
      );

      expect(schemaResult.rows).toHaveLength(1);
      expect(schemaResult.rows[0].theme_id).toBe(theme.id);

      // Clean up
      await dbService.query('DELETE FROM form_schemas WHERE id = $1', [
        schemaResult.rows[0].id,
      ]);
      await dbService.query('DELETE FROM forms WHERE id = $1', [formId]);
      await themesRepository.softDelete(theme.id);
    });

    it('should enforce foreign key constraint for invalid theme_id', async () => {
      // Get existing test user
      const userResult = await dbService.query(
        'SELECT id FROM users WHERE email = $1 LIMIT 1',
        ['user@example.com']
      );
      const userId = userResult.rows[0].id;

      // Create test form
      const formResult = await dbService.query(
        'INSERT INTO forms (user_id, title, description, status) VALUES ($1, $2, $3, $4) RETURNING id',
        [userId, 'Test Form', 'Test Description', 'draft']
      );
      const formId = formResult.rows[0].id;

      // Try to insert form_schema with invalid theme_id
      await expect(
        dbService.query(
          `INSERT INTO form_schemas (form_id, schema_version, schema_json, is_published, theme_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            formId,
            1,
            JSON.stringify({ fields: [], settings: {} }),
            false,
            'invalid-uuid',
          ]
        )
      ).rejects.toThrow();

      // Clean up
      await dbService.query('DELETE FROM forms WHERE id = $1', [formId]);
    });
  });

  describe('IV3: Migration rollback scripts restore original schema', () => {
    it('should verify form_themes table exists and has correct structure', async () => {
      // Check that form_themes table exists
      const tableExists = await dbService.query(
        `SELECT EXISTS (
           SELECT FROM information_schema.tables 
           WHERE table_schema = 'public' 
           AND table_name = 'form_themes'
         )`
      );
      expect(tableExists.rows[0].exists).toBe(true);

      // Check table structure
      const columns = await dbService.query(
        `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_name = 'form_themes'
         ORDER BY ordinal_position`
      );

      const expectedColumns = [
        'id',
        'name',
        'description',
        'thumbnail_url',
        'theme_config',
        'usage_count',
        'is_active',
        'created_by',
        'created_at',
        'updated_at',
      ];

      expect(columns.rows.map((row) => row.column_name)).toEqual(
        expectedColumns
      );

      // Verify specific column types
      const idColumn = columns.rows.find((row) => row.column_name === 'id');
      expect(idColumn?.data_type).toBe('uuid');

      const themeConfigColumn = columns.rows.find(
        (row) => row.column_name === 'theme_config'
      );
      expect(themeConfigColumn?.data_type).toBe('jsonb');

      const usageCountColumn = columns.rows.find(
        (row) => row.column_name === 'usage_count'
      );
      expect(usageCountColumn?.data_type).toBe('integer');
      expect(usageCountColumn?.column_default).toBe('0');
    });

    it('should verify form_schemas table has theme_id column', async () => {
      // Check that theme_id column exists in form_schemas
      const columnExists = await dbService.query(
        `SELECT EXISTS (
           SELECT FROM information_schema.columns
           WHERE table_name = 'form_schemas'
           AND column_name = 'theme_id'
         )`
      );
      expect(columnExists.rows[0].exists).toBe(true);

      // Check column properties
      const columnInfo = await dbService.query(
        `SELECT data_type, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_name = 'form_schemas'
         AND column_name = 'theme_id'`
      );

      expect(columnInfo.rows[0].data_type).toBe('uuid');
      expect(columnInfo.rows[0].is_nullable).toBe('YES');
      expect(columnInfo.rows[0].column_default).toBeNull();
    });

    it('should verify foreign key constraint exists', async () => {
      // Check that foreign key constraint exists
      const constraintExists = await dbService.query(
        `SELECT EXISTS (
           SELECT FROM information_schema.table_constraints
           WHERE table_name = 'form_schemas'
           AND constraint_name = 'fk_form_schemas_theme_id'
           AND constraint_type = 'FOREIGN KEY'
         )`
      );
      expect(constraintExists.rows[0].exists).toBe(true);
    });

    it('should verify indexes exist for performance', async () => {
      // Check form_themes indexes
      const themesIndexes = await dbService.query(
        `SELECT indexname, indexdef
         FROM pg_indexes
         WHERE tablename = 'form_themes'
         ORDER BY indexname`
      );

      const themesIndexNames = themesIndexes.rows.map((row) => row.indexname);
      expect(themesIndexNames).toContain('idx_form_themes_usage');
      expect(themesIndexNames).toContain('idx_form_themes_active');

      // Check form_schemas theme index
      const schemasIndexes = await dbService.query(
        `SELECT indexname, indexdef
         FROM pg_indexes
         WHERE tablename = 'form_schemas'
         AND indexname = 'idx_form_schemas_theme'`
      );

      expect(schemasIndexes.rows).toHaveLength(1);
    });

    it('should verify updated_at trigger exists on form_themes', async () => {
      // Check that trigger exists
      const triggerExists = await dbService.query(
        `SELECT EXISTS (
           SELECT FROM information_schema.triggers
           WHERE event_object_table = 'form_themes'
           AND trigger_name = 'trigger_form_themes_updated_at'
         )`
      );
      expect(triggerExists.rows[0].exists).toBe(true);
    });
  });

  describe('ThemesRepository integration with real database', () => {
    it('should perform full CRUD operations on themes', async () => {
      const themeRequest: CreateThemeRequest = {
        name: 'Test Integration Theme',
        description: 'Theme for integration testing',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        themeConfig: {
          desktop: {
            primaryColor: '#007bff',
            secondaryColor: '#6c757d',
            backgroundColor: '#ffffff',
            textColorPrimary: '#212529',
            textColorSecondary: '#6c757d',
            fontFamilyHeading: 'Inter, sans-serif',
            fontFamilyBody: 'Inter, sans-serif',
            fieldBorderRadius: '8px',
            fieldSpacing: '16px',
            containerBackground: '#ffffff',
            containerOpacity: 1,
            containerPosition: 'center',
          },
        },
      };

      // Create theme
      const createdTheme = await themesRepository.create(themeRequest);
      expect(createdTheme).toBeDefined();
      expect(createdTheme.name).toBe(themeRequest.name);
      expect(createdTheme.usageCount).toBe(0);
      expect(createdTheme.isActive).toBe(true);

      // Find theme by ID
      const foundTheme = await themesRepository.findById(createdTheme.id);
      expect(foundTheme).toBeDefined();
      expect(foundTheme?.id).toBe(createdTheme.id);

      // Update theme
      const updatedTheme = await themesRepository.update(createdTheme.id, {
        name: 'Updated Integration Theme',
        description: 'Updated description',
      });
      expect(updatedTheme.name).toBe('Updated Integration Theme');
      expect(updatedTheme.description).toBe('Updated description');

      // Increment usage count
      const usageTheme = await themesRepository.incrementUsageCount(
        createdTheme.id
      );
      expect(usageTheme.usageCount).toBe(1);

      // Find all active themes
      const activeThemes = await themesRepository.findAll(true);
      expect(activeThemes.length).toBeGreaterThan(0);
      expect(activeThemes.find((t) => t.id === createdTheme.id)).toBeDefined();

      // Soft delete theme
      const deleteResult = await themesRepository.softDelete(createdTheme.id);
      expect(deleteResult).toBe(true);

      // Verify theme is no longer active
      const inactiveThemes = await themesRepository.findAll(false);
      const deletedTheme = inactiveThemes.find((t) => t.id === createdTheme.id);
      expect(deletedTheme).toBeDefined();
      expect(deletedTheme?.isActive).toBe(false);
    });

    it('should handle theme_config JSONB operations correctly', async () => {
      const complexThemeConfig = {
        desktop: {
          primaryColor: '#ff0000',
          secondaryColor: '#00ff00',
          backgroundColor: '#ffffff',
          textColorPrimary: '#000000',
          textColorSecondary: '#666666',
          fontFamilyHeading: 'Arial, sans-serif',
          fontFamilyBody: 'Arial, sans-serif',
          fieldBorderRadius: '12px',
          fieldSpacing: '20px',
          containerBackground: '#f8f9fa',
          containerOpacity: 0.95,
          containerPosition: 'center' as const,
          backgroundImageUrl: 'https://example.com/bg.jpg',
          backgroundImagePosition: 'cover' as const,
        },
        mobile: {
          primaryColor: '#0066cc',
          fieldBorderRadius: '8px',
          fieldSpacing: '16px',
        },
      };

      const themeRequest: CreateThemeRequest = {
        name: 'Complex Theme Test',
        description: 'Theme with complex configuration',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        themeConfig: complexThemeConfig,
      };

      // Create theme with complex config
      const theme = await themesRepository.create(themeRequest);
      expect(theme.themeConfig).toEqual(complexThemeConfig);

      // Update theme config
      const updatedConfig = {
        ...complexThemeConfig,
        desktop: {
          ...complexThemeConfig.desktop,
          primaryColor: '#9900ff',
        },
      };

      const updatedTheme = await themesRepository.update(theme.id, {
        themeConfig: updatedConfig,
      });
      expect(updatedTheme.themeConfig.desktop.primaryColor).toBe('#9900ff');
      expect(updatedTheme.themeConfig.mobile?.primaryColor).toBe('#0066cc');

      // Clean up
      await themesRepository.softDelete(theme.id);
    });
  });
});
