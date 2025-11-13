/**
 * Form Template Type Definitions
 * Shared types for form templates with business logic configurations
 */

import { FormSchema } from './forms.types';

/**
 * Template categories for organizing form templates
 * @enum {string}
 */
export enum TemplateCategory {
  /** E-commerce templates: product orders, inventory tracking */
  ECOMMERCE = 'ecommerce',
  /** Service templates: appointment booking, time slot management */
  SERVICES = 'services',
  /** Data collection templates: surveys, registrations, contact forms */
  DATA_COLLECTION = 'data_collection',
  /** Event templates: RSVP forms, ticket sales, event registration */
  EVENTS = 'events',
  /** Quiz templates: assessments, tests, knowledge checks */
  QUIZ = 'quiz',
  /** Poll templates: opinion polls, voting, feedback collection */
  POLLS = 'polls',
}

/**
 * Business logic configuration for inventory tracking
 * Automatically decrements stock when form is submitted
 *
 * @example
 * ```typescript
 * const inventoryConfig: InventoryConfig = {
 *   type: 'inventory',
 *   stockField: 'product_variant_id',
 *   variantField: 'size',
 *   quantityField: 'quantity',
 *   stockTable: 'inventory',
 *   threshold: 10,
 *   decrementOnSubmit: true
 * };
 * ```
 */
export interface InventoryConfig {
  /** Discriminator for type narrowing */
  type: 'inventory';
  /** Field name containing the product/SKU identifier */
  stockField: string;
  /** Field name for product variant (e.g., size, color) */
  variantField: string;
  /** Field name containing quantity to order */
  quantityField: string;
  /** Database table storing inventory levels */
  stockTable: string;
  /** Optional low stock alert threshold */
  threshold?: number;
  /** Whether to automatically decrement stock on form submission */
  decrementOnSubmit: boolean;
}

/**
 * Business logic configuration for appointment booking
 * Prevents double-booking of time slots
 *
 * @example
 * ```typescript
 * const appointmentConfig: AppointmentConfig = {
 *   type: 'appointment',
 *   timeSlotField: 'appointment_time',
 *   dateField: 'appointment_date',
 *   maxBookingsPerSlot: 1,
 *   bookingsTable: 'appointments',
 *   allowOverbook: false
 * };
 * ```
 */
export interface AppointmentConfig {
  /** Discriminator for type narrowing */
  type: 'appointment';
  /** Field name for time slot selection */
  timeSlotField: string;
  /** Field name for date selection */
  dateField: string;
  /** Maximum concurrent bookings allowed per time slot */
  maxBookingsPerSlot: number;
  /** Database table storing existing bookings */
  bookingsTable: string;
  /** Whether to allow overbooking beyond maxBookingsPerSlot */
  allowOverbook?: boolean;
}

/**
 * Scoring rule for a single quiz question
 * @since Epic 29, Story 29.13
 */
export interface QuizScoringRule {
  /** Field ID of the question */
  fieldId: string;
  /** Correct answer value */
  correctAnswer: string;
  /** Optional: custom points (default 1) */
  points?: number;
}

/**
 * Business logic configuration for quiz scoring
 * Calculates scores based on correct answer mappings
 *
 * @since Epic 29, Story 29.13
 *
 * @example
 * ```typescript
 * const quizConfig: QuizConfig = {
 *   type: 'quiz',
 *   scoringRules: [
 *     { fieldId: 'q1', correctAnswer: 'B', points: 2 },
 *     { fieldId: 'q2', correctAnswer: 'C', points: 2 },
 *     { fieldId: 'q3', correctAnswer: 'A', points: 1 }
 *   ],
 *   passingScore: 70,
 *   showResults: true,
 *   allowRetakes: true
 * };
 * ```
 */
export interface QuizConfig {
  /** Discriminator for type narrowing */
  type: 'quiz';
  /** Array of question scoring rules */
  scoringRules: QuizScoringRule[];
  /** Passing percentage (0-100) */
  passingScore: number;
  /** Show results to user after submission */
  showResults: boolean;
  /** Optional: allow multiple submissions */
  allowRetakes?: boolean;
}

