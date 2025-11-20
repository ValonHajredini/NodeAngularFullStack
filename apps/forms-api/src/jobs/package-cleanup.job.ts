/**
 * Package Cleanup Background Job
 * Automatically deletes expired export packages to free disk space
 * Epic 33.2: Export Package Distribution
 * Story: 33.2.1 Export Package Download (Task 9)
 *
 * Runs daily at 3:00 AM to clean up packages past their retention period.
 * Deletes package files from filesystem and updates database records.
 */

import { ExportJobRepository } from '../repositories/export-job.repository';
import { Logger } from '../utils/logger.utils';
import { FileUtils } from '../utils/file.utils';
import * as fs from 'fs/promises';

/**
 * Package cleanup job for expired export packages.
 * Scheduled to run daily at 3 AM (low traffic time).
 */
export class PackageCleanupJob {
  private readonly logger: Logger;

  /**
   * Create package cleanup job instance.
   * @param exportJobRepo - Export job repository for database access
   */
  constructor(private readonly exportJobRepo: ExportJobRepository) {
    this.logger = new Logger('PackageCleanupJob');
  }

  /**
   * Execute package cleanup operation.
   * Finds expired packages, deletes files, and updates database records.
   *
   * @returns Cleanup statistics (deleted count, freed space)
   *
   * @example
   * const job = new PackageCleanupJob(exportJobRepo);
   * const stats = await job.execute();
   * // { deletedCount: 5, freedSpaceBytes: 125829120 }
   */
  async execute(): Promise<{
    deletedCount: number;
    freedSpaceBytes: number;
  }> {
    this.logger.info('Starting package cleanup job...');

    try {
      // Step 1: Find jobs with expired packages
      const expiredJobs = await this.exportJobRepo.findExpiredPackages();

      this.logger.info(
        `Found ${expiredJobs.length} expired packages to clean up`
      );

      if (expiredJobs.length === 0) {
        return { deletedCount: 0, freedSpaceBytes: 0 };
      }

      let deletedCount = 0;
      let freedSpaceBytes = 0;

      // Step 2: Process each expired job
      for (const job of expiredJobs) {
        if (!job.packagePath) {
          this.logger.warn(`Job ${job.jobId} has no package path, skipping`);
          continue;
        }

        try {
          // Step 3: Get file size before deletion (for metrics)
          const stats = await fs.stat(job.packagePath);
          const fileSize = stats.size;

          // Step 4: Delete package file from filesystem
          await fs.unlink(job.packagePath);

          this.logger.info(
            `Deleted expired package: jobId=${job.jobId}, path=${job.packagePath}, size=${FileUtils.formatFileSize(fileSize)}`
          );

          // Step 5: Update job record (clear package path and size)
          await this.exportJobRepo.update(job.jobId, {
            packagePath: null,
            packageSizeBytes: null,
          });

          // Step 6: Update cleanup statistics
          deletedCount++;
          freedSpaceBytes += fileSize;
        } catch (error) {
          // Log error but continue processing other packages
          this.logger.error(`Failed to delete package for job ${job.jobId}`, {
            jobId: job.jobId,
            packagePath: job.packagePath,
            error: error instanceof Error ? error.message : String(error),
          });

          // If file doesn't exist (ENOENT), still update database to null
          if (
            error instanceof Error &&
            'code' in error &&
            error.code === 'ENOENT'
          ) {
            this.logger.warn(
              `Package file not found, clearing database record: ${job.packagePath}`
            );
            await this.exportJobRepo.update(job.jobId, {
              packagePath: null,
              packageSizeBytes: null,
            });
          }
        }
      }

      // Step 7: Log cleanup summary
      this.logger.info(
        `Package cleanup completed: ${deletedCount} packages deleted, ${FileUtils.formatFileSize(freedSpaceBytes)} freed`
      );

      return { deletedCount, freedSpaceBytes };
    } catch (error) {
      this.logger.error('Package cleanup job failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw error;
    }
  }
}

/**
 * Create and return singleton instance of PackageCleanupJob.
 * Used for scheduling and manual execution.
 */
export function createPackageCleanupJob(): PackageCleanupJob {
  const exportJobRepo = new ExportJobRepository();
  return new PackageCleanupJob(exportJobRepo);
}
