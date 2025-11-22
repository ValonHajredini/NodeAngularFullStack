#!/usr/bin/env node

// Skip Husky setup when running in CI or production-like installs.
const isCi = Boolean(process.env.CI);
const isHuskyDisabled = process.env.HUSKY === '0';
const isProdInstall =
  process.env.NODE_ENV === 'production' || process.env.npm_config_production === 'true';

if (isCi || isHuskyDisabled || isProdInstall) {
  console.log('Skipping Husky install (CI/production).');
  process.exit(0);
}

let husky;
try {
  // Require inside try so production installs without devDependencies do not fail.
  husky = require('husky');
} catch (error) {
  console.log('Husky is not installed; skipping prepare step.');
  process.exit(0);
}

try {
  // Husky v8+ doesn't have install() function, skip gracefully
  if (typeof husky.install === 'function') {
    husky.install();
    console.log('Husky hooks installed.');
  } else {
    console.log('Husky install() not available (v8+), skipping.');
  }
} catch (error) {
  console.log('Husky install failed:', error.message, '- continuing anyway.');
  process.exit(0);  // Exit gracefully instead of failing npm ci
}
