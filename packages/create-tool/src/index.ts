#!/usr/bin/env node

/**
 * Create Tool CLI
 *
 * Command-line interface for scaffolding new tools in the NodeAngularFullStack platform.
 * Generates complete tool structure including frontend components, backend routes,
 * and automatic tool registration.
 *
 * @example
 * ```bash
 * npx @nodeangularfullstack/create-tool my-tool
 * npx @nodeangularfullstack/create-tool --help
 * ```
 *
 * @packageDocumentation
 */

// Load environment variables from .env file if exists
import dotenv from 'dotenv';
dotenv.config();

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { join } from 'path';
import { promptForToolMetadata } from './prompts/tool-prompts';
import { generateToolFiles } from './generator/file-generator';

/**
 * Read package version from package.json
 */
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

/**
 * Main CLI program instance.
 * Configures Commander.js and executes the create tool workflow.
 */
const program = new Command();

program
  .name('create-tool')
  .version(packageJson.version)
  .description('Scaffold new tools for NodeAngularFullStack platform')
  .usage('[options] [tool-name]')
  .helpOption('-h, --help', 'Display help for command')
  .argument('[tool-name]', 'Name of the tool to create (optional - will prompt if not provided)')
  .option('--force', 'Overwrite existing files')
  .option('--skip-existing', 'Skip existing files')
  .option('--skip-registration', 'Skip automatic tool registration with API')
  .option('--api-url <url>', 'Custom API base URL (default: http://localhost:3000)')
  .option('--admin-email <email>', 'Admin email for authentication')
  .option('--admin-password <password>', 'Admin password for authentication')
  .action(async (
    toolName?: string,
    options?: {
      force?: boolean;
      skipExisting?: boolean;
      skipRegistration?: boolean;
      apiUrl?: string;
      adminEmail?: string;
      adminPassword?: string;
    }
  ) => {
    try {
      console.log('🛠️  Create Tool Wizard\n');

      // Prompt for tool metadata (pass toolName if provided as argument)
      const metadata = await promptForToolMetadata(toolName);

      // Check if user confirmed
      if (!metadata.confirm) {
        console.log('\n❌ Tool generation cancelled');
        process.exit(0);
      }

      // Generate tool files from templates
      const result = await generateToolFiles(metadata, {
        force: options?.force,
        skipExisting: options?.skipExisting,
        skipRegistration: options?.skipRegistration,
        apiUrl: options?.apiUrl,
        adminEmail: options?.adminEmail,
        adminPassword: options?.adminPassword,
      });

      // Exit with appropriate status code
      if (result.success) {
        process.exit(0);
      } else {
        console.error('❌ Generation failed:', result.errors.join('\n'));
        process.exit(1);
      }
    } catch (error) {
      // Handle Inquirer-specific errors
      if (error instanceof Error) {
        if (error.message.includes('User force closed')) {
          console.log('\n\n❌ Tool generation cancelled by user (Ctrl+C)');
          process.exit(0);
        } else if (error.message.includes('TTY environment')) {
          console.error('\n❌ Error:', error.message);
          console.error('Interactive prompts cannot run in this environment.');
          process.exit(1);
        } else {
          console.error('\n❌ An error occurred:', error.message);
          process.exit(1);
        }
      } else {
        console.error('\n❌ An unexpected error occurred:', error);
        process.exit(1);
      }
    }
  })
  .addHelpText(
    'after',
    `
Examples:
  $ create-tool                                    # Interactive mode (prompts for details)
  $ create-tool my-awesome-tool                    # Start with a tool name
  $ create-tool "Inventory Tracker"                # Tool name with spaces
  $ create-tool --force                            # Overwrite existing files
  $ create-tool --skip-existing                    # Skip existing files
  $ create-tool --skip-registration                # Generate files without API registration
  $ create-tool --api-url http://api.example.com   # Custom API server URL
  $ create-tool --admin-email admin@example.com    # Custom admin email
  $ create-tool --help                             # Show help
  $ create-tool --version                          # Show version

Environment Variables:
  CREATE_TOOL_API_URL          # API base URL (default: http://localhost:3000)
  CREATE_TOOL_ADMIN_EMAIL      # Admin email for authentication (default: admin@example.com)
  CREATE_TOOL_ADMIN_PASSWORD   # Admin password for authentication (required for registration)
    `
  );

/**
 * Error handling for uncaught exceptions
 */
process.on('uncaughtException', (error: Error) => {
  console.error('Error:', error.message);
  process.exit(1);
});

/**
 * Error handling for unhandled promise rejections
 */
process.on('unhandledRejection', (error: unknown) => {
  console.error('Error:', error);
  process.exit(1);
});

/**
 * Error handling for SIGINT (Ctrl+C)
 */
process.on('SIGINT', () => {
  console.log('\n\n❌ Tool generation cancelled');
  process.exit(0);
});

// Parse command-line arguments
program.parse(process.argv);
