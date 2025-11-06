/**
 * Authentication helper utilities for API testing.
 * Provides methods to create test users and obtain authentication tokens.
 */

import request from 'supertest';
import { app } from '../../src/server';

export interface TestUser {
  id?: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user' | 'readonly';
}

export interface AuthResponse {
  user: any;
  token: string;
  refreshToken: string;
}

/**
 * Create a test user with authentication tokens.
 * @param overrides - Partial user data to override defaults
 * @returns User data and authentication tokens
 */
export const createTestUser = async (overrides: Partial<TestUser> = {}): Promise<AuthResponse> => {
  const defaultUser: TestUser = {
    email: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`,
    password: 'Test123!@#',
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    ...overrides
  };

  const response = await request(app)
    .post('/api/v1/auth/register')
    .send(defaultUser);

  if (response.status !== 201) {
    throw new Error(`Failed to create test user: ${response.body?.error?.message || 'Unknown error'}`);
  }

  return {
    user: response.body.data.user,
    token: response.body.data.token,
    refreshToken: response.body.data.refreshToken
  };
};

/**
 * Create multiple test users efficiently.
 * @param count - Number of users to create
 * @param roleDistribution - Optional role distribution
 * @returns Array of user data and tokens
 */
export const createManyTestUsers = async (
  count: number,
  roleDistribution: { admin?: number; user?: number; readonly?: number } = {}
): Promise<AuthResponse[]> => {
  const users: AuthResponse[] = [];
  const { admin = 0, user = count, readonly = 0 } = roleDistribution;

  // Create admin users
  for (let i = 0; i < admin; i++) {
    const testUser = await createTestUser({ role: 'admin' });
    users.push(testUser);
  }

  // Create regular users
  for (let i = 0; i < user; i++) {
    const testUser = await createTestUser({ role: 'user' });
    users.push(testUser);
  }

  // Create readonly users
  for (let i = 0; i < readonly; i++) {
    const testUser = await createTestUser({ role: 'readonly' });
    users.push(testUser);
  }

  return users;
};

/**
 * Login with existing user credentials.
 * @param email - User email
 * @param password - User password
 * @returns Authentication tokens
 */
export const loginUser = async (email: string, password: string): Promise<AuthResponse> => {
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password });

  if (response.status !== 200) {
    throw new Error(`Failed to login user: ${response.body?.error?.message || 'Unknown error'}`);
  }

  return {
    user: response.body.data.user,
    token: response.body.data.token,
    refreshToken: response.body.data.refreshToken
  };
};

/**
 * Get authentication tokens for predefined seed users.
 */
export const getSeedUserTokens = async () => {
  const [adminAuth, userAuth, readonlyAuth] = await Promise.all([
    loginUser('admin@example.com', 'AdminPass123!'),
    loginUser('user@example.com', 'UserPass123!'),
    loginUser('readonly@example.com', 'ReadonlyPass123!')
  ]);

  return {
    admin: adminAuth,
    user: userAuth,
    readonly: readonlyAuth
  };
};

/**
 * Create an invalid JWT token for testing unauthorized access.
 */
export const createInvalidToken = (): string => {
  return 'invalid.jwt.token.for.testing';
};

/**
 * Create an expired JWT token for testing token expiration.
 */
export const createExpiredToken = (): string => {
  // This would be a properly formatted but expired JWT in real implementation
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.expired';
};

/**
 * Helper to make authenticated requests.
 */
export const authenticatedRequest = (token: string) => {
  return {
    get: (url: string) => request(app).get(url).set('Authorization', `Bearer ${token}`),
    post: (url: string) => request(app).post(url).set('Authorization', `Bearer ${token}`),
    put: (url: string) => request(app).put(url).set('Authorization', `Bearer ${token}`),
    patch: (url: string) => request(app).patch(url).set('Authorization', `Bearer ${token}`),
    delete: (url: string) => request(app).delete(url).set('Authorization', `Bearer ${token}`)
  };
};