/**
 * Unit tests for StorageService.
 * Tests DigitalOcean Spaces storage operations with mocked AWS SDK calls.
 */
import {
  StorageService,
  StorageError,
} from '../../../src/services/storage.service';

// Mock AWS SDK modules

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  PutObjectCommand: jest.fn().mockImplementation((params) => ({ params })),
  DeleteObjectCommand: jest.fn().mockImplementation((params) => ({ params })),
  HeadObjectCommand: jest.fn().mockImplementation((params) => ({ params })),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

// Mock appConfig
jest.mock('../../../src/config', () => ({
  appConfig: {
    storage: {
      endpoint: 'https://nyc3.digitaloceanspaces.com',
      region: 'nyc3',
      key: 'test-access-key',
      secret: 'test-secret-key',
      bucket: 'test-bucket',
    },
  },
}));

describe('StorageService', () => {
  let storageService: StorageService;
  let mockSend: jest.Mock;
  let mockGetSignedUrl: jest.Mock;

  // Test file data
  const validJpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]); // JPEG header
  const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG header
  const invalidBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]); // Invalid header
  const emptyBuffer = Buffer.alloc(0);
  const largePngBuffer = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    Buffer.alloc(6 * 1024 * 1024), // 6MB - exceeds limit
  ]);

  beforeEach(() => {
    // Get references to the mocked functions
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { S3Client } = require('@aws-sdk/client-s3');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

    mockSend = jest.fn();
    mockGetSignedUrl = getSignedUrl as jest.Mock;

    // Override the S3Client constructor to return our mock
    S3Client.mockImplementation(() => ({
      send: mockSend,
    }));

    storageService = new StorageService();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with configuration from appConfig', () => {
      expect(storageService).toBeDefined();
      // Service should be properly instantiated
      expect(storageService).toBeInstanceOf(StorageService);
    });
  });

  describe('uploadFile', () => {
    it('should successfully upload a valid JPEG file', async () => {
      mockSend.mockResolvedValue({});

      const result = await storageService.uploadFile(
        validJpegBuffer,
        'test-avatar.jpg',
        'image/jpeg'
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            Bucket: 'test-bucket',
            Key: 'test-avatar.jpg',
            Body: validJpegBuffer,
            ContentType: 'image/jpeg',
            ContentLength: validJpegBuffer.length,
            ACL: 'public-read',
          }),
        })
      );

      expect(result).toBe(
        'https://test-bucket.nyc3.digitaloceanspaces.com/test-avatar.jpg'
      );
    });

    it('should successfully upload a valid PNG file', async () => {
      mockSend.mockResolvedValue({});

      const result = await storageService.uploadFile(
        validPngBuffer,
        'test-avatar.png',
        'image/png'
      );

      expect(mockSend).toHaveBeenCalled();
      expect(result).toBe(
        'https://test-bucket.nyc3.digitaloceanspaces.com/test-avatar.png'
      );
    });

    it('should generate unique filename when requested', async () => {
      mockSend.mockResolvedValue({});

      const result = await storageService.uploadFile(
        validJpegBuffer,
        'test-avatar.jpg',
        'image/jpeg',
        { generateUniqueFileName: true }
      );

      // Should call S3 with a unique filename (timestamp-hash.jpg format)
      const calledParams = mockSend.mock.calls[0][0].params;
      expect(calledParams.Key).toMatch(/^\d+-[a-f0-9]{8}\.jpg$/);
      expect(result).toMatch(
        /https:\/\/test-bucket\.nyc3\.digitaloceanspaces\.com\/\d+-[a-f0-9]{8}\.jpg/
      );
    });

    it('should include custom metadata in upload', async () => {
      mockSend.mockResolvedValue({});

      await storageService.uploadFile(
        validJpegBuffer,
        'test-avatar.jpg',
        'image/jpeg',
        {
          metadata: {
            'user-id': '123',
            'upload-source': 'web',
          },
        }
      );

      const calledParams = mockSend.mock.calls[0][0].params;
      expect(calledParams.Metadata).toMatchObject({
        'upload-timestamp': expect.any(String),
        'original-name': 'test-avatar.jpg',
        'user-id': '123',
        'upload-source': 'web',
      });
    });

    it('should throw StorageError for invalid file type', async () => {
      await expect(
        storageService.uploadFile(validJpegBuffer, 'test.txt', 'text/plain')
      ).rejects.toThrow(StorageError);

      await expect(
        storageService.uploadFile(validJpegBuffer, 'test.txt', 'text/plain')
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'FILE_VALIDATION_FAILED',
        message: expect.stringContaining('File type not allowed'),
      });
    });

    it('should throw StorageError for file too large', async () => {
      await expect(
        storageService.uploadFile(
          largePngBuffer,
          'large-image.png',
          'image/png'
        )
      ).rejects.toThrow(StorageError);

      await expect(
        storageService.uploadFile(
          largePngBuffer,
          'large-image.png',
          'image/png'
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'FILE_VALIDATION_FAILED',
        message: expect.stringContaining('File size exceeds maximum limit'),
      });
    });

    it('should throw StorageError for empty file', async () => {
      await expect(
        storageService.uploadFile(emptyBuffer, 'empty.jpg', 'image/jpeg')
      ).rejects.toThrow(StorageError);

      await expect(
        storageService.uploadFile(emptyBuffer, 'empty.jpg', 'image/jpeg')
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'FILE_VALIDATION_FAILED',
        message: 'File is empty',
      });
    });

    it('should throw StorageError for mismatched content type', async () => {
      await expect(
        storageService.uploadFile(invalidBuffer, 'test.jpg', 'image/jpeg')
      ).rejects.toThrow(StorageError);

      await expect(
        storageService.uploadFile(invalidBuffer, 'test.jpg', 'image/jpeg')
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'FILE_VALIDATION_FAILED',
        message: expect.stringContaining(
          'File content does not match declared type'
        ),
      });
    });

    it('should throw StorageError for path traversal attempts', async () => {
      await expect(
        storageService.uploadFile(
          validJpegBuffer,
          '../../../etc/passwd.jpg',
          'image/jpeg'
        )
      ).rejects.toThrow(StorageError);

      await expect(
        storageService.uploadFile(
          validJpegBuffer,
          '../malicious.jpg',
          'image/jpeg'
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'FILE_VALIDATION_FAILED',
        message: 'File name contains invalid characters',
      });
    });

    it('should throw StorageError for invalid extension-type combination', async () => {
      await expect(
        storageService.uploadFile(
          validJpegBuffer,
          'test.png', // PNG extension with JPEG content
          'image/jpeg'
        )
      ).rejects.toThrow(StorageError);

      await expect(
        storageService.uploadFile(validJpegBuffer, 'test.png', 'image/jpeg')
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'FILE_VALIDATION_FAILED',
        message: expect.stringContaining(
          'File extension does not match content type'
        ),
      });
    });

    it('should handle S3 upload errors', async () => {
      const s3Error = new Error('Network timeout');
      mockSend.mockRejectedValue(s3Error);

      await expect(
        storageService.uploadFile(
          validJpegBuffer,
          'test-avatar.jpg',
          'image/jpeg'
        )
      ).rejects.toThrow(StorageError);

      await expect(
        storageService.uploadFile(
          validJpegBuffer,
          'test-avatar.jpg',
          'image/jpeg'
        )
      ).rejects.toMatchObject({
        statusCode: 500,
        code: 'UPLOAD_FAILED',
        message: expect.stringContaining('Failed to upload file'),
      });
    });
  });

  describe('deleteFile', () => {
    it('should successfully delete a file', async () => {
      mockSend.mockResolvedValue({});

      await storageService.deleteFile('test-avatar.jpg');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            Bucket: 'test-bucket',
            Key: 'test-avatar.jpg',
          }),
        })
      );
    });

    it('should handle S3 delete errors', async () => {
      const s3Error = new Error('File not found');
      mockSend.mockRejectedValue(s3Error);

      await expect(
        storageService.deleteFile('non-existent.jpg')
      ).rejects.toThrow(StorageError);

      await expect(
        storageService.deleteFile('non-existent.jpg')
      ).rejects.toMatchObject({
        statusCode: 500,
        code: 'DELETE_FAILED',
        message: expect.stringContaining('Failed to delete file'),
      });
    });
  });

  describe('getFileUrl', () => {
    it('should return public URL for existing file', async () => {
      mockSend.mockResolvedValue({}); // HeadObject succeeds

      const result = await storageService.getFileUrl('test-avatar.jpg');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            Bucket: 'test-bucket',
            Key: 'test-avatar.jpg',
          }),
        })
      );

      expect(result).toBe(
        'https://test-bucket.nyc3.digitaloceanspaces.com/test-avatar.jpg'
      );
    });

    it('should throw 404 error for non-existent file', async () => {
      const notFoundError = new Error('Not found');
      notFoundError.name = 'NotFound';
      mockSend.mockRejectedValue(notFoundError);

      await expect(
        storageService.getFileUrl('non-existent.jpg')
      ).rejects.toThrow(StorageError);

      await expect(
        storageService.getFileUrl('non-existent.jpg')
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'FILE_NOT_FOUND',
        message: expect.stringContaining('Failed to get file URL'),
      });
    });

    it('should handle other S3 errors', async () => {
      const s3Error = new Error('Access denied');
      mockSend.mockRejectedValue(s3Error);

      await expect(storageService.getFileUrl('restricted.jpg')).rejects.toThrow(
        StorageError
      );

      await expect(
        storageService.getFileUrl('restricted.jpg')
      ).rejects.toMatchObject({
        statusCode: 500,
        code: 'GET_URL_FAILED',
        message: expect.stringContaining('Failed to get file URL'),
      });
    });
  });

  describe('validateFile', () => {
    it('should pass validation for valid JPEG file', async () => {
      await expect(
        storageService.validateFile(validJpegBuffer, 'test.jpg', 'image/jpeg')
      ).resolves.not.toThrow();
    });

    it('should pass validation for valid PNG file', async () => {
      await expect(
        storageService.validateFile(validPngBuffer, 'test.png', 'image/png')
      ).resolves.not.toThrow();
    });

    it('should fail validation for invalid MIME type', async () => {
      await expect(
        storageService.validateFile(validJpegBuffer, 'test.txt', 'text/plain')
      ).rejects.toThrow(StorageError);
    });

    it('should fail validation for oversized file', async () => {
      await expect(
        storageService.validateFile(largePngBuffer, 'large.png', 'image/png')
      ).rejects.toThrow(StorageError);
    });

    it('should fail validation for empty file', async () => {
      await expect(
        storageService.validateFile(emptyBuffer, 'empty.jpg', 'image/jpeg')
      ).rejects.toThrow(StorageError);
    });
  });

  describe('getPresignedUploadUrl', () => {
    it('should generate presigned URL for upload', async () => {
      const mockPresignedUrl =
        'https://test-bucket.nyc3.digitaloceanspaces.com/test.jpg?presigned=true';
      mockGetSignedUrl.mockResolvedValue(mockPresignedUrl);

      const result = await storageService.getPresignedUploadUrl(
        'test-avatar.jpg',
        'image/jpeg',
        3600
      );

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.any(Object), // S3Client instance
        expect.objectContaining({
          params: expect.objectContaining({
            Bucket: 'test-bucket',
            Key: 'test-avatar.jpg',
            ContentType: 'image/jpeg',
            ACL: 'public-read',
          }),
        }),
        { expiresIn: 3600 }
      );

      expect(result).toBe(mockPresignedUrl);
    });

    it('should use default expiration time', async () => {
      const mockPresignedUrl =
        'https://test-bucket.nyc3.digitaloceanspaces.com/test.jpg?presigned=true';
      mockGetSignedUrl.mockResolvedValue(mockPresignedUrl);

      await storageService.getPresignedUploadUrl('test.jpg', 'image/jpeg');

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        { expiresIn: 3600 } // Default 1 hour
      );
    });

    it('should handle presigned URL generation errors', async () => {
      const presignError = new Error('Failed to generate presigned URL');
      mockGetSignedUrl.mockRejectedValue(presignError);

      await expect(
        storageService.getPresignedUploadUrl('test.jpg', 'image/jpeg')
      ).rejects.toThrow(StorageError);

      await expect(
        storageService.getPresignedUploadUrl('test.jpg', 'image/jpeg')
      ).rejects.toMatchObject({
        statusCode: 500,
        code: 'PRESIGNED_URL_FAILED',
        message: expect.stringContaining('Failed to generate presigned URL'),
      });
    });
  });

  describe('file type detection', () => {
    it('should correctly detect JPEG files', () => {
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      // Access private method for testing (not ideal, but necessary for comprehensive coverage)
      const detectMethod = (
        storageService as any
      ).detectFileTypeFromHeader.bind(storageService);
      expect(detectMethod(jpegBuffer)).toBe('image/jpeg');
    });

    it('should correctly detect PNG files', () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
      const detectMethod = (
        storageService as any
      ).detectFileTypeFromHeader.bind(storageService);
      expect(detectMethod(pngBuffer)).toBe('image/png');
    });

    it('should correctly detect GIF files', () => {
      const gifBuffer = Buffer.from([0x47, 0x49, 0x46, 0x38]);
      const detectMethod = (
        storageService as any
      ).detectFileTypeFromHeader.bind(storageService);
      expect(detectMethod(gifBuffer)).toBe('image/gif');
    });

    it('should correctly detect WebP files', () => {
      const webpBuffer = Buffer.from([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
      ]);
      const detectMethod = (
        storageService as any
      ).detectFileTypeFromHeader.bind(storageService);
      expect(detectMethod(webpBuffer)).toBe('image/webp');
    });

    it('should return null for unknown file types', () => {
      const unknownBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      const detectMethod = (
        storageService as any
      ).detectFileTypeFromHeader.bind(storageService);
      expect(detectMethod(unknownBuffer)).toBeNull();
    });

    it('should return null for files too small to detect', () => {
      const tinyBuffer = Buffer.from([0xff, 0xd8]); // Only 2 bytes
      const detectMethod = (
        storageService as any
      ).detectFileTypeFromHeader.bind(storageService);
      expect(detectMethod(tinyBuffer)).toBeNull();
    });
  });

  describe('security validations', () => {
    it('should detect path traversal attempts', () => {
      const containsPathTraversal = (
        storageService as any
      ).containsPathTraversal.bind(storageService);

      expect(containsPathTraversal('../etc/passwd')).toBe(true);
      expect(containsPathTraversal('../../malicious')).toBe(true);
      expect(containsPathTraversal('safe-filename.jpg')).toBe(false);
      expect(containsPathTraversal('folder/file.jpg')).toBe(false);
    });

    it('should validate file extension and content type combinations', () => {
      const isValidExtension = (
        storageService as any
      ).isValidExtensionForType.bind(storageService);

      expect(isValidExtension('jpg', 'image/jpeg')).toBe(true);
      expect(isValidExtension('jpeg', 'image/jpeg')).toBe(true);
      expect(isValidExtension('png', 'image/png')).toBe(true);
      expect(isValidExtension('gif', 'image/gif')).toBe(true);
      expect(isValidExtension('webp', 'image/webp')).toBe(true);

      expect(isValidExtension('txt', 'image/jpeg')).toBe(false);
      expect(isValidExtension('png', 'image/jpeg')).toBe(false);
      expect(isValidExtension(undefined, 'image/jpeg')).toBe(false);
    });
  });

  describe('configuration validation', () => {
    it('should properly initialize with environment configuration', () => {
      // Test that the service initializes correctly with the mocked config
      expect(storageService).toBeDefined();
      // Service should use the mocked configuration
      expect(storageService).toBeInstanceOf(StorageService);
    });
  });

  describe('error handling', () => {
    it('should properly structure StorageError objects', () => {
      const error = new StorageError('Test error message', 400, 'TEST_ERROR', {
        testData: 'value',
      });

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(StorageError);
      expect(error.message).toBe('Test error message');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.details).toEqual({ testData: 'value' });
      expect(error.name).toBe('StorageError');
    });

    it('should use default values in StorageError', () => {
      const error = new StorageError('Test message');

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('STORAGE_ERROR');
      expect(error.details).toBeUndefined();
    });
  });
});
