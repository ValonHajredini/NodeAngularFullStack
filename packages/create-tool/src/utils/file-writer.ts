/**
 * File Writer Utility
 *
 * Async file system operations for creating directories and writing files.
 * Provides safe, cross-platform file operations with proper error handling.
 *
 * Features:
 * - Recursive directory creation
 * - Safe file writing with directory creation
 * - File existence checking
 * - Permission setting (Unix/Mac)
 * - Cross-platform compatibility
 *
 * @module utils/file-writer
 * @example
 * ```typescript
 * import { createDirectory, writeFile, fileExists } from './file-writer.js';
 *
 * // Create directory
 * await createDirectory('/path/to/dir');
 *
 * // Write file (creates parent directories automatically)
 * await writeFile('/path/to/file.ts', 'content');
 *
 * // Check if file exists
 * const exists = await fileExists('/path/to/file.ts');
 * ```
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Create directory recursively (like mkdir -p).
 * Creates all parent directories as needed.
 * Does not throw error if directory already exists.
 *
 * @param dirPath - Directory path to create
 * @throws {Error} When directory creation fails (permissions, invalid path, etc.)
 *
 * @example
 * ```typescript
 * await createDirectory('/path/to/nested/directory');
 * // Creates /path, /path/to, /path/to/nested, /path/to/nested/directory
 * ```
 */
export async function createDirectory(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to create directory ${dirPath}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Write file to disk with automatic parent directory creation.
 * Ensures parent directory exists before writing file.
 * Overwrites file if it already exists.
 *
 * @param filePath - File path to write
 * @param content - File content (string)
 * @throws {Error} When file write fails (permissions, disk space, etc.)
 *
 * @example
 * ```typescript
 * await writeFile('/path/to/file.ts', 'export const foo = "bar";');
 * // Creates /path/to/ directory if needed, then writes file
 * ```
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  try {
    // Ensure parent directory exists
    const dir = path.dirname(filePath);
    await createDirectory(dir);

    // Write file with UTF-8 encoding
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to write file ${filePath}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Check if file or directory exists.
 * Uses fs.access() to check for existence without throwing errors.
 *
 * @param targetPath - Path to check (file or directory)
 * @returns Promise resolving to true if exists, false otherwise
 *
 * @example
 * ```typescript
 * const exists = await fileExists('/path/to/file.ts');
 * if (exists) {
 *   console.log('File already exists');
 * }
 * ```
 */
export async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    // fs.access throws ENOENT if file doesn't exist
    return false;
  }
}

/**
 * Set file permissions (Unix/Mac only, no-op on Windows).
 * Sets file or directory permissions using chmod.
 * Silently ignores errors on Windows (chmod not supported).
 *
 * @param targetPath - File or directory path
 * @param mode - Permission mode (e.g., 0o644 for files, 0o755 for directories)
 * @throws {Error} When chmod fails on Unix/Mac systems
 *
 * @example
 * ```typescript
 * // Set file permissions to rw-r--r-- (644)
 * await setPermissions('/path/to/file.ts', 0o644);
 *
 * // Set directory permissions to rwxr-xr-x (755)
 * await setPermissions('/path/to/directory', 0o755);
 * ```
 */
export async function setPermissions(targetPath: string, mode: number): Promise<void> {
  try {
    await fs.chmod(targetPath, mode);
  } catch (error) {
    // Silently ignore on Windows (chmod not supported)
    if (process.platform === 'win32') {
      return;
    }

    // Re-throw on Unix/Mac systems
    if (error instanceof Error) {
      throw new Error(`Failed to set permissions on ${targetPath}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get file size in bytes.
 * Returns the size of a file in bytes.
 *
 * @param filePath - File path
 * @returns Promise resolving to file size in bytes
 * @throws {Error} When file doesn't exist or stat fails
 *
 * @example
 * ```typescript
 * const size = await getFileSize('/path/to/file.ts');
 * const sizeKB = (size / 1024).toFixed(1);
 * console.log(`File size: ${sizeKB} KB`);
 * ```
 */
export async function getFileSize(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get file size for ${filePath}: ${error.message}`);
    }
    throw error;
  }
}
