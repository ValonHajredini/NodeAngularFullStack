/**
 * Database connection pool configuration.
 * Provides centralized PostgreSQL connection management with pooling.
 *
 * @module database.config
 *
 * @example
 * import { pool } from './config/database.config';
 *
 * const result = await pool.query('SELECT * FROM users');
 */
import { Pool, PoolConfig } from 'pg';
import { config } from 'dotenv';

// Load environment variables
config();

/**
 * PostgreSQL connection pool configuration.
 * Configures connection pooling with the following settings:
 * - max: 20 connections (prevents overwhelming PostgreSQL, leaves headroom for other services)
 * - idleTimeoutMillis: 30000ms (closes idle connections after 30 seconds)
 * - connectionTimeoutMillis: 2000ms (fails fast if connection takes > 2 seconds)
 *
 * Environment variables:
 * - DB_HOST: PostgreSQL host (default: localhost)
 * - DB_PORT: PostgreSQL port (default: 5432)
 * - DB_USER: Database user (default: dbuser)
 * - DB_PASSWORD: Database password (default: dbpassword)
 * - DB_NAME: Database name (default: nodeangularfullstack)
 */
const poolConfig: PoolConfig = {
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432'),
  user: process.env.DB_USER ?? 'dbuser',
  password: process.env.DB_PASSWORD ?? 'dbpassword',
  database: process.env.DB_NAME ?? 'nodeangularfullstack',
  max: 20, // Maximum pool size - prevents overwhelming PostgreSQL
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 2000, // Fail fast if connection takes > 2 seconds
};

/**
 * PostgreSQL connection pool singleton instance.
 * Use this pool instance for all database queries across the application.
 *
 * @example
 * import { pool } from './config/database.config';
 *
 * // Query with parameterized values
 * const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
 */
export const pool = new Pool(poolConfig);

/**
 * Checks database connectivity by executing a simple query.
 * Does not throw errors - returns false on failure for graceful degradation.
 * Logs errors with descriptive context for monitoring purposes.
 *
 * @returns Promise resolving to true if connected, false otherwise
 *
 * @example
 * const isHealthy = await checkDatabaseConnection();
 * if (!isHealthy) {
 *   console.warn('Database unavailable, using cache');
 * }
 *
 * @example
 * // Usage in health check endpoint
 * app.get('/health', async (req, res) => {
 *   const dbHealthy = await checkDatabaseConnection();
 *   res.status(dbHealthy ? 200 : 503).json({
 *     status: dbHealthy ? 'healthy' : 'unhealthy',
 *     database: dbHealthy ? 'connected' : 'disconnected',
 *   });
 * });
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

/**
 * Gracefully closes all database connections in the pool.
 * Should be called during application shutdown to ensure clean termination.
 * Waits for all active queries to complete before closing connections.
 *
 * @returns Promise that resolves when all connections are closed
 *
 * @example
 * // Usage in graceful shutdown
 * process.on('SIGTERM', async () => {
 *   console.log('SIGTERM received, closing database connections...');
 *   await closeDatabaseConnection();
 *   process.exit(0);
 * });
 *
 * @example
 * // Usage in SIGINT handler
 * process.on('SIGINT', async () => {
 *   console.log('SIGINT received, closing database connections...');
 *   await closeDatabaseConnection();
 *   process.exit(0);
 * });
 */
export async function closeDatabaseConnection(): Promise<void> {
  await pool.end();
}

/**
 * Error event handler for unexpected database connection errors.
 * Logs errors that occur on idle connections in the pool.
 * Does not exit the process - allows reconnection logic to handle recovery.
 *
 * Common scenarios:
 * - Network interruptions
 * - PostgreSQL server restart
 * - Connection timeout on idle connections
 */
pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  // Don't exit process - let reconnection logic handle it
});
