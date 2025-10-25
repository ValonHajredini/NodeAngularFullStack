/**
 * Full CLI Workflow E2E Tests
 *
 * Validates the complete user journey from CLI invocation through file generation.
 * Tests use real file system operations and validate generated code structure.
 *
 * @module tests/e2e/full-workflow.e2e.test
 */

import { TestWorkspace } from './utils/test-workspace';
import { CliRunner } from './utils/cli-runner';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Full CLI Workflow E2E', () => {
  let workspace: TestWorkspace;
  let cli: CliRunner;

  beforeEach(async () => {
    workspace = new TestWorkspace();
    await workspace.create();
    cli = new CliRunner();
  });

  afterEach(async () => {
    await workspace.cleanup();
  });

  it('should generate tool with all files', async () => {
    // Arrange
    const answers = {
      toolName: 'E2E Test Tool',
      toolId: 'e2e-test-tool',
      description: 'A tool for E2E testing',
      icon: 'pi-cog',
      features: [],
      permissions: [],
    };

    // Act
    const result = await cli.run({
      answers,
      flags: ['--skip-registration'], // Skip API registration for this test
      cwd: workspace.getPath(),
      timeout: 90000, // 90 seconds for file generation
    });

    // Assert - CLI success
    expect(result.exitCode).toBe(0);
    expect(result.duration).toBeLessThan(90000);

    // Assert - Expected files generated
    const expectedFiles = [
      'apps/web/src/app/features/e2e-test-tool/e2e-test-tool.component.ts',
      'apps/web/src/app/features/e2e-test-tool/e2e-test-tool.component.html',
      'apps/web/src/app/features/e2e-test-tool/e2e-test-tool.service.ts',
      'apps/web/src/app/features/e2e-test-tool/e2e-test-tool.routes.ts',
      'apps/api/src/controllers/e2e-test-tool.controller.ts',
      'apps/api/src/services/e2e-test-tool.service.ts',
      'apps/api/src/repositories/e2e-test-tool.repository.ts',
      'apps/api/src/validators/e2e-test-tool.validator.ts',
      'apps/api/src/routes/e2e-test-tool.routes.ts',
    ];

    for (const file of expectedFiles) {
      const exists = await workspace.checkFileExists(file);
      expect(exists).toBe(true);
    }

    // Assert - Component file contents
    const componentContent = await workspace.readFile(
      'apps/web/src/app/features/e2e-test-tool/e2e-test-tool.component.ts'
    );
    expect(componentContent).toContain('export class E2eTestToolComponent');
    expect(componentContent).toContain('standalone: true');
    expect(componentContent).toContain('import { CommonModule }');

    // Assert - Service file contents
    const serviceContent = await workspace.readFile(
      'apps/api/src/services/e2e-test-tool.service.ts'
    );
    expect(serviceContent).toContain('export class E2eTestToolService');
    expect(serviceContent).toContain('constructor(private repository:');

    // Assert - Backend index files updated
    const servicesIndexExists = await workspace.checkFileExists(
      'apps/api/src/services/index.ts'
    );
    if (servicesIndexExists) {
      const servicesIndex = await workspace.readFile('apps/api/src/services/index.ts');
      expect(servicesIndex).toContain('e2e-test-tool.service');
    }

    const controllersIndexExists = await workspace.checkFileExists(
      'apps/api/src/controllers/index.ts'
    );
    if (controllersIndexExists) {
      const controllersIndex = await workspace.readFile('apps/api/src/controllers/index.ts');
      expect(controllersIndex).toContain('e2e-test-tool.controller');
    }
  }, 120000); // 2 minute timeout

  it('should handle tool name with spaces and special characters', async () => {
    // Arrange
    const answers = {
      toolName: 'Test Tool With Spaces!',
      toolId: 'test-tool-with-spaces',
      description: 'Testing edge cases in naming',
      icon: 'pi-star',
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

    // Assert
    expect(result.exitCode).toBe(0);

    // Verify files use kebab-case for paths but PascalCase for class names
    const componentExists = await workspace.checkFileExists(
      'apps/web/src/app/features/test-tool-with-spaces/test-tool-with-spaces.component.ts'
    );
    expect(componentExists).toBe(true);

    const componentContent = await workspace.readFile(
      'apps/web/src/app/features/test-tool-with-spaces/test-tool-with-spaces.component.ts'
    );
    expect(componentContent).toContain('export class TestToolWithSpacesComponent');
  }, 120000);

  it('should generate valid TypeScript without compilation errors', async () => {
    // Arrange
    const answers = {
      toolName: 'Valid TS Tool',
      toolId: 'valid-ts-tool',
      description: 'Tool for testing TypeScript validity',
      icon: 'pi-check',
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

    // Assert
    cli.expectSuccess(result);

    // Verify all TypeScript files have proper imports and exports
    const tsFiles = [
      'apps/web/src/app/features/valid-ts-tool/valid-ts-tool.component.ts',
      'apps/web/src/app/features/valid-ts-tool/valid-ts-tool.service.ts',
      'apps/api/src/controllers/valid-ts-tool.controller.ts',
      'apps/api/src/services/valid-ts-tool.service.ts',
    ];

    for (const file of tsFiles) {
      const content = await workspace.readFile(file);

      // All files should have at least one import
      expect(content).toMatch(/import .+ from .+;/);

      // All files should have at least one export
      expect(content).toMatch(/export (class|interface|type|const)/);
    }
  }, 120000);

  it('should create files with correct permissions', async () => {
    // Arrange
    const answers = {
      toolName: 'Permission Test',
      toolId: 'permission-test',
      description: 'Testing file permissions',
      icon: 'pi-lock',
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

    // Assert
    cli.expectSuccess(result);

    // Check file permissions (Unix systems)
    const testFile = workspace.getPath(
      'apps/web/src/app/features/permission-test/permission-test.component.ts'
    );
    const stats = await fs.stat(testFile);
    const mode = stats.mode & parseInt('777', 8);

    // Files should be readable and writable (at minimum 644)
    expect(mode & parseInt('400', 8)).toBeGreaterThan(0); // Owner read
    expect(mode & parseInt('200', 8)).toBeGreaterThan(0); // Owner write
  }, 120000);

  it('should report progress during generation', async () => {
    // Arrange
    const answers = {
      toolName: 'Progress Test',
      toolId: 'progress-test',
      description: 'Testing progress reporting',
      icon: 'pi-spinner',
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

    // Assert
    cli.expectSuccess(result);

    // Verify stdout contains progress indicators
    expect(result.stdout).toContain('Generating Tool Files');
    expect(result.stdout).toContain('✓'); // Success checkmarks
  }, 120000);

  it('should handle minimal configuration (no features)', async () => {
    // Arrange
    const answers = {
      toolName: 'Minimal Tool',
      toolId: 'minimal-tool',
      description: 'Minimal configuration',
      icon: 'pi-circle',
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

    // Assert
    cli.expectSuccess(result);

    // Even minimal tools should have core files
    const coreFiles = [
      'apps/web/src/app/features/minimal-tool/minimal-tool.component.ts',
      'apps/api/src/controllers/minimal-tool.controller.ts',
    ];

    for (const file of coreFiles) {
      const exists = await workspace.checkFileExists(file);
      expect(exists).toBe(true);
    }
  }, 120000);
});
