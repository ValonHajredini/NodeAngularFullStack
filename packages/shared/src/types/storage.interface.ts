/**
 * Storage service interfaces for DigitalOcean Spaces integration.
 * Provides type safety across frontend and backend for file operations.
 */

/**
 * Main storage service interface defining core file operations.
 * Used for secure cloud storage operations with DigitalOcean Spaces.
 */
export interface StorageService {
  /**
   * Uploads a file to cloud storage.
   * @param file - File buffer containing the file data
   * @param fileName - Name for the stored file
   * @param contentType - MIME type of the file
   * @returns Promise resolving to the file's public URL
   * @throws {StorageError} When upload fails or validation errors occur
   */
  uploadFile(file: Buffer, fileName: string, contentType: string): Promise<string>;

  /**
   * Deletes a file from cloud storage.
   * @param fileName - Name of the file to delete
   * @returns Promise resolving when deletion is complete
   * @throws {StorageError} When deletion fails or file not found
   */
  deleteFile(fileName: string): Promise<void>;

  /**
   * Retrieves the public URL for a stored file.
   * @param fileName - Name of the file to retrieve URL for
   * @returns Promise resolving to the file's public URL
   * @throws {StorageError} When file not found or access denied
   */
  getFileUrl(fileName: string): Promise<string>;

  /**
   * Validates a file for security and compliance checks.
   * @param file - File buffer to validate
   * @param fileName - Original file name
   * @param contentType - File's MIME type
   * @returns Promise resolving when validation passes
   * @throws {StorageError} When validation fails
   */
  validateFile(file: Buffer, fileName: string, contentType: string): Promise<void>;
}

/**
 * Configuration interface for DigitalOcean Spaces connection.
 * Contains all required credentials and settings for S3-compatible operations.
 */
export interface StorageConfig {
  /** DigitalOcean Spaces endpoint URL (e.g., 'https://nyc3.digitaloceanspaces.com') */
  endpoint: string;
  /** DigitalOcean Spaces region (e.g., 'nyc3') */
  region: string;
  /** DigitalOcean Spaces access key ID */
  accessKeyId: string;
  /** DigitalOcean Spaces secret access key */
  secretAccessKey: string;
  /** DigitalOcean Spaces bucket name */
  bucketName: string;
}

/**
 * File validation result interface.
 * Provides detailed information about file validation outcomes.
 */
export interface FileValidationResult {
  /** Whether the file passes all validation checks */
  isValid: boolean;
  /** Error message if validation fails */
  error?: string;
  /** Detected file type (MIME type) */
  fileType?: string;
  /** File size in bytes */
  fileSize?: number;
  /** The validated content type to use for upload (detected type or declared type) */
  validatedContentType?: string;
}

/**
 * Storage operation error interface.
 * Standardized error structure for storage-related failures.
 */
export interface StorageError extends Error {
  /** HTTP status code equivalent */
  statusCode: number;
  /** Machine-readable error code */
  code: string;
  /** Additional error context */
  details?: any;
}

/**
 * Upload options interface for configurable upload behavior.
 */
export interface UploadOptions {
  /** Maximum file size in bytes (default: 5MB) */
  maxFileSize?: number;
  /** Allowed file types (MIME types) */
  allowedTypes?: string[];
  /** Whether to generate a unique file name */
  generateUniqueFileName?: boolean;
  /** Custom metadata to attach to the file */
  metadata?: Record<string, string>;
}