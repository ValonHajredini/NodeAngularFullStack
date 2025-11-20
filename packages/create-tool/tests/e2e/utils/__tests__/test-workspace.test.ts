/**
 * Unit tests for TestWorkspace utility
 *
 * @module tests/e2e/utils/__tests__/test-workspace.test
 */

import { TestWorkspace } from '../test-workspace';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('TestWorkspace', () => {
  let workspace: TestWorkspace;
  const testBaseDir = '/tmp/test-workspace-unit-tests';

  beforeEach(async () => {
    // Create a test workspace with custom base directory
    workspace = new TestWorkspace(testBaseDir);
  });

  afterEach(async () => {
    // Clean up the workspace after each test
    await workspace.cleanup();

    // Clean up the entire test base directory
    try {
      await fs.rm(testBaseDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('create()', () => {
    it('should create workspace directory', async () => {
      await workspace.create();

      const workspaceDir = workspace.getWorkspaceDir();
      const stats = await fs.stat(workspaceDir);

      expect(stats.isDirectory()).toBe(true);
    });

    it('should create workspace with unique UUID', async () => {
      const workspace1 = new TestWorkspace(testBaseDir);
      const workspace2 = new TestWorkspace(testBaseDir);

      await workspace1.create();
      await workspace2.create();

      const dir1 = workspace1.getWorkspaceDir();
      const dir2 = workspace2.getWorkspaceDir();

      expect(dir1).not.toBe(dir2);

      await workspace1.cleanup();
      await workspace2.cleanup();
    });

    it('should create workspace recursively', async () => {
      const deepBaseDir = '/tmp/deep/nested/path/test-workspaces';
      const deepWorkspace = new TestWorkspace(deepBaseDir);

      await deepWorkspace.create();

      const workspaceDir = deepWorkspace.getWorkspaceDir();
      const stats = await fs.stat(workspaceDir);

      expect(stats.isDirectory()).toBe(true);

      await deepWorkspace.cleanup();
      await fs.rm('/tmp/deep', { recursive: true, force: true });
    });
  });

  describe('getPath()', () => {
    it('should return workspace directory when no argument provided', async () => {
      await workspace.create();

      const result = workspace.getPath();
      const workspaceDir = workspace.getWorkspaceDir();

      expect(result).toBe(workspaceDir);
    });

    it('should return absolute path for relative path', async () => {
      await workspace.create();

      const result = workspace.getPath('apps/web/src/app');
      const workspaceDir = workspace.getWorkspaceDir();

      expect(result).toBe(path.join(workspaceDir, 'apps/web/src/app'));
    });

    it('should handle paths with slashes correctly', async () => {
      await workspace.create();

      const result = workspace.getPath('/apps/api/src/');
      const workspaceDir = workspace.getWorkspaceDir();

      expect(result).toBe(path.join(workspaceDir, '/apps/api/src/'));
    });
  });

  describe('writeFile()', () => {
    it('should write file to workspace', async () => {
      await workspace.create();

      await workspace.writeFile('test.txt', 'Hello, World!');

      const content = await workspace.readFile('test.txt');
      expect(content).toBe('Hello, World!');
    });

    it('should create parent directories automatically', async () => {
      await workspace.create();

      await workspace.writeFile('apps/web/src/app/test.ts', 'console.log("test");');

      const content = await workspace.readFile('apps/web/src/app/test.ts');
      expect(content).toBe('console.log("test");');

      // Verify parent directories exist
      const dirPath = workspace.getPath('apps/web/src/app');
      const stats = await fs.stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should overwrite existing file', async () => {
      await workspace.create();

      await workspace.writeFile('test.txt', 'original content');
      await workspace.writeFile('test.txt', 'updated content');

      const content = await workspace.readFile('test.txt');
      expect(content).toBe('updated content');
    });

    it('should handle UTF-8 content correctly', async () => {
      await workspace.create();

      const utf8Content = 'こんにちは世界 🌍';
      await workspace.writeFile('utf8.txt', utf8Content);

      const content = await workspace.readFile('utf8.txt');
      expect(content).toBe(utf8Content);
    });
  });

  describe('readFile()', () => {
    it('should read file content', async () => {
      await workspace.create();

      await workspace.writeFile('readme.md', '# Test');

      const content = await workspace.readFile('readme.md');
      expect(content).toBe('# Test');
    });

    it('should throw error if file does not exist', async () => {
      await workspace.create();

      try {
        await workspace.readFile('nonexistent.txt');
        fail('Expected readFile to throw an error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('listFiles()', () => {
    it('should list all files in workspace', async () => {
      await workspace.create();

      await workspace.writeFile('file1.txt', 'content1');
      await workspace.writeFile('file2.txt', 'content2');
      await workspace.writeFile('dir/file3.txt', 'content3');

      const files = await workspace.listFiles();

      expect(files.length).toBe(3);
      expect(files).toContain('file1.txt');
      expect(files).toContain('file2.txt');
      expect(files).toContain(path.join('dir', 'file3.txt'));
    });

    it('should list files in subdirectory', async () => {
      await workspace.create();

      await workspace.writeFile('apps/web/component.ts', 'export class Component {}');
      await workspace.writeFile('apps/api/controller.ts', 'export class Controller {}');

      const files = await workspace.listFiles('apps');

      expect(files.length).toBe(2);
      expect(files).toContain(path.join('apps', 'web', 'component.ts'));
      expect(files).toContain(path.join('apps', 'api', 'controller.ts'));
    });

    it('should return empty array for empty directory', async () => {
      await workspace.create();

      const files = await workspace.listFiles();

      expect(files).toEqual([]);
    });

    it('should handle deeply nested directories', async () => {
      await workspace.create();

      await workspace.writeFile('a/b/c/d/e/file.txt', 'deep file');

      const files = await workspace.listFiles();

      expect(files.length).toBe(1);
      expect(files[0]).toBe(path.join('a', 'b', 'c', 'd', 'e', 'file.txt'));
    });
  });

  describe('checkFileExists()', () => {
    it('should return true for existing file', async () => {
      await workspace.create();

      await workspace.writeFile('exists.txt', 'content');

      const exists = await workspace.checkFileExists('exists.txt');

      expect(exists).toBe(true);
    });

    it('should return false for non-existing file', async () => {
      await workspace.create();

      const exists = await workspace.checkFileExists('nonexistent.txt');

      expect(exists).toBe(false);
    });

    it('should return true for existing directory', async () => {
      await workspace.create();

      await workspace.writeFile('dir/file.txt', 'content');

      const exists = await workspace.checkFileExists('dir');

      expect(exists).toBe(true);
    });
  });

  describe('createBackup()', () => {
    it('should create backup of workspace', async () => {
      await workspace.create();

      await workspace.writeFile('file.txt', 'original');

      const backupDir = await workspace.createBackup('test-backup');

      // Verify backup directory exists
      const stats = await fs.stat(backupDir);
      expect(stats.isDirectory()).toBe(true);

      // Verify backup contains file
      const backupFilePath = path.join(backupDir, 'file.txt');
      const backupContent = await fs.readFile(backupFilePath, 'utf-8');
      expect(backupContent).toBe('original');

      // Clean up backup
      await fs.rm(backupDir, { recursive: true, force: true });
    });

    it('should use default suffix if not provided', async () => {
      await workspace.create();

      await workspace.writeFile('file.txt', 'content');

      const backupDir = await workspace.createBackup();

      expect(backupDir).toContain('-backup');

      const stats = await fs.stat(backupDir);
      expect(stats.isDirectory()).toBe(true);

      // Clean up backup
      await fs.rm(backupDir, { recursive: true, force: true });
    });

    it('should preserve directory structure in backup', async () => {
      await workspace.create();

      await workspace.writeFile('apps/web/component.ts', 'component code');
      await workspace.writeFile('apps/api/controller.ts', 'controller code');

      const backupDir = await workspace.createBackup('structure-test');

      // Verify directory structure preserved
      const backupWebFile = path.join(backupDir, 'apps/web/component.ts');
      const backupApiFile = path.join(backupDir, 'apps/api/controller.ts');

      const webContent = await fs.readFile(backupWebFile, 'utf-8');
      const apiContent = await fs.readFile(backupApiFile, 'utf-8');

      expect(webContent).toBe('component code');
      expect(apiContent).toBe('controller code');

      // Clean up backup
      await fs.rm(backupDir, { recursive: true, force: true });
    });
  });

  describe('cleanup()', () => {
    it('should remove workspace directory', async () => {
      await workspace.create();

      const workspaceDir = workspace.getWorkspaceDir();

      // Verify directory exists before cleanup
      let statsBefore = await fs.stat(workspaceDir);
      expect(statsBefore.isDirectory()).toBe(true);

      await workspace.cleanup();

      // Verify directory removed after cleanup
      try {
        await fs.stat(workspaceDir);
        fail('Expected stat to throw an error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle non-existent workspace gracefully', async () => {
      // Don't create workspace, just try to clean it up
      // Should not throw
      await workspace.cleanup();
      expect(true).toBe(true);
    });

    it('should remove workspace with files', async () => {
      await workspace.create();

      await workspace.writeFile('file1.txt', 'content1');
      await workspace.writeFile('dir/file2.txt', 'content2');

      const workspaceDir = workspace.getWorkspaceDir();

      await workspace.cleanup();

      try {
        await fs.stat(workspaceDir);
        fail('Expected stat to throw an error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('getWorkspaceDir()', () => {
    it('should return workspace directory path', async () => {
      await workspace.create();

      const workspaceDir = workspace.getWorkspaceDir();

      expect(workspaceDir).toMatch(/\/tmp\/test-workspace-unit-tests\//);
      expect(typeof workspaceDir).toBe('string');
      expect(workspaceDir.length).toBeGreaterThan(0);
    });

    it('should return consistent path across calls', async () => {
      await workspace.create();

      const dir1 = workspace.getWorkspaceDir();
      const dir2 = workspace.getWorkspaceDir();

      expect(dir1).toBe(dir2);
    });
  });
});
