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
 * Business logic configuration for polls
 * Prevents duplicate votes using session, user, or IP tracking
 *
 * @example
 * ```typescript
 * const pollConfig: PollConfig = {
 *   type: 'poll',
 *   voteField: 'candidate_selection',
 *   preventDuplicates: true,
 *   showResultsAfterVote: true,
 *   trackingMethod: 'session',
 *   allowMultipleVotes: false
 * };
 * ```
 */
export interface PollConfig {
  /** Discriminator for type narrowing */
  type: 'poll';
  /** Field name containing the vote/selection */
  voteField: string;
  /** Whether to prevent duplicate votes */
  preventDuplicates: boolean;
  /** Whether to show poll results after user votes */
  showResultsAfterVote: boolean;
  /** Method for tracking voters: session storage, authenticated user, or IP address */
  trackingMethod: 'session' | 'user' | 'ip';
  /** Whether to allow multiple votes from same voter (if preventDuplicates is false) */
  allowMultipleVotes?: boolean;
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
  | PollConfig
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
