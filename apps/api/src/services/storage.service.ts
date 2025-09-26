/**
 * DigitalOcean Spaces storage service.
 * Provides secure cloud storage operations using S3-compatible API.
 */
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash } from 'crypto';
import {
  StorageService as IStorageService,
  StorageConfig,
  FileValidationResult,
  UploadOptions,
} from '@nodeangularfullstack/shared';
import { appConfig } from '../config';

/**
 * File signature constants for magic byte detection.
 * These are used to validate file types by examining file headers.
 */
const FILE_SIGNATURES = {
  JPEG: {
    SIGNATURE: [0xff, 0xd8, 0xff],
    MIME_TYPE: 'image/jpeg',
    MIN_BYTES: 3,
  },
  PNG: {
    SIGNATURE: [0x89, 0x50, 0x4e, 0x47],
    MIME_TYPE: 'image/png',
    MIN_BYTES: 4,
  },
  GIF: {
    SIGNATURE: [0x47, 0x49, 0x46],
    VALID_VERSIONS: [0x38, 0x39],
    MIME_TYPE: 'image/gif',
    MIN_BYTES: 4,
  },
  WEBP: {
    RIFF_SIGNATURE: [0x52, 0x49, 0x46, 0x46],
    WEBP_SIGNATURE: [0x57, 0x45, 0x42, 0x50],
    MIME_TYPE: 'image/webp',
    MIN_BYTES: 12,
    RIFF_OFFSET: 0,
    WEBP_OFFSET: 8,
  },
} as const;

/**
 * File size constants.
 */
const FILE_SIZE_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  HEADER_BUFFER_SIZE: 12, // Enough for WebP validation
} as const;

/**
 * HTTP status codes used for storage operations.
 */
