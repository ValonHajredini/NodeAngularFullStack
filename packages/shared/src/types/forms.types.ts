/**
 * Form Builder Type Definitions
 * Shared types for form creation, schema management, and submissions
 */

import { FormTheme, ResponsiveThemeConfig, ThemeProperties } from './theme.types';

// Re-export theme types for convenience
export type { FormTheme, ResponsiveThemeConfig, ThemeProperties } from './theme.types';

/**
 * Maximum number of steps allowed in a multi-step form
 * Set to very high number for effectively unlimited steps
 * Only minimum of 2 steps is enforced
 */
export const MAX_STEPS = 999;

/**
 * Supported form field types
 */
export enum FormFieldType {
  /** Single-line text input */
  TEXT = 'text',
  /** Email input with validation */
  EMAIL = 'email',
  /** Numeric input */
  NUMBER = 'number',
  /** Dropdown selection */
  SELECT = 'select',
  /** Multi-line text input */
  TEXTAREA = 'textarea',
  /** File upload */
  FILE = 'file',
  /** Checkbox input */
  CHECKBOX = 'checkbox',
  /** Radio button group */
  RADIO = 'radio',
  /** Date picker */
  DATE = 'date',
  /** Date and time picker */
  DATETIME = 'datetime',
  /** Toggle switch */
  TOGGLE = 'toggle',
  /** Visual divider (non-input) */
  DIVIDER = 'divider',
  /** Group container for organizing related fields */
  GROUP = 'group',
  /** Heading/title for form sections (non-input, display only) */
  HEADING = 'heading',
  /** Image display field (non-input, display only) */
  IMAGE = 'image',
  /** Text block for instructions/explanations (non-input, display only) */
  TEXT_BLOCK = 'text_block',
  /** Image gallery selector (input field for selecting one image from gallery) */
  IMAGE_GALLERY = 'image_gallery',
  /** Time slot selector for appointments/bookings with configurable intervals */
  TIME_SLOT = 'time_slot',
}

/**
 * Field type categories for distinguishing input vs display elements
 */
export const FIELD_TYPE_CATEGORIES = {
  /** Input fields that collect user data */
  INPUT_FIELDS: [
    FormFieldType.TEXT,
    FormFieldType.EMAIL,
    FormFieldType.NUMBER,
    FormFieldType.SELECT,
    FormFieldType.TEXTAREA,
    FormFieldType.FILE,
    FormFieldType.CHECKBOX,
    FormFieldType.RADIO,
    FormFieldType.DATE,
    FormFieldType.DATETIME,
    FormFieldType.TOGGLE,
    FormFieldType.IMAGE_GALLERY,
    FormFieldType.TIME_SLOT,
  ] as const,

  /** Display elements that don't collect data (visual/organizational) */
  DISPLAY_ELEMENTS: [
    FormFieldType.HEADING,
    FormFieldType.IMAGE,
    FormFieldType.TEXT_BLOCK,
    FormFieldType.DIVIDER,
    FormFieldType.GROUP,
  ] as const,
} as const;

/**
 * Check if a field type is an input field that collects data
 */
export function isInputField(fieldType: FormFieldType): boolean {
  return FIELD_TYPE_CATEGORIES.INPUT_FIELDS.includes(fieldType as any);
}

/**
 * Check if a field type is a display element (non-input)
 */
export function isDisplayElement(fieldType: FormFieldType): boolean {
  return FIELD_TYPE_CATEGORIES.DISPLAY_ELEMENTS.includes(fieldType as any);
}

/**
 * Validation rules for form fields
 */
export interface FormFieldValidation {
  /** Minimum length for text inputs */
  minLength?: number;
  /** Maximum length for text inputs */
  maxLength?: number;
  /** Minimum value for numeric inputs */
  min?: number;
  /** Maximum value for numeric inputs */
  max?: number;
  /** Regular expression pattern for validation */
  pattern?: string;
  /** Custom validation error message */
  errorMessage?: string;
  /** Array of allowed file types (for file uploads) */
  acceptedFileTypes?: string[];
  /** Maximum file size in bytes (for file uploads) */
  maxFileSize?: number;
}

/**
 * Conditional visibility configuration
 */
export interface FormFieldConditional {
  /** Field ID to watch for changes */
  watchFieldId: string;
  /** Operator for comparison (equals, notEquals, contains, etc.) */
  operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan';
  /** Value to compare against */
  value: string | number | boolean;
}

