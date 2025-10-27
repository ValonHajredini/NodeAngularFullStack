/**
 * Package Cleanup Scheduler
 * Schedules daily execution of package cleanup job
 * Epic 33.2: Export Package Distribution
 * Story: 33.2.1 Export Package Download (Task 9)
 *
 * In production, this should be replaced with:
 * - System cron job (recommended)
 * - node-cron library
 * - Cloud scheduler (AWS EventBridge, GCP Cloud Scheduler)
 *
 * Current implementation: Manual trigger via endpoint + optional interval scheduling
 */

import { PackageCleanupJob } from '../jobs/package-cleanup.job';
import { Logger } from '../utils/logger.utils';

/**
 * Scheduler for package cleanup job.
 * Provides manual execution and optional interval-based scheduling.
 */
export class PackageCleanupScheduler {
  private readonly logger: Logger;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  /**
   * Create package cleanup scheduler.
   * @param cleanupJob - Package cleanup job instance
   */
  constructor(private readonly cleanupJob: PackageCleanupJob) {
    this.logger = new Logger('PackageCleanupScheduler');
  }

  /**
   * Start interval-based scheduling (runs every 24 hours).
   * For development and testing. In production, use system cron instead.
   *
   * @param intervalHours - Interval in hours between cleanup runs (default: 24)
   *
   * @example
   * scheduler.start(24); // Runs every 24 hours
   */
  start(intervalHours: number = 24): void {
    if (this.intervalId) {
      this.logger.warn('Scheduler already running, skipping start');
      return;
    }

    const intervalMs = intervalHours * 60 * 60 * 1000; // Convert hours to milliseconds

    this.logger.info(
      `Starting package cleanup scheduler (interval: ${intervalHours} hours)`
    );

    // Run immediately on startup
    this.executeCleanup().catch((error) => {
      this.logger.error('Initial cleanup failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    });

    // Schedule recurring execution
    this.intervalId = setInterval(async () => {
      await this.executeCleanup();
    }, intervalMs);

    this.logger.info('Package cleanup scheduler started successfully');
  }

  /**
   * Stop interval-based scheduling.
   *
   * @example
   * scheduler.stop();
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.logger.info('Package cleanup scheduler stopped');
    }
  }

  /**
   * Execute cleanup job manually.
   * Can be called via API endpoint or admin interface.
   *
   * @returns Cleanup statistics
   * @throws Error if cleanup already running
   *
   * @example
   * const stats = await scheduler.executeManually();
   * // { deletedCount: 5, freedSpaceBytes: 125829120 }
   */
  async executeManually(): Promise<{
    deletedCount: number;
    freedSpaceBytes: number;
  }> {
    if (this.isRunning) {
      throw new Error('Package cleanup is already running');
    }

    this.logger.info('Manual cleanup execution requested');
    return await this.executeCleanup();
  }

  /**
   * Execute cleanup job (internal method).
   * Prevents concurrent executions and handles errors.
   */
  private async executeCleanup(): Promise<{
    deletedCount: number;
    freedSpaceBytes: number;
  }> {
    if (this.isRunning) {
      this.logger.warn('Cleanup already running, skipping this execution');
      return { deletedCount: 0, freedSpaceBytes: 0 };
    }

    this.isRunning = true;

    try {
      this.logger.info('Executing package cleanup job...');
      const startTime = Date.now();

      const stats = await this.cleanupJob.execute();

      const duration = Date.now() - startTime;
      this.logger.info(`Cleanup completed in ${duration}ms`, stats);

      return stats;
    } catch (error) {
      this.logger.error('Cleanup execution failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Check if cleanup job is currently running.
   * @returns True if running, false otherwise
   */
  isCleanupRunning(): boolean {
    return this.isRunning;
  }
}

/**
 * Create and return singleton scheduler instance.
 * Used for scheduling cleanup operations.
 */
let schedulerInstance: PackageCleanupScheduler | null = null;

export function getPackageCleanupScheduler(): PackageCleanupScheduler {
  if (!schedulerInstance) {
    const { createPackageCleanupJob } = require('../jobs/package-cleanup.job');
    const cleanupJob = createPackageCleanupJob();
    schedulerInstance = new PackageCleanupScheduler(cleanupJob);
  }
  return schedulerInstance;
}
