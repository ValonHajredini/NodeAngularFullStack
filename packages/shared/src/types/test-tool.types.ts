/**
 * Test Tool Type Definitions
 *
 * Shared TypeScript interfaces for Test Tool domain.
 * Used by both frontend and backend for type safety.
 */

/**
 * Test Tool database record.
 * Represents a single test tool entry.
 */
export interface TestToolRecord {
  /** Unique identifier (UUID) */
  id: string;

  /** Test Tool name */
  name: string;

  /** Optional description */
  description?: string;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;

  /** User who created the record (UUID) */
  createdBy: string;
}

/**
 * Input for creating new Test Tool record.
 */
export interface CreateTestToolInput {
  /** Test Tool name (required, 3-255 chars) */
  name: string;

  /** Optional description (max 500 chars) */
  description?: string;

  /** User creating the record (UUID) */
  createdBy: string;
}

/**
 * Input for updating Test Tool record.
 * All fields optional (partial update).
 */
export interface UpdateTestToolInput {
  /** Updated name */
  name?: string;

  /** Updated description */
  description?: string;
}
