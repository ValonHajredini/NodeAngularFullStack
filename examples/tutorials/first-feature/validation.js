#!/usr/bin/env node

/**
 * Tutorial Validation Script
 * Checks if the first feature tutorial has been completed correctly.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`)
};

/**
 * Check if a file exists
 */
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * Check if file contains specific content
 */
function fileContains(filePath, searchString) {
  if (!fileExists(filePath)) return false;
  const content = fs.readFileSync(filePath, 'utf-8');
  return content.includes(searchString);
}

/**
 * Validation checks for tutorial completion
 */
const validationChecks = [
  {
    name: 'Shared Types - Product Types File',
    check: () => fileExists('packages/shared/src/types/product.types.ts'),
    message: 'Create packages/shared/src/types/product.types.ts'
  },
  {
    name: 'Shared Types - Export in Index',
    check: () => fileContains('packages/shared/src/types/index.ts', 'product.types'),
    message: 'Export product types in packages/shared/src/types/index.ts'
  },
  {
    name: 'Backend - Products Controller',
    check: () => fileExists('apps/api/src/controllers/products.controller.ts'),
    message: 'Create apps/api/src/controllers/products.controller.ts'
  },
  {
    name: 'Backend - Products Service',
    check: () => fileExists('apps/api/src/services/products.service.ts'),
    message: 'Create apps/api/src/services/products.service.ts'
  },
  {
    name: 'Backend - Products Routes',
    check: () => fileExists('apps/api/src/routes/products.routes.ts'),
    message: 'Create apps/api/src/routes/products.routes.ts'
  },
  {
    name: 'Backend - Products Validators',
    check: () => fileExists('apps/api/src/validators/products.validators.ts'),
    message: 'Create apps/api/src/validators/products.validators.ts'
  },
  {
    name: 'Backend - Routes Registration',
    check: () => fileContains('apps/api/src/routes/index.ts', 'products'),
    message: 'Register products routes in apps/api/src/routes/index.ts'
  },
  {
    name: 'Frontend - Products Service',
    check: () => fileExists('apps/web/src/app/features/products/services/products.service.ts'),
    message: 'Create apps/web/src/app/features/products/services/products.service.ts'
  },
  {
    name: 'Frontend - Product List Component',
    check: () => fileExists('apps/web/src/app/features/products/components/product-list/product-list.component.ts'),
    message: 'Create apps/web/src/app/features/products/components/product-list/product-list.component.ts'
  }
];

/**
 * Run all validation checks
 */
function runValidation() {
  log.info('Running First Feature Tutorial Validation...\n');

  let passed = 0;
  let failed = 0;

  validationChecks.forEach((check, index) => {
    const result = check.check();
    if (result) {
      log.success(`${index + 1}. ${check.name}`);
      passed++;
    } else {
      log.error(`${index + 1}. ${check.name}`);
      log.warning(`   Action needed: ${check.message}`);
      failed++;
    }
  });

  console.log('\n' + '='.repeat(50));
  log.info(`Validation Results: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    log.success('🎉 Tutorial completed successfully!');
    log.info('Next steps:');
    console.log('   1. Run the backend tests: npm run test:api');
    console.log('   2. Run the frontend tests: npm run test:web');
    console.log('   3. Start both services and test the API endpoints');
    console.log('   4. Move on to the next tutorial section');
    return true;
  } else {
    log.error('❌ Tutorial not yet complete. Please address the failed checks above.');
    return false;
  }
}

/**
 * Generate progress report
 */
function generateProgressReport() {
  const total = validationChecks.length;
  const completed = validationChecks.filter(check => check.check()).length;
  const percentage = Math.round((completed / total) * 100);

  return {
    total,
    completed,
    percentage,
    isComplete: completed === total
  };
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const progress = generateProgressReport();

  console.log(`\n📊 Tutorial Progress: ${progress.completed}/${progress.total} (${progress.percentage}%)`);
  console.log('▓'.repeat(Math.floor(progress.percentage / 5)) + '░'.repeat(20 - Math.floor(progress.percentage / 5)) + '\n');

  const success = runValidation();
  process.exit(success ? 0 : 1);
}

export { runValidation, generateProgressReport };