/**
 * Business logic configuration for poll templates
 * Prevents duplicate votes using session, IP, or fingerprint tracking
 *
 * @since Epic 29, Story 29.14
 *
 * @example
 * ```typescript
 * const pollConfig: PollLogicConfig = {
 *   type: 'poll',
 *   voteField: 'candidate_selection',
 *   preventDuplicates: true,
 *   showResultsAfterVote: true,
 *   trackingMethod: 'session',
 *   allowChangeVote: false
 * };
 * ```
 */
export interface PollLogicConfig {
  /** Discriminator for type narrowing */
  type: 'poll';
  /** Field ID of the poll question */
  voteField: string;
  /** Prevent multiple votes from same session */
  preventDuplicates: boolean;
  /** Show results to user after voting */
  showResultsAfterVote: boolean;
  /** Tracking method (session recommended) */
  trackingMethod: 'session' | 'ip' | 'fingerprint';
  /** Optional: allow users to change their vote */
  allowChangeVote?: boolean;
}

/**
 * Poll vote metadata stored in form_submissions.metadata JSONB
 * Tracks session, timestamp, and vote value for duplicate prevention
 *
 * @since Epic 29, Story 29.14
 *
 * @example
 * ```typescript
 * const metadata: PollVoteMetadata = {
 *   session_id: 'sess_abc123',
 *   voted_at: '2025-01-09T12:00:00Z',
 *   vote_value: 'option_a',
 *   ip_address: '192.168.1.1',
 *   user_agent: 'Mozilla/5.0...'
 * };
 * ```
 */
export interface PollVoteMetadata {
  /** Session ID for duplicate tracking */
  session_id: string;
  /** ISO timestamp of vote */
  voted_at: string;
  /** The option value voted for */
  vote_value: string;
  /** Optional: IP address for additional tracking */
  ip_address?: string;
  /** Optional: User agent for analytics */
  user_agent?: string;
}

/**
 * Poll results aggregation
 * Contains vote counts, percentages, and user voting status
 *
 * @since Epic 29, Story 29.14
 *
 * @example
 * ```typescript
 * const results: PollResults = {
 *   total_votes: 150,
 *   vote_counts: { option_a: 75, option_b: 45, option_c: 30 },
 *   vote_percentages: { option_a: 50, option_b: 30, option_c: 20 },
 *   user_voted: true,
 *   user_vote: 'option_a'
 * };
 * ```
 */
export interface PollResults {
  /** Total number of votes cast */
  total_votes: number;
  /** Vote count per option */
  vote_counts: Record<string, number>;
  /** Percentage per option (0-100) */
  vote_percentages: Record<string, number>;
  /** Whether current user has voted */
  user_voted: boolean;
  /** Current user's vote value (if voted) */
  user_vote?: string;
}

/**
 * Business logic configuration for order forms
 * Calculates order totals with tax and shipping
 *
 * @example
 * ```typescript
 * const orderConfig: OrderConfig = {
 *   type: 'order',
 *   itemFields: ['burger', 'fries', 'drink'],
 *   calculateTotal: true,
 *   taxRate: 0.08,
 *   shippingField: 'delivery_fee'
 * };
 * ```
 */
export interface OrderConfig {
  /** Discriminator for type narrowing */
  type: 'order';
  /** Array of field names representing orderable items */
  itemFields: string[];
  /** Whether to automatically calculate order total */
  calculateTotal: boolean;
  /** Optional tax rate as decimal (e.g., 0.08 for 8%) */
  taxRate?: number;
  /** Optional field name for shipping/delivery charges */
  shippingField?: string;
}

/**
 * Discriminated union of all business logic configuration types
 * Use the `type` property for type narrowing
 *
 * @example
 * ```typescript
 * function processConfig(config: TemplateBusinessLogicConfig) {
 *   switch (config.type) {
 *     case 'inventory':
 *       return handleInventory(config); // TypeScript knows this is InventoryConfig
 *     case 'appointment':
 *       return handleAppointment(config); // TypeScript knows this is AppointmentConfig
 *     // ... other cases
 *   }
 * }
 * ```
 */
