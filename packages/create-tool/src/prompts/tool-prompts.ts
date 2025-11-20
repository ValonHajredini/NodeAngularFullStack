/**
 * Tool Metadata Prompts
 *
 * Interactive Inquirer.js prompts for collecting tool metadata.
 * Used by create-tool CLI to gather user input for tool generation.
 *
 * Features:
 * - Tool name and description input
 * - Auto-generated kebab-case tool ID
 * - Icon selection from PrimeNG icons
 * - Feature and permission selection
 * - Confirmation step with summary
 *
 * @module prompts/tool-prompts
 * @example
 * ```typescript
 * import { promptForToolMetadata } from './prompts/tool-prompts.js';
 *
 * const metadata = await promptForToolMetadata();
 * if (metadata.confirm) {
 *   // Generate tool files
 * }
 * ```
 */

import inquirer from 'inquirer';
import {
  toKebabCase,
  validateToolId,
  validateToolName,
  generateDefaultId,
} from '../utils/string-helpers.js';

/**
 * Tool metadata collected from prompts.
 * Contains all information needed for tool generation.
 */
export interface ToolMetadata {
  /** Display name of the tool */
  toolName: string;
  /** Kebab-case identifier */
  toolId: string;
  /** Brief description of the tool */
  description: string;
  /** PrimeNG icon name */
  icon: string;
  /** Selected features for generation */
  features: string[];
  /** Required permissions */
  permissions: string[];
  /** User confirmation to proceed */
  confirm: boolean;
  /** Tool version (always 1.0.0 for new tools) */
  version: string;
  /** Frontend route path */
  route: string;
  /** Backend API base path */
  apiBase: string;
}

/**
 * Prompts user for tool metadata using interactive CLI prompts.
 *
 * Collects:
 * - Tool name and auto-generated ID
 * - Description and icon selection
 * - Feature and permission choices
 * - Confirmation before generation
 *
 * @param initialName - Optional tool name from CLI argument
 * @returns Promise containing complete tool metadata
 * @throws {Error} When user cancels prompt or validation fails
 *
 * @example
 * ```typescript
 * // With initial name
 * const metadata = await promptForToolMetadata('My Tool');
 *
 * // Without initial name (will prompt)
 * const metadata = await promptForToolMetadata();
 * ```
 */
