import request from 'supertest';
import { app } from '../../src/server';
import { databaseService } from '../../src/services/database.service';

/**
 * Integration tests for Tool Registry API endpoints.
 *
 * Tests the full request/response flow with real database:
 * - HTTP Request → Express Middleware → Validation → Controller → Service → Repository → PostgreSQL
 *
 * Endpoints tested:
 * - POST   /api/tools/register       - Register new tool
 * - GET    /api/tools/registry       - List all tools
 * - GET    /api/tools/registry/:id   - Get tool by ID
 * - PUT    /api/tools/registry/:id   - Update tool
 * - DELETE /api/tools/registry/:id   - Delete tool
 * - GET    /api/tools/search?q=query - Search tools
 *
 * Test Coverage:
 * - Happy paths (valid data, successful operations)
 * - Error cases (validation errors, not found, unauthorized, business rule violations)
 * - End-to-end workflow (complete CRUD cycle)
 *
 * @see Story 30.2.4: API Integration Tests
 */
describe('Tool Registry API', () => {
  let authToken: string;
  let adminUserId: string;

  /**
   * Setup: Register admin user and obtain auth token.
   * Runs once before all tests in this suite.
   */
  beforeAll(async () => {
    // Register admin user
    const registrationResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'toolregistry.admin@example.com',
        password: 'TestPass123!',
        firstName: 'Tool',
        lastName: 'Admin',
      });

    adminUserId = registrationResponse.body.data.user.id;

    // Update user role to admin
    const client = await databaseService.getPool().connect();
    try {
      await client.query('UPDATE users SET role = $1 WHERE id = $2', [
        'admin',
        adminUserId,
      ]);
    } finally {
      client.release();
    }

    // Login to get auth token
    const loginResponse = await request(app).post('/api/v1/auth/login').send({
      email: 'toolregistry.admin@example.com',
      password: 'TestPass123!',
    });

    authToken = loginResponse.body.data.accessToken;

    if (!authToken) {
      console.error('❌ Failed to obtain auth token in beforeAll');
      console.error(
        'Login response:',
        JSON.stringify(loginResponse.body, null, 2)
      );
    }
  });

  /**
   * Cleanup: Remove test data before each test.
   * Ensures test isolation by starting with clean slate.
   */
  beforeEach(async () => {
    const client = await databaseService.getPool().connect();
    try {
      // Delete test tools (tool_id starts with 'test-')
      await client.query(
        `DELETE FROM tool_registry WHERE tool_id LIKE 'test-%'`
      );
    } finally {
      client.release();
    }
  });

  /**
   * Teardown: Clean up test data and close database connection.
   * Runs once after all tests complete.
   */
  afterAll(async () => {
    const client = await databaseService.getPool().connect();
    try {
      // Final cleanup of test tools
      await client.query(
        `DELETE FROM tool_registry WHERE tool_id LIKE 'test-%'`
      );

      // Clean up test user
      await client.query('DELETE FROM sessions WHERE user_id = $1', [
        adminUserId,
      ]);
      await client.query('DELETE FROM users WHERE id = $1', [adminUserId]);
    } finally {
      client.release();
    }

    // Close database connection to prevent hanging tests
    await databaseService.close();
  });

  /**
   * Helper function: Create a test tool with default or custom data.
   * Returns the created tool data from the API response.
   * Note: Uses camelCase field names as expected by validators (Story 30.2.3)
   */
  async function createTestTool(overrides: any = {}) {
    const toolData = {
      toolId: `test-tool-${Date.now()}`,
      name: 'Test Tool',
      version: '1.0.0',
      route: '/tools/test-tool',
      apiBase: '/api/tools/test-tool',
      manifestJson: {
        routes: { primary: '/tools/test-tool' },
        endpoints: { base: '/api/tools/test-tool', paths: [] },
      },
      ...overrides,
    };

    const response = await request(app)
      .post('/api/tools/register')
      .set('Authorization', `Bearer ${authToken}`)
      .send(toolData);

    return response.body.data;
  }

  // ============================================================================
  // POST /api/tools/register
  // ============================================================================

  describe('POST /api/tools/register', () => {
    it('should register a new tool with valid data', async () => {
      const toolData = {
        toolId: `test-tool-${Date.now()}`,
        name: 'My Test Tool',
        version: '1.0.0',
        route: '/tools/my-test-tool',
        apiBase: '/api/tools/my-test-tool',
        manifestJson: {
          routes: { primary: '/tools/my-test-tool' },
          endpoints: { base: '/api/tools/my-test-tool', paths: [] },
        },
      };

      const response = await request(app)
        .post('/api/tools/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send(toolData)
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Tool registered successfully');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data.tool_id).toBe(toolData.toolId);
      expect(response.body.data.name).toBe(toolData.name);
      expect(response.body.data.version).toBe(toolData.version);
    });

    it('should register tool with optional fields', async () => {
      const toolData = {
        toolId: `test-optional-${Date.now()}`,
        name: 'Optional Fields Tool',
        description: 'A tool with optional fields',
        version: '1.0.0',
        icon: '📦',
        route: '/tools/optional',
        apiBase: '/api/tools/optional',
        permissions: ['admin', 'user'],
        status: 'active',
        manifestJson: {
          routes: { primary: '/tools/optional' },
          endpoints: { base: '/api/tools/optional', paths: [] },
        },
      };

      const response = await request(app)
        .post('/api/tools/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send(toolData)
        .expect(201);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data.description).toBe(toolData.description);
      expect(response.body.data.icon).toBe(toolData.icon);
      expect(response.body.data.permissions).toEqual(toolData.permissions);
      expect(response.body.data.status).toBe(toolData.status);
    });

    it('should reject invalid tool ID format', async () => {
      const toolData = {
        toolId: 'Invalid_Tool_ID', // Uppercase and underscore not allowed
        name: 'Invalid Tool',
        version: '1.0.0',
        route: '/tools/invalid-tool',
        apiBase: '/api/tools/invalid-tool',
        manifestJson: {},
      };

      const response = await request(app)
        .post('/api/tools/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send(toolData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Validation failed');
      expect(response.body).toHaveProperty('details');
      // Check that validation details contain kebab-case error
      const messages = response.body.details.map((d: any) => d.msg).join(' ');
      expect(messages.toLowerCase()).toContain('kebab-case');
    });

    it('should reject duplicate tool ID', async () => {
      const toolData = {
        toolId: `test-duplicate-${Date.now()}`,
        name: 'Duplicate Tool',
        version: '1.0.0',
        route: '/tools/duplicate',
        apiBase: '/api/tools/duplicate',
        manifestJson: {},
      };

      // Register first time - should succeed
      await request(app)
        .post('/api/tools/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send(toolData)
        .expect(201);

      // Register again with same toolId - should fail
      const response = await request(app)
        .post('/api/tools/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send(toolData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.toLowerCase()).toContain('already exists');
    });

    it('should reject missing required fields', async () => {
      const incompleteData = {
        toolId: `test-incomplete-${Date.now()}`,
        // Missing: name, version, route, apiBase
      };

      const response = await request(app)
        .post('/api/tools/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject invalid route format', async () => {
      const toolData = {
        toolId: `test-invalid-route-${Date.now()}`,
        name: 'Invalid Route Tool',
        version: '1.0.0',
        route: '/invalid/route', // Must start with /tools/
        apiBase: '/api/tools/test',
        manifestJson: {},
      };

      const response = await request(app)
        .post('/api/tools/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send(toolData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Validation failed');
      expect(response.body).toHaveProperty('details');
      // Check that validation details contain /tools/ error
      const messages = response.body.details.map((d: any) => d.msg).join(' ');
      expect(messages.toLowerCase()).toContain('/tools/');
    });

    it('should reject request without auth token', async () => {
      const toolData = {
        toolId: `test-no-auth-${Date.now()}`,
        name: 'No Auth Tool',
        version: '1.0.0',
        route: '/tools/no-auth',
        apiBase: '/api/tools/no-auth',
        manifestJson: {},
      };

      await request(app)
        .post('/api/tools/register')
        // No Authorization header
        .send(toolData)
        .expect(401);
    });
  });

  // ============================================================================
  // GET /api/tools/registry
  // ============================================================================

  describe('GET /api/tools/registry', () => {
    it('should return all tools', async () => {
      // Create test tools
      await createTestTool({ name: 'Tool 1' });
      await createTestTool({ name: 'Tool 2' });
      await createTestTool({ name: 'Tool 3' });

      const response = await request(app)
        .get('/api/tools/registry')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Tools retrieved successfully');
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(3);
    });

    it('should reject request without auth token', async () => {
      await request(app)
        .get('/api/tools/registry')
        // No Authorization header
        .expect(401);
    });
  });

  // ============================================================================
  // GET /api/tools/registry/:id
  // ============================================================================

  describe('GET /api/tools/registry/:id', () => {
    it('should return tool by ID', async () => {
      const tool = await createTestTool({ name: 'Find Me Tool' });

      const response = await request(app)
        .get(`/api/tools/registry/${tool.tool_id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Tool retrieved successfully');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data.tool_id).toBe(tool.tool_id);
      expect(response.body.data.name).toBe('Find Me Tool');
    });

    it('should return 404 for non-existent tool', async () => {
      const response = await request(app)
        .get('/api/tools/registry/nonexistent-tool-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.toLowerCase()).toContain('not found');
    });
  });

  // ============================================================================
  // PUT /api/tools/registry/:id
  // ============================================================================

  describe('PUT /api/tools/registry/:id', () => {
    it('should update tool successfully', async () => {
      const tool = await createTestTool({ name: 'Original Name' });

      const updateData = {
        name: 'Updated Tool Name',
        version: '2.0.0',
      };

      const response = await request(app)
        .put(`/api/tools/registry/${tool.tool_id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Tool updated successfully');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data.name).toBe('Updated Tool Name');
      expect(response.body.data.version).toBe('2.0.0');
    });

    it('should update tool with optional fields', async () => {
      const tool = await createTestTool();

      const updateData = {
        description: 'Updated description',
        icon: '🔧',
        permissions: ['admin'],
      };

      const response = await request(app)
        .put(`/api/tools/registry/${tool.tool_id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.data.icon).toBe(updateData.icon);
      expect(response.body.data.permissions).toEqual(updateData.permissions);
    });

    it('should return 404 for non-existent tool', async () => {
      const updateData = {
        name: 'Updated Name',
      };

      const response = await request(app)
        .put('/api/tools/registry/nonexistent-tool')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.toLowerCase()).toContain('not found');
    });

    it('should reject invalid status transition', async () => {
      // Create tool with 'deprecated' status
      const tool = await createTestTool({ status: 'deprecated' });

      // Try to change status from 'deprecated' to 'active' (invalid transition)
      const updateData = {
        status: 'active',
      };

      const response = await request(app)
        .put(`/api/tools/registry/${tool.tool_id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(
        response.body.error.toLowerCase().includes('invalid') ||
          response.body.error.toLowerCase().includes('transition')
      ).toBe(true);
    });
  });

  // ============================================================================
  // DELETE /api/tools/registry/:id
  // ============================================================================

  describe('DELETE /api/tools/registry/:id', () => {
    it('should delete non-exported tool', async () => {
      // Tools are non-exported by default
      const tool = await createTestTool();

      const response = await request(app)
        .delete(`/api/tools/registry/${tool.tool_id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Tool deleted successfully');

      // Verify tool no longer exists
      await request(app)
        .get(`/api/tools/registry/${tool.tool_id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should reject deletion of exported tool', async () => {
      // Create tool first (tools start as non-exported)
      const tool = await createTestTool();

      // Update tool to mark it as exported
      await request(app)
        .put(`/api/tools/registry/${tool.tool_id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isExported: true })
        .expect(200);

      // Now try to delete the exported tool
      const response = await request(app)
        .delete(`/api/tools/registry/${tool.tool_id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Cannot delete exported tool');
    });

    it('should return 404 for non-existent tool', async () => {
      const response = await request(app)
        .delete('/api/tools/registry/nonexistent-tool')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.toLowerCase()).toContain('not found');
    });
  });

  // ============================================================================
  // GET /api/tools/search
  // ============================================================================

  describe('GET /api/tools/search', () => {
    it('should search tools by query', async () => {
      // Create tools with searchable names
      await createTestTool({
        toolId: `test-inventory-tool-${Date.now()}`,
        name: 'Inventory Management Tool',
      });
      await createTestTool({
        toolId: `test-invoice-tool-${Date.now()}`,
        name: 'Invoice Generator Tool',
      });
      await createTestTool({
        toolId: `test-other-tool-${Date.now()}`,
        name: 'Other Tool',
      });

      const response = await request(app)
        .get('/api/tools/search?q=inv')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Search completed successfully');
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);

      // Should contain inventory and invoice tools
      const toolNames = response.body.data.map((t: any) =>
        t.name.toLowerCase()
      );
      expect(toolNames.some((name: string) => name.includes('inventory'))).toBe(
        true
      );
      expect(toolNames.some((name: string) => name.includes('invoice'))).toBe(
        true
      );

      // Should NOT contain "Other Tool"
      expect(toolNames.some((name: string) => name === 'other tool')).toBe(
        false
      );
    });

    it('should reject query less than 2 characters', async () => {
      const response = await request(app)
        .get('/api/tools/search?q=a')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.toLowerCase()).toContain('at least');
      expect(response.body.error.toLowerCase()).toContain('characters');
    });
  });

  // ============================================================================
  // End-to-End Workflow
  // ============================================================================

  describe('Complete CRUD Workflow', () => {
    it('should complete full tool lifecycle', async () => {
      const toolId = `test-e2e-tool-${Date.now()}`;

      // Step 1: Create tool
      const createResponse = await request(app)
        .post('/api/tools/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          toolId: toolId,
          name: 'E2E Test Tool',
          version: '1.0.0',
          route: '/tools/e2e-test',
          apiBase: '/api/tools/e2e-test',
          manifestJson: { test: true },
        })
        .expect(201);

      expect(createResponse.body.data.tool_id).toBe(toolId);

      // Step 2: Read tool by ID
      const readResponse = await request(app)
        .get(`/api/tools/registry/${toolId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(readResponse.body.data.tool_id).toBe(toolId);

      // Step 3: List all tools (should contain created tool)
      const listResponse = await request(app)
        .get('/api/tools/registry')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const toolIds = listResponse.body.data.map((t: any) => t.tool_id);
      expect(toolIds).toContain(toolId);

      // Step 4: Update tool
      const updateResponse = await request(app)
        .put(`/api/tools/registry/${toolId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated E2E Tool',
          version: '2.0.0',
        })
        .expect(200);

      expect(updateResponse.body.data.name).toBe('Updated E2E Tool');
      expect(updateResponse.body.data.version).toBe('2.0.0');

      // Step 5: Search for tool
      const searchResponse = await request(app)
        .get(`/api/tools/search?q=e2e`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const searchResults = searchResponse.body.data.map((t: any) => t.tool_id);
      expect(searchResults).toContain(toolId);

      // Step 6: Delete tool
      await request(app)
        .delete(`/api/tools/registry/${toolId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Step 7: Verify deletion (should return 404)
      await request(app)
        .get(`/api/tools/registry/${toolId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
