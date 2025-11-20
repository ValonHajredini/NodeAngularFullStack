/**
 * Test Workspace Manager
 *
 * Provides isolated file system workspaces for E2E tests.
 * Each test gets a unique workspace directory to prevent conflicts.
 *
 * @module tests/e2e/utils/test-workspace
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';

export class TestWorkspace {
  private workspaceDir: string;

  /**
   * Creates a new test workspace manager.
   * @param baseDir - Base directory for all test workspaces (default: /tmp/create-tool-e2e)
   */
  constructor(private baseDir: string = '/tmp/create-tool-e2e') {
    const testId = randomUUID();
    this.workspaceDir = path.join(this.baseDir, testId);
  }

  /**
   * Creates the test workspace directory.
   * @throws {Error} If directory creation fails
   */
  async create(): Promise<void> {
    await fs.mkdir(this.workspaceDir, { recursive: true });
    console.log(`✓ Test workspace created: ${this.workspaceDir}`);
  }

  /**
   * Gets the absolute path to a file or directory within the workspace.
   * @param relativePath - Path relative to workspace root (optional)
   * @returns Absolute path
   */
  getPath(relativePath: string = ''): string {
    return path.join(this.workspaceDir, relativePath);
  }

  /**
   * Writes a file to the workspace.
   * @param relativePath - Path relative to workspace root
   * @param content - File content
   * @throws {Error} If write operation fails
   */
  async writeFile(relativePath: string, content: string): Promise<void> {
    const filePath = this.getPath(relativePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Reads a file from the workspace.
   * @param relativePath - Path relative to workspace root
   * @returns File content
   * @throws {Error} If file doesn't exist or read fails
   */
  async readFile(relativePath: string): Promise<string> {
    const filePath = this.getPath(relativePath);
    return await fs.readFile(filePath, 'utf-8');
  }

  /**
   * Lists all files in a directory recursively.
   * @param relativePath - Directory path relative to workspace root (optional)
   * @returns Array of file paths relative to workspace root
   * @throws {Error} If directory read fails
   */
  async listFiles(relativePath: string = ''): Promise<string[]> {
    const dirPath = this.getPath(relativePath);
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    const files: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(relativePath, entry.name);
      if (entry.isDirectory()) {
        const subFiles = await this.listFiles(fullPath);
        files.push(...subFiles);
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Checks if a file exists in the workspace.
   * @param relativePath - Path relative to workspace root
   * @returns True if file exists, false otherwise
   */
  async checkFileExists(relativePath: string): Promise<boolean> {
    try {
      const filePath = this.getPath(relativePath);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Creates a backup of the workspace.
   * @param suffix - Suffix to append to backup directory name (default: 'backup')
   * @returns Path to backup directory
   * @throws {Error} If backup creation fails
   */
  async createBackup(suffix: string = 'backup'): Promise<string> {
    const backupDir = `${this.workspaceDir}-${suffix}`;
    await fs.cp(this.workspaceDir, backupDir, { recursive: true });
    console.log(`✓ Backup created: ${backupDir}`);
    return backupDir;
  }

  /**
   * Cleans up the workspace directory.
   * Safe to call multiple times. Logs warning if cleanup fails.
   */
  async cleanup(): Promise<void> {
    try {
      await fs.rm(this.workspaceDir, { recursive: true, force: true });
      console.log(`✓ Test workspace cleaned: ${this.workspaceDir}`);
    } catch (error) {
      console.warn(`Warning: Failed to cleanup workspace: ${error}`);
    }
  }

  /**
   * Gets the workspace directory path.
   * @returns Absolute path to workspace directory
   */
  getWorkspaceDir(): string {
    return this.workspaceDir;
  }
}
