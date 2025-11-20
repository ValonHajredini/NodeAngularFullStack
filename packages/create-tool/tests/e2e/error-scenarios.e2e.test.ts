/**
 * End-to-End Error Scenario Tests for CLI Tool Generation
 *
 * These tests validate that the CLI handles edge cases and failure modes gracefully:
 * - Invalid user inputs (malformed tool IDs, etc.)
 * - Missing configuration (environment variables, credentials)
 * - Network failures (API unreachable, timeout)
 * - File system errors (permissions, disk space)
 * - Database connectivity issues
 *
 * Error handling is critical for good UX - the CLI should provide clear,
 * actionable error messages instead of cryptic stack traces.
 *
 * @group e2e
 * @group error-scenarios
 */

import { TestWorkspace } from './utils/test-workspace';
import { CliRunner } from './utils/cli-runner';
import { DatabaseSeeder } from './utils/database';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Error Scenario Tests (AC6)', () => {
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
  });

  /**
   * AC6.1: Test invalid tool ID format (uppercase characters)
   *
   * Tool IDs must be kebab-case (lowercase, hyphens only).
   * Uppercase characters should be rejected with a clear error message.
   */
  it('should reject tool ID with uppercase characters', async () => {
    // Arrange
    const answers = {
      toolName: 'Invalid Uppercase Tool',
      toolId: 'InvalidToolID', // INVALID: uppercase characters
      description: 'Testing invalid uppercase tool ID',
      icon: 'pi-times',
      features: [],
      permissions: [],
    };

    // Act
    const result = await cli.run({
      answers,
      cwd: workspace.getPath(),
      timeout: 30000,
    });

    // Assert
    cli.expectError(result);
    expect(result.stderr).toContain('invalid');
    expect(result.stderr).toContain('kebab-case');
    expect(result.exitCode).not.toBe(0);
  }, 60000);

  /**
   * AC6.2: Test invalid tool ID format (underscores)
   *
   * Tool IDs should use hyphens, not underscores.
   * This prevents naming conflicts and follows kebab-case convention.
   */
  it('should reject tool ID with underscores', async () => {
    // Arrange
    const answers = {
      toolName: 'Invalid Underscore Tool',
      toolId: 'invalid_tool_id', // INVALID: underscores instead of hyphens
      description: 'Testing invalid underscore tool ID',
      icon: 'pi-ban',
      features: [],
      permissions: [],
    };

    // Act
    const result = await cli.run({
      answers,
      cwd: workspace.getPath(),
      timeout: 30000,
    });

    // Assert
    cli.expectError(result);
    expect(result.stderr).toContain('invalid');
    expect(result.stderr).toContain('hyphen');
    expect(result.exitCode).not.toBe(0);
  }, 60000);

  /**
   * AC6.3: Test invalid tool ID format (special characters)
   *
   * Tool IDs should only contain lowercase letters, numbers, and hyphens.
   * Special characters like @, #, $, etc. should be rejected.
   */
  it('should reject tool ID with special characters', async () => {
    // Arrange
    const answers = {
      toolName: 'Invalid Special Char Tool',
      toolId: 'tool@#$%', // INVALID: special characters
      description: 'Testing invalid special characters in tool ID',
      icon: 'pi-exclamation-triangle',
      features: [],
      permissions: [],
    };

    // Act
    const result = await cli.run({
      answers,
      cwd: workspace.getPath(),
      timeout: 30000,
    });

    // Assert
    cli.expectError(result);
    expect(result.stderr).toContain('invalid');
    expect(result.exitCode).not.toBe(0);
  }, 60000);

  /**
   * AC6.4: Test missing admin credentials for registration
   *
   * When --register flag is used, admin email and password environment
   * variables must be set. Missing credentials should fail gracefully.
   */
  it('should handle missing admin credentials gracefully', async () => {
    // Arrange
    const answers = {
      toolName: 'Missing Credentials Tool',
      toolId: 'e2e-missing-creds',
      description: 'Testing missing admin credentials',
      icon: 'pi-key',
      features: [],
      permissions: [],
    };

    // Remove environment variables
    const originalEmail = process.env.CREATE_TOOL_ADMIN_EMAIL;
    const originalPassword = process.env.CREATE_TOOL_ADMIN_PASSWORD;
    delete process.env.CREATE_TOOL_ADMIN_EMAIL;
    delete process.env.CREATE_TOOL_ADMIN_PASSWORD;

    try {
      // Act
      const result = await cli.run({
        answers,
        flags: ['--register'],
        cwd: workspace.getPath(),
        timeout: 30000,
      });

      // Assert
      cli.expectError(result);
      expect(result.stderr).toContain('credential');
      expect(result.stderr).toContain('environment');
      expect(result.exitCode).not.toBe(0);
    } finally {
      // Restore environment variables
      if (originalEmail) process.env.CREATE_TOOL_ADMIN_EMAIL = originalEmail;
      if (originalPassword) process.env.CREATE_TOOL_ADMIN_PASSWORD = originalPassword;
    }
  }, 60000);

  /**
   * AC6.5: Test network failure during API registration
   *
   * If the API is unreachable during registration, the CLI should:
   * 1. Generate files successfully (registration is optional)
   * 2. Display a clear warning about registration failure
   * 3. Provide instructions for manual registration
   */
  it('should handle network failure during registration gracefully', async () => {
    // Arrange
    const answers = {
      toolName: 'Network Failure Tool',
      toolId: 'e2e-network-fail',
      description: 'Testing network failure handling',
      icon: 'pi-wifi',
      features: [],
      permissions: [],
    };

    // Set admin credentials but use invalid API URL
    const originalApiUrl = process.env.API_BASE_URL;
    process.env.API_BASE_URL = 'http://invalid-host-that-does-not-exist:9999';
    process.env.CREATE_TOOL_ADMIN_EMAIL = 'admin@example.com';
    process.env.CREATE_TOOL_ADMIN_PASSWORD = 'User123!@#';

    try {
      // Act
      const result = await cli.run({
        answers,
        flags: ['--register'],
        cwd: workspace.getPath(),
        timeout: 60000,
      });

      // Assert - Should succeed with warning (files generated despite registration failure)
      expect(result.exitCode).toBe(0); // Files still generated
      expect(result.stdout).toContain('Warning'); // Registration warning displayed
      expect(result.stdout).toContain('network') || expect(result.stdout).toContain('unreachable');

      // Verify files were generated despite registration failure
      const componentExists = await workspace.checkFileExists(
        `apps/web/src/app/features/${answers.toolId}/${answers.toolId}.component.ts`
      );
      expect(componentExists).toBe(true);
    } finally {
      // Restore API URL
      if (originalApiUrl) {
        process.env.API_BASE_URL = originalApiUrl;
      } else {
        delete process.env.API_BASE_URL;
      }
    }
  }, 90000);

  /**
   * AC6.6: Test database connection failure
   *
   * If database is unavailable during registration, the CLI should:
   * - Generate files successfully
   * - Display database connectivity error
   * - Suggest troubleshooting steps
   */
  it('should handle database connection failure during registration', async () => {
    // Arrange
    const answers = {
      toolName: 'Database Failure Tool',
      toolId: 'e2e-db-fail',
      description: 'Testing database connection failure',
      icon: 'pi-database',
      features: [],
      permissions: [],
    };

    // Set invalid database URL
    const originalDbUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = 'postgresql://invalid:invalid@invalid-host:5432/invalid_db';
    process.env.CREATE_TOOL_ADMIN_EMAIL = 'admin@example.com';
    process.env.CREATE_TOOL_ADMIN_PASSWORD = 'User123!@#';

    try {
      // Act
      const result = await cli.run({
        answers,
        flags: ['--register'],
        cwd: workspace.getPath(),
        timeout: 60000,
      });

      // Assert - Should succeed with warning
      expect(result.exitCode).toBe(0); // Files generated
      expect(result.stdout).toContain('Warning') || expect(result.stderr).toContain('database');

      // Files should exist despite DB failure
      const serviceExists = await workspace.checkFileExists(
        `apps/api/src/services/${answers.toolId}.service.ts`
      );
      expect(serviceExists).toBe(true);
    } finally {
      // Restore database URL
      if (originalDbUrl) {
        process.env.DATABASE_URL = originalDbUrl;
      } else {
        delete process.env.DATABASE_URL;
      }
    }
  }, 90000);

  /**
   * AC6.7: Test file system permission errors
   *
   * If the CLI lacks write permissions in the target directory,
   * it should display a clear error about permission issues.
   */
  it('should handle file system permission errors gracefully', async () => {
    // Arrange
    const answers = {
      toolName: 'Permission Error Tool',
      toolId: 'e2e-permission',
      description: 'Testing file permission errors',
      icon: 'pi-lock',
      features: [],
      permissions: [],
    };

    // Create a read-only directory
    const readOnlyPath = path.join(workspace.getPath(), 'readonly');
    await fs.mkdir(readOnlyPath, { recursive: true });
    await fs.chmod(readOnlyPath, 0o444); // Read-only, no write permission

    try {
      // Act
      const result = await cli.run({
        answers,
        cwd: readOnlyPath, // Run in read-only directory
        timeout: 30000,
      });

      // Assert
      cli.expectError(result);
      expect(result.stderr).toContain('permission') || expect(result.stderr).toContain('EACCES');
      expect(result.exitCode).not.toBe(0);
    } finally {
      // Restore write permission for cleanup
      await fs.chmod(readOnlyPath, 0o755);
    }
  }, 60000);

  /**
   * AC6.8: Test empty tool name
   *
   * Tool name is required and cannot be empty or whitespace-only.
   */
  it('should reject empty tool name', async () => {
    // Arrange
    const answers = {
      toolName: '', // INVALID: empty tool name
      toolId: 'e2e-empty-name',
      description: 'Testing empty tool name',
      icon: 'pi-question',
      features: [],
      permissions: [],
    };

    // Act
    const result = await cli.run({
      answers,
      cwd: workspace.getPath(),
      timeout: 30000,
    });

    // Assert
    cli.expectError(result);
    expect(result.stderr).toContain('required') || expect(result.stderr).toContain('empty');
    expect(result.exitCode).not.toBe(0);
  }, 60000);

  /**
   * AC6.9: Test tool ID too short
   *
   * Tool IDs should have a minimum length (e.g., 3 characters)
   * to prevent single-letter tool names.
   */
  it('should reject tool ID that is too short', async () => {
    // Arrange
    const answers = {
      toolName: 'Short ID Tool',
      toolId: 'ab', // INVALID: too short (< 3 characters)
      description: 'Testing short tool ID',
      icon: 'pi-minus',
      features: [],
      permissions: [],
    };

    // Act
    const result = await cli.run({
      answers,
      cwd: workspace.getPath(),
      timeout: 30000,
    });

    // Assert
    cli.expectError(result);
    expect(result.stderr).toContain('length') || expect(result.stderr).toContain('short');
    expect(result.exitCode).not.toBe(0);
  }, 60000);

  /**
   * AC6.10: Test tool ID too long
   *
   * Tool IDs should have a maximum length to prevent filesystem path issues
   * and ensure reasonable naming conventions.
   */
  it('should reject tool ID that is too long', async () => {
    // Arrange
    const answers = {
      toolName: 'Very Long ID Tool',
      toolId: 'this-is-a-very-long-tool-id-that-exceeds-reasonable-length-limits-and-should-be-rejected', // INVALID: too long
      description: 'Testing long tool ID',
      icon: 'pi-ellipsis-h',
      features: [],
      permissions: [],
    };

    // Act
    const result = await cli.run({
      answers,
      cwd: workspace.getPath(),
      timeout: 30000,
    });

    // Assert
    cli.expectError(result);
    expect(result.stderr).toContain('length') || expect(result.stderr).toContain('long');
    expect(result.exitCode).not.toBe(0);
  }, 60000);

  /**
   * AC6.11: Test invalid icon name
   *
   * Icon names should match PrimeNG icon conventions (e.g., pi-home, pi-user).
   * Invalid icon names should be rejected or fall back to a default.
   */
  it('should handle invalid icon name gracefully', async () => {
    // Arrange
    const answers = {
      toolName: 'Invalid Icon Tool',
      toolId: 'e2e-invalid-icon',
      description: 'Testing invalid icon name',
      icon: 'invalid-icon-name-that-does-not-exist', // INVALID: not a PrimeNG icon
      features: [],
      permissions: [],
    };

    // Act
    const result = await cli.run({
      answers,
      cwd: workspace.getPath(),
      timeout: 60000,
    });

    // Assert - Should either reject or use default icon
    if (result.exitCode !== 0) {
      // Rejected invalid icon
      expect(result.stderr).toContain('icon');
    } else {
      // Used default icon - verify component was generated
      const componentContent = await workspace.readFile(
        `apps/web/src/app/features/${answers.toolId}/${answers.toolId}.component.ts`
      );
      expect(componentContent).toContain('Component'); // Component exists with default icon
    }
  }, 90000);
});
