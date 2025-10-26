/**
 * Workflows export strategy implementation.
 * Exports workflow tools as standalone Node.js workflow engines.
 * Epic 33.1: Export Core Infrastructure
 */

import {
  BaseExportStrategy,
  IExportStep,
  ExportContext,
} from './base.strategy.js';
import { ToolRegistryRecord } from '@nodeangularfullstack/shared';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as tar from 'tar';

/**
 * Export strategy for workflow tools.
 * Generates standalone Node.js workflow engine with workflow definitions.
 */
export class WorkflowsExportStrategy extends BaseExportStrategy {
  validateToolData(toolData: ToolRegistryRecord): void {
    // Validate tool is a workflow-related tool
    if (!toolData.tool_id.includes('workflow')) {
      throw new Error(`Invalid tool for workflows export: ${toolData.tool_id}`);
    }

    this.validateRequiredMetadata(toolData, ['workflowId']);
  }

  generatePackageMetadata(
    toolData: ToolRegistryRecord
  ): Record<string, unknown> {
    return {
      name: `workflow-engine-${toolData.tool_id}`,
      version: '1.0.0',
      description: `Standalone workflow engine exported from ${toolData.name}`,
      main: 'dist/index.js',
      scripts: {
        dev: 'ts-node src/index.ts',
        build: 'tsc',
        start: 'node dist/index.js',
      },
      dependencies: {
        express: '^4.19.2',
        dotenv: '^16.4.5',
      },
      devDependencies: {
        typescript: '^5.3.3',
        '@types/node': '^20.11.30',
        'ts-node': '^10.9.2',
      },
    };
  }

  getSteps(_toolData: ToolRegistryRecord): IExportStep[] {
    return [
      new ValidateWorkflowDataStep(),
      new GenerateWorkflowBoilerplateStep(),
      new CopyWorkflowDefinitionsStep(),
      new GenerateWorkflowSchemaStep(),
      new GenerateWorkflowDockerConfigStep(),
      new GenerateWorkflowREADMEStep(),
      new PackageWorkflowArchiveStep(),
    ];
  }
}

class ValidateWorkflowDataStep implements IExportStep {
  name = 'validate-workflow-data';
  description = 'Validate workflow definitions exist';
  estimatedDurationMs = 2000;
  retryable = true;
  priority = 1;

  async execute(context: ExportContext): Promise<void> {
    const config = context.toolData.manifest_json?.config ?? {};
    const workflowId = config.workflowId as string;

    if (!workflowId) {
      throw new Error('Workflow ID not found in tool metadata');
    }

    context.metadata.workflowId = workflowId;
    context.metadata.workflowDefinition = { id: workflowId, steps: [] };
  }

  async rollback(_context: ExportContext): Promise<void> {
    // No cleanup needed
  }
}

class GenerateWorkflowBoilerplateStep implements IExportStep {
  name = 'generate-workflow-boilerplate';
  description = 'Generate Node.js workflow engine boilerplate';
  estimatedDurationMs = 5000;
  retryable = true;
  priority = 2;

  async execute(context: ExportContext): Promise<void> {
    const { workingDir } = context;
    const srcDir = path.join(workingDir, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    const indexCode = `import dotenv from 'dotenv';
dotenv.config();

console.log('Workflow engine started');

// TODO: Implement workflow execution logic
`;

    await fs.writeFile(path.join(srcDir, 'index.ts'), indexCode, 'utf-8');

    const strategy = new WorkflowsExportStrategy();
    const packageJson = strategy.generatePackageMetadata(context.toolData);
    await fs.writeFile(
      path.join(workingDir, 'package.json'),
      JSON.stringify(packageJson, null, 2),
      'utf-8'
    );
  }

  async rollback(context: ExportContext): Promise<void> {
    const srcDir = path.join(context.workingDir, 'src');
    await fs.rm(srcDir, { recursive: true, force: true }).catch(() => {});
  }
}

class CopyWorkflowDefinitionsStep implements IExportStep {
  name = 'copy-workflow-definitions';
  description = 'Copy workflow definitions and execution history';
  estimatedDurationMs = 3000;
  retryable = true;
  priority = 3;

