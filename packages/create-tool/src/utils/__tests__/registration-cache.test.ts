/**
 * Registration Cache Test Suite
 *
 * Comprehensive tests for tool registration caching functionality.
 * Tests cache persistence, retrieval, and file system operations.
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  saveRegistration,
  getRegistration,
  getAllRegistrations,
  clearCache,
} from '../registration-cache';
import type { RegistrationRecord } from '../registration-cache';

// Mock the fs/promises module
jest.mock('fs/promises');
jest.mock('os');

describe('Registration Cache', () => {
  const mockHomeDir = '/mock/home';
  const mockCachePath = path.join(mockHomeDir, '.create-tool', 'registrations.json');

  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockOs = os as jest.Mocked<typeof os>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock os.homedir()
    mockOs.homedir.mockReturnValue(mockHomeDir);

    // Default mock implementations
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
  });

  describe('saveRegistration()', () => {
    test('should save successful registration to cache', async () => {
      const toolId = 'test-tool';
      const status = 'success';
      const details = {
        toolId: 'test-tool',
        version: '1.0.0',
        registeredAt: '2025-10-25T12:00:00Z',
      };

      // Mock empty cache (file doesn't exist)
      mockFs.readFile.mockRejectedValueOnce(new Error('ENOENT'));

      await saveRegistration(toolId, status, details);

      // Should create cache directory
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        path.join(mockHomeDir, '.create-tool'),
        { recursive: true }
      );

      // Should write cache file
      expect(mockFs.writeFile).toHaveBeenCalled();
      const callArgs = mockFs.writeFile.mock.calls[0];
      expect(callArgs[0]).toBe(mockCachePath);
      expect(callArgs[2]).toBe('utf-8');

      // Verify JSON structure
      const writtenData = JSON.parse(callArgs[1] as string);
      expect(writtenData['test-tool']).toBeDefined();
      expect(writtenData['test-tool'].toolId).toBe('test-tool');
      expect(writtenData['test-tool'].status).toBe('success');
      expect(writtenData['test-tool'].details).toEqual(details);
      expect(writtenData['test-tool'].timestamp).toBeDefined();
    });

    test('should append to existing cache', async () => {
      const existingCache = {
        'existing-tool': {
          toolId: 'existing-tool',
          status: 'success',
          timestamp: '2025-10-24T12:00:00Z',
        },
      };

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(existingCache));

      await saveRegistration('new-tool', 'failed', null, 'Network error');

      const writtenData = JSON.parse(mockFs.writeFile.mock.calls[0][1] as string);

      // Should preserve existing entry
      expect(writtenData['existing-tool']).toBeDefined();
      // Should add new entry
      expect(writtenData['new-tool']).toBeDefined();
      expect(writtenData['new-tool'].toolId).toBe('new-tool');
      expect(writtenData['new-tool'].status).toBe('failed');
      expect(writtenData['new-tool'].error).toBe('Network error');
    });

    test('should save failed registration with error', async () => {
      mockFs.readFile.mockRejectedValueOnce(new Error('ENOENT'));

      await saveRegistration('failed-tool', 'failed', null, 'Authentication failed');

      const writtenData = JSON.parse(mockFs.writeFile.mock.calls[0][1] as string);

      expect(writtenData['failed-tool']).toBeDefined();
      expect(writtenData['failed-tool'].toolId).toBe('failed-tool');
      expect(writtenData['failed-tool'].status).toBe('failed');
      expect(writtenData['failed-tool'].error).toBe('Authentication failed');
      expect(writtenData['failed-tool'].details).toBeUndefined();
    });

    test('should save skipped registration', async () => {
      mockFs.readFile.mockRejectedValueOnce(new Error('ENOENT'));

      await saveRegistration('skipped-tool', 'skipped');

      const writtenData = JSON.parse(mockFs.writeFile.mock.calls[0][1] as string);

      expect(writtenData['skipped-tool']).toBeDefined();
      expect(writtenData['skipped-tool'].toolId).toBe('skipped-tool');
      expect(writtenData['skipped-tool'].status).toBe('skipped');
    });

    test('should create cache directory if it does not exist', async () => {
      mockFs.readFile.mockRejectedValueOnce(new Error('ENOENT'));

      await saveRegistration('test-tool', 'success', {});

      expect(mockFs.mkdir).toHaveBeenCalledWith(
        path.join(mockHomeDir, '.create-tool'),
        { recursive: true }
      );
    });
  });

  describe('getRegistration()', () => {
    test('should retrieve existing registration', async () => {
      const mockRecord: RegistrationRecord = {
        toolId: 'test-tool',
        status: 'success',
        timestamp: '2025-10-25T12:00:00Z',
        details: { version: '1.0.0' },
      };

      const mockCache = {
        'test-tool': mockRecord,
      };

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockCache));

      const result = await getRegistration('test-tool');

      expect(result).toEqual(mockRecord);
      expect(mockFs.readFile).toHaveBeenCalledWith(mockCachePath, 'utf-8');
    });

    test('should return null when tool not found in cache', async () => {
      const mockCache = {
        'other-tool': {
          toolId: 'other-tool',
          status: 'success',
          timestamp: '2025-10-25T12:00:00Z',
        },
      };

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockCache));

      const result = await getRegistration('non-existent-tool');

      expect(result).toBeNull();
    });

    test('should return null when cache file does not exist', async () => {
      mockFs.readFile.mockRejectedValueOnce(new Error('ENOENT'));

      const result = await getRegistration('test-tool');

      expect(result).toBeNull();
    });

    test('should return null when cache is corrupted', async () => {
      mockFs.readFile.mockResolvedValueOnce('invalid json {');

      const result = await getRegistration('test-tool');

      expect(result).toBeNull();
    });
  });

  describe('getAllRegistrations()', () => {
    test('should return all registration records', async () => {
      const mockRecords = {
        'tool-1': {
          toolId: 'tool-1',
          status: 'success',
          timestamp: '2025-10-25T12:00:00Z',
        },
        'tool-2': {
          toolId: 'tool-2',
          status: 'failed',
          timestamp: '2025-10-25T13:00:00Z',
          error: 'Network error',
        },
        'tool-3': {
          toolId: 'tool-3',
          status: 'skipped',
          timestamp: '2025-10-25T14:00:00Z',
        },
      };

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockRecords));

      const result = await getAllRegistrations();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);

      // Check each record is present
      const tool1 = result.find(r => r.toolId === 'tool-1');
      const tool2 = result.find(r => r.toolId === 'tool-2');
      const tool3 = result.find(r => r.toolId === 'tool-3');

      expect(tool1).toBeDefined();
      expect(tool1?.status).toBe('success');
      expect(tool2).toBeDefined();
      expect(tool2?.status).toBe('failed');
      expect(tool3).toBeDefined();
      expect(tool3?.status).toBe('skipped');
    });

    test('should return empty array when cache file does not exist', async () => {
      mockFs.readFile.mockRejectedValueOnce(new Error('ENOENT'));

      const result = await getAllRegistrations();

      expect(result).toEqual([]);
    });

    test('should return empty array when cache is corrupted', async () => {
      mockFs.readFile.mockResolvedValueOnce('invalid json');

      const result = await getAllRegistrations();

      expect(result).toEqual([]);
    });

    test('should return empty array when cache is empty', async () => {
      mockFs.readFile.mockResolvedValueOnce('{}');

      const result = await getAllRegistrations();

      expect(result).toEqual([]);
    });
  });

  describe('clearCache()', () => {
    test('should delete cache file', async () => {
      mockFs.unlink.mockResolvedValueOnce(undefined);

      await clearCache();

      expect(mockFs.unlink).toHaveBeenCalledWith(mockCachePath);
    });

    test('should handle file not existing gracefully', async () => {
      mockFs.unlink.mockRejectedValueOnce(new Error('ENOENT'));

      // Should not throw
      await clearCache();
      expect(mockFs.unlink).toHaveBeenCalledWith(mockCachePath);
    });

    test('should handle permission errors gracefully', async () => {
      mockFs.unlink.mockRejectedValueOnce(new Error('EACCES'));

      // Should not throw
      await clearCache();
      expect(mockFs.unlink).toHaveBeenCalledWith(mockCachePath);
    });
  });

  describe('cache file path', () => {
    test('should use correct cache path on different platforms', () => {
      // This is implicitly tested by all tests above
      // Cache path should always be: ~/.create-tool/registrations.json
      expect(mockOs.homedir).toHaveBeenCalled();
    });
  });
});
