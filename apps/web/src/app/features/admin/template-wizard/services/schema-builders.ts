/**
 * Template Wizard Schema Builders
 * Transforms wizard configuration into FormSchema objects compatible with Epic 29 templates.
 * Generates category-specific fields and business logic configurations.
 *
 * @since Epic 30, Story 30.9
 */

import {
  FormSchema,
  FormField,
  FormFieldType,
  TemplateCategory,
  PollLogicConfig,
  QuizConfig,
  InventoryConfig,
  AppointmentConfig,
  OrderConfig,
} from '@nodeangularfullstack/shared';
import { WizardConfig } from './template-wizard.service';

/**
 * Generates unique field ID with timestamp.
 * @param prefix - Field ID prefix
 * @returns Unique field identifier
 */
/**
 * Constants for field ID generation
 */
const RANDOM_STRING_START = 2;
const RANDOM_STRING_LENGTH = 9;
const RADIX_BASE_36 = 36;

/**
 * Generates unique field ID with timestamp.
 * @param prefix - Field ID prefix
 * @returns Unique field identifier
 */
function generateFieldId(prefix: string): string {
  const randomPart = Math.random()
    .toString(RADIX_BASE_36)
    .substring(RANDOM_STRING_START, RANDOM_STRING_START + RANDOM_STRING_LENGTH);
  return `${prefix}_${Date.now()}_${randomPart}`;
}

/**
 * Builds FormSchema for poll templates.
 * Creates single-select or radio field for poll question with options.
 *
 * @param config - Wizard configuration
 * @returns FormSchema with poll fields and business logic
 *
 * @example
 * ```typescript
 * const schema = buildPollSchema({
 *   templateName: 'Customer Satisfaction Poll',
 *   templateDescription: 'Rate our service',
 *   categoryData: { minOptions: 2, maxOptions: 5, voteTracking: 'session' }
 * });
 * ```
 */
