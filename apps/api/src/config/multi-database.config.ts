/**
 * Multi-Database Configuration for apps/api
 *
 * This module provides separated database connection pools for different data domains:
 * - authPool: Authentication and user management (users, tenants, sessions, tokens)
 * - dashboardPool: Dashboard and tools management (tools, configs, exports)
 *
 * Architecture:
 * ┌─────────────────────────────────────────────────────────┐
 * │                    apps/api                             │
 * ├─────────────────────────────────────────────────────────┤
 * │  authPool (R/W)      → AUTH_DB_NAME (e.g., api_prod)   │
 * │  dashboardPool (R/W) → DASHBOARD_DB_NAME (e.g., api_prod)│
 * └─────────────────────────────────────────────────────────┘
 *
 * Environment Variables:
 * - AUTH_DB_NAME: Database for authentication (default: DB_NAME)
 * - DASHBOARD_DB_NAME: Database for dashboard (default: DB_NAME)
 * - DB_NAME: Fallback database name
 * - DB_HOST, DB_PORT, DB_USER, DB_PASSWORD: Connection settings
 *
 * @module multi-database.config
 *
 * @example Auth Repository
 * import { authPool as pool } from '../config/database.config';
 * const users = await pool.query('SELECT * FROM users');
 *
 * @example Dashboard Repository
 * import { dashboardPool as pool } from '../config/database.config';
 * const tools = await pool.query('SELECT * FROM tools');
 */

import { Pool, PoolConfig } from 'pg';
import { config } from 'dotenv';

// Load environment variables
config();

/**
 * Base connection configuration shared across all pools.
 * Extracted to ensure consistency across database connections.
 */
const baseConfig: Partial<PoolConfig> = {
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432'),
  user: process.env.DB_USER ?? 'dbuser',
  password: process.env.DB_PASSWORD ?? 'dbpassword',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum connections per pool (prevents overwhelming PostgreSQL)
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 10000, // Fail fast if connection takes > 10 seconds
};

/**
 * Authentication Database Pool (Read/Write)
 *
 * Purpose: Handles all authentication and user management operations
 * Tables: users, tenants, sessions, api_tokens, password_resets, audit_logs
 *
 * This pool provides read/write access to the authentication database.
 * Used by repositories that manage users, authentication, and sessions.
 *
 * @example
 * import { authPool } from '../config/multi-database.config';
 * const user = await authPool.query('SELECT * FROM users WHERE id = $1', [userId]);
 */
const authPoolConfig: PoolConfig = {
  ...baseConfig,
  database:
    process.env.AUTH_DB_NAME ?? process.env.DB_NAME ?? 'nodeangularfullstack',
};

export const authPool = new Pool(authPoolConfig);

/**
 * Dashboard Database Pool (Read/Write)
 *
 * Purpose: Handles dashboard, tools, and export management operations
 * Tables: tools, tool_configs, tool_registry, export_jobs, drawing_projects
 *
 * This pool provides read/write access to the dashboard database.
 * Currently points to same database as auth, but can be separated in future.
 *
 * @example
 * import { dashboardPool } from '../config/multi-database.config';
 * const tools = await dashboardPool.query('SELECT * FROM tools');
 */
const dashboardPoolConfig: PoolConfig = {
  ...baseConfig,
  database:
    process.env.DASHBOARD_DB_NAME ??
    process.env.DB_NAME ??
    'nodeangularfullstack',
};

export const dashboardPool = new Pool(dashboardPoolConfig);

/**
 * Database Connection Health Check
 *
 * Verifies connectivity to all database pools.
 * Logs connection status for monitoring purposes.
 *
 * @throws {Error} If any database connection fails
 *
 * @example
 * await checkDatabaseConnections();
 * console.log('All database connections verified');
 */
export async function checkDatabaseConnections(): Promise<void> {
  const authDbName =
    process.env.AUTH_DB_NAME ?? process.env.DB_NAME ?? 'nodeangularfullstack';
  const dashboardDbName =
    process.env.DASHBOARD_DB_NAME ??
    process.env.DB_NAME ??
    'nodeangularfullstack';

  try {
    await authPool.query('SELECT NOW()');
    console.log(`✅ Auth database connection: OK (${authDbName})`);
  } catch (error) {
    console.error(`❌ Auth database connection failed (${authDbName}):`, error);
    throw error;
  }

  try {
    await dashboardPool.query('SELECT NOW()');
    console.log(`✅ Dashboard database connection: OK (${dashboardDbName})`);
  } catch (error) {
    console.error(
      `❌ Dashboard database connection failed (${dashboardDbName}):`,
      error
    );
    throw error;
  }
}

/**
 * Get Database Connection Information
 *
 * Returns information about current database connections for debugging.
 *
 * @returns Object with database names and pool statistics
 */
export function getDatabaseInfo() {
  return {
    auth: {
      database:
        process.env.AUTH_DB_NAME ??
        process.env.DB_NAME ??
        'nodeangularfullstack',
      totalCount: authPool.totalCount,
      idleCount: authPool.idleCount,
      waitingCount: authPool.waitingCount,
    },
    dashboard: {
      database:
        process.env.DASHBOARD_DB_NAME ??
        process.env.DB_NAME ??
        'nodeangularfullstack',
      totalCount: dashboardPool.totalCount,
      idleCount: dashboardPool.idleCount,
      waitingCount: dashboardPool.waitingCount,
    },
  };
}

/**
 * Graceful Shutdown Handler
 *
 * Closes all database connection pools when process terminates.
 * Ensures clean disconnection and resource cleanup.
 */
async function gracefulShutdown() {
  console.log('🔌 Closing database connections...');
  await Promise.all([authPool.end(), dashboardPool.end()]);
  console.log('✅ Database connections closed');
}

// Register shutdown handlers
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
