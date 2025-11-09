import { templatesService } from '../../../src/services/templates.service';
import { templatesRepository } from '../../../src/repositories/templates.repository';
import { ApiError } from '../../../src/services/forms.service';
import {
  FormTemplate,
  TemplateCategory,
  CreateFormTemplateRequest,
  UpdateFormTemplateRequest,
  FormSchema,
} from '@nodeangularfullstack/shared';

// Mock the templates repository
jest.mock('../../../src/repositories/templates.repository', () => ({
  templatesRepository: {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findByCategory: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    incrementUsageCount: jest.fn(),
  },
}));

const mockTemplatesRepository = templatesRepository as jest.Mocked<
  typeof templatesRepository
>;

describe('TemplatesService', () => {
  let mockFormSchema: FormSchema;
  let mockTemplate: FormTemplate;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock valid form schema
    mockFormSchema = {
      fields: [
        {
          id: 'field1',
          label: 'Name',
          fieldName: 'name',
          type: 'text',
          order: 1,
          required: true,
        },
      ],
      settings: {
        layout: {
          columns: 1,
          spacing: 'medium',
        },
        submission: {
          showSuccessMessage: true,
          successMessage: 'Thank you!',
          allowMultipleSubmissions: true,
        },
      },
    } as FormSchema;

    // Mock template
    mockTemplate = {
      id: 'template-uuid-1',
      name: 'Test Template',
      description: 'Test description',
      category: TemplateCategory.DATA_COLLECTION,
      templateSchema: mockFormSchema,
      isActive: true,
      usageCount: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  describe('createTemplate', () => {
    it('should create template with valid data', async () => {
      const createRequest: CreateFormTemplateRequest = {
        name: 'Customer Survey',
        description: 'Customer feedback form',
        category: TemplateCategory.DATA_COLLECTION,
        templateSchema: mockFormSchema,
      };

      mockTemplatesRepository.create.mockResolvedValue(mockTemplate);

      const result = await templatesService.createTemplate(createRequest);

      expect(mockTemplatesRepository.create).toHaveBeenCalledWith(createRequest);
      expect(result).toEqual(mockTemplate);
    });

    it('should throw error when name is missing', async () => {
      const createRequest: CreateFormTemplateRequest = {
        name: '',
        category: TemplateCategory.DATA_COLLECTION,
        templateSchema: mockFormSchema,
      };

      await expect(
        templatesService.createTemplate(createRequest)
      ).rejects.toThrow(ApiError);

      await expect(
        templatesService.createTemplate(createRequest)
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Template name is required',
      });

      expect(mockTemplatesRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error when category is missing', async () => {
      const createRequest: any = {
        name: 'Test Template',
        templateSchema: mockFormSchema,
      };

      await expect(
        templatesService.createTemplate(createRequest)
      ).rejects.toThrow(ApiError);

      await expect(
        templatesService.createTemplate(createRequest)
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Template category is required',
      });

      expect(mockTemplatesRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error when templateSchema is missing', async () => {
      const createRequest: any = {
        name: 'Test Template',
        category: TemplateCategory.DATA_COLLECTION,
      };

      await expect(
        templatesService.createTemplate(createRequest)
      ).rejects.toThrow(ApiError);

      await expect(
        templatesService.createTemplate(createRequest)
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Template schema is required',
      });

      expect(mockTemplatesRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error when schema exceeds 100KB limit', async () => {
      // Create a large schema that exceeds 100KB
      const largeFields = Array.from({ length: 1000 }, (_, i) => ({
        id: `field${i}`,
        label: `Field ${i}`.repeat(50), // Make each field large
        fieldName: `field_${i}`,
        type: 'text',
        order: i,
        required: false,
      }));

      const largeSchema: FormSchema = {
        fields: largeFields,
        settings: mockFormSchema.settings,
      } as FormSchema;

      const createRequest: CreateFormTemplateRequest = {
        name: 'Large Template',
        category: TemplateCategory.DATA_COLLECTION,
        templateSchema: largeSchema,
      };

      await expect(
        templatesService.createTemplate(createRequest)
      ).rejects.toThrow(ApiError);

      await expect(
        templatesService.createTemplate(createRequest)
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'SIZE_LIMIT_EXCEEDED',
      });

      expect(mockTemplatesRepository.create).not.toHaveBeenCalled();
    });

    it('should validate business logic config matches category - valid inventory for ecommerce', async () => {
      const createRequest: CreateFormTemplateRequest = {
        name: 'Product Order Form',
        category: TemplateCategory.ECOMMERCE,
        templateSchema: mockFormSchema,
        businessLogicConfig: {
          type: 'inventory',
          stockField: 'product_id',
          variantField: 'size',
          quantityField: 'quantity',
          stockTable: 'inventory',
          decrementOnSubmit: true,
        },
      };

      mockTemplatesRepository.create.mockResolvedValue(mockTemplate);

      const result = await templatesService.createTemplate(createRequest);

      expect(mockTemplatesRepository.create).toHaveBeenCalledWith(createRequest);
      expect(result).toEqual(mockTemplate);
    });

    it('should throw error when business logic config type does not match category', async () => {
      const createRequest: CreateFormTemplateRequest = {
        name: 'Product Order Form',
        category: TemplateCategory.ECOMMERCE,
        templateSchema: mockFormSchema,
        businessLogicConfig: {
          type: 'quiz',
          scoringRules: { question1: 'answer1' },
        },
      };

      await expect(
        templatesService.createTemplate(createRequest)
      ).rejects.toThrow(ApiError);

      await expect(
        templatesService.createTemplate(createRequest)
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_CONFIG',
      });

      expect(mockTemplatesRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error when inventory config is missing required fields', async () => {
      const createRequest: CreateFormTemplateRequest = {
        name: 'Product Order Form',
        category: TemplateCategory.ECOMMERCE,
        templateSchema: mockFormSchema,
        businessLogicConfig: {
          type: 'inventory',
          stockField: 'product_id',
          variantField: '',
          quantityField: 'quantity',
          stockTable: 'inventory',
          decrementOnSubmit: true,
        },
      };

      await expect(
        templatesService.createTemplate(createRequest)
      ).rejects.toThrow(ApiError);

      await expect(
        templatesService.createTemplate(createRequest)
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_CONFIG',
      });

      expect(mockTemplatesRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error when quiz config is missing scoringRules', async () => {
      const createRequest: CreateFormTemplateRequest = {
        name: 'Quiz Template',
        category: TemplateCategory.QUIZ,
        templateSchema: mockFormSchema,
        businessLogicConfig: {
          type: 'quiz',
          scoringRules: {},
        },
      };

      await expect(
        templatesService.createTemplate(createRequest)
      ).rejects.toThrow(ApiError);

      await expect(
        templatesService.createTemplate(createRequest)
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_CONFIG',
        message: 'Quiz config must have scoringRules with at least one question',
      });

      expect(mockTemplatesRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error when template schema is missing fields', async () => {
      const invalidSchema: any = {
        settings: mockFormSchema.settings,
      };

      const createRequest: CreateFormTemplateRequest = {
        name: 'Invalid Template',
        category: TemplateCategory.DATA_COLLECTION,
        templateSchema: invalidSchema,
      };

      await expect(
        templatesService.createTemplate(createRequest)
      ).rejects.toThrow(ApiError);

      await expect(
        templatesService.createTemplate(createRequest)
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Template schema must have fields array',
      });

      expect(mockTemplatesRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error when template schema has empty fields array', async () => {
      const invalidSchema = {
        fields: [],
        settings: mockFormSchema.settings,
      } as unknown as FormSchema;

      const createRequest: CreateFormTemplateRequest = {
        name: 'Invalid Template',
        category: TemplateCategory.DATA_COLLECTION,
        templateSchema: invalidSchema,
      };

      await expect(
        templatesService.createTemplate(createRequest)
      ).rejects.toThrow(ApiError);

      await expect(
        templatesService.createTemplate(createRequest)
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Template schema must have at least one field',
      });

      expect(mockTemplatesRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error when repository fails', async () => {
      const createRequest: CreateFormTemplateRequest = {
        name: 'Test Template',
        category: TemplateCategory.DATA_COLLECTION,
        templateSchema: mockFormSchema,
      };

      const repoError = new Error('Database connection failed');
      mockTemplatesRepository.create.mockRejectedValue(repoError);

      await expect(
        templatesService.createTemplate(createRequest)
      ).rejects.toThrow(ApiError);

      await expect(
        templatesService.createTemplate(createRequest)
      ).rejects.toMatchObject({
        statusCode: 500,
        code: 'CREATE_TEMPLATE_ERROR',
      });
    });
  });

  describe('getTemplates', () => {
    it('should return all templates without filters', async () => {
      const mockTemplates: FormTemplate[] = [mockTemplate];
      mockTemplatesRepository.findAll.mockResolvedValue(mockTemplates);

      const result = await templatesService.getTemplates();

      expect(mockTemplatesRepository.findAll).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockTemplates);
    });

    it('should return templates filtered by category', async () => {
      const mockTemplates: FormTemplate[] = [mockTemplate];
      mockTemplatesRepository.findAll.mockResolvedValue(mockTemplates);

      const result = await templatesService.getTemplates({
        category: TemplateCategory.ECOMMERCE,
      });

      expect(mockTemplatesRepository.findAll).toHaveBeenCalledWith({
        category: TemplateCategory.ECOMMERCE,
      });
      expect(result).toEqual(mockTemplates);
    });

    it('should return templates filtered by isActive', async () => {
      const mockTemplates: FormTemplate[] = [mockTemplate];
      mockTemplatesRepository.findAll.mockResolvedValue(mockTemplates);

      const result = await templatesService.getTemplates({
        isActive: true,
      });

      expect(mockTemplatesRepository.findAll).toHaveBeenCalledWith({
        isActive: true,
      });
      expect(result).toEqual(mockTemplates);
    });

    it('should return templates filtered by category and isActive', async () => {
      const mockTemplates: FormTemplate[] = [mockTemplate];
      mockTemplatesRepository.findAll.mockResolvedValue(mockTemplates);

      const result = await templatesService.getTemplates({
        category: TemplateCategory.ECOMMERCE,
        isActive: true,
      });

      expect(mockTemplatesRepository.findAll).toHaveBeenCalledWith({
        category: TemplateCategory.ECOMMERCE,
        isActive: true,
      });
      expect(result).toEqual(mockTemplates);
    });

    it('should return empty array when no templates found', async () => {
      mockTemplatesRepository.findAll.mockResolvedValue([]);

      const result = await templatesService.getTemplates();

      expect(result).toEqual([]);
    });

    it('should throw error when repository fails', async () => {
      const repoError = new Error('Database error');
      mockTemplatesRepository.findAll.mockRejectedValue(repoError);

      await expect(templatesService.getTemplates()).rejects.toThrow(ApiError);

      await expect(templatesService.getTemplates()).rejects.toMatchObject({
        statusCode: 500,
        code: 'GET_TEMPLATES_ERROR',
      });
    });
  });

  describe('getTemplateById', () => {
    it('should return template when found', async () => {
      mockTemplatesRepository.findById.mockResolvedValue(mockTemplate);

      const result = await templatesService.getTemplateById('template-uuid-1');

      expect(mockTemplatesRepository.findById).toHaveBeenCalledWith(
        'template-uuid-1'
      );
      expect(result).toEqual(mockTemplate);
    });

    it('should throw error when template not found', async () => {
      mockTemplatesRepository.findById.mockResolvedValue(null);

      await expect(
        templatesService.getTemplateById('nonexistent')
      ).rejects.toThrow(ApiError);

      await expect(
        templatesService.getTemplateById('nonexistent')
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Template not found',
      });
    });

    it('should throw error when repository fails', async () => {
      const repoError = new Error('Database error');
      mockTemplatesRepository.findById.mockRejectedValue(repoError);

      await expect(
        templatesService.getTemplateById('template-uuid-1')
      ).rejects.toThrow(ApiError);

      await expect(
        templatesService.getTemplateById('template-uuid-1')
      ).rejects.toMatchObject({
        statusCode: 500,
        code: 'GET_TEMPLATE_ERROR',
      });
    });
  });

  describe('updateTemplate', () => {
    it('should update template with valid data', async () => {
      const updateRequest: UpdateFormTemplateRequest = {
        name: 'Updated Template Name',
        description: 'Updated description',
      };

      const updatedTemplate = { ...mockTemplate, ...updateRequest };
      mockTemplatesRepository.update.mockResolvedValue(updatedTemplate);

      const result = await templatesService.updateTemplate(
        'template-uuid-1',
        updateRequest
      );

      expect(mockTemplatesRepository.update).toHaveBeenCalledWith(
        'template-uuid-1',
        updateRequest
      );
      expect(result).toEqual(updatedTemplate);
    });

    it('should validate schema size when updating templateSchema', async () => {
      const largeFields = Array.from({ length: 1000 }, (_, i) => ({
        id: `field${i}`,
        label: `Field ${i}`.repeat(50),
        fieldName: `field_${i}`,
        type: 'text',
        order: i,
        required: false,
      }));

      const largeSchema: FormSchema = {
        fields: largeFields,
        settings: mockFormSchema.settings,
      } as FormSchema;

      const updateRequest: UpdateFormTemplateRequest = {
        templateSchema: largeSchema,
      };

      await expect(
        templatesService.updateTemplate('template-uuid-1', updateRequest)
      ).rejects.toThrow(ApiError);

      await expect(
        templatesService.updateTemplate('template-uuid-1', updateRequest)
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'SIZE_LIMIT_EXCEEDED',
      });

      expect(mockTemplatesRepository.update).not.toHaveBeenCalled();
    });

    it('should validate business logic config when updating with category', async () => {
      const updateRequest: UpdateFormTemplateRequest = {
        category: TemplateCategory.ECOMMERCE,
        businessLogicConfig: {
          type: 'inventory',
          stockField: 'product_id',
          variantField: 'size',
          quantityField: 'quantity',
          stockTable: 'inventory',
          decrementOnSubmit: true,
        },
      };

      mockTemplatesRepository.update.mockResolvedValue(mockTemplate);

      const result = await templatesService.updateTemplate(
        'template-uuid-1',
        updateRequest
      );

      expect(mockTemplatesRepository.update).toHaveBeenCalledWith(
        'template-uuid-1',
        updateRequest
      );
      expect(result).toEqual(mockTemplate);
    });

    it('should fetch existing template when validating business logic config without category update', async () => {
      const updateRequest: UpdateFormTemplateRequest = {
        businessLogicConfig: {
          type: 'quiz',
          scoringRules: { question1: 'answer1' },
        },
      };

      const quizTemplate = {
        ...mockTemplate,
        category: TemplateCategory.QUIZ,
      };

      mockTemplatesRepository.findById.mockResolvedValue(quizTemplate);
      mockTemplatesRepository.update.mockResolvedValue(quizTemplate);

      const result = await templatesService.updateTemplate(
        'template-uuid-1',
        updateRequest
      );

      expect(mockTemplatesRepository.findById).toHaveBeenCalledWith(
        'template-uuid-1'
      );
      expect(mockTemplatesRepository.update).toHaveBeenCalledWith(
        'template-uuid-1',
        updateRequest
      );
      expect(result).toEqual(quizTemplate);
    });

    it('should throw error when template not found during business logic validation', async () => {
      const updateRequest: UpdateFormTemplateRequest = {
        businessLogicConfig: {
          type: 'quiz',
          scoringRules: { question1: 'answer1' },
        },
      };

      mockTemplatesRepository.findById.mockResolvedValue(null);

      await expect(
        templatesService.updateTemplate('nonexistent', updateRequest)
      ).rejects.toThrow(ApiError);

      await expect(
        templatesService.updateTemplate('nonexistent', updateRequest)
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Template not found',
      });

      expect(mockTemplatesRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error when repository update fails', async () => {
      const updateRequest: UpdateFormTemplateRequest = {
        name: 'Updated Name',
      };

      const repoError = new Error('Database error');
      mockTemplatesRepository.update.mockRejectedValue(repoError);

      await expect(
        templatesService.updateTemplate('template-uuid-1', updateRequest)
      ).rejects.toThrow(ApiError);

      await expect(
        templatesService.updateTemplate('template-uuid-1', updateRequest)
      ).rejects.toMatchObject({
        statusCode: 500,
        code: 'UPDATE_TEMPLATE_ERROR',
      });
    });
  });

  describe('deleteTemplate', () => {
    it('should delete template successfully', async () => {
      mockTemplatesRepository.delete.mockResolvedValue(true);

      const result = await templatesService.deleteTemplate('template-uuid-1');

      expect(mockTemplatesRepository.delete).toHaveBeenCalledWith(
        'template-uuid-1'
      );
      expect(result).toBe(true);
    });

    it('should throw error when template not found', async () => {
      mockTemplatesRepository.delete.mockResolvedValue(false);

      await expect(
        templatesService.deleteTemplate('nonexistent')
      ).rejects.toThrow(ApiError);

      await expect(
        templatesService.deleteTemplate('nonexistent')
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Template not found',
      });
    });

    it('should throw error when repository fails', async () => {
      const repoError = new Error('Database error');
      mockTemplatesRepository.delete.mockRejectedValue(repoError);

      await expect(
        templatesService.deleteTemplate('template-uuid-1')
      ).rejects.toThrow(ApiError);

      await expect(
        templatesService.deleteTemplate('template-uuid-1')
      ).rejects.toMatchObject({
        statusCode: 500,
        code: 'DELETE_TEMPLATE_ERROR',
      });
    });
  });

  describe('applyTemplateToForm', () => {
    it('should apply template and return deep cloned schema', async () => {
      mockTemplatesRepository.findById.mockResolvedValue(mockTemplate);
      mockTemplatesRepository.incrementUsageCount.mockResolvedValue();

      const result = await templatesService.applyTemplateToForm(
        'template-uuid-1'
      );

      expect(mockTemplatesRepository.findById).toHaveBeenCalledWith(
        'template-uuid-1'
      );
      expect(mockTemplatesRepository.incrementUsageCount).toHaveBeenCalledWith(
        'template-uuid-1'
      );
      expect(result).toEqual(mockFormSchema);
      // Verify it's a deep clone (different object reference)
      expect(result).not.toBe(mockTemplate.templateSchema);
    });

    it('should throw error when template not found', async () => {
      mockTemplatesRepository.findById.mockResolvedValue(null);

      await expect(
        templatesService.applyTemplateToForm('nonexistent')
      ).rejects.toThrow(ApiError);

      await expect(
        templatesService.applyTemplateToForm('nonexistent')
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Template not found',
      });

      expect(mockTemplatesRepository.incrementUsageCount).not.toHaveBeenCalled();
    });

    it('should throw error when template is inactive', async () => {
      const inactiveTemplate = { ...mockTemplate, isActive: false };
      mockTemplatesRepository.findById.mockResolvedValue(inactiveTemplate);

      await expect(
        templatesService.applyTemplateToForm('template-uuid-1')
      ).rejects.toThrow(ApiError);

      await expect(
        templatesService.applyTemplateToForm('template-uuid-1')
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'TEMPLATE_INACTIVE',
        message: 'Template is not active and cannot be used',
      });

      expect(mockTemplatesRepository.incrementUsageCount).not.toHaveBeenCalled();
    });

    it('should throw error when incrementUsageCount fails', async () => {
      mockTemplatesRepository.findById.mockResolvedValue(mockTemplate);
      const repoError = new Error('Database error');
      mockTemplatesRepository.incrementUsageCount.mockRejectedValue(repoError);

      await expect(
        templatesService.applyTemplateToForm('template-uuid-1')
      ).rejects.toThrow(ApiError);

      await expect(
        templatesService.applyTemplateToForm('template-uuid-1')
      ).rejects.toMatchObject({
        statusCode: 500,
        code: 'APPLY_TEMPLATE_ERROR',
      });
    });
  });

  describe('Business Logic Config Validation', () => {
    describe('Inventory Config', () => {
      it('should validate valid inventory config for ecommerce', async () => {
        const createRequest: CreateFormTemplateRequest = {
          name: 'Inventory Template',
          category: TemplateCategory.ECOMMERCE,
          templateSchema: mockFormSchema,
          businessLogicConfig: {
            type: 'inventory',
            stockField: 'product_id',
            variantField: 'size',
            quantityField: 'quantity',
            stockTable: 'inventory',
            threshold: 10,
            decrementOnSubmit: true,
          },
        };

        mockTemplatesRepository.create.mockResolvedValue(mockTemplate);

        await expect(
          templatesService.createTemplate(createRequest)
        ).resolves.toBeDefined();
      });

      it('should throw error when inventory config missing stockTable', async () => {
        const createRequest: CreateFormTemplateRequest = {
          name: 'Inventory Template',
          category: TemplateCategory.ECOMMERCE,
          templateSchema: mockFormSchema,
          businessLogicConfig: {
            type: 'inventory',
            stockField: 'product_id',
            variantField: 'size',
            quantityField: 'quantity',
            stockTable: '',
            decrementOnSubmit: true,
          },
        };

        await expect(
          templatesService.createTemplate(createRequest)
        ).rejects.toMatchObject({
          statusCode: 400,
          code: 'INVALID_CONFIG',
          message: 'Inventory config must have stockTable',
        });
      });

      it('should throw error when inventory config missing decrementOnSubmit', async () => {
        const createRequest: any = {
          name: 'Inventory Template',
          category: TemplateCategory.ECOMMERCE,
          templateSchema: mockFormSchema,
          businessLogicConfig: {
            type: 'inventory',
            stockField: 'product_id',
            variantField: 'size',
            quantityField: 'quantity',
            stockTable: 'inventory',
          },
        };

        await expect(
          templatesService.createTemplate(createRequest)
        ).rejects.toMatchObject({
          statusCode: 400,
          code: 'INVALID_CONFIG',
          message: 'Inventory config must specify decrementOnSubmit',
        });
      });
    });

    describe('Quiz Config', () => {
      it('should validate valid quiz config', async () => {
        const createRequest: CreateFormTemplateRequest = {
          name: 'Quiz Template',
          category: TemplateCategory.QUIZ,
          templateSchema: mockFormSchema,
          businessLogicConfig: {
            type: 'quiz',
            scoringRules: {
              question1: 'answer_a',
              question2: 'answer_b',
            },
            passingScore: 70,
            showResults: true,
            weightedScoring: false,
          },
        };

        mockTemplatesRepository.create.mockResolvedValue(mockTemplate);

        await expect(
          templatesService.createTemplate(createRequest)
        ).resolves.toBeDefined();
      });

      it('should throw error when quiz config has invalid passingScore', async () => {
        const createRequest: CreateFormTemplateRequest = {
          name: 'Quiz Template',
          category: TemplateCategory.QUIZ,
          templateSchema: mockFormSchema,
          businessLogicConfig: {
            type: 'quiz',
            scoringRules: { question1: 'answer1' },
            passingScore: 150,
          },
        };

        await expect(
          templatesService.createTemplate(createRequest)
        ).rejects.toMatchObject({
          statusCode: 400,
          code: 'INVALID_CONFIG',
          message: 'Quiz config passingScore must be between 0 and 100',
        });
      });
    });

    describe('Appointment Config', () => {
      it('should validate valid appointment config', async () => {
        const createRequest: CreateFormTemplateRequest = {
          name: 'Appointment Template',
          category: TemplateCategory.SERVICES,
          templateSchema: mockFormSchema,
          businessLogicConfig: {
            type: 'appointment',
            timeSlotField: 'time_slot',
            dateField: 'date',
            maxBookingsPerSlot: 1,
            bookingsTable: 'appointments',
            allowOverbook: false,
          },
        };

        mockTemplatesRepository.create.mockResolvedValue(mockTemplate);

        await expect(
          templatesService.createTemplate(createRequest)
        ).resolves.toBeDefined();
      });

      it('should throw error when appointment config has invalid maxBookingsPerSlot', async () => {
        const createRequest: CreateFormTemplateRequest = {
          name: 'Appointment Template',
          category: TemplateCategory.SERVICES,
          templateSchema: mockFormSchema,
          businessLogicConfig: {
            type: 'appointment',
            timeSlotField: 'time_slot',
            dateField: 'date',
            maxBookingsPerSlot: 0,
            bookingsTable: 'appointments',
          },
        };

        await expect(
          templatesService.createTemplate(createRequest)
        ).rejects.toMatchObject({
          statusCode: 400,
          code: 'INVALID_CONFIG',
          message: 'Appointment config must have maxBookingsPerSlot >= 1',
        });
      });
    });

    describe('Poll Config', () => {
      it('should validate valid poll config', async () => {
        const createRequest: CreateFormTemplateRequest = {
          name: 'Poll Template',
          category: TemplateCategory.POLLS,
          templateSchema: mockFormSchema,
          businessLogicConfig: {
            type: 'poll',
            voteField: 'vote_selection',
            preventDuplicates: true,
            showResultsAfterVote: true,
            trackingMethod: 'session',
            allowMultipleVotes: false,
          },
        };

        mockTemplatesRepository.create.mockResolvedValue(mockTemplate);

        await expect(
          templatesService.createTemplate(createRequest)
        ).resolves.toBeDefined();
      });

      it('should throw error when poll config has invalid trackingMethod', async () => {
        const createRequest: any = {
          name: 'Poll Template',
          category: TemplateCategory.POLLS,
          templateSchema: mockFormSchema,
          businessLogicConfig: {
            type: 'poll',
            voteField: 'vote_selection',
            preventDuplicates: true,
            showResultsAfterVote: true,
            trackingMethod: 'invalid_method',
          },
        };

        await expect(
          templatesService.createTemplate(createRequest)
        ).rejects.toMatchObject({
          statusCode: 400,
          code: 'INVALID_CONFIG',
        });
      });
    });

    describe('Order Config', () => {
      it('should validate valid order config', async () => {
        const createRequest: CreateFormTemplateRequest = {
          name: 'Order Template',
          category: TemplateCategory.ECOMMERCE,
          templateSchema: mockFormSchema,
          businessLogicConfig: {
            type: 'order',
            itemFields: ['burger', 'fries', 'drink'],
            calculateTotal: true,
            taxRate: 0.08,
            shippingField: 'delivery_fee',
          },
        };

        mockTemplatesRepository.create.mockResolvedValue(mockTemplate);

        await expect(
          templatesService.createTemplate(createRequest)
        ).resolves.toBeDefined();
      });

      it('should throw error when order config has empty itemFields', async () => {
        const createRequest: CreateFormTemplateRequest = {
          name: 'Order Template',
          category: TemplateCategory.ECOMMERCE,
          templateSchema: mockFormSchema,
          businessLogicConfig: {
            type: 'order',
            itemFields: [],
            calculateTotal: true,
          },
        };

        await expect(
          templatesService.createTemplate(createRequest)
        ).rejects.toMatchObject({
          statusCode: 400,
          code: 'INVALID_CONFIG',
          message: 'Order config must have at least one itemField',
        });
      });

      it('should throw error when order config has invalid taxRate', async () => {
        const createRequest: CreateFormTemplateRequest = {
          name: 'Order Template',
          category: TemplateCategory.ECOMMERCE,
          templateSchema: mockFormSchema,
          businessLogicConfig: {
            type: 'order',
            itemFields: ['item1'],
            calculateTotal: true,
            taxRate: 1.5,
          },
        };

        await expect(
          templatesService.createTemplate(createRequest)
        ).rejects.toMatchObject({
          statusCode: 400,
          code: 'INVALID_CONFIG',
          message: 'Order config taxRate must be between 0 and 1 (e.g., 0.08 for 8%)',
        });
      });
    });
  });

  describe('Additional Coverage - Edge Cases and Constructor', () => {
    it('should accept custom repository via constructor (DI testing)', () => {
      const mockRepo = {
        create: jest.fn(),
        findAll: jest.fn(),
        findById: jest.fn(),
        findByCategory: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        incrementUsageCount: jest.fn(),
      } as any;

      const customService = new (templatesService.constructor as any)(mockRepo);
      expect(customService).toBeDefined();
    });

    it('should throw error when quiz config has negative passingScore', async () => {
      const createRequest: CreateFormTemplateRequest = {
        name: 'Quiz Template',
        category: TemplateCategory.QUIZ,
        templateSchema: mockFormSchema,
        businessLogicConfig: {
          type: 'quiz',
          scoringRules: { question1: 'answer1' },
          passingScore: -10,
        },
      };

      await expect(
        templatesService.createTemplate(createRequest)
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_CONFIG',
        message: 'Quiz config passingScore must be between 0 and 100',
      });
    });

    it('should throw error when template schema is missing settings.layout', async () => {
      const invalidSchema = {
        fields: mockFormSchema.fields,
        settings: {
          submission: mockFormSchema.settings.submission,
        },
      } as any;

      const createRequest: CreateFormTemplateRequest = {
        name: 'Invalid Template',
        category: TemplateCategory.DATA_COLLECTION,
        templateSchema: invalidSchema,
      };

      await expect(
        templatesService.createTemplate(createRequest)
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Template schema settings must have layout configuration',
      });
    });

    it('should throw error when template schema is missing settings.submission', async () => {
      const invalidSchema = {
        fields: mockFormSchema.fields,
        settings: {
          layout: mockFormSchema.settings.layout,
        },
      } as any;

      const createRequest: CreateFormTemplateRequest = {
        name: 'Invalid Template',
        category: TemplateCategory.DATA_COLLECTION,
        templateSchema: invalidSchema,
      };

      await expect(
        templatesService.createTemplate(createRequest)
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Template schema settings must have submission configuration',
      });
    });

    it('should throw error when field is missing label', async () => {
      const invalidSchema = {
        fields: [
          {
            id: 'field1',
            fieldName: 'name',
            type: 'text',
          } as any,
        ],
        settings: mockFormSchema.settings,
      } as FormSchema;

      const createRequest: CreateFormTemplateRequest = {
        name: 'Invalid Template',
        category: TemplateCategory.DATA_COLLECTION,
        templateSchema: invalidSchema,
      };

      await expect(
        templatesService.createTemplate(createRequest)
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Field at index 0 must have label and fieldName',
      });
    });

    it('should throw error when field is missing fieldName', async () => {
      const invalidSchema = {
        fields: [
          {
            id: 'field1',
            label: 'Name',
            type: 'text',
          } as any,
        ],
        settings: mockFormSchema.settings,
      } as FormSchema;

      const createRequest: CreateFormTemplateRequest = {
        name: 'Invalid Template',
        category: TemplateCategory.DATA_COLLECTION,
        templateSchema: invalidSchema,
      };

      await expect(
        templatesService.createTemplate(createRequest)
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Field at index 0 must have label and fieldName',
      });
    });

    it('should throw error when poll config is missing voteField', async () => {
      const createRequest: any = {
        name: 'Poll Template',
        category: TemplateCategory.POLLS,
        templateSchema: mockFormSchema,
        businessLogicConfig: {
          type: 'poll',
          preventDuplicates: true,
          showResultsAfterVote: true,
          trackingMethod: 'session',
        },
      };

      await expect(
        templatesService.createTemplate(createRequest)
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_CONFIG',
        message: 'Poll config must have voteField',
      });
    });

    it('should throw error when poll config is missing preventDuplicates', async () => {
      const createRequest: any = {
        name: 'Poll Template',
        category: TemplateCategory.POLLS,
        templateSchema: mockFormSchema,
        businessLogicConfig: {
          type: 'poll',
          voteField: 'vote',
          showResultsAfterVote: true,
          trackingMethod: 'session',
        },
      };

      await expect(
        templatesService.createTemplate(createRequest)
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_CONFIG',
        message: 'Poll config must specify preventDuplicates',
      });
    });

    it('should throw error when poll config is missing showResultsAfterVote', async () => {
      const createRequest: any = {
        name: 'Poll Template',
        category: TemplateCategory.POLLS,
        templateSchema: mockFormSchema,
        businessLogicConfig: {
          type: 'poll',
          voteField: 'vote',
          preventDuplicates: true,
          trackingMethod: 'session',
        },
      };

      await expect(
        templatesService.createTemplate(createRequest)
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_CONFIG',
        message: 'Poll config must specify showResultsAfterVote',
      });
    });

    it('should throw error when order config is missing calculateTotal', async () => {
      const createRequest: any = {
        name: 'Order Template',
        category: TemplateCategory.ECOMMERCE,
        templateSchema: mockFormSchema,
        businessLogicConfig: {
          type: 'order',
          itemFields: ['item1'],
        },
      };

      await expect(
        templatesService.createTemplate(createRequest)
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_CONFIG',
        message: 'Order config must specify calculateTotal',
      });
    });

    it('should throw error when appointment config is missing timeSlotField', async () => {
      const createRequest: any = {
        name: 'Appointment Template',
        category: TemplateCategory.SERVICES,
        templateSchema: mockFormSchema,
        businessLogicConfig: {
          type: 'appointment',
          dateField: 'date',
          maxBookingsPerSlot: 1,
          bookingsTable: 'appointments',
        },
      };

      await expect(
        templatesService.createTemplate(createRequest)
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_CONFIG',
        message: 'Appointment config must have timeSlotField and dateField',
      });
    });

    it('should throw error when appointment config is missing bookingsTable', async () => {
      const createRequest: any = {
        name: 'Appointment Template',
        category: TemplateCategory.SERVICES,
        templateSchema: mockFormSchema,
        businessLogicConfig: {
          type: 'appointment',
          timeSlotField: 'time',
          dateField: 'date',
          maxBookingsPerSlot: 1,
        },
      };

      await expect(
        templatesService.createTemplate(createRequest)
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_CONFIG',
        message: 'Appointment config must have bookingsTable',
      });
    });

    it('should throw error when template schema has duplicate field IDs', async () => {
      const invalidSchema = {
        fields: [
          {
            id: 'field1',
            label: 'Name',
            fieldName: 'name',
            type: 'text',
            order: 1,
          },
          {
            id: 'field1', // Duplicate ID
            label: 'Email',
            fieldName: 'email',
            type: 'email',
            order: 2,
          },
        ],
        settings: mockFormSchema.settings,
      } as FormSchema;

      const createRequest: CreateFormTemplateRequest = {
        name: 'Invalid Template',
        category: TemplateCategory.DATA_COLLECTION,
        templateSchema: invalidSchema,
      };

      await expect(
        templatesService.createTemplate(createRequest)
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Duplicate field ID "field1" found at index 1',
      });
    });

    it('should throw error when template schema has duplicate fieldNames', async () => {
      const invalidSchema = {
        fields: [
          {
            id: 'field1',
            label: 'Name',
            fieldName: 'email', // Duplicate fieldName
            type: 'text',
            order: 1,
          },
          {
            id: 'field2',
            label: 'Email',
            fieldName: 'email', // Duplicate fieldName
            type: 'email',
            order: 2,
          },
        ],
        settings: mockFormSchema.settings,
      } as FormSchema;

      const createRequest: CreateFormTemplateRequest = {
        name: 'Invalid Template',
        category: TemplateCategory.DATA_COLLECTION,
        templateSchema: invalidSchema,
      };

      await expect(
        templatesService.createTemplate(createRequest)
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Duplicate fieldName "email" found at index 1',
      });
    });

    it('should accept template with unique field IDs and fieldNames', async () => {
      const validSchema = {
        fields: [
          {
            id: 'field1',
            label: 'Name',
            fieldName: 'name',
            type: 'text',
            order: 1,
          },
          {
            id: 'field2',
            label: 'Email',
            fieldName: 'email',
            type: 'email',
            order: 2,
          },
        ],
        settings: mockFormSchema.settings,
      } as FormSchema;

      const createRequest: CreateFormTemplateRequest = {
        name: 'Valid Template',
        category: TemplateCategory.DATA_COLLECTION,
        templateSchema: validSchema,
      };

      mockTemplatesRepository.create.mockResolvedValue(mockTemplate);

      const result = await templatesService.createTemplate(createRequest);

      expect(mockTemplatesRepository.create).toHaveBeenCalledWith(createRequest);
      expect(result).toEqual(mockTemplate);
    });
  });
});
