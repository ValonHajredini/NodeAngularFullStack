/**
 * User authentication token payload.
 */
export interface AuthTokenPayload {
  id: string;
  email: string;
  role: string;
  tenantId?: string;
}

/**
 * Authenticated user data on requests.
 */
export interface AuthUser {
  id: string;
  email: string;
  role: string;
  tenantId?: string;
}