/**
 * Options for select, radio, and checkbox fields
 */
export interface FormFieldOption {
  /** Option label displayed to user */
  label: string;
  /** Option value stored in submission */
  value: string | number;
}

/**
 * Base metadata interface with common properties for all field types
 */
export interface BaseFieldMetadata {
  /** Custom CSS styling applied to field container (max 5000 characters) */
  customStyle?: string;
}

/**
 * Group-specific metadata for GROUP field type
 */
export interface GroupMetadata extends BaseFieldMetadata {
  /** Group title/heading */
  groupTitle?: string;
  /** Border style for group container */
  groupBorderStyle?: 'solid' | 'dashed' | 'none';
  /** Whether group is collapsible */
  groupCollapsible?: boolean;
  /** Background color (hex format) */
  groupBackgroundColor?: string;
}

/**
 * Heading-specific metadata for HEADING field type
 */
export interface HeadingMetadata extends BaseFieldMetadata {
  /** HTML heading level (h1-h6) */
  headingLevel: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  /** Text alignment */
  alignment: 'left' | 'center' | 'right';
  /** Text color (hex format) */
  color?: string;
  /** Font weight */
  fontWeight?: 'normal' | 'bold';
}

/**
 * Image-specific metadata for IMAGE field type
 */
export interface ImageMetadata extends BaseFieldMetadata {
  /** S3/DO Spaces image URL */
  imageUrl?: string;
  /** Alt text for accessibility (required) */
  altText: string;
  /** Image width (px, %, or CSS value) */
  width?: number | string;
  /** Image height (px, auto, or CSS value) */
  height?: number | string;
  /**
   * Image horizontal alignment within its container
   * - 'left': Align image to left edge
   * - 'center': Center image horizontally (default)
   * - 'right': Align image to right edge
   * - 'full': Stretch image to full container width
   */
  alignment?: 'left' | 'center' | 'right' | 'full';
  /** Optional caption text displayed below image for additional context */
  caption?: string;
  /**
   * CSS object-fit property controlling how image scales within dimensions
   * - 'contain': Fit entire image within bounds, maintain aspect ratio (default)
   * - 'cover': Fill entire bounds, crop if needed, maintain aspect ratio
   * - 'fill': Stretch to fill bounds, may distort aspect ratio
   * - 'none': Display image at original size, may overflow/underflow
   */
  objectFit?: 'contain' | 'cover' | 'fill' | 'none';
}

/**
 * Individual paragraph within a text block
 */
export interface TextBlockParagraph {
  /** Unique paragraph identifier */
  id: string;
  /** Paragraph HTML content (sanitized) */
  content: string;
  /** Order index for rendering */
  order: number;
}

/**
 * Text block metadata for TEXT_BLOCK field type
 */
export interface TextBlockMetadata extends BaseFieldMetadata {
  /** HTML content (sanitized) - legacy single content field for backward compatibility */
  content?: string;
  /** Array of paragraphs for multi-paragraph support (new feature) */
  paragraphs?: TextBlockParagraph[];
  /** Text alignment */
  alignment?: 'left' | 'center' | 'right' | 'justify';
  /** Optional background color (hex format) */
  backgroundColor?: string;
  /** Padding size */
  padding?: 'none' | 'small' | 'medium' | 'large';
  /** Show "Read more" for long content */
  collapsible?: boolean;
  /** Initial collapsed state */
  collapsed?: boolean;
}

/**
 * Image gallery metadata for IMAGE_GALLERY field type
 * Stores array of images for single-selection gallery
 */
export interface ImageGalleryMetadata extends BaseFieldMetadata {
  /** Array of gallery images (2-10 images recommended) */
  images: { key: string; url: string; alt: string }[];
  /** Number of grid columns (2-4) - Default: 4 */
  columns?: 2 | 3 | 4;
  /** Image aspect ratio - Default: 'square' */
  aspectRatio?: 'square' | '16:9' | 'auto';
  /** Maximum number of images allowed - Default: 10 */
  maxImages?: number;
}

/**
 * Time slot metadata for TIME_SLOT field type
 * Configures time interval selection for appointments and bookings
 */
