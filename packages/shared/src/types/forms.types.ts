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
 * Group-specific metadata for GROUP field type
 */
export interface GroupMetadata {
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
  /** Additional metadata for special field types (e.g., GROUP) */
  metadata?: GroupMetadata;
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
