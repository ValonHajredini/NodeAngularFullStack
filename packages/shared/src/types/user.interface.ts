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
  /** User's password (plain text, to be hashed on server) */
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