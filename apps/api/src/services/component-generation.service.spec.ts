import fs from 'fs/promises';
import { componentGenerationService } from './component-generation.service';
import { ComponentGenerationRequest } from '@nodeangularfullstack/shared';

// Mock fs module
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('ComponentGenerationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateComponent', () => {
    const validRequest: ComponentGenerationRequest = {
      toolKey: 'test-tool',
      toolName: 'Test Tool',
      slug: 'test-tool',
      description: 'A test tool for testing',
      icon: 'pi pi-test',
      category: 'utility',
    };

    it('should generate component files successfully', async () => {
      // Mock successful file operations
      mockFs.stat.mockRejectedValue(new Error('Directory does not exist'));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(`
        import { ShortLinkComponent } from '../short-link/short-link.component';

        @Component({
          imports: [
            ShortLinkComponent,
          ],
          template: \`
            @switch (tool()!.key) {
              @case ('short-link') {
                <app-short-link></app-short-link>
              }
              @default {
                <!-- default -->
              }
            }
          \`
        })
      `);

      const result =
        await componentGenerationService.generateComponent(validRequest);

      expect(result.success).toBe(true);
      expect(result.filesCreated.length).toBe(3);
      expect(result.componentPath).toContain('test-tool.component.ts');
      expect(result.routingUpdated).toBe(true);
    });

    it('should handle validation errors', async () => {
      const invalidRequest: ComponentGenerationRequest = {
        toolKey: '', // Invalid empty key
        toolName: 'Test Tool',
        slug: 'test-tool',
        description: 'A test tool for testing',
      };

      const result =
        await componentGenerationService.generateComponent(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'Tool key must be kebab-case alphanumeric string'
      );
    });

    it('should handle existing component directory', async () => {
      // Mock directory exists
      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);

      const result =
        await componentGenerationService.generateComponent(validRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'Component directory already exists: test-tool'
      );
    });

    it('should clean up files on failure', async () => {
      // Mock partial success then failure
      mockFs.stat.mockRejectedValue(new Error('Directory does not exist'));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile
        .mockResolvedValueOnce(undefined) // First file succeeds
        .mockRejectedValueOnce(new Error('Write failed')); // Second file fails
      mockFs.unlink.mockResolvedValue(undefined);

      const result =
        await componentGenerationService.generateComponent(validRequest);

      expect(result.success).toBe(false);
      expect(mockFs.unlink).toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should validate tool key format', async () => {
      const invalidRequest: ComponentGenerationRequest = {
        toolKey: 'InvalidKey', // Should be kebab-case
        toolName: 'Test Tool',
        slug: 'test-tool',
        description: 'A test tool for testing',
      };

      const result =
        await componentGenerationService.generateComponent(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'Tool key must be kebab-case alphanumeric string'
      );
    });

    it('should validate tool name requirement', async () => {
      const invalidRequest: ComponentGenerationRequest = {
        toolKey: 'test-tool',
        toolName: '', // Empty name
        slug: 'test-tool',
        description: 'A test tool for testing',
      };

      const result =
        await componentGenerationService.generateComponent(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Tool name is required');
    });

    it('should validate slug format', async () => {
      const invalidRequest: ComponentGenerationRequest = {
        toolKey: 'test-tool',
        toolName: 'Test Tool',
        slug: 'Invalid_Slug', // Should be kebab-case
        description: 'A test tool for testing',
      };

      const result =
        await componentGenerationService.generateComponent(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'Slug must be kebab-case alphanumeric string'
      );
    });
  });

  describe('template generation', () => {
    it('should generate valid component template', () => {
      const service = componentGenerationService as any;
      const template = service.getComponentTemplate(
        'TestTool',
        'test-tool',
        'Test Tool',
        'test-tool',
        'A test tool',
        'pi pi-test'
      );

      expect(template).toContain('TestToolComponent');
      expect(template).toContain('app-test-tool');
      expect(template).toContain('Test Tool');
      expect(template).toContain('A test tool');
      expect(template).toContain('pi pi-test');
    });

    it('should generate valid test template', () => {
      const service = componentGenerationService as any;
      const template = service.getTestTemplate(
        'TestTool',
        'Test Tool',
        'test-tool'
      );

      expect(template).toContain('TestToolComponent');
      expect(template).toContain('Test Tool');
      expect(template).toContain('should create');
      expect(template).toContain('should display tool name');
    });

    it('should generate valid service template', () => {
      const service = componentGenerationService as any;
      const template = service.getServiceTemplate('TestTool', 'Test Tool');

      expect(template).toContain('TestToolService');
      expect(template).toContain('Test Tool');
      expect(template).toContain('initialize');
      expect(template).toContain('@Injectable');
    });
  });

  describe('utility methods', () => {
    it('should convert kebab-case to PascalCase', () => {
      const service = componentGenerationService as any;

      expect(service.toPascalCase('test-tool')).toBe('TestTool');
      expect(service.toPascalCase('multi-word-tool')).toBe('MultiWordTool');
      expect(service.toPascalCase('single')).toBe('Single');
    });

    it('should convert kebab-case to camelCase', () => {
      const service = componentGenerationService as any;

      expect(service.toCamelCase('test-tool')).toBe('testTool');
      expect(service.toCamelCase('multi-word-tool')).toBe('multiWordTool');
      expect(service.toCamelCase('single')).toBe('single');
    });
  });
});
