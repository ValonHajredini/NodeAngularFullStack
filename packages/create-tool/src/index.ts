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

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { join } from 'path';
import { promptForToolMetadata } from './prompts/tool-prompts.js';

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
  .action(async (toolName?: string) => {
    try {
      console.log('🛠️  Create Tool Wizard\n');

      // Prompt for tool metadata (pass toolName if provided as argument)
      const metadata = await promptForToolMetadata(toolName);

      // Check if user confirmed
      if (!metadata.confirm) {
        console.log('\n❌ Tool generation cancelled');
        process.exit(0);
      }

      // TODO: Story 31.1.3 - Load and process EJS templates
      // TODO: Story 31.2.1 - Generate tool files from templates
      // TODO: Story 31.2.4 - Register tool in database via API

      console.log('\n✅ Tool metadata collected successfully!');
      console.log('📋 Collected metadata:');
      console.log(JSON.stringify(metadata, null, 2));
      console.log('\n💡 Note: File generation will be implemented in Story 31.1.3');
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
  $ create-tool                      # Interactive mode (will prompt for all details)
  $ create-tool my-awesome-tool      # Start with a tool name
  $ create-tool "Inventory Tracker"  # Tool name with spaces
  $ create-tool --help               # Show help
  $ create-tool --version            # Show version
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
