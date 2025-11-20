/**
 * Forms export strategy implementation.
 * Exports form builder tools as standalone Express.js services.
 * Epic 33.1: Export Core Infrastructure
 */

import {
  BaseExportStrategy,
  IExportStep,
  ExportContext,
} from './base.strategy';
import { ToolRegistryRecord } from '@nodeangularfullstack/shared';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as tar from 'tar';

/**
 * Export strategy for form builder tools.
 * Generates standalone Express.js service with form schemas and submission handling.
 */
export class FormsExportStrategy extends BaseExportStrategy {
  /**
   * Validate form tool data before export.
   * @param toolData - Tool registry record
   * @throws Error if tool type is not 'forms' or required metadata missing
   */
  validateToolData(toolData: ToolRegistryRecord): void {
    // Validate tool is a form-related tool
    if (!toolData.tool_id.includes('form')) {
      throw new Error(`Invalid tool for forms export: ${toolData.tool_id}`);
    }

    // Validate required metadata fields using base class helper
    this.validateRequiredMetadata(toolData, ['formSchemaId']);
  }

  /**
   * Generate package metadata for form service.
   * @param toolData - Tool registry record
   * @returns Package metadata object (package.json content)
   */
  generatePackageMetadata(
    toolData: ToolRegistryRecord
  ): Record<string, unknown> {
    return {
      name: `form-service-${toolData.tool_id}`,
      version: '1.0.0',
      description: `Standalone form service exported from ${toolData.name}`,
      main: 'dist/server.js',
      scripts: {
        dev: 'ts-node src/server.ts',
        build: 'tsc',
        start: 'node dist/server.js',
        'db:migrate': 'npx prisma migrate deploy',
        'db:seed': 'ts-node prisma/seed.ts',
      },
      dependencies: {
        express: '^4.19.2',
        pg: '^8.11.3',
        '@prisma/client': '^5.11.0',
        dotenv: '^16.4.5',
        cors: '^2.8.5',
        helmet: '^7.1.0',
        'express-validator': '^7.0.1',
      },
      devDependencies: {
        typescript: '^5.3.3',
        '@types/express': '^4.17.21',
        '@types/node': '^20.11.30',
        '@types/cors': '^2.8.17',
        'ts-node': '^10.9.2',
        prisma: '^5.11.0',
      },
      engines: {
        node: '>=18.0.0',
      },
    };
  }

  /**
   * Get ordered list of export steps for forms.
   * @param _toolData - Tool registry record (unused in basic implementation)
   * @returns Array of 8 export steps
   */
  getSteps(_toolData: ToolRegistryRecord): IExportStep[] {
    return [
      new ValidateFormDataStep(),
      new GenerateExpressBoilerplateStep(),
      new CopyFormSchemasStep(),
      new GeneratePrismaSchemaStep(),
      new GenerateMigrationsStep(),
      new GenerateDockerConfigStep(),
      new GenerateREADMEStep(),
      new PackageArchiveStep(),
    ];
  }
}

/**
 * Step 1: Validate form tool data.
 * Verifies that form schemas and submissions exist before export.
 */
class ValidateFormDataStep implements IExportStep {
  name = 'validate-form-data';
  description = 'Validate form schemas and submissions exist';
  estimatedDurationMs = 2000; // 2 seconds
  retryable = true;
  priority = 1;

  async execute(context: ExportContext): Promise<void> {
    const config = context.toolData.manifest_json?.config ?? {};
    const formSchemaId = config.formSchemaId as string;

    if (!formSchemaId) {
      throw new Error('Form schema ID not found in tool metadata');
    }

    // Store form schema ID in context for later steps
    context.metadata.formSchemaId = formSchemaId;

    // TODO: In a real implementation, query the forms repository to verify schema exists
    // For now, we'll store mock data
    context.metadata.formSchema = {
      id: formSchemaId,
      schema: { fields: [] },
    };
    context.metadata.submissionCount = 0;
  }

  async rollback(_context: ExportContext): Promise<void> {
    // No cleanup needed for validation step
  }
}

/**
 * Step 2: Generate Express.js boilerplate.
 * Creates Express.js TypeScript server with form submission endpoints.
 */
class GenerateExpressBoilerplateStep implements IExportStep {
  name = 'generate-express-boilerplate';
  description = 'Generate Express.js TypeScript boilerplate';
  estimatedDurationMs = 5000; // 5 seconds
  retryable = true;
  priority = 2;

