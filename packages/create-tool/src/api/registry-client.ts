/**
 * Tool Registry API Client
 *
 * HTTP client for communicating with Tool Registry API.
 * Handles authentication, registration, and error handling.
 *
 * Features:
 * - JWT authentication with admin credentials
 * - Retry logic with exponential backoff
 * - Tool registration via POST /api/tools/register
 * - Registration caching for debugging
 *
 * @module api/registry-client
 * @example
 * ```typescript
 * import { RegistryApiClient } from './api/registry-client';
 *
 * const client = new RegistryApiClient('http://localhost:3000');
 * const result = await client.registerTool(metadata);
 * console.log('Registered:', result.toolId);
 * ```
 */

import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';
import type { ToolMetadata } from '../prompts/tool-prompts';

/**
 * Tool manifest JSON structure sent to registry API.
 * Contains comprehensive tool metadata for platform integration.
 */
export interface ToolManifest {
  /** Unique tool identifier (kebab-case) */
  id: string;
  /** Display name of the tool */
  name: string;
  /** Semantic version (e.g., "1.0.0") */
  version: string;
  /** Brief description of tool functionality */
  description: string;
  /** PrimeNG icon class name */
  icon: string;
  /** Array of enabled feature flags */
  features: string[];
  /** Route configuration for frontend and API */
  routes: {
    frontend: string;
    api: string;
  };
  /** Required permissions to access tool */
  permissions: string[];
}

/**
 * Result of tool registration API call.
 * Contains success status and registration details.
 */
export interface RegistrationResult {
  /** Whether registration succeeded */
  success: boolean;
  /** Registered tool ID from API */
  toolId: string;
  /** Timestamp of registration */
  registeredAt: string;
  /** Success message from API */
  message: string;
}

/**
 * Tool Registry API Client.
 * Manages HTTP communication with the Tool Registry backend.
 *
 * Implements:
 * - JWT authentication flow
 * - Automatic retry with exponential backoff
 * - Tool registration endpoint calls
 * - Comprehensive error handling
 */
export class RegistryApiClient {
  /** Axios HTTP client instance */
  private client: AxiosInstance;

  /** Cached JWT access token */
  private token: string | null = null;

