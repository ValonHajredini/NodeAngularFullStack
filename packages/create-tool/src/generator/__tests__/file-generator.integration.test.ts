/**
 * File Generator Integration Tests
 *
 * Tests complete file generation workflow end-to-end.
 * Creates actual directories and files in temporary location.
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { generateToolFiles } from '../file-generator';
import type { ToolMetadata } from '../../prompts/tool-prompts';

describe('file-generator integration', () => {
  let tempWorkspaceRoot: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Save original CWD
    originalCwd = process.cwd();

    // Create temporary workspace structure
    tempWorkspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'create-tool-integration-'));

    // Create workspace structure
    await fs.mkdir(path.join(tempWorkspaceRoot, 'apps/web/src/app/features/tools'), { recursive: true });
    await fs.mkdir(path.join(tempWorkspaceRoot, 'apps/api/src/controllers'), { recursive: true });
    await fs.mkdir(path.join(tempWorkspaceRoot, 'apps/api/src/services'), { recursive: true });
    await fs.mkdir(path.join(tempWorkspaceRoot, 'apps/api/src/repositories'), { recursive: true });
    await fs.mkdir(path.join(tempWorkspaceRoot, 'apps/api/src/routes'), { recursive: true });
    await fs.mkdir(path.join(tempWorkspaceRoot, 'apps/api/src/validators'), { recursive: true });
    await fs.mkdir(path.join(tempWorkspaceRoot, 'packages/shared/src/types'), { recursive: true });

    // Change to temp workspace
    process.chdir(tempWorkspaceRoot);
  });

  afterEach(async () => {
    // Restore original CWD
    process.chdir(originalCwd);

    // Clean up temporary workspace
    await fs.rm(tempWorkspaceRoot, { recursive: true, force: true });
  });

  const mockMetadata: ToolMetadata = {
    toolId: 'test-tool',
    toolName: 'Test Tool',
    description: 'A test tool for integration testing',
    icon: 'pi-box',
    version: '1.0.0',
    permissions: ['user'],
    features: ['backend', 'database', 'service', 'component'],
    confirm: true,
    route: '/tools/test-tool',
    apiBase: '/api/tools/test-tool',
  };

  it('should generate all tool files successfully', async () => {
    const result = await generateToolFiles(mockMetadata);

    expect(result.success).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.filesCreated.length).toBeGreaterThan(0);
    expect(result.directoriesCreated.length).toBeGreaterThan(0);
  }, 10000); // 10 second timeout

  it('should create all expected files', async () => {
    await generateToolFiles(mockMetadata);

    // Check frontend files
    const frontendBase = path.join(tempWorkspaceRoot, 'apps/web/src/app/features/tools/test-tool');
    expect(await fs.access(path.join(frontendBase, 'test-tool.component.ts')).then(() => true).catch(() => false)).toBe(true);
    expect(await fs.access(path.join(frontendBase, 'test-tool.component.html')).then(() => true).catch(() => false)).toBe(true);
    expect(await fs.access(path.join(frontendBase, 'test-tool.component.css')).then(() => true).catch(() => false)).toBe(true);
    expect(await fs.access(path.join(frontendBase, 'services/test-tool.service.ts')).then(() => true).catch(() => false)).toBe(true);
    expect(await fs.access(path.join(frontendBase, 'test-tool.routes.ts')).then(() => true).catch(() => false)).toBe(true);

    // Check backend files
    expect(await fs.access(path.join(tempWorkspaceRoot, 'apps/api/src/controllers/test-tool.controller.ts')).then(() => true).catch(() => false)).toBe(true);
    expect(await fs.access(path.join(tempWorkspaceRoot, 'apps/api/src/services/test-tool.service.ts')).then(() => true).catch(() => false)).toBe(true);
    expect(await fs.access(path.join(tempWorkspaceRoot, 'apps/api/src/repositories/test-tool.repository.ts')).then(() => true).catch(() => false)).toBe(true);
    expect(await fs.access(path.join(tempWorkspaceRoot, 'apps/api/src/routes/test-tool.routes.ts')).then(() => true).catch(() => false)).toBe(true);
    expect(await fs.access(path.join(tempWorkspaceRoot, 'apps/api/src/validators/test-tool.validator.ts')).then(() => true).catch(() => false)).toBe(true);

    // Check shared files
    expect(await fs.access(path.join(tempWorkspaceRoot, 'packages/shared/src/types/test-tool.types.ts')).then(() => true).catch(() => false)).toBe(true);

    // Check config files
    expect(await fs.access(path.join(frontendBase, 'README.md')).then(() => true).catch(() => false)).toBe(true);
  }, 10000);

  it('should detect conflicts and fail by default', async () => {
    // Generate once
    await generateToolFiles(mockMetadata);

    // Try to generate again (should fail)
    const result = await generateToolFiles(mockMetadata);

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('already exists');
  }, 10000);

  it('should overwrite files in force mode', async () => {
    // Generate once
    await generateToolFiles(mockMetadata);

    // Generate again with force
    const result = await generateToolFiles(mockMetadata, { force: true });

    expect(result.success).toBe(true);
    expect(result.errors.length).toBe(0);
  }, 10000);

  it('should skip existing files in skip mode', async () => {
    // Generate once
    await generateToolFiles(mockMetadata);

    // Generate again with skipExisting
    const result = await generateToolFiles(mockMetadata, { skipExisting: true });

    expect(result.success).toBe(true);
    expect(result.errors.length).toBe(0);
    // In skip mode, no new files are created
    expect(result.filesCreated.length).toBe(0);
  }, 10000);

  it('should create files with correct content', async () => {
    await generateToolFiles(mockMetadata);

    // Check that component file contains expected content
    const componentPath = path.join(
      tempWorkspaceRoot,
      'apps/web/src/app/features/tools/test-tool/test-tool.component.ts'
    );
    const componentContent = await fs.readFile(componentPath, 'utf-8');

    expect(componentContent).toContain('TestToolComponent');
    expect(componentContent).toContain('test-tool');
  }, 10000);
});