  async execute(context: ExportContext): Promise<void> {
    const { workingDir } = context;
    const srcDir = path.join(workingDir, 'src');

    // Create directory structure
    await fs.mkdir(srcDir, { recursive: true });
    await fs.mkdir(path.join(srcDir, 'controllers'), { recursive: true });
    await fs.mkdir(path.join(srcDir, 'routes'), { recursive: true });

    // Generate server.ts
    const serverCode = this.generateServerCode();
    await fs.writeFile(path.join(srcDir, 'server.ts'), serverCode, 'utf-8');

    // Generate forms controller
    const controllerCode = this.generateControllerCode();
    await fs.writeFile(
      path.join(srcDir, 'controllers', 'forms.controller.ts'),
      controllerCode,
      'utf-8'
    );

    // Generate routes
    const routesCode = this.generateRoutesCode();
    await fs.writeFile(
      path.join(srcDir, 'routes', 'forms.routes.ts'),
      routesCode,
      'utf-8'
    );

    // Generate package.json
    const strategy = new FormsExportStrategy();
    const packageJson = strategy.generatePackageMetadata(context.toolData);
    await fs.writeFile(
      path.join(workingDir, 'package.json'),
      JSON.stringify(packageJson, null, 2),
      'utf-8'
    );

    // Generate tsconfig.json
    const tsconfigJson = this.generateTsConfig();
    await fs.writeFile(
      path.join(workingDir, 'tsconfig.json'),
      JSON.stringify(tsconfigJson, null, 2),
      'utf-8'
    );

    // Generate .env.example
    const envExample = this.generateEnvExample();
    await fs.writeFile(
      path.join(workingDir, '.env.example'),
      envExample,
      'utf-8'
    );
  }

  async rollback(context: ExportContext): Promise<void> {
    const filesToDelete = [
      'src/server.ts',
      'src/controllers/forms.controller.ts',
      'src/routes/forms.routes.ts',
      'package.json',
      'tsconfig.json',
      '.env.example',
    ];

    for (const file of filesToDelete) {
      const filePath = path.join(context.workingDir, file);
      await fs.unlink(filePath).catch(() => {});
    }
  }

  private generateServerCode(): string {
    return `import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import formsRoutes from './routes/forms.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/forms', formsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(\`Form service running on port \${PORT}\`);
});
`.trim();
  }

  private generateControllerCode(): string {
    return `import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Handle form submission
 */
export const submitForm = async (req: Request, res: Response): Promise<void> => {
  try {
    const submissionData = req.body;

    // Validate submission data
    if (!submissionData || typeof submissionData !== 'object') {
      res.status(400).json({ error: 'Invalid submission data' });
      return;
    }

    // TODO: Validate against form schema
    // TODO: Sanitize user input

    // Store submission
    const submission = await prisma.formSubmission.create({
      data: {
        submissionData: JSON.stringify(submissionData),
        submittedAt: new Date(),
      },
    });

    res.status(201).json({
      success: true,
      submissionId: submission.id,
      message: 'Form submitted successfully',
    });
  } catch (error) {
    console.error('Form submission error:', error);
    res.status(500).json({ error: 'Failed to submit form' });
  }
};

/**
 * Get form schema
 */
export const getFormSchema = async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = await prisma.formSchema.findFirst();

    if (!schema) {
      res.status(404).json({ error: 'Form schema not found' });
      return;
    }

    res.json({
      schema: JSON.parse(schema.schemaData),
    });
  } catch (error) {
    console.error('Error fetching schema:', error);
    res.status(500).json({ error: 'Failed to fetch form schema' });
  }
};
`.trim();
  }

  private generateRoutesCode(): string {
    return `import { Router } from 'express';
import { submitForm, getFormSchema } from '../controllers/forms.controller.js';

const router = Router();

// POST /api/forms/submit - Submit form data
router.post('/submit', submitForm);

// GET /api/forms/schema - Get form schema
router.get('/schema', getFormSchema);

export default router;
`.trim();
  }

  private generateTsConfig(): Record<string, unknown> {
    return {
      compilerOptions: {
        target: 'ES2020',
        module: 'ESNext',
        moduleResolution: 'node',
        outDir: './dist',
        rootDir: './src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist'],
    };
  }

  private generateEnvExample(): string {
    return `# Database Configuration
DATABASE_URL="postgresql://user:password@localhost:5432/forms_db"

# Server Configuration
PORT=3000
NODE_ENV=production

# CORS Configuration
CORS_ORIGIN=*
`.trim();
  }
}

/**
 * Step 3: Copy form schemas from database.
 * Exports form schemas and submissions for the standalone service.
 */
class CopyFormSchemasStep implements IExportStep {
  name = 'copy-form-schemas';
  description = 'Copy form schemas and submissions';
  estimatedDurationMs = 3000; // 3 seconds
  retryable = true;
  priority = 3;