export type TemplateBusinessLogicConfig =
  | InventoryConfig
  | AppointmentConfig
  | QuizConfig
  | PollLogicConfig
  | OrderConfig;

/**
 * Form template with metadata and business logic configuration
 * Represents a reusable form template that can be instantiated into new forms
 *
 * @example
 * ```typescript
 * const template: FormTemplate = {
 *   id: '123e4567-e89b-12d3-a456-426614174000',
 *   name: 'Product Order Form',
 *   description: 'Standard product order form with inventory tracking',
 *   category: TemplateCategory.ECOMMERCE,
 *   previewImageUrl: 'https://example.com/previews/order-form.png',
 *   templateSchema: {
 *     // FormSchema object with field definitions
 *   },
 *   businessLogicConfig: {
 *     type: 'inventory',
 *     stockField: 'product_id',
 *     variantField: 'size',
 *     quantityField: 'quantity',
 *     stockTable: 'inventory',
 *     decrementOnSubmit: true
 *   },
 *   createdBy: '456e7890-e89b-12d3-a456-426614174111',
 *   isActive: true,
 *   usageCount: 42,
 *   createdAt: new Date('2025-01-15'),
 *   updatedAt: new Date('2025-01-20')
 * };
 * ```
 */
export interface FormTemplate {
  /** Unique identifier (UUID v4) */
  id: string;
  /** Template name (1-255 characters, must be unique) */
  name: string;
  /** Optional description of template purpose and use cases */
  description?: string;
  /** Template category for organization and filtering */
  category: TemplateCategory;
  /** Optional preview image URL for template gallery */
  previewImageUrl?: string;
  /** Complete form schema defining fields, layout, and validation */
  templateSchema: FormSchema;
  /** Optional business logic configuration for automated behaviors */
  businessLogicConfig?: TemplateBusinessLogicConfig;
  /** Optional UUID of user who created this template */
  createdBy?: string;
  /** Whether template is active and available for use */
  isActive: boolean;
  /** Number of times template has been used to create forms */
  usageCount: number;
  /** Timestamp when template was created */
  createdAt: Date;
  /** Timestamp when template was last modified */
  updatedAt: Date;
}

/**
 * Request payload for creating a new form template
 * Subset of FormTemplate properties (excludes auto-generated fields)
 */
export interface CreateFormTemplateRequest {
  /** Template name (1-255 characters, must be unique) */
  name: string;
  /** Optional description of template purpose and use cases */
  description?: string;
  /** Template category for organization and filtering */
  category: TemplateCategory;
  /** Optional preview image URL for template gallery */
  previewImageUrl?: string;
  /** Complete form schema defining fields, layout, and validation */
  templateSchema: FormSchema;
  /** Optional business logic configuration for automated behaviors */
  businessLogicConfig?: TemplateBusinessLogicConfig;
}

/**
 * Request payload for updating an existing form template
 * All properties are optional (partial update)
 */
export interface UpdateFormTemplateRequest {
  /** Updated template name (1-255 characters, must be unique) */
  name?: string;
  /** Updated description */
  description?: string;
  /** Updated category */
  category?: TemplateCategory;
  /** Updated preview image URL */
  previewImageUrl?: string;
  /** Updated form schema */
  templateSchema?: FormSchema;
  /** Updated business logic configuration */
  businessLogicConfig?: TemplateBusinessLogicConfig;
  /** Updated active status */
  isActive?: boolean;
}

/**
 * Query parameters for filtering templates
 * Used in list/search operations
 */
export interface TemplateFilterParams {
  /** Filter by category (exact match) */
  category?: TemplateCategory;
  /** Filter by active status */
  isActive?: boolean;
  /** Filter by creator user ID */
  createdBy?: string;
  /** Search term for name/description (case-insensitive partial match) */
  search?: string;
  /** Sort field (default: createdAt) */
  sortBy?: 'name' | 'usageCount' | 'createdAt' | 'updatedAt';
  /** Sort direction (default: DESC) */
  sortOrder?: 'ASC' | 'DESC';
  /** Pagination: items per page (default: 20) */
  limit?: number;
  /** Pagination: page offset (default: 0) */
  offset?: number;
}

