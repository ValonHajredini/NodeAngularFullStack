/**
 * Checksum Utility Functions
 * Provides SHA-256 checksum generation and verification for export packages
 * Epic 33.2: Export Package Distribution
 * Story: 33.2.2 Package Verification & Security
 *
 * Uses Node.js crypto module for hashing with streaming file I/O
 * for memory efficiency with large files (up to 1GB+).
 */

import * as crypto from 'crypto';
import * as fs from 'fs';

/**
 * Checksum generation constants
 */
const CHUNK_SIZE_KB = 64; // 64KB chunks for optimal streaming performance
const BYTES_PER_KB = 1024; // Bytes per kilobyte conversion
const MS_PER_SECOND = 1000; // Milliseconds per second conversion
const CHECKSUM_TIMEOUT_MS = 30000; // 30 seconds timeout for large files
const SHA256_LENGTH = 64; // SHA-256 hash length in hexadecimal characters

/**
 * Generate SHA-256 checksum for a file
 * Uses streaming I/O for memory efficiency with large files.
 * @param filePath - Absolute path to file
 * @returns Promise resolving to lowercase hexadecimal hash (64 characters)
 * @throws Error if file not found or read error
 * @throws Error if checksum generation times out (30 seconds)
 * @example
 * const checksum = await generateFileChecksum('/tmp/export.tar.gz');
 * console.log(checksum); // 'a3f5b1c2d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0...'
 */
export async function generateFileChecksum(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath, {
      highWaterMark: CHUNK_SIZE_KB * BYTES_PER_KB, // Optimal chunk size for streaming
    });

    // Timeout after configured duration (for very large files)
    const timeout = setTimeout(() => {
      stream.destroy();
      reject(
        new Error(
          `Checksum generation timeout (${CHECKSUM_TIMEOUT_MS / MS_PER_SECOND} seconds)`
        )
      );
    }, CHECKSUM_TIMEOUT_MS);

    stream.on('data', (chunk) => {
      hash.update(chunk);
    });

    stream.on('end', () => {
      clearTimeout(timeout);
      const checksum = hash.digest('hex').toLowerCase();
      resolve(checksum);
    });

    stream.on('error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`Failed to generate checksum: ${error.message}`));
    });
  });
}

/**
 * Verify file checksum matches expected value
 * Computes current file checksum and compares with expected value.
 * Case-insensitive comparison (both checksums converted to lowercase).
 * @param filePath - Absolute path to file
 * @param expectedChecksum - Expected SHA-256 checksum (64 hex characters)
 * @returns Promise resolving to true if match, false if mismatch
 * @throws Error if file not found or read error
 * @example
 * const isValid = await verifyFileChecksum(
 *   '/tmp/export.tar.gz',
 *   'a3f5b1c2d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2'
 * );
 * if (isValid) {
 *   console.log('Package integrity verified');
 * } else {
 *   console.error('Package corrupted or tampered');
 * }
 */
export async function verifyFileChecksum(
  filePath: string,
  expectedChecksum: string
): Promise<boolean> {
  const actualChecksum = await generateFileChecksum(filePath);
  return actualChecksum === expectedChecksum.toLowerCase();
}

/**
 * Validate checksum format (64 lowercase hexadecimal characters)
 * Ensures checksum string is valid SHA-256 format before comparison.
 * @param checksum - Checksum string to validate
 * @returns True if valid SHA-256 format, false otherwise
 * @example
 * isValidChecksumFormat('a3f5b1c2...'); // true
 * isValidChecksumFormat('INVALID'); // false
 * isValidChecksumFormat('a3f5'); // false (too short)
 */
export function isValidChecksumFormat(checksum: string): boolean {
  // SHA-256 must be exactly 64 lowercase hexadecimal characters
  const sha256Regex = new RegExp(`^[0-9a-f]{${SHA256_LENGTH}}$`);
  return sha256Regex.test(checksum);
}

/**
 * Generate checksum with metadata
 * Returns checksum along with file size and generation timestamp.
 * Useful for audit trails and package metadata.
 * @param filePath - Absolute path to file
 * @returns Promise resolving to checksum metadata object
 * @throws Error if file not found or read error
 * @example
 * const metadata = await generateChecksumWithMetadata('/tmp/export.tar.gz');
 * console.log(metadata);
 * // {
 * //   checksum: 'a3f5b1c2...',
 * //   algorithm: 'sha256',
 * //   fileSizeBytes: 12582912,
 * //   generatedAt: Date
 * // }
 */
export async function generateChecksumWithMetadata(filePath: string): Promise<{
  checksum: string;
  algorithm: string;
  fileSizeBytes: number;
  generatedAt: Date;
}> {
  const checksum = await generateFileChecksum(filePath);

  // Get file size
  const stats = fs.statSync(filePath);

  return {
    checksum,
    algorithm: 'sha256',
    fileSizeBytes: stats.size,
    generatedAt: new Date(),
  };
}