const HTTP_STATUS_CODES = {
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Storage operation error class.
 * Provides standardized error handling for storage operations.
 */
export class StorageError extends Error {
  public statusCode: number;
  public code: string;
  public details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
    code: string = 'STORAGE_ERROR',
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'StorageError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * DigitalOcean Spaces storage service implementation.
 * Implements secure file upload, download, deletion, and validation for avatar storage.
 */
export class StorageService implements IStorageService {
  private s3Client: S3Client;
  private config: StorageConfig;

  /**
   * Maximum file size for uploads (5MB).
   */
  private readonly MAX_FILE_SIZE = FILE_SIZE_LIMITS.MAX_FILE_SIZE;

  /**
   * Allowed MIME types for avatar images.
   */
  private readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  constructor() {
    // Extract storage configuration from app config
    const storageConfig = appConfig.storage;

    this.config = {
      endpoint: storageConfig.endpoint,
      region: storageConfig.region,
      accessKeyId: storageConfig.key,
      secretAccessKey: storageConfig.secret,
      bucketName: storageConfig.bucket,
    };

    // Initialize S3 client for DigitalOcean Spaces
    this.s3Client = new S3Client({
      endpoint: this.config.endpoint,
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
      forcePathStyle: false, // DigitalOcean Spaces uses virtual-hosted-style URLs
    });
  }

  /**
   * Uploads a file to DigitalOcean Spaces.
   * @param file - File buffer containing the file data
   * @param fileName - Name for the stored file
   * @param contentType - MIME type of the file
   * @param options - Additional upload options
   * @returns Promise resolving to the file's public URL
   * @throws {StorageError} When upload fails or validation errors occur
   * @example
   * const url = await storageService.uploadFile(
   *   fileBuffer,
   *   'avatar-123.jpg',
   *   'image/jpeg'
   * );
   */
  async uploadFile(
    file: Buffer,
    fileName: string,
    contentType: string,
    options?: UploadOptions
  ): Promise<string> {
    try {
      // Validate file before upload
      await this.validateFile(file, fileName, contentType);

      // Generate unique file name if requested
      const finalFileName =
        (options?.generateUniqueFileName ?? false)
          ? this.generateUniqueFileName(fileName)
          : fileName;

      // Prepare upload command
      const uploadCommand = new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: finalFileName,
        Body: file,
        ContentType: contentType,
        ContentLength: file.length,
        ACL: 'public-read', // Make files publicly accessible
        Metadata: {
          'upload-timestamp': new Date().toISOString(),
          'original-name': fileName,
          ...options?.metadata,
        },
      });

      // Execute upload
      await this.s3Client.send(uploadCommand);

      // Return public URL
      return this.getPublicUrl(finalFileName);
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }

      // Handle AWS SDK errors
      if (error instanceof Error) {
        throw new StorageError(
          `Failed to upload file: ${error.message}`,
          HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
          'UPLOAD_FAILED',
          { originalError: error.message, fileName, contentType }
        );
      }

      throw new StorageError(
        'Unknown error occurred during file upload',
        500,
        'UPLOAD_UNKNOWN_ERROR',
        { fileName, contentType }
      );
    }
  }

  /**
   * Deletes a file from DigitalOcean Spaces.
   * @param fileName - Name of the file to delete
   * @returns Promise resolving when deletion is complete
   * @throws {StorageError} When deletion fails or file not found
   * @example
   * await storageService.deleteFile('avatar-123.jpg');
   */
  async deleteFile(fileName: string): Promise<void> {
    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.config.bucketName,
        Key: fileName,
      });

      await this.s3Client.send(deleteCommand);
    } catch (error) {
      if (error instanceof Error) {
        throw new StorageError(
          `Failed to delete file: ${error.message}`,
          HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
          'DELETE_FAILED',
          { originalError: error.message, fileName }
        );
      }

      throw new StorageError(
        'Unknown error occurred during file deletion',
        500,
        'DELETE_UNKNOWN_ERROR',
        { fileName }
      );
    }
  }

  /**
   * Retrieves the public URL for a stored file.
   * @param fileName - Name of the file to retrieve URL for
   * @returns Promise resolving to the file's public URL
   * @throws {StorageError} When file not found or access denied
   * @example
   * const url = await storageService.getFileUrl('avatar-123.jpg');
   */
  async getFileUrl(fileName: string): Promise<string> {
    try {
      // Check if file exists
      const headCommand = new HeadObjectCommand({
        Bucket: this.config.bucketName,
        Key: fileName,
      });

      await this.s3Client.send(headCommand);

      // Return public URL
      return this.getPublicUrl(fileName);
    } catch (error) {
      if (error instanceof Error) {
        const statusCode =
          error.name === 'NotFound'
            ? HTTP_STATUS_CODES.NOT_FOUND
            : HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR;
        const code =
          error.name === 'NotFound' ? 'FILE_NOT_FOUND' : 'GET_URL_FAILED';

        throw new StorageError(
          `Failed to get file URL: ${error.message}`,
          statusCode,
          code,
          { originalError: error.message, fileName }
        );
      }

      throw new StorageError(
        'Unknown error occurred while getting file URL',
        500,
        'GET_URL_UNKNOWN_ERROR',
        { fileName }
      );
    }
  }

  /**
   * Validates a file for security and compliance checks.
   * @param file - File buffer to validate
   * @param fileName - Original file name
   * @param contentType - File's MIME type
   * @returns Promise resolving when validation passes
   * @throws {StorageError} When validation fails
   * @example
   * await storageService.validateFile(fileBuffer, 'avatar.jpg', 'image/jpeg');
   */
  async validateFile(
    file: Buffer,
    fileName: string,
    contentType: string
  ): Promise<void> {
    const validationResult = await this.performFileValidation(
      file,
      fileName,
      contentType
    );

    if (!validationResult.isValid) {
      throw new StorageError(
        validationResult.error ?? 'File validation failed',
        HTTP_STATUS_CODES.BAD_REQUEST,
        'FILE_VALIDATION_FAILED',
        {
          fileName,
          contentType,
          fileSize: validationResult.fileSize,
          detectedType: validationResult.fileType,
        }
      );
    }
  }

  /**
   * Performs comprehensive file validation.
   * @param file - File buffer to validate
   * @param fileName - Original file name
   * @param contentType - File's MIME type
   * @returns Promise resolving to validation result
   */
  private async performFileValidation(
    file: Buffer,
    fileName: string,
    contentType: string
  ): Promise<FileValidationResult> {
    // Check file size
    if (file.length > this.MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `File size exceeds maximum limit of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
        fileSize: file.length,
      };
    }

    // Check if file is not empty
    if (file.length === 0) {
      return {
        isValid: false,
        error: 'File is empty',
        fileSize: 0,
      };
    }

    // Validate MIME type
    if (!this.ALLOWED_MIME_TYPES.includes(contentType)) {
      return {
        isValid: false,
        error: `File type not allowed. Allowed types: ${this.ALLOWED_MIME_TYPES.join(', ')}`,
        fileType: contentType,
        fileSize: file.length,
      };
    }

    // Validate file name for security (prevent path traversal)
    if (this.containsPathTraversal(fileName)) {
      return {
        isValid: false,
        error: 'File name contains invalid characters',
        fileSize: file.length,
      };
    }

    // Validate file header/magic bytes for additional security
    const detectedType = this.detectFileTypeFromHeader(file);
    if (
      detectedType === null ||
      !this.ALLOWED_MIME_TYPES.includes(detectedType)
    ) {
      return {
        isValid: false,
        error: 'File content does not match declared type',
        fileType: detectedType ?? undefined,
        fileSize: file.length,
      };
    }

    // Validate file extension matches content type
    const fileExtension = fileName.toLowerCase().split('.').pop();
    if (!this.isValidExtensionForType(fileExtension, contentType)) {
      return {
        isValid: false,
        error: 'File extension does not match content type',
        fileType: contentType,
        fileSize: file.length,
      };
    }

    return {
      isValid: true,
      fileType: detectedType ?? undefined,
      fileSize: file.length,
    };
  }

  /**
   * Detects file type from header bytes.
   * @param file - File buffer
   * @returns Detected MIME type or null
   */
  private detectFileTypeFromHeader(file: Buffer): string | null {
    if (file.length < FILE_SIGNATURES.JPEG.MIN_BYTES) return null;

    // Check each file type using dedicated helper methods
    if (this.isJpegFile(file)) {
      return FILE_SIGNATURES.JPEG.MIME_TYPE;
    }

    if (this.isPngFile(file)) {
      return FILE_SIGNATURES.PNG.MIME_TYPE;
    }

    if (this.isGifFile(file)) {
      return FILE_SIGNATURES.GIF.MIME_TYPE;
    }

    if (this.isWebpFile(file)) {
      return FILE_SIGNATURES.WEBP.MIME_TYPE;
    }

    return null;
  }

  /**
   * Checks if file is a JPEG by examining magic bytes.
   * @param file - File buffer
   * @returns True if JPEG file
   */
  private isJpegFile(file: Buffer): boolean {
    if (file.length < FILE_SIGNATURES.JPEG.MIN_BYTES) return false;
    const signature = FILE_SIGNATURES.JPEG.SIGNATURE;
    return (
      file[0] === signature[0] &&
      file[1] === signature[1] &&
      file[2] === signature[2]
    );
  }

  /**
   * Checks if file is a PNG by examining magic bytes.
   * @param file - File buffer
   * @returns True if PNG file
   */
  private isPngFile(file: Buffer): boolean {
    if (file.length < FILE_SIGNATURES.PNG.MIN_BYTES) return false;
    const signature = FILE_SIGNATURES.PNG.SIGNATURE;
    return (
      file[0] === signature[0] &&
      file[1] === signature[1] &&
      file[2] === signature[2] &&
      file[3] === signature[3]
    );
  }

  /**
   * Checks if file is a GIF by examining magic bytes.
   * @param file - File buffer
   * @returns True if GIF file
   */
  private isGifFile(file: Buffer): boolean {
    if (file.length < FILE_SIGNATURES.GIF.MIN_BYTES) return false;
    const signature = FILE_SIGNATURES.GIF.SIGNATURE;
    const validVersions = FILE_SIGNATURES.GIF.VALID_VERSIONS;
    return (
      file[0] === signature[0] &&
      file[1] === signature[1] &&
      file[2] === signature[2] &&
      (validVersions as readonly number[]).includes(file[3])
    );
  }

  /**
   * Checks if file is a WebP by examining magic bytes.
   * @param file - File buffer
   * @returns True if WebP file
   */
  private isWebpFile(file: Buffer): boolean {
    if (file.length < FILE_SIGNATURES.WEBP.MIN_BYTES) return false;

    const riffSignature = FILE_SIGNATURES.WEBP.RIFF_SIGNATURE;
    const webpSignature = FILE_SIGNATURES.WEBP.WEBP_SIGNATURE;

    // Check RIFF signature at beginning
    const riffMatch = riffSignature.every(
      (byte, index) => file[FILE_SIGNATURES.WEBP.RIFF_OFFSET + index] === byte
    );

    // Check WEBP signature at offset 8
    const webpMatch = webpSignature.every(
      (byte, index) => file[FILE_SIGNATURES.WEBP.WEBP_OFFSET + index] === byte
    );

    return riffMatch && webpMatch;
  }

  /**
   * Checks if file name contains path traversal attempts.
   * @param fileName - File name to check
   * @returns True if contains path traversal
   */
  private containsPathTraversal(fileName: string): boolean {
    const dangerousPatterns = ['../', '.\\', '..\\', '../', '..\\'];
    return dangerousPatterns.some((pattern) => fileName.includes(pattern));
  }

  /**
   * Validates file extension matches content type.
   * @param extension - File extension
   * @param contentType - MIME content type
   * @returns True if valid combination
   */
  private isValidExtensionForType(
    extension: string | undefined,
    contentType: string
  ): boolean {
    if (extension === undefined) return false;

    const validCombinations: Record<string, string[]> = {
      'image/jpeg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'image/gif': ['gif'],
      'image/webp': ['webp'],
    };

    return validCombinations[contentType]?.includes(extension) || false;
  }

  /**
   * Generates a unique file name to prevent collisions.
   * @param originalFileName - Original file name
   * @returns Unique file name with timestamp and hash
   */
  private generateUniqueFileName(originalFileName: string): string {
    const extension = originalFileName.split('.').pop();
    const timestamp = Date.now();
    const hash = createHash('md5')
      .update(originalFileName + timestamp)
      .digest('hex')
      .substring(0, 8);
    return `${timestamp}-${hash}.${extension}`;
  }

  /**
   * Constructs the public URL for a file.
   * @param fileName - File name
   * @returns Public URL
   */
  private getPublicUrl(fileName: string): string {
    const baseUrl = this.config.endpoint.replace(
      'https://',
      `https://${this.config.bucketName}.`
    );
    return `${baseUrl}/${fileName}`;
  }

  /**
   * Generates a pre-signed URL for direct browser uploads.
   * @param fileName - File name for the upload
   * @param contentType - MIME type for the upload
   * @param expiresIn - URL expiration time in seconds (default: 1 hour)
   * @returns Promise resolving to pre-signed URL
   * @throws {StorageError} When URL generation fails
   */
  async getPresignedUploadUrl(
    fileName: string,
    contentType: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: fileName,
        ContentType: contentType,
        ACL: 'public-read',
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      return signedUrl;
    } catch (error) {
      if (error instanceof Error) {
        throw new StorageError(
          `Failed to generate presigned URL: ${error.message}`,
          HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
          'PRESIGNED_URL_FAILED',
          { originalError: error.message, fileName, contentType }
        );
      }

      throw new StorageError(
        'Unknown error occurred while generating presigned URL',
        500,
        'PRESIGNED_URL_UNKNOWN_ERROR',
        { fileName, contentType }
      );
    }
  }
}

/**
 * Default storage service instance.
 * Pre-configured singleton for use across the application.
 */
export const storageService = new StorageService();
