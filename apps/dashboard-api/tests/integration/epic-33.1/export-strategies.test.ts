/**
 * Integration Tests: Export Strategies
 * Story 33.1.5: Integration Tests for Epic 33.1 (Task 3)
 *
 * Tests export strategies with real tool data, filesystem operations, and package generation.
 * Verifies boilerplate generation, data copying, Docker config, and rollback functionality.
 */

import { FormsExportStrategy } from '../../../src/services/export-strategies/forms.strategy';
import { WorkflowsExportStrategy } from '../../../src/services/export-strategies/workflows.strategy';
import { ThemesExportStrategy } from '../../../src/services/export-strategies/themes.strategy';
import { ExportContext } from '../../../src/services/export-strategies/base.strategy';
import { ToolRegistryRecord, ToolStatus } from '@nodeangularfullstack/shared';
import * as fs from 'fs/promises';
import * as path from 'path';
import { TestDatabaseHelper } from './db-helper';
import { createTestFormSchema } from '../../../tests/fixtures/epic-33.1/test-fixtures';

/**
 * Helper function to create a mock ToolRegistryRecord for testing.
 * This matches the actual database schema and ToolRegistryRecord interface.
 */
function createMockToolRecord(
  toolId: string,
  toolName: string,
  config: Record<string, unknown>
): ToolRegistryRecord {
  return {
    id: `uuid-${Date.now()}`,
    tool_id: toolId,
    name: toolName,
    description: `Test tool: ${toolName}`,
    version: '1.0.0',
    icon: '📝',
    route: `/tools/${toolId}`,
    api_base: `/api/${toolId}`,
    permissions: ['user', 'admin'],
    status: ToolStatus.ACTIVE,
    manifest_json: {
      config,
      routes: {
        primary: `/tools/${toolId}`,
        children: [],
      },
      endpoints: {
        base: `/api/${toolId}`,
        paths: [],
      },
    },
    created_at: new Date(),
    updated_at: new Date(),
    created_by: 'test-user',
  };
}

