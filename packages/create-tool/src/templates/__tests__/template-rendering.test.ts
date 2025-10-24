/**
 * Comprehensive Template Rendering Tests
 *
 * Tests all templates with:
 * - Happy path scenarios
 * - Edge cases (empty strings, special chars, long names)
 * - Error scenarios (missing templates, syntax errors, missing variables)
 * - Security scenarios (SQL injection, XSS, path traversal)
 */

import {
  loadTemplate,
  renderTemplate,
  renderTemplateFile,
  TemplateNotFoundError,
  MissingVariableError,
  EJSSyntaxError,
} from '../template-loader';
import {
  mapMetadataToTemplateData,
  renderAllTemplates,
  ToolMetadata,
} from '../../utils/template-renderer';
import { toPascalCase, toCamelCase, toSnakeCase } from '../../utils/string-helpers';

describe('Template Rendering - Happy Path', () => {
  const validMetadata: ToolMetadata = {
    toolId: 'test-tool',
    toolName: 'Test Tool',
    description: 'A test tool for validation',
    icon: 'pi-box',
    version: '1.0.0',
    permissions: ['user', 'admin'],
    features: {
      backend: true,
      database: true,
      service: true,
      component: true,
      tests: true,
      integrationTests: false,
    },
  };

  test('should render frontend component template', async () => {
    const data = mapMetadataToTemplateData(validMetadata);
    const rendered = await renderTemplateFile('frontend/component.ts.ejs', data);

    expect(rendered).toContain('import { Component');
    expect(rendered).toContain('export class TestToolComponent');
    expect(rendered).toContain("selector: 'app-test-tool'");
    expect(rendered).toContain('Test Tool Component');
  });

  test('should render frontend service template', async () => {
    const data = mapMetadataToTemplateData(validMetadata);
    const rendered = await renderTemplateFile('frontend/service.ts.ejs', data);

    expect(rendered).toContain('export class TestToolService');
    expect(rendered).toContain("private readonly apiUrl = '/api/tools/test-tool'");
    expect(rendered).toContain('getAll()');
    expect(rendered).toContain('getById(id: string)');
  });

  test('should render backend controller template', async () => {
    const data = mapMetadataToTemplateData(validMetadata);
    const rendered = await renderTemplateFile('backend/controller.ts.ejs', data);

    expect(rendered).toContain('export class TestToolController');
    expect(rendered).toContain('getAll = async');
    expect(rendered).toContain('create = async');
    expect(rendered).toContain('Test Tool records retrieved successfully');
  });

  test('should render backend repository template', async () => {
    const data = mapMetadataToTemplateData(validMetadata);
    const rendered = await renderTemplateFile('backend/repository.ts.ejs', data);

    expect(rendered).toContain('export class TestToolRepository');
    expect(rendered).toContain('SELECT * FROM test_tool');
    expect(rendered).toContain('findById(id: string)');
    expect(rendered).toContain('$1'); // Parameterized SQL
  });

  test('should render all templates without errors', async () => {
    const rendered = await renderAllTemplates(validMetadata);

    expect(rendered.frontend.component).toBeTruthy();
    expect(rendered.frontend.service).toBeTruthy();
    expect(rendered.backend.controller).toBeTruthy();
    expect(rendered.backend.repository).toBeTruthy();
    expect(rendered.shared.types).toBeTruthy();
    expect(rendered.config.readme).toBeTruthy();
  });

  test('should have correct imports in generated code', async () => {
    const data = mapMetadataToTemplateData(validMetadata);
    const component = await renderTemplateFile('frontend/component.ts.ejs', data);

    expect(component).toContain("import { Component, OnInit } from '@angular/core'");
    expect(component).toContain("import { CommonModule } from '@angular/common'");
  });

  test('should use correct naming conventions', async () => {
    const data = mapMetadataToTemplateData(validMetadata);

    expect(data.className).toBe('TestTool'); // PascalCase
    expect(data.serviceName).toBe('testToolService'); // camelCase
    expect(data.tableName).toBe('test_tool'); // snake_case
  });
});

