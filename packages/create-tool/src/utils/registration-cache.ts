/**
 * Registration Cache
 *
 * Local caching system for tool registration status.
 * Stores registration results in user's home directory for debugging and tracking.
 *
 * Features:
 * - Persistent cache in ~/.create-tool/registrations.json
 * - Tracks success, failure, and skipped registrations
 * - Includes timestamps and error details
 * - Used for debugging and --list command
 *
 * @module utils/registration-cache
 * @example
 * ```typescript
 * import { saveRegistration, getRegistration } from './utils/registration-cache';
 *
 * // Save successful registration
 * await saveRegistration('my-tool', 'success', { toolId: 'my-tool', version: '1.0.0' });
 *
 * // Retrieve registration
 * const record = await getRegistration('my-tool');
 * console.log(record?.status); // 'success'
 * ```
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * Registration record stored in cache.
 * Contains complete history of a tool's registration attempt.
 */
export interface RegistrationRecord {
  /** Tool identifier (kebab-case) */
  toolId: string;
  /** Registration status */
  status: 'success' | 'failed' | 'skipped';
  /** ISO 8601 timestamp of registration attempt */
  timestamp: string;
  /** Additional details from API response (for success) */
  details?: any;
  /** Error message (for failures) */
  error?: string;
}

/**
 * Get cache file path in user's home directory.
 * Creates cache at ~/.create-tool/registrations.json
 *
 * @returns Absolute path to cache file
 *
 * @example
 * ```typescript
 * const cachePath = getCachePath();
 * // /Users/username/.create-tool/registrations.json (macOS)
 * // /home/username/.create-tool/registrations.json (Linux)
 * // C:\Users\username\.create-tool\registrations.json (Windows)
 * ```
 */
function getCachePath(): string {
  const homeDir = os.homedir();
  const cacheDir = path.join(homeDir, '.create-tool');
  return path.join(cacheDir, 'registrations.json');
}

/**
 * Save registration result to local cache.
 * Creates cache directory if it doesn't exist.
 * Appends new record to existing cache without overwriting.
 *
 * @param toolId - Unique tool identifier
 * @param status - Registration outcome (success | failed | skipped)
 * @param details - Optional API response data (for success)
 * @param error - Optional error message (for failures)
 * @returns Promise that resolves when cache is written
 *
 * @throws {Error} When file system operations fail
 *
 * @example
 * ```typescript
 * // Save successful registration
 * await saveRegistration('inventory-tracker', 'success', {
 *   toolId: 'inventory-tracker',
 *   version: '1.0.0',
 *   createdAt: '2025-10-24T12:00:00Z'
 * });
 *
 * // Save failed registration
 * await saveRegistration('bad-tool', 'failed', null, 'Validation failed: toolId must be kebab-case');
 *
 * // Save skipped registration
 * await saveRegistration('offline-tool', 'skipped');
 * ```
 */
export async function saveRegistration(
  toolId: string,
  status: 'success' | 'failed' | 'skipped',
  details?: any,
  error?: string
): Promise<void> {
  const cachePath = getCachePath();
  const cacheDir = path.dirname(cachePath);

  // Ensure cache directory exists
  await fs.mkdir(cacheDir, { recursive: true });

  // Read existing cache
  let cache: Record<string, RegistrationRecord> = {};
  try {
    const content = await fs.readFile(cachePath, 'utf-8');
    cache = JSON.parse(content);
  } catch {
    // Cache doesn't exist yet, use empty object
  }

  // Add new entry
  cache[toolId] = {
    toolId,
    status,
    timestamp: new Date().toISOString(),
    details,
    error,
  };

  // Write cache
  await fs.writeFile(cachePath, JSON.stringify(cache, null, 2), 'utf-8');
}

/**
 * Get registration record from cache.
 * Returns null if tool has never been registered.
 *
 * @param toolId - Unique tool identifier
 * @returns Promise containing registration record or null
 *
 * @example
 * ```typescript
 * const record = await getRegistration('inventory-tracker');
 * if (record) {
 *   console.log(`Tool was ${record.status} at ${record.timestamp}`);
 *   if (record.error) {
 *     console.error(`Error: ${record.error}`);
 *   }
 * } else {
 *   console.log('Tool has never been registered');
 * }
 * ```
 */
export async function getRegistration(toolId: string): Promise<RegistrationRecord | null> {
  try {
    const cachePath = getCachePath();
    const content = await fs.readFile(cachePath, 'utf-8');
    const cache = JSON.parse(content);
    return cache[toolId] || null;
  } catch {
    return null;
  }
}

/**
 * Get all registration records from cache.
 * Useful for --list command to show registration history.
 *
 * @returns Promise containing array of all registration records
 *
 * @example
 * ```typescript
 * const records = await getAllRegistrations();
 * records.forEach(record => {
 *   console.log(`${record.toolId}: ${record.status} (${record.timestamp})`);
 * });
 * ```
 */
export async function getAllRegistrations(): Promise<RegistrationRecord[]> {
  try {
    const cachePath = getCachePath();
    const content = await fs.readFile(cachePath, 'utf-8');
    const cache = JSON.parse(content);
    return Object.values(cache);
  } catch {
    return [];
  }
}

/**
 * Clear registration cache.
 * Removes all cached registration records.
 * Useful for testing or cleanup.
 *
 * @returns Promise that resolves when cache is cleared
 *
 * @example
 * ```typescript
 * await clearCache();
 * console.log('Registration cache cleared');
 * ```
 */
export async function clearCache(): Promise<void> {
  try {
    const cachePath = getCachePath();
    await fs.unlink(cachePath);
  } catch {
    // Cache doesn't exist, nothing to clear
  }
}