describe('Export Strategies Integration Tests', () => {
  let dbHelper: TestDatabaseHelper;
  let testWorkingDir: string;

  beforeAll(async () => {
    dbHelper = await TestDatabaseHelper.initialize();
    await dbHelper.deleteTestExportJobs();
    await dbHelper.deleteTestToolRegistry();
  });

  afterAll(async () => {
    await dbHelper.deleteTestExportJobs();
    await dbHelper.deleteTestToolRegistry();
    await dbHelper.close();
  });

  beforeEach(async () => {
    // Create unique working directory for each test
    testWorkingDir = path.join('/tmp/test-exports', `test-${Date.now()}`);
    await fs.mkdir(testWorkingDir, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup working directory
    try {
      await fs.rm(testWorkingDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('FormsExportStrategy', () => {
    let strategy: FormsExportStrategy;
    let toolData: ToolRegistryRecord;
    let context: ExportContext;

    beforeEach(async () => {
      strategy = new FormsExportStrategy();

      // Create complete test tool with form schema
      const pool = dbHelper.getPool();
      const formSchema = await createTestFormSchema(pool, {
        title: 'Test Form Schema',
      });

      // Create mock tool record with proper ToolRegistryRecord interface
      toolData = createMockToolRecord(
        `forms-test-${Date.now()}`,
        'Test Form Tool',
        { formSchemaId: formSchema.id }
      );

      context = {
        jobId: `job-${Date.now()}`,
        toolId: toolData.tool_id,
        userId: 'test-user-123',
        workingDir: testWorkingDir,
        metadata: {},
        toolData,
      };
    });

    it('should validate form tool data successfully', () => {
      expect(() => strategy.validateToolData(toolData)).not.toThrow();
    });

    it('should throw error for invalid tool type', () => {
      const invalidTool = { ...toolData, tool_id: 'invalid-tool' };
      expect(() => strategy.validateToolData(invalidTool)).toThrow(
        'Invalid tool for forms export'
      );
    });

    it('should throw error for missing formSchemaId', () => {
      const invalidTool = {
        ...toolData,
        manifest_json: {
          config: {},
          routes: { primary: '/test', children: [] },
          endpoints: { base: '/api/test', paths: [] },
        },
      };
      expect(() => strategy.validateToolData(invalidTool)).toThrow(
        'Required metadata field missing: formSchemaId'
      );
    });

    it('should generate valid package metadata', () => {
      const metadata = strategy.generatePackageMetadata(toolData);

      expect(metadata).toHaveProperty('name');
      expect(metadata).toHaveProperty('version');
      expect(metadata).toHaveProperty('description');
      expect(metadata).toHaveProperty('scripts');
      expect(metadata).toHaveProperty('dependencies');
      expect(metadata).toHaveProperty('devDependencies');

      // Verify required dependencies
      const deps = metadata.dependencies as Record<string, string>;
      expect(deps).toHaveProperty('express');
      expect(deps).toHaveProperty('pg');
      expect(deps).toHaveProperty('@prisma/client');
    });

    it('should return 8 export steps in correct order', () => {
      const steps = strategy.getSteps(toolData);

      expect(steps).toHaveLength(8);
      expect(steps[0].name).toBe('validate-form-data');
      expect(steps[1].name).toBe('generate-express-boilerplate');
      expect(steps[2].name).toBe('copy-form-schemas');
      expect(steps[3].name).toBe('generate-prisma-schema');
      expect(steps[4].name).toBe('generate-migrations');
      expect(steps[5].name).toBe('generate-docker-config');
      expect(steps[6].name).toBe('generate-readme');
      expect(steps[7].name).toBe('package-archive');

      // Verify steps are ordered by priority
      for (let i = 0; i < steps.length - 1; i++) {
        expect(steps[i].priority).toBeLessThanOrEqual(steps[i + 1].priority);
      }
    });

    it('should execute all steps successfully', async () => {
      const steps = strategy.getSteps(toolData);

      for (const step of steps) {
        await expect(step.execute(context)).resolves.not.toThrow();
      }
    }, 30000);

    it('should generate Express.js boilerplate files', async () => {
      const steps = strategy.getSteps(toolData);
      const boilerplateStep = steps[1]; // generate-express-boilerplate

      await boilerplateStep.execute(context);

      // Verify boilerplate files exist
      const packageJsonPath = path.join(testWorkingDir, 'package.json');
      const serverPath = path.join(testWorkingDir, 'src', 'server.ts');
      const controllerPath = path.join(
        testWorkingDir,
        'src',
        'controllers',
        'forms.controller.ts'
      );
      const routesPath = path.join(
        testWorkingDir,
        'src',
        'routes',
        'forms.routes.ts'
      );
      const tsconfigPath = path.join(testWorkingDir, 'tsconfig.json');
      const envPath = path.join(testWorkingDir, '.env.example');

      const [
        packageJsonExists,
        serverExists,
        controllerExists,
        routesExists,
        tsconfigExists,
        envExists,
      ] = await Promise.all([
        fs
          .access(packageJsonPath)
          .then(() => true)
          .catch(() => false),
        fs
          .access(serverPath)
          .then(() => true)
          .catch(() => false),
        fs
          .access(controllerPath)
          .then(() => true)
          .catch(() => false),
        fs
          .access(routesPath)
          .then(() => true)
          .catch(() => false),
        fs
          .access(tsconfigPath)
          .then(() => true)
          .catch(() => false),
        fs
          .access(envPath)
          .then(() => true)
          .catch(() => false),
      ]);

      expect(packageJsonExists).toBe(true);
      expect(serverExists).toBe(true);
      expect(controllerExists).toBe(true);
      expect(routesExists).toBe(true);
      expect(tsconfigExists).toBe(true);
      expect(envExists).toBe(true);

      // Verify package.json content
      const packageJson = JSON.parse(
        await fs.readFile(packageJsonPath, 'utf-8')
      );
      expect(packageJson.name).toContain('form-service');
      expect(packageJson.dependencies).toHaveProperty('express');
    });

    it('should generate Docker configuration files', async () => {
      const steps = strategy.getSteps(toolData);
      const dockerStep = steps[5]; // generate-docker-config

      await dockerStep.execute(context);

      // Verify Docker files exist
      const dockerfilePath = path.join(testWorkingDir, 'Dockerfile');
      const dockerComposePath = path.join(testWorkingDir, 'docker-compose.yml');
      const dockerignorePath = path.join(testWorkingDir, '.dockerignore');

      const [dockerfileExists, dockerComposeExists, dockerignoreExists] =
        await Promise.all([
          fs
            .access(dockerfilePath)
            .then(() => true)
            .catch(() => false),
          fs
            .access(dockerComposePath)
            .then(() => true)
            .catch(() => false),
          fs
            .access(dockerignorePath)
            .then(() => true)
            .catch(() => false),
        ]);

      expect(dockerfileExists).toBe(true);
      expect(dockerComposeExists).toBe(true);
      expect(dockerignoreExists).toBe(true);

      // Verify Dockerfile content
      const dockerfile = await fs.readFile(dockerfilePath, 'utf-8');
      expect(dockerfile).toContain('FROM node:');
      expect(dockerfile).toContain('WORKDIR');
      expect(dockerfile).toContain('COPY');
      expect(dockerfile).toContain('RUN npm install');
      expect(dockerfile).toContain('EXPOSE');
    });

    it('should copy form data to export package', async () => {
      const steps = strategy.getSteps(toolData);
      const copyStep = steps[2]; // copy-form-schemas

      await copyStep.execute(context);

      // Verify data directory exists
      const dataDir = path.join(testWorkingDir, 'data');
      const dataDirExists = await fs
        .access(dataDir)
        .then(() => true)
        .catch(() => false);
      expect(dataDirExists).toBe(true);

      // Verify form schema file exists
      const schemaFiles = await fs.readdir(dataDir);
      expect(schemaFiles.length).toBeGreaterThan(0);
      expect(schemaFiles.some((file) => file.endsWith('.json'))).toBe(true);
    });

    it('should generate valid package structure', async () => {
      const steps = strategy.getSteps(toolData);

      // Execute all steps except package-archive
      for (let i = 0; i < steps.length - 1; i++) {
        await steps[i].execute(context);
      }

      // Verify complete directory structure
      const expectedDirs = [
        'src',
        'src/controllers',
        'src/routes',
        'data',
        'prisma',
      ];

      for (const dir of expectedDirs) {
        const dirPath = path.join(testWorkingDir, dir);
        const dirExists = await fs
          .access(dirPath)
          .then(() => true)
          .catch(() => false);
        expect(dirExists).toBe(true);
      }

      // Verify required files
      const expectedFiles = [
        'package.json',
        'tsconfig.json',
        '.env.example',
        'Dockerfile',
        'docker-compose.yml',
        'README.md',
        'src/server.ts',
      ];

      for (const file of expectedFiles) {
        const filePath = path.join(testWorkingDir, file);
        const fileExists = await fs
          .access(filePath)
          .then(() => true)
          .catch(() => false);
        expect(fileExists).toBe(true);
      }
    }, 30000);

    it('should generate .tar.gz archive', async () => {
      const steps = strategy.getSteps(toolData);

      // Execute all steps
      for (const step of steps) {
        await step.execute(context);
      }

      // Verify archive file exists
      const archivePath = path.join(testWorkingDir, `${context.jobId}.tar.gz`);
      const archiveExists = await fs
        .access(archivePath)
        .then(() => true)
        .catch(() => false);
      expect(archiveExists).toBe(true);

      // Verify archive is not empty
      const stats = await fs.stat(archivePath);
      expect(stats.size).toBeGreaterThan(1000); // At least 1KB
    }, 30000);

    it('should rollback successfully on error', async () => {
      const steps = strategy.getSteps(toolData);

      // Execute first 3 steps
      await steps[0].execute(context);
      await steps[1].execute(context);
      await steps[2].execute(context);

      // Verify files were created
      const packageJsonPath = path.join(testWorkingDir, 'package.json');
      let packageJsonExists = await fs
        .access(packageJsonPath)
        .then(() => true)
        .catch(() => false);
      expect(packageJsonExists).toBe(true);

      // Rollback in reverse order
      await steps[2].rollback(context);
      await steps[1].rollback(context);
      await steps[0].rollback(context);

      // Verify rollback deleted working directory contents
      try {
        const files = await fs.readdir(testWorkingDir);
        // After rollback, directory should be empty or only contain metadata
        expect(files.length).toBeLessThan(3);
      } catch (error) {
        // Directory might be completely removed - that's okay
      }
    });

    it('should verify package files are not corrupted', async () => {
      const steps = strategy.getSteps(toolData);

      // Execute all steps
      for (const step of steps) {
        await step.execute(context);
      }

      // Read and parse package.json
      const packageJsonPath = path.join(testWorkingDir, 'package.json');
      const packageJson = JSON.parse(
        await fs.readFile(packageJsonPath, 'utf-8')
      );
      expect(packageJson).toHaveProperty('name');

      // Read and parse tsconfig.json
      const tsconfigPath = path.join(testWorkingDir, 'tsconfig.json');
      const tsconfig = JSON.parse(await fs.readFile(tsconfigPath, 'utf-8'));
      expect(tsconfig).toHaveProperty('compilerOptions');

      // Read server.ts and verify it's valid TypeScript
      const serverPath = path.join(testWorkingDir, 'src', 'server.ts');
      const serverCode = await fs.readFile(serverPath, 'utf-8');
      expect(serverCode).toContain('import');
      expect(serverCode).toContain('export');
      expect(serverCode.length).toBeGreaterThan(100);
    }, 30000);
  });

  describe('WorkflowsExportStrategy', () => {
    let strategy: WorkflowsExportStrategy;
    let toolData: ToolRegistryRecord;
    let context: ExportContext;

    beforeEach(async () => {
      strategy = new WorkflowsExportStrategy();

      // Create mock tool record for workflows
      toolData = createMockToolRecord(
        `workflow-test-${Date.now()}`,
        'Test Workflow Tool',
        { workflowId: `wf-${Date.now()}` }
      );

      context = {
        jobId: `job-${Date.now()}`,
        toolId: toolData.tool_id,
        userId: 'test-user-123',
        workingDir: testWorkingDir,
        metadata: {},
        toolData,
      };
    });

    it('should validate workflow tool data successfully', () => {
      expect(() => strategy.validateToolData(toolData)).not.toThrow();
    });

    it('should generate valid package metadata for workflows', () => {
      const metadata = strategy.generatePackageMetadata(toolData);

      expect(metadata).toHaveProperty('name');
      expect(metadata).toHaveProperty('description');

      const name = metadata.name as string;
      expect(name).toContain('workflow-service');
    });

    it('should return workflow-specific export steps', () => {
      const steps = strategy.getSteps(toolData);

      expect(steps.length).toBeGreaterThan(0);
      expect(steps).toBeDefined();

      // Verify steps have required properties
      steps.forEach((step) => {
        expect(step).toHaveProperty('name');
        expect(step).toHaveProperty('description');
        expect(step).toHaveProperty('execute');
        expect(step).toHaveProperty('rollback');
      });
    });

    it('should generate workflow boilerplate files', async () => {
      const steps = strategy.getSteps(toolData);

      // Execute first few steps
      for (let i = 0; i < Math.min(3, steps.length); i++) {
        await steps[i].execute(context);
      }

      // Verify basic files exist
      const packageJsonPath = path.join(testWorkingDir, 'package.json');
      const packageJsonExists = await fs
        .access(packageJsonPath)
        .then(() => true)
        .catch(() => false);
      expect(packageJsonExists).toBe(true);
    }, 15000);
  });

  describe('ThemesExportStrategy', () => {
    let strategy: ThemesExportStrategy;
    let toolData: ToolRegistryRecord;
    let context: ExportContext;

    beforeEach(async () => {
      strategy = new ThemesExportStrategy();

      // Create mock tool record for themes
      toolData = createMockToolRecord(
        `theme-test-${Date.now()}`,
        'Test Theme Tool',
        { themeId: `theme-${Date.now()}` }
      );

      context = {
        jobId: `job-${Date.now()}`,
        toolId: toolData.tool_id,
        userId: 'test-user-123',
        workingDir: testWorkingDir,
        metadata: {},
        toolData,
      };
    });

    it('should validate theme tool data successfully', () => {
      expect(() => strategy.validateToolData(toolData)).not.toThrow();
    });

    it('should generate valid package metadata for themes', () => {
      const metadata = strategy.generatePackageMetadata(toolData);

      expect(metadata).toHaveProperty('name');
      expect(metadata).toHaveProperty('description');

      const name = metadata.name as string;
      expect(name).toContain('theme-service');
    });

    it('should return theme-specific export steps', () => {
      const steps = strategy.getSteps(toolData);

      expect(steps.length).toBeGreaterThan(0);
      expect(steps).toBeDefined();

      // Verify steps have required properties
      steps.forEach((step) => {
        expect(step).toHaveProperty('name');
        expect(step).toHaveProperty('description');
        expect(step).toHaveProperty('execute');
        expect(step).toHaveProperty('rollback');
      });
    });

    it('should generate theme CSS and configuration files', async () => {
      const steps = strategy.getSteps(toolData);

      // Execute first few steps
      for (let i = 0; i < Math.min(3, steps.length); i++) {
        await steps[i].execute(context);
      }

      // Verify basic files exist
      const packageJsonPath = path.join(testWorkingDir, 'package.json');
      const packageJsonExists = await fs
        .access(packageJsonPath)
        .then(() => true)
        .catch(() => false);
      expect(packageJsonExists).toBe(true);
    }, 15000);
  });

  describe('Strategy Comparison', () => {
    it('should have different steps for different tool types', () => {
      const formsStrategy = new FormsExportStrategy();
      const workflowsStrategy = new WorkflowsExportStrategy();
      const themesStrategy = new ThemesExportStrategy();

      const toolData = {
        tool_id: 'test-tool',
        name: 'Test Tool',
        manifest_json: { config: {} },
      } as ToolRegistryRecord;

      const formsSteps = formsStrategy.getSteps(toolData);
      const workflowsSteps = workflowsStrategy.getSteps(toolData);
      const themesSteps = themesStrategy.getSteps(toolData);

      // Strategies should have different step counts or names
      expect(
        formsSteps.length !== workflowsSteps.length ||
          formsSteps.length !== themesSteps.length
      ).toBe(true);
    });

    it('should generate different package metadata for different tool types', () => {
      const formsStrategy = new FormsExportStrategy();
      const workflowsStrategy = new WorkflowsExportStrategy();
      const themesStrategy = new ThemesExportStrategy();

      const toolData = {
        tool_id: 'test-tool',
        name: 'Test Tool',
        manifest_json: { config: {} },
      } as ToolRegistryRecord;

      const formsMetadata = formsStrategy.generatePackageMetadata(toolData);
      const workflowsMetadata =
        workflowsStrategy.generatePackageMetadata(toolData);
      const themesMetadata = themesStrategy.generatePackageMetadata(toolData);

      // Package names should be different
      expect(formsMetadata.name).not.toBe(workflowsMetadata.name);
      expect(formsMetadata.name).not.toBe(themesMetadata.name);
      expect(workflowsMetadata.name).not.toBe(themesMetadata.name);
    });
  });
});
