/**
 * E2E Test Environment Setup
 *
 * Loads environment variables before E2E tests run.
 * Looks for .env.e2e file, falls back to development environment.
 *
 * @module tests/e2e/setup-env
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Try to load .env.e2e first
const e2eEnvPath = path.resolve(process.cwd(), '.env.e2e');
const devEnvPath = path.resolve(process.cwd(), '../../.env.development');

if (fs.existsSync(e2eEnvPath)) {
  dotenv.config({ path: e2eEnvPath });
  console.log('✓ Loaded E2E environment from .env.e2e');
} else if (fs.existsSync(devEnvPath)) {
  dotenv.config({ path: devEnvPath });
  console.log('✓ Loaded development environment from .env.development');
} else {
  console.warn(
    '⚠️  No environment file found. Using process environment variables.'
  );
}

// Set defaults for E2E tests
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
process.env.CREATE_TOOL_WORKSPACE =
  process.env.CREATE_TOOL_WORKSPACE || '/tmp/create-tool-e2e';