export interface TimeSlotMetadata extends BaseFieldMetadata {
  /** Time interval for slot generation */
  interval: '10min' | '15min' | '30min' | '1hour' | '1day';
  /** Start time (HH:MM format, 24-hour) - Default: '09:00' */
  startTime?: string;
  /** End time (HH:MM format, 24-hour) - Default: '17:00' */
  endTime?: string;
  /** Display format for time slots - Default: '12h' */
  timeFormat?: '12h' | '24h';
  /** Maximum number of time slots to display - Default: 20 */
  maxSlots?: number;
  /** Whether to allow multiple slot selection - Default: false */
  allowMultiple?: boolean;
  /** Timezone for time slot display (e.g., 'America/New_York') */
  timezone?: string;
}

/**
 * Quiz field metadata for quiz-enabled forms
 * Stores quiz-specific properties for individual question fields
 * Used to auto-generate scoring rules in FormSchema.settings.businessLogicConfig
 */
export interface QuizFieldMetadata extends BaseFieldMetadata {
  /** Correct answer for this quiz question (matches option value for radio/checkbox/select) */
  correctAnswer?: string;
  /** Points awarded for correct answer (default: 1 if not specified) */
  points?: number;
  /** Explanation text shown after quiz submission (optional) */
  explanation?: string;
  /** Exclude this field from quiz scoring (for fields like name, email that aren't quiz questions) */
  excludeFromQuiz?: boolean;
}

/**
 * Product variant metadata for IMAGE_GALLERY fields
 * Used by product templates for inventory tracking and e-commerce functionality
 * Each array element corresponds to an image in the gallery
 *
 * @example
 * // T-Shirt with 3 variants (Red-M, Blue-M, Red-L)
 * [
 *   { sku: 'TSHIRT-RED-M', size: 'M', color: 'Red', priceModifier: 0, displayName: 'Red - Medium' },
 *   { sku: 'TSHIRT-BLUE-M', size: 'M', color: 'Blue', priceModifier: 100, displayName: 'Blue - Medium' },
 *   { sku: 'TSHIRT-RED-L', size: 'L', color: 'Red', priceModifier: 200, displayName: 'Red - Large' }
 * ]
 */
export interface ImageVariantMetadata {
  /** Variant SKU for inventory tracking (unique identifier) */
  sku: string;
  /** Variant size (e.g., 'S', 'M', 'L', 'XL') */
  size?: string;
  /** Variant color (e.g., 'Red', 'Blue', 'Black') */
  color?: string;
  /** Price modifier in cents (positive or negative, e.g., 100 = +$1.00, -50 = -$0.50) */
  priceModifier?: number;
  /** Variant display name shown to users (e.g., 'Red - Large') */
  displayName?: string;
}

/**
 * Configuration for nested sub-columns within a parent column.
 * Enables subdividing a column into 2-4 horizontal sub-columns for granular field positioning.
 *
 * @example
 * // Create 2 sub-columns with 33%-67% width split
 * {
 *   columnIndex: 1,
 *   subColumnCount: 2,
 *   subColumnWidths: ["1fr", "2fr"]
 * }
 */
export interface SubColumnConfig {
  /** Parent column index (0-3) that contains these sub-columns */
  columnIndex: number;

  /** Number of sub-columns to create (2-4 sub-columns supported) */
  subColumnCount: 1 | 2 | 3 | 4;

  /**
   * Optional fractional units defining sub-column widths (e.g., ["1fr", "2fr"]).
   * If omitted, sub-columns have equal width.
   * Array length must match subColumnCount.
   */
  subColumnWidths?: string[];
}

/**
 * Row layout configuration for multi-column form rows
 * Supports variable column widths and nested sub-columns (Epic 27)
 */
export interface RowLayoutConfig {
  /** Unique row identifier */
  rowId: string;
  /** Number of columns in this row (0 = full-width, 1-4 = columns) */
  columnCount: 0 | 1 | 2 | 3 | 4;
  /**
   * Optional fractional units defining column widths (e.g., ["1fr", "3fr"]).
   * If omitted, columns have equal width (backward compatible).
   * Array length must match columnCount.
   * @example
   * // 25%-75% split for 2 columns
   * columnWidths: ["1fr", "3fr"]
   */
  columnWidths?: string[];
  /**
   * Optional nested sub-column configurations for columns in this row.
   * Enables subdividing columns into 2-4 sub-columns (one level deep: Row → Column → Sub-Column → Field).
   */
  subColumns?: SubColumnConfig[];
  /** Row order index for rendering */
  order: number;
  /**
   * Optional step identifier for multi-step forms
   * When provided, associates row with a specific form step
   * If undefined, row belongs to single-page form or all steps
   */
  stepId?: string;
}