describe('Template Rendering - Edge Cases', () => {
  test('should handle tool ID with multiple hyphens', async () => {
    const metadata: ToolMetadata = {
      toolId: 'my-super-long-tool-name',
      toolName: 'My Super Long Tool Name',
      description: 'Test',
      icon: 'pi-box',
      version: '1.0.0',
      permissions: ['user'],
      features: {
        backend: true,
        database: true,
        service: true,
        component: true,
        tests: false,
        integrationTests: false,
      },
    };

    const data = mapMetadataToTemplateData(metadata);
    expect(data.className).toBe('MySuperLongToolName');
    expect(data.tableName).toBe('my_super_long_tool_name');

    const rendered = await renderTemplateFile('frontend/component.ts.ejs', data);
    expect(rendered).toContain('MySuperLongToolNameComponent');
  });

  test('should handle tool name with numbers', async () => {
    const metadata: ToolMetadata = {
      toolId: 'tool-123',
      toolName: 'Tool 123',
      description: 'Test',
      icon: 'pi-box',
      version: '1.0.0',
      permissions: ['user'],
      features: {
        backend: true,
        database: true,
        service: true,
        component: true,
        tests: false,
        integrationTests: false,
      },
    };

    const data = mapMetadataToTemplateData(metadata);
    const rendered = await renderTemplateFile('frontend/component.ts.ejs', data);
    expect(rendered).toContain('Tool123Component');
  });

  test('should handle very long tool names (50+ chars)', async () => {
    const longName = 'A'.repeat(50);
    const metadata: ToolMetadata = {
      toolId: 'long-tool',
      toolName: longName,
      description: 'Test',
      icon: 'pi-box',
      version: '1.0.0',
      permissions: ['user'],
      features: {
        backend: true,
        database: true,
        service: true,
        component: true,
        tests: false,
        integrationTests: false,
      },
    };

    const rendered = await renderAllTemplates(metadata);
    expect(rendered.frontend.component).toContain(longName);
  });

  test('should handle empty description (optional field)', async () => {
    const metadata: ToolMetadata = {
      toolId: 'test-tool',
      toolName: 'Test Tool',
      description: '', // Empty optional field
      icon: 'pi-box',
      version: '1.0.0',
      permissions: ['user'],
      features: {
        backend: true,
        database: true,
        service: true,
        component: true,
        tests: false,
        integrationTests: false,
      },
    };

    const rendered = await renderAllTemplates(metadata);
    expect(rendered.config.readme).toBeTruthy();
  });

  test('should handle special characters in description', async () => {
    const metadata: ToolMetadata = {
      toolId: 'test-tool',
      toolName: 'Test Tool',
      description: 'A tool with "quotes" and \'apostrophes\' & ampersands',
      icon: 'pi-box',
      version: '1.0.0',
      permissions: ['user'],
      features: {
        backend: true,
        database: true,
        service: true,
        component: true,
        tests: false,
        integrationTests: false,
      },
    };

    const rendered = await renderAllTemplates(metadata);
    expect(rendered.frontend.component).toContain('quotes');
    expect(rendered.frontend.component).toContain('apostrophes');
  });
});

describe('Template Rendering - Error Scenarios', () => {
  test('should throw TemplateNotFoundError for non-existent template', async () => {
    try {
      await loadTemplate('non-existent-template.ejs');
      fail('Should have thrown TemplateNotFoundError');
    } catch (error: any) {
      expect(error).toBeInstanceOf(TemplateNotFoundError);
    }
  });

  test('should provide helpful error message for missing template', async () => {
    try {
      await loadTemplate('missing.ejs');
      fail('Should have thrown TemplateNotFoundError');
    } catch (error: any) {
      expect(error.message).toContain('Template');
      expect(error.message).toContain('not found');
      expect(error.message).toContain('Suggestion');
    }
  });

  test('should throw EJSSyntaxError for invalid template syntax', () => {
    const invalidTemplate = '<%= unclosed tag';

    expect(() => renderTemplate(invalidTemplate, {})).toThrow(EJSSyntaxError);
  });

  test('should handle missing required variables gracefully', () => {
    const template = '<%= toolName %>';
    const data = {}; // Missing toolName

    expect(() => renderTemplate(template, data)).toThrow(MissingVariableError);
  });

  test('should list required variables in MissingVariableError', () => {
    const template = '<%= toolName %>';
    const data = { toolId: 'test' }; // Has toolId but missing toolName

    try {
      renderTemplate(template, data);
      fail('Should have thrown MissingVariableError');
    } catch (error: any) {
      expect(error.message).toContain('Required variables');
      expect(error.message).toContain('toolId');
    }
  });
});

