/**
 * Export Jobs Seed Data
 * Creates test export job records for development and testing
 * Epic 33.1: Export Core Infrastructure
 * Story: 33.1.2 Export Jobs Database Schema
 */

import {
  databaseService,
  DatabaseService,
} from '../../src/services/database.service';
import { ExportJobStatus } from '@nodeangularfullstack/shared';

/**
 * Export job seed entry.
 */
export interface ExportJobSeedEntry {
  jobId: string;
  toolId: string;
  userId: string;
  status: ExportJobStatus;
  stepsCompleted: number;
  stepsTotal: number;
  currentStep: string;
  progressPercentage: number;
  packagePath?: string;
  packageSizeBytes?: number;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Database seeding utility for export jobs table.
 * Creates test data with various job statuses for development.
 */
export class ExportJobsSeed {
  /**
   * Ensures database connection is initialized.
   */
  private static async ensureDatabaseConnection(): Promise<void> {
    const status = databaseService.getStatus();
    if (!status.isConnected) {
      const dbConfig = DatabaseService.parseConnectionUrl(
        this.getDatabaseUrl()
      );
      await databaseService.initialize(dbConfig);
    }
  }

  /**
   * Builds database connection URL from environment variables.
   */
  private static getDatabaseUrl(): string {
    if (
      process.env.DATABASE_URL &&
      process.env.DATABASE_URL.trim().length > 0
    ) {
      return process.env.DATABASE_URL;
    }

    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '5432';
    const name = process.env.DB_NAME || 'nodeangularfullstack';
    const user = process.env.DB_USER || 'dbuser';
    const password = process.env.DB_PASSWORD || 'dbpassword';

    return `postgresql://${user}:${password}@${host}:${port}/${name}`;
  }

  /**
   * Gets the first tool ID from tool_registry table.
   * @returns Tool UUID or null if no tools exist
   */
  private static async getFirstToolId(): Promise<string | null> {
    try {
      const result = await databaseService.query(
        'SELECT id FROM tool_registry LIMIT 1'
      );

      if (result.rows.length === 0) {
        console.warn('⚠️  No tools found in tool_registry table');
        return null;
      }

      return result.rows[0].id;
    } catch (error) {
      console.error('❌ Failed to get tool ID:', error);
      return null;
    }
  }

  /**
   * Gets the admin user ID from users table.
   * @returns User UUID or null if admin not found
   */
  private static async getAdminUserId(): Promise<string | null> {
    try {
      const result = await databaseService.query(
        "SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1"
      );

      if (result.rows.length === 0) {
        console.warn('⚠️  Admin user not found in users table');
        return null;
      }

      return result.rows[0].id;
    } catch (error) {
      console.error('❌ Failed to get admin user ID:', error);
      return null;
    }
  }

  /**
   * Initial export job entries for seeding.
   * Covers various job statuses for comprehensive testing.
   */
  private static readonly SEED_JOBS: Omit<
    ExportJobSeedEntry,
    'toolId' | 'userId'
  >[] = [
    {
      jobId: '11111111-1111-1111-1111-111111111111',
      status: ExportJobStatus.COMPLETED,
      stepsCompleted: 8,
      stepsTotal: 8,
      currentStep: 'Export complete',
      progressPercentage: 100,
      packagePath: '/tmp/exports/forms-tool-export.tar.gz',
      packageSizeBytes: 2457600, // 2.4 MB
      startedAt: new Date('2025-10-25T10:00:00Z'),
      completedAt: new Date('2025-10-25T10:05:30Z'),
    },
    {
      jobId: '22222222-2222-2222-2222-222222222222',
      status: ExportJobStatus.IN_PROGRESS,
      stepsCompleted: 4,
      stepsTotal: 8,
      currentStep: 'Generating boilerplate code...',
      progressPercentage: 50,
      startedAt: new Date('2025-10-26T09:00:00Z'),
    },
    {
      jobId: '33333333-3333-3333-3333-333333333333',
      status: ExportJobStatus.FAILED,
      stepsCompleted: 2,
      stepsTotal: 8,
      currentStep: 'Copying source files',
      progressPercentage: 25,
      errorMessage:
        'Failed to copy source files: ENOENT: no such file or directory',
      startedAt: new Date('2025-10-25T14:00:00Z'),
      completedAt: new Date('2025-10-25T14:02:15Z'),
    },
    {
      jobId: '44444444-4444-4444-4444-444444444444',
      status: ExportJobStatus.PENDING,
      stepsCompleted: 0,
      stepsTotal: 8,
      currentStep: 'Waiting in queue...',
      progressPercentage: 0,
    },
    {
      jobId: '55555555-5555-5555-5555-555555555555',
      status: ExportJobStatus.CANCELLED,
      stepsCompleted: 6,
      stepsTotal: 8,
      currentStep: 'Creating package archive',
      progressPercentage: 75,
      startedAt: new Date('2025-10-26T08:00:00Z'),
      completedAt: new Date('2025-10-26T08:03:45Z'),
    },
  ];

