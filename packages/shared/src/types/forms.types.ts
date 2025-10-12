/**
 * Form Builder Type Definitions
 * Shared types for form creation, schema management, and submissions
 */

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
 * Row layout configuration for multi-column form rows
 */
export interface RowLayoutConfig {
  /** Unique row identifier */
  rowId: string;
  /** Number of columns in this row (0 = full-width, 1-4 = columns) */
  columnCount: 0 | 1 | 2 | 3 | 4;
  /** Row order index for rendering */
  order: number;
}

/**
 * Field position within row-column layout
 */
export interface FieldPosition {
  /** Row identifier this field belongs to */
  rowId: string;
  /** Column index within row (0-3 for columns 1-4) */
  columnIndex: number;
  /**
   * Order index within column for vertical stacking (0-based)
   * Optional for backward compatibility - defaults to 0 if undefined
   * Fields with lower orderInColumn render above fields with higher orderInColumn
   */
  orderInColumn?: number;
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
  /** Additional metadata for special field types (e.g., GROUP, HEADING, IMAGE, TEXT_BLOCK, IMAGE_GALLERY) */
  metadata?:
    | GroupMetadata
    | HeadingMetadata
    | ImageMetadata
    | TextBlockMetadata
    | ImageGalleryMetadata;
  /** Position within row-column layout (optional, for row-based layouts) */
  position?: FieldPosition;
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
  /** Schema creation timestamp */
  createdAt: Date;
  /** Schema last update timestamp */
  updatedAt: Date;
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
  /** Form creation timestamp */
  createdAt: Date;
  /** Form last update timestamp */
  updatedAt: Date;
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
  /** Additional metadata */
  metadata?: Record<string, unknown>;
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
