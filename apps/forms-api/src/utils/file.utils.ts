/**
 * File utility functions for file operations and formatting.
 */

/**
 * Format file size to human-readable string.
 *
 * @param bytes - File size in bytes
 * @returns Human-readable size (e.g., "12.5 MB")
 *
 * @example
 * FileUtils.formatFileSize(1024) // "1.0 KB"
 * FileUtils.formatFileSize(1048576) // "1.0 MB"
 * FileUtils.formatFileSize(1073741824) // "1.0 GB"
 */
export class FileUtils {
  static formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
}
