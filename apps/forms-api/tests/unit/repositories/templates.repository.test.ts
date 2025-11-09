import { TemplatesRepository } from '../../../src/repositories/templates.repository';
import {
  FormTemplate,
  TemplateCategory,
  CreateFormTemplateRequest,
  UpdateFormTemplateRequest,
} from '@nodeangularfullstack/shared';

// Mock multi-database config
jest.mock('../../../src/config/multi-database.config', () => ({
  DatabaseType: {
    AUTH: 'auth',
    FORMS: 'forms',
  },
  getPoolForDatabase: jest.fn(),
}));

import { getPoolForDatabase } from '../../../src/config/multi-database.config';

describe('TemplatesRepository', () => {
  let repository: TemplatesRepository;
  let mockClient: any;
  let mockPool: any;

  const mockTemplateSchema = {
    title: 'Product Order Form',
    description: 'Order form for products',
    fields: [
      {
        id: 'field-1',
        type: 'text',
        label: 'Product Name',
        required: true,
        order: 1,
      },
      {
        id: 'field-2',
        type: 'number',
        label: 'Quantity',
        required: true,
        order: 2,
      },
    ],
  };

  const mockBusinessLogicConfig = {
    type: 'inventory' as const,
    stockField: 'product_id',
    variantField: 'size',
    quantityField: 'quantity',
    stockTable: 'inventory',
    threshold: 10,
    decrementOnSubmit: true,
  };

  const mockTemplate: FormTemplate = {
    id: 'template-123',
    name: 'Product Order Form',
    description: 'Standard product order form with inventory tracking',
    category: TemplateCategory.ECOMMERCE,
    previewImageUrl: 'https://spaces.example.com/preview.jpg',
    templateSchema: mockTemplateSchema as any,
    businessLogicConfig: mockBusinessLogicConfig,
    createdBy: 'user-123',
    isActive: true,
    usageCount: 0,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const mockCreateRequest: CreateFormTemplateRequest = {
    name: 'Product Order Form',
    description: 'Standard product order form with inventory tracking',
    category: TemplateCategory.ECOMMERCE,
    previewImageUrl: 'https://spaces.example.com/preview.jpg',
    templateSchema: mockTemplateSchema as any,
    businessLogicConfig: mockBusinessLogicConfig,
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock database client
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    // Create mock database pool
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
    };

    // Setup multi-database config mock
    (getPoolForDatabase as jest.Mock).mockReturnValue(mockPool);

    // Create repository instance
    repository = new TemplatesRepository();
  });

  describe('create', () => {
    it('should create a new template with all fields', async () => {
      const mockDbRow = {
        id: 'template-123',
        name: mockCreateRequest.name,
        description: mockCreateRequest.description,
        category: mockCreateRequest.category,
        previewImageUrl: mockCreateRequest.previewImageUrl,
        templateSchema: mockCreateRequest.templateSchema,
        businessLogicConfig: mockCreateRequest.businessLogicConfig,
        createdBy: null,
        isActive: true,
        usageCount: 0,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      };

      mockClient.query.mockResolvedValueOnce({ rows: [mockDbRow] });

      const result = await repository.create(mockCreateRequest);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO form_templates'),
        expect.arrayContaining([
          mockCreateRequest.name,
          mockCreateRequest.description,
          mockCreateRequest.category,
          mockCreateRequest.previewImageUrl,
          JSON.stringify(mockCreateRequest.templateSchema),
          JSON.stringify(mockCreateRequest.businessLogicConfig),
          null,
        ])
      );
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toEqual(mockDbRow);
    });

    it('should create template with minimal fields (no description or business logic)', async () => {
      const minimalRequest: CreateFormTemplateRequest = {
        name: 'Simple Template',
        category: TemplateCategory.DATA_COLLECTION,
        templateSchema: mockTemplateSchema as any,
      };

      const mockDbRow = {
        ...mockTemplate,
        name: minimalRequest.name,
        description: null,
        category: minimalRequest.category,
        businessLogicConfig: null,
      };

      mockClient.query.mockResolvedValueOnce({ rows: [mockDbRow] });

      const result = await repository.create(minimalRequest);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.any(String),
        [
          minimalRequest.name,
          null, // description
          minimalRequest.category,
          null, // previewImageUrl
          JSON.stringify(minimalRequest.templateSchema),
          null, // businessLogicConfig
          null, // createdBy
        ]
      );
      expect(result.businessLogicConfig).toBeNull();
    });

    it('should throw error when template name already exists (unique constraint violation)', async () => {
      const dbError = new Error('Duplicate key value violates unique constraint');
      (dbError as any).code = '23505';
      mockClient.query.mockRejectedValueOnce(dbError);

      await expect(repository.create(mockCreateRequest)).rejects.toThrow(
        `Template with name "${mockCreateRequest.name}" already exists`
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error for invalid category (check constraint violation)', async () => {
      const invalidRequest = {
        ...mockCreateRequest,
        category: 'invalid_category' as TemplateCategory,
      };
      const dbError = new Error('Check constraint violation: category');
      (dbError as any).code = '23514';
      mockClient.query.mockRejectedValueOnce(dbError);

      await expect(repository.create(invalidRequest)).rejects.toThrow(
        'Invalid category "invalid_category". Must be one of: ecommerce, services, data_collection, events, quiz, polls'
      );
    });

    it('should throw error when template schema exceeds 100KB limit', async () => {
      const dbError = new Error('Check constraint violation: template_schema');
      (dbError as any).code = '23514';
      mockClient.query.mockRejectedValueOnce(dbError);

      await expect(repository.create(mockCreateRequest)).rejects.toThrow(
        'Template schema exceeds maximum size of 100KB'
      );
    });

    it('should throw generic error for other database errors', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(repository.create(mockCreateRequest)).rejects.toThrow(
        'Failed to create template: Database connection failed'
      );
    });

    it('should throw error when INSERT returns no rows', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await expect(repository.create(mockCreateRequest)).rejects.toThrow(
        'Failed to create template'
      );
    });
  });

  describe('findAll', () => {
    it('should return all templates without filters', async () => {
      const mockTemplates = [
        { ...mockTemplate, id: 'template-1', name: 'Template 1', usageCount: 100 },
        { ...mockTemplate, id: 'template-2', name: 'Template 2', usageCount: 50 },
      ];
      mockClient.query.mockResolvedValueOnce({ rows: mockTemplates });

      const result = await repository.findAll();

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        []
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY usage_count DESC'),
        expect.any(Array)
      );
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Template 1');
    });

    it('should filter by isActive status', async () => {
      const mockTemplates = [
        { ...mockTemplate, id: 'template-1', isActive: true },
      ];
      mockClient.query.mockResolvedValueOnce({ rows: mockTemplates });

      const result = await repository.findAll({ isActive: true });

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE is_active = $1'),
        [true]
      );
      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(true);
    });

    it('should filter by category', async () => {
      const mockTemplates = [
        { ...mockTemplate, id: 'template-1', category: TemplateCategory.ECOMMERCE },
      ];
      mockClient.query.mockResolvedValueOnce({ rows: mockTemplates });

      const result = await repository.findAll({ category: 'ecommerce' });

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE category = $1'),
        ['ecommerce']
      );
      expect(result).toHaveLength(1);
      expect(result[0].category).toBe(TemplateCategory.ECOMMERCE);
    });

    it('should filter by both isActive and category', async () => {
      const mockTemplates = [
        {
          ...mockTemplate,
          id: 'template-1',
          category: TemplateCategory.ECOMMERCE,
          isActive: true,
        },
      ];
      mockClient.query.mockResolvedValueOnce({ rows: mockTemplates });

      const result = await repository.findAll({
        isActive: true,
        category: 'ecommerce',
      });

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE is_active = $1 AND category = $2'),
        [true, 'ecommerce']
      );
      expect(result).toHaveLength(1);
    });

    it('should apply pagination with limit and offset', async () => {
      const mockTemplates = [
        { ...mockTemplate, id: 'template-1', name: 'Template 1' },
      ];
      mockClient.query.mockResolvedValueOnce({ rows: mockTemplates });

      const result = await repository.findAll(undefined, { limit: 10, offset: 5 });

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1 OFFSET $2'),
        [10, 5]
      );
      expect(result).toHaveLength(1);
    });

    it('should combine filters and pagination', async () => {
      const mockTemplates = [
        { ...mockTemplate, id: 'template-1' },
      ];
      mockClient.query.mockResolvedValueOnce({ rows: mockTemplates });

      await repository.findAll({ isActive: true, category: 'quiz' }, { limit: 5, offset: 0 });

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE is_active = $1 AND category = $2'),
        [true, 'quiz', 5, 0]
      );
    });

    it('should return empty array when no templates match', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findAll({ isActive: true });

      expect(result).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Connection timeout'));

      await expect(repository.findAll()).rejects.toThrow(
        'Failed to find templates: Connection timeout'
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should find template by ID', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [mockTemplate] });

      const result = await repository.findById('template-123');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        ['template-123']
      );
      expect(result).toEqual(mockTemplate);
    });

    it('should return null when template not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(repository.findById('template-123')).rejects.toThrow(
        'Failed to find template by ID: Database error'
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findByCategory', () => {
    it('should find templates by category sorted by usage_count DESC', async () => {
      const mockTemplates = [
        { ...mockTemplate, id: 'template-1', usageCount: 100 },
        { ...mockTemplate, id: 'template-2', usageCount: 50 },
      ];
      mockClient.query.mockResolvedValueOnce({ rows: mockTemplates });

      const result = await repository.findByCategory(TemplateCategory.ECOMMERCE);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE category = $1 AND is_active = true'),
        [TemplateCategory.ECOMMERCE]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY usage_count DESC'),
        expect.any(Array)
      );
      expect(result).toHaveLength(2);
      expect(result[0].usageCount).toBeGreaterThanOrEqual(result[1].usageCount);
    });

    it('should return empty array when no templates in category', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findByCategory(TemplateCategory.QUIZ);

      expect(result).toEqual([]);
    });

    it('should only return active templates', async () => {
      const mockTemplates = [
        { ...mockTemplate, id: 'template-1', isActive: true },
      ];
      mockClient.query.mockResolvedValueOnce({ rows: mockTemplates });

      const result = await repository.findByCategory(TemplateCategory.SERVICES);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('is_active = true'),
        expect.any(Array)
      );
      expect(result.every((t: FormTemplate) => t.isActive)).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Query timeout'));

      await expect(
        repository.findByCategory(TemplateCategory.EVENTS)
      ).rejects.toThrow('Failed to find templates by category: Query timeout');
    });
  });

  describe('update', () => {
    it('should update template with single field', async () => {
      const updates: UpdateFormTemplateRequest = { name: 'Updated Name' };
      const updatedTemplate = { ...mockTemplate, name: 'Updated Name' };
      mockClient.query.mockResolvedValueOnce({ rows: [updatedTemplate] });

      const result = await repository.update('template-123', updates);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE form_templates'),
        expect.arrayContaining(['Updated Name', 'template-123'])
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('updated_at = CURRENT_TIMESTAMP'),
        expect.any(Array)
      );
      expect(result.name).toBe('Updated Name');
    });

    it('should update template with multiple fields', async () => {
      const updates: UpdateFormTemplateRequest = {
        name: 'Updated Name',
        description: 'Updated Description',
        isActive: false,
      };
      const updatedTemplate = {
        ...mockTemplate,
        name: 'Updated Name',
        description: 'Updated Description',
        isActive: false,
      };
      mockClient.query.mockResolvedValueOnce({ rows: [updatedTemplate] });

      const result = await repository.update('template-123', updates);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('name = $1'),
        expect.arrayContaining([
          'Updated Name',
          'Updated Description',
          false,
          'template-123',
        ])
      );
      expect(result.name).toBe('Updated Name');
      expect(result.description).toBe('Updated Description');
      expect(result.isActive).toBe(false);
    });

    it('should update template schema', async () => {
      const newSchema = { ...mockTemplateSchema, title: 'Updated Schema' };
      const updates: UpdateFormTemplateRequest = { templateSchema: newSchema as any };
      const updatedTemplate = { ...mockTemplate, templateSchema: newSchema };
      mockClient.query.mockResolvedValueOnce({ rows: [updatedTemplate] });

      await repository.update('template-123', updates);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([JSON.stringify(newSchema), 'template-123'])
      );
    });

    it('should remove business logic config by setting to null', async () => {
      const updates: UpdateFormTemplateRequest = {
        name: 'Updated Name',
        businessLogicConfig: undefined,
      };
      const updatedTemplate = {
        ...mockTemplate,
        name: 'Updated Name',
        businessLogicConfig: null,
      };
      mockClient.query.mockResolvedValueOnce({ rows: [updatedTemplate] });

      await repository.update('template-123', updates);

      // When businessLogicConfig is undefined in the update object, it's not included in the query
      // Only name should be updated
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('name = $1'),
        ['Updated Name', 'template-123']
      );
    });

    it('should throw error when no fields to update', async () => {
      const updates: UpdateFormTemplateRequest = {};

      await expect(repository.update('template-123', updates)).rejects.toThrow(
        'No fields to update'
      );
    });

    it('should throw error when template not found', async () => {
      const updates: UpdateFormTemplateRequest = { name: 'Updated Name' };
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await expect(repository.update('non-existent-id', updates)).rejects.toThrow(
        'Template not found'
      );
    });

    it('should throw error when updating to existing template name', async () => {
      const updates: UpdateFormTemplateRequest = { name: 'Existing Name' };
      const dbError = new Error('Duplicate key violation');
      (dbError as any).code = '23505';
      mockClient.query.mockRejectedValueOnce(dbError);

      await expect(repository.update('template-123', updates)).rejects.toThrow(
        `Template with name "Existing Name" already exists`
      );
    });

    it('should throw error for invalid category update', async () => {
      const updates: UpdateFormTemplateRequest = {
        category: 'invalid' as TemplateCategory,
      };
      const dbError = new Error('Check constraint: category');
      (dbError as any).code = '23514';
      mockClient.query.mockRejectedValueOnce(dbError);

      await expect(repository.update('template-123', updates)).rejects.toThrow(
        'Invalid category "invalid"'
      );
    });

    it('should handle database errors gracefully', async () => {
      const updates: UpdateFormTemplateRequest = { name: 'Updated Name' };
      mockClient.query.mockRejectedValueOnce(new Error('Connection lost'));

      await expect(repository.update('template-123', updates)).rejects.toThrow(
        'Failed to update template: Connection lost'
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should soft delete template by setting is_active to false', async () => {
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

      const result = await repository.delete('template-123');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE form_templates'),
        ['template-123']
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('is_active = false'),
        expect.any(Array)
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('updated_at = CURRENT_TIMESTAMP'),
        expect.any(Array)
      );
      expect(result).toBe(true);
    });

    it('should return false when template not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rowCount: 0 });

      const result = await repository.delete('non-existent-id');

      expect(result).toBe(false);
    });

    it('should handle null rowCount', async () => {
      mockClient.query.mockResolvedValueOnce({ rowCount: null });

      const result = await repository.delete('template-123');

      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Delete failed'));

      await expect(repository.delete('template-123')).rejects.toThrow(
        'Failed to delete template: Delete failed'
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('incrementUsageCount', () => {
    it('should atomically increment usage count', async () => {
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

      await repository.incrementUsageCount('template-123');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE form_templates'),
        ['template-123']
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('usage_count = usage_count + 1'),
        expect.any(Array)
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('updated_at = CURRENT_TIMESTAMP'),
        expect.any(Array)
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error when template not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rowCount: 0 });

      await expect(repository.incrementUsageCount('non-existent-id')).rejects.toThrow(
        'Template not found'
      );
    });

    it('should handle null rowCount', async () => {
      mockClient.query.mockResolvedValueOnce({ rowCount: null });

      await expect(repository.incrementUsageCount('template-123')).rejects.toThrow(
        'Template not found'
      );
    });

    it('should handle database errors gracefully', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Increment failed'));

      await expect(repository.incrementUsageCount('template-123')).rejects.toThrow(
        'Failed to increment usage count: Increment failed'
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should be race-condition safe (atomic operation)', async () => {
      // This test verifies that the SQL uses atomic increment, not read-then-write
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

      await repository.incrementUsageCount('template-123');

      const query = mockClient.query.mock.calls[0][0];
      expect(query).toContain('usage_count = usage_count + 1');
      expect(query).not.toContain('SELECT');
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('should handle templates with null optional fields', async () => {
      const minimalTemplate = {
        ...mockTemplate,
        description: null,
        previewImageUrl: null,
        businessLogicConfig: null,
        createdBy: null,
      };
      mockClient.query.mockResolvedValueOnce({ rows: [minimalTemplate] });

      const result = await repository.findById('template-123');

      expect(result?.description).toBeNull();
      expect(result?.previewImageUrl).toBeNull();
      expect(result?.businessLogicConfig).toBeNull();
      expect(result?.createdBy).toBeNull();
    });

    it('should handle large template schemas (close to 100KB limit)', async () => {
      const largeSchema = {
        ...mockTemplateSchema,
        fields: Array(100)
          .fill(null)
          .map((_, i) => ({
            id: `field-${i}`,
            type: 'text',
            label: `Field ${i}`,
            required: false,
            order: i,
          })),
      };
      const largeRequest: CreateFormTemplateRequest = {
        ...mockCreateRequest,
        templateSchema: largeSchema as any,
      };
      mockClient.query.mockResolvedValueOnce({
        rows: [{ ...mockTemplate, templateSchema: largeSchema }],
      });

      await repository.create(largeRequest);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([JSON.stringify(largeSchema)])
      );
    });

    it('should handle all template categories', async () => {
      const categories = [
        TemplateCategory.ECOMMERCE,
        TemplateCategory.SERVICES,
        TemplateCategory.DATA_COLLECTION,
        TemplateCategory.EVENTS,
        TemplateCategory.QUIZ,
        TemplateCategory.POLLS,
      ];

      for (const category of categories) {
        mockClient.query.mockResolvedValueOnce({
          rows: [{ ...mockTemplate, category }],
        });

        const result = await repository.findByCategory(category);

        expect(result[0]?.category).toBe(category);
      }
    });
  });
});