/**
 * Appointment booking record
 * Represents a confirmed, cancelled, or completed appointment slot
 *
 * @since Epic 29, Story 29.12
 *
 * @example
 * ```typescript
 * const booking: AppointmentBooking = {
 *   id: '123e4567-e89b-12d3-a456-426614174000',
 *   form_id: '456e7890-e89b-12d3-a456-426614174111',
 *   date: '2025-12-15',
 *   time_slot: '09:00-10:00',
 *   booked_at: new Date('2025-12-01T10:30:00Z'),
 *   status: 'confirmed',
 *   created_at: new Date('2025-12-01T10:30:00Z'),
 *   updated_at: new Date('2025-12-01T10:30:00Z')
 * };
 * ```
 */
export interface AppointmentBooking {
  /** Unique booking identifier (UUID v4) */
  id: string;
  /** Form UUID this booking belongs to */
  form_id: string;
  /** Appointment date in ISO format (YYYY-MM-DD) */
  date: string;
  /** Time slot identifier (e.g., "09:00-10:00", "morning", custom labels) */
  time_slot: string;
  /** Timestamp when booking was created */
  booked_at: Date;
  /** Booking status: confirmed (active), cancelled (user cancelled), completed (past appointment) */
  status: 'confirmed' | 'cancelled' | 'completed';
  /** Record creation timestamp */
  created_at: Date;
  /** Record last update timestamp */
  updated_at: Date;
}

/**
 * Available slot information for appointment booking
 * Used by frontend to display available time slots with capacity
 *
 * @since Epic 29, Story 29.12
 *
 * @example
 * ```typescript
 * const slot: AvailableSlot = {
 *   date: '2025-12-15',
 *   time_slot: '09:00-10:00',
 *   available_capacity: 2,
 *   max_capacity: 5,
 *   is_available: true
 * };
 * ```
 */
export interface AvailableSlot {
  /** Appointment date in ISO format (YYYY-MM-DD) */
  date: string;
  /** Time slot identifier */
  time_slot: string;
  /** Number of bookings still available */
  available_capacity: number;
  /** Maximum bookings allowed per slot */
  max_capacity: number;
  /** Whether slot has availability (available_capacity > 0) */
  is_available: boolean;
}

/**
 * Quiz submission metadata stored in form_submissions.metadata JSONB
 * Contains scoring results and detailed answer breakdown
 *
 * @since Epic 29, Story 29.13
 *
 * @example
 * ```typescript
 * const metadata: QuizResultMetadata = {
 *   score: 80,
 *   correctAnswers: 4,
 *   totalQuestions: 5,
 *   passed: true,
 *   pointsEarned: 8,
 *   maxPoints: 10,
 *   answeredAt: '2025-01-09T12:00:00Z'
 * };
 * ```
 */
export interface QuizResultMetadata {
  /** Percentage score (0-100) */
  score: number;
  /** Number of correct answers */
  correctAnswers: number;
  /** Total number of questions */
  totalQuestions: number;
  /** Whether user passed (score >= passingScore) */
  passed: boolean;
  /** Optional: total points earned */
  pointsEarned?: number;
  /** Optional: maximum possible points */
  maxPoints?: number;
  /** ISO timestamp of submission */
  answeredAt: string;
}

/**
 * Template Wizard Configuration Types
 * Defines step-by-step wizard configurations for creating category-specific templates
 *
 * @since Epic 30, Story 30.1
 */

/**
 * Wizard step metadata
 * Defines a single step in the template creation wizard
 */
export interface WizardStepMetadata {
  /** Unique step identifier */
  stepId: string;
  /** Display label for the step */
  label: string;
  /** Optional description or help text */
  description?: string;
  /** Whether this step is required (cannot skip) */
  required: boolean;
  /** Order index for step sequence */
  order: number;
  /** Optional: step is only shown if condition is met */
  conditionalOn?: {
    /** Field ID to check */
    fieldId: string;
    /** Expected value for field */
    expectedValue: any;
  };
}

/**
 * Field descriptor for wizard configuration
 * Defines allowed fields and their validation rules
 */
