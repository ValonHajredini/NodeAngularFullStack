#!/usr/bin/env node

/**
 * Environment Configuration Validator
 *
 * This script validates environment configuration for production deployment.
 * It checks for required variables, validates values, and provides security recommendations.
 *
 * Usage: node scripts/validate-environment.js [--env=production] [--fix]
 */

const fs = require('fs');
const path = require('path');

// Required environment variables for production
const REQUIRED_VARS = {
  // Core Application
  NODE_ENV: { required: true, values: ['production'], description: 'Application environment' },
  PORT: { required: true, type: 'number', min: 1, max: 65535, description: 'Application port' },

  // Database
  DATABASE_URL: { required: true, pattern: /^postgresql:\/\//, description: 'PostgreSQL connection string' },

  // Authentication
  JWT_SECRET: { required: true, minLength: 32, description: 'JWT signing secret' },
  JWT_REFRESH_SECRET: { required: true, minLength: 32, description: 'JWT refresh token secret' },

  // External Services
  SENDGRID_API_KEY: { required: false, pattern: /^SG\./, description: 'SendGrid API key' },
  SENTRY_DSN: { required: false, pattern: /^https:\/\//, description: 'Sentry error tracking DSN' },

  // Security
  CORS_ORIGINS: { required: true, description: 'Allowed CORS origins' },

  // Digital Ocean Spaces
  DO_SPACES_KEY: { required: false, description: 'Digital Ocean Spaces access key' },
  DO_SPACES_SECRET: { required: false, description: 'Digital Ocean Spaces secret key' },
  DO_SPACES_BUCKET: { required: false, description: 'Digital Ocean Spaces bucket name' }
};

// Security checks
const SECURITY_CHECKS = {
  'JWT_SECRET': (value) => ({
    passed: value.length >= 64,
    message: 'JWT secret should be at least 64 characters for production'
  }),
  'JWT_REFRESH_SECRET': (value) => ({
    passed: value.length >= 64,
    message: 'JWT refresh secret should be at least 64 characters for production'
  }),
  'NODE_ENV': (value) => ({
    passed: value === 'production',
    message: 'NODE_ENV must be set to "production" for production deployment'
  }),
  'CORS_ORIGINS': (value) => ({
    passed: !value.includes('*') && !value.includes('localhost'),
    message: 'CORS origins should not include wildcards or localhost in production'
  })
};

/**
 * Load environment variables from .env file
 * @param {string} envFile - Path to .env file
 * @returns {Object} - Environment variables
 */
function loadEnvFile(envFile) {
  if (!fs.existsSync(envFile)) {
    return {};
  }

  const content = fs.readFileSync(envFile, 'utf8');
  const env = {};

  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  return env;
}

/**
 * Validate a single environment variable
 * @param {string} key - Variable name
 * @param {string} value - Variable value
 * @param {Object} config - Validation configuration
 * @returns {Object} - Validation result
 */
function validateVariable(key, value, config) {
  const result = {
    key,
    value: value ? '***' : undefined,
    passed: true,
    errors: [],
    warnings: []
  };

  // Check if required
  if (config.required && (!value || value.trim() === '')) {
    result.passed = false;
    result.errors.push(`${key} is required but not set`);
    return result;
  }

  // Skip further validation if not provided and not required
  if (!value || value.trim() === '') {
    return result;
  }

  // Type validation
  if (config.type === 'number') {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) {
      result.passed = false;
      result.errors.push(`${key} must be a number`);
    } else {
      if (config.min !== undefined && numValue < config.min) {
        result.passed = false;
        result.errors.push(`${key} must be at least ${config.min}`);
      }
      if (config.max !== undefined && numValue > config.max) {
        result.passed = false;
        result.errors.push(`${key} must be at most ${config.max}`);
      }
    }
  }

  // Pattern validation
  if (config.pattern && !config.pattern.test(value)) {
    result.passed = false;
    result.errors.push(`${key} does not match required pattern`);
  }

  // Length validation
  if (config.minLength && value.length < config.minLength) {
    result.passed = false;
    result.errors.push(`${key} must be at least ${config.minLength} characters long`);
  }

  // Values validation
  if (config.values && !config.values.includes(value)) {
    result.passed = false;
    result.errors.push(`${key} must be one of: ${config.values.join(', ')}`);
  }

  // Security checks
  if (SECURITY_CHECKS[key]) {
    const securityCheck = SECURITY_CHECKS[key](value);
    if (!securityCheck.passed) {
      result.warnings.push(securityCheck.message);
    }
  }

  return result;
}

/**
 * Validate all environment variables
 * @param {Object} env - Environment variables
 * @returns {Object} - Validation results
 */
function validateEnvironment(env) {
  const results = {
    passed: true,
    totalErrors: 0,
    totalWarnings: 0,
    variables: []
  };

  for (const [key, config] of Object.entries(REQUIRED_VARS)) {
    const result = validateVariable(key, env[key], config);
    results.variables.push(result);

    if (!result.passed) {
      results.passed = false;
      results.totalErrors += result.errors.length;
    }
    results.totalWarnings += result.warnings.length;
  }

  return results;
}

/**
 * Generate environment configuration report
 * @param {Object} results - Validation results
 * @returns {string} - Report text
 */
function generateReport(results) {
  let report = '\n🔍 Environment Configuration Validation Report\n';
  report += '═'.repeat(50) + '\n\n';

  // Summary
  report += `📊 Summary:\n`;
  report += `   • Total Variables: ${results.variables.length}\n`;
  report += `   • Errors: ${results.totalErrors}\n`;
  report += `   • Warnings: ${results.totalWarnings}\n`;
  report += `   • Status: ${results.passed ? '✅ PASSED' : '❌ FAILED'}\n\n`;

  // Variable details
  for (const variable of results.variables) {
    const status = variable.passed ? '✅' : '❌';
    report += `${status} ${variable.key}\n`;

    if (variable.errors.length > 0) {
      variable.errors.forEach(error => {
        report += `   ❌ Error: ${error}\n`;
      });
    }

    if (variable.warnings.length > 0) {
      variable.warnings.forEach(warning => {
        report += `   ⚠️  Warning: ${warning}\n`;
      });
    }

    report += '\n';
  }

  // Recommendations
  if (results.totalErrors > 0 || results.totalWarnings > 0) {
    report += '🔧 Recommendations:\n';
    report += '─'.repeat(30) + '\n';

    if (results.totalErrors > 0) {
      report += '• Fix all errors before deploying to production\n';
      report += '• Use the secret generation script: npm run generate-secrets\n';
      report += '• Configure missing environment variables in Digital Ocean App Platform\n';
    }

    if (results.totalWarnings > 0) {
      report += '• Address security warnings for production deployment\n';
      report += '• Ensure secrets are sufficiently long and random\n';
      report += '• Avoid wildcards in CORS configuration\n';
    }

    report += '\n';
  }

  return report;
}

/**
 * Main execution function
 */
function main() {
  const args = process.argv.slice(2);
  const envArg = args.find(arg => arg.startsWith('--env='))?.split('=')[1] || 'production';
  const fix = args.includes('--fix');

  console.log(`🔍 Validating environment configuration for: ${envArg}`);

  try {
    // Load environment variables
    let env = process.env;

    // Load from .env file if specified
    const envFile = `.env.${envArg}.example`;
    if (fs.existsSync(envFile)) {
      console.log(`📁 Loading configuration from: ${envFile}`);
      env = { ...env, ...loadEnvFile(envFile) };
    }

    // Validate environment
    const results = validateEnvironment(env);

    // Generate and display report
    const report = generateReport(results);
    console.log(report);

    // Exit with appropriate code
    if (!results.passed) {
      console.log('💡 Tip: Run "npm run generate-secrets" to generate secure secrets');
      process.exit(1);
    } else {
      console.log('🎉 Environment configuration is valid for production deployment!');
      process.exit(0);
    }

  } catch (error) {
    console.error('❌ Error validating environment:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  validateVariable,
  validateEnvironment,
  generateReport,
  loadEnvFile
};