  async execute(context: ExportContext): Promise<void> {
    const { workingDir } = context;
    const workflowsDir = path.join(workingDir, 'workflows');
    await fs.mkdir(workflowsDir, { recursive: true });

    const workflowDefinition = context.metadata.workflowDefinition as Record<
      string,
      unknown
    >;
    await fs.writeFile(
      path.join(workflowsDir, 'workflow.json'),
      JSON.stringify(workflowDefinition, null, 2),
      'utf-8'
    );
  }

  async rollback(context: ExportContext): Promise<void> {
    const workflowsDir = path.join(context.workingDir, 'workflows');
    await fs.rm(workflowsDir, { recursive: true, force: true }).catch(() => {});
  }
}

class GenerateWorkflowSchemaStep implements IExportStep {
  name = 'generate-workflow-schema';
  description = 'Generate workflow JSON schema files';
  estimatedDurationMs = 2000;
  retryable = true;
  priority = 4;

  async execute(context: ExportContext): Promise<void> {
    const { workingDir } = context;
    const schemaDir = path.join(workingDir, 'schemas');
    await fs.mkdir(schemaDir, { recursive: true });

    const schema = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        id: { type: 'string' },
        steps: { type: 'array' },
      },
    };

    await fs.writeFile(
      path.join(schemaDir, 'workflow.schema.json'),
      JSON.stringify(schema, null, 2),
      'utf-8'
    );
  }

  async rollback(context: ExportContext): Promise<void> {
    const schemaDir = path.join(context.workingDir, 'schemas');
    await fs.rm(schemaDir, { recursive: true, force: true }).catch(() => {});
  }
}

class GenerateWorkflowDockerConfigStep implements IExportStep {
  name = 'generate-workflow-docker-config';
  description = 'Create Docker configuration for workflow service';
  estimatedDurationMs = 3000;
  retryable = true;
  priority = 5;

  async execute(context: ExportContext): Promise<void> {
    const { workingDir } = context;

    const dockerfile = `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
CMD ["node", "dist/index.js"]
`.trim();

    await fs.writeFile(
      path.join(workingDir, 'Dockerfile'),
      dockerfile,
      'utf-8'
    );
  }

  async rollback(context: ExportContext): Promise<void> {
    await fs
      .unlink(path.join(context.workingDir, 'Dockerfile'))
      .catch(() => {});
  }
}

class GenerateWorkflowREADMEStep implements IExportStep {
  name = 'generate-workflow-readme';
  description = 'Generate README with workflow documentation';
  estimatedDurationMs = 2000;
  retryable = true;
  priority = 6;

  async execute(context: ExportContext): Promise<void> {
    const { workingDir } = context;
    const readme = `# ${context.toolData.name} - Workflow Engine

Standalone workflow engine exported from Tool Registry.

## Setup

\`\`\`bash
npm install
npm run build
npm start
\`\`\`

## Workflow Definitions

See \`workflows/\` directory for workflow definitions.
`.trim();

    await fs.writeFile(path.join(workingDir, 'README.md'), readme, 'utf-8');
  }

  async rollback(context: ExportContext): Promise<void> {
    await fs.unlink(path.join(context.workingDir, 'README.md')).catch(() => {});
  }
}

class PackageWorkflowArchiveStep implements IExportStep {
  name = 'package-workflow-archive';
  description = 'Package files into .tar.gz archive';
  estimatedDurationMs = 10000;
  retryable = true;
  priority = 7;

  async execute(context: ExportContext): Promise<void> {
    const { workingDir, jobId } = context;
    const archivePath = path.join(workingDir, '..', `${jobId}.tar.gz`);

    await tar.create(
      {
        gzip: true,
        file: archivePath,
        cwd: workingDir,
      },
      ['.']
    );

    context.metadata.packagePath = archivePath;
    const stats = await fs.stat(archivePath);
    context.metadata.packageSize = stats.size;
  }

  async rollback(context: ExportContext): Promise<void> {
    const packagePath = context.metadata.packagePath as string;
    if (packagePath) {
      await fs.unlink(packagePath).catch(() => {});
    }
  }
}