/**
 * Field position within row-column layout
 * Supports nested sub-column positioning (Epic 27)
 */
export interface FieldPosition {
  /** Row identifier this field belongs to */
  rowId: string;
  /** Column index within row (0-3 for columns 1-4) */
  columnIndex: number;
  /**
   * Optional sub-column index for nested positioning (0-3).
   * If omitted, field renders in parent column (backward compatible).
   * Used when column is subdivided into sub-columns for granular field positioning.
   */
  subColumnIndex?: number;
  /**
   * Order index within column or sub-column for vertical stacking (0-based)
   * Optional for backward compatibility - defaults to 0 if undefined
   * Fields with lower orderInColumn render above fields with higher orderInColumn
   */
  orderInColumn?: number;
  /**
   * Optional step identifier for multi-step forms
   * When provided, associates field with a specific form step
   * If undefined, field belongs to single-page form or all steps
   */
  stepId?: string;
}

/**
 * Single step in a multi-step form wizard
 */
export interface FormStep {
  /** Unique step identifier (UUID v4) */
  id: string;
  /** Step title displayed to users (1-100 characters) */
  title: string;
  /** Optional step description for additional context (max 500 characters) */
  description?: string;
  /** Zero-based sequential order index for step progression */
  order: number;
}

/**
 * Step form configuration for multi-step form wizards
 */
export interface StepFormConfig {
  /** Whether step-based form mode is active */
  enabled: boolean;
  /** Array of form steps (2-10 steps when enabled) */
  steps: FormStep[];
}

/**
 * Individual form field definition
 */
export interface FormField {
  /** Unique field identifier */
  id: string;
  /** Field type */
  type: FormFieldType;
  /** Field label displayed to user */
  label: string;
  /** Field name used as key in submission data */
  fieldName: string;
  /** Placeholder text */
  placeholder?: string;
  /** Help text displayed below field */
  helpText?: string;
  /** Whether field is required */
  required: boolean;
  /** Validation rules */
  validation?: FormFieldValidation;
  /** Default value */
  defaultValue?: string | number | boolean;
  /** Options for select/radio/checkbox fields */
  options?: FormFieldOption[];
  /** Conditional visibility rules */
  conditional?: FormFieldConditional;
  /** Order index for rendering */
  order: number;
  /** Parent group ID for nested fields */
  parentGroupId?: string;
  /** Additional metadata for special field types (e.g., GROUP, HEADING, IMAGE, TEXT_BLOCK, IMAGE_GALLERY, TIME_SLOT, QUIZ) */
  metadata?:
    | GroupMetadata
    | HeadingMetadata
    | ImageMetadata
    | TextBlockMetadata
    | ImageGalleryMetadata
    | TimeSlotMetadata
    | QuizFieldMetadata;
  /**
   * Variant metadata for IMAGE_GALLERY fields (e.g., product variants).
   * Each array element corresponds to an image in the gallery.
   * Used by product templates for inventory tracking.
   * @see ImageVariantMetadata
   */
  variantMetadata?: ImageVariantMetadata[];
  /** Position within row-column layout (optional, for row-based layouts) */
  position?: FieldPosition;
  /** Whether field is disabled */
  disabled?: boolean;
  /** Whether field is read-only */
  readOnly?: boolean;
}

/**
 * Form layout configuration
 */
export interface FormLayout {
  /** Number of columns (1-4) */
  columns: 1 | 2 | 3 | 4;
  /** Spacing between fields (small, medium, large) */
  spacing: 'small' | 'medium' | 'large';
}

/**
 * Form submission behavior configuration
 */
export interface FormSubmissionConfig {
  /** Show success message after submission */
  showSuccessMessage: boolean;
  /** Custom success message */
  successMessage?: string;
  /** Redirect URL after successful submission */
  redirectUrl?: string;
  /** Allow multiple submissions from same user */
  allowMultipleSubmissions: boolean;
  /** Send email notification on submission */
  sendEmailNotification?: boolean;
  /** Email addresses to notify */
  notificationEmails?: string[];
  /** Custom submit button text (default: "Submit") */
  submitButtonText?: string;
}

/**
 * Background settings configuration for forms.
 */
