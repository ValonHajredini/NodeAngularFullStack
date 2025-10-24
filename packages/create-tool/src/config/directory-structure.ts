/**
 * Directory Structure Configuration
 *
 * Defines file paths and directory structure for generated tool files.
 * Maps template outputs to actual file system locations following
 * NodeAngularFullStack architecture conventions.
 *
 * @module config/directory-structure
 * @example
 * ```typescript
 * import { getDirectoryStructure } from './config/directory-structure.js';
 *
 * const structure = getDirectoryStructure({ toolId: 'inventory-tracker', ... });
 * console.log(structure.frontend.files.component);
 * // /path/to/apps/web/src/app/features/tools/inventory-tracker/inventory-tracker.component.ts
 * ```
 */

import path from 'path';

/**
 * Tool metadata interface (subset of prompts metadata).
 * Only includes fields needed for directory structure generation.
 */
export interface ToolMetadata {
  /** Kebab-case tool identifier */
  toolId: string;
  /** Display name of the tool */
  toolName: string;
  /** Brief description */
  description: string;
  /** PrimeNG icon name */
  icon: string;
  /** Tool version */
  version: string;
  /** Required permissions */
  permissions: string[];
  /** Selected features */
  features: string[];
}

/**
 * Directory structure with all file paths for tool generation.
 * Organized by section (frontend, backend, shared, config).
 */
export interface DirectoryStructure {
  /** Frontend file paths (Angular application) */
  frontend: {
    /** Base directory for tool */
    base: string;
    /** File paths for frontend files */
    files: {
      /** Component TypeScript file */
      component: string;
      /** Component HTML template */
      componentHtml: string;
      /** Component CSS styles */
      componentCss: string;
      /** Frontend service file */
      service: string;
      /** Angular routes file */
      routes: string;
      /** Navigation menu item helper */
      menuItem: string;
      /** Integration instructions */
      integration: string;
      /** Component test spec file */
      componentSpec: string;
      /** Service test spec file */
      serviceSpec: string;
    };
  };
  /** Backend file paths (Express.js API) */
  backend: {
    /** Controller file path */
    controller: string;
    /** Backend service file path */
    service: string;
    /** Repository file path */
    repository: string;
    /** Routes file path */
    routes: string;
    /** Validator file path */
    validator: string;
  };
  /** Shared types file path */
  shared: {
    /** TypeScript types file */
    types: string;
  };
  /** Configuration files */
  config: {
    /** README documentation */
    readme: string;
  };
}

/**
 * Get directory structure configuration for tool generation.
 * Calculates all file paths based on toolId and workspace structure.
 *
 * Path conventions:
 * - Frontend: `apps/web/src/app/features/tools/{toolId}/`
 * - Backend: `apps/api/src/{controllers,services,repositories,routes,validators}/`
 * - Shared: `packages/shared/src/types/`
 *
 * @param metadata - Tool metadata from prompts
 * @returns Directory structure with all file paths
 *
 * @example
 * ```typescript
 * const structure = getDirectoryStructure({
 *   toolId: 'inventory-tracker',
 *   toolName: 'Inventory Tracker',
 *   description: 'Track inventory items',
 *   icon: 'pi-box',
 *   version: '1.0.0',
 *   permissions: ['user'],
 *   features: ['backend', 'component']
 * });
 *
 * console.log(structure.frontend.base);
 * // /absolute/path/to/apps/web/src/app/features/tools/inventory-tracker
 *
 * console.log(structure.backend.controller);
 * // /absolute/path/to/apps/api/src/controllers/inventory-tracker.controller.ts
 * ```
 */
