import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Application configuration interface
 */
export interface AppConfig {
  // Server settings
  PORT: number;
  NODE_ENV: string;

  // Frontend settings
  FRONTEND_URL: string;

  // Database settings
  DATABASE_URL: string;

  // Redis settings
  REDIS_URL: string;

  // JWT settings
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;

  // Multi-tenancy
  ENABLE_MULTI_TENANCY?: boolean;
}

/**
 * Validates and returns application configuration.
 * Ensures all required environment variables are present and valid.
 * @returns Validated application configuration
 * @throws Error if validation fails
 */
export function getConfig(): AppConfig {
  // Build DATABASE_URL from individual components if not provided
  let databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || '5432';
    const dbName = process.env.DB_NAME || 'nodeangularfullstack';
    const dbUser = process.env.DB_USER || 'dbuser';
    const dbPassword = process.env.DB_PASSWORD || 'dbpassword';
    databaseUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;
  }

  // Build REDIS_URL from individual components if not provided
  let redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = process.env.REDIS_PORT || '6379';
    const redisPassword = process.env.REDIS_PASSWORD;
    redisUrl = redisPassword
      ? `redis://:${redisPassword}@${redisHost}:${redisPort}`
      : `redis://${redisHost}:${redisPort}`;
  }

  const requiredVars = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET'
  ];

  // Check for missing required variables
  const missing = requiredVars.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const config: AppConfig = {
    PORT: parseInt(process.env.PORT || '3000', 10),
    NODE_ENV: process.env.NODE_ENV || 'development',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:4200',
    DATABASE_URL: databaseUrl,
    REDIS_URL: redisUrl,
    JWT_SECRET: process.env.JWT_SECRET!,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
    JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    ENABLE_MULTI_TENANCY: process.env.ENABLE_MULTI_TENANCY === 'true',
  };

  // Validate PORT
  if (isNaN(config.PORT) || config.PORT < 1 || config.PORT > 65535) {
    throw new Error('PORT must be a valid number between 1 and 65535');
  }

  // Validate NODE_ENV
  const validEnvironments = ['development', 'test', 'production'];
  if (!validEnvironments.includes(config.NODE_ENV)) {
    throw new Error(`NODE_ENV must be one of: ${validEnvironments.join(', ')}`);
  }

  // Production-specific validations
  if (config.NODE_ENV === 'production') {
    if (config.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long in production');
    }

    if (!config.FRONTEND_URL.startsWith('https://')) {
      throw new Error('FRONTEND_URL must use HTTPS in production');
    }

    if (!config.DATABASE_URL.startsWith('postgresql://') && !config.DATABASE_URL.startsWith('postgres://')) {
      throw new Error('DATABASE_URL must be a valid PostgreSQL connection string');
    }
  }

  return config;
}

/**
 * Application configuration singleton
 */
export const config = getConfig();