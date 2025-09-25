/**
 * Represents an API token in the system.
 * Used for external system authentication across frontend and backend.
 */
export interface ApiToken {
  /** Unique identifier (UUID v4) */
  id: string;
  /** Foreign key to users table */
  userId: string;
  /** Optional foreign key to tenants table for multi-tenant mode */
  tenantId?: string;
  /** Bcrypt hashed token value for security (never stored as plaintext) */
  tokenHash: string;
  /** User-friendly name for the token */
  name: string;
  /** Token permissions array - valid values: 'read', 'write' */
  scopes: string[];
  /** Token expiration timestamp */
  expiresAt: Date;
  /** Creation timestamp */
  createdAt: Date;
  /** Last modification timestamp */
  updatedAt: Date;
  /** Last time token was used for authentication */
  lastUsedAt?: Date;
  /** Active status flag for token */
  isActive: boolean;
}

/**
 * Request payload for creating a new API token.
 */
export interface CreateApiTokenRequest {
  /** User-friendly name for the token */
  name: string;
  /** Token permissions array - valid values: 'read', 'write' */
  scopes: string[];
  /** Optional expiration date (defaults to 1 year from creation) */
  expiresAt?: Date;
}

/**
 * Response payload when creating a new API token.
 * Contains the plaintext token value which is only shown once.
 */
export interface CreateApiTokenResponse {
  /** The plaintext token value (only returned on creation) */
  token: string;
  /** Unique identifier for the created token */
  id: string;
  /** User-friendly name for the token */
  name: string;
  /** Token permissions array */
  scopes: string[];
  /** Token expiration timestamp */
  expiresAt: string;
}

/**
 * Response payload for listing user's API tokens.
 * Does not include token values for security.
 */
export interface ApiTokenListResponse {
  /** Unique identifier for the token */
  id: string;
  /** User-friendly name for the token */
  name: string;
  /** Token permissions array */
  scopes: string[];
  /** Token expiration timestamp */
  expiresAt: string;
  /** Creation timestamp */
  createdAt: string;
  /** Last time token was used for authentication */
  lastUsedAt?: string;
  /** Active status flag for token */
  isActive: boolean;
}

/**
 * Request payload for updating an existing API token.
 */
export interface UpdateApiTokenRequest {
  /** Updated user-friendly name for the token */
  name?: string;
  /** Updated token permissions array */
  scopes?: string[];
  /** Updated active status */
  isActive?: boolean;
}