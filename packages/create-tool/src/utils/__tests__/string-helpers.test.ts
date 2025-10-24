/**
 * String Helpers Test Suite
 *
 * Comprehensive tests for string manipulation and validation utilities.
 * Tests all name conversion functions and validation logic.
 */

import {
  toKebabCase,
  validateToolId,
  validateToolName,
  generateDefaultId,
  toPascalCase,
  toCamelCase,
  toSnakeCase,
} from '../string-helpers';

describe('toKebabCase', () => {
  test('should convert spaces to hyphens', () => {
    expect(toKebabCase('My Awesome Tool')).toBe('my-awesome-tool');
  });

  test('should convert underscores to hyphens', () => {
    expect(toKebabCase('inventory_tracker')).toBe('inventory-tracker');
  });

  test('should handle camelCase', () => {
    expect(toKebabCase('UserProfile')).toBe('user-profile');
    expect(toKebabCase('myTool')).toBe('my-tool');
  });

  test('should handle multiple spaces', () => {
    expect(toKebabCase('  Spaced   Out  ')).toBe('spaced-out');
  });

  test('should remove special characters', () => {
    expect(toKebabCase('My@Tool!')).toBe('my-tool'); // My@Tool! → MyTool → My-Tool → my-tool
  });

  test('should remove leading/trailing hyphens', () => {
    expect(toKebabCase('-my-tool-')).toBe('my-tool');
  });
});

describe('validateToolId', () => {
  describe('valid tool IDs', () => {
    test('should accept valid kebab-case IDs', () => {
      expect(validateToolId('my-tool')).toBe(true);
      expect(validateToolId('user-profile')).toBe(true);
      expect(validateToolId('inventory-tracker-2024')).toBe(true);
    });

    test('should accept IDs with numbers', () => {
      expect(validateToolId('tool-123')).toBe(true);
      expect(validateToolId('v2-tool')).toBe(true);
    });

    test('should accept minimum length (2 chars)', () => {
      expect(validateToolId('ab')).toBe(true);
    });

    test('should accept maximum length (50 chars)', () => {
      const longId = 'a' + '-'.repeat(48) + 'b'; // 50 chars total
      expect(validateToolId(longId)).toBe(true);
    });
  });

  describe('invalid tool IDs - length', () => {
    test('should reject too short IDs', () => {
      expect(validateToolId('a')).toBe('Tool ID must be 2-50 characters');
      expect(validateToolId('')).toBe('Tool ID must be 2-50 characters');
    });

    test('should reject too long IDs', () => {
      const tooLong = 'a'.repeat(51);
      expect(validateToolId(tooLong)).toBe('Tool ID must be 2-50 characters');
    });
  });

  describe('invalid tool IDs - format', () => {
    test('should reject IDs not starting with letter', () => {
      expect(validateToolId('123-tool')).toBe('Tool ID must start with a lowercase letter');
      expect(validateToolId('-my-tool')).toBe('Tool ID must start with a lowercase letter');
    });

    test('should reject uppercase letters', () => {
      expect(validateToolId('MyTool')).toBe('Tool ID must start with a lowercase letter');
      expect(validateToolId('mY-Tool')).toBe('Tool ID must be lowercase kebab-case (e.g., "my-tool")');
    });

    test('should reject underscores', () => {
      expect(validateToolId('my_tool')).toBe('Tool ID must be lowercase kebab-case (e.g., "my-tool")');
    });

    test('should reject spaces', () => {
      expect(validateToolId('my tool')).toBe('Tool ID must be lowercase kebab-case (e.g., "my-tool")');
    });

    test('should reject special characters', () => {
      expect(validateToolId('my@tool')).toBe('Tool ID must be lowercase kebab-case (e.g., "my-tool")');
      expect(validateToolId('my.tool')).toBe('Tool ID must be lowercase kebab-case (e.g., "my-tool")');
    });
  });
});