export type FormBackgroundType = 'none' | 'image' | 'custom';

/**
 * Background appearance configuration for rendered forms.
 */
export interface FormBackgroundSettings {
  /** Background display type */
  type: FormBackgroundType;
  /** Background image URL or data URI */
  imageUrl?: string;
  /** Background image sizing behavior */
  imagePosition?: 'cover' | 'contain' | 'repeat';
  /** Background image opacity percentage (0-100) */
  imageOpacity?: number;
  /** Background image vertical alignment */
  imageAlignment?: 'top' | 'center' | 'bottom';
  /** Background image blur amount in pixels */
  imageBlur?: number;
  /** Custom HTML content for background (sanitized server-side) */
  customHtml?: string;
  /** Custom CSS for background (validated server-side) */
  customCss?: string;
}

/**
 * Form settings
 */
export interface FormSettings {
  /** Layout configuration */
  layout: FormLayout;
  /** Submission behavior */
  submission: FormSubmissionConfig;
  /** Optional background configuration */
  background?: FormBackgroundSettings;
  /** Row-based layout configuration (optional) */
  rowLayout?: {
    /** Whether row-based layout is enabled */
    enabled: boolean;
    /** Row configurations */
    rows: RowLayoutConfig[];
  };
  /** Optional template category for analytics and detection (Epic 30) */
  templateCategory?: string;
  /** Optional step form configuration for multi-step wizard forms */
  stepForm?: StepFormConfig;
  /** Optional theme ID reference for applying pre-designed styling */
  themeId?: string;
  /** Optional template ID reference for forms created from templates with business logic */
  templateId?: string;
  /** Optional business logic configuration for quiz scoring, poll tracking, etc. (Epic 29) */
  businessLogicConfig?: import('./templates.types').TemplateBusinessLogicConfig;
}

/**
 * Form schema with versioning
 */
export interface FormSchema {
  /** Unique schema identifier */
  id: string;
  /** Parent form identifier */
  formId: string;
  /** Schema version number */
  version: number;
  /** Array of form fields */
  fields: FormField[];
  /** Form settings */
  settings: FormSettings;
  /** Whether this schema version is published */
  isPublished: boolean;
  /** Optional render token for public access */
  renderToken?: string;
  /** Token expiration timestamp */
  expiresAt?: Date;
  /** Optional theme ID reference for form styling */
  themeId?: string;
  /** Optional iframe embed configuration for published forms */
  iframeEmbedOptions?: IframeEmbedOptions;
  /**
   * Optional template category for this form (stored in schema_json.category)
   * Used for analytics, template detection, and category-specific processing
   * @since Story 30.1 (Templates Infrastructure)
   */
  category?: string; // Template category (polls, quiz, ecommerce, services, data_collection, events)
  /** Schema creation timestamp */
  createdAt: Date;
  /** Schema last update timestamp */
  updatedAt: Date;
  /** Embedded theme object when fetched from API (not stored in DB) */
  theme?: FormTheme;
  /** Embedded template object when fetched from API (not stored in DB) - Story 29.13 */
  template?: any; // Import from templates.types.ts would create circular dependency
  /** Optional business logic configuration for template-based forms (Epic 30) */
  businessLogicConfig?: any; // Import from templates.types.ts would create circular dependency
  /** Optional metadata for extended form properties (Epic 30) */
  metadata?: {
    /** Template category for analytics and detection */
    templateCategory?: string;
    /** Additional custom metadata fields */
    [key: string]: any;
  };
}

/**
 * Form status
 */
export enum FormStatus {
  /** Form is in draft mode */
  DRAFT = 'draft',
  /** Form is published and accepting submissions */
  PUBLISHED = 'published',
}

/**
 * Form metadata with schema
 */
export interface FormMetadata {
  /** Unique form identifier */
  id: string;
  /** User ID of form creator */
  userId: string;
  /** Optional tenant ID for multi-tenancy */
  tenantId?: string;
  /** Form title */
  title: string;
  /** Form description */
  description?: string;
  /** Form status */
  status: FormStatus;
  /** Form schema containing fields and settings */
  schema?: FormSchema;
  /** QR code storage URL for form sharing (Story 26.3) */
  qrCodeUrl?: string;
  /** Short code for easy form access (7-character code) */
  shortCode?: string;
  /** Form creation timestamp */
  createdAt: Date;
  /** Form last update timestamp */
  updatedAt: Date;
}

