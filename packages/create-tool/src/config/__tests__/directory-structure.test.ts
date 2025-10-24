/**
 * Directory Structure Configuration Tests
 *
 * Tests directory path generation and structure validation.
 */

import path from 'path';
import {
  getDirectoryStructure,
  getUniqueDirs,
  getAllFilePaths,
  type ToolMetadata,
} from '../directory-structure';

describe('directory-structure', () => {
  const mockMetadata: ToolMetadata = {
    toolId: 'inventory-tracker',
    toolName: 'Inventory Tracker',
    description: 'Track inventory items',
    icon: 'pi-box',
    version: '1.0.0',
    permissions: ['user'],
    features: ['backend', 'component'],
  };

  describe('getDirectoryStructure', () => {
    it('should generate complete directory structure', () => {
      const structure = getDirectoryStructure(mockMetadata);

      expect(structure.frontend).toBeDefined();
      expect(structure.backend).toBeDefined();
      expect(structure.shared).toBeDefined();
      expect(structure.config).toBeDefined();
    });

    it('should generate frontend file paths', () => {
      const structure = getDirectoryStructure(mockMetadata);

      expect(structure.frontend.base).toContain('apps/web/src/app/features/tools/inventory-tracker');
      expect(structure.frontend.files.component).toContain('inventory-tracker.component.ts');
      expect(structure.frontend.files.componentHtml).toContain('inventory-tracker.component.html');
      expect(structure.frontend.files.componentCss).toContain('inventory-tracker.component.css');
      expect(structure.frontend.files.service).toContain('services/inventory-tracker.service.ts');
      expect(structure.frontend.files.routes).toContain('inventory-tracker.routes.ts');
    });

    it('should generate backend file paths', () => {
      const structure = getDirectoryStructure(mockMetadata);

      expect(structure.backend.controller).toContain('apps/api/src/controllers/inventory-tracker.controller.ts');
      expect(structure.backend.service).toContain('apps/api/src/services/inventory-tracker.service.ts');
      expect(structure.backend.repository).toContain('apps/api/src/repositories/inventory-tracker.repository.ts');
      expect(structure.backend.routes).toContain('apps/api/src/routes/inventory-tracker.routes.ts');
      expect(structure.backend.validator).toContain('apps/api/src/validators/inventory-tracker.validator.ts');
    });

    it('should generate shared types path', () => {
      const structure = getDirectoryStructure(mockMetadata);

      expect(structure.shared.types).toContain('packages/shared/src/types/inventory-tracker.types.ts');
    });

    it('should generate config file paths', () => {
      const structure = getDirectoryStructure(mockMetadata);

      expect(structure.config.readme).toContain('README.md');
      expect(structure.config.readme).toContain('inventory-tracker');
    });

    it('should use toolId in all paths', () => {
      const structure = getDirectoryStructure(mockMetadata);

      // Check that toolId appears in all file paths
      const allPaths = [
        structure.frontend.base,
        structure.frontend.files.component,
        structure.frontend.files.service,
        structure.backend.controller,
        structure.backend.service,
        structure.shared.types,
      ];

      allPaths.forEach((filePath) => {
        expect(filePath).toContain('inventory-tracker');
      });
    });

    it('should handle different toolId formats', () => {
      const metadata = { ...mockMetadata, toolId: 'multi-word-tool' };
      const structure = getDirectoryStructure(metadata);

      expect(structure.frontend.base).toContain('multi-word-tool');
      expect(structure.backend.controller).toContain('multi-word-tool.controller.ts');
    });

    it('should generate absolute paths', () => {
      const structure = getDirectoryStructure(mockMetadata);

      // All paths should be absolute (start with / on Unix or drive letter on Windows)
      const isAbsolute = path.isAbsolute(structure.frontend.base);
      expect(isAbsolute).toBe(true);

      const isControllerAbsolute = path.isAbsolute(structure.backend.controller);
      expect(isControllerAbsolute).toBe(true);
    });
  });

  describe('getUniqueDirs', () => {
    it('should extract all unique directories', () => {
      const structure = getDirectoryStructure(mockMetadata);
      const dirs = getUniqueDirs(structure);

      expect(dirs.length).toBeGreaterThan(0);
      expect(Array.isArray(dirs)).toBe(true);
    });

    it('should include frontend base directory', () => {
      const structure = getDirectoryStructure(mockMetadata);
      const dirs = getUniqueDirs(structure);

      const frontendBaseIncluded = dirs.some((dir) =>
        dir.includes('apps/web/src/app/features/tools/inventory-tracker')
      );
      expect(frontendBaseIncluded).toBe(true);
    });

    it('should include frontend services subdirectory', () => {
      const structure = getDirectoryStructure(mockMetadata);
      const dirs = getUniqueDirs(structure);

      const servicesDir = dirs.some((dir) => dir.endsWith('services'));
      expect(servicesDir).toBe(true);
    });

    it('should include backend parent directories', () => {
      const structure = getDirectoryStructure(mockMetadata);
      const dirs = getUniqueDirs(structure);

      const hasControllers = dirs.some((dir) => dir.includes('apps/api/src/controllers'));
      const hasServices = dirs.some((dir) => dir.includes('apps/api/src/services'));
      const hasRepositories = dirs.some((dir) => dir.includes('apps/api/src/repositories'));

      expect(hasControllers).toBe(true);
      expect(hasServices).toBe(true);
      expect(hasRepositories).toBe(true);
    });

    it('should include shared types directory', () => {
      const structure = getDirectoryStructure(mockMetadata);
      const dirs = getUniqueDirs(structure);

      const hasSharedTypes = dirs.some((dir) => dir.includes('packages/shared/src/types'));
      expect(hasSharedTypes).toBe(true);
    });

    it('should return unique directories (no duplicates)', () => {
      const structure = getDirectoryStructure(mockMetadata);
      const dirs = getUniqueDirs(structure);

      const uniqueDirs = new Set(dirs);
      expect(uniqueDirs.size).toBe(dirs.length);
    });
  });

  describe('getAllFilePaths', () => {
    it('should return array of all file paths', () => {
      const structure = getDirectoryStructure(mockMetadata);
      const files = getAllFilePaths(structure);

      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBe(12); // Total file count
    });

    it('should include all frontend files', () => {
      const structure = getDirectoryStructure(mockMetadata);
      const files = getAllFilePaths(structure);

      const frontendFiles = files.filter((f) => f.includes('apps/web'));
      expect(frontendFiles.length).toBe(6); // component, html, css, service, routes, readme
    });

    it('should include all backend files', () => {
      const structure = getDirectoryStructure(mockMetadata);
      const files = getAllFilePaths(structure);

      const backendFiles = files.filter((f) => f.includes('apps/api'));
      expect(backendFiles.length).toBe(5); // controller, service, repository, routes, validator
    });

    it('should include shared types file', () => {
      const structure = getDirectoryStructure(mockMetadata);
      const files = getAllFilePaths(structure);

      const sharedFile = files.find((f) => f.includes('packages/shared'));
      expect(sharedFile).toBeDefined();
      expect(sharedFile).toContain('.types.ts');
    });

    it('should include config files', () => {
      const structure = getDirectoryStructure(mockMetadata);
      const files = getAllFilePaths(structure);

      const readmeFile = files.find((f) => f.endsWith('README.md'));
      expect(readmeFile).toBeDefined();
    });

    it('should return absolute paths', () => {
      const structure = getDirectoryStructure(mockMetadata);
      const files = getAllFilePaths(structure);

      files.forEach((filePath) => {
        expect(path.isAbsolute(filePath)).toBe(true);
      });
    });

    it('should have correct file extensions', () => {
      const structure = getDirectoryStructure(mockMetadata);
      const files = getAllFilePaths(structure);

      // Count: 3 frontend TS + 5 backend TS + 1 shared TS = 9 TS files
      const tsFiles = files.filter((f) => f.endsWith('.ts'));
      expect(tsFiles.length).toBe(9);

      const htmlFiles = files.filter((f) => f.endsWith('.html'));
      expect(htmlFiles.length).toBe(1);

      const cssFiles = files.filter((f) => f.endsWith('.css'));
      expect(cssFiles.length).toBe(1);

      const mdFiles = files.filter((f) => f.endsWith('.md'));
      expect(mdFiles.length).toBe(1);
    });
  });
});