describe('validateToolName', () => {
  describe('valid tool names', () => {
    test('should accept names with minimum length', () => {
      expect(validateToolName('ABC')).toBe(true);
      expect(validateToolName('My Tool')).toBe(true);
    });

    test('should accept names with spaces', () => {
      expect(validateToolName('My Awesome Tool')).toBe(true);
    });

    test('should accept names with numbers and special characters', () => {
      expect(validateToolName('Tool 2024')).toBe(true);
      expect(validateToolName('User Profile & Settings')).toBe(true);
    });

    test('should accept maximum length (50 chars)', () => {
      const longName = 'A'.repeat(50);
      expect(validateToolName(longName)).toBe(true);
    });

    test('should trim whitespace before validation', () => {
      expect(validateToolName('   My Tool   ')).toBe(true);
    });
  });

  describe('invalid tool names', () => {
    test('should reject too short names', () => {
      expect(validateToolName('AB')).toBe('Tool name must be at least 3 characters');
      expect(validateToolName('A')).toBe('Tool name must be at least 3 characters');
      expect(validateToolName('')).toBe('Tool name must be at least 3 characters');
    });

    test('should reject whitespace-only names', () => {
      expect(validateToolName('   ')).toBe('Tool name must be at least 3 characters');
      expect(validateToolName('\t\n')).toBe('Tool name must be at least 3 characters');
    });

    test('should reject too long names', () => {
      const tooLong = 'A'.repeat(51);
      expect(validateToolName(tooLong)).toBe('Tool name cannot exceed 50 characters');
    });

    test('should reject names that become too short after trimming', () => {
      expect(validateToolName('  AB  ')).toBe('Tool name must be at least 3 characters');
    });
  });
});

describe('generateDefaultId', () => {
  test('should generate kebab-case ID from name', () => {
    expect(generateDefaultId('My Awesome Tool')).toBe('my-awesome-tool');
    expect(generateDefaultId('UserProfile')).toBe('user-profile');
  });

  test('should handle names with special characters', () => {
    expect(generateDefaultId('User & Profile')).toBe('user-profile');
  });
});

describe('toPascalCase', () => {
  test('should convert kebab-case to PascalCase', () => {
    expect(toPascalCase('my-tool')).toBe('MyTool');
    expect(toPascalCase('user-profile')).toBe('UserProfile');
  });

  test('should convert snake_case to PascalCase', () => {
    expect(toPascalCase('inventory_tracker')).toBe('InventoryTracker');
  });

  test('should convert spaces to PascalCase', () => {
    expect(toPascalCase('inventory tracker')).toBe('InventoryTracker');
  });

  test('should handle camelCase input', () => {
    expect(toPascalCase('myTool')).toBe('MyTool');
  });

  test('should remove special characters', () => {
    expect(toPascalCase('my@tool!')).toBe('Mytool'); // my@tool! → mytool → Mytool
  });

  test('should capitalize first letter', () => {
    expect(toPascalCase('tool')).toBe('Tool');
  });
});

describe('toCamelCase', () => {
  test('should convert kebab-case to camelCase', () => {
    expect(toCamelCase('my-tool')).toBe('myTool');
    expect(toCamelCase('user-profile')).toBe('userProfile');
  });

  test('should convert snake_case to camelCase', () => {
    expect(toCamelCase('inventory_tracker')).toBe('inventoryTracker');
  });

  test('should convert spaces to camelCase', () => {
    expect(toCamelCase('inventory tracker')).toBe('inventoryTracker');
  });

  test('should handle PascalCase input', () => {
    expect(toCamelCase('MyTool')).toBe('myTool');
  });

  test('should lowercase first letter', () => {
    expect(toCamelCase('Tool')).toBe('tool');
  });
});

describe('toSnakeCase', () => {
  test('should convert kebab-case to snake_case', () => {
    expect(toSnakeCase('my-tool')).toBe('my_tool');
    expect(toSnakeCase('user-profile')).toBe('user_profile');
  });

  test('should convert PascalCase to snake_case', () => {
    expect(toSnakeCase('MyTool')).toBe('my_tool');
    expect(toSnakeCase('UserProfile')).toBe('user_profile');
  });

  test('should convert camelCase to snake_case', () => {
    expect(toSnakeCase('myTool')).toBe('my_tool');
    expect(toSnakeCase('userProfile')).toBe('user_profile');
  });

  test('should convert spaces to underscores', () => {
    expect(toSnakeCase('inventory tracker')).toBe('inventory_tracker');
  });

  test('should remove leading/trailing underscores', () => {
    expect(toSnakeCase('_my_tool_')).toBe('my_tool');
  });

  test('should handle multiple consecutive separators', () => {
    expect(toSnakeCase('my---tool')).toBe('my_tool');
  });
});

describe('edge cases', () => {
  test('should handle empty strings', () => {
    expect(toKebabCase('')).toBe('');
    expect(toPascalCase('')).toBe('');
    expect(toCamelCase('')).toBe('');
    expect(toSnakeCase('')).toBe('');
  });

  test('should handle single character', () => {
    expect(toPascalCase('a')).toBe('A');
    expect(toCamelCase('a')).toBe('a');
    expect(toSnakeCase('a')).toBe('a');
  });

  test('should handle numbers only', () => {
    expect(toKebabCase('123')).toBe('123');
    expect(toPascalCase('123')).toBe('123');
  });

  test('should handle mixed case with numbers', () => {
    expect(toPascalCase('tool123')).toBe('Tool123');
    expect(toCamelCase('Tool123')).toBe('tool123');
  });
});
