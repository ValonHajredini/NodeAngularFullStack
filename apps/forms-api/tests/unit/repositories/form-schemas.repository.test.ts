import { FormSchemasRepository } from '../../../src/repositories/form-schemas.repository';
import {
  FormSchema,
  FormFieldType,
  FormSettings,
} from '@nodeangularfullstack/shared';
import { databaseService } from '../../../src/services/database.service';

// Mock database service
jest.mock('../../../src/services/database.service', () => ({
  databaseService: {
    getPool: jest.fn(),
  },
}));

describe('FormSchemasRepository', () => {
  let repository: FormSchemasRepository;
  let mockClient: any;
  let mockPool: any;

  const mockSettings: FormSettings = {
    layout: { columns: 2, spacing: 'medium' },
    submission: {
      showSuccessMessage: true,
      successMessage: 'Thank you!',
      allowMultipleSubmissions: false,
    },
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

    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
    };

    (databaseService.getPool as jest.Mock).mockReturnValue(mockPool);

    repository = new FormSchemasRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSchema', () => {
    it('should create a form schema successfully', async () => {
      mockClient.query.mockResolvedValue({ rows: [mockSchema] });

      const schemaData = {
        formId: 'form-123',
        version: 1,
        fields: mockSchema.fields,
        settings: mockSettings,
        isPublished: false,
      };

      const result = await repository.createSchema('form-123', schemaData);

      expect(result).toEqual(mockSchema);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO form_schemas'),
        expect.arrayContaining([
          'form-123',
          1,
          JSON.stringify(mockSchema.fields),
          JSON.stringify(mockSettings),
          false,
        ])
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      const schemaData = {
        formId: 'form-123',
        version: 1,
        fields: mockSchema.fields,
        settings: mockSettings,
        isPublished: false,
      };

      await expect(
        repository.createSchema('form-123', schemaData)
      ).rejects.toThrow('Failed to create form schema');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error when creation returns no rows', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const schemaData = {
        formId: 'form-123',
        version: 1,
        fields: mockSchema.fields,
        settings: mockSettings,
        isPublished: false,
      };

      await expect(
        repository.createSchema('form-123', schemaData)
      ).rejects.toThrow('Failed to create form schema');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findByFormId', () => {
    it('should find all schemas for a form', async () => {
      const mockSchemas = [
        mockSchema,
        { ...mockSchema, id: 'schema-456', version: 2 },
      ];
      mockClient.query.mockResolvedValue({ rows: mockSchemas });

      const result = await repository.findByFormId('form-123');

      expect(result).toEqual(mockSchemas);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE form_id = $1'),
        ['form-123']
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY version DESC'),
        expect.any(Array)
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return empty array when no schemas found', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await repository.findByFormId('form-123');

      expect(result).toEqual([]);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(repository.findByFormId('form-123')).rejects.toThrow(
        'Failed to find schemas by form ID'
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findByToken', () => {
    it('should find schema by valid token', async () => {
      const publishedSchema = { ...mockSchema, isPublished: true };
      mockClient.query.mockResolvedValue({ rows: [publishedSchema] });

      const result = await repository.findByToken('valid-token');

      expect(result).toEqual(publishedSchema);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE render_token = $1'),
        ['valid-token']
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('is_published = true'),
        expect.any(Array)
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return null when token not found', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await repository.findByToken('invalid-token');

      expect(result).toBeNull();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(repository.findByToken('token')).rejects.toThrow(
        'Failed to find schema by token'
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('updateSchema', () => {
    it('should update schema successfully', async () => {
      const updatedFields = [
        ...mockSchema.fields,
        {
          id: 'field-2',
          type: FormFieldType.EMAIL,
          label: 'Email',
          fieldName: 'email',
          required: true,
          order: 1,
        },
      ];
      const updatedSchema = { ...mockSchema, fields: updatedFields };
      mockClient.query.mockResolvedValue({ rows: [updatedSchema] });

      const result = await repository.updateSchema('schema-123', {
        fields: updatedFields,
      });

      expect(result).toEqual(updatedSchema);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE form_schemas'),
        [JSON.stringify(updatedFields), 'schema-123']
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error when no fields to update', async () => {
      await expect(repository.updateSchema('schema-123', {})).rejects.toThrow(
        'No fields to update'
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error when schema not found', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await expect(
        repository.updateSchema('schema-123', { version: 2 })
      ).rejects.toThrow('Form schema not found');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(
        repository.updateSchema('schema-123', { version: 2 })
      ).rejects.toThrow('Failed to update form schema');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('publishSchema', () => {
    it('should publish schema with token', async () => {
      const publishedSchema = {
        ...mockSchema,
        isPublished: true,
        renderToken: 'jwt-token-here',
        expiresAt: new Date('2025-12-31'),
      };
      mockClient.query.mockResolvedValue({ rows: [publishedSchema] });

      const expiresAt = new Date('2025-12-31');
      const result = await repository.publishSchema(
        'schema-123',
        'jwt-token-here',
        expiresAt
      );

      expect(result).toEqual(publishedSchema);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE form_schemas'),
        ['schema-123', 'jwt-token-here', expiresAt]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('is_published = true'),
        expect.any(Array)
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error when schema not found', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await expect(
        repository.publishSchema('schema-123', 'token', new Date('2025-12-31'))
      ).rejects.toThrow('Form schema not found');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(
        repository.publishSchema('schema-123', 'token', new Date('2025-12-31'))
      ).rejects.toThrow('Failed to publish form schema');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('unpublishSchema', () => {
    it('should unpublish schema successfully', async () => {
      const unpublishedSchema = { ...mockSchema, isPublished: false };
      mockClient.query.mockResolvedValue({ rows: [unpublishedSchema] });

      const result = await repository.unpublishSchema('schema-123');

      expect(result).toEqual(unpublishedSchema);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE form_schemas'),
        ['schema-123']
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('is_published = false'),
        expect.any(Array)
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error when schema not found', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await expect(repository.unpublishSchema('schema-123')).rejects.toThrow(
        'Form schema not found'
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(repository.unpublishSchema('schema-123')).rejects.toThrow(
        'Failed to unpublish form schema'
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