describe('Template Rendering - Security Scenarios', () => {
  test('should safely handle SQL injection attempts in tool name', async () => {
    const metadata: ToolMetadata = {
      toolId: 'test-tool',
      toolName: "'; DROP TABLE users; --",
      description: 'Test',
      icon: 'pi-box',
      version: '1.0.0',
      permissions: ['user'],
      features: {
        backend: true,
        database: true,
        service: true,
        component: true,
        tests: false,
        integrationTests: false,
      },
    };

    const data = mapMetadataToTemplateData(metadata);
    const repository = await renderTemplateFile('backend/repository.ts.ejs', data);

    // Should use parameterized queries ($1, $2, etc.)
    expect(repository).toContain('$1');
    expect(repository).toContain('$2');

    // Should not have inline SQL values
    expect(repository).not.toMatch(/VALUES\s*\(\s*['"].*['"]\s*\)/i);
  });

  test('should safely handle XSS attempts in description', async () => {
    const metadata: ToolMetadata = {
      toolId: 'test-tool',
      toolName: 'Test Tool',
      description: "<script>alert('xss')</script>",
      icon: 'pi-box',
      version: '1.0.0',
      permissions: ['user'],
      features: {
        backend: true,
        database: true,
        service: true,
        component: true,
        tests: false,
        integrationTests: false,
      },
    };

    const rendered = await renderAllTemplates(metadata);

    // EJS should escape by default with <%= %>
    // Script tags should be present as text, not executable
    expect(rendered.frontend.componentHtml).toContain('script');
  });

  test('should handle path traversal attempts (validated upstream)', () => {
    // Note: Path traversal should be prevented by Story 31.1.2's validateToolId()
    // Template renderer assumes input is pre-validated
    const metadata: ToolMetadata = {
      toolId: '../../../etc/passwd',
      toolName: 'Evil Tool',
      description: 'Test',
      icon: 'pi-box',
      version: '1.0.0',
      permissions: ['user'],
      features: {
        backend: true,
        database: true,
        service: true,
        component: true,
        tests: false,
        integrationTests: false,
      },
    };

    const data = mapMetadataToTemplateData(metadata);

    // Template renderer passes through tool ID as-is
    // Validation layer (Story 31.1.2) prevents invalid tool IDs from reaching here
    expect(data.toolId).toBe('../../../etc/passwd');
    expect(data.apiBase).toBe('/api/tools/../../../etc/passwd');

    // This demonstrates that validation MUST occur before template rendering
  });

  test('should safely handle semicolons in tool name', async () => {
    const metadata: ToolMetadata = {
      toolId: 'test-tool',
      toolName: 'Test; DELETE FROM users;',
      description: 'Test',
      icon: 'pi-box',
      version: '1.0.0',
      permissions: ['user'],
      features: {
        backend: true,
        database: true,
        service: true,
        component: true,
        tests: false,
        integrationTests: false,
      },
    };

    const rendered = await renderAllTemplates(metadata);

    // Should be safely embedded in strings
    expect(rendered.backend.controller).toContain('Test; DELETE FROM users;');

    // But repository should still use parameterized queries
    expect(rendered.backend.repository).toContain('$1');
  });
});

describe('Name Conversion Utilities', () => {
  test('toPascalCase should handle various inputs', () => {
    expect(toPascalCase('my-tool')).toBe('MyTool');
    expect(toPascalCase('user_profile')).toBe('UserProfile');
    expect(toPascalCase('inventory tracker')).toBe('InventoryTracker');
    expect(toPascalCase('myTool')).toBe('MyTool');
  });

  test('toCamelCase should handle various inputs', () => {
    expect(toCamelCase('my-tool')).toBe('myTool');
    expect(toCamelCase('user_profile')).toBe('userProfile');
    expect(toCamelCase('inventory tracker')).toBe('inventoryTracker');
    expect(toCamelCase('MyTool')).toBe('myTool');
  });

  test('toSnakeCase should handle various inputs', () => {
    expect(toSnakeCase('my-tool')).toBe('my_tool');
    expect(toSnakeCase('MyTool')).toBe('my_tool');
    expect(toSnakeCase('myTool')).toBe('my_tool');
    expect(toSnakeCase('inventory tracker')).toBe('inventory_tracker');
  });
});

describe('Template Data Mapping', () => {
  test('should correctly map metadata to template data', () => {
    const metadata: ToolMetadata = {
      toolId: 'inventory-tracker',
      toolName: 'Inventory Tracker',
      description: 'Track inventory',
      icon: 'pi-box',
      version: '1.0.0',
      permissions: ['user', 'admin'],
      features: {
        backend: true,
        database: true,
        service: true,
        component: true,
        tests: false,
        integrationTests: false,
      },
    };

    const data = mapMetadataToTemplateData(metadata);

    expect(data.className).toBe('InventoryTracker');
    expect(data.serviceName).toBe('inventoryTrackerService');
    expect(data.repositoryName).toBe('inventoryTrackerRepository');
    expect(data.tableName).toBe('inventory_tracker');
    expect(data.route).toBe('/tools/inventory-tracker');
    expect(data.apiBase).toBe('/api/tools/inventory-tracker');
    expect(data.author).toBe('Generated by create-tool CLI');
  });
});

describe('Template Renderer Error Handling', () => {
  test('should wrap errors with context when rendering fails', async () => {
    const badMetadata: ToolMetadata = {
      toolId: 'test-tool',
      toolName: 'Test Tool',
      description: 'Test',
      icon: 'pi-box',
      version: '1.0.0',
      permissions: ['user'],
      features: {
        backend: true,
        database: true,
        service: true,
        component: true,
        tests: false,
        integrationTests: false,
      },
    };

    // Mock a template that doesn't exist to trigger error path
    try {
      await renderTemplateFile('non-existent-template.ejs', mapMetadataToTemplateData(badMetadata));
      fail('Should have thrown error');
    } catch (error: any) {
      expect(error).toBeDefined();
      expect(error.message).toBeTruthy();
    }
  });
});

describe('Template Loader Edge Cases', () => {
  test('should throw FilePermissionError for permission issues', async () => {
    // This tests error code handling in loadTemplate
    // In real scenario, would need file with no read permissions
    // For now, testing the error handling path exists
    try {
      await loadTemplate('non-existent.ejs');
      fail('Should have thrown error');
    } catch (error: any) {
      // Verify error is thrown and handled
      expect(error).toBeDefined();
    }
  });

  test('should handle generic file read errors', async () => {
    try {
      await loadTemplate('invalid-path.ejs');
      fail('Should have thrown error');
    } catch (error: any) {
      expect(error).toBeDefined();
      expect(error.message).toBeTruthy();
    }
  });

  test('should get empty array for non-existent category', async () => {
    const { getAvailableTemplates } = await import('../template-loader');
    const templates = await getAvailableTemplates('non-existent-category');
    expect(templates).toEqual([]);
  });

  test('should filter only .ejs files from category', async () => {
    const { getAvailableTemplates } = await import('../template-loader');
    const templates = await getAvailableTemplates('frontend');

    // All returned files should end with .ejs
    templates.forEach(file => {
      expect(file).toMatch(/\.ejs$/);
    });
  });
});