export interface WizardFieldDescriptor {
  /** Field ID matching FormField.id */
  fieldId: string;
  /** Field type (text, select, checkbox, etc.) */
  fieldType: string;
  /** Display label */
  label: string;
  /** Whether field is required */
  required: boolean;
  /** Optional validation rules */
  validation?: {
    /** Minimum value (for numbers) */
    min?: number;
    /** Maximum value (for numbers) */
    max?: number;
    /** Regex pattern (for text) */
    pattern?: string;
    /** Custom validation error message */
    errorMessage?: string;
  };
  /** Optional default value */
  defaultValue?: any;
  /** Optional: available options for select/radio fields */
  options?: Array<{ label: string; value: string }>;
}

/**
 * Base wizard configuration interface
 * Common properties for all category-specific wizard configs
 */
export interface WizardConfigBase {
  /** Template category discriminator */
  category: TemplateCategory;
  /** Wizard steps for this category */
  steps: WizardStepMetadata[];
  /** Allowed fields for this category */
  allowedFields: WizardFieldDescriptor[];
  /** Optional: validation requirements specific to this category */
  validationRules?: Record<string, any>;
}

/**
 * Poll wizard configuration
 * Guides user through creating poll templates with vote tracking
 *
 * @since Epic 30, Story 30.1
 *
 * @example
 * ```typescript
 * const config: PollWizardConfig = {
 *   category: TemplateCategory.POLLS,
 *   steps: [
 *     { stepId: 'basic', label: 'Basic Info', required: true, order: 0 },
 *     { stepId: 'options', label: 'Poll Options', required: true, order: 1 },
 *     { stepId: 'settings', label: 'Settings', required: false, order: 2 }
 *   ],
 *   allowedFields: [
 *     { fieldId: 'poll_question', fieldType: 'text', label: 'Question', required: true },
 *     { fieldId: 'poll_options', fieldType: 'select', label: 'Options', required: true }
 *   ],
 *   pollOptions: { minOptions: 2, maxOptions: 10 },
 *   voteTrackingOptions: ['session', 'ip', 'fingerprint']
 * };
 * ```
 */
export interface PollWizardConfig extends WizardConfigBase {
  /** Discriminator for poll category */
  category: TemplateCategory.POLLS;
  /** Poll-specific configuration */
  pollOptions: {
    /** Minimum number of poll options */
    minOptions: number;
    /** Maximum number of poll options */
    maxOptions: number;
  };
  /** Available vote tracking methods */
  voteTrackingOptions: Array<'session' | 'ip' | 'fingerprint'>;
}

/**
 * Quiz wizard configuration
 * Guides user through creating quiz templates with scoring
 *
 * @since Epic 30, Story 30.1
 *
 * @example
 * ```typescript
 * const config: QuizWizardConfig = {
 *   category: TemplateCategory.QUIZ,
 *   steps: [
 *     { stepId: 'basic', label: 'Basic Info', required: true, order: 0 },
 *     { stepId: 'questions', label: 'Questions', required: true, order: 1 },
 *     { stepId: 'scoring', label: 'Scoring', required: true, order: 2 }
 *   ],
 *   allowedFields: [
 *     { fieldId: 'question', fieldType: 'text', label: 'Question', required: true },
 *     { fieldId: 'answers', fieldType: 'radio', label: 'Answers', required: true }
 *   ],
 *   questionOptions: { minQuestions: 1, maxQuestions: 50 },
 *   scoringOptions: { defaultPoints: 1, allowCustomPoints: true }
 * };
 * ```
 */
export interface QuizWizardConfig extends WizardConfigBase {
  /** Discriminator for quiz category */
  category: TemplateCategory.QUIZ;
  /** Quiz-specific configuration */
  questionOptions: {
    /** Minimum number of questions */
    minQuestions: number;
    /** Maximum number of questions */
    maxQuestions: number;
  };
  /** Scoring configuration options */
  scoringOptions: {
    /** Default points per question */
    defaultPoints: number;
    /** Allow custom points per question */
    allowCustomPoints: boolean;
  };
}

