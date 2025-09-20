import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

/**
 * Database configuration interface
 */
interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

/**
 * Database service for PostgreSQL operations.
 * Provides connection pooling and standardized query methods.
 */
export class DatabaseService {
  private pool: Pool | null = null;
  private isConnected = false;

  /**
   * Initializes database connection pool with configuration.
   * @param config - Database connection configuration
   * @throws Error if connection fails
   */
  public async initialize(config: DatabaseConfig): Promise<void> {
    try {
      this.pool = new Pool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: config.password,
        ssl: config.ssl,
        max: config.max || 20,
        idleTimeoutMillis: config.idleTimeoutMillis || 30000,
        connectionTimeoutMillis: config.connectionTimeoutMillis || 2000,
      });

      // Test the connection
      await this.testConnection();
      this.isConnected = true;

      console.log('✅ Database connection pool initialized successfully');
      console.log(`📊 Database: ${config.database} @ ${config.host}:${config.port}`);
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw new Error(`Failed to connect to database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Tests database connectivity by executing a simple query.
   * @returns Promise that resolves if connection is successful
   * @throws Error if connection test fails
   */
  public async testConnection(): Promise<void> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW() as current_time, version() as db_version');
      client.release();

      console.log('🔍 Database connection test successful');
      console.log(`⏰ Server time: ${result.rows[0].current_time}`);
    } catch (error) {
      throw new Error(`Database connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Executes a parameterized query against the database.
   * @param text - SQL query string with placeholders ($1, $2, etc.)
   * @param params - Array of parameter values
   * @returns Query result
   * @throws Error if query execution fails
   */
  // Fixed TypeScript generic constraint issue
  public async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;

      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 Query executed in ${duration}ms: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error(`❌ Query failed after ${duration}ms:`, text);
      console.error('Query error:', error);
      throw error;
    }
  }

  /**
   * Gets a client from the connection pool for transaction support.
   * Remember to call client.release() when done.
   * @returns Database client
   * @throws Error if pool is not initialized
   */
  public async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }
    return this.pool.connect();
  }

  /**
   * Executes multiple queries within a transaction.
   * @param queries - Array of query objects with text and params
   * @returns Array of query results
   * @throws Error if transaction fails
   */
  public async transaction(queries: Array<{ text: string; params?: any[] }>): Promise<QueryResult[]> {
    const client = await this.getClient();
    const results: QueryResult[] = [];

    try {
      await client.query('BEGIN');

      for (const query of queries) {
        const result = await client.query(query.text, query.params);
        results.push(result);
      }

      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Gets the database connection pool.
   * @returns PostgreSQL connection pool
   * @throws Error if pool is not initialized
   */
  public getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }
    return this.pool;
  }

  /**
   * Gets database connection status and pool information.
   * @returns Database status information
   */
  public getStatus(): {
    isConnected: boolean;
    totalConnections?: number;
    idleConnections?: number;
    waitingClients?: number;
  } {
    return {
      isConnected: this.isConnected,
      totalConnections: this.pool?.totalCount,
      idleConnections: this.pool?.idleCount,
      waitingClients: this.pool?.waitingCount,
    };
  }

  /**
   * Gracefully closes all database connections.
   * @returns Promise that resolves when all connections are closed
   */
  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
      console.log('🔌 Database connection pool closed');
    }
  }

  /**
   * Parses a PostgreSQL connection URL into configuration object.
   * @param url - PostgreSQL connection URL
   * @returns Database configuration
   * @throws Error if URL format is invalid
   */
  public static parseConnectionUrl(url: string): DatabaseConfig {
    try {
      const parsedUrl = new URL(url);

      return {
        host: parsedUrl.hostname,
        port: parseInt(parsedUrl.port) || 5432,
        database: parsedUrl.pathname.slice(1), // Remove leading slash
        username: parsedUrl.username,
        password: parsedUrl.password,
        ssl: parsedUrl.searchParams.get('ssl') === 'true' ||
             parsedUrl.searchParams.get('sslmode') === 'require',
      };
    } catch (error) {
      throw new Error(`Invalid database URL format: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();