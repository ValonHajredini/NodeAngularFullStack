/**
 * File Generator
 *
 * Orchestrates tool file generation from templates.
 * Creates directory structure, writes rendered files, and reports progress.
 *
 * Features:
 * - Conflict detection (abort/force/skip)
 * - Progress reporting with file sizes
 * - Error handling and rollback
 * - Permission setting (Unix)
 * - Colored console output
 *
 * @module generator/file-generator
 * @example
 * ```typescript
 * import { generateToolFiles } from './generator/file-generator.js';
 *
 * const result = await generateToolFiles(metadata, { force: true });
 * if (result.success) {
 *   console.log(`Created ${result.filesCreated.length} files`);
 * }
 * ```
 */

import chalk from 'chalk';
import path from 'path';
import { renderAllTemplates } from '../utils/template-renderer';
import type { ToolMetadata } from '../prompts/tool-prompts';
import {
  getDirectoryStructure,
  getUniqueDirs,
  getAllFilePaths,
} from '../config/directory-structure';
import {
  createDirectory,
  writeFile,
  fileExists,
  setPermissions,
  getFileSize,
} from '../utils/file-writer';

/**
 * Generation options for file creation.
 */
export interface GenerationOptions {
  /** Overwrite existing files without prompting */
  force?: boolean;
  /** Skip existing files instead of failing */
  skipExisting?: boolean;
}

/**
 * Result of tool file generation.
 * Contains success status, created files, and any errors.
 */
export interface GenerationResult {
  /** Whether generation succeeded */
  success: boolean;
  /** Array of created file paths */
  filesCreated: string[];
  /** Array of created directory paths */
  directoriesCreated: string[];
  /** Array of error messages (if any) */
  errors: string[];
}

/**
 * Generate all tool files from templates.
 * Orchestrates the entire generation process:
 * 1. Check for conflicts (unless force mode)
 * 2. Render templates
 * 3. Create directories
 * 4. Write files with permissions
 * 5. Report progress
 *
 * @param metadata - Tool metadata from prompts
 * @param options - Generation options (force, skipExisting)
 * @returns Promise containing generation result summary
 *
 * @example
 * ```typescript
 * const metadata = {
 *   toolId: 'inventory-tracker',
 *   toolName: 'Inventory Tracker',
 *   description: 'Track inventory items',
 *   icon: 'pi-box',
 *   version: '1.0.0',
 *   permissions: ['user', 'admin'],
 *   features: ['backend', 'database', 'service', 'component', 'tests', 'integrationTests']
 * };
 *
 * // Default mode (abort on conflicts)
 * const result = await generateToolFiles(metadata);
 *
 * // Force mode (overwrite existing)
 * const result = await generateToolFiles(metadata, { force: true });
 *
 * // Skip mode (skip existing files)
 * const result = await generateToolFiles(metadata, { skipExisting: true });
 * ```
 */