/**
 * Product/E-commerce wizard configuration
 * Guides user through creating product order templates with inventory
 *
 * @since Epic 30, Story 30.1
 *
 * @example
 * ```typescript
 * const config: ProductWizardConfig = {
 *   category: TemplateCategory.ECOMMERCE,
 *   steps: [
 *     { stepId: 'basic', label: 'Basic Info', required: true, order: 0 },
 *     { stepId: 'products', label: 'Products', required: true, order: 1 },
 *     { stepId: 'inventory', label: 'Inventory', required: false, order: 2 }
 *   ],
 *   allowedFields: [
 *     { fieldId: 'product_name', fieldType: 'text', label: 'Product', required: true },
 *     { fieldId: 'quantity', fieldType: 'number', label: 'Quantity', required: true }
 *   ],
 *   inventoryOptions: { enableTracking: true, enableVariants: true },
 *   pricingOptions: { enableTax: true, enableShipping: true }
 * };
 * ```
 */
export interface ProductWizardConfig extends WizardConfigBase {
  /** Discriminator for ecommerce category */
  category: TemplateCategory.ECOMMERCE;
  /** Inventory configuration options */
  inventoryOptions: {
    /** Enable inventory tracking */
    enableTracking: boolean;
    /** Enable product variants (size, color, etc.) */
    enableVariants: boolean;
  };
  /** Pricing configuration options */
  pricingOptions: {
    /** Enable tax calculation */
    enableTax: boolean;
    /** Enable shipping fees */
    enableShipping: boolean;
  };
}

/**
 * Appointment wizard configuration
 * Guides user through creating appointment booking templates
 *
 * @since Epic 30, Story 30.1
 *
 * @example
 * ```typescript
 * const config: AppointmentWizardConfig = {
 *   category: TemplateCategory.SERVICES,
 *   steps: [
 *     { stepId: 'basic', label: 'Basic Info', required: true, order: 0 },
 *     { stepId: 'slots', label: 'Time Slots', required: true, order: 1 },
 *     { stepId: 'capacity', label: 'Capacity', required: false, order: 2 }
 *   ],
 *   allowedFields: [
 *     { fieldId: 'date', fieldType: 'date', label: 'Date', required: true },
 *     { fieldId: 'time_slot', fieldType: 'select', label: 'Time', required: true }
 *   ],
 *   timeSlotOptions: { interval: 30, minAdvanceBooking: 1, maxAdvanceBooking: 30 },
 *   capacityOptions: { defaultCapacity: 1, allowOverbook: false }
 * };
 * ```
 */
export interface AppointmentWizardConfig extends WizardConfigBase {
  /** Discriminator for services/appointment category */
  category: TemplateCategory.SERVICES;
  /** Time slot configuration options */
  timeSlotOptions: {
    /** Time slot interval in minutes (e.g., 30, 60) */
    interval: number;
    /** Minimum days in advance to book */
    minAdvanceBooking: number;
    /** Maximum days in advance to book */
    maxAdvanceBooking: number;
  };
  /** Capacity configuration options */
  capacityOptions: {
    /** Default bookings per slot */
    defaultCapacity: number;
    /** Allow overbooking */
    allowOverbook: boolean;
  };
}

/**
 * Restaurant/Menu wizard configuration
 * Guides user through creating menu order templates
 *
 * @since Epic 30, Story 30.1
 *
 * @example
 * ```typescript
 * const config: RestaurantWizardConfig = {
 *   category: TemplateCategory.DATA_COLLECTION,
 *   steps: [
 *     { stepId: 'basic', label: 'Basic Info', required: true, order: 0 },
 *     { stepId: 'menu', label: 'Menu Items', required: true, order: 1 },
 *     { stepId: 'pricing', label: 'Pricing', required: false, order: 2 }
 *   ],
 *   allowedFields: [
 *     { fieldId: 'menu_item', fieldType: 'select', label: 'Item', required: true },
 *     { fieldId: 'quantity', fieldType: 'number', label: 'Quantity', required: true }
 *   ],
 *   menuOptions: { minItems: 1, maxItems: 100, enableCategories: true },
 *   orderOptions: { enableTax: true, enableTips: true, calculateTotal: true }
 * };
 * ```
 */
