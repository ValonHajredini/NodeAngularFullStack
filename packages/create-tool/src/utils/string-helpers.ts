/**
 * String Helper Utilities
 *
 * Utility functions for string manipulation used in CLI prompts.
 * Includes kebab-case conversion and validation functions.
 *
 * @module utils/string-helpers
 * @example
 * ```typescript
 * import { toKebabCase, validateToolId } from './utils/string-helpers.js';
 *
 * const toolId = toKebabCase('My Awesome Tool'); // 'my-awesome-tool'
 * const isValid = validateToolId(toolId); // true
 * ```
 */

/**
 * Converts a string to kebab-case format.
 * Handles various input formats including spaces, underscores, and camelCase.
 *
 * @param str - Input string to convert
 * @returns Kebab-case formatted string
 *
 * @example
 * ```typescript
 * toKebabCase('My Awesome Tool');    // 'my-awesome-tool'
 * toKebabCase('UserProfile');        // 'user-profile'
 * toKebabCase('inventory_tracker');  // 'inventory-tracker'
 * toKebabCase('  Spaced Out  ');     // 'spaced-out'
 * ```
 */
export function toKebabCase(str: string): string {
  return str
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/([a-z])([A-Z])/g, '$1-$2') // Handle camelCase BEFORE lowercasing
    .toLowerCase()
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Validates a tool ID against required format rules.
 * Tool IDs must be lowercase kebab-case, start with a letter, and be 2-50 characters.
 *
 * @param id - Tool ID to validate
 * @returns true if valid, or error message string if invalid
 *
 * @example
 * ```typescript
 * validateToolId('my-tool');          // true
 * validateToolId('MyTool');           // 'Tool ID must be lowercase kebab-case...'
 * validateToolId('my_tool');          // 'Tool ID must be lowercase kebab-case...'
 * validateToolId('123-tool');         // 'Tool ID must start with a lowercase letter'
 * validateToolId('a');                // 'Tool ID must be 2-50 characters'
 * ```
 */
export function validateToolId(id: string): boolean | string {
  // Length check
  if (id.length < 2 || id.length > 50) {
    return 'Tool ID must be 2-50 characters';
  }

  // Must start with letter
  if (!/^[a-z]/.test(id)) {
    return 'Tool ID must start with a lowercase letter';
  }

  // Must be kebab-case (lowercase letters, numbers, hyphens only)
  if (!/^[a-z][a-z0-9-]*$/.test(id)) {
    return 'Tool ID must be lowercase kebab-case (e.g., "my-tool")';
  }

  return true; // Valid
}

/**
 * Validates a tool name against required format rules.
 * Tool names must be 3-50 characters and cannot be empty.
 *
 * @param name - Tool name to validate
 * @returns true if valid, or error message string if invalid
 *
 * @example
 * ```typescript
 * validateToolName('My Tool');        // true
 * validateToolName('AB');             // 'Tool name must be at least 3 characters'
 * validateToolName('   ');            // 'Tool name must be at least 3 characters'
 * validateToolName('A'.repeat(51));   // 'Tool name cannot exceed 50 characters'
 * ```
 */
export function validateToolName(name: string): boolean | string {
  const trimmed = name.trim();

  if (!trimmed || trimmed.length < 3) {
    return 'Tool name must be at least 3 characters';
  }

  if (trimmed.length > 50) {
    return 'Tool name cannot exceed 50 characters';
  }

  return true; // Valid
}

/**
 * Generates a default tool ID from a tool name.
 * Convenience function that applies kebab-case conversion.
 *
 * @param name - Tool name to convert
 * @returns Generated tool ID in kebab-case
 *
 * @example
 * ```typescript
 * generateDefaultId('My Awesome Tool');  // 'my-awesome-tool'
 * generateDefaultId('UserProfile');      // 'user-profile'
 * ```
 */
export function generateDefaultId(name: string): string {
  return toKebabCase(name);
}

/**
 * Converts a string to PascalCase format.
 * Handles various input formats including spaces, hyphens, underscores, and camelCase.
 *
 * @param str - Input string to convert
 * @returns PascalCase formatted string (first letter uppercase, no separators)
 *
 * @example
 * ```typescript
 * toPascalCase('my-tool');           // 'MyTool'
 * toPascalCase('user_profile');      // 'UserProfile'
 * toPascalCase('inventory tracker'); // 'InventoryTracker'
 * toPascalCase('myTool');            // 'MyTool'
 * ```
 */
export function toPascalCase(str: string): string {
  return str
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : '')) // Convert separators to uppercase next char
    .replace(/^(.)/, (char) => char.toUpperCase()); // Capitalize first letter
}

/**
 * Converts a string to camelCase format.
 * Handles various input formats including spaces, hyphens, underscores, and PascalCase.
 *
 * @param str - Input string to convert
 * @returns camelCase formatted string (first letter lowercase, no separators)
 *
 * @example
 * ```typescript
 * toCamelCase('my-tool');            // 'myTool'
 * toCamelCase('user_profile');       // 'userProfile'
 * toCamelCase('inventory tracker');  // 'inventoryTracker'
 * toCamelCase('MyTool');             // 'myTool'
 * ```
 */
export function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Converts a string to snake_case format.
 * Handles various input formats including spaces, hyphens, camelCase, and PascalCase.
 *
 * @param str - Input string to convert
 * @returns snake_case formatted string (lowercase with underscores)
 *
 * @example
 * ```typescript
 * toSnakeCase('my-tool');            // 'my_tool'
 * toSnakeCase('MyTool');             // 'my_tool'
 * toSnakeCase('myTool');             // 'my_tool'
 * toSnakeCase('inventory tracker');  // 'inventory_tracker'
 * ```
 */
export function toSnakeCase(str: string): string {
  return str
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/([a-z])([A-Z])/g, '$1_$2') // Handle camelCase/PascalCase
    .replace(/[\s-]+/g, '_') // Replace spaces and hyphens with underscores
    .toLowerCase()
    .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
}
