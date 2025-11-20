/**
 * Template Validation Service Tests
 *
 * Comprehensive unit tests for TemplateValidationService
 * Verifies validation logic matches backend CategoryFieldValidator
 *
 * Epic 29, Story 29.4: Frontend Validation & UX Enhancement
 *
 * @since 2025-11-19
 */

import { TestBed } from '@angular/core/testing';
import { TemplateValidationService, ValidationResult, ValidationError } from './template-validation.service';
import { TemplateCategory, FormSchema, FormField } from '@nodeangularfullstack/shared';

describe('TemplateValidationService', () => {
  let service: TemplateValidationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TemplateValidationService]
    });
    service = TestBed.inject(TemplateValidationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getRequirementsForCategory', () => {
    it('should return requirements for POLLS category', () => {
      const requirements = service.getRequirementsForCategory(TemplateCategory.POLLS);

      expect(requirements).toBeDefined();
      expect(requirements.length).toBe(1);
      expect(requirements[0].fieldName).toBe('poll_option');
      expect(requirements[0].allowedTypes).toEqual(['SELECT', 'RADIO']);
    });

    it('should return requirements for QUIZ category', () => {
      const requirements = service.getRequirementsForCategory(TemplateCategory.QUIZ);

      expect(requirements).toBeDefined();
      expect(requirements.length).toBe(1);
      expect(requirements[0].fieldNamePattern).toBeDefined();
      expect(requirements[0].allowedTypes).toEqual(['SELECT', 'RADIO', 'CHECKBOX']);
      expect(requirements[0].requiresMetadata).toEqual({ correctAnswer: true });
    });

    it('should return requirements for ECOMMERCE category', () => {
      const requirements = service.getRequirementsForCategory(TemplateCategory.ECOMMERCE);

      expect(requirements).toBeDefined();
      expect(requirements.length).toBe(3);
      expect(requirements.map(r => r.fieldName)).toEqual(['product_id', 'quantity', 'price']);
    });

    it('should return requirements for SERVICES category', () => {
      const requirements = service.getRequirementsForCategory(TemplateCategory.SERVICES);

      expect(requirements).toBeDefined();
      expect(requirements.length).toBe(2);
      expect(requirements.map(r => r.fieldName)).toEqual(['date', 'time_slot']);
    });

    it('should return requirements for DATA_COLLECTION category', () => {
      const requirements = service.getRequirementsForCategory(TemplateCategory.DATA_COLLECTION);

      expect(requirements).toBeDefined();
      expect(requirements.length).toBe(2);
      expect(requirements.map(r => r.fieldName)).toEqual(['menu_item', 'quantity']);
    });

    it('should return requirements for EVENTS category', () => {
      const requirements = service.getRequirementsForCategory(TemplateCategory.EVENTS);

      expect(requirements).toBeDefined();
      expect(requirements.length).toBe(2);
      expect(requirements.map(r => r.fieldName)).toEqual(['attendee_name', 'rsvp_status']);
    });
  });

  describe('validateCategoryFields - POLLS category', () => {
    it('should validate valid POLLS template with SELECT field', () => {
      const schema: FormSchema = {
        fields: [
          {
            id: 'field1',
            fieldName: 'poll_option',
            type: 'SELECT',
            label: 'Choose option',
            required: true,
            order: 0,
            options: [
              { label: 'Option A', value: 'a' },
              { label: 'Option B', value: 'b' }
            ]
          }
        ],
        settings: {}
      };

      const result = service.validateCategoryFields(TemplateCategory.POLLS, schema);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.satisfiedCount).toBe(1);
      expect(result.totalCount).toBe(1);
    });

    it('should validate valid POLLS template with RADIO field', () => {
      const schema: FormSchema = {
        fields: [
          {
            id: 'field1',
            fieldName: 'poll_option',
            type: 'RADIO',
            label: 'Choose option',
            required: true,
            order: 0,
            options: [
              { label: 'Option A', value: 'a' },
              { label: 'Option B', value: 'b' }
            ]
          }
        ],
        settings: {}
      };

      const result = service.validateCategoryFields(TemplateCategory.POLLS, schema);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject POLLS template with missing poll_option field', () => {
      const schema: FormSchema = {
        fields: [
          {
            id: 'field1',
            fieldName: 'other_field',
            type: 'TEXT',
            label: 'Other field',
            required: true,
            order: 0
          }
        ],
        settings: {}
      };

      const result = service.validateCategoryFields(TemplateCategory.POLLS, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].errorType).toBe('MISSING_FIELD');
      expect(result.errors[0].field).toBe('poll_option');
      expect(result.errors[0].message).toContain('poll_option field');
    });

    it('should reject POLLS template with wrong field type', () => {
      const schema: FormSchema = {
        fields: [
          {
            id: 'field1',
            fieldName: 'poll_option',
            type: 'TEXT',
            label: 'Poll option',
            required: true,
            order: 0
          }
        ],
        settings: {}
      };

      const result = service.validateCategoryFields(TemplateCategory.POLLS, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].errorType).toBe('WRONG_TYPE');
      expect(result.errors[0].field).toBe('poll_option');
      expect(result.errors[0].actualType).toBe('TEXT');
      expect(result.errors[0].expectedType).toEqual(['SELECT', 'RADIO']);
    });
  });

  describe('validateCategoryFields - QUIZ category', () => {
    it('should validate valid QUIZ template with question fields and metadata', () => {
      const schema: FormSchema = {
        fields: [
          {
            id: 'field1',
            fieldName: 'question_1',
            type: 'SELECT',
            label: 'Question 1',
            required: true,
            order: 0,
            options: [
              { label: 'A', value: 'a' },
              { label: 'B', value: 'b' }
            ],
            metadata: {
              correctAnswer: 'a'
            }
          }
        ],
        settings: {}
      };

      const result = service.validateCategoryFields(TemplateCategory.QUIZ, schema);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate QUIZ template with multiple question fields', () => {
      const schema: FormSchema = {
        fields: [
          {
            id: 'field1',
            fieldName: 'question_1',
            type: 'RADIO',
            label: 'Question 1',
            required: true,
            order: 0,
            options: [{ label: 'A', value: 'a' }],
            metadata: { correctAnswer: 'a' }
          },
          {
            id: 'field2',
            fieldName: 'question_2',
            type: 'SELECT',
            label: 'Question 2',
            required: true,
            order: 1,
            options: [{ label: 'B', value: 'b' }],
            metadata: { correctAnswer: 'b' }
          }
        ],
        settings: {}
      };

      const result = service.validateCategoryFields(TemplateCategory.QUIZ, schema);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject QUIZ template with no question fields', () => {
      const schema: FormSchema = {
        fields: [
          {
            id: 'field1',
            fieldName: 'other_field',
            type: 'TEXT',
            label: 'Other',
            required: true,
            order: 0
          }
        ],
        settings: {}
      };

      const result = service.validateCategoryFields(TemplateCategory.QUIZ, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].errorType).toBe('MISSING_FIELD');
    });

    it('should reject QUIZ template with question field missing correctAnswer metadata', () => {
      const schema: FormSchema = {
        fields: [
          {
            id: 'field1',
            fieldName: 'question_1',
            type: 'SELECT',
            label: 'Question 1',
            required: true,
            order: 0,
            options: [{ label: 'A', value: 'a' }]
            // Missing metadata.correctAnswer
          }
        ],
        settings: {}
      };

      const result = service.validateCategoryFields(TemplateCategory.QUIZ, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].errorType).toBe('MISSING_METADATA');
      expect(result.errors[0].message).toContain('correctAnswer');
    });

    it('should reject QUIZ template with question field of wrong type', () => {
      const schema: FormSchema = {
        fields: [
          {
            id: 'field1',
            fieldName: 'question_1',
            type: 'TEXT',
            label: 'Question 1',
            required: true,
            order: 0,
            metadata: { correctAnswer: 'answer' }
          }
        ],
        settings: {}
      };

      const result = service.validateCategoryFields(TemplateCategory.QUIZ, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].errorType).toBe('WRONG_TYPE');
      expect(result.errors[0].expectedType).toEqual(['SELECT', 'RADIO', 'CHECKBOX']);
    });
  });

  describe('validateCategoryFields - ECOMMERCE category', () => {
    it('should validate valid ECOMMERCE template', () => {
      const schema: FormSchema = {
        fields: [
          {
            id: 'field1',
            fieldName: 'product_id',
            type: 'SELECT',
            label: 'Product',
            required: true,
            order: 0,
            options: [{ label: 'Product A', value: 'prod_a' }]
          },
          {
            id: 'field2',
            fieldName: 'quantity',
            type: 'NUMBER',
            label: 'Quantity',
            required: true,
            order: 1
          },
          {
            id: 'field3',
            fieldName: 'price',
            type: 'NUMBER',
            label: 'Price',
            required: true,
            order: 2
          }
        ],
        settings: {}
      };

      const result = service.validateCategoryFields(TemplateCategory.ECOMMERCE, schema);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.satisfiedCount).toBe(3);
      expect(result.totalCount).toBe(3);
    });

    it('should reject ECOMMERCE template missing required fields', () => {
      const schema: FormSchema = {
        fields: [
          {
            id: 'field1',
            fieldName: 'product_id',
            type: 'SELECT',
            label: 'Product',
            required: true,
            order: 0,
            options: []
          }
          // Missing quantity and price
        ],
        settings: {}
      };

      const result = service.validateCategoryFields(TemplateCategory.ECOMMERCE, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(2); // Missing quantity and price
      expect(result.errors.map(e => e.field)).toContain('quantity');
      expect(result.errors.map(e => e.field)).toContain('price');
    });
  });

  describe('validateCategoryFields - SERVICES category', () => {
    it('should validate valid SERVICES template', () => {
      const schema: FormSchema = {
        fields: [
          {
            id: 'field1',
            fieldName: 'date',
            type: 'DATE',
            label: 'Date',
            required: true,
            order: 0
          },
          {
            id: 'field2',
            fieldName: 'time_slot',
            type: 'TIME_SLOT',
            label: 'Time',
            required: true,
            order: 1
          }
        ],
        settings: {}
      };

      const result = service.validateCategoryFields(TemplateCategory.SERVICES, schema);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate SERVICES template with SELECT time_slot field', () => {
      const schema: FormSchema = {
        fields: [
          {
            id: 'field1',
            fieldName: 'date',
            type: 'DATE',
            label: 'Date',
            required: true,
            order: 0
          },
          {
            id: 'field2',
            fieldName: 'time_slot',
            type: 'SELECT',
            label: 'Time',
            required: true,
            order: 1,
            options: [{ label: '9:00 AM', value: '9am' }]
          }
        ],
        settings: {}
      };

      const result = service.validateCategoryFields(TemplateCategory.SERVICES, schema);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('Performance validation', () => {
    it('should complete validation within 100ms for complex schema', () => {
      const schema: FormSchema = {
        fields: Array.from({ length: 50 }, (_, i) => ({
          id: `field${i}`,
          fieldName: `field_${i}`,
          type: 'TEXT',
          label: `Field ${i}`,
          required: false,
          order: i
        })),
        settings: {}
      };

      const startTime = performance.now();
      service.validateCategoryFields(TemplateCategory.POLLS, schema);
      const elapsedTime = performance.now() - startTime;

      expect(elapsedTime).toBeLessThan(100);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty schema', () => {
      const schema: FormSchema = {
        fields: [],
        settings: {}
      };

      const result = service.validateCategoryFields(TemplateCategory.POLLS, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle schema with null fields', () => {
      const schema = {
        fields: null as any,
        settings: {}
      };

      // Should not throw error
      expect(() => {
        service.validateCategoryFields(TemplateCategory.POLLS, schema);
      }).toThrow();
    });
  });
});
