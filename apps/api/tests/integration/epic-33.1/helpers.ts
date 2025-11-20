/**
 * Epic 33.1 Test Helpers
 * Utility functions for export infrastructure integration tests.
 */

import { Pool } from 'pg';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Poll export job status until completion or timeout.
 * @param pool - Database connection pool
 * @param jobId - Export job ID to poll
 * @param options - Polling configuration
 * @returns Final job status
 */
export const pollExportJobStatus = async (
  pool: Pool,
  jobId: string,
  options: {
    maxAttempts?: number;
    intervalMs?: number;
    expectedStatus?: string[];
  } = {}
): Promise<{
  status: string;
  stepsCompleted: number;
  stepsTotal: number;
  packagePath: string | null;
  errorMessage: string | null;
}> => {
  const maxAttempts = options.maxAttempts || 120; // 2 minutes max
  const intervalMs = options.intervalMs || 1000; // 1 second interval
  const expectedStatus = options.expectedStatus || [
    'completed',
    'failed',
    'cancelled',
  ];

  let attempts = 0;
  let jobStatus: any = null;

  while (attempts < maxAttempts) {
    const result = await pool.query(
      `
      SELECT status, steps_completed, steps_total, package_path, error_message
      FROM export_jobs
      WHERE job_id = $1
    `,
      [jobId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Export job not found: ${jobId}`);
    }

    jobStatus = result.rows[0];

    if (expectedStatus.includes(jobStatus.status)) {
      return {
        status: jobStatus.status,
        stepsCompleted: jobStatus.steps_completed,
        stepsTotal: jobStatus.steps_total,
        packagePath: jobStatus.package_path,
        errorMessage: jobStatus.error_message,
      };
    }

    attempts++;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    `Export job polling timeout after ${maxAttempts} attempts. Last status: ${jobStatus?.status}`
  );
};

/**
 * Wait for export job to reach a specific status.
 * @param pool - Database connection pool
 * @param jobId - Export job ID
 * @param targetStatus - Target status to wait for
 * @param timeoutMs - Timeout in milliseconds
 */
export const waitForJobStatus = async (
  pool: Pool,
  jobId: string,
  targetStatus: string,
  timeoutMs: number = 10000
): Promise<void> => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const result = await pool.query(
      'SELECT status FROM export_jobs WHERE job_id = $1',
      [jobId]
    );

    if (result.rows.length > 0 && result.rows[0].status === targetStatus) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(
    `Timeout waiting for job ${jobId} to reach status ${targetStatus}`
  );
};

/**
 * Verify export package file exists and is valid.
 * @param packagePath - Path to the .tar.gz package
 * @returns Package validation result
 */
export const verifyExportPackage = async (
  packagePath: string
): Promise<{
  exists: boolean;
  isValidTarGz: boolean;
  sizeBytes: number;
  contents?: string[];
}> => {
  try {
    // Check if file exists
    await fs.access(packagePath);

    // Get file size
    const stats = await fs.stat(packagePath);
    const sizeBytes = stats.size;

    // Verify it's a .tar.gz file
    const isValidTarGz = packagePath.endsWith('.tar.gz');

    // List contents of the archive
    let contents: string[] = [];
    if (isValidTarGz) {
      try {
        const { stdout } = await execAsync(`tar -tzf "${packagePath}"`);
        contents = stdout.split('\n').filter((line) => line.trim() !== '');
      } catch (error) {
        console.error('Failed to list archive contents:', error);
      }
    }

    return {
      exists: true,
      isValidTarGz,
      sizeBytes,
      contents,
    };
  } catch (error) {
    return {
      exists: false,
      isValidTarGz: false,
      sizeBytes: 0,
    };
  }
};

/**
 * Extract export package to a temporary directory.
 * @param packagePath - Path to the .tar.gz package
 * @param extractDir - Directory to extract to
 */
export const extractExportPackage = async (
  packagePath: string,
  extractDir: string
): Promise<string[]> => {
  await fs.mkdir(extractDir, { recursive: true });

  try {
    await execAsync(`tar -xzf "${packagePath}" -C "${extractDir}"`);

    // List extracted files
    const files = await fs.readdir(extractDir);
    return files;
  } catch (error) {
    throw new Error(`Failed to extract package: ${error}`);
  }
};

/**
 * Verify required boilerplate files exist in export package.
 * @param files - List of files in the export package
 * @param toolType - Type of tool (forms, workflows, themes)
 */
export const verifyBoilerplateFiles = (
  files: string[],
  toolType: string
): { missing: string[]; present: string[] } => {
  const requiredFiles: { [key: string]: string[] } = {
    forms: [
      'package.json',
      'Dockerfile',
      'docker-compose.yml',
      'README.md',
      '.dockerignore',
    ],
    workflows: [
      'package.json',
      'Dockerfile',
      'docker-compose.yml',
      'README.md',
      '.dockerignore',
    ],
    themes: [
      'package.json',
      'Dockerfile',
      'docker-compose.yml',
      'README.md',
      '.dockerignore',
    ],
  };

  const required = requiredFiles[toolType] || requiredFiles.forms;
  const present: string[] = [];
  const missing: string[] = [];

  for (const file of required) {
    if (files.includes(file)) {
      present.push(file);
    } else {
      missing.push(file);
    }
  }

  return { missing, present };
};

/**
 * Check if PostgreSQL query uses an index.
 * @param pool - Database connection pool
 * @param query - SQL query to analyze
 * @param params - Query parameters
 * @returns Whether the query uses an index
 */
export const queryUsesIndex = async (
  pool: Pool,
  query: string,
  params: any[] = []
): Promise<boolean> => {
  const explainQuery = `EXPLAIN (ANALYZE, FORMAT JSON) ${query}`;
  const result = await pool.query(explainQuery, params);

  const queryPlan = JSON.stringify(result.rows[0]['QUERY PLAN']);

  // Check if query plan includes "Index Scan" or "Index Only Scan"
  return (
    queryPlan.includes('Index Scan') || queryPlan.includes('Index Only Scan')
  );
};

/**
 * Get export job by ID.
 * @param pool - Database connection pool
 * @param jobId - Export job ID
 */
export const getExportJobById = async (
  pool: Pool,
  jobId: string
): Promise<any | null> => {
  const result = await pool.query(
    `
    SELECT * FROM export_jobs WHERE job_id = $1
  `,
    [jobId]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Count export jobs by status.
 * @param pool - Database connection pool
 * @param status - Job status to count
 */
export const countExportJobsByStatus = async (
  pool: Pool,
  status: string
): Promise<number> => {
  const result = await pool.query(
    `
    SELECT COUNT(*) as count FROM export_jobs WHERE status = $1
  `,
    [status]
  );

  return parseInt(result.rows[0].count, 10);
};

/**
 * Clean up extracted export package directory.
 * @param extractDir - Directory to clean
 */
export const cleanupExtractedPackage = async (
  extractDir: string
): Promise<void> => {
  try {
    await fs.rm(extractDir, { recursive: true, force: true });
  } catch (cleanupError) {
    console.error(`Failed to cleanup extracted package:`, cleanupError);
  }
};

/**
 * Mock external command execution (for testing without real Docker/npm).
 */
export class MockCommandExecutor {
  private mockResponses: Map<
    string,
    { stdout: string; stderr: string; exitCode: number }
  >;

  constructor() {
    this.mockResponses = new Map();
  }

  /**
   * Register a mock response for a command.
   */
  mockCommand(
    command: string,
    response: { stdout?: string; stderr?: string; exitCode?: number }
  ): void {
    this.mockResponses.set(command, {
      stdout: response.stdout || '',
      stderr: response.stderr || '',
      exitCode: response.exitCode || 0,
    });
  }

  /**
   * Execute a command with mocked response.
   */
  async execute(command: string): Promise<{ stdout: string; stderr: string }> {
    const response = this.mockResponses.get(command);

    if (!response) {
      throw new Error(`No mock response registered for command: ${command}`);
    }

    if (response.exitCode !== 0) {
      throw new Error(
        `Command failed with exit code ${response.exitCode}: ${response.stderr}`
      );
    }

    return {
      stdout: response.stdout,
      stderr: response.stderr,
    };
  }

  /**
   * Clear all mock responses.
   */
  clear(): void {
    this.mockResponses.clear();
  }
}

/**
 * Measure execution time of an async function.
 * @param fn - Function to measure
 * @returns Execution time in milliseconds
 */
export const measureExecutionTime = async <T>(
  fn: () => Promise<T>
): Promise<{ result: T; durationMs: number }> => {
  const startTime = Date.now();
  const result = await fn();
  const durationMs = Date.now() - startTime;

  return { result, durationMs };
};