  /**
   * Create a new Registry API client.
   *
   * @param baseURL - Base URL of the API server (default: http://localhost:3000)
   *
   * @example
   * ```typescript
   * const client = new RegistryApiClient('http://localhost:3000');
   * const client = new RegistryApiClient(process.env.API_URL);
   * ```
   */
  constructor(private baseURL: string = 'http://localhost:3000') {
    this.client = axios.create({
      baseURL,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add retry interceptor for network errors
    this.setupRetryInterceptor();
  }

  /**
   * Setup retry logic for network errors and server errors.
   * Automatically retries failed requests with exponential backoff.
   *
   * Retry conditions:
   * - Network errors (ECONNREFUSED, ETIMEDOUT, etc.)
   * - Server errors (5xx status codes)
   * - Maximum 3 retry attempts
   * - Exponential backoff: 1s, 2s, 4s
   *
   * Does NOT retry:
   * - Client errors (4xx status codes)
   * - Successful responses (2xx status codes)
   */
  private setupRetryInterceptor(): void {
    this.client.interceptors.response.use(
      (response: any) => response,
      async (error: AxiosError) => {
        const config = error.config as any;

        // Initialize retry count
        config.retryCount = config.retryCount || 0;

        // Only retry on network errors or 5xx errors
        const shouldRetry =
          !error.response || // Network error (ECONNREFUSED, etc.)
          error.response.status >= 500; // Server error (500, 503, etc.)

        if (shouldRetry && config.retryCount < 3) {
          config.retryCount++;

          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, config.retryCount - 1) * 1000;
          console.log(`  ⟲ Retry ${config.retryCount}/3 in ${delay}ms...`);

          await new Promise((resolve) => setTimeout(resolve, delay));
          return this.client(config);
        }

        throw error;
      }
    );
  }

  /**
   * Authenticate with admin credentials and get JWT token.
   * Caches the token for subsequent requests.
   *
   * Credentials priority:
   * 1. Provided parameters
   * 2. Environment variables (CREATE_TOOL_ADMIN_EMAIL, CREATE_TOOL_ADMIN_PASSWORD)
   * 3. Defaults (admin@example.com)
   *
   * @param email - Admin email address (optional)
   * @param password - Admin password (optional)
   * @returns Promise containing JWT access token
   * @throws {Error} When authentication fails (401, 403)
   * @throws {Error} When password is not provided
   *
   * @example
   * ```typescript
   * const token = await client.authenticate();
   * const token = await client.authenticate('admin@example.com', 'User123!@#');
   * ```
   */
  async authenticate(email?: string, password?: string): Promise<string> {
    // Use provided credentials or environment variables
    const adminEmail = email || process.env.CREATE_TOOL_ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = password || process.env.CREATE_TOOL_ADMIN_PASSWORD;

    // If no password provided, throw error
    if (!adminPassword) {
      throw new Error(
        'Admin password not provided. Set CREATE_TOOL_ADMIN_PASSWORD environment variable or use --admin-password flag'
      );
    }

    try {
      const response = await this.client.post('/api/v1/auth/login', {
        email: adminEmail,
        password: adminPassword,
      });

      const token: string = response.data.data.accessToken;
      this.token = token;
      return token;
    } catch (error: unknown) {
      if (axios.isAxiosError && axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Authentication failed: Invalid credentials');
        }
        if (error.response?.status === 403) {
          throw new Error('Authentication failed: Account locked or disabled');
        }
      }
      throw new Error(`Authentication failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate tool manifest JSON from CLI metadata.
   * Transforms CLI input into registry API format.
   *
   * @param metadata - Tool metadata from prompts
   * @returns Tool manifest object for API
   *
   * @example
   * ```typescript
   * const manifest = client.generateManifest(metadata);
   * // manifest.id = 'inventory-tracker'
   * // manifest.routes.api = '/api/tools/inventory-tracker'
   * ```
   */
  generateManifest(metadata: ToolMetadata): ToolManifest {
    return {
      id: metadata.toolId,
      name: metadata.toolName,
      version: metadata.version || '1.0.0',
      description: metadata.description || '',
      icon: metadata.icon,
      features: metadata.features,
      routes: {
        frontend: `/tools/${metadata.toolId}`,
        api: `/api/tools/${metadata.toolId}`,
      },
      permissions: metadata.permissions,
    };
  }

  /**
   * Validate tool metadata before registration.
   * Ensures metadata meets API requirements.
   *
   * Validation rules:
   * - toolId must be kebab-case (lowercase letters, numbers, hyphens)
   * - toolId cannot start or end with hyphen
   * - Required fields: toolId, toolName, icon, permissions, features
   * - permissions array must not be empty
   *
   * @param metadata - Tool metadata to validate
   * @throws {Error} When validation fails with specific field errors
   *
   * @example
   * ```typescript
   * this.validateMetadata(metadata); // Throws if invalid
   * ```
   */
  private validateMetadata(metadata: ToolMetadata): void {
    const errors: string[] = [];

    // Validate toolId is kebab-case
    if (!metadata.toolId) {
      errors.push('toolId is required');
    } else {
      const kebabCasePattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
      if (!kebabCasePattern.test(metadata.toolId)) {
        errors.push(
          'toolId must be kebab-case (lowercase letters, numbers, and hyphens only, cannot start or end with hyphen)'
        );
      }
    }

    // Validate required fields
    if (!metadata.toolName || metadata.toolName.trim() === '') {
      errors.push('toolName is required');
    }

    if (!metadata.icon || metadata.icon.trim() === '') {
      errors.push('icon is required');
    }

    // Validate permissions array
    if (!metadata.permissions || !Array.isArray(metadata.permissions)) {
      errors.push('permissions must be an array');
    } else if (metadata.permissions.length === 0) {
      errors.push('permissions array cannot be empty (at least one permission required)');
    }

    // Validate features array
    if (!metadata.features || !Array.isArray(metadata.features)) {
      errors.push('features must be an array');
    } else if (metadata.features.length === 0) {
      errors.push('features array cannot be empty (at least one feature required)');
    }

    // Throw error if any validation failed
    if (errors.length > 0) {
      throw new Error(`Metadata validation failed: ${errors.join('; ')}`);
    }
  }

  /**
   * Register tool with platform via POST /api/tools/register.
   * Automatically authenticates if no token cached.
   *
   * Registration payload includes:
   * - Tool ID, name, version, description
   * - Frontend route and API base path
   * - Permissions and status (alpha)
   * - Complete manifest JSON
   *
   * @param metadata - Tool metadata from CLI
   * @returns Promise containing registration result
   * @throws {Error} Validation errors (400)
   * @throws {Error} Duplicate tool errors (409 or 400)
   * @throws {Error} Server errors (500, 503)
   *
   * @example
   * ```typescript
   * try {
   *   const result = await client.registerTool(metadata);
   *   console.log('Registered:', result.toolId);
   * } catch (error) {
   *   console.error('Registration failed:', error.message);
   * }
   * ```
   */
  async registerTool(metadata: ToolMetadata): Promise<RegistrationResult> {
    // Validate metadata before making API call
    this.validateMetadata(metadata);

    // Ensure authenticated
    if (!this.token) {
      await this.authenticate();
    }

    const manifest = this.generateManifest(metadata);

    const payload = {
      toolId: metadata.toolId,
      name: metadata.toolName,
      version: '1.0.0',
      description: metadata.description,
      route: `/tools/${metadata.toolId}`,
      apiBase: `/api/tools/${metadata.toolId}`,
      permissions: metadata.permissions,
      status: 'alpha', // New tools start in alpha
      manifestJson: manifest,
    };

    try {
      const response = await this.client.post('/api/v1/tools/register', payload, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      return {
        success: true,
        toolId: response.data.data.toolId,
        registeredAt: response.data.data.createdAt,
        message: response.data.message,
      };
    } catch (error: unknown) {
      if (axios.isAxiosError && axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
          const details = error.response.data.details || [];
          const fieldErrors = details.map((d: any) => `${d.field}: ${d.message}`).join(', ');
          throw new Error(`Validation failed: ${fieldErrors || error.response.data.error}`);
        }
        if (error.response?.status === 409) {
          throw new Error(`Tool '${metadata.toolId}' already registered`);
        }
      }
      throw new Error(`Registration failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
