/**
 * Template Loader Module
 *
 * Handles loading and rendering EJS templates with comprehensive error handling.
 * Provides user-friendly error messages and recovery suggestions.
 *
 * @module templates/template-loader
 * @example
 * ```typescript
 * import { loadTemplate, renderTemplate, renderTemplateFile } from './templates/template-loader.js';
 *
 * // Load template
 * const template = await loadTemplate('frontend/component.ts.ejs');
 *
 * // Render template
 * const rendered = renderTemplate(template, { toolName: 'MyTool' });
 *
 * // Load and render in one step
 * const output = await renderTemplateFile('frontend/component.ts.ejs', { toolName: 'MyTool' });
 * ```
 */

import fs from 'fs/promises';
import path from 'path';
import ejs from 'ejs';

/**
 * Custom error for template not found scenarios.
 */
export class TemplateNotFoundError extends Error {
  constructor(templateName: string, templatePath: string) {
    const suggestion = `
Suggestion: Check that the template file exists at ${templatePath}
Available templates can be found in: ${path.dirname(templatePath)}`;

    super(`Template '${templateName}' not found at ${templatePath}${suggestion}`);
    this.name = 'TemplateNotFoundError';
  }
}

/**
 * Custom error for missing required template variables.
 */
export class MissingVariableError extends Error {
  constructor(variableName: string, requiredVars: string[]) {
    const varList = requiredVars.join(', ');
    super(
      `Required variable '${variableName}' is undefined in template.\nRequired variables: ${varList}`
    );
    this.name = 'MissingVariableError';
  }
}

/**
 * Custom error for EJS syntax errors in templates.
 */
export class EJSSyntaxError extends Error {
  constructor(lineNumber: number | undefined, originalError: string, context?: string) {
    const lineInfo = lineNumber ? ` at line ${lineNumber}` : '';
    const contextInfo = context ? `\nContext: ${context}` : '';
    super(`Template syntax error${lineInfo}: ${originalError}${contextInfo}`);
    this.name = 'EJSSyntaxError';
  }
}

/**
 * Custom error for file permission issues.
 */
export class FilePermissionError extends Error {
  constructor(filePath: string, reason: string) {
    super(`Cannot read template file: ${reason}\nFile: ${filePath}\nCheck file permissions and access rights.`);
    this.name = 'FilePermissionError';
  }
}

/**
 * Load EJS template file from templates directory.
 *
 * @param templatePath - Relative path to template (e.g., "frontend/component.ts.ejs")
 * @returns Promise containing template content
 * @throws {TemplateNotFoundError} When template file doesn't exist
 * @throws {FilePermissionError} When file cannot be read due to permissions
 *
 * @example
 * ```typescript
 * const template = await loadTemplate('frontend/component.ts.ejs');
 * ```
 */
export async function loadTemplate(templatePath: string): Promise<string> {
  const fullPath = path.join(__dirname, templatePath);

  try {
    return await fs.readFile(fullPath, 'utf-8');
  } catch (error: any) {
    // Check specific error types
    if (error.code === 'ENOENT') {
      throw new TemplateNotFoundError(templatePath, fullPath);
    } else if (error.code === 'EACCES' || error.code === 'EPERM') {
      throw new FilePermissionError(fullPath, error.message);
    } else {
      // Generic file read error
      throw new Error(`Failed to load template '${templatePath}': ${error.message}`);
    }
  }
}

/**
 * Render EJS template with provided data.
 *
 * @param template - EJS template string
 * @param data - Template variables object
 * @returns Rendered content as string
 * @throws {EJSSyntaxError} When template has syntax errors
 * @throws {MissingVariableError} When required variables are undefined
 *
 * @example
 * ```typescript
 * const rendered = renderTemplate('<%= toolName %>', { toolName: 'MyTool' });
 * // Output: 'MyTool'
 * ```
 */
export function renderTemplate(template: string, data: any): string {
  try {
    return ejs.render(template, data, {
      rmWhitespace: false, // Preserve formatting
      strict: false, // Allow undefined variables (we'll check manually if needed)
      async: false,
    });
  } catch (error: any) {
    // Parse EJS error for better error messages
    if (error.message && error.message.includes('is not defined')) {
      // Extract variable name from error message
      const match = error.message.match(/(\w+) is not defined/);
      const varName = match ? match[1] : 'unknown';
      const requiredVars = Object.keys(data || {});
      throw new MissingVariableError(varName, requiredVars);
    } else {
      // EJS syntax error
      const lineNumber = error.line;
      const context = error.message?.substring(0, 100);
      throw new EJSSyntaxError(lineNumber, error.message, context);
    }
  }
}

/**
 * Load and render template in one step.
 * Convenience function combining loadTemplate and renderTemplate.
 *
 * @param templatePath - Relative template path (e.g., "frontend/component.ts.ejs")
 * @param data - Template variables object
 * @returns Promise containing rendered content
 * @throws {TemplateNotFoundError} When template file doesn't exist
 * @throws {EJSSyntaxError} When template has syntax errors
 * @throws {MissingVariableError} When required variables are undefined
 *
 * @example
 * ```typescript
 * const output = await renderTemplateFile('frontend/component.ts.ejs', {
 *   toolId: 'my-tool',
 *   toolName: 'My Tool',
 *   className: 'MyTool'
 * });
 * ```
 */
export async function renderTemplateFile(
  templatePath: string,
  data: any
): Promise<string> {
  const template = await loadTemplate(templatePath);
  return renderTemplate(template, data);
}

/**
 * Get list of available templates in a category.
 *
 * @param category - Template category ('frontend', 'backend', 'shared', 'config')
 * @returns Promise containing array of template filenames
 *
 * @example
 * ```typescript
 * const frontendTemplates = await getAvailableTemplates('frontend');
 * // ['component.ts.ejs', 'service.ts.ejs', ...]
 * ```
 */
export async function getAvailableTemplates(category: string): Promise<string[]> {
  const categoryPath = path.join(__dirname, category);

  try {
    const files = await fs.readdir(categoryPath);
    return files.filter((file) => file.endsWith('.ejs'));
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return []; // Category doesn't exist, return empty array
    }
    throw error;
  }
}
