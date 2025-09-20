import { readFileSync } from 'fs';
import { join } from 'path';
import { databaseService } from '../services/database.service';

/**
 * Database migration utility for running SQL migration files.
 * Provides methods to execute and track database schema changes.
 */
export class MigrationUtils {
  /**
   * Executes a SQL migration file against the database.
   * @param migrationFile - Name of the migration file in database/migrations/
   * @returns Promise that resolves when migration completes
   * @throws Error if migration fails
   * @example
   * await MigrationUtils.runMigration('001_create_auth_tables.sql');
   */
  public static async runMigration(migrationFile: string): Promise<void> {
    try {
      const migrationPath = join(process.cwd(), 'database', 'migrations', migrationFile);
      console.log(`🔧 Running migration: ${migrationFile}`);
      console.log(`📁 Migration path: ${migrationPath}`);

      const migrationSql = readFileSync(migrationPath, 'utf8');

      // Split SQL by statements (handle multi-statement files)
      const statements = migrationSql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      for (const statement of statements) {
        if (statement.trim()) {
          await databaseService.query(statement);
        }
      }

      console.log(`✅ Migration ${migrationFile} completed successfully`);
    } catch (error) {
      console.error(`❌ Migration ${migrationFile} failed:`, error);
      throw new Error(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Executes all migration files in the migrations directory.
   * Runs migrations in alphabetical order based on filename.
   * @returns Promise that resolves when all migrations complete
   * @throws Error if any migration fails
   */
  public static async runAllMigrations(): Promise<void> {
    try {
      console.log('🚀 Starting database migration process...');

      // For now, we'll manually specify the migration order
      // In a production app, you'd want to read the directory and sort files
      const migrations = [
        '001_create_auth_tables.sql'
      ];

      for (const migration of migrations) {
        await this.runMigration(migration);
      }

      console.log('🎉 All migrations completed successfully');
    } catch (error) {
      console.error('❌ Migration process failed:', error);
      throw error;
    }
  }

  /**
   * Creates database tables if they don't exist by running migrations.
   * This is safe to run multiple times (idempotent).
   * @returns Promise that resolves when setup is complete
   */
  public static async setupDatabase(): Promise<void> {
    try {
      console.log('🔄 Setting up database schema...');
      await this.runAllMigrations();
      console.log('✅ Database schema setup complete');
    } catch (error) {
      console.error('❌ Database setup failed:', error);
      throw error;
    }
  }

  /**
   * Checks if required database tables exist.
   * @returns Promise that resolves to true if tables exist, false otherwise
   */
  public static async checkTablesExist(): Promise<boolean> {
    try {
      const requiredTables = ['users', 'sessions', 'password_resets', 'tenants'];

      for (const table of requiredTables) {
        const result = await databaseService.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = $1
          ) as exists`,
          [table]
        );

        if (!result.rows[0].exists) {
          console.log(`❌ Table '${table}' does not exist`);
          return false;
        }
      }

      console.log('✅ All required tables exist');
      return true;
    } catch (error) {
      console.error('❌ Error checking table existence:', error);
      return false;
    }
  }

  /**
   * Verifies database schema by checking table structure.
   * @returns Promise that resolves to validation results
   */
  public static async validateSchema(): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // Check if tables exist
      const tablesExist = await this.checkTablesExist();
      if (!tablesExist) {
        issues.push('Required tables are missing');
      }

      // Check for UUID extension
      const uuidExtResult = await databaseService.query(
        `SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') as exists`
      );

      if (!uuidExtResult.rows[0].exists) {
        issues.push('UUID extension is not enabled');
      }

      // Check for update function
      const functionResult = await databaseService.query(
        `SELECT EXISTS(
          SELECT 1 FROM pg_proc
          WHERE proname = 'update_updated_at_column'
        ) as exists`
      );

      if (!functionResult.rows[0].exists) {
        issues.push('update_updated_at_column function is missing');
      }

      return {
        isValid: issues.length === 0,
        issues
      };
    } catch (error) {
      issues.push(`Schema validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        isValid: false,
        issues
      };
    }
  }
}