/**
 * Step navigation event for tracking user progression through multi-step forms
 */
export interface StepNavigationEvent {
  /** Step identifier */
  stepId: string;
  /** Step order index (0-based) */
  stepOrder: number;
  /** Navigation action performed */
  action: 'view' | 'next' | 'previous' | 'submit';
  /** Event timestamp */
  timestamp: Date;
}

/**
 * Form submission metadata with optional step events
 */
export interface FormSubmissionMetadata {
  /** Step navigation events for multi-step forms */
  stepEvents?: StepNavigationEvent[];
  /** Additional custom metadata */
  [key: string]: unknown;
}

/**
 * Form submission data
 */
export interface FormSubmission {
  /** Unique submission identifier */
  id: string;
  /** Form schema ID this submission belongs to */
  formSchemaId: string;
  /** Submitted field values (key-value pairs) */
  values: Record<string, unknown>;
  /** Submission timestamp */
  submittedAt: Date;
  /** IP address of submitter */
  submitterIp: string;
  /** Optional user ID for authenticated submissions */
  userId?: string;
  /** Additional metadata with optional step events */
  metadata?: FormSubmissionMetadata;
}

/**
 * Public form response interface for rendering published forms via short code
 */
export interface PublicFormResponse {
  /** Success indicator */
  success: boolean;
  /** Response message */
  message: string;
  /** Form data for rendering */
  form: {
    /** Form schema ID */
    id: string;
    /** Form schema with fields */
    schema: FormSchema;
    /** Form settings for rendering */
    settings: FormSettings;
    /** Optional theme object (null if no theme or theme deleted) */
    theme?: FormTheme | null;
    /** Short code used to access this form */
    shortCode: string;
  };
  /** Response timestamp */
  timestamp: string;
}

/**
 * Numeric field statistics
 */
export interface NumericStatistics {
  /** Average/mean value */
  mean: number;
  /** Median value */
  median: number;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Standard deviation */
  stdDev: number;
  /** Number of valid data points */
  count: number;
}

/**
 * Choice field distribution data
 */
export interface ChoiceDistribution {
  /** Option label */
  label: string;
  /** Option value */
  value: string | number;
  /** Number of times this option was selected */
  count: number;
  /** Percentage of total selections */
  percentage: number;
}

/**
 * Time series data point
 */
export interface TimeSeriesData {
  /** Time period label (formatted date) */
  label: string;
  /** Count/value for this time period */
  count: number;
}

/**
 * Field-specific statistics data
 */
export interface FieldStatistics {
  /** The form field */
  field: FormField;
  /** Type of visualization */
  type: 'numeric' | 'choice' | 'timeseries' | 'text' | 'toggle' | 'none';
  /** Statistics data (type depends on visualization type) */
  data: NumericStatistics | ChoiceDistribution[] | TimeSeriesData[] | null;
  /** Selected or default chart type for this field */
  chartType: ChartType;
}

/**
 * Filter options for form submission queries and exports
 */
export interface SubmissionFilterOptions {
  /** Array of field names to include in export (if undefined, includes all fields) */
  fields?: string[];
  /** Start date for filtering submissions (inclusive) */
  dateFrom?: Date;
  /** End date for filtering submissions (inclusive) */
  dateTo?: Date;
  /** Array of field value filters (AND logic - all must match) */
  fieldFilters?: { field: string; value: any }[];
}

/**
 * CSS validation result for custom field styling
 */
export interface CSSValidationResult {
  /** Whether the CSS is valid */
  valid: boolean;
  /** Array of warning messages (non-blocking) */
  warnings: string[];
  /** Array of error messages (blocking) */
  errors: string[];
}

/**
 * Supported chart types for analytics visualization
 */
export type ChartType =
  | 'bar'
  | 'line'
  | 'pie'
  | 'polar'
  | 'radar'
  | 'area'
  | 'doughnut'
  | 'horizontal-bar'
  | 'stat';

/**
 * Chart type option for UI selection
 */
export interface ChartTypeOption {
  /** Chart type value */
  value: ChartType;
  /** Display label */
  label: string;
  /** PrimeNG icon class */
  icon: string;
}

/**
 * Step completion statistics for multi-step form analytics
 */
