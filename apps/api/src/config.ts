import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface AppConfig {
  NODE_ENV: string;
  PORT: number;
  FRONTEND_URL: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
}

function validateRequired(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config: AppConfig = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:4200',
  DATABASE_URL: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'dbuser'}:${process.env.DB_PASSWORD || 'dbpassword'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'nodeangularfullstack'}`,
  JWT_SECRET: validateRequired('JWT_SECRET'),
  JWT_REFRESH_SECRET: validateRequired('JWT_REFRESH_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
};