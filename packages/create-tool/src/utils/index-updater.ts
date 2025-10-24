/**
 * Index File Updater
 *
 * Utilities for updating index.ts files with new exports.
 * Automatically adds new tool exports to backend and shared package index files.
 *
 * Features:
 * - Alphabetical export insertion
 * - Preserve existing imports and comments
 * - Safe error handling (warns but doesn't fail)
 * - Route registration in Express app
 * - Server.ts route registration
 *
 * @module utils/index-updater
 * @example
 * ```typescript
 * import { updateControllersIndex } from './utils/index-updater';
 *
 * await updateControllersIndex('inventory-tracker', 'InventoryTracker');
 * // Updates apps/api/src/controllers/index.ts with new export
 * ```
 */

import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

/**
 * Get the workspace root directory.
 * Assumes this file is in packages/create-tool/src/utils/
 * @returns Absolute path to workspace root
 */
function getWorkspaceRoot(): string {
  // From packages/create-tool/src/utils/ go up 4 levels to root
  return path.join(__dirname, '..', '..', '..', '..');
}

/**
 * Read file content safely.
 * @param filePath - Absolute path to file
 * @returns File content or empty string if file doesn't exist
 */
async function readFileSafe(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return '';
    }
    throw error;
  }
}

/**
 * Check if content already contains the export line.
 * @param content - File content
 * @param exportLine - Export line to check
 * @returns True if export exists
 */
function hasExport(content: string, exportLine: string): boolean {
  return content.includes(exportLine);
}

/**
 * Append export to end of file preserving formatting.
 * @param content - Current file content
 * @param newExport - New export line to add
 * @returns Updated content
 */
function appendExport(content: string, newExport: string): string {
  const trimmed = content.trimEnd();
  return `${trimmed}\n${newExport}\n`;
}

/**
 * Insert import line alphabetically among existing imports.
 * @param content - Current file content
 * @param newImport - New import line to add
 * @returns Updated content
 */
function insertImportAlphabetically(content: string, newImport: string): string {
  const lines = content.split('\n');

  // Find the import section
  let lastImportIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      lastImportIndex = i;
    }
  }

  // If no imports found, add at beginning
  if (lastImportIndex === -1) {
    return `${newImport}\n${content}`;
  }

  // Find correct alphabetical position
  let insertIndex = lastImportIndex + 1;
  for (let i = 0; i <= lastImportIndex; i++) {
    const line = lines[i].trim();
    if (line.startsWith('import ') && newImport < lines[i]) {
      insertIndex = i;
      break;
    }
  }

  lines.splice(insertIndex, 0, newImport);
  return lines.join('\n');
}

/**
 * Update controllers index file with new controller export.
 * @param toolId - Tool ID (kebab-case)
 * @param className - Class name (PascalCase)
 * @returns Promise resolving when complete
 *
 * @example
 * await updateControllersIndex('inventory-tracker', 'InventoryTracker');
 * // Adds: export { InventoryTrackerController } from './inventory-tracker.controller';
 */
export async function updateControllersIndex(
  toolId: string,
  className: string
): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  const indexPath = path.join(workspaceRoot, 'apps/api/src/controllers/index.ts');

  try {
    const content = await readFileSafe(indexPath);
    const newExport = `export { ${className}Controller } from './${toolId}.controller';`;

    // Check if already exists
    if (hasExport(content, newExport)) {
      console.log(chalk.gray('  ⊘ Controller export already exists'));
      return;
    }

    const updated = appendExport(content, newExport);
    await fs.writeFile(indexPath, updated, 'utf-8');
    console.log(chalk.green('  ✓ Updated controllers/index.ts'));
  } catch (error) {
    console.warn(chalk.yellow(`  ⚠️  Failed to update controllers/index.ts: ${error}`));
  }
}

/**
 * Update services index file with new service export.
 * @param toolId - Tool ID (kebab-case)
 * @param className - Class name (PascalCase)
 * @returns Promise resolving when complete
 *
 * @example
 * await updateServicesIndex('inventory-tracker', 'InventoryTracker');
 * // Adds: export { InventoryTrackerService } from './inventory-tracker.service';
 */
export async function updateServicesIndex(
  toolId: string,
  className: string
): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  const indexPath = path.join(workspaceRoot, 'apps/api/src/services/index.ts');

  try {
    const content = await readFileSafe(indexPath);
    const newExport = `export { ${className}Service } from './${toolId}.service';`;

    if (hasExport(content, newExport)) {
      console.log(chalk.gray('  ⊘ Service export already exists'));
      return;
    }

    const updated = appendExport(content, newExport);
    await fs.writeFile(indexPath, updated, 'utf-8');
    console.log(chalk.green('  ✓ Updated services/index.ts'));
  } catch (error) {
    console.warn(chalk.yellow(`  ⚠️  Failed to update services/index.ts: ${error}`));
  }
}

/**
 * Update repositories index file with new repository export.
 * @param toolId - Tool ID (kebab-case)
 * @param className - Class name (PascalCase)
 * @returns Promise resolving when complete
 *
 * @example
 * await updateRepositoriesIndex('inventory-tracker', 'InventoryTracker');
 * // Adds: export { InventoryTrackerRepository } from './inventory-tracker.repository';
 */
export async function updateRepositoriesIndex(
  toolId: string,
  className: string
): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  const indexPath = path.join(workspaceRoot, 'apps/api/src/repositories/index.ts');

  try {
    const content = await readFileSafe(indexPath);
    const newExport = `export { ${className}Repository } from './${toolId}.repository';`;

    if (hasExport(content, newExport)) {
      console.log(chalk.gray('  ⊘ Repository export already exists'));
      return;
    }

    const updated = appendExport(content, newExport);
    await fs.writeFile(indexPath, updated, 'utf-8');
    console.log(chalk.green('  ✓ Updated repositories/index.ts'));
  } catch (error) {
    console.warn(chalk.yellow(`  ⚠️  Failed to update repositories/index.ts: ${error}`));
  }
}

/**
 * Update validators index file with new validator exports.
 * @param toolId - Tool ID (kebab-case)
 * @param className - Class name (PascalCase)
 * @returns Promise resolving when complete
 *
 * @example
 * await updateValidatorsIndex('inventory-tracker', 'InventoryTracker');
 * // Adds: export { validateInventoryTrackerCreate, validateInventoryTrackerUpdate } from './inventory-tracker.validator';
 */
export async function updateValidatorsIndex(
  toolId: string,
  className: string
): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  const indexPath = path.join(workspaceRoot, 'apps/api/src/validators/index.ts');

  try {
    const content = await readFileSafe(indexPath);
    const newExport = `export { validate${className}Create, validate${className}Update } from './${toolId}.validator';`;

    if (hasExport(content, newExport)) {
      console.log(chalk.gray('  ⊘ Validator exports already exist'));
      return;
    }

    const updated = appendExport(content, newExport);
    await fs.writeFile(indexPath, updated, 'utf-8');
    console.log(chalk.green('  ✓ Updated validators/index.ts'));
  } catch (error) {
    console.warn(chalk.yellow(`  ⚠️  Failed to update validators/index.ts: ${error}`));
  }
}

/**
 * Update routes index file with new route export.
 * @param toolId - Tool ID (kebab-case)
 * @returns Promise resolving when complete
 *
 * @example
 * await updateRoutesIndex('inventory-tracker');
 * // Adds: export { inventoryTrackerRoutes } from './inventory-tracker.routes';
 */
export async function updateRoutesIndex(toolId: string): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  const indexPath = path.join(workspaceRoot, 'apps/api/src/routes/index.ts');

  try {
    const content = await readFileSafe(indexPath);

    // Convert toolId to camelCase for route variable name
    const camelCaseName = toolId
      .split('-')
      .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
      .join('');

    const newExport = `export { ${camelCaseName}Routes } from './${toolId}.routes';`;

    if (hasExport(content, newExport)) {
      console.log(chalk.gray('  ⊘ Route export already exists'));
      return;
    }

    const updated = appendExport(content, newExport);
    await fs.writeFile(indexPath, updated, 'utf-8');
    console.log(chalk.green('  ✓ Updated routes/index.ts'));
  } catch (error) {
    console.warn(chalk.yellow(`  ⚠️  Failed to update routes/index.ts: ${error}`));
  }
}

/**
 * Update server.ts to register new route.
 * Adds import and route registration in initializeRoutes method.
 * @param toolId - Tool ID (kebab-case)
 * @param apiBase - API base path (e.g., '/api/tools/inventory-tracker')
 * @returns Promise resolving when complete
 *
 * @example
 * await updateServerRoutes('inventory-tracker', '/api/tools/inventory-tracker');
 * // Adds import and this.app.use('/api/tools/inventory-tracker', inventoryTrackerRoutes);
 */
export async function updateServerRoutes(
  toolId: string,
  apiBase: string
): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  const serverPath = path.join(workspaceRoot, 'apps/api/src/server.ts');

  try {
    const content = await readFileSafe(serverPath);

    // Convert toolId to camelCase for route variable name
    const camelCaseName = toolId
      .split('-')
      .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
      .join('');

    const newImport = `import { ${camelCaseName}Routes } from './routes/${toolId}.routes';`;
    const newRoute = `    this.app.use('${apiBase}', ${camelCaseName}Routes);`;

    // Check if import already exists
    if (content.includes(newImport)) {
      console.log(chalk.gray('  ⊘ Server route already registered'));
      return;
    }

    // Add import alphabetically
    let updated = insertImportAlphabetically(content, newImport);

    // Find initializeRoutes method and add route
    // Look for the line with toolRegistryRoutes (last route before API root)
    const toolRegistryLine = "this.app.use('/api/tools', toolRegistryRoutes);";
    if (updated.includes(toolRegistryLine)) {
      updated = updated.replace(
        toolRegistryLine,
        `${newRoute}\n${toolRegistryLine}`
      );
    } else {
      // Fallback: add before the API root endpoint
      const apiRootLine = "    // API root endpoint";
      if (updated.includes(apiRootLine)) {
        updated = updated.replace(
          apiRootLine,
          `${newRoute}\n\n${apiRootLine}`
        );
      }
    }

    await fs.writeFile(serverPath, updated, 'utf-8');
    console.log(chalk.green('  ✓ Updated server.ts with route registration'));
  } catch (error) {
    console.warn(chalk.yellow(`  ⚠️  Failed to update server.ts: ${error}`));
  }
}

/**
 * Update shared types index file with new type exports.
 * @param toolId - Tool ID (kebab-case)
 * @param className - Class name (PascalCase)
 * @returns Promise resolving when complete
 *
 * @example
 * await updateSharedIndex('inventory-tracker', 'InventoryTracker');
 * // Adds: export * from './types/inventory-tracker.types';
 */
export async function updateSharedIndex(
  toolId: string,
  className: string
): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  const indexPath = path.join(workspaceRoot, 'packages/shared/src/index.ts');

  try {
    const content = await readFileSafe(indexPath);
    const newExport = `export * from './types/${toolId}.types';`;

    if (hasExport(content, newExport)) {
      console.log(chalk.gray('  ⊘ Shared types export already exists'));
      return;
    }

    const updated = appendExport(content, newExport);
    await fs.writeFile(indexPath, updated, 'utf-8');
    console.log(chalk.green('  ✓ Updated packages/shared/src/index.ts'));
  } catch (error) {
    console.warn(chalk.yellow(`  ⚠️  Failed to update packages/shared/src/index.ts: ${error}`));
  }
}

/**
 * Update all index files for a new tool.
 * Calls all individual update functions with error handling.
 *
 * @param toolId - Tool ID (kebab-case)
 * @param className - Class name (PascalCase)
 * @param apiBase - API base path (e.g., '/api/tools/inventory-tracker')
 * @returns Promise resolving when all updates complete
 *
 * @example
 * ```typescript
 * await updateAllIndexFiles('inventory-tracker', 'InventoryTracker', '/api/tools/inventory-tracker');
 * // Updates all index files and server.ts
 * ```
 */
export async function updateAllIndexFiles(
  toolId: string,
  className: string,
  apiBase: string
): Promise<void> {
  console.log(chalk.blue('\n📝 Updating index files...'));

  await updateControllersIndex(toolId, className);
  await updateServicesIndex(toolId, className);
  await updateRepositoriesIndex(toolId, className);
  await updateValidatorsIndex(toolId, className);
  await updateRoutesIndex(toolId);
  await updateServerRoutes(toolId, apiBase);
  await updateSharedIndex(toolId, className);

  console.log(chalk.green('✅ Index files updated\n'));
}
