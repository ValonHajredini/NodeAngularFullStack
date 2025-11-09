/**
 * Templates Service Integration Tests
 * Epic 29: Form Template System with Business Logic
 * Story: 29.4 Templates Service Layer with Application Logic
 *
 * Integration tests verifying service + repository integration with real PostgreSQL database:
 * - Service validation logic with real database constraints
 * - Business logic config validation end-to-end
 * - Template application flow (deep clone + atomic usage increment)
 * - Error handling with database errors
 */

import { Pool } from 'pg';
import { templatesService, TemplatesService } from '../../src/services/templates.service';
import { templatesRepository } from '../../src/repositories/templates.repository';
import {
  TemplateCategory,
  CreateFormTemplateRequest,
  FormSchema,
} from '@nodeangularfullstack/shared';

describe('Templates Service Integration Tests', () => {
  let pool: Pool;
  const testTemplateIds: string[] = [];

  // Create minimal valid FormSchema for testing
  const createValidFormSchema = (index: number = 0): FormSchema => ({
    fields: [
      {
        id: `field-${index}`,
        label: `Test Field ${index}`,
        fieldName: `testField${index}`,
        type: 'text',
        order: 1,
        required: false,
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
  } as FormSchema);

  beforeAll(async () => {
    // Create test database connection
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'nodeangularfullstack',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'dbpassword',
    });

    console.log('\n🧪 Starting Templates Service Integration Tests...');
  });

  afterAll(async () => {
    // Cleanup test data
    if (testTemplateIds.length > 0) {
      await pool.query(
        'DELETE FROM form_templates WHERE id = ANY($1)',
        [testTemplateIds]
      );
    }
    await pool.end();
    console.log('✅ Service integration tests completed and cleaned up\n');
  });

  describe('Service + Repository Integration', () => {
    it('should create template with validation and persist to database', async () => {
      const templateData: CreateFormTemplateRequest = {
        name: 'Integration Test Template',
        description: 'Testing service + repository integration',
        category: TemplateCategory.DATA_COLLECTION,
        templateSchema: createValidFormSchema(0),
      };

      const created = await templatesService.createTemplate(templateData);

      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.name).toBe('Integration Test Template');
      expect(created.isActive).toBe(true);
      expect(created.usageCount).toBe(0);

      testTemplateIds.push(created.id);

      // Verify in database
      const dbResult = await pool.query(
        'SELECT * FROM form_templates WHERE id = $1',
        [created.id]
      );

      expect(dbResult.rows.length).toBe(1);
      expect(dbResult.rows[0].name).toBe('Integration Test Template');

      console.log('  ✓ Service validation + database persistence working');
    });

    it('should validate business logic config and reject invalid config', async () => {
      const templateData: CreateFormTemplateRequest = {
        name: 'Invalid Config Test',
        description: 'Testing business logic validation',
        category: TemplateCategory.ECOMMERCE,
        templateSchema: createValidFormSchema(1),
        businessLogicConfig: {
          type: 'quiz', // Invalid for ECOMMERCE category
          scoringRules: { q1: 'answer1' },
        },
      };

      await expect(templatesService.createTemplate(templateData)).rejects.toThrow(
        /Invalid business logic config type/
      );

      // Verify nothing was written to database
      const dbResult = await pool.query(
        'SELECT * FROM form_templates WHERE name = $1',
        ['Invalid Config Test']
      );

      expect(dbResult.rows.length).toBe(0);

      console.log('  ✓ Service validation prevents invalid data from reaching database');
    });

    it('should enforce 100KB size limit in service layer', async () => {
      // Create large schema exceeding 100KB
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
        settings: createValidFormSchema(0).settings,
      } as FormSchema;

      const templateData: CreateFormTemplateRequest = {
        name: 'Oversized Template',
        description: 'Testing size validation',
        category: TemplateCategory.DATA_COLLECTION,
        templateSchema: largeSchema,
      };

      await expect(templatesService.createTemplate(templateData)).rejects.toThrow(
        /exceeds 100KB limit/
      );

      // Verify nothing was written to database
      const dbResult = await pool.query(
        'SELECT * FROM form_templates WHERE name = $1',
        ['Oversized Template']
      );

      expect(dbResult.rows.length).toBe(0);

      console.log('  ✓ Service size validation prevents oversized schemas');
    });
  });

  describe('Template Application Flow', () => {
    it('should apply template with deep clone and atomic usage increment', async () => {
      // Create template
      const templateData: CreateFormTemplateRequest = {
        name: 'Application Flow Test',
        description: 'Testing template application',
        category: TemplateCategory.QUIZ,
        templateSchema: createValidFormSchema(2),
        businessLogicConfig: {
          type: 'quiz',
          scoringRules: { q1: 'answer_a', q2: 'answer_b' },
          passingScore: 70,
        },
      };

      const created = await templatesService.createTemplate(templateData);
      testTemplateIds.push(created.id);

      // Apply template
      const formSchema = await templatesService.applyTemplateToForm(created.id);

      // Verify deep clone
      expect(formSchema).toEqual(created.templateSchema);
      expect(formSchema).not.toBe(created.templateSchema); // Different object reference

      // Verify usage count incremented atomically
      const updated = await templatesRepository.findById(created.id);
      expect(updated?.usageCount).toBe(1);

      // Apply again and verify increment
      await templatesService.applyTemplateToForm(created.id);
      const updated2 = await templatesRepository.findById(created.id);
      expect(updated2?.usageCount).toBe(2);

      console.log('  ✓ Template application flow working (deep clone + atomic increment)');
    });

    it('should reject applying inactive template', async () => {
      // Create template
      const templateData: CreateFormTemplateRequest = {
        name: 'Inactive Template Test',
        description: 'Testing inactive template rejection',
        category: TemplateCategory.SERVICES,
        templateSchema: createValidFormSchema(3),
      };

      const created = await templatesService.createTemplate(templateData);
      testTemplateIds.push(created.id);

      // Deactivate template
      await templatesRepository.update(created.id, { isActive: false });

      // Attempt to apply inactive template
      await expect(templatesService.applyTemplateToForm(created.id)).rejects.toThrow(
        /not active and cannot be used/
      );

      // Verify usage count NOT incremented
      const updated = await templatesRepository.findById(created.id);
      expect(updated?.usageCount).toBe(0);

      console.log('  ✓ Service prevents applying inactive templates');
    });
  });

  describe('Duplicate Field Validation Integration', () => {
    it('should reject template with duplicate field IDs before database insert', async () => {
      const invalidSchema: FormSchema = {
        fields: [
          {
            id: 'duplicate-id',
            label: 'Field 1',
            fieldName: 'field1',
            type: 'text',
            order: 1,
          },
          {
            id: 'duplicate-id', // Duplicate ID
            label: 'Field 2',
            fieldName: 'field2',
            type: 'text',
            order: 2,
          },
        ],
        settings: createValidFormSchema(0).settings,
      } as FormSchema;

      const templateData: CreateFormTemplateRequest = {
        name: 'Duplicate ID Test',
        description: 'Testing duplicate field ID validation',
        category: TemplateCategory.DATA_COLLECTION,
        templateSchema: invalidSchema,
      };

      await expect(templatesService.createTemplate(templateData)).rejects.toThrow(
        /Duplicate field ID/
      );

      // Verify nothing was written to database
      const dbResult = await pool.query(
        'SELECT * FROM form_templates WHERE name = $1',
        ['Duplicate ID Test']
      );

      expect(dbResult.rows.length).toBe(0);

      console.log('  ✓ Duplicate field ID validation prevents database corruption');
    });

    it('should reject template with duplicate fieldNames before database insert', async () => {
      const invalidSchema: FormSchema = {
        fields: [
          {
            id: 'field1',
            label: 'Field 1',
            fieldName: 'email', // Duplicate fieldName
            type: 'text',
            order: 1,
          },
          {
            id: 'field2',
            label: 'Field 2',
            fieldName: 'email', // Duplicate fieldName
            type: 'email',
            order: 2,
          },
        ],
        settings: createValidFormSchema(0).settings,
      } as FormSchema;

      const templateData: CreateFormTemplateRequest = {
        name: 'Duplicate FieldName Test',
        description: 'Testing duplicate fieldName validation',
        category: TemplateCategory.DATA_COLLECTION,
        templateSchema: invalidSchema,
      };

      await expect(templatesService.createTemplate(templateData)).rejects.toThrow(
        /Duplicate fieldName/
      );

      // Verify nothing was written to database
      const dbResult = await pool.query(
        'SELECT * FROM form_templates WHERE name = $1',
        ['Duplicate FieldName Test']
      );

      expect(dbResult.rows.length).toBe(0);

      console.log('  ✓ Duplicate fieldName validation prevents database corruption');
    });
  });

  describe('Update Operations with Database', () => {
    it('should validate business logic config during update', async () => {
      // Create template
      const templateData: CreateFormTemplateRequest = {
        name: 'Update Validation Test',
        description: 'Testing update validation',
        category: TemplateCategory.ECOMMERCE,
        templateSchema: createValidFormSchema(4),
        businessLogicConfig: {
          type: 'inventory',
          stockField: 'product_id',
          variantField: 'size',
          quantityField: 'quantity',
          stockTable: 'inventory',
          decrementOnSubmit: true,
        },
      };

      const created = await templatesService.createTemplate(templateData);
      testTemplateIds.push(created.id);

      // Attempt to update with invalid business logic config
      await expect(
        templatesService.updateTemplate(created.id, {
          businessLogicConfig: {
            type: 'quiz', // Invalid for ECOMMERCE category
            scoringRules: { q1: 'answer1' },
          },
        })
      ).rejects.toThrow(/Invalid business logic config type/);

      // Verify database unchanged
      const dbResult = await pool.query(
        'SELECT business_logic_config FROM form_templates WHERE id = $1',
        [created.id]
      );

      expect(dbResult.rows[0].business_logic_config.type).toBe('inventory');

      console.log('  ✓ Service validates business logic config during update');
    });
  });

  describe('Error Handling and Database Consistency', () => {
    it('should handle database connection errors gracefully', async () => {
      // Create service with invalid repository (will cause database error)
      const invalidRepo: any = {
        create: jest.fn().mockRejectedValue(new Error('Database connection lost')),
      };

      const serviceWithInvalidRepo = new TemplatesService(invalidRepo);

      const templateData: CreateFormTemplateRequest = {
        name: 'Error Handling Test',
        description: 'Testing error handling',
        category: TemplateCategory.DATA_COLLECTION,
        templateSchema: createValidFormSchema(5),
      };

      await expect(
        serviceWithInvalidRepo.createTemplate(templateData)
      ).rejects.toThrow();

      console.log('  ✓ Service handles database errors gracefully');
    });

    it('should maintain database consistency on validation failure', async () => {
      const initialCount = await pool.query('SELECT COUNT(*) FROM form_templates');
      const initialCountValue = parseInt(initialCount.rows[0].count);

      // Attempt to create invalid template
      const invalidTemplateData: CreateFormTemplateRequest = {
        name: 'Consistency Test',
        description: 'Testing database consistency',
        category: TemplateCategory.DATA_COLLECTION,
        templateSchema: {
          ...createValidFormSchema(0),
          fields: [], // Empty fields array (invalid)
        },
      };

      await expect(
        templatesService.createTemplate(invalidTemplateData)
      ).rejects.toThrow(/at least one field/);

      // Verify database count unchanged
      const finalCount = await pool.query('SELECT COUNT(*) FROM form_templates');
      const finalCountValue = parseInt(finalCount.rows[0].count);

      expect(finalCountValue).toBe(initialCountValue);

      console.log('  ✓ Database consistency maintained on validation failure');
    });
  });
});
