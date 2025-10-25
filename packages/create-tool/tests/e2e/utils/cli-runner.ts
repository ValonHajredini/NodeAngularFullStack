/**
 * CLI Runner Utility
 *
 * Executes the create-tool CLI programmatically for E2E testing.
 * Handles prompt answers, flags, output capture, and result validation.
 *
 * @module tests/e2e/utils/cli-runner
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

export interface CliOptions {
  /** Answers to provide to Inquirer prompts */
  answers?: Record<string, string | string[]>;
  /** CLI flags to pass (e.g., ['--register', '--force']) */
  flags?: string[];
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Working directory for CLI execution */
  cwd?: string;
  /** Environment variables to pass to CLI process */
  env?: Record<string, string>;
}

export interface CliResult {
  /** Process exit code (0 = success, non-zero = error) */
  exitCode: number | null;
  /** Standard output from CLI */
  stdout: string;
  /** Standard error from CLI */
  stderr: string;
  /** Execution duration in milliseconds */
  duration: number;
}

export class CliRunner {
  private cliPath: string;

  /**
   * Creates a new CLI runner.
   * @param cliPath - Path to CLI entry point (default: ./dist/index.js)
   */
  constructor(cliPath: string = './dist/index.js') {
    this.cliPath = path.resolve(cliPath);
  }

  /**
   * Executes the CLI with specified options.
   * @param options - CLI execution options
   * @returns Promise resolving to CLI execution result
   * @throws {Error} If CLI process fails to start or times out
   */
  async run(options: CliOptions = {}): Promise<CliResult> {
    const {
      answers = {},
      flags = [],
      timeout = 30000,
      cwd = process.cwd(),
      env = {},
    } = options;

    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      // Spawn CLI process
      const child = spawn('node', [this.cliPath, ...flags], {
        cwd,
        env: { ...process.env, ...env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      // Provide answers to Inquirer prompts
      this.provideAnswers(child, answers);

      // Capture stdout
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      // Capture stderr
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle process completion
      child.on('close', (exitCode) => {
        const duration = Date.now() - startTime;
        resolve({ exitCode, stdout, stderr, duration });
      });

      // Handle process errors
      child.on('error', (error) => {
        reject(new Error(`CLI process error: ${error.message}`));
      });

      // Timeout handling
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error(`CLI execution timeout after ${timeout}ms`));
      }, timeout);

      child.on('close', () => clearTimeout(timer));
    });
  }

  /**
   * Provides answers to Inquirer prompts.
   * Detects prompt questions and automatically provides answers.
   * @param child - Child process running CLI
   * @param answers - Prompt answers to provide
   */
  private provideAnswers(
    child: ChildProcess,
    answers: Record<string, string | string[]>
  ): void {
    child.stdout?.on('data', (data) => {
      const output = data.toString();

      // Tool name prompt
      if (output.includes('What is your tool name?')) {
        child.stdin?.write(`${answers.toolName || 'Test Tool'}\n`);
      }
      // Tool ID prompt
      else if (output.includes('Tool ID (kebab-case):')) {
        child.stdin?.write(`${answers.toolId || 'test-tool'}\n`);
      }
      // Description prompt
      else if (output.includes('Tool description:')) {
        child.stdin?.write(`${answers.description || 'A test tool'}\n`);
      }
      // Icon prompt
      else if (output.includes('Select an icon:')) {
        child.stdin?.write('\n'); // Use default
      }
      // Features prompt (checkbox)
      else if (output.includes('Select features:')) {
        const features = (answers.features as string[]) || [];
        features.forEach(() => child.stdin?.write(' ')); // Select features
        child.stdin?.write('\n'); // Confirm
      }
      // Permissions prompt (checkbox)
      else if (output.includes('Select permissions:')) {
        const permissions = (answers.permissions as string[]) || [];
        permissions.forEach(() => child.stdin?.write(' '));
        child.stdin?.write('\n');
      }
    });
  }

  /**
   * Asserts that CLI execution succeeded.
   * @param result - CLI execution result
   * @throws {Error} If exit code is non-zero
   */
  expectSuccess(result: CliResult): void {
    if (result.exitCode !== 0) {
      throw new Error(
        `Expected CLI success but got exit code ${result.exitCode}\n` +
          `Stdout: ${result.stdout}\n` +
          `Stderr: ${result.stderr}`
      );
    }
  }

  /**
   * Asserts that CLI execution failed.
   * @param result - CLI execution result
   * @param expectedMessage - Optional expected error message substring
   * @throws {Error} If exit code is zero or expected message not found
   */
  expectError(result: CliResult, expectedMessage?: string): void {
    if (result.exitCode === 0) {
      throw new Error('Expected CLI error but got success');
    }

    if (expectedMessage && !result.stderr.includes(expectedMessage)) {
      throw new Error(
        `Expected error message "${expectedMessage}" not found in stderr:\n${result.stderr}`
      );
    }
  }

  /**
   * Gets the exit code from CLI result.
   * @param result - CLI execution result
   * @returns Exit code
   */
  getExitCode(result: CliResult): number {
    return result.exitCode ?? -1;
  }
}
