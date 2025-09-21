#!/usr/bin/env node

/**
 * Generate Secure Secrets for Production Deployment
 *
 * This script generates cryptographically secure secrets for production use.
 * Run this before deploying to production environments.
 *
 * Usage: node scripts/generate-secrets.js [--output-file] [--format]
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Configuration
const SECRETS_CONFIG = {
  JWT_SECRET: { length: 64, type: 'base64' },
  JWT_REFRESH_SECRET: { length: 64, type: 'base64' },
  SESSION_SECRET: { length: 64, type: 'base64' },
  ENCRYPTION_KEY: { length: 32, type: 'hex' },
  API_KEY: { length: 32, type: 'base64url' },
  PGWEB_AUTH_PASS: { length: 32, type: 'alphanumeric' }
};

/**
 * Generate a secure random string
 * @param {number} length - Length of the string
 * @param {string} type - Type of encoding (base64, hex, alphanumeric, base64url)
 * @returns {string} - Generated secret
 */
function generateSecret(length, type = 'base64') {
  switch (type) {
    case 'base64':
      return crypto.randomBytes(length).toString('base64');
    case 'base64url':
      return crypto.randomBytes(length).toString('base64url');
    case 'hex':
      return crypto.randomBytes(length).toString('hex');
    case 'alphanumeric':
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    default:
      throw new Error(`Unknown secret type: ${type}`);
  }
}

/**
 * Generate all required secrets
 * @returns {Object} - Object containing all generated secrets
 */
function generateAllSecrets() {
  const secrets = {};

  console.log('🔐 Generating secure secrets for production deployment...\n');

  for (const [name, config] of Object.entries(SECRETS_CONFIG)) {
    const secret = generateSecret(config.length, config.type);
    secrets[name] = secret;
    console.log(`✅ ${name}: ${secret.substring(0, 10)}...`);
  }

  return secrets;
}

/**
 * Format secrets for different outputs
 * @param {Object} secrets - Generated secrets
 * @param {string} format - Output format (env, json, yaml, shell)
 * @returns {string} - Formatted output
 */
function formatSecrets(secrets, format = 'env') {
  switch (format) {
    case 'env':
      return Object.entries(secrets)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

    case 'json':
      return JSON.stringify(secrets, null, 2);

    case 'yaml':
      return Object.entries(secrets)
        .map(([key, value]) => `${key}: "${value}"`)
        .join('\n');

    case 'shell':
      return Object.entries(secrets)
        .map(([key, value]) => `export ${key}="${value}"`)
        .join('\n');

    case 'digitalocean':
      return Object.entries(secrets)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

    default:
      throw new Error(`Unknown format: ${format}`);
  }
}

/**
 * Generate Digital Ocean App Platform configuration
 * @param {Object} secrets - Generated secrets
 * @returns {string} - Digital Ocean environment configuration
 */
function generateDigitalOceanConfig(secrets) {
  const config = {
    envs: Object.entries(secrets).map(([key, value]) => ({
      key,
      value,
      type: 'SECRET'
    }))
  };

  return JSON.stringify(config, null, 2);
}

/**
 * Save secrets to file
 * @param {string} content - Content to save
 * @param {string} filename - Output filename
 */
function saveToFile(content, filename) {
  const outputPath = path.join(process.cwd(), filename);
  fs.writeFileSync(outputPath, content);
  console.log(`\n💾 Secrets saved to: ${outputPath}`);
}

/**
 * Main execution function
 */
function main() {
  const args = process.argv.slice(2);
  const outputFile = args.find(arg => arg.startsWith('--output-file='))?.split('=')[1];
  const format = args.find(arg => arg.startsWith('--format='))?.split('=')[1] || 'env';

  try {
    // Generate secrets
    const secrets = generateAllSecrets();

    // Format output
    const formattedSecrets = formatSecrets(secrets, format);

    console.log('\n📋 Generated Secrets:\n');
    console.log('─'.repeat(50));
    console.log(formattedSecrets);
    console.log('─'.repeat(50));

    // Save to file if requested
    if (outputFile) {
      saveToFile(formattedSecrets, outputFile);
    }

    // Generate Digital Ocean specific configuration
    if (format === 'digitalocean' || args.includes('--digitalocean')) {
      const doConfig = generateDigitalOceanConfig(secrets);
      console.log('\n🌊 Digital Ocean App Platform Configuration:\n');
      console.log(doConfig);

      if (outputFile) {
        const doConfigFile = outputFile.replace(/\.[^.]+$/, '.do.json');
        saveToFile(doConfig, doConfigFile);
      }
    }

    // Security warnings
    console.log('\n⚠️  SECURITY WARNINGS:');
    console.log('• Store these secrets securely and never commit them to version control');
    console.log('• Use environment variables or secure secret management systems');
    console.log('• Rotate secrets regularly in production');
    console.log('• Use different secrets for different environments');
    console.log('• Enable audit logging for secret access');

    console.log('\n✅ Secret generation completed successfully!');

  } catch (error) {
    console.error('❌ Error generating secrets:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  generateSecret,
  generateAllSecrets,
  formatSecrets,
  generateDigitalOceanConfig
};