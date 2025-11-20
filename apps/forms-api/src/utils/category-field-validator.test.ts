/**
 * Category Field Validator Tests
 *
 * Epic 29, Story 29.1: Backend Validation Engine
 *
 * Comprehensive test suite covering all 6 categories with:
 * - Valid template tests (6 tests)
 * - Missing field tests (6 tests)
 * - Wrong type tests (6 tests)
 * - Edge cases (6+ tests)
 * - Performance benchmarks
 *
 * Total: 24+ test cases with 100% branch coverage
 *
 * @since 2025-11-19
 */

import { describe, it, expect } from '@jest/globals';
import { CategoryFieldValidator, FieldMetadata } from './category-field-validator';
import { TemplateCategory, FormSchema, FormField } from '@nodeangularfullstack/shared';

// Helper function to create a minimal form schema
const createSchema = (fields: FormField[]): FormSchema => ({
  id: 'test-schema-id',
  formId: 'test-form-id',
  version: 1,
  isPublished: false,
  fields,
  settings: {
    layout: { columns: 1, spacing: 'medium' },
    submission: { showSuccessMessage: true, successMessage: 'Thank you!', allowMultipleSubmissions: false }
  },
  createdAt: new Date(),
  updatedAt: new Date()
} as FormSchema);

// Helper function to create a form field
const createField = (
  fieldName: string,
  type: string,
  metadata?: FieldMetadata
): FormField => ({
  id: `field_${fieldName}`,
  fieldName,
  label: fieldName,
  type,
  required: false,
  order: 0,
  metadata
} as FormField);

