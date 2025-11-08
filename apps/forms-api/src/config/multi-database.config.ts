/**
 * Multi-database connection pool configuration.
 * Provides separate connection pools for auth, dashboard, and forms databases.
 * Forms API has:
 * - Read-only access to auth database (for user/tenant validation)
 * - Read-write access to forms database (owns forms, themes, submissions)
 * - NO access to dashboard database (service isolation)
 *
 * @module multi-database.config
 *
 * @example
 * import { authPool, formsPool } from './config/multi-database.config';
 *
 * // Query auth database (read-only)
 * const user = await authPool.query('SELECT * FROM users WHERE id = $1', [userId]);
 *
 * // Query forms database (read-write)
 * const form = await formsPool.query('SELECT * FROM forms WHERE id = $1', [formId]);
 */
import { Pool, PoolConfig } from 'pg';
import { config } from 'dotenv';

// Load environment variables
config();

/**
 * Auth database connection pool configuration (read-only).
 * Used for user and tenant validation across all services.
 */
const authPoolConfig: PoolConfig = {
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432'),
  user: process.env.DB_USER ?? 'dbuser',
  password: process.env.DB_PASSWORD ?? 'dbpassword',
  database: process.env.AUTH_DB_NAME ?? 'nodeangularfullstack_auth',
  max: 10, // Smaller pool for read-only access
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

/**
 * Forms database connection pool configuration (read-write).
 * Used for forms, form schemas, form submissions, themes, and short links.
 */
const formsPoolConfig: PoolConfig = {
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432'),
  user: process.env.DB_USER ?? 'dbuser',
  password: process.env.DB_PASSWORD ?? 'dbpassword',
  database: process.env.FORMS_DB_NAME ?? 'nodeangularfullstack_forms',
  max: 20, // Full pool for read-write operations
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

/**
 * Auth database connection pool singleton instance (read-only).
 * Use this for validating users and tenants.
 *
 * @example
 * import { authPool } from './config/multi-database.config';
 *
 * const result = await authPool.query('SELECT * FROM users WHERE id = $1', [userId]);
 */
export const authPool = new Pool(authPoolConfig);

/**
 * Forms database connection pool singleton instance (read-write).
 * Use this for all forms-related operations.
 *
 * @example
 * import { formsPool } from './config/multi-database.config';
 *
 * const result = await formsPool.query('SELECT * FROM forms WHERE user_id = $1', [userId]);
 */
export const formsPool = new Pool(formsPoolConfig);

/**
 * Legacy pool export for backward compatibility.
 * Points to forms pool during migration.
 * @deprecated Use formsPool or authPool explicitly
 */
export const pool = formsPool;

/**
 * Checks connectivity to all database pools.
 * @returns Promise resolving to object with connectivity status for each pool
 *
 * @example
 * const health = await checkAllDatabaseConnections();
 * console.log(health); // { auth: true, forms: true }
 */
export async function checkAllDatabaseConnections(): Promise<{
  auth: boolean;
  forms: boolean;
}> {
  const results = {
    auth: false,
    forms: false,
  };

  try {
    await authPool.query('SELECT 1');
    results.auth = true;
  } catch (error) {
    console.error('Auth database connection failed:', error);
  }

  try {
    await formsPool.query('SELECT 1');
    results.forms = true;
  } catch (error) {
    console.error('Forms database connection failed:', error);
  }

  return results;
}

/**
 * Gracefully closes all database connections.
 * Should be called during application shutdown.
 *
 * @example
 * process.on('SIGTERM', async () => {
 *   await closeAllDatabaseConnections();
 *   process.exit(0);
 * });
 */
export async function closeAllDatabaseConnections(): Promise<void> {
  await Promise.all([
    authPool.end().catch((err) => console.error('Error closing auth pool:', err)),
    formsPool.end().catch((err) => console.error('Error closing forms pool:', err)),
  ]);
}

/**
 * Error event handlers for unexpected database errors.
 */
authPool.on('error', (err) => {
  console.error('Unexpected auth database error:', err);
});

formsPool.on('error', (err) => {
  console.error('Unexpected forms database error:', err);
});

/**
 * Database type enum for repository pool selection.
 */
export enum DatabaseType {
  AUTH = 'auth',
  FORMS = 'forms',
}

/**
 * Gets the appropriate connection pool for the specified database type.
 * @param type - The database type
 * @returns The corresponding connection pool
 * @throws Error if invalid database type or if Forms API tries to access dashboard database
 *
 * @example
 * const pool = getPoolForDatabase(DatabaseType.AUTH);
 * const user = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
 */
export function getPoolForDatabase(type: DatabaseType): Pool {
  switch (type) {
    case DatabaseType.AUTH:
      return authPool;
    case DatabaseType.FORMS:
      return formsPool;
    default:
      throw new Error(`Invalid database type: ${type}`);
  }
}
