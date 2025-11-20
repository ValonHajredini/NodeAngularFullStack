/**
 * Conflict Handling E2E Tests
 *
 * Validates --force and --skip-existing flags for handling file conflicts.
 * Tests backup creation, file overwriting, and conflict detection.
 *
 * @module tests/e2e/conflict-handling.e2e.test
 */

import { TestWorkspace } from './utils/test-workspace';
import { CliRunner } from './utils/cli-runner';

describe('Conflict Handling E2E', () => {
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

  it('should error on duplicate tool ID without flags', async () => {
    // Arrange
    const answers = {
      toolName: 'Duplicate Test',
      toolId: 'e2e-duplicate',
      description: 'Testing duplicate detection',
      icon: 'pi-exclamation-circle',
      features: [],
      permissions: [],
    };

    // Act - First generation
    const result1 = await cli.run({
      answers,
      flags: ['--skip-registration'],
      cwd: workspace.getPath(),
      timeout: 90000,
    });

    expect(result1.exitCode).toBe(0);

    // Act - Second generation (should fail or warn)
    const result2 = await cli.run({
      answers,
      flags: ['--skip-registration'],
      cwd: workspace.getPath(),
      timeout: 90000,
    });

    // Assert - Should detect conflict
    // Implementation may either:
    // 1. Exit with error (exitCode !== 0)
    // 2. Warn and skip (exitCode === 0 with warning message)
    const hasError = result2.exitCode !== 0;
    const hasWarning =
      result2.stdout.includes('exists') ||
      result2.stdout.includes('conflict') ||
      result2.stderr.includes('exists') ||
      result2.stderr.includes('conflict');

    expect(hasError || hasWarning).toBe(true);
  }, 120000);

  it('should overwrite files with --force flag', async () => {
    // Arrange
    const answers = {
      toolName: 'Force Tool',
      toolId: 'e2e-force',
      description: 'Testing force overwrite',
      icon: 'pi-bolt',
      features: [],
      permissions: [],
    };

    // Act - First generation
    const result1 = await cli.run({
      answers,
      flags: ['--skip-registration'],
      cwd: workspace.getPath(),
      timeout: 90000,
    });

    expect(result1.exitCode).toBe(0);

    // Modify a generated file
    const componentPath =
      'apps/web/src/app/features/e2e-force/e2e-force.component.ts';
    await workspace.writeFile(componentPath, '// Modified content for testing');

    // Act - Second generation with --force
    const result2 = await cli.run({
      answers,
      flags: ['--force', '--skip-registration'],
      cwd: workspace.getPath(),
      timeout: 90000,
    });

    // Assert - Should succeed
    expect(result2.exitCode).toBe(0);

    // Assert - File should be overwritten (no longer contains modified content)
    const content = await workspace.readFile(componentPath);
    expect(content).not.toContain('// Modified content for testing');
    expect(content).toContain('export class E2eForceComponent');
  }, 120000);

  it('should create backup when using --force', async () => {
    // Arrange
    const answers = {
      toolName: 'Backup Test',
      toolId: 'e2e-backup',
      description: 'Testing backup creation',
      icon: 'pi-save',
      features: [],
      permissions: [],
    };

    // Act - First generation
    await cli.run({
      answers,
      flags: ['--skip-registration'],
      cwd: workspace.getPath(),
      timeout: 90000,
    });

    // Modify a file to track backup
    const componentPath =
      'apps/web/src/app/features/e2e-backup/e2e-backup.component.ts';
    const originalContent = await workspace.readFile(componentPath);
    await workspace.writeFile(componentPath, '// Backup test marker');

    // Act - Second generation with --force
    const result = await cli.run({
      answers,
      flags: ['--force', '--skip-registration'],
      cwd: workspace.getPath(),
      timeout: 90000,
    });

    // Assert
    expect(result.exitCode).toBe(0);

    // Check if backup message in output
    const hasBackupMessage =
      result.stdout.includes('backup') || result.stdout.includes('Backup');
    expect(hasBackupMessage).toBe(true);
  }, 120000);

  it('should skip existing files with --skip-existing flag', async () => {
    // Arrange
    const answers = {
      toolName: 'Skip Tool',
      toolId: 'e2e-skip',
      description: 'Testing skip existing',
      icon: 'pi-forward',
      features: [],
      permissions: [],
    };

    // Act - First generation
    await cli.run({
      answers,
      flags: ['--skip-registration'],
      cwd: workspace.getPath(),
      timeout: 90000,
    });

    // Modify a file
    const componentPath =
      'apps/web/src/app/features/e2e-skip/e2e-skip.component.ts';
    const modifiedContent = '// Modified - should be preserved';
    await workspace.writeFile(componentPath, modifiedContent);

    // Act - Second generation with --skip-existing
    const result = await cli.run({
      answers,
      flags: ['--skip-existing', '--skip-registration'],
      cwd: workspace.getPath(),
      timeout: 90000,
    });

    // Assert - Should succeed
    expect(result.exitCode).toBe(0);

    // Assert - Modified file should be preserved
    const content = await workspace.readFile(componentPath);
    expect(content).toContain('// Modified - should be preserved');
  }, 120000);

  it("should handle partial conflicts (some files exist, others don't)", async () => {
    // Arrange
    const answers = {
      toolName: 'Partial Conflict',
      toolId: 'e2e-partial',
      description: 'Testing partial conflicts',
      icon: 'pi-clone',
      features: [],
      permissions: [],
    };

    // Act - Create only some files manually
    await workspace.create();
    await workspace.writeFile(
      'apps/web/src/app/features/e2e-partial/e2e-partial.component.ts',
      '// Pre-existing component'
    );

    // Act - Generate with --skip-existing
    const result = await cli.run({
      answers,
      flags: ['--skip-existing', '--skip-registration'],
      cwd: workspace.getPath(),
      timeout: 90000,
    });

    // Assert - Should succeed
    expect(result.exitCode).toBe(0);

    // Assert - Pre-existing file preserved
    const componentContent = await workspace.readFile(
      'apps/web/src/app/features/e2e-partial/e2e-partial.component.ts'
    );
    expect(componentContent).toContain('// Pre-existing component');

    // Assert - Other files created
    const serviceExists = await workspace.checkFileExists(
      'apps/web/src/app/features/e2e-partial/e2e-partial.service.ts'
    );
    expect(serviceExists).toBe(true);

    const controllerExists = await workspace.checkFileExists(
      'apps/api/src/controllers/e2e-partial.controller.ts'
    );
    expect(controllerExists).toBe(true);
  }, 120000);

  it('should not modify existing files when neither flag is used', async () => {
    // Arrange
    const answers = {
      toolName: 'No Modify Test',
      toolId: 'e2e-no-modify',
      description: 'Should not modify existing',
      icon: 'pi-lock',
      features: [],
      permissions: [],
    };

    // Act - First generation
    await cli.run({
      answers,
      flags: ['--skip-registration'],
      cwd: workspace.getPath(),
      timeout: 90000,
    });

    // Modify file
    const componentPath =
      'apps/web/src/app/features/e2e-no-modify/e2e-no-modify.component.ts';
    const timestamp = Date.now().toString();
    await workspace.writeFile(componentPath, `// Timestamp: ${timestamp}`);

    // Act - Try to regenerate without flags
    const result = await cli.run({
      answers,
      flags: ['--skip-registration'],
      cwd: workspace.getPath(),
      timeout: 90000,
    });

    // Assert - Should detect conflict or skip
    const content = await workspace.readFile(componentPath);

    // File should still contain timestamp (not overwritten)
    expect(content).toContain(`// Timestamp: ${timestamp}`);
  }, 120000);
});