export function getDirectoryStructure(metadata: ToolMetadata): DirectoryStructure {
  const { toolId } = metadata;

  // Resolve workspace root (assuming CLI is in packages/create-tool)
  // __dirname = /path/to/packages/create-tool/dist/config
  // Go up 4 levels: dist -> create-tool -> packages -> workspace-root
  const workspaceRoot = path.resolve(__dirname, '../../../../');

  // Frontend paths (feature-based architecture)
  const frontendBase = path.join(workspaceRoot, 'apps/web/src/app/features/tools', toolId);

  return {
    frontend: {
      base: frontendBase,
      files: {
        component: path.join(frontendBase, `${toolId}.component.ts`),
        componentHtml: path.join(frontendBase, `${toolId}.component.html`),
        componentCss: path.join(frontendBase, `${toolId}.component.css`),
        service: path.join(frontendBase, 'services', `${toolId}.service.ts`),
        routes: path.join(frontendBase, `${toolId}.routes.ts`),
        menuItem: path.join(frontendBase, 'menu-item.ts'),
        integration: path.join(frontendBase, 'INTEGRATION.md'),
        componentSpec: path.join(frontendBase, `${toolId}.component.spec.ts`),
        serviceSpec: path.join(frontendBase, 'services', `${toolId}.service.spec.ts`),
      },
    },
    backend: {
      // Backend files are flat (no nested directories per tool)
      controller: path.join(workspaceRoot, 'apps/api/src/controllers', `${toolId}.controller.ts`),
      service: path.join(workspaceRoot, 'apps/api/src/services', `${toolId}.service.ts`),
      repository: path.join(workspaceRoot, 'apps/api/src/repositories', `${toolId}.repository.ts`),
      routes: path.join(workspaceRoot, 'apps/api/src/routes', `${toolId}.routes.ts`),
      validator: path.join(workspaceRoot, 'apps/api/src/validators', `${toolId}.validator.ts`),
    },
    shared: {
      // Shared types (single file per tool)
      types: path.join(workspaceRoot, 'packages/shared/src/types', `${toolId}.types.ts`),
    },
    config: {
      // README in frontend directory
      readme: path.join(frontendBase, 'README.md'),
    },
  };
}

/**
 * Get all unique directory paths from directory structure.
 * Extracts parent directories from all file paths.
 *
 * @param structure - Directory structure from getDirectoryStructure
 * @returns Array of unique directory paths to create
 *
 * @example
 * ```typescript
 * const structure = getDirectoryStructure(metadata);
 * const dirs = getUniqueDirs(structure);
 * // [
 * //   '/path/to/apps/web/src/app/features/tools/inventory-tracker',
 * //   '/path/to/apps/web/src/app/features/tools/inventory-tracker/services',
 * //   '/path/to/apps/api/src/controllers',
 * //   '/path/to/apps/api/src/services',
 * //   ...
 * // ]
 * ```
 */
export function getUniqueDirs(structure: DirectoryStructure): string[] {
  const dirs = new Set<string>();

  // Frontend directories
  dirs.add(structure.frontend.base);
  dirs.add(path.dirname(structure.frontend.files.service)); // services subdirectory

  // Backend directories (files are flat, just need parent dirs)
  dirs.add(path.dirname(structure.backend.controller));
  dirs.add(path.dirname(structure.backend.service));
  dirs.add(path.dirname(structure.backend.repository));
  dirs.add(path.dirname(structure.backend.routes));
  dirs.add(path.dirname(structure.backend.validator));

  // Shared directories
  dirs.add(path.dirname(structure.shared.types));

  // Config directories (README is in frontend base, already added)

  return Array.from(dirs);
}

/**
 * Get all file paths from directory structure as flat array.
 * Useful for conflict detection and file iteration.
 *
 * @param structure - Directory structure from getDirectoryStructure
 * @returns Array of all file paths
 *
 * @example
 * ```typescript
 * const structure = getDirectoryStructure(metadata);
 * const allFiles = getAllFilePaths(structure);
 * // [
 * //   '/path/to/apps/web/.../inventory-tracker.component.ts',
 * //   '/path/to/apps/web/.../inventory-tracker.component.html',
 * //   ...
 * // ]
 * ```
 */
export function getAllFilePaths(structure: DirectoryStructure): string[] {
  return [
    // Frontend files
    structure.frontend.files.component,
    structure.frontend.files.componentHtml,
    structure.frontend.files.componentCss,
    structure.frontend.files.service,
    structure.frontend.files.routes,
    structure.frontend.files.menuItem,
    structure.frontend.files.integration,
    structure.frontend.files.componentSpec,
    structure.frontend.files.serviceSpec,
    // Backend files
    structure.backend.controller,
    structure.backend.service,
    structure.backend.repository,
    structure.backend.routes,
    structure.backend.validator,
    // Shared files
    structure.shared.types,
    // Config files
    structure.config.readme,
  ];
}