export interface RestaurantWizardConfig extends WizardConfigBase {
  /** Discriminator for restaurant/menu category (using DATA_COLLECTION) */
  category: TemplateCategory.DATA_COLLECTION;
  /** Menu configuration options */
  menuOptions: {
    /** Minimum menu items */
    minItems: number;
    /** Maximum menu items */
    maxItems: number;
    /** Enable menu categories (appetizers, mains, etc.) */
    enableCategories: boolean;
  };
  /** Order configuration options */
  orderOptions: {
    /** Enable tax calculation */
    enableTax: boolean;
    /** Enable tip calculation */
    enableTips: boolean;
    /** Auto-calculate order total */
    calculateTotal: boolean;
  };
}

/**
 * Events wizard configuration
 * Guides user through creating event registration, RSVP, and ticket sale templates
 *
 * @since Epic 30, Story 30.1
 *
 * @example
 * ```typescript
 * const config: EventsWizardConfig = {
 *   category: TemplateCategory.EVENTS,
 *   steps: [
 *     { stepId: 'basic', label: 'Event Info', required: true, order: 0 },
 *     { stepId: 'tickets', label: 'Tickets', required: false, order: 1 },
 *     { stepId: 'rsvp', label: 'RSVP Settings', required: false, order: 2 }
 *   ],
 *   allowedFields: [
 *     { fieldId: 'attendee_name', fieldType: 'text', label: 'Name', required: true },
 *     { fieldId: 'rsvp_status', fieldType: 'radio', label: 'RSVP', required: true },
 *     { fieldId: 'ticket_type', fieldType: 'select', label: 'Ticket', required: false }
 *   ],
 *   rsvpOptions: { allowGuestCount: true, requireContactInfo: true },
 *   ticketOptions: { enableSales: true, enableDiscounts: false, maxPerOrder: 10 }
 * };
 * ```
 */
export interface EventsWizardConfig extends WizardConfigBase {
  /** Discriminator for events category */
  category: TemplateCategory.EVENTS;
  /** RSVP configuration options */
  rsvpOptions: {
    /** Allow attendees to specify guest count */
    allowGuestCount: boolean;
    /** Require contact information (email/phone) */
    requireContactInfo: boolean;
  };
  /** Ticket sales configuration options */
  ticketOptions: {
    /** Enable paid ticket sales */
    enableSales: boolean;
    /** Enable discount codes */
    enableDiscounts: boolean;
    /** Maximum tickets per order */
    maxPerOrder: number;
  };
}

/**
 * Discriminated union of all template wizard configurations
 * Use the `category` property for type narrowing
 * Maps to the 6 template categories: POLLS, QUIZ, ECOMMERCE, SERVICES, DATA_COLLECTION, EVENTS
 *
 * @since Epic 30, Story 30.1
 *
 * @example
 * ```typescript
 * function renderWizardStep(config: TemplateWizardConfig, stepIndex: number) {
 *   switch (config.category) {
 *     case TemplateCategory.POLLS:
 *       return renderPollStep(config, stepIndex); // TypeScript knows this is PollWizardConfig
 *     case TemplateCategory.QUIZ:
 *       return renderQuizStep(config, stepIndex); // TypeScript knows this is QuizWizardConfig
 *     case TemplateCategory.ECOMMERCE:
 *       return renderProductStep(config, stepIndex); // TypeScript knows this is ProductWizardConfig
 *     case TemplateCategory.SERVICES:
 *       return renderAppointmentStep(config, stepIndex); // TypeScript knows this is AppointmentWizardConfig
 *     case TemplateCategory.DATA_COLLECTION:
 *       return renderDataCollectionStep(config, stepIndex); // TypeScript knows this is RestaurantWizardConfig
 *     case TemplateCategory.EVENTS:
 *       return renderEventsStep(config, stepIndex); // TypeScript knows this is EventsWizardConfig
 *   }
 * }
 * ```
 */
export type TemplateWizardConfig =
  | PollWizardConfig
  | QuizWizardConfig
  | ProductWizardConfig
  | AppointmentWizardConfig
  | RestaurantWizardConfig
  | EventsWizardConfig;
