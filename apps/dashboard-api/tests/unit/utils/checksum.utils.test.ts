/**
 * Unit Tests: Checksum Utilities
 * Tests for SHA-256 checksum generation and verification
 * Epic 33.2: Export Package Distribution
 * Story: 33.2.2 Package Verification & Security
 */

import {
  generateFileChecksum,
  verifyFileChecksum,
  isValidChecksumFormat,
  generateChecksumWithMetadata,
} from '../../../src/utils/checksum.utils';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Checksum Utils', () => {
  const testFilePath = path.join('/tmp', 'test-checksum-file.txt');
  const testContent = 'Hello, World!';

  beforeAll(async () => {
    // Create test file with known content
    await fs.writeFile(testFilePath, testContent, 'utf-8');
  });

  afterAll(async () => {
    // Clean up test file
    await fs.unlink(testFilePath).catch(() => {});
  });

  describe('generateFileChecksum', () => {
    it('should generate correct SHA-256 checksum for known content', async () => {
      const checksum = await generateFileChecksum(testFilePath);

      // Known SHA-256 hash of "Hello, World!"
      const expectedChecksum =
        'dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f';

      expect(checksum).toBe(expectedChecksum);
    });

    it('should return lowercase hexadecimal string', async () => {
      const checksum = await generateFileChecksum(testFilePath);

      // Check format: 64 lowercase hexadecimal characters
      expect(checksum).toMatch(/^[0-9a-f]{64}$/);
      expect(checksum).toBe(checksum.toLowerCase());
    });

    it('should return exactly 64 characters (SHA-256 length)', async () => {
      const checksum = await generateFileChecksum(testFilePath);

      expect(checksum.length).toBe(64);
    });

    it('should throw error for non-existent file', async () => {
      await expect(
        generateFileChecksum('/tmp/nonexistent-file.txt')
      ).rejects.toThrow('Failed to generate checksum');
    });

    it('should generate same checksum for same file (deterministic)', async () => {
      const checksum1 = await generateFileChecksum(testFilePath);
      const checksum2 = await generateFileChecksum(testFilePath);

      expect(checksum1).toBe(checksum2);
    });

    it('should handle empty file', async () => {
      const emptyFilePath = path.join('/tmp', 'test-empty-file.txt');
      await fs.writeFile(emptyFilePath, '', 'utf-8');

      const checksum = await generateFileChecksum(emptyFilePath);

      // Known SHA-256 hash of empty file
      const expectedEmptyChecksum =
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

      expect(checksum).toBe(expectedEmptyChecksum);

      // Cleanup
      await fs.unlink(emptyFilePath);
    });

    it('should complete within 30 seconds for small files', async () => {
      const startTime = Date.now();
      await generateFileChecksum(testFilePath);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(30000);
    }, 35000); // Jest timeout slightly higher than checksum timeout
  });

  describe('verifyFileChecksum', () => {
    it('should return true for matching checksum', async () => {
      const expectedChecksum =
        'dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f';
      const result = await verifyFileChecksum(testFilePath, expectedChecksum);

      expect(result).toBe(true);
    });

    it('should return false for mismatching checksum', async () => {
      const wrongChecksum =
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const result = await verifyFileChecksum(testFilePath, wrongChecksum);

      expect(result).toBe(false);
    });

    it('should be case-insensitive (accept uppercase checksums)', async () => {
      const uppercaseChecksum =
        'DFFD6021BB2BD5B0AF676290809EC3A53191DD81C7F70A4B28688A362182986F';
      const result = await verifyFileChecksum(testFilePath, uppercaseChecksum);

      expect(result).toBe(true);
    });

    it('should be case-insensitive (accept mixed case checksums)', async () => {
      const mixedCaseChecksum =
        'DfFd6021Bb2Bd5B0Af676290809Ec3A53191Dd81C7F70A4B28688A362182986F';
      const result = await verifyFileChecksum(testFilePath, mixedCaseChecksum);

      expect(result).toBe(true);
    });

    it('should throw error for non-existent file', async () => {
      const validChecksum =
        'dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f';

      await expect(
        verifyFileChecksum('/tmp/nonexistent-file.txt', validChecksum)
      ).rejects.toThrow('Failed to generate checksum');
    });
  });

  describe('isValidChecksumFormat', () => {
    it('should return true for valid SHA-256 checksum', () => {
      const validChecksum =
        'dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f';

      expect(isValidChecksumFormat(validChecksum)).toBe(true);
    });

    it('should return false for uppercase checksum', () => {
      const uppercaseChecksum =
        'DFFD6021BB2BD5B0AF676290809EC3A53191DD81C7F70A4B28688A362182986F';

      expect(isValidChecksumFormat(uppercaseChecksum)).toBe(false);
    });

    it('should return false for checksum that is too short', () => {
      const shortChecksum = 'dffd6021bb2bd5b0';

      expect(isValidChecksumFormat(shortChecksum)).toBe(false);
    });

    it('should return false for checksum that is too long', () => {
      const longChecksum =
        'dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f1234';

      expect(isValidChecksumFormat(longChecksum)).toBe(false);
    });

    it('should return false for checksum with invalid characters', () => {
      const invalidChecksum =
        'dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986g'; // 'g' is invalid

      expect(isValidChecksumFormat(invalidChecksum)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidChecksumFormat('')).toBe(false);
    });

    it('should return false for non-hex characters', () => {
      const nonHexChecksum =
        'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz';

      expect(isValidChecksumFormat(nonHexChecksum)).toBe(false);
    });
  });

  describe('generateChecksumWithMetadata', () => {
    it('should return checksum with metadata', async () => {
      const metadata = await generateChecksumWithMetadata(testFilePath);

      expect(metadata).toHaveProperty('checksum');
      expect(metadata).toHaveProperty('algorithm');
      expect(metadata).toHaveProperty('fileSizeBytes');
      expect(metadata).toHaveProperty('generatedAt');
    });

    it('should return correct checksum value', async () => {
      const metadata = await generateChecksumWithMetadata(testFilePath);

      const expectedChecksum =
        'dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f';

      expect(metadata.checksum).toBe(expectedChecksum);
    });

    it('should return correct algorithm name', async () => {
      const metadata = await generateChecksumWithMetadata(testFilePath);

      expect(metadata.algorithm).toBe('sha256');
    });

    it('should return correct file size', async () => {
      const metadata = await generateChecksumWithMetadata(testFilePath);
      const stats = await fs.stat(testFilePath);

      expect(metadata.fileSizeBytes).toBe(stats.size);
    });

    it('should return recent timestamp', async () => {
      const beforeGeneration = new Date();
      const metadata = await generateChecksumWithMetadata(testFilePath);
      const afterGeneration = new Date();

      expect(metadata.generatedAt.getTime()).toBeGreaterThanOrEqual(
        beforeGeneration.getTime()
      );
      expect(metadata.generatedAt.getTime()).toBeLessThanOrEqual(
        afterGeneration.getTime()
      );
    });

    it('should throw error for non-existent file', async () => {
      await expect(
        generateChecksumWithMetadata('/tmp/nonexistent-file.txt')
      ).rejects.toThrow('Failed to generate checksum');
    });
  });

  describe('Performance', () => {
    it('should handle larger files efficiently (1MB)', async () => {
      const largeFilePath = path.join('/tmp', 'test-large-file-1mb.bin');

      // Create 1MB file with random data
      const buffer = Buffer.alloc(1024 * 1024); // 1MB
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = Math.floor(Math.random() * 256);
      }
      await fs.writeFile(largeFilePath, buffer);

      const startTime = Date.now();
      const checksum = await generateFileChecksum(largeFilePath);
      const duration = Date.now() - startTime;

      expect(checksum).toMatch(/^[0-9a-f]{64}$/);
      expect(duration).toBeLessThan(5000); // Should complete in < 5 seconds

      // Cleanup
      await fs.unlink(largeFilePath);
    }, 10000);
  });
});