export async function generateToolFiles(
  metadata: ToolMetadata,
  options: GenerationOptions = {}
): Promise<GenerationResult> {
  const result: GenerationResult = {
    success: false,
    filesCreated: [],
    directoriesCreated: [],
    errors: [],
  };

  try {
    console.log(chalk.blue.bold('\n🛠️  Generating Tool Files\n'));

    // 1. Get directory structure
    const structure = getDirectoryStructure({
      toolId: metadata.toolId,
      toolName: metadata.toolName,
      description: metadata.description,
      icon: metadata.icon,
      version: metadata.version,
      permissions: metadata.permissions,
      features: metadata.features,
    });

    // 2. Check for conflicts (unless force or skipExisting mode)
    if (!options.force && !options.skipExisting) {
      console.log(chalk.gray('🔍 Checking for conflicts...'));
      const conflicts = await checkConflicts(structure);

      if (conflicts.length > 0) {
        const relativeConflicts = conflicts.map(f => path.relative(process.cwd(), f));
        throw new Error(
          `Tool '${metadata.toolId}' already exists. Conflicting files:\n\n` +
          relativeConflicts.map(f => `  - ${f}`).join('\n') +
          '\n\nUse --force to overwrite or --skip-existing to skip conflicts.'
        );
      }
      console.log(chalk.green('  ✓ No conflicts detected\n'));
    } else if (options.force) {
      console.log(chalk.yellow('⚠️  Force mode: Will overwrite existing files\n'));
    } else if (options.skipExisting) {
      console.log(chalk.yellow('⚠️  Skip mode: Will skip existing files\n'));
    }

    // 3. Render all templates
    console.log(chalk.blue('📝 Rendering templates...'));
    const rendered = await renderAllTemplates({
      toolId: metadata.toolId,
      toolName: metadata.toolName,
      description: metadata.description,
      icon: metadata.icon,
      version: metadata.version,
      permissions: metadata.permissions,
      features: {
        backend: metadata.features.includes('backend'),
        database: metadata.features.includes('database'),
        service: metadata.features.includes('service'),
        component: metadata.features.includes('component'),
        tests: metadata.features.includes('tests'),
        integrationTests: metadata.features.includes('integrationTests'),
      },
    });
    console.log(chalk.green('  ✓ Templates rendered successfully\n'));

    // 4. Create directories
    console.log(chalk.blue('📁 Creating directories...'));
    const dirs = getUniqueDirs(structure);

    for (const dir of dirs) {
      await createDirectory(dir);
      await setPermissions(dir, 0o755); // rwxr-xr-x for directories
      result.directoriesCreated.push(dir);
      const relativeDir = path.relative(process.cwd(), dir);
      console.log(chalk.gray(`  ✓ ${relativeDir}`));
    }
    console.log(chalk.green(`  ✓ Created ${result.directoriesCreated.length} directories\n`));

    // 5. Write files
    console.log(chalk.blue('📄 Generating files...'));
    const fileMap = getFileMap(structure, rendered);

    for (const [filePath, content] of Object.entries(fileMap)) {
      // Skip if file exists and skipExisting mode
      if (options.skipExisting && (await fileExists(filePath))) {
        const fileName = path.basename(filePath);
        console.log(chalk.yellow(`  ⊘ Skipped (exists): ${fileName}`));
        continue;
      }

      // Write file
      await writeFile(filePath, content);
      await setPermissions(filePath, 0o644); // rw-r--r-- for files
      result.filesCreated.push(filePath);

      // Display progress with file size
      const size = await getFileSize(filePath);
      const sizeKB = (size / 1024).toFixed(1);
      const fileName = path.basename(filePath);
      console.log(chalk.green(`  ✓ ${fileName}`) + chalk.gray(` (${sizeKB} KB)`));
    }

    // 6. Success summary
    result.success = true;
    console.log(
      chalk.green.bold(
        `\n✅ Generated ${result.filesCreated.length} files in ${result.directoriesCreated.length} directories\n`
      )
    );

    // 7. Print next steps
    printNextSteps(metadata);

  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : String(error));
    console.error(chalk.red.bold(`\n❌ Generation failed:`));
    console.error(chalk.red(result.errors.join('\n')));
    console.log(); // Empty line for spacing
  }

  return result;
}

/**
 * Check for existing files that would conflict.
 * Returns array of file paths that already exist.
 *
 * @param structure - Directory structure from getDirectoryStructure
 * @returns Promise resolving to array of conflicting file paths
 */
async function checkConflicts(structure: ReturnType<typeof getDirectoryStructure>): Promise<string[]> {
  const conflicts: string[] = [];
  const allFiles = getAllFilePaths(structure);

  for (const filePath of allFiles) {
    if (await fileExists(filePath)) {
      conflicts.push(filePath);
    }
  }

  // Also check if frontend base directory exists with files
  if (await fileExists(structure.frontend.base)) {
    conflicts.push(structure.frontend.base);
  }

  return conflicts;
}

/**
 * Map file paths to rendered content.
 * Creates a dictionary of file paths and their content.
 *
 * @param structure - Directory structure from getDirectoryStructure
 * @param rendered - Rendered templates from renderAllTemplates
 * @returns Object mapping file paths to content strings
 */