  async execute(context: ExportContext): Promise<void> {
    const { workingDir } = context;
    const dataDir = path.join(workingDir, 'data');
    await fs.mkdir(dataDir, { recursive: true });

    // Get form schema from context
    const formSchema = context.metadata.formSchema as Record<string, unknown>;

    // Write form schema to data directory
    await fs.writeFile(
      path.join(dataDir, 'form-schema.json'),
      JSON.stringify(formSchema, null, 2),
      'utf-8'
    );

    // TODO: In real implementation, export submissions from database
    // For now, create an empty submissions file
    await fs.writeFile(
      path.join(dataDir, 'submissions.json'),
      JSON.stringify([], null, 2),
      'utf-8'
    );
  }

  async rollback(context: ExportContext): Promise<void> {
    const dataDir = path.join(context.workingDir, 'data');
    await fs.rm(dataDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Step 4: Generate Prisma schema for standalone database.
 * Creates database schema definition for the standalone service.
 */
class GeneratePrismaSchemaStep implements IExportStep {
  name = 'generate-prisma-schema';
  description = 'Generate Prisma schema for standalone database';
  estimatedDurationMs = 2000; // 2 seconds
  retryable = true;
  priority = 4;

  async execute(context: ExportContext): Promise<void> {
    const { workingDir } = context;
    const prismaDir = path.join(workingDir, 'prisma');
    await fs.mkdir(prismaDir, { recursive: true });

    const schemaContent = this.generatePrismaSchema();
    await fs.writeFile(
      path.join(prismaDir, 'schema.prisma'),
      schemaContent,
      'utf-8'
    );
  }

  async rollback(context: ExportContext): Promise<void> {
    const prismaDir = path.join(context.workingDir, 'prisma');
    await fs.rm(prismaDir, { recursive: true, force: true }).catch(() => {});
  }

  private generatePrismaSchema(): string {
    return `// Prisma schema for standalone form service

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model FormSchema {
  id          String   @id @default(uuid())
  schemaData  String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("form_schemas")
}

model FormSubmission {
  id             String   @id @default(uuid())
  submissionData String
  submittedAt    DateTime @default(now())

  @@map("form_submissions")
}
`.trim();
  }
}

/**
 * Step 5: Generate database migrations.
 * Creates migration files for initializing the standalone database.
 */
class GenerateMigrationsStep implements IExportStep {
  name = 'generate-migrations';
  description = 'Generate database migration files';
  estimatedDurationMs = 2000; // 2 seconds
  retryable = true;
  priority = 5;

  async execute(context: ExportContext): Promise<void> {
    const { workingDir } = context;
    const migrationsDir = path.join(
      workingDir,
      'prisma',
      'migrations',
      '001_init'
    );
    await fs.mkdir(migrationsDir, { recursive: true });

    const migrationSql = this.generateMigrationSql();
    await fs.writeFile(
      path.join(migrationsDir, 'migration.sql'),
      migrationSql,
      'utf-8'
    );
  }

  async rollback(context: ExportContext): Promise<void> {
    const migrationsDir = path.join(context.workingDir, 'prisma', 'migrations');
    await fs
      .rm(migrationsDir, { recursive: true, force: true })
      .catch(() => {});
  }

  private generateMigrationSql(): string {
    return `-- CreateTable
CREATE TABLE "form_schemas" (
    "id" TEXT NOT NULL,
    "schemaData" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_schemas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_submissions" (
    "id" TEXT NOT NULL,
    "submissionData" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id")
);
`.trim();
  }
}

/**
 * Step 6: Generate Docker configuration.
 * Creates Dockerfile and docker-compose.yml for containerized deployment.
 */
class GenerateDockerConfigStep implements IExportStep {
  name = 'generate-docker-config';
  description = 'Generate Docker configuration files';
  estimatedDurationMs = 3000; // 3 seconds
  retryable = true;
  priority = 6;

  async execute(context: ExportContext): Promise<void> {
    const { workingDir } = context;

    // Generate Dockerfile
    const dockerfile = this.generateDockerfile();
    await fs.writeFile(
      path.join(workingDir, 'Dockerfile'),
      dockerfile,
      'utf-8'
    );

    // Generate docker-compose.yml
    const dockerCompose = this.generateDockerCompose();
    await fs.writeFile(
      path.join(workingDir, 'docker-compose.yml'),
      dockerCompose,
      'utf-8'
    );

    // Generate .dockerignore
    const dockerignore = this.generateDockerignore();
    await fs.writeFile(
      path.join(workingDir, '.dockerignore'),
      dockerignore,
      'utf-8'
    );
  }

  async rollback(context: ExportContext): Promise<void> {
    const filesToDelete = ['Dockerfile', 'docker-compose.yml', '.dockerignore'];

    for (const file of filesToDelete) {
      const filePath = path.join(context.workingDir, file);
      await fs.unlink(filePath).catch(() => {});
    }
  }

  private generateDockerfile(): string {
    return `# Multi-stage build for production

FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Expose port
EXPOSE 3000

# Run migrations and start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
`.trim();
  }

  private generateDockerCompose(): string {
    return `version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: forms_db
      POSTGRES_USER: formuser
      POSTGRES_PASSWORD: formpass
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U formuser"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://formuser:formpass@postgres:5432/forms_db
      PORT: 3000
      NODE_ENV: production
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

volumes:
  postgres_data:
`.trim();
  }

  private generateDockerignore(): string {
    return `node_modules
npm-debug.log
dist
.env
.env.local
*.md
.git
.gitignore
`.trim();
  }
}

/**
 * Step 7: Generate README with setup instructions.
 * Creates documentation for deploying and using the standalone service.
 */
class GenerateREADMEStep implements IExportStep {
  name = 'generate-readme';
  description = 'Generate README with setup instructions';
  estimatedDurationMs = 2000; // 2 seconds
  retryable = true;
  priority = 7;

  async execute(context: ExportContext): Promise<void> {
    const { workingDir } = context;
    const readmeContent = this.generateREADME(context.toolData);
    await fs.writeFile(
      path.join(workingDir, 'README.md'),
      readmeContent,
      'utf-8'
    );
  }

  async rollback(context: ExportContext): Promise<void> {
    const readmePath = path.join(context.workingDir, 'README.md');
    await fs.unlink(readmePath).catch(() => {});
  }

  private generateREADME(toolData: ToolRegistryRecord): string {
    return `# ${toolData.name} - Standalone Form Service

Exported from the Tool Registry platform on ${new Date().toISOString()}.

## Overview

This is a standalone Express.js service for managing form submissions.
It includes a PostgreSQL database, REST API, and Docker configuration for easy deployment.

## Quick Start

### Using Docker (Recommended)

1. Start the services:
   \`\`\`bash
   docker-compose up -d
   \`\`\`

2. The API will be available at \`http://localhost:3000\`

3. Health check: \`http://localhost:3000/health\`

### Manual Setup

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Configure environment:
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your database credentials
   \`\`\`

3. Run database migrations:
   \`\`\`bash
   npm run db:migrate
   \`\`\`

4. Start the server:
   \`\`\`bash
   npm run dev  # Development
   npm start    # Production
   \`\`\`

## API Endpoints

### Get Form Schema
\`\`\`http
GET /api/forms/schema
\`\`\`

### Submit Form
\`\`\`http
POST /api/forms/submit
Content-Type: application/json

{
  "field1": "value1",
  "field2": "value2"
}
\`\`\`

## Database

The service uses PostgreSQL with Prisma ORM.

### Tables:
- \`form_schemas\`: Stores form schema definitions
- \`form_submissions\`: Stores submitted form data

### Migrations:
\`\`\`bash
npm run db:migrate
\`\`\`

## Environment Variables

See \`.env.example\` for required configuration.

## Production Deployment

1. Build Docker image:
   \`\`\`bash
   docker build -t form-service .
   \`\`\`

2. Run with docker-compose:
   \`\`\`bash
   docker-compose up -d
   \`\`\`

3. Monitor logs:
   \`\`\`bash
   docker-compose logs -f app
   \`\`\`

## Security Notes

- Always use environment variables for sensitive data
- Configure CORS_ORIGIN for production
- Use HTTPS in production
- Regularly update dependencies

## Support

This is an exported standalone service. For support, contact the original platform administrator.

---

**Exported Tool ID:** ${toolData.tool_id}
**Export Date:** ${new Date().toISOString()}
`.trim();
  }
}

/**
 * Step 8: Package files into .tar.gz archive.
 * Creates compressed archive of the complete standalone service.
 */
class PackageArchiveStep implements IExportStep {
  name = 'package-archive';
  description = 'Package files into .tar.gz archive';
  estimatedDurationMs = 10000; // 10 seconds
  retryable = true;
  priority = 8;

  async execute(context: ExportContext): Promise<void> {
    const { workingDir, jobId } = context;
    const archivePath = path.join(workingDir, '..', `${jobId}.tar.gz`);

    // Create tar.gz archive
    await tar.create(
      {
        gzip: true,
        file: archivePath,
        cwd: workingDir,
      },
      ['.'] // Include all files
    );

    // Store archive path in context
    context.metadata.packagePath = archivePath;

    // Get archive size
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
