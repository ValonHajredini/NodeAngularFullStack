/**
 * Local file storage service for development.
 * Provides file storage operations using the local filesystem.
 */
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import {
  StorageService as IStorageService,
  FileValidationResult,
  UploadOptions,
} from '@nodeangularfullstack/shared';

/**
 * Local storage service implementation for development.
 * Stores files in the local filesystem instead of cloud storage.
 */
export class LocalStorageService implements IStorageService {
  private readonly storageDir: string;
  private readonly baseUrl: string;

  /**
   * Maximum file size for uploads (5MB).
   */
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024;

  /**
   * Allowed MIME types for avatar images.
   */
  private readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  constructor(
    storageDir: string = './uploads',
    baseUrl: string = 'http://localhost:3000'
  ) {
    this.storageDir = storageDir;
    this.baseUrl = baseUrl;
    this.ensureStorageDirectory();
  }

  /**
   * Uploads a file to local storage.
   * @param file - File buffer containing the file data
   * @param fileName - Name for the stored file
   * @param contentType - MIME type of the file
   * @param options - Additional upload options
   * @returns Promise resolving to the file's public URL
   */
  async uploadFile(
    file: Buffer,
    fileName: string,
    contentType: string,
    options?: UploadOptions
  ): Promise<string> {
    try {
      // Validate file
      const validationResult = await this.performFileValidation(
        file,
        fileName,
        contentType
      );
      if (!validationResult.isValid) {
        throw new Error(validationResult.error ?? 'File validation failed');
      }

      // Generate unique file name if requested
      const finalFileName =
        (options?.generateUniqueFileName ?? false)
          ? this.generateUniqueFileName(fileName)
          : fileName;

      // Ensure directory exists
      const filePath = join(this.storageDir, finalFileName);
      await this.ensureDirectoryExists(dirname(filePath));

      // Write file to local storage
      await fs.writeFile(filePath, file);

      // Return public URL
      return this.getPublicUrl(finalFileName);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to upload file: ${error.message}`);
      }
      throw new Error('Unknown error occurred during file upload');
    }
  }

  /**
   * Deletes a file from local storage.
   * @param fileName - Name of the file to delete
   * @returns Promise resolving when deletion is complete
   */
  async deleteFile(fileName: string): Promise<void> {
    try {
      const filePath = join(this.storageDir, fileName);
      await fs.unlink(filePath);
    } catch (error) {
      // If file doesn't exist, that's fine - it's already "deleted"
      if (error instanceof Error && (error as any).code !== 'ENOENT') {
        throw new Error(`Failed to delete file: ${error.message}`);
      }
    }
  }

  /**
   * Retrieves the public URL for a stored file.
   * @param fileName - Name of the file to retrieve URL for
   * @returns Promise resolving to the file's public URL
   */
  async getFileUrl(fileName: string): Promise<string> {
    const filePath = join(this.storageDir, fileName);
    try {
      await fs.access(filePath);
      return this.getPublicUrl(fileName);
    } catch (error) {
      throw new Error(`File not found: ${fileName}`);
    }
  }

  /**
   * Validates a file for security and compliance checks.
   * @param file - File buffer to validate
   * @param fileName - Original file name
   * @param contentType - File's MIME type
   * @returns Promise resolving when validation passes
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
      throw new Error(validationResult.error ?? 'File validation failed');
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

    return {
      isValid: true,
      fileType: contentType,
      fileSize: file.length,
      validatedContentType: contentType,
    };
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
    return `${this.baseUrl}/uploads/${fileName}`;
  }

  /**
   * Ensures the storage directory exists.
   */
  private async ensureStorageDirectory(): Promise<void> {
    await this.ensureDirectoryExists(this.storageDir);
  }

  /**
   * Ensures a directory exists, creating it if necessary.
   * @param dirPath - Directory path to ensure
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // If directory already exists, that's fine
      if (error instanceof Error && (error as any).code !== 'EEXIST') {
        throw new Error(`Failed to create directory: ${error.message}`);
      }
    }
  }
}

/**
 * Default local storage service instance for development.
 */
export const localStorageService = new LocalStorageService();
