/**
 * Represents a user in the system.
 * Used across frontend and backend for type consistency.
 */
export interface User {
  /** Unique identifier (UUID v4) */
  id: string;
  /** User's email address (unique per tenant) */
  email: string;
  /** User's first name */
  firstName: string;
  /** User's last name */
  lastName: string;
  /** User role determining permissions */
  role: 'admin' | 'user' | 'readonly';
  /** Optional tenant ID for multi-tenant mode */
  tenantId?: string;
  /** User's avatar image URL stored in cloud storage */
  avatarUrl?: string;
  /** Account creation timestamp */
  createdAt: Date;
  /** Last modification timestamp */
  updatedAt: Date;
}

/**
 * User login credentials for authentication.
 */
export interface LoginCredentials {
  /** User's email address */
  email: string;
  /** User's password (must be transmitted securely via HTTPS and hashed immediately) */
  password: string;
}

/**
 * Authentication response containing user data and tokens.
 */
export interface AuthResponse {
  /** Authenticated user data */
  user: User;
  /** JWT access token */
  accessToken: string;
  /** JWT refresh token for token renewal */
  refreshToken: string;
  /** Access token expiration time in seconds */
  expiresIn: number;
}

/**
 * Avatar upload request containing the file to be uploaded.
 * Note: On backend, this will be cast to Express.Multer.File
 */
export interface AvatarUploadRequest {
  /** The uploaded file from multipart/form-data */
  file: {
    /** Original filename */
    originalname: string;
    /** File MIME type */
    mimetype: string;
    /** File size in bytes */
    size: number;
    /** File buffer data */
    buffer: Buffer;
  };
}

/**
 * Avatar upload response containing the uploaded avatar URL and updated user data.
 */
export interface AvatarUploadResponse {
  /** Success status of the upload operation */
  success: boolean;
  /** Response data containing avatar URL and updated user */
  data: {
    /** The URL of the uploaded avatar in cloud storage */
    avatarUrl: string;
    /** The updated user object with the new avatar URL */
    user: User;
  };
}