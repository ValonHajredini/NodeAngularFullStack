/**
 * Unit Tests for PreFlightValidator Service
 * Epic 33.1: Export Core Infrastructure - Story 33.1.4
 */

import { PreFlightValidator } from '../../../src/services/pre-flight-validator.service';
import { ToolRegistryRepository } from '../../../src/repositories/tool-registry.repository';
import { FormSchemasRepository } from '../../../src/repositories/form-schemas.repository';
import { FormSubmissionsRepository } from '../../../src/repositories/form-submissions.repository';
import { ThemesRepository } from '../../../src/repositories/themes.repository';
import { ToolRegistryRecord, ToolStatus } from '@nodeangularfullstack/shared';

// Mock repositories
jest.mock('../../../src/repositories/tool-registry.repository');
jest.mock('../../../src/repositories/form-schemas.repository');
jest.mock('../../../src/repositories/form-submissions.repository');
jest.mock('../../../src/repositories/themes.repository');

describe('PreFlightValidator', () => {
  let validator: PreFlightValidator;
  let toolRegistryRepo: jest.Mocked<ToolRegistryRepository>;
  let formSchemasRepo: jest.Mocked<FormSchemasRepository>;
  let formSubmissionsRepo: jest.Mocked<FormSubmissionsRepository>;
  let themesRepo: jest.Mocked<ThemesRepository>;

  // Sample test tool data
  const mockFormTool: ToolRegistryRecord = {
    id: 'tool-uuid-123',
    tool_id: 'tool-form-123',
    name: 'Test Form Builder',
    toolType: 'forms',
    status: ToolStatus.ACTIVE,
    toolMetadata: {
      formSchemaId: 'form-schema-456',
    },
    manifest_json: {
      routes: { primary: '/tools/forms' },
      endpoints: { base: '/api/forms', paths: [] },
    },
    version: '1.0.0',
    route: '/tools/forms',
    api_base: '/api/forms',
    is_exported: false,
    created_at: new Date(),
    updated_at: new Date(),
  } as any;

  const mockThemeTool: ToolRegistryRecord = {
    id: 'tool-uuid-456',
    tool_id: 'tool-theme-123',
    name: 'Test Theme Designer',
    toolType: 'themes',
    status: ToolStatus.ACTIVE,
    toolMetadata: {
      themeId: 'theme-789',
    },
    manifest_json: {
      routes: { primary: '/tools/themes' },
      endpoints: { base: '/api/themes', paths: [] },
    },
    version: '1.0.0',
    route: '/tools/themes',
    api_base: '/api/themes',
    is_exported: false,
    created_at: new Date(),
    updated_at: new Date(),
  } as any;

  beforeEach(() => {
    // Create mock repository instances
    toolRegistryRepo =
      new ToolRegistryRepository() as jest.Mocked<ToolRegistryRepository>;
    formSchemasRepo =
      new FormSchemasRepository() as jest.Mocked<FormSchemasRepository>;
    formSubmissionsRepo =
      new FormSubmissionsRepository() as jest.Mocked<FormSubmissionsRepository>;
    themesRepo = new ThemesRepository() as jest.Mocked<ThemesRepository>;

    // Create validator with mocked dependencies
    validator = new PreFlightValidator(
      toolRegistryRepo,
      formSchemasRepo,
      formSubmissionsRepo,
      themesRepo
    );

    // Set up default environment variables
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.EXPORT_TEMP_DIR = '/tmp/exports-test';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate - Tool Existence', () => {
    it('should pass validation for valid form tool', async () => {
      // Arrange
      toolRegistryRepo.findById.mockResolvedValue(mockFormTool);
      formSchemasRepo.findById.mockResolvedValue({
        formSchemaId: 'form-schema-456',
        fields: [{ fieldId: 'field-1', fieldType: 'text' }],
      } as any);
      formSubmissionsRepo.countByFormSchemaId.mockResolvedValue(5);

      // Act
      const result = await validator.validate('tool-form-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(toolRegistryRepo.findById).toHaveBeenCalledWith('tool-form-123');
    });

    it('should fail validation if tool not found', async () => {
      // Arrange
      toolRegistryRepo.findById.mockResolvedValue(null);

      // Act
      const result = await validator.validate('invalid-tool');

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('not found'),
          field: 'tool_existence',
        })
      );
    });

    it('should add warning if tool status is inactive', async () => {
      // Arrange
      const inactiveTool = { ...mockFormTool, status: 'inactive' };
      toolRegistryRepo.findById.mockResolvedValue(inactiveTool as any);
      formSchemasRepo.findById.mockResolvedValue({
        formSchemaId: 'form-schema-456',
        fields: [{ fieldId: 'field-1' }],
      } as any);

      // Act
      const result = await validator.validate('tool-form-123');

      // Assert
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('inactive'),
          field: 'tool_status',
        })
      );
    });

    it('should fail validation for unsupported tool type', async () => {
      // Arrange
      const unsupportedTool = { ...mockFormTool, toolType: 'unknown' };
      toolRegistryRepo.findById.mockResolvedValue(unsupportedTool as any);

      // Act
      const result = await validator.validate('tool-form-123');

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('not supported'),
          field: 'tool_type',
        })
      );
    });
  });

  describe('validate - Tool Data Completeness', () => {
    it('should fail validation if tool name is empty', async () => {
      // Arrange
      const toolWithoutName = { ...mockFormTool, name: '' };
      toolRegistryRepo.findById.mockResolvedValue(toolWithoutName as any);
      formSchemasRepo.findById.mockResolvedValue({
        formSchemaId: 'form-schema-456',
        fields: [{ fieldId: 'field-1' }],
      } as any);
      formSubmissionsRepo.countByFormSchemaId.mockResolvedValue(0);

      // Act
      const result = await validator.validate('tool-form-123');

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('name is missing'),
          field: 'tool_name',
        })
      );
    });

    it('should fail validation if metadata is missing', async () => {
      // Arrange
      const toolWithoutMetadata = { ...mockFormTool, toolMetadata: null };
      toolRegistryRepo.findById.mockResolvedValue(toolWithoutMetadata as any);

      // Act
      const result = await validator.validate('tool-form-123');

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('metadata is missing'),
          field: 'tool_metadata',
        })
      );
    });

    it('should fail validation if form schema ID is missing', async () => {
      // Arrange
      const toolWithoutFormSchemaId = {
        ...mockFormTool,
        toolMetadata: {},
      };
      toolRegistryRepo.findById.mockResolvedValue(
        toolWithoutFormSchemaId as any
      );

      // Act
      const result = await validator.validate('tool-form-123');

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('Form schema ID is missing'),
          field: 'form_schema_id',
        })
      );
    });

    it('should fail validation if theme ID is missing', async () => {
      // Arrange
      const toolWithoutThemeId = {
        ...mockThemeTool,
        toolMetadata: {},
      };
      toolRegistryRepo.findById.mockResolvedValue(toolWithoutThemeId as any);

      // Act
      const result = await validator.validate('tool-theme-123');

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('Theme ID is missing'),
          field: 'theme_id',
        })
      );
    });
  });

  describe('validate - Database Integrity (Forms)', () => {
    it('should fail validation if form schema not found', async () => {
      // Arrange
      toolRegistryRepo.findById.mockResolvedValue(mockFormTool);
      formSchemasRepo.findById.mockResolvedValue(null);

      // Act
      const result = await validator.validate('tool-form-123');

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('not found in database'),
          field: 'form_schema',
        })
      );
    });

    it('should fail validation if form has no fields', async () => {
      // Arrange
      toolRegistryRepo.findById.mockResolvedValue(mockFormTool);
      formSchemasRepo.findById.mockResolvedValue({
        formSchemaId: 'form-schema-456',
        fields: [],
      } as any);

      // Act
      const result = await validator.validate('tool-form-123');

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('no fields defined'),
          field: 'form_fields',
        })
      );
    });
  });

  describe('validate - Database Integrity (Themes)', () => {
    it('should fail validation if theme not found', async () => {
      // Arrange
      toolRegistryRepo.findById.mockResolvedValue(mockThemeTool);
      themesRepo.findById.mockResolvedValue(null);

      // Act
      const result = await validator.validate('tool-theme-123');

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('not found in database'),
          field: 'theme',
        })
      );
    });

    it('should fail validation if theme config is missing', async () => {
      // Arrange
      toolRegistryRepo.findById.mockResolvedValue(mockThemeTool);
      themesRepo.findById.mockResolvedValue({
        themeId: 'theme-789',
        themeConfig: null,
      } as any);

      // Act
      const result = await validator.validate('tool-theme-123');

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('configuration is missing'),
          field: 'theme_config',
        })
      );
    });

    it('should pass validation for valid theme', async () => {
      // Arrange
      toolRegistryRepo.findById.mockResolvedValue(mockThemeTool);
      themesRepo.findById.mockResolvedValue({
        themeId: 'theme-789',
        themeConfig: { colors: { primary: '#000' } },
      } as any);

      // Act
      const result = await validator.validate('tool-theme-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validate - Configuration', () => {
    it('should fail validation if DATABASE_URL is not set', async () => {
      // Arrange
      delete process.env.DATABASE_URL;
      toolRegistryRepo.findById.mockResolvedValue(mockFormTool);
      formSchemasRepo.findById.mockResolvedValue({
        formSchemaId: 'form-schema-456',
        fields: [{ fieldId: 'field-1' }],
      } as any);

      // Act
      const result = await validator.validate('tool-form-123');

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('DATABASE_URL'),
          field: 'config_database_url',
        })
      );
    });

    it('should add warning if export timeout is less than 1 minute', async () => {
      // Arrange
      process.env.EXPORT_TIMEOUT_MS = '30000'; // 30 seconds
      toolRegistryRepo.findById.mockResolvedValue(mockFormTool);
      formSchemasRepo.findById.mockResolvedValue({
        formSchemaId: 'form-schema-456',
        fields: [{ fieldId: 'field-1' }],
      } as any);

      // Act
      const result = await validator.validate('tool-form-123');

      // Assert
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('less than 1 minute'),
          field: 'config_timeout',
        })
      );

      // Cleanup
      delete process.env.EXPORT_TIMEOUT_MS;
    });
  });

  describe('validate - Validation Result Structure', () => {
    it('should return validation result with all fields', async () => {
      // Arrange
      toolRegistryRepo.findById.mockResolvedValue(mockFormTool);
      formSchemasRepo.findById.mockResolvedValue({
        formSchemaId: 'form-schema-456',
        fields: [{ fieldId: 'field-1' }],
      } as any);

      // Act
      const result = await validator.validate('tool-form-123');

      // Assert
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('info');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('estimatedDurationMs');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(Array.isArray(result.info)).toBe(true);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should set success to false when errors exist', async () => {
      // Arrange
      toolRegistryRepo.findById.mockResolvedValue(null);

      // Act
      const result = await validator.validate('invalid-tool');

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should set success to true when only warnings exist', async () => {
      // Arrange
      const inactiveTool = { ...mockFormTool, status: 'inactive' };
      toolRegistryRepo.findById.mockResolvedValue(inactiveTool as any);
      formSchemasRepo.findById.mockResolvedValue({
        formSchemaId: 'form-schema-456',
        fields: [{ fieldId: 'field-1' }],
      } as any);

      // Act
      const result = await validator.validate('tool-form-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should calculate estimated duration', async () => {
      // Arrange
      toolRegistryRepo.findById.mockResolvedValue(mockFormTool);
      formSchemasRepo.findById.mockResolvedValue({
        formSchemaId: 'form-schema-456',
        fields: [{ fieldId: 'field-1' }],
      } as any);

      // Act
      const result = await validator.validate('tool-form-123');

      // Assert
      expect(result.estimatedDurationMs).toBeGreaterThan(0);
      expect(typeof result.estimatedDurationMs).toBe('number');
    });
  });

  describe('validate - Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      // Arrange
      toolRegistryRepo.findById.mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act
      const result = await validator.validate('tool-form-123');

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('Failed to validate tool existence'),
          field: 'tool_existence',
        })
      );
    });

    it('should return validation result even on unexpected errors', async () => {
      // Arrange
      toolRegistryRepo.findById.mockResolvedValue(mockFormTool);
      formSchemasRepo.findById.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      // Act
      const result = await validator.validate('tool-form-123');

      // Assert
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('errors');
      expect(result.success).toBe(false);
    });
  });
});