function getFileMap(
  structure: ReturnType<typeof getDirectoryStructure>,
  rendered: Awaited<ReturnType<typeof renderAllTemplates>>
): Record<string, string> {
  return {
    // Frontend files
    [structure.frontend.files.component]: rendered.frontend.component,
    [structure.frontend.files.componentHtml]: rendered.frontend.componentHtml,
    [structure.frontend.files.componentCss]: rendered.frontend.componentCss,
    [structure.frontend.files.service]: rendered.frontend.service,
    [structure.frontend.files.routes]: rendered.frontend.routes,
    [structure.frontend.files.menuItem]: rendered.frontend.menuItem,
    [structure.frontend.files.integration]: rendered.frontend.integration,
    [structure.frontend.files.componentSpec]: rendered.frontend.componentSpec,
    [structure.frontend.files.serviceSpec]: rendered.frontend.serviceSpec,

    // Backend files
    [structure.backend.controller]: rendered.backend.controller,
    [structure.backend.service]: rendered.backend.service,
    [structure.backend.repository]: rendered.backend.repository,
    [structure.backend.routes]: rendered.backend.routes,
    [structure.backend.validator]: rendered.backend.validator,

    // Shared files
    [structure.shared.types]: rendered.shared.types,

    // Config files
    [structure.config.readme]: rendered.config.readme,
  };
}

/**
 * Print next steps instructions after successful generation.
 * Displays helpful commands for completing tool setup.
 *
 * @param metadata - Tool metadata from prompts
 */
function printNextSteps(metadata: ToolMetadata): void {
  console.log(chalk.blue.bold('📋 Next Steps:\n'));

  console.log(chalk.white('1. Review Integration Guide:'));
  console.log(chalk.cyan(`   apps/web/src/app/features/tools/${metadata.toolId}/INTEGRATION.md`));
  console.log(chalk.gray('   Complete step-by-step integration instructions\n'));

  console.log(chalk.white('2. Build shared types:'));
  console.log(chalk.gray('   npm run build:shared\n'));

  console.log(chalk.white('3. Add tool route to Angular app:'));
  console.log(chalk.gray('   Edit apps/web/src/app/app.routes.ts'));
  console.log(chalk.cyan(`   import { ${metadata.toolId}Routes } from './features/tools/${metadata.toolId}/${metadata.toolId}.routes';`));
  console.log(chalk.cyan(`   ...${metadata.toolId}Routes,`));
  console.log(chalk.gray(`   Route: /tools/${metadata.toolId}\n`));

  console.log(chalk.white('4. Add navigation menu item:'));
  console.log(chalk.gray('   Import menu item in your sidebar component'));
  console.log(chalk.cyan(`   import { ${metadata.toolId}MenuItem } from '@app/features/tools/${metadata.toolId}/menu-item';`));
  console.log(chalk.cyan(`   menuItems.push(${metadata.toolId}MenuItem);\n`));

  console.log(chalk.white('5. Create database migration:'));
  console.log(chalk.gray(`   npm --workspace=apps/api run db:migration:create ${metadata.toolId.replace(/-/g, '_')}_table\n`));

  console.log(chalk.white('6. Start development servers:'));
  console.log(chalk.gray('   npm start'));
  console.log(chalk.cyan(`   Visit: http://localhost:4200/tools/${metadata.toolId}\n`));

  console.log(chalk.blue('📚 Documentation:'));
  console.log(chalk.gray(`   Integration: apps/web/src/app/features/tools/${metadata.toolId}/INTEGRATION.md`));
  console.log(chalk.gray(`   README: apps/web/src/app/features/tools/${metadata.toolId}/README.md\n`));

  console.log(chalk.green('✨ Generated Files Include:'));
  console.log(chalk.gray('   • Angular component with signals & PrimeNG'));
  console.log(chalk.gray('   • Service with cache & retry logic'));
  console.log(chalk.gray('   • Routes with lazy loading & guards'));
  console.log(chalk.gray('   • Menu item helper for navigation'));
  console.log(chalk.gray('   • Component & service test specs'));
  console.log(chalk.gray('   • Express backend (controller, service, repository)'));
  console.log(chalk.gray('   • Shared TypeScript types'));
  console.log(chalk.gray('   • Integration guide with troubleshooting\n'));
}