export async function promptForToolMetadata(
  initialName?: string
): Promise<ToolMetadata> {
  // Check if running in TTY environment
  if (!process.stdin.isTTY) {
    throw new Error('Interactive prompts require a TTY environment');
  }

  const answers = await inquirer.prompt([
    // Task 3: Tool Name Prompt
    {
      type: 'input',
      name: 'toolName',
      message: "What is your tool name? (e.g., 'My Awesome Tool')",
      default: initialName,
      when: !initialName, // Skip if name provided as argument
      validate: validateToolName,
      filter: (input: string) => input.trim(),
    },

    // Task 4: Tool ID Generation Prompt
    {
      type: 'input',
      name: 'toolId',
      message: 'Tool ID (kebab-case):',
      default: (answers: Partial<ToolMetadata>) => {
        const name = answers.toolName || initialName || '';
        return generateDefaultId(name);
      },
      validate: validateToolId,
      filter: (input: string) => input.trim().toLowerCase(),
      transformer: (input: string) => {
        // Show preview of kebab-case conversion
        return toKebabCase(input);
      },
    },

    // Task 5: Description Prompt
    {
      type: 'input',
      name: 'description',
      message: 'Brief description (optional):',
      default: '',
      validate: (input: string) => {
        if (input && input.trim().length > 0 && input.trim().length < 10) {
          return 'Description must be at least 10 characters if provided';
        }
        if (input.length > 500) {
          return 'Description cannot exceed 500 characters';
        }
        return true;
      },
      filter: (input: string) => input.trim(),
    },

    // Task 6: Icon Selection Prompt
    {
      type: 'list',
      name: 'icon',
      message: 'Select an icon for your tool:',
      choices: [
        { name: '📦  Generic Tool (pi-box)', value: 'pi-box' },
        { name: '💼  Business (pi-briefcase)', value: 'pi-briefcase' },
        { name: '📊  Analytics (pi-chart-bar)', value: 'pi-chart-bar' },
        { name: '🗄️  Database (pi-database)', value: 'pi-database' },
        { name: '📄  Document (pi-file)', value: 'pi-file' },
        { name: '🏠  Dashboard (pi-home)', value: 'pi-home' },
        { name: '🛒  E-commerce (pi-shopping-cart)', value: 'pi-shopping-cart' },
        { name: '👤  User Management (pi-user)', value: 'pi-user' },
        { name: '👥  Team Management (pi-users)', value: 'pi-users' },
        { name: '⚙️  Settings (pi-cog)', value: 'pi-cog' },
        { name: '📅  Calendar (pi-calendar)', value: 'pi-calendar' },
        { name: '🗺️  Location (pi-map)', value: 'pi-map' },
        { name: '📥  Inbox (pi-inbox)', value: 'pi-inbox' },
        { name: '💵  Finance (pi-money-bill)', value: 'pi-money-bill' },
        { name: '📋  Catalog (pi-th-large)', value: 'pi-th-large' },
      ],
      default: 'pi-box',
    },

    // Task 7: Feature Selection Prompt
    {
      type: 'checkbox',
      name: 'features',
      message: 'Select features to include:',
      choices: [
        {
          name: 'Backend API endpoints',
          value: 'backend',
          checked: true,
        },
        {
          name: 'Database repository layer',
          value: 'database',
          checked: true,
        },
        {
          name: 'Angular service layer',
          value: 'service',
          checked: true,
        },
        {
          name: 'Sample component with routing',
          value: 'component',
          checked: true,
        },
        {
          name: 'Unit tests',
          value: 'tests',
          checked: false,
        },
        {
          name: 'Integration tests',
          value: 'integrationTests',
          checked: false,
        },
      ],
      validate: (choices: string[]) => {
        if (choices.length === 0) {
          return 'Please select at least one feature';
        }
        return true;
      },
    },

    // Task 8: Permission Selection Prompt
    {
      type: 'checkbox',
      name: 'permissions',
      message: 'Required permissions (optional):',
      choices: [
        { name: 'Admin', value: 'admin' },
        { name: 'User', value: 'user', checked: true },
        { name: 'ReadOnly', value: 'readonly' },
      ],
      default: ['user'],
    },

    // Task 9: Confirmation Prompt
    {
      type: 'confirm',
      name: 'confirm',
      message: (answers: Partial<ToolMetadata>) => {
        const toolName = answers.toolName || initialName || '';
        const toolId = answers.toolId || '';
        const description = answers.description || '(none)';
        const icon = answers.icon || '';
        const permissions =
          answers.permissions && answers.permissions.length > 0
            ? answers.permissions.join(', ')
            : '(public - no restrictions)';
        const features =
          answers.features && answers.features.length > 0
            ? answers.features.join(', ')
            : '';

        return `\n
📋 Tool Summary:
   Name: ${toolName}
   ID: ${toolId}
   Description: ${description}
   Icon: ${icon}
   Permissions: ${permissions}
   Features: ${features}

   Route: /tools/${toolId}
   API Base: /api/tools/${toolId}

Proceed with generation?`;
      },
      default: true,
    },
  ]);

  // Set toolName if it was provided as initial argument
  const toolName = answers.toolName || initialName || '';
  const toolId = answers.toolId || '';
  const description = answers.description || '';
  const icon = answers.icon || 'pi-box';
  const features = answers.features || [];
  const permissions = answers.permissions || [];
  const confirm = answers.confirm ?? true;

  // Generate auto-calculated fields and return complete metadata
  const metadata: ToolMetadata = {
    toolName,
    toolId,
    description,
    icon,
    features,
    permissions,
    confirm,
    version: '1.0.0', // Always 1.0.0 for new tools
    route: `/tools/${toolId}`,
    apiBase: `/api/tools/${toolId}`,
  };

  return metadata;
}
