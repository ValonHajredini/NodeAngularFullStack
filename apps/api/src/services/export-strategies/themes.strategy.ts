/**
 * Themes export strategy implementation.
 * Exports theme tools as standalone CSS packages.
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
 * Export strategy for theme tools.
 * Generates standalone CSS theme package with variables and assets.
 */
export class ThemesExportStrategy extends BaseExportStrategy {
  validateToolData(toolData: ToolRegistryRecord): void {
    // Validate tool is a theme-related tool
    if (!toolData.tool_id.includes('theme')) {
      throw new Error(`Invalid tool for themes export: ${toolData.tool_id}`);
    }

    this.validateRequiredMetadata(toolData, ['themeId']);
  }

  generatePackageMetadata(
    toolData: ToolRegistryRecord
  ): Record<string, unknown> {
    return {
      name: `theme-${toolData.tool_id}`,
      version: '1.0.0',
      description: `Standalone CSS theme exported from ${toolData.name}`,
      main: 'index.css',
      files: ['index.css', 'variables.css', 'assets'],
      keywords: ['theme', 'css', 'design-system'],
    };
  }

  getSteps(_toolData: ToolRegistryRecord): IExportStep[] {
    return [
      new ValidateThemeDataStep(),
      new GenerateThemePackageStep(),
      new CopyThemeAssetsStep(),
      new GenerateThemeDocumentationStep(),
      new GenerateThemeNPMStructureStep(),
      new PackageThemeArchiveStep(),
    ];
  }
}

class ValidateThemeDataStep implements IExportStep {
  name = 'validate-theme-data';
  description = 'Validate theme data exists';
  estimatedDurationMs = 2000;
  retryable = true;
  priority = 1;

  async execute(context: ExportContext): Promise<void> {
    const config = context.toolData.manifest_json?.config ?? {};
    const themeId = config.themeId as string;

    if (!themeId) {
      throw new Error('Theme ID not found in tool metadata');
    }

    context.metadata.themeId = themeId;
    context.metadata.themeData = { id: themeId, colors: {}, fonts: {} };
  }

  async rollback(_context: ExportContext): Promise<void> {
    // No cleanup needed
  }
}

class GenerateThemePackageStep implements IExportStep {
  name = 'generate-theme-package';
  description = 'Generate CSS theme package with variables';
  estimatedDurationMs = 3000;
  retryable = true;
  priority = 2;

  async execute(context: ExportContext): Promise<void> {
    const { workingDir } = context;

    const variablesCSS = `:root {
  --primary-color: #007bff;
  --secondary-color: #6c757d;
  --background-color: #ffffff;
  --text-color: #212529;
  --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
`.trim();

    const indexCSS = `@import './variables.css';

body {
  font-family: var(--font-family);
  color: var(--text-color);
  background-color: var(--background-color);
}
`.trim();

    await fs.writeFile(
      path.join(workingDir, 'variables.css'),
      variablesCSS,
      'utf-8'
    );
    await fs.writeFile(path.join(workingDir, 'index.css'), indexCSS, 'utf-8');

    const strategy = new ThemesExportStrategy();
    const packageJson = strategy.generatePackageMetadata(context.toolData);
    await fs.writeFile(
      path.join(workingDir, 'package.json'),
      JSON.stringify(packageJson, null, 2),
      'utf-8'
    );
  }

  async rollback(context: ExportContext): Promise<void> {
    const filesToDelete = ['variables.css', 'index.css', 'package.json'];
    for (const file of filesToDelete) {
      await fs.unlink(path.join(context.workingDir, file)).catch(() => {});
    }
  }
}

class CopyThemeAssetsStep implements IExportStep {
  name = 'copy-theme-assets';
  description = 'Copy theme assets (fonts, images, backgrounds)';
  estimatedDurationMs = 5000;
  retryable = true;
  priority = 3;

  async execute(context: ExportContext): Promise<void> {
    const { workingDir } = context;
    const assetsDir = path.join(workingDir, 'assets');
    await fs.mkdir(assetsDir, { recursive: true });

    // Create placeholder assets
    const fontsDir = path.join(assetsDir, 'fonts');
    const imagesDir = path.join(assetsDir, 'images');
    await fs.mkdir(fontsDir, { recursive: true });
    await fs.mkdir(imagesDir, { recursive: true });

    await fs.writeFile(path.join(assetsDir, '.gitkeep'), '', 'utf-8');
  }

  async rollback(context: ExportContext): Promise<void> {
    const assetsDir = path.join(context.workingDir, 'assets');
    await fs.rm(assetsDir, { recursive: true, force: true }).catch(() => {});
  }
}

class GenerateThemeDocumentationStep implements IExportStep {
  name = 'generate-theme-documentation';
  description = 'Generate theme documentation (color palette, typography)';
  estimatedDurationMs = 2000;
  retryable = true;
  priority = 4;

  async execute(context: ExportContext): Promise<void> {
    const { workingDir } = context;
    const readme = `# ${context.toolData.name} - CSS Theme

Standalone CSS theme package.

## Installation

\`\`\`bash
npm install theme-${context.toolData.tool_id}
\`\`\`

## Usage

\`\`\`css
@import '~theme-${context.toolData.tool_id}/index.css';
\`\`\`

## Color Palette

See \`variables.css\` for color definitions.

## Typography

Default font stack: system fonts with sans-serif fallback.
`.trim();

    await fs.writeFile(path.join(workingDir, 'README.md'), readme, 'utf-8');
  }

  async rollback(context: ExportContext): Promise<void> {
    await fs.unlink(path.join(context.workingDir, 'README.md')).catch(() => {});
  }
}

class GenerateThemeNPMStructureStep implements IExportStep {
  name = 'generate-theme-npm-structure';
  description = 'Create NPM package structure';
  estimatedDurationMs = 2000;
  retryable = true;
  priority = 5;

  async execute(context: ExportContext): Promise<void> {
    const { workingDir } = context;
    const license = `MIT License

Copyright (c) ${new Date().getFullYear()}

Permission is hereby granted, free of charge...
`.trim();

    await fs.writeFile(path.join(workingDir, 'LICENSE'), license, 'utf-8');
  }

  async rollback(context: ExportContext): Promise<void> {
    await fs.unlink(path.join(context.workingDir, 'LICENSE')).catch(() => {});
  }
}

class PackageThemeArchiveStep implements IExportStep {
  name = 'package-theme-archive';
  description = 'Package files into .tar.gz archive';
  estimatedDurationMs = 10000;
  retryable = true;
  priority = 6;

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