export function buildPollSchema(config: WizardConfig): FormSchema {
  const pollFieldId = generateFieldId('poll_question');

  // Create poll question field with radio options
  const pollField: FormField = {
    id: pollFieldId,
    type: FormFieldType.RADIO,
    label: config.templateName || 'Poll Question',
    fieldName: 'poll_vote',
    placeholder: 'Select an option',
    helpText: 'Choose one option',
    required: true,
    options: [
      { label: 'Option 1', value: 'option_1' },
      { label: 'Option 2', value: 'option_2' },
    ],
    order: 0,
  };

  // Build poll business logic configuration
  const businessLogicConfig: PollLogicConfig = {
    type: 'poll',
    voteField: pollFieldId,
    preventDuplicates: true,
    showResultsAfterVote: true,
    trackingMethod:
      (config.categoryData.voteTracking as 'session' | 'ip' | 'fingerprint') || 'session',
    allowChangeVote: false,
  };

  return {
    id: `schema_${Date.now()}`,
    formId: `form_${Date.now()}`,
    version: 1,
    fields: [pollField],
    settings: {
      layout: { columns: 1, spacing: 'medium' },
      submission: {
        showSuccessMessage: true,
        successMessage: 'Thank you for voting!',
        allowMultipleSubmissions: false,
      },
      templateCategory: TemplateCategory.POLLS,
    },
    category: TemplateCategory.POLLS,
    businessLogicConfig,
    isPublished: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Builds FormSchema for quiz templates.
 * Creates multiple-choice questions with correct answer scoring.
 *
 * @param config - Wizard configuration
 * @returns FormSchema with quiz fields and scoring logic
 *
 * @example
 * ```typescript
 * const schema = buildQuizSchema({
 *   templateName: 'JavaScript Basics Quiz',
 *   templateDescription: 'Test your JS knowledge',
 *   categoryData: { minQuestions: 3, passingScore: 70, allowRetakes: true }
 * });
 * ```
 */
export function buildQuizSchema(config: WizardConfig): FormSchema {
  const question1Id = generateFieldId('quiz_q1');
  const question2Id = generateFieldId('quiz_q2');

  // Create sample quiz questions
  const fields: FormField[] = [
    {
      id: question1Id,
      type: FormFieldType.RADIO,
      label: 'Question 1',
      fieldName: 'question_1',
      placeholder: 'Select answer',
      required: true,
      options: [
        { label: 'Answer A', value: 'a' },
        { label: 'Answer B', value: 'b' },
        { label: 'Answer C', value: 'c' },
      ],
      order: 0,
    },
    {
      id: question2Id,
      type: FormFieldType.RADIO,
      label: 'Question 2',
      fieldName: 'question_2',
      placeholder: 'Select answer',
      required: true,
      options: [
        { label: 'Answer A', value: 'a' },
        { label: 'Answer B', value: 'b' },
        { label: 'Answer C', value: 'c' },
      ],
      order: 1,
    },
  ];

  // Build quiz scoring configuration
  const businessLogicConfig: QuizConfig = {
    type: 'quiz',
    scoringRules: [
      { fieldId: question1Id, correctAnswer: 'a', points: 1 },
      { fieldId: question2Id, correctAnswer: 'b', points: 1 },
    ],
    passingScore: config.categoryData.passingScore || 70,
    showResults: true,
    allowRetakes: config.categoryData.allowRetakes ?? true,
  };

  return {
    id: `schema_${Date.now()}`,
    formId: `form_${Date.now()}`,
    version: 1,
    fields,
    settings: {
      layout: { columns: 1, spacing: 'medium' },
      submission: {
        showSuccessMessage: true,
        successMessage: 'Quiz submitted! Check your score.',
        allowMultipleSubmissions: config.categoryData.allowRetakes ?? true,
      },
      templateCategory: TemplateCategory.QUIZ,
    },
    category: TemplateCategory.QUIZ,
    businessLogicConfig,
    isPublished: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Builds FormSchema for product/ecommerce templates.
 * Creates product selection fields with inventory tracking.
 *
 * @param config - Wizard configuration
 * @returns FormSchema with product fields and inventory logic
 *
 * @example
 * ```typescript
 * const schema = buildProductSchema({
 *   templateName: 'T-Shirt Order Form',
 *   templateDescription: 'Order custom t-shirts',
 *   categoryData: { enableInventory: true, enableTax: false }
 * });
 * ```
 */
export function buildProductSchema(config: WizardConfig): FormSchema {
  const productFieldId = generateFieldId('product');
  const quantityFieldId = generateFieldId('quantity');

  const fields: FormField[] = [
    {
      id: productFieldId,
      type: FormFieldType.SELECT,
      label: 'Product',
      fieldName: 'product_selection',
      placeholder: 'Choose product',
      required: true,
      options: [
        { label: 'Product A', value: 'product_a' },
        { label: 'Product B', value: 'product_b' },
      ],
      order: 0,
    },
    {
      id: quantityFieldId,
      type: FormFieldType.NUMBER,
      label: 'Quantity',
      fieldName: 'quantity',
      placeholder: 'Enter quantity',
      required: true,
      validation: { min: 1, max: 100 },
      order: 1,
    },
  ];

  let businessLogicConfig: InventoryConfig | undefined;

  if (config.categoryData.enableInventory) {
    businessLogicConfig = {
      type: 'inventory',
      stockField: productFieldId,
      variantField: '',
      quantityField: quantityFieldId,
      stockTable: 'inventory',
      decrementOnSubmit: true,
    };
  }

  return {
    id: `schema_${Date.now()}`,
    formId: `form_${Date.now()}`,
    version: 1,
    fields,
    settings: {
      layout: { columns: 1, spacing: 'medium' },
      submission: {
        showSuccessMessage: true,
        successMessage: 'Order received!',
        allowMultipleSubmissions: true,
      },
      templateCategory: TemplateCategory.ECOMMERCE,
    },
    category: TemplateCategory.ECOMMERCE,
    businessLogicConfig,
    isPublished: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Builds FormSchema for appointment/services templates.
 * Creates date/time slot booking fields with capacity management.
 *
 * @param config - Wizard configuration
 * @returns FormSchema with appointment fields and booking logic
 *
 * @example
 * ```typescript
 * const schema = buildAppointmentSchema({
 *   templateName: 'Dentist Appointment',
 *   templateDescription: 'Book your appointment',
 *   categoryData: { slotInterval: 30, maxBookingsPerSlot: 1 }
 * });
 * ```
 */
export function buildAppointmentSchema(config: WizardConfig): FormSchema {
  const dateFieldId = generateFieldId('date');
  const timeSlotFieldId = generateFieldId('time_slot');

  const fields: FormField[] = [
    {
      id: dateFieldId,
      type: FormFieldType.DATE,
      label: 'Appointment Date',
      fieldName: 'appointment_date',
      placeholder: 'Select date',
      required: true,
      order: 0,
    },
    {
      id: timeSlotFieldId,
      type: FormFieldType.SELECT,
      label: 'Time Slot',
      fieldName: 'appointment_time',
      placeholder: 'Choose time',
      required: true,
      options: [
        { label: '9:00 AM', value: '09:00' },
        { label: '10:00 AM', value: '10:00' },
        { label: '11:00 AM', value: '11:00' },
      ],
      order: 1,
    },
  ];

  const businessLogicConfig: AppointmentConfig = {
    type: 'appointment',
    timeSlotField: timeSlotFieldId,
    dateField: dateFieldId,
    maxBookingsPerSlot: config.categoryData.maxBookingsPerSlot || 1,
    bookingsTable: 'appointments',
    allowOverbook: false,
  };

  return {
    id: `schema_${Date.now()}`,
    formId: `form_${Date.now()}`,
    version: 1,
    fields,
    settings: {
      layout: { columns: 1, spacing: 'medium' },
      submission: {
        showSuccessMessage: true,
        successMessage: 'Appointment booked successfully!',
        allowMultipleSubmissions: false,
      },
      templateCategory: TemplateCategory.SERVICES,
    },
    category: TemplateCategory.SERVICES,
    businessLogicConfig,
    isPublished: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Builds FormSchema for restaurant/menu templates.
 * Creates menu item selection with order totals.
 *
 * @param config - Wizard configuration
 * @returns FormSchema with menu fields and order logic
 *
 * @example
 * ```typescript
 * const schema = buildRestaurantSchema({
 *   templateName: 'Pizza Order Form',
 *   templateDescription: 'Order your favorite pizza',
 *   categoryData: { minItems: 1, enableCategories: false }
 * });
 * ```
 */
export function buildRestaurantSchema(config: WizardConfig): FormSchema {
  const menuItemFieldId = generateFieldId('menu_item');

  const fields: FormField[] = [
    {
      id: menuItemFieldId,
      type: FormFieldType.SELECT,
      label: 'Menu Item',
      fieldName: 'menu_selection',
      placeholder: 'Choose item',
      required: true,
      options: [
        { label: 'Burger', value: 'burger' },
        { label: 'Pizza', value: 'pizza' },
        { label: 'Salad', value: 'salad' },
      ],
      order: 0,
    },
  ];

  const businessLogicConfig: OrderConfig = {
    type: 'order',
    itemFields: [menuItemFieldId],
    calculateTotal: true,
  };

  return {
    id: `schema_${Date.now()}`,
    formId: `form_${Date.now()}`,
    version: 1,
    fields,
    settings: {
      layout: { columns: 1, spacing: 'medium' },
      submission: {
        showSuccessMessage: true,
        successMessage: 'Order placed!',
        allowMultipleSubmissions: true,
      },
      templateCategory: TemplateCategory.DATA_COLLECTION,
    },
    category: TemplateCategory.DATA_COLLECTION,
    businessLogicConfig,
    isPublished: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Builds FormSchema for events templates.
 * Creates RSVP and ticket selection fields.
 *
 * @param config - Wizard configuration
 * @returns FormSchema with event fields
 *
 * @example
 * ```typescript
 * const schema = buildEventsSchema({
 *   templateName: 'Conference RSVP',
 *   templateDescription: 'Register for the event',
 *   categoryData: { allowGuestCount: true, maxTicketsPerOrder: 10 }
 * });
 * ```
 */
export function buildEventsSchema(config: WizardConfig): FormSchema {
  const fields: FormField[] = [
    {
      id: generateFieldId('rsvp'),
      type: FormFieldType.RADIO,
      label: 'RSVP',
      fieldName: 'rsvp_status',
      required: true,
      options: [
        { label: 'Attending', value: 'yes' },
        { label: 'Not Attending', value: 'no' },
      ],
      order: 0,
    },
  ];

  if (config.categoryData.allowGuestCount) {
    fields.push({
      id: generateFieldId('guests'),
      type: FormFieldType.NUMBER,
      label: 'Number of Guests',
      fieldName: 'guest_count',
      placeholder: 'Enter guest count',
      required: false,
      validation: { min: 0, max: config.categoryData.maxTicketsPerOrder || 10 },
      order: 1,
    });
  }

  return {
    id: `schema_${Date.now()}`,
    formId: `form_${Date.now()}`,
    version: 1,
    fields,
    settings: {
      layout: { columns: 1, spacing: 'medium' },
      submission: {
        showSuccessMessage: true,
        successMessage: 'RSVP submitted!',
        allowMultipleSubmissions: false,
      },
      templateCategory: TemplateCategory.EVENTS,
    },
    category: TemplateCategory.EVENTS,
    isPublished: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Builds FormSchema from wizard configuration based on category.
 * Dispatches to category-specific builder function.
 *
 * @param category - Template category
 * @param config - Wizard configuration
 * @returns FormSchema object with category-specific fields and business logic
 *
 * @example
 * ```typescript
 * const schema = buildSchemaForCategory(TemplateCategory.POLLS, {
 *   templateName: 'Customer Poll',
 *   templateDescription: 'Rate our service',
 *   categoryData: { minOptions: 2, maxOptions: 10 }
 * });
 * ```
 */
export function buildSchemaForCategory(
  category: TemplateCategory,
  config: WizardConfig,
): FormSchema {
  switch (category) {
    case TemplateCategory.POLLS:
      return buildPollSchema(config);
    case TemplateCategory.QUIZ:
      return buildQuizSchema(config);
    case TemplateCategory.ECOMMERCE:
      return buildProductSchema(config);
    case TemplateCategory.SERVICES:
      return buildAppointmentSchema(config);
    case TemplateCategory.DATA_COLLECTION:
      return buildRestaurantSchema(config);
    case TemplateCategory.EVENTS:
      return buildEventsSchema(config);
    default:
      // Exhaustiveness check
      const _exhaustive: never = category;
      throw new Error(`Unknown template category: ${category}`);
  }
}
