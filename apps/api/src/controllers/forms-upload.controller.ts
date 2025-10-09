import { Response } from 'express';
import multer from 'multer';
import { storageService } from '../services/storage.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { AsyncHandler } from '../utils/async-handler.utils';

/**
 * API Error class for standardized error responses
 */
export class ApiError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Configure multer for in-memory storage
 * Images will be uploaded directly to DigitalOcean Spaces from memory
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: (_req, file, cb) => {
    // Only allow image files
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ];

    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

    // Check MIME type or file extension as fallback
    const isValidMimeType = allowedMimeTypes.includes(file.mimetype);
    const extension = file.originalname.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|svg)$/);
    const isValidExtension = extension !== null;

    console.log('File filter check:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      isValidMimeType,
      isValidExtension,
    });

    if (isValidMimeType || isValidExtension) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')} or extensions: ${allowedExtensions.join(', ')}`
        ) as any
      );
    }
  },
});

/**
 * Forms upload controller handling file uploads for form backgrounds.
 */
export class FormsUploadController {
  /**
   * Multer middleware for single file upload
   */
  uploadMiddleware = upload.single('backgroundImage');

  /**
   * Uploads a form background image to DigitalOcean Spaces.
   * @route POST /api/forms/upload-background
   * @param req - Express request object with file
   * @param res - Express response object
   * @returns HTTP response with uploaded file URL
   * @throws {ApiError} 400 - No file provided or validation failed
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 500 - Upload failed
   * @example
   * POST /api/forms/upload-background
   * Content-Type: multipart/form-data
   * Authorization: Bearer <token>
   * Body: { backgroundImage: <file> }
   */
  uploadBackgroundImage = AsyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
      }

      // Check if file was uploaded
      if (!req.file) {
        throw new ApiError(
          'No file provided. Please upload an image file.',
          400,
          'NO_FILE_PROVIDED'
        );
      }

      const file = req.file;

      // Generate unique filename with user ID and timestamp
      const timestamp = Date.now();
      const extension = file.originalname.split('.').pop() || 'jpg';
      const fileName = `form-backgrounds/${userId}/${timestamp}.${extension}`;

      try {
        // Upload to DigitalOcean Spaces
        const publicUrl = await storageService.uploadFile(
          file.buffer,
          fileName,
          file.mimetype,
          {
            generateUniqueFileName: false, // We already generated a unique name
            metadata: {
              userId,
              originalName: file.originalname,
              uploadedAt: new Date().toISOString(),
              purpose: 'form-background',
            },
          }
        );

        res.status(200).json({
          success: true,
          message: 'Background image uploaded successfully',
          data: {
            url: publicUrl,
            fileName,
            size: file.size,
            mimeType: file.mimetype,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (error: any) {
        console.error('Error uploading background image:', error);

        // Handle storage service errors
        if (error.code) {
          throw new ApiError(
            error.message || 'Failed to upload image',
            error.statusCode || 500,
            error.code
          );
        }

        throw new ApiError(
          'Failed to upload background image. Please try again.',
          500,
          'UPLOAD_FAILED'
        );
      }
    }
  );
}