export interface StepCompletionStats {
  /** Step identifier */
  stepId: string;
  /** Step title */
  stepTitle: string;
  /** Step order index (0-based) */
  stepOrder: number;
  /** Number of users who viewed/reached this step */
  totalStarted: number;
  /** Number of users who completed this step (clicked Next or Submit) */
  totalCompleted: number;
  /** Completion rate percentage (completed / started * 100) */
  completionRate: number;
  /** Number of users who abandoned at this step */
  dropOffCount: number;
  /** Drop-off rate percentage (dropOff / started * 100) */
  dropOffRate: number;
  /** Average time spent on this step in seconds (optional) */
  averageTimeSpent?: number;
}

/**
 * Step form analytics data for multi-step wizard forms
 */
export interface StepFormAnalytics {
  /** Whether the form is a multi-step form */
  isStepForm: boolean;
  /** Total number of steps in the form */
  totalSteps: number;
  /** Overall completion rate (percentage who completed all steps) */
  overallCompletionRate: number;
  /** Total number of submissions */
  totalSubmissions: number;
  /** Step-level completion statistics */
  stepStats: StepCompletionStats[];
  /** Funnel visualization data (step progression) */
  funnelData: { step: string; count: number }[];
}

/**
 * Response from token status API for smart token management
 * Used to determine if a form has existing valid tokens before publishing
 */
export interface TokenStatusResponse {
  /** Whether the form has at least one valid (unexpired) token */
  hasValidToken: boolean;
  /** Token expiration date (null if permanent token) */
  tokenExpiration: Date | null;
  /** When the token was created */
  tokenCreatedAt: Date;
  /** The public form URL for the existing token */
  formUrl: string;
}

/**
 * Enhanced publishing response with QR code information
 * Story 26.3: Integrated QR Code Generation and Display
 */
export interface PublishFormResponse {
  /** Published form metadata */
  form: FormMetadata;
  /** Published form schema */
  formSchema: FormSchema;
  /** Public render URL for the form (JWT token URL - kept for backward compatibility) */
  renderUrl: string;
  /** Short link URL for easy sharing (preferred for displaying to users) */
  shortUrl: string;
  /** 7-character short code used in the short URL */
  shortCode: string;
  /** QR code storage URL (optional, may be null if generation fails) */
  qrCodeUrl?: string;
  /** Whether QR code generation was successful */
  qrCodeGenerated: boolean;
}

/**
 * Iframe embed options for customizing generated iframe code
 * Story 26.4: Iframe Embed Code Generator
 */
export interface IframeEmbedOptions {
  /** Iframe width (px, %, or custom value) */
  width: string;
  /** Iframe height (px, %, or custom value) */
  height: string;
  /** Whether to use responsive width (percentage-based) */
  responsive: boolean;
  /** Whether to show iframe border (frameborder attribute) */
  showBorder: boolean;
  /** Whether to allow scrolling within iframe */
  allowScrolling: boolean;
  /** Title attribute for accessibility */
  title: string;
}

/**
 * Generated iframe embed code with metadata
 * Story 26.4: Iframe Embed Code Generator
 */
export interface IframeEmbedCode {
  /** Complete HTML iframe code ready for embedding */
  htmlCode: string;
  /** Preview URL for the embedded form */
  previewUrl: string;
  /** Embed options used to generate this code */
  options: IframeEmbedOptions;
}

/**
 * Request payload for publishing a form
 * Includes optional expiration and iframe embed configuration
 */
export interface PublishFormRequest {
  /** Optional expiration duration in days (null for permanent) */
  expiresInDays?: number;
  /** Optional iframe embed configuration */
  iframeEmbedOptions?: IframeEmbedOptions;
}

/**
 * Chart.js compatible data structure for analytics charts
 * Used by StatisticsEngine for quiz score distributions and other chart data
 * Story 29.13: Quiz Template with Scoring Logic
 */
export interface ChartData {
  /** Chart labels (x-axis values) */
  labels: string[];
  /** Chart datasets with data points and styling */
  datasets: ChartDataset[];
}

/**
 * Chart.js dataset configuration
 * Includes data points and visual styling options
 */
export interface ChartDataset {
  /** Dataset label (shown in legend/tooltips) */
  label: string;
  /** Data values (y-axis values) */
  data: number[];
  /** Background color(s) for bars/lines/points */
  backgroundColor?: string | string[];
  /** Border color for chart elements */
  borderColor?: string;
  /** Border width in pixels */
  borderWidth?: number;
}

