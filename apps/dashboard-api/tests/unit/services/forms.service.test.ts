import { FormsService, ApiError } from '../../../src/services/forms.service';
import { formsRepository } from '../../../src/repositories/forms.repository';
import { formSchemasRepository } from '../../../src/repositories/form-schemas.repository';
import {
  FormMetadata,
  FormSchema,
  FormFieldType,
  FormStatus,
  FormSettings,
} from '@nodeangularfullstack/shared';
import * as jwt from 'jsonwebtoken';

// Mock repositories
jest.mock('../../../src/repositories/forms.repository');
jest.mock('../../../src/repositories/form-schemas.repository');
jest.mock('jsonwebtoken');

describe('FormsService', () => {
  let service: FormsService;
  let mockFormsRepo: jest.Mocked<typeof formsRepository>;
  let mockFormSchemasRepo: jest.Mocked<typeof formSchemasRepository>;

  const mockSettings: FormSettings = {
    layout: { columns: 2, spacing: 'medium' },
    submission: {
      showSuccessMessage: true,
      successMessage: 'Thank you!',
      allowMultipleSubmissions: false,
    },
  };

  const mockForm: FormMetadata = {
    id: 'form-123',
    userId: 'user-123',
    tenantId: 'tenant-123',
    title: 'Test Form',
    description: 'Test description',
    status: FormStatus.DRAFT,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const mockSchema: FormSchema = {
    id: 'schema-123',
    formId: 'form-123',
    version: 1,
    fields: [
      {
        id: 'field-1',
        type: FormFieldType.TEXT,
        label: 'Name',
        fieldName: 'name',
        required: true,
        order: 0,
      },
    ],
    settings: mockSettings,
    isPublished: false,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockFormsRepo = formsRepository as jest.Mocked<typeof formsRepository>;
    mockFormSchemasRepo = formSchemasRepository as jest.Mocked<
      typeof formSchemasRepository
    >;

    service = new FormsService(mockFormsRepo, mockFormSchemasRepo);

    // Set default environment variable
    process.env.FORM_RENDER_TOKEN_SECRET = 'test-secret-key';

    mockFormSchemasRepo.createSchema = jest.fn().mockResolvedValue(mockSchema);
    mockFormSchemasRepo.findByFormId = jest
      .fn()
      .mockResolvedValue([mockSchema]);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.FORM_RENDER_TOKEN_SECRET;
  });

  describe('createForm', () => {
    it('should create a form successfully', async () => {
      mockFormsRepo.create = jest.fn().mockResolvedValue(mockForm);

      const result = await service.createForm('user-123', 'tenant-123', {
        title: 'Test Form',
        description: 'Test description',
      });

      expect(result).toEqual({ ...mockForm, schema: undefined });
      expect(mockFormsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          tenantId: 'tenant-123',
          title: 'Test Form',
          description: 'Test description',
          status: FormStatus.DRAFT,
        }),
        expect.objectContaining({ id: 'tenant-123' })
      );
    });

    it('should create form without tenant context', async () => {
      const formWithoutTenant = { ...mockForm, tenantId: undefined };
      mockFormsRepo.create = jest.fn().mockResolvedValue(formWithoutTenant);

      const result = await service.createForm('user-123', undefined, {
        title: 'Test Form',
      });

      expect(result).toEqual({ ...formWithoutTenant, schema: undefined });
      expect(mockFormsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          tenantId: undefined,
        }),
        undefined
      );
    });

    it('should throw ApiError when title is missing', async () => {
      await expect(
        service.createForm('user-123', 'tenant-123', {})
      ).rejects.toThrow(ApiError);

      await expect(
        service.createForm('user-123', 'tenant-123', {})
      ).rejects.toThrow('Form title is required');
    });

    it('should handle repository errors', async () => {
      mockFormsRepo.create = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      await expect(
        service.createForm('user-123', 'tenant-123', { title: 'Test' })
      ).rejects.toThrow('Failed to create form');
    });
  });

  describe('publishForm', () => {
    beforeEach(() => {
      mockFormsRepo.findFormById = jest.fn().mockResolvedValue(mockForm);
      mockFormSchemasRepo.findByFormId = jest
        .fn()
        .mockResolvedValue([mockSchema]);
      mockFormSchemasRepo.publishSchema = jest
        .fn()
        .mockResolvedValue({ ...mockSchema, isPublished: true });
      mockFormsRepo.update = jest
        .fn()
        .mockResolvedValue({ ...mockForm, status: FormStatus.PUBLISHED });
      (jwt.sign as jest.Mock).mockReturnValue('generated-jwt-token');
    });

    it('should publish form successfully', async () => {
      const result = await service.publishForm('form-123', 'user-123', 30);

      expect(result.form.status).toBe(FormStatus.PUBLISHED);
      expect(result.schema.isPublished).toBe(true);
      expect(result.renderUrl).toContain('/forms/render/');
      expect(mockFormSchemasRepo.publishSchema).toHaveBeenCalled();
      expect(mockFormsRepo.update).toHaveBeenCalledWith('form-123', {
        status: FormStatus.PUBLISHED,
      });
    });

    it('should throw error when form not found', async () => {
      mockFormsRepo.findFormById = jest.fn().mockResolvedValue(null);

      await expect(
        service.publishForm('form-123', 'user-123', 30)
      ).rejects.toThrow('Form not found');
    });

    it('should throw error when user is not owner', async () => {
      await expect(
        service.publishForm('form-123', 'wrong-user', 30)
      ).rejects.toThrow('You do not have permission to publish this form');
    });

    it('should throw error when form has no schemas', async () => {
      mockFormSchemasRepo.findByFormId = jest.fn().mockResolvedValue([]);

      await expect(
        service.publishForm('form-123', 'user-123', 30)
      ).rejects.toThrow('Form has no schema versions');
    });

    it('should throw error when schema validation fails', async () => {
      const invalidSchema = { ...mockSchema, fields: [] };
      mockFormSchemasRepo.findByFormId = jest
        .fn()
        .mockResolvedValue([invalidSchema]);

      await expect(
        service.publishForm('form-123', 'user-123', 30)
      ).rejects.toThrow('Schema validation failed');
    });
  });

  describe('validateFormSchema', () => {
    it('should validate a valid schema', async () => {
      const result = await service.validateFormSchema(mockSchema);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect missing fields', async () => {
      const schemaWithoutFields = { ...mockSchema, fields: [] };

      const result = await service.validateFormSchema(schemaWithoutFields);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Schema must have at least one field');
    });

    it('should detect duplicate field names', async () => {
      const schemaWithDuplicates = {
        ...mockSchema,
        fields: [
          {
            id: 'field-1',
            type: FormFieldType.TEXT,
            label: 'Name',
            fieldName: 'name',
            required: true,
            order: 0,
          },
          {
            id: 'field-2',
            type: FormFieldType.EMAIL,
            label: 'Email',
            fieldName: 'name', // Duplicate!
            required: true,
            order: 1,
          },
        ],
      };

      const result = await service.validateFormSchema(schemaWithDuplicates);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Duplicate field name found: name');
    });

    it('should detect invalid regex patterns', async () => {
      const schemaWithInvalidRegex = {
        ...mockSchema,
        fields: [
          {
            id: 'field-1',
            type: FormFieldType.TEXT,
            label: 'Name',
            fieldName: 'name',
            required: true,
            order: 0,
            validation: {
              pattern: '[invalid(regex',
            },
          },
        ],
      };

      const result = await service.validateFormSchema(schemaWithInvalidRegex);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('invalid regex pattern');
    });

    it('should detect missing required field properties', async () => {
      const schemaWithMissingProps = {
        ...mockSchema,
        fields: [
          {
            id: 'field-1',
            type: FormFieldType.TEXT,
            label: '', // Missing
            fieldName: '', // Missing
            required: true,
            order: 0,
          },
        ],
      };

      const result = await service.validateFormSchema(schemaWithMissingProps);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Field field-1 is missing a label');
      expect(result.errors).toContain('Field field-1 is missing a fieldName');
    });

    it('should detect missing settings', async () => {
      const schemaWithoutSettings = {
        ...mockSchema,
        settings: undefined as any,
      };

      const result = await service.validateFormSchema(schemaWithoutSettings);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Schema must have settings defined');
    });

    it('should validate regex patterns correctly', async () => {
      const schemaWithValidRegex = {
        ...mockSchema,
        fields: [
          {
            id: 'field-1',
            type: FormFieldType.TEXT,
            label: 'Name',
            fieldName: 'name',
            required: true,
            order: 0,
            validation: {
              pattern: '^[A-Za-z ]+$',
            },
          },
        ],
      };

      const result = await service.validateFormSchema(schemaWithValidRegex);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('generateRenderToken', () => {
    it('should generate JWT token successfully', () => {
      const expiresAt = new Date('2025-12-31');
      (jwt.sign as jest.Mock).mockReturnValue('generated-jwt-token');

      const token = service.generateRenderToken('schema-123', expiresAt);

      expect(token).toBe('generated-jwt-token');
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          formSchemaId: 'schema-123',
          expiresAt: expiresAt.toISOString(),
          iss: 'form-builder',
          iat: expect.any(Number),
        }),
        'test-secret-key',
        expect.objectContaining({
          expiresIn: expect.any(Number),
        })
      );
    });

    it('should throw error when secret not configured', () => {
      delete process.env.FORM_RENDER_TOKEN_SECRET;

      expect(() =>
        service.generateRenderToken('schema-123', new Date('2025-12-31'))
      ).toThrow('FORM_RENDER_TOKEN_SECRET is not configured');
    });

    it('should handle JWT signing errors', () => {
      (jwt.sign as jest.Mock).mockImplementation(() => {
        throw new Error('JWT signing failed');
      });

      expect(() =>
        service.generateRenderToken('schema-123', new Date('2025-12-31'))
      ).toThrow('Failed to generate render token');
    });
  });
});
