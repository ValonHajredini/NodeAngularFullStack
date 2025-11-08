/**
 * Multi-database connection pool configuration.
 * Provides separate connection pools for auth, dashboard, and forms databases.
 * Dashboard API has:
 * - Read-only access to auth database (for user/tenant validation)
 * - Read-write access to dashboard database (owns tools, exports, drawings)
 * - NO access to forms database (service isolation)
 *
 * @module multi-database.config
 *
 * @example
 * import { authPool, dashboardPool } from './config/multi-database.config';
 *
 * // Query auth database (read-only)
 * const user = await authPool.query('SELECT * FROM users WHERE id = $1', [userId]);
 *
 * // Query dashboard database (read-write)
 * const tool = await dashboardPool.query('SELECT * FROM tools WHERE id = $1', [toolId]);
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
 * Dashboard database connection pool configuration (read-write).
 * Used for tools, tool configs, tool registry, export jobs, and drawing projects.
 */
const dashboardPoolConfig: PoolConfig = {
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432'),
  user: process.env.DB_USER ?? 'dbuser',
  password: process.env.DB_PASSWORD ?? 'dbpassword',
  database: process.env.DASHBOARD_DB_NAME ?? 'nodeangularfullstack_dashboard',
  max: 20, // Full pool for read-write operations
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

/**
 * Forms database connection pool configuration (TEMPORARY - ARCHITECTURAL DEBT).
 *
 * WARNING: Dashboard-api should NOT access forms database directly!
 * This pool is temporarily added to support legacy repositories that violate service boundaries.
 * These repositories (forms, form-schemas, form-submissions, short-links, themes) should be DELETED
 * and replaced with HTTP calls to forms-api.
 *
 * See TYPESCRIPT_FIXES.md for migration plan.
 */
const formsPoolConfig: PoolConfig = {
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432'),
  user: process.env.DB_USER ?? 'dbuser',
  password: process.env.DB_PASSWORD ?? 'dbpassword',
  database: process.env.FORMS_DB_NAME ?? 'nodeangularfullstack_forms',
  max: 10, // Small pool for temporary legacy access
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
 * Dashboard database connection pool singleton instance (read-write).
 * Use this for all dashboard-related operations.
 *
 * @example
 * import { dashboardPool } from './config/multi-database.config';
 *
 * const result = await dashboardPool.query('SELECT * FROM tools WHERE user_id = $1', [userId]);
 */
export const dashboardPool = new Pool(dashboardPoolConfig);

/**
 * Forms database connection pool singleton instance (TEMPORARY - ARCHITECTURAL DEBT).
 *
 * @deprecated DO NOT USE - Dashboard-api should NOT access forms database!
 * This is only for legacy repositories that should be deleted.
 * Use HTTP calls to forms-api instead.
 */
export const formsPool = new Pool(formsPoolConfig);

/**
 * Legacy pool export for backward compatibility.
 * Points to dashboard pool during migration.
 * @deprecated Use dashboardPool or authPool explicitly
 */
export const pool = dashboardPool;

/**
 * Checks connectivity to all database pools.
 * @returns Promise resolving to object with connectivity status for each pool
 *
 * @example
 * const health = await checkAllDatabaseConnections();
 * console.log(health); // { auth: true, dashboard: true, forms: true }
 */
export async function checkAllDatabaseConnections(): Promise<{
  auth: boolean;
  dashboard: boolean;
  forms: boolean;
}> {
  const results = {
    auth: false,
    dashboard: false,
    forms: false,
  };

  try {
    await authPool.query('SELECT 1');
    results.auth = true;
  } catch (error) {
    console.error('Auth database connection failed:', error);
  }

  try {
    await dashboardPool.query('SELECT 1');
    results.dashboard = true;
  } catch (error) {
    console.error('Dashboard database connection failed:', error);
  }

  try {
    await formsPool.query('SELECT 1');
    results.forms = true;
  } catch (error) {
    console.error('Forms database connection failed (legacy access):', error);
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
    dashboardPool.end().catch((err) => console.error('Error closing dashboard pool:', err)),
    formsPool.end().catch((err) => console.error('Error closing forms pool:', err)),
  ]);
}

/**
 * Error event handlers for unexpected database errors.
 */
authPool.on('error', (err) => {
  console.error('Unexpected auth database error:', err);
});

dashboardPool.on('error', (err) => {
  console.error('Unexpected dashboard database error:', err);
});

formsPool.on('error', (err) => {
  console.error('Unexpected forms database error (legacy access):', err);
});

/**
 * Database type enum for repository pool selection.
 */
export enum DatabaseType {
  AUTH = 'auth',
  DASHBOARD = 'dashboard',
  /** @deprecated ARCHITECTURAL DEBT - Dashboard-api should NOT access forms database! */
  FORMS = 'forms',
}

/**
 * Gets the appropriate connection pool for the specified database type.
 * @param type - The database type
 * @returns The corresponding connection pool
 * @throws Error if invalid database type
 *
 * @example
 * const pool = getPoolForDatabase(DatabaseType.AUTH);
 * const user = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
 */
export function getPoolForDatabase(type: DatabaseType): Pool {
  switch (type) {
    case DatabaseType.AUTH:
      return authPool;
    case DatabaseType.DASHBOARD:
      return dashboardPool;
    case DatabaseType.FORMS:
      // ARCHITECTURAL DEBT: Dashboard-api accessing forms database violates service boundaries
      console.warn('⚠️  ARCHITECTURAL VIOLATION: Dashboard-api accessing forms database directly. Use HTTP calls to forms-api instead.');
      return formsPool;
    default:
      throw new Error(`Invalid database type: ${type}`);
  }
}
