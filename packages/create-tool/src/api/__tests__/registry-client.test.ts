/**
 * Registry API Client Test Suite
 *
 * Comprehensive tests for Tool Registry API client.
 * Tests authentication, registration, retry logic, and error handling.
 */

import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { RegistryApiClient } from '../registry-client';
import type { ToolMetadata } from '../../prompts/tool-prompts';

describe('RegistryApiClient', () => {
  let mock: MockAdapter;
  let client: RegistryApiClient;
  const mockBaseURL = 'http://localhost:3000';

  beforeEach(() => {
    // Create fresh axios mock for each test
    mock = new MockAdapter(axios);
    client = new RegistryApiClient(mockBaseURL);

    // Clear environment variables
    delete process.env.CREATE_TOOL_ADMIN_EMAIL;
    delete process.env.CREATE_TOOL_ADMIN_PASSWORD;
  });

  afterEach(() => {
    // Restore axios and clear mocks
    mock.restore();
    jest.clearAllMocks();
  });

  describe('authenticate()', () => {
    const mockAdminEmail = 'admin@example.com';
    const mockAdminPassword = 'Admin123!@#';
    const mockAccessToken = 'mock-jwt-token-12345';

    describe('successful authentication', () => {
      test('should authenticate with valid credentials', async () => {
        // Mock successful login response
        mock.onPost('/api/v1/auth/login').reply(200, {
          data: {
            accessToken: mockAccessToken,
          },
        });

        const token = await client.authenticate(mockAdminEmail, mockAdminPassword);

        expect(token).toBe(mockAccessToken);
        expect(mock.history.post.length).toBe(1);
        expect(mock.history.post[0].url).toBe('/api/v1/auth/login');
        expect(JSON.parse(mock.history.post[0].data)).toEqual({
          email: mockAdminEmail,
          password: mockAdminPassword,
        });
      });

      test('should use environment variables when no credentials provided', async () => {
        process.env.CREATE_TOOL_ADMIN_EMAIL = 'env-admin@example.com';
        process.env.CREATE_TOOL_ADMIN_PASSWORD = 'EnvPassword123';

        mock.onPost('/api/v1/auth/login').reply(200, {
          data: {
            accessToken: mockAccessToken,
          },
        });

        const token = await client.authenticate();

        expect(token).toBe(mockAccessToken);
        expect(JSON.parse(mock.history.post[0].data)).toEqual({
          email: 'env-admin@example.com',
          password: 'EnvPassword123',
        });
      });

      test('should cache token after successful authentication', async () => {
        mock.onPost('/api/v1/auth/login').reply(200, {
          data: {
            accessToken: mockAccessToken,
          },
        });

        const token1 = await client.authenticate(mockAdminEmail, mockAdminPassword);
        const token2 = await client.authenticate(mockAdminEmail, mockAdminPassword);

        expect(token1).toBe(mockAccessToken);
        expect(token2).toBe(mockAccessToken);
        // Should only make one API call (token cached)
        expect(mock.history.post.length).toBe(1);
      });
    });

    describe('error handling', () => {
      test('should throw error when password not provided', async () => {
        try {
          await client.authenticate(mockAdminEmail);
          fail('Expected error to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('Admin password not provided');
        }
      });

      test('should handle 401 Unauthorized error', async () => {
        mock.onPost('/api/v1/auth/login').reply(401);

        try {
          await client.authenticate(mockAdminEmail, mockAdminPassword);
          fail('Expected error to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe('Authentication failed: Invalid credentials');
        }
      });

      test('should handle 403 Forbidden error', async () => {
        mock.onPost('/api/v1/auth/login').reply(403);

        try {
          await client.authenticate(mockAdminEmail, mockAdminPassword);
          fail('Expected error to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe('Authentication failed: Account locked or disabled');
        }
      });

      test('should handle network errors', async () => {
        mock.onPost('/api/v1/auth/login').networkError();

        try {
          await client.authenticate(mockAdminEmail, mockAdminPassword);
          fail('Expected error to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('Authentication failed: Network Error');
        }
      });

      test('should handle 500 server errors', async () => {
        mock.onPost('/api/v1/auth/login').reply(500);

        try {
          await client.authenticate(mockAdminEmail, mockAdminPassword);
          fail('Expected error to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }
      });
    });
  });

  describe('registerTool()', () => {
    const mockMetadata: ToolMetadata = {
      toolId: 'test-tool',
      toolName: 'Test Tool',
      description: 'A test tool',
      icon: 'pi-test',
      version: '1.0.0',
      permissions: ['user', 'admin'],
      features: ['backend', 'database', 'component'],
      confirm: true,
      route: '/tools/test-tool',
      apiBase: '/api/tools/test-tool',
    };

    const mockAccessToken = 'mock-jwt-token-12345';

    beforeEach(() => {
      // Mock authentication to set token
      mock.onPost('/api/v1/auth/login').reply(200, {
        data: { accessToken: mockAccessToken },
      });
    });

    describe('successful registration', () => {
      test('should register tool with valid metadata', async () => {
        const mockToolId = 'test-tool';
        const mockCreatedAt = '2025-10-25T12:00:00Z';

        mock.onPost('/api/v1/tools/register').reply(201, {
          message: 'Tool registered successfully',
          data: {
            toolId: mockToolId,
            createdAt: mockCreatedAt,
          },
        });

        const result = await client.registerTool(mockMetadata);

        expect(result.success).toBe(true);
        expect(result.toolId).toBe(mockToolId);
        expect(result.registeredAt).toBe(mockCreatedAt);
        expect(result.message).toBe('Tool registered successfully');

        // Verify request payload
        const registerRequest = mock.history.post.find((req) =>
          req.url?.includes('/tools/register')
        );
        expect(registerRequest).toBeDefined();
        expect(registerRequest?.headers?.Authorization).toBe(`Bearer ${mockAccessToken}`);

        const payload = JSON.parse(registerRequest!.data);
        expect(payload.toolId).toBe('test-tool');
        expect(payload.name).toBe('Test Tool');
        expect(payload.version).toBe('1.0.0');
        expect(payload.permissions).toEqual(['user', 'admin']);
        expect(payload.manifestJson).toBeDefined();
      });

      test('should auto-authenticate if no token cached', async () => {
        const newClient = new RegistryApiClient(mockBaseURL);
        const newMock = new MockAdapter(axios);

        newMock.onPost('/api/v1/auth/login').reply(200, {
          data: { accessToken: mockAccessToken },
        });

        newMock.onPost('/api/v1/tools/register').reply(201, {
          message: 'Tool registered successfully',
          data: { toolId: 'test-tool', createdAt: '2025-10-25T12:00:00Z' },
        });

        process.env.CREATE_TOOL_ADMIN_EMAIL = 'admin@example.com';
        process.env.CREATE_TOOL_ADMIN_PASSWORD = 'Admin123!@#';

        const result = await newClient.registerTool(mockMetadata);

        expect(result.success).toBe(true);
        // Should have made both login and register calls
        expect(newMock.history.post.length).toBe(2);

        newMock.restore();
      });
    });

    describe('input validation', () => {
      test('should reject invalid toolId (not kebab-case)', async () => {
        const invalidMetadata = {
          ...mockMetadata,
          toolId: 'InvalidToolId', // Not kebab-case (has uppercase)
        };

        try {
          await client.registerTool(invalidMetadata);
          fail('Expected validation error to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('Metadata validation failed');
          expect((error as Error).message).toContain('toolId must be kebab-case');
        }

        // Should not make API call if validation fails
        expect(mock.history.post.length).toBe(0);
      });

      test('should reject toolId with leading hyphen', async () => {
        const invalidMetadata = {
          ...mockMetadata,
          toolId: '-test-tool', // Starts with hyphen
        };

        try {
          await client.registerTool(invalidMetadata);
          fail('Expected validation error to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('Metadata validation failed');
          expect((error as Error).message).toContain('toolId must be kebab-case');
        }
      });

      test('should reject toolId with trailing hyphen', async () => {
        const invalidMetadata = {
          ...mockMetadata,
          toolId: 'test-tool-', // Ends with hyphen
        };

        try {
          await client.registerTool(invalidMetadata);
          fail('Expected validation error to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('Metadata validation failed');
          expect((error as Error).message).toContain('toolId must be kebab-case');
        }
      });

      test('should reject missing toolId', async () => {
        const invalidMetadata = {
          ...mockMetadata,
          toolId: '',
        };

        try {
          await client.registerTool(invalidMetadata);
          fail('Expected validation error to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('Metadata validation failed');
          expect((error as Error).message).toContain('toolId is required');
        }
      });

      test('should reject empty permissions array', async () => {
        const invalidMetadata = {
          ...mockMetadata,
          permissions: [],
        };

        try {
          await client.registerTool(invalidMetadata);
          fail('Expected validation error to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('Metadata validation failed');
          expect((error as Error).message).toContain('permissions array cannot be empty');
        }
      });

      test('should reject missing permissions', async () => {
        const invalidMetadata = {
          ...mockMetadata,
          permissions: undefined as any,
        };

        try {
          await client.registerTool(invalidMetadata);
          fail('Expected validation error to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('Metadata validation failed');
          expect((error as Error).message).toContain('permissions must be an array');
        }
      });

      test('should reject empty features array', async () => {
        const invalidMetadata = {
          ...mockMetadata,
          features: [],
        };

        try {
          await client.registerTool(invalidMetadata);
          fail('Expected validation error to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('Metadata validation failed');
          expect((error as Error).message).toContain('features array cannot be empty');
        }
      });

      test('should reject missing toolName', async () => {
        const invalidMetadata = {
          ...mockMetadata,
          toolName: '',
        };

        try {
          await client.registerTool(invalidMetadata);
          fail('Expected validation error to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('Metadata validation failed');
          expect((error as Error).message).toContain('toolName is required');
        }
      });

      test('should reject missing icon', async () => {
        const invalidMetadata = {
          ...mockMetadata,
          icon: '',
        };

        try {
          await client.registerTool(invalidMetadata);
          fail('Expected validation error to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('Metadata validation failed');
          expect((error as Error).message).toContain('icon is required');
        }
      });

      test('should reject multiple validation errors', async () => {
        const invalidMetadata = {
          ...mockMetadata,
          toolId: 'Bad_Tool_ID', // Not kebab-case
          toolName: '', // Empty
          permissions: [], // Empty array
        };

        try {
          await client.registerTool(invalidMetadata);
          fail('Expected validation error to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          const errorMsg = (error as Error).message;
          expect(errorMsg).toContain('Metadata validation failed');
          expect(errorMsg).toContain('toolId must be kebab-case');
          expect(errorMsg).toContain('toolName is required');
          expect(errorMsg).toContain('permissions array cannot be empty');
        }
      });

      test('should accept valid kebab-case toolId', async () => {
        const validToolIds = [
          'my-tool',
          'tool-123',
          'inventory-tracker',
          't',
          'a1b2c3',
          'multi-word-tool-name',
        ];

        for (const toolId of validToolIds) {
          const validMetadata = {
            ...mockMetadata,
            toolId,
          };

          mock.onPost('/api/v1/tools/register').reply(201, {
            message: 'Tool registered successfully',
            data: { toolId, createdAt: '2025-10-25T12:00:00Z' },
          });

          const result = await client.registerTool(validMetadata);
          expect(result.success).toBe(true);
          expect(result.toolId).toBe(toolId);

          mock.reset();
          mock.onPost('/api/v1/auth/login').reply(200, {
            data: { accessToken: 'mock-token' },
          });
        }
      });
    });

    describe('error handling', () => {
      test('should handle 400 validation errors', async () => {
        mock.onPost('/api/v1/tools/register').reply(400, {
          error: 'Validation failed',
          details: [
            { field: 'toolId', message: 'Tool ID must be kebab-case' },
            { field: 'permissions', message: 'Permissions cannot be empty' },
          ],
        });

        try {
          await client.registerTool(mockMetadata);
          fail('Expected error to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('Validation failed');
          expect((error as Error).message).toContain('toolId: Tool ID must be kebab-case');
          expect((error as Error).message).toContain('permissions: Permissions cannot be empty');
        }
      });

      test('should handle 409 duplicate tool error', async () => {
        mock.onPost('/api/v1/tools/register').reply(409);

        try {
          await client.registerTool(mockMetadata);
          fail('Expected error to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe("Tool 'test-tool' already registered");
        }
      });

      test('should handle 500 server errors', async () => {
        mock.onPost('/api/v1/tools/register').reply(500);

        try {
          await client.registerTool(mockMetadata);
          fail('Expected error to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('Registration failed');
        }
      });

      test('should handle network errors', async () => {
        mock.onPost('/api/v1/tools/register').networkError();

        try {
          await client.registerTool(mockMetadata);
          fail('Expected error to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('Registration failed');
        }
      });
    });
  });

  describe('generateManifest()', () => {
    test('should generate manifest from metadata', () => {
      const metadata: ToolMetadata = {
        toolId: 'inventory-tracker',
        toolName: 'Inventory Tracker',
        description: 'Track inventory items',
        icon: 'pi-box',
        version: '1.0.0',
        permissions: ['user', 'admin'],
        features: ['backend', 'database', 'component'],
        confirm: true,
        route: '/tools/inventory-tracker',
        apiBase: '/api/tools/inventory-tracker',
      };

      const manifest = client.generateManifest(metadata);

      expect(manifest).toEqual({
        id: 'inventory-tracker',
        name: 'Inventory Tracker',
        version: '1.0.0',
        description: 'Track inventory items',
        icon: 'pi-box',
        features: ['backend', 'database', 'component'],
        routes: {
          frontend: '/tools/inventory-tracker',
          api: '/api/tools/inventory-tracker',
        },
        permissions: ['user', 'admin'],
      });
    });

    test('should handle missing optional fields', () => {
      const metadata: ToolMetadata = {
        toolId: 'simple-tool',
        toolName: 'Simple Tool',
        description: '',
        icon: 'pi-star',
        version: '',
        permissions: ['user'],
        features: ['component'],
        confirm: true,
        route: '/tools/simple-tool',
        apiBase: '/api/tools/simple-tool',
      };

      const manifest = client.generateManifest(metadata);

      expect(manifest.version).toBe('1.0.0'); // Default version (when empty)
      expect(manifest.description).toBe('');
    });
  });

  describe('retry interceptor', () => {
    test('should retry on network errors with exponential backoff', async () => {
      // Setup: First two calls fail with network error, third succeeds
      let callCount = 0;
      mock.onPost('/api/v1/auth/login').reply(() => {
        callCount++;
        if (callCount < 3) {
          return [null as any, { code: 'ECONNREFUSED' }];
        }
        return [200, { data: { accessToken: 'mock-token' } }];
      });

      const startTime = Date.now();
      const token = await client.authenticate('admin@example.com', 'Admin123!@#');
      const elapsed = Date.now() - startTime;

      expect(token).toBe('mock-token');
      // Should have made 3 requests (2 retries + 1 success)
      expect(mock.history.post.length).toBe(3);
      // Should have delays: 1000ms + 2000ms = ~3000ms minimum
      expect(elapsed).toBeGreaterThanOrEqual(2900);
    });

    test('should retry on 5xx server errors', async () => {
      // Setup: First two calls return 500/503, third succeeds
      let callCount = 0;
      mock.onPost('/api/v1/auth/login').reply(() => {
        callCount++;
        if (callCount === 1) return [500];
        if (callCount === 2) return [503];
        return [200, { data: { accessToken: 'mock-token' } }];
      });

      const token = await client.authenticate('admin@example.com', 'Admin123!@#');

      expect(token).toBe('mock-token');
      expect(mock.history.post.length).toBe(3);
    });

    test('should NOT retry on 4xx client errors', async () => {
      mock.onPost('/api/v1/auth/login').reply(401);

      try {
        await client.authenticate('admin@example.com', 'wrong-password');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Invalid credentials');
      }

      // Should only make 1 request (no retries)
      expect(mock.history.post.length).toBe(1);
    });

    test('should fail after max retries (3 attempts)', async () => {
      mock.onPost('/api/v1/auth/login').networkError();

      try {
        await client.authenticate('admin@example.com', 'Admin123!@#');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Network Error');
      }

      // Should make 3 attempts total
      expect(mock.history.post.length).toBe(3);
    });
  });
});
