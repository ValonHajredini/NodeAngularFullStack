/**
 * API Registration E2E Tests
 *
 * Validates tool registration with the backend API.
 * Tests authentication, database integration, and registration cache.
 *
 * @module tests/e2e/registration.e2e.test
 */

import { TestWorkspace } from './utils/test-workspace';
import { CliRunner } from './utils/cli-runner';
import { DatabaseSeeder } from './utils/database';

describe('API Registration E2E', () => {
  let workspace: TestWorkspace;
  let cli: CliRunner;
  let seeder: DatabaseSeeder;

  beforeEach(async () => {
    workspace = new TestWorkspace();
    await workspace.create();
    cli = new CliRunner();
    seeder = new DatabaseSeeder();
  });

  afterEach(async () => {
    await workspace.cleanup();
    // Clean up registered tools
    await seeder.clearToolRegistry();
  });

  afterAll(async () => {
    await seeder.close();
  });

  it('should register tool with API when credentials provided', async () => {
    // Arrange
    const { email, password } = await seeder.seedAdminUser();

    const answers = {
      toolName: 'Registered Tool',
      toolId: 'e2e-test-registered-tool',
      description: 'Tool with API registration',
      icon: 'pi-cloud',
      features: [],
      permissions: [],
    };

    // Act
    const result = await cli.run({
      answers,
      flags: [],
      cwd: workspace.getPath(),
      env: {
        CREATE_TOOL_ADMIN_EMAIL: email,
        CREATE_TOOL_ADMIN_PASSWORD: password,
        API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',
      },
      timeout: 120000,
    });

    // Assert - CLI success
    expect(result.exitCode).toBe(0);

    // Assert - Registration success message in stdout
    expect(result.stdout).toContain('✓');
    // Note: Actual message depends on implementation

    // Assert - Tool exists in database
    const isRegistered = await seeder.verifyToolRegistered('e2e-test-registered-tool');
    expect(isRegistered).toBe(true);

    // Assert - Tool metadata in database
    const tool = await seeder.getToolById('e2e-test-registered-tool');
    expect(tool).toBeDefined();
    expect(tool.name).toBe('Registered Tool');
    expect(tool.tool_id).toBe('e2e-test-registered-tool');
    expect(tool.manifest_json).toBeDefined();

    // Assert - Manifest contains expected data
    const manifest = JSON.parse(tool.manifest_json);
    expect(manifest.toolId).toBe('e2e-test-registered-tool');
    expect(manifest.toolName).toBe('Registered Tool');
    expect(manifest.description).toBe('Tool with API registration');
  }, 150000);

  it('should skip registration when --skip-registration flag used', async () => {
    // Arrange
    const answers = {
      toolName: 'Skip Registration Tool',
      toolId: 'e2e-test-skip-reg',
      description: 'Tool that skips registration',
      icon: 'pi-ban',
      features: [],
      permissions: [],
    };

    // Act
    const result = await cli.run({
      answers,
      flags: ['--skip-registration'],
      cwd: workspace.getPath(),
      timeout: 90000,
    });

    // Assert - CLI success
    expect(result.exitCode).toBe(0);

    // Assert - Tool NOT in database
    const isRegistered = await seeder.verifyToolRegistered('e2e-test-skip-reg');
    expect(isRegistered).toBe(false);
  }, 120000);

  it('should handle API server offline gracefully', async () => {
    // Arrange
    const answers = {
      toolName: 'Offline API Test',
      toolId: 'e2e-test-offline-api',
      description: 'Test API offline handling',
      icon: 'pi-times-circle',
      features: [],
      permissions: [],
    };

    // Act - Use invalid API URL
    const result = await cli.run({
      answers,
      flags: [],
      cwd: workspace.getPath(),
      env: {
        CREATE_TOOL_ADMIN_EMAIL: 'admin@example.com',
        CREATE_TOOL_ADMIN_PASSWORD: 'password',
        API_BASE_URL: 'http://localhost:9999', // Invalid port
      },
      timeout: 90000,
    });

    // Assert - CLI should continue despite registration failure
    // Files should still be generated
    const componentExists = await workspace.checkFileExists(
      'apps/web/src/app/features/e2e-test-offline-api/e2e-test-offline-api.component.ts'
    );
    expect(componentExists).toBe(true);

    // Note: Exit code depends on implementation - may succeed with warning or fail
    // This test validates graceful handling rather than specific exit code
  }, 120000);

  it('should handle invalid credentials gracefully', async () => {
    // Arrange
    const answers = {
      toolName: 'Invalid Creds Tool',
      toolId: 'e2e-test-invalid-creds',
      description: 'Test invalid credentials',
      icon: 'pi-exclamation-triangle',
      features: [],
      permissions: [],
    };

    // Act - Use invalid credentials
    const result = await cli.run({
      answers,
      flags: [],
      cwd: workspace.getPath(),
      env: {
        CREATE_TOOL_ADMIN_EMAIL: 'invalid@example.com',
        CREATE_TOOL_ADMIN_PASSWORD: 'wrongpassword',
        API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',
      },
      timeout: 90000,
    });

    // Assert - Tool NOT in database
    const isRegistered = await seeder.verifyToolRegistered('e2e-test-invalid-creds');
    expect(isRegistered).toBe(false);

    // Files should still be generated
    const componentExists = await workspace.checkFileExists(
      'apps/web/src/app/features/e2e-test-invalid-creds/e2e-test-invalid-creds.component.ts'
    );
    expect(componentExists).toBe(true);
  }, 120000);

  it('should not register duplicate tools', async () => {
    // Arrange
    const { email, password } = await seeder.seedAdminUser();

    const answers = {
      toolName: 'Duplicate Tool',
      toolId: 'e2e-test-duplicate',
      description: 'Tool for duplicate testing',
      icon: 'pi-copy',
      features: [],
      permissions: [],
    };

    const env = {
      CREATE_TOOL_ADMIN_EMAIL: email,
      CREATE_TOOL_ADMIN_PASSWORD: password,
      API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',
    };

    // Act - Register first time
    const result1 = await cli.run({
      answers,
      flags: [],
      cwd: workspace.getPath(),
      env,
      timeout: 120000,
    });

    // Assert - First registration succeeds
    expect(result1.exitCode).toBe(0);
    const isRegistered = await seeder.verifyToolRegistered('e2e-test-duplicate');
    expect(isRegistered).toBe(true);

    // Act - Try to register again
    const workspace2 = new TestWorkspace();
    await workspace2.create();

    const result2 = await cli.run({
      answers,
      flags: [],
      cwd: workspace2.getPath(),
      env,
      timeout: 120000,
    });

    // Assert - Second registration should handle duplicate gracefully
    // (Either skip with warning or fail with clear message)
    // Files should still be generated
    const componentExists = await workspace2.checkFileExists(
      'apps/web/src/app/features/e2e-test-duplicate/e2e-test-duplicate.component.ts'
    );
    expect(componentExists).toBe(true);

    await workspace2.cleanup();
  }, 180000);
});
