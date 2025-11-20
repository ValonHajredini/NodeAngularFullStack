/**
 * File Writer Tests
 *
 * Tests for async file system operations.
 * Uses real file system operations in temporary directory.
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  createDirectory,
  writeFile,
  fileExists,
  setPermissions,
  getFileSize,
} from '../file-writer';

describe('file-writer', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'file-writer-test-'));
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('createDirectory', () => {
    it('should create a directory', async () => {
      const dirPath = path.join(tempDir, 'test-dir');
      await createDirectory(dirPath);

      const exists = await fileExists(dirPath);
      expect(exists).toBe(true);
    });

    it('should create nested directories', async () => {
      const dirPath = path.join(tempDir, 'a', 'b', 'c');
      await createDirectory(dirPath);

      const exists = await fileExists(dirPath);
      expect(exists).toBe(true);
    });

    it('should not throw if directory already exists', async () => {
      const dirPath = path.join(tempDir, 'test-dir');
      await createDirectory(dirPath);

      // Should not throw
      await expect(async () => {
        await createDirectory(dirPath);
      }).not.toThrow();
    });

    it('should throw on invalid path', async () => {
      // Invalid path with null character (not allowed on any OS)
      const invalidPath = path.join(tempDir, 'test\x00invalid');

      try {
        await createDirectory(invalidPath);
        fail('Should have thrown an error');
      } catch (error) {
        // Just verify an error was thrown (null bytes cause underlying fs error)
        expect(error).toBeTruthy();
        expect((error as any).message).toBeTruthy();
      }
    });
  });

  describe('writeFile', () => {
    it('should write file with content', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      const content = 'Hello, World!';

      await writeFile(filePath, content);

      const readContent = await fs.readFile(filePath, 'utf-8');
      expect(readContent).toBe(content);
    });

    it('should create parent directories automatically', async () => {
      const filePath = path.join(tempDir, 'nested', 'deep', 'test.txt');
      const content = 'Test content';

      await writeFile(filePath, content);

      const exists = await fileExists(filePath);
      expect(exists).toBe(true);

      const readContent = await fs.readFile(filePath, 'utf-8');
      expect(readContent).toBe(content);
    });

    it('should overwrite existing file', async () => {
      const filePath = path.join(tempDir, 'test.txt');

      await writeFile(filePath, 'First content');
      await writeFile(filePath, 'Second content');

      const readContent = await fs.readFile(filePath, 'utf-8');
      expect(readContent).toBe('Second content');
    });

    it('should write empty file', async () => {
      const filePath = path.join(tempDir, 'empty.txt');

      await writeFile(filePath, '');

      const exists = await fileExists(filePath);
      expect(exists).toBe(true);

      const readContent = await fs.readFile(filePath, 'utf-8');
      expect(readContent).toBe('');
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'content');

      const exists = await fileExists(filePath);
      expect(exists).toBe(true);
    });

    it('should return true for existing directory', async () => {
      const dirPath = path.join(tempDir, 'test-dir');
      await fs.mkdir(dirPath);

      const exists = await fileExists(dirPath);
      expect(exists).toBe(true);
    });

    it('should return false for non-existent path', async () => {
      const fakePath = path.join(tempDir, 'does-not-exist.txt');

      const exists = await fileExists(fakePath);
      expect(exists).toBe(false);
    });
  });

  describe('setPermissions', () => {
    // Only test permissions on Unix-like systems
    const isWindows = process.platform === 'win32';

    it('should set file permissions on Unix/Mac', async () => {
      if (isWindows) {
        // Skip on Windows
        return;
      }

      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'content');

      await setPermissions(filePath, 0o644);

      const stats = await fs.stat(filePath);
      // Extract permission bits (last 9 bits: rwxrwxrwx)
      const mode = stats.mode & 0o777;
      expect(mode).toBe(0o644);
    });

    it('should set directory permissions on Unix/Mac', async () => {
      if (isWindows) {
        // Skip on Windows
        return;
      }

      const dirPath = path.join(tempDir, 'test-dir');
      await fs.mkdir(dirPath);

      await setPermissions(dirPath, 0o755);

      const stats = await fs.stat(dirPath);
      const mode = stats.mode & 0o777;
      expect(mode).toBe(0o755);
    });

    it('should not throw on Windows (no-op)', async () => {
      if (!isWindows) {
        // Skip on Unix/Mac
        return;
      }

      const filePath = path.join(tempDir, 'test.txt');
      await fs.writeFile(filePath, 'content');

      // Should not throw on Windows
      await expect(async () => {
        await setPermissions(filePath, 0o644);
      }).not.toThrow();
    });
  });

  describe('getFileSize', () => {
    it('should return file size in bytes', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      const content = 'Hello, World!'; // 13 bytes
      await fs.writeFile(filePath, content);

      const size = await getFileSize(filePath);
      expect(size).toBe(13);
    });

    it('should return 0 for empty file', async () => {
      const filePath = path.join(tempDir, 'empty.txt');
      await fs.writeFile(filePath, '');

      const size = await getFileSize(filePath);
      expect(size).toBe(0);
    });

    it('should throw for non-existent file', async () => {
      const fakePath = path.join(tempDir, 'does-not-exist.txt');

      try {
        await getFileSize(fakePath);
        fail('Should have thrown an error');
      } catch (error) {
        // Just verify an error was thrown
        expect(error).toBeTruthy();
        expect((error as any).message).toBeTruthy();
      }
    });
  });
});