  /**
   * Creates a single export job entry in the database.
   * @param job - Export job data to insert
   * @returns Promise that resolves when job is created
   */
  public static async createExportJob(job: ExportJobSeedEntry): Promise<void> {
    try {
      const query = `
        INSERT INTO export_jobs (
          job_id, tool_id, user_id, status,
          steps_completed, steps_total, current_step, progress_percentage,
          package_path, package_size_bytes, error_message,
          started_at, completed_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (job_id) DO NOTHING
      `;

      const values = [
        job.jobId,
        job.toolId,
        job.userId,
        job.status,
        job.stepsCompleted,
        job.stepsTotal,
        job.currentStep,
        job.progressPercentage,
        job.packagePath || null,
        job.packageSizeBytes || null,
        job.errorMessage || null,
        job.startedAt || null,
        job.completedAt || null,
      ];

      await databaseService.query(query, values);
      console.log(`✅ Created export job: ${job.status} (${job.jobId})`);
    } catch (error) {
      console.error(`❌ Failed to create export job ${job.jobId}:`, error);
      throw error;
    }
  }

  /**
   * Seeds all export job entries into the database.
   * Idempotent - safe to run multiple times.
   * @returns Promise that resolves when seeding completes
   */
  public static async seedExportJobs(): Promise<void> {
    try {
      console.log('🌱 Starting export jobs seeding...');

      // Ensure database connection
      await this.ensureDatabaseConnection();

      // Check if export_jobs table exists
      const tableCheck = await databaseService.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'export_jobs'
        ) as exists`
      );

      if (!tableCheck.rows[0].exists) {
        console.error(
          '❌ export_jobs table does not exist. Run migrations first.'
        );
        return;
      }

      // Get tool and user IDs
      const toolId = await this.getFirstToolId();
      const userId = await this.getAdminUserId();

      if (!toolId || !userId) {
        console.error('❌ Cannot seed export jobs: missing tool or user data');
        console.log(
          '💡 Ensure tool_registry and users tables are seeded first'
        );
        return;
      }

      console.log(`📋 Using tool_id: ${toolId}`);
      console.log(`👤 Using user_id: ${userId}`);

      // Create export job entries
      for (const jobTemplate of this.SEED_JOBS) {
        const job: ExportJobSeedEntry = {
          ...jobTemplate,
          toolId,
          userId,
        };

        await this.createExportJob(job);
      }

      console.log('✅ Export jobs seeding completed');
      console.log(`📊 Created ${this.SEED_JOBS.length} test export jobs`);
    } catch (error) {
      console.error('❌ Export jobs seeding failed:', error);
      throw error;
    }
  }

  /**
   * Clears all seed export job data from the database.
   * Only removes jobs with UUIDs matching seed data pattern.
   * @returns Promise that resolves when cleanup completes
   */
  public static async clearSeedData(): Promise<void> {
    try {
      console.log('🧹 Clearing export jobs seed data...');

      await this.ensureDatabaseConnection();

      const jobIds = this.SEED_JOBS.map((job) => job.jobId);

      const query = `
        DELETE FROM export_jobs
        WHERE job_id = ANY($1)
      `;

      const result = await databaseService.query(query, [jobIds]);

      console.log(`✅ Cleared ${result.rowCount || 0} seed export jobs`);
    } catch (error) {
      console.error('❌ Failed to clear seed data:', error);
      throw error;
    }
  }
}

/**
 * Execute seeding when run directly.
 */
if (require.main === module) {
  ExportJobsSeed.seedExportJobs()
    .then(() => {
      console.log('🎉 Seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}
