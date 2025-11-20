import request from 'supertest';
import { app } from '../../src/server';
import { componentGenerationService } from '../../src/services/component-generation.service';

describe('Tools Creation with Component Scaffolding', () => {
  let authToken: string;

  beforeAll(async () => {
    // Get admin auth token for testing
    const loginResponse = await request(app).post('/api/auth/login').send({
      email: 'admin@example.com',
      password: 'User123!@#',
    });

    if (loginResponse.body.success) {
      authToken = loginResponse.body.data.token;
    }
  });

  afterEach(async () => {
    // Clean up test tools
    try {
      await request(app)
        .delete('/api/admin/tools/test-scaffolding-tool')
        .set('Authorization', `Bearer ${authToken}`);
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Component scaffolding integration', () => {
    it('should detect development environment correctly', () => {
      // Set environment for test
      const originalEnv = process.env.NODE_ENV;

      process.env.NODE_ENV = 'development';
      expect(componentGenerationService.isScaffoldingEnabled()).toBe(true);

      process.env.NODE_ENV = 'production';
      expect(componentGenerationService.isScaffoldingEnabled()).toBe(false);

      process.env.NODE_ENV = 'local';
      expect(componentGenerationService.isScaffoldingEnabled()).toBe(true);

      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should create tool and attempt scaffolding in development mode', async () => {
      // Set environment to development
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const toolData = {
        key: 'test-scaffolding-tool',
        name: 'Test Scaffolding Tool',
        description: 'A tool for testing automated scaffolding',
        active: true,
      };

      const response = await request(app)
        .post('/api/admin/tools')
        .set('Authorization', `Bearer ${authToken}`)
        .send(toolData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tool.key).toBe(toolData.key);
      expect(response.body.data.tool.name).toBe(toolData.name);

      // Note: In actual development environment, this would generate files
      // In test environment, it should complete without errors

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should not affect tool creation in production mode', async () => {
      // Set environment to production
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const toolData = {
        key: 'test-production-tool',
        name: 'Test Production Tool',
        description: 'A tool for testing production behavior',
        active: true,
      };

      const response = await request(app)
        .post('/api/admin/tools')
        .set('Authorization', `Bearer ${authToken}`)
        .send(toolData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tool.key).toBe(toolData.key);

      // Clean up production test tool
      await request(app)
        .delete('/api/admin/tools/test-production-tool')
        .set('Authorization', `Bearer ${authToken}`);

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle component generation failures gracefully', async () => {
      // Set environment to development
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // Mock the component generation service to simulate failure
      const originalGenerateComponent =
        componentGenerationService.generateComponent;
      jest
        .spyOn(componentGenerationService, 'generateComponent')
        .mockRejectedValueOnce(new Error('Simulated generation failure'));

      const toolData = {
        key: 'test-failure-tool',
        name: 'Test Failure Tool',
        description: 'A tool for testing generation failure handling',
        active: true,
      };

      // Tool creation should still succeed even if scaffolding fails
      const response = await request(app)
        .post('/api/admin/tools')
        .set('Authorization', `Bearer ${authToken}`)
        .send(toolData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tool.key).toBe(toolData.key);

      // Clean up
      await request(app)
        .delete('/api/admin/tools/test-failure-tool')
        .set('Authorization', `Bearer ${authToken}`);

      // Restore mocks and environment
      componentGenerationService.generateComponent = originalGenerateComponent;
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Backward compatibility', () => {
    it('should maintain existing tool creation workflow', async () => {
      const toolData = {
        key: 'test-compatibility-tool',
        name: 'Test Compatibility Tool',
        description: 'A tool for testing backward compatibility',
        active: true,
      };

      const response = await request(app)
        .post('/api/admin/tools')
        .set('Authorization', `Bearer ${authToken}`)
        .send(toolData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tool).toMatchObject({
        key: toolData.key,
        name: toolData.name,
        description: toolData.description,
        active: toolData.active,
      });

      // Verify tool can be retrieved
      const getResponse = await request(app)
        .get(`/api/admin/tools/${toolData.key}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.data.tool.key).toBe(toolData.key);

      // Clean up
      await request(app)
        .delete('/api/admin/tools/test-compatibility-tool')
        .set('Authorization', `Bearer ${authToken}`);
    });
  });
});
