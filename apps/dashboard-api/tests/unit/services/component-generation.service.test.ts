import fs from 'fs/promises';
import { ComponentGenerationService } from '../../../src/services/component-generation.service';
import { ComponentGenerationRequest } from '@nodeangularfullstack/shared';

// Mock fs module
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('ComponentGenerationService', () => {
  let service: ComponentGenerationService;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ComponentGenerationService();

    // Reset environment
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isScaffoldingEnabled', () => {
    it('should return true in development environment', () => {
      process.env.NODE_ENV = 'development';
      expect(service.isScaffoldingEnabled()).toBe(true);
    });

    it('should return true in local environment', () => {
      process.env.NODE_ENV = 'local';
      expect(service.isScaffoldingEnabled()).toBe(true);
    });

    it('should return false in production environment', () => {
      process.env.NODE_ENV = 'production';
      expect(service.isScaffoldingEnabled()).toBe(false);
    });

    it('should return false when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;
      expect(service.isScaffoldingEnabled()).toBe(false);
    });
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

    beforeEach(() => {
      // Set environment to development for testing
      process.env.NODE_ENV = 'development';
    });

    it('should return error when scaffolding is disabled', async () => {
      process.env.NODE_ENV = 'production';

      const result = await service.generateComponent(validRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'Component scaffolding is only available in development mode'
      );
    });

    it('should validate tool key format', async () => {
      const invalidRequest = { ...validRequest, toolKey: 'InvalidToolKey' };

      const result = await service.generateComponent(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'Tool key must be kebab-case alphanumeric string'
      );
    });

    it('should validate tool name is required', async () => {
      const invalidRequest = { ...validRequest, toolName: '' };

      const result = await service.generateComponent(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Tool name is required');
    });

    it('should validate slug format', async () => {
      const invalidRequest = { ...validRequest, slug: 'Invalid Slug' };

      const result = await service.generateComponent(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'Slug must be kebab-case alphanumeric string'
      );
    });

    it('should fail when component directory already exists', async () => {
      // Mock directory exists
      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any);

      const result = await service.generateComponent(validRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'Component directory already exists: test-tool'
      );
    });

    it('should successfully generate component structure', async () => {
      // Mock directory doesn't exist
      mockFs.stat.mockRejectedValue(new Error('Directory not found'));

      // Mock successful file operations
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
                // default case
              }
            }
          \`
        })
      `);

      const result = await service.generateComponent(validRequest);

      expect(result.success).toBe(true);
      expect(result.filesCreated).toHaveLength(3); // component, test, service (routing is not a file creation)
      expect(result.routingUpdated).toBe(true);
    });

    it('should cleanup files on failure', async () => {
      // Mock directory doesn't exist
      mockFs.stat.mockRejectedValue(new Error('Directory not found'));

      // Mock mkdir and first writeFile success, but second writeFile failure
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockImplementation(async (path: any) => {
        if (path.includes('.component.spec.ts')) {
          throw new Error('Write failed for test file');
        }
        return Promise.resolve();
      });
      mockFs.unlink.mockResolvedValue(undefined);

      const result = await service.generateComponent(validRequest);

      expect(result.success).toBe(false);
      expect(mockFs.unlink).toHaveBeenCalled(); // Cleanup should be called for the component file
    });

    it('should handle routing update failure gracefully', async () => {
      // Mock directory doesn't exist
      mockFs.stat.mockRejectedValue(new Error('Directory not found'));

      // Mock successful file operations but routing failure
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.readFile.mockRejectedValue(new Error('Container file not found'));

      const result = await service.generateComponent(validRequest);

      expect(result.success).toBe(true);
      expect(result.routingUpdated).toBe(false);
    });
  });

  describe('component template generation', () => {
    it('should generate valid TypeScript component', async () => {
      process.env.NODE_ENV = 'development';

      // Mock directory doesn't exist
      mockFs.stat.mockRejectedValue(new Error('Directory not found'));
      mockFs.mkdir.mockResolvedValue(undefined);
      // Mock the tool-container file for routing update
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
                // default case
              }
            }
          \`
        })
      `);

      let componentContent = '';
      mockFs.writeFile.mockImplementation(async (path: any, content: any) => {
        if (
          path.includes('.component.ts') &&
          !path.includes('tool-container')
        ) {
          componentContent = content;
        }
        return Promise.resolve();
      });

      const request: ComponentGenerationRequest = {
        toolKey: 'example-tool',
        toolName: 'Example Tool',
        slug: 'example-tool',
        description: 'An example tool',
        icon: 'pi pi-example',
        category: 'productivity',
      };

      await service.generateComponent(request);

      expect(componentContent).toContain('ExampleToolComponent');
      expect(componentContent).toContain('app-example-tool');
      expect(componentContent).toContain('Example Tool');
      expect(componentContent).toContain('standalone: true');
      expect(componentContent).toContain(
        'changeDetection: ChangeDetectionStrategy.OnPush'
      );
    });
  });
});