describe('CategoryFieldValidator', () => {
  describe('POLLS Category - Valid Templates', () => {
    it('should validate poll template with SELECT poll_option field', () => {
      const schema = createSchema([
        createField('poll_option', 'SELECT')
      ]);

      const result = CategoryFieldValidator.validateCategoryFields(
        TemplateCategory.POLLS,
        schema
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.satisfiedCount).toBe(1);
      expect(result.totalCount).toBe(1);
    });

    it('should validate poll template with RADIO poll_option field', () => {
      const schema = createSchema([
        createField('poll_option', 'RADIO')
      ]);

      const result = CategoryFieldValidator.validateCategoryFields(
        TemplateCategory.POLLS,
        schema
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('QUIZ Category - Valid Templates', () => {
    it('should validate quiz template with question fields and correctAnswer metadata', () => {
      const schema = createSchema([
        createField('question_1', 'SELECT', { correctAnswer: 'option_a' }),
        createField('question_2', 'RADIO', { correctAnswer: 'option_b' }),
        createField('question_3', 'CHECKBOX', { correctAnswer: 'option_c' })
      ]);

      const result = CategoryFieldValidator.validateCategoryFields(
        TemplateCategory.QUIZ,
        schema
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.satisfiedCount).toBe(1);
    });

    it('should validate quiz template with minimum 1 question field', () => {
      const schema = createSchema([
        createField('question_1', 'SELECT', { correctAnswer: 'answer' })
      ]);

      const result = CategoryFieldValidator.validateCategoryFields(
        TemplateCategory.QUIZ,
        schema
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('ECOMMERCE Category - Valid Templates', () => {
    it('should validate ecommerce template with all required fields', () => {
      const schema = createSchema([
        createField('product_id', 'SELECT'),
        createField('quantity', 'NUMBER'),
        createField('price', 'NUMBER')
      ]);

      const result = CategoryFieldValidator.validateCategoryFields(
        TemplateCategory.ECOMMERCE,
        schema
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.satisfiedCount).toBe(3);
      expect(result.totalCount).toBe(3);
    });
  });

  describe('SERVICES Category - Valid Templates', () => {
    it('should validate service template with TIME_SLOT field', () => {
      const schema = createSchema([
        createField('date', 'DATE'),
        createField('time_slot', 'TIME_SLOT')
      ]);

      const result = CategoryFieldValidator.validateCategoryFields(
        TemplateCategory.SERVICES,
        schema
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.satisfiedCount).toBe(2);
    });

    it('should validate service template with SELECT time_slot field', () => {
      const schema = createSchema([
        createField('date', 'DATE'),
        createField('time_slot', 'SELECT')
      ]);

      const result = CategoryFieldValidator.validateCategoryFields(
        TemplateCategory.SERVICES,
        schema
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('DATA_COLLECTION Category - Valid Templates', () => {
    it('should validate data collection template with menu fields', () => {
      const schema = createSchema([
        createField('menu_item', 'SELECT'),
        createField('quantity', 'NUMBER')
      ]);

      const result = CategoryFieldValidator.validateCategoryFields(
        TemplateCategory.DATA_COLLECTION,
        schema
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.satisfiedCount).toBe(2);
    });
  });

  describe('EVENTS Category - Valid Templates', () => {
    it('should validate event template with RADIO rsvp_status field', () => {
      const schema = createSchema([
        createField('attendee_name', 'TEXT'),
        createField('rsvp_status', 'RADIO')
      ]);

      const result = CategoryFieldValidator.validateCategoryFields(
        TemplateCategory.EVENTS,
        schema
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.satisfiedCount).toBe(2);
    });

    it('should validate event template with SELECT rsvp_status field', () => {
      const schema = createSchema([
        createField('attendee_name', 'TEXT'),
        createField('rsvp_status', 'SELECT')
      ]);

      const result = CategoryFieldValidator.validateCategoryFields(
        TemplateCategory.EVENTS,
        schema
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('POLLS Category - Missing Fields', () => {
    it('should detect missing poll_option field', () => {
      const schema = createSchema([
        createField('voter_name', 'TEXT')
      ]);

      const result = CategoryFieldValidator.validateCategoryFields(
        TemplateCategory.POLLS,
        schema
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('poll_option');
      expect(result.errors[0].errorType).toBe('MISSING_FIELD');
      expect(result.errors[0].message).toContain('poll_option');
      expect(result.errors[0].autoFixSuggestion).toContain('Add a SELECT field');
    });
  });

  describe('QUIZ Category - Missing Fields', () => {
    it('should detect missing question fields', () => {
      const schema = createSchema([
        createField('student_name', 'TEXT')
      ]);

      const result = CategoryFieldValidator.validateCategoryFields(
        TemplateCategory.QUIZ,
        schema
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].errorType).toBe('MISSING_FIELD');
      expect(result.errors[0].message).toContain('question');
      expect(result.errors[0].autoFixSuggestion).toContain('question_1');
    });
  });

  describe('ECOMMERCE Category - Missing Fields', () => {
    it('should detect all missing ecommerce fields', () => {
      const schema = createSchema([
        createField('customer_name', 'TEXT')
      ]);

      const result = CategoryFieldValidator.validateCategoryFields(
        TemplateCategory.ECOMMERCE,
        schema
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);

      const fieldNames = result.errors.map(e => e.field);
      expect(fieldNames).toContain('product_id');
      expect(fieldNames).toContain('quantity');
      expect(fieldNames).toContain('price');
    });

    it('should detect partially missing ecommerce fields', () => {
      const schema = createSchema([
        createField('product_id', 'SELECT'),
        createField('quantity', 'NUMBER')
        // Missing: price
      ]);

      const result = CategoryFieldValidator.validateCategoryFields(
        TemplateCategory.ECOMMERCE,
        schema
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('price');
      expect(result.errors[0].message).toContain('price');
    });
  });

  describe('SERVICES Category - Missing Fields', () => {
    it('should detect missing service fields', () => {
      const schema = createSchema([
        createField('customer_name', 'TEXT')
      ]);

      const result = CategoryFieldValidator.validateCategoryFields(
        TemplateCategory.SERVICES,
        schema
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);

      const fieldNames = result.errors.map(e => e.field);
      expect(fieldNames).toContain('date');
      expect(fieldNames).toContain('time_slot');
    });
  });

  describe('DATA_COLLECTION Category - Missing Fields', () => {
    it('should detect missing data collection fields', () => {
      const schema = createSchema([
        createField('customer_email', 'EMAIL')
      ]);

      const result = CategoryFieldValidator.validateCategoryFields(
        TemplateCategory.DATA_COLLECTION,
        schema
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);

      const fieldNames = result.errors.map(e => e.field);
      expect(fieldNames).toContain('menu_item');
      expect(fieldNames).toContain('quantity');
    });
  });

  describe('EVENTS Category - Missing Fields', () => {
    it('should detect missing event fields', () => {
      const schema = createSchema([
        createField('event_name', 'TEXT')
      ]);

      const result = CategoryFieldValidator.validateCategoryFields(
        TemplateCategory.EVENTS,
        schema
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);

      const fieldNames = result.errors.map(e => e.field);
      expect(fieldNames).toContain('attendee_name');
      expect(fieldNames).toContain('rsvp_status');
    });
  });

  describe('POLLS Category - Wrong Type', () => {
    it('should detect wrong type for poll_option field', () => {
      const schema = createSchema([
        createField('poll_option', 'TEXT') // Should be SELECT or RADIO
      ]);

      const result = CategoryFieldValidator.validateCategoryFields(
        TemplateCategory.POLLS,
        schema
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('poll_option');
      expect(result.errors[0].expectedType).toEqual(['SELECT', 'RADIO']);
      expect(result.errors[0].actualType).toBe('TEXT');
      expect(result.errors[0].errorType).toBe('WRONG_TYPE');
      expect(result.errors[0].message).toContain('TEXT');
      expect(result.errors[0].message).toContain('SELECT or RADIO');
      expect(result.errors[0].autoFixSuggestion).toContain('Change field');
    });
  });

  describe('QUIZ Category - Wrong Type', () => {
    it('should detect wrong type for question fields', () => {
      const schema = createSchema([
        createField('question_1', 'TEXT', { correctAnswer: 'answer' }) // Should be SELECT, RADIO, or CHECKBOX
      ]);

      const result = CategoryFieldValidator.validateCategoryFields(
        TemplateCategory.QUIZ,
        schema
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('question_1');
      expect(result.errors[0].actualType).toBe('TEXT');
      expect(result.errors[0].errorType).toBe('WRONG_TYPE');
      expect(result.errors[0].message).toContain('SELECT, RADIO, or CHECKBOX');
    });
  });

  describe('ECOMMERCE Category - Wrong Type', () => {
    it('should detect wrong type for product_id field', () => {
      const schema = createSchema([
        createField('product_id', 'TEXT'), // Should be SELECT
        createField('quantity', 'NUMBER'),
        createField('price', 'NUMBER')
      ]);

      const result = CategoryFieldValidator.validateCategoryFields(
        TemplateCategory.ECOMMERCE,
        schema
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('product_id');
      expect(result.errors[0].actualType).toBe('TEXT');
      expect(result.errors[0].expectedType).toEqual(['SELECT']);
    });

    it('should detect wrong type for quantity field', () => {
      const schema = createSchema([
        createField('product_id', 'SELECT'),
        createField('quantity', 'TEXT'), // Should be NUMBER
        createField('price', 'NUMBER')
      ]);

      const result = CategoryFieldValidator.validateCategoryFields(
        TemplateCategory.ECOMMERCE,
        schema
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('quantity');
      expect(result.errors[0].actualType).toBe('TEXT');
    });
  });

  describe('SERVICES Category - Wrong Type', () => {
    it('should detect wrong type for date field', () => {
      const schema = createSchema([
        createField('date', 'TEXT'), // Should be DATE
        createField('time_slot', 'TIME_SLOT')
      ]);

      const result = CategoryFieldValidator.validateCategoryFields(
        TemplateCategory.SERVICES,
        schema
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('date');
      expect(result.errors[0].actualType).toBe('TEXT');
      expect(result.errors[0].expectedType).toEqual(['DATE']);
    });

    it('should detect wrong type for time_slot field', () => {
      const schema = createSchema([
        createField('date', 'DATE'),
        createField('time_slot', 'NUMBER') // Should be TIME_SLOT or SELECT
      ]);

      const result = CategoryFieldValidator.validateCategoryFields(
        TemplateCategory.SERVICES,
        schema
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('time_slot');
      expect(result.errors[0].actualType).toBe('NUMBER');
      expect(result.errors[0].expectedType).toEqual(['TIME_SLOT', 'SELECT']);
    });
  });

  describe('DATA_COLLECTION Category - Wrong Type', () => {
    it('should detect wrong type for menu_item field', () => {
      const schema = createSchema([
        createField('menu_item', 'TEXT'), // Should be SELECT
        createField('quantity', 'NUMBER')
      ]);

      const result = CategoryFieldValidator.validateCategoryFields(
        TemplateCategory.DATA_COLLECTION,
        schema
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('menu_item');
      expect(result.errors[0].actualType).toBe('TEXT');
    });
  });

  describe('EVENTS Category - Wrong Type', () => {
    it('should detect wrong type for attendee_name field', () => {
      const schema = createSchema([
        createField('attendee_name', 'NUMBER'), // Should be TEXT
        createField('rsvp_status', 'RADIO')
      ]);

      const result = CategoryFieldValidator.validateCategoryFields(
        TemplateCategory.EVENTS,
        schema
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('attendee_name');
      expect(result.errors[0].actualType).toBe('NUMBER');
      expect(result.errors[0].expectedType).toEqual(['TEXT']);
    });

    it('should detect wrong type for rsvp_status field', () => {
      const schema = createSchema([
        createField('attendee_name', 'TEXT'),
        createField('rsvp_status', 'TEXT') // Should be RADIO or SELECT
      ]);

      const result = CategoryFieldValidator.validateCategoryFields(
        TemplateCategory.EVENTS,
        schema
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('rsvp_status');
      expect(result.errors[0].actualType).toBe('TEXT');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty schema with no fields', () => {
      const schema = createSchema([]);

      const result = CategoryFieldValidator.validateCategoryFields(
        TemplateCategory.POLLS,
        schema
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].errorType).toBe('MISSING_FIELD');
    });

    it('should handle multiple validation errors at once', () => {
      const schema = createSchema([
        createField('product_id', 'TEXT'), // Wrong type
        createField('quantity', 'TEXT'), // Wrong type
        // Missing: price
      ]);

      const result = CategoryFieldValidator.validateCategoryFields(
        TemplateCategory.ECOMMERCE,
        schema
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);

      const wrongTypeErrors = result.errors.filter(e => e.errorType === 'WRONG_TYPE');
      const missingFieldErrors = result.errors.filter(e => e.errorType === 'MISSING_FIELD');

      expect(wrongTypeErrors).toHaveLength(2);
      expect(missingFieldErrors).toHaveLength(1);
    });

    it('should handle quiz with zero question fields (insufficient count)', () => {
      const schema = createSchema([
        createField('student_name', 'TEXT'),
        createField('student_id', 'NUMBER')
      ]);

      const result = CategoryFieldValidator.validateCategoryFields(
        TemplateCategory.QUIZ,
        schema
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].errorType).toBe('MISSING_FIELD');
    });

    it('should detect missing metadata for quiz questions', () => {
      const schema = createSchema([
        createField('question_1', 'SELECT') // Missing correctAnswer metadata
      ]);

      const result = CategoryFieldValidator.validateCategoryFields(
        TemplateCategory.QUIZ,
        schema
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].errorType).toBe('MISSING_METADATA');
      expect(result.errors[0].message).toContain('correctAnswer');
      expect(result.errors[0].autoFixSuggestion).toContain('metadata.correctAnswer');
    });

    it('should validate quiz with multiple questions correctly', () => {
      const schema = createSchema([
        createField('question_1', 'SELECT', { correctAnswer: 'a' }),
        createField('question_2', 'RADIO', { correctAnswer: 'b' }),
        createField('question_10', 'CHECKBOX', { correctAnswer: 'c' })
      ]);

      const result = CategoryFieldValidator.validateCategoryFields(
        TemplateCategory.QUIZ,
        schema
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle quiz with some questions missing metadata', () => {
      const schema = createSchema([
        createField('question_1', 'SELECT', { correctAnswer: 'a' }),
        createField('question_2', 'RADIO') // Missing metadata
      ]);

      const result = CategoryFieldValidator.validateCategoryFields(
        TemplateCategory.QUIZ,
        schema
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('question_2');
      expect(result.errors[0].errorType).toBe('MISSING_METADATA');
    });
  });

  describe('Performance Benchmarks', () => {
    it('should validate poll template in < 50ms', () => {
      const schema = createSchema([
        createField('poll_option', 'SELECT')
      ]);

      const startTime = Date.now();
      CategoryFieldValidator.validateCategoryFields(TemplateCategory.POLLS, schema);
      const elapsedTime = Date.now() - startTime;

      expect(elapsedTime).toBeLessThan(50);
    });

    it('should validate quiz template in < 50ms', () => {
      const schema = createSchema([
        createField('question_1', 'SELECT', { correctAnswer: 'a' }),
        createField('question_2', 'RADIO', { correctAnswer: 'b' }),
        createField('question_3', 'CHECKBOX', { correctAnswer: 'c' })
      ]);

      const startTime = Date.now();
      CategoryFieldValidator.validateCategoryFields(TemplateCategory.QUIZ, schema);
      const elapsedTime = Date.now() - startTime;

      expect(elapsedTime).toBeLessThan(50);
    });

    it('should validate ecommerce template in < 50ms', () => {
      const schema = createSchema([
        createField('product_id', 'SELECT'),
        createField('quantity', 'NUMBER'),
        createField('price', 'NUMBER')
      ]);

      const startTime = Date.now();
      CategoryFieldValidator.validateCategoryFields(TemplateCategory.ECOMMERCE, schema);
      const elapsedTime = Date.now() - startTime;

      expect(elapsedTime).toBeLessThan(50);
    });

    it('should validate large quiz template (10 questions) in < 50ms', () => {
      const fields = Array.from({ length: 10 }, (_, i) =>
        createField(`question_${i + 1}`, 'SELECT', { correctAnswer: `answer_${i}` })
      );
      const schema = createSchema(fields);

      const startTime = Date.now();
      CategoryFieldValidator.validateCategoryFields(TemplateCategory.QUIZ, schema);
      const elapsedTime = Date.now() - startTime;

      expect(elapsedTime).toBeLessThan(50);
    });
  });

  describe('Helper Methods', () => {
    it('should get requirements for a category', () => {
      const requirements = CategoryFieldValidator.getRequirementsForCategory(
        TemplateCategory.POLLS
      );

      expect(requirements).toBeDefined();
      expect(requirements.length).toBeGreaterThan(0);
      expect(requirements[0].fieldName).toBe('poll_option');
    });

    it('should get all validation rules', () => {
      const allRules = CategoryFieldValidator.getAllRules();

      expect(allRules).toBeDefined();
      expect(Object.keys(allRules)).toHaveLength(6);
      expect(allRules[TemplateCategory.POLLS]).toBeDefined();
      expect(allRules[TemplateCategory.QUIZ]).toBeDefined();
      expect(allRules[TemplateCategory.ECOMMERCE]).toBeDefined();
      expect(allRules[TemplateCategory.SERVICES]).toBeDefined();
      expect(allRules[TemplateCategory.DATA_COLLECTION]).toBeDefined();
      expect(allRules[TemplateCategory.EVENTS]).toBeDefined();
    });
  });
});
