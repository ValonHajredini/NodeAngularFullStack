/**
 * Pre-flight Validation Service
 * Validates tool data, system resources, and dependencies before export
 * Epic 33.1: Export Core Infrastructure - Story 33.1.4
 */

import {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationSeverity,
  ToolRegistryRecord,
  ToolStatus,
} from '@nodeangularfullstack/shared';
import { ToolRegistryRepository } from '../repositories/tool-registry.repository';
import { FormSchemasRepository } from '../repositories/form-schemas.repository';
import { FormSubmissionsRepository } from '../repositories/form-submissions.repository';
import { ThemesRepository } from '../repositories/themes.repository';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger.utils';

const execAsync = promisify(exec);

/**
 * Pre-flight validation service.
 * Validates tool readiness for export through sequential validation pipeline.
 * Implements fail-fast principle to prevent wasted resources on invalid exports.
 */
export class PreFlightValidator {
  /** Minimum required disk space in megabytes */
  private readonly MIN_DISK_SPACE_MB = 500;

  /** Export temporary directory path */
  private readonly EXPORT_TEMP_DIR =
    process.env.EXPORT_TEMP_DIR || '/tmp/exports';

  /** Supported tool types for export */
  private readonly SUPPORTED_TOOL_TYPES = ['forms', 'workflows', 'themes'];

  /** Timeout for dependency checks in milliseconds */
  private readonly DEPENDENCY_CHECK_TIMEOUT_MS = 2000;

  /**
   * Create pre-flight validator.
   * @param toolRegistryRepo - Tool registry repository for tool data access
   * @param formSchemasRepo - Form schemas repository for form validation
   * @param formSubmissionsRepo - Form submissions repository for submission counting
   * @param themesRepo - Themes repository for theme validation
   */
  constructor(
    private readonly toolRegistryRepo: ToolRegistryRepository,
    private readonly formSchemasRepo: FormSchemasRepository,
    private readonly formSubmissionsRepo: FormSubmissionsRepository,
    private readonly themesRepo: ThemesRepository
  ) {}

  /**
   * Validate tool is ready for export.
   * Runs sequential validation pipeline with fail-fast behavior.
   *
   * @param toolId - Tool registry ID to validate
   * @returns Validation result with errors, warnings, and info
   *
   * @example
   * const result = await validator.validate('tool-123');
   * if (!result.success) {
   *   console.error('Validation failed:', result.errors);
   * }
   */
  async validate(toolId: string): Promise<ValidationResult> {
    const report = new ValidationReportBuilder();

    try {
      logger.info('Starting pre-flight validation', { toolId });

      // Step 1: Tool Existence (critical - fail fast if tool not found)
      const tool = await this.validateToolExists(toolId, report);
      if (!tool) {
        logger.warn('Tool not found during validation', { toolId });
        return report.build();
      }

      // Step 2: Tool Data Completeness
      await this.validateToolDataCompleteness(tool, report);

      // Step 3: Database Integrity (check referenced data exists)
      await this.validateDatabaseIntegrity(tool, report);

      // Step 4: System Resources (disk space, temp directory)
      await this.validateSystemResources(report);

      // Step 5: Dependencies (tar, npm, Docker)
      await this.validateDependencies(report);

      // Step 6: Configuration (environment variables, settings)
      await this.validateConfiguration(report);

      const result = report.build();
      logger.info('Pre-flight validation completed', {
        toolId,
        success: result.success,
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
      });

      return result;
    } catch (error) {
      logger.error('Validation pipeline failed', { toolId, error });
      report.addError(
        `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'system'
      );
      return report.build();
    }
  }

  /**
   * Step 1: Validate tool exists in registry.
   * Critical validation - returns null on failure to halt pipeline.
   *
   * @param toolId - Tool ID to validate
   * @param report - Validation report builder
   * @returns Tool record if found, null otherwise
   */
  private async validateToolExists(
    toolId: string,
    report: ValidationReportBuilder
  ): Promise<ToolRegistryRecord | null> {
    try {
      const tool = await this.toolRegistryRepo.findById(toolId);

      if (!tool) {
        report.addError(
          `Tool ${toolId} not found in registry`,
          'tool_existence'
        );
        return null;
      }

      // Check tool status (warning if not active)
      if (tool.status !== ToolStatus.ACTIVE) {
        report.addWarning(
          `Tool status is '${tool.status}'. Only active tools should be exported.`,
          'tool_status'
        );
      }

      // Validate tool type is supported
      if (!this.SUPPORTED_TOOL_TYPES.includes(tool.toolType)) {
        report.addError(
          `Tool type '${tool.toolType}' is not supported for export`,
          'tool_type'
        );
        return null;
      }

      report.addInfo(`Tool '${tool.name}' (${tool.toolType}) found`);
      return tool;
    } catch (error) {
      logger.error('Tool existence validation failed', { toolId, error });
      report.addError(
        `Failed to validate tool existence: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'tool_existence'
      );
      return null;
    }
  }

  /**
   * Step 2: Validate tool data completeness.
   * Checks required metadata fields based on tool type.
   *
   * @param tool - Tool record to validate
   * @param report - Validation report builder
   */
  private async validateToolDataCompleteness(
    tool: ToolRegistryRecord,
    report: ValidationReportBuilder
  ): Promise<void> {
    try {
      // Check tool name
      if (!tool.name || tool.name.trim() === '') {
        report.addError('Tool name is missing or empty', 'tool_name');
      }

      // Check metadata exists
      if (!tool.toolMetadata || typeof tool.toolMetadata !== 'object') {
        report.addError('Tool metadata is missing or invalid', 'tool_metadata');
        return;
      }

      // Type-specific metadata validation
      if (tool.toolType === 'forms') {
        if (!tool.toolMetadata.formSchemaId) {
          report.addError(
            'Form schema ID is missing in tool metadata',
            'form_schema_id'
          );
        }
      } else if (tool.toolType === 'workflows') {
        if (!tool.toolMetadata.workflowId) {
          report.addError(
            'Workflow ID is missing in tool metadata',
            'workflow_id'
          );
        }
      } else if (tool.toolType === 'themes') {
        if (!tool.toolMetadata.themeId) {
          report.addError('Theme ID is missing in tool metadata', 'theme_id');
        }
      }

      // Validate manifest if present
      if (tool.manifest_json) {
        try {
          // Validate it's valid JSON structure
          JSON.parse(JSON.stringify(tool.manifest_json));
          report.addInfo('Tool manifest is valid JSON');
        } catch (error) {
          report.addError('Tool manifest is invalid JSON', 'manifest');
        }
      }

      report.addInfo('Tool data completeness validation passed');
    } catch (error) {
      logger.error('Tool data completeness validation failed', {
        toolId: tool.tool_id,
        error,
      });
      report.addError(
        `Data completeness check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'tool_data'
      );
    }
  }

  /**
   * Step 3: Validate database integrity.
   * Checks that referenced data (forms, workflows, themes) exists in database.
   *
   * @param tool - Tool record to validate
   * @param report - Validation report builder
   */
  private async validateDatabaseIntegrity(
    tool: ToolRegistryRecord,
    report: ValidationReportBuilder
  ): Promise<void> {
    try {
      if (tool.toolType === 'forms') {
        await this.validateFormIntegrity(tool, report);
      } else if (tool.toolType === 'themes') {
        await this.validateThemeIntegrity(tool, report);
      } else if (tool.toolType === 'workflows') {
        // Workflow validation would go here when workflow repository exists
        report.addInfo('Workflow validation not yet implemented');
      }

      report.addInfo('Database integrity validation passed');
    } catch (error) {
      logger.error('Database integrity validation failed', {
        toolId: tool.tool_id,
        error,
      });
      report.addError(
        `Database integrity check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'database_integrity'
      );
    }
  }

  /**
   * Validate form-specific database integrity.
   *
   * @param tool - Tool record (must be form type)
   * @param report - Validation report builder
   */
  private async validateFormIntegrity(
    tool: ToolRegistryRecord,
    report: ValidationReportBuilder
  ): Promise<void> {
    const formSchemaId = tool.toolMetadata.formSchemaId;

    if (!formSchemaId) {
      return; // Already caught in data completeness check
    }

    // Check form schema exists
    const formSchema = await this.formSchemasRepo.findById(formSchemaId);
    if (!formSchema) {
      report.addError(
        `Form schema ${formSchemaId} not found in database`,
        'form_schema'
      );
      return;
    }

    // Check form has fields defined
    const fields = formSchema.fields || [];
    if (fields.length === 0) {
      report.addError('Form has no fields defined', 'form_fields');
    } else {
      report.addInfo(`Form has ${fields.length} fields`);
    }

    // Check submission count (warning if zero)
    try {
      const submissionCount =
        await this.formSubmissionsRepo.countByFormSchemaId(formSchemaId);
      if (submissionCount === 0) {
        report.addWarning('Form has no submissions yet', 'form_submissions');
      } else {
        report.addInfo(`Form has ${submissionCount} submissions`);
      }
    } catch (error) {
      logger.warn('Failed to count form submissions', { formSchemaId, error });
      report.addWarning(
        'Could not verify submission count',
        'form_submissions'
      );
    }
  }

  /**
   * Validate theme-specific database integrity.
   *
   * @param tool - Tool record (must be theme type)
   * @param report - Validation report builder
   */
  private async validateThemeIntegrity(
    tool: ToolRegistryRecord,
    report: ValidationReportBuilder
  ): Promise<void> {
    const themeId = tool.toolMetadata.themeId;

    if (!themeId) {
      return; // Already caught in data completeness check
    }

    // Check theme exists
    const theme = await this.themesRepo.findById(themeId);
    if (!theme) {
      report.addError(`Theme ${themeId} not found in database`, 'theme');
      return;
    }

    // Validate theme has configuration
    if (!theme.themeConfig || typeof theme.themeConfig !== 'object') {
      report.addError(
        'Theme configuration is missing or invalid',
        'theme_config'
      );
    } else {
      report.addInfo('Theme configuration is valid');
    }
  }

  /**
   * Step 4: Validate system resources.
   * Checks disk space, temp directory access, and database connections.
   *
   * @param report - Validation report builder
   */
  private async validateSystemResources(
    report: ValidationReportBuilder
  ): Promise<void> {
    try {
      // Check disk space
      try {
        const stats = await fs.statfs(this.EXPORT_TEMP_DIR);
        const availableMB = (stats.bavail * stats.bsize) / (1024 * 1024);

        if (availableMB < this.MIN_DISK_SPACE_MB) {
          report.addError(
            `Insufficient disk space: ${availableMB.toFixed(0)}MB available, ${this.MIN_DISK_SPACE_MB}MB required`,
            'disk_space'
          );
        } else {
          report.addInfo(`Disk space: ${availableMB.toFixed(0)}MB available`);
        }
      } catch (error) {
        logger.warn('Disk space check failed', { error });
        report.addWarning(
          'Could not verify disk space availability',
          'disk_space'
        );
      }

      // Check and create temp directory if needed
      try {
        await fs.mkdir(this.EXPORT_TEMP_DIR, { recursive: true });
        await fs.access(this.EXPORT_TEMP_DIR, fs.constants.W_OK);
        report.addInfo('Export temp directory is writable');
      } catch (error) {
        report.addError(
          `Export temp directory not writable: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'temp_directory'
        );
      }

      report.addInfo('System resource validation passed');
    } catch (error) {
      logger.error('System resource validation failed', { error });
      report.addError(
        `System resource check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'system_resources'
      );
    }
  }

  /**
   * Step 5: Validate dependencies.
   * Checks for required external commands (tar, npm, Docker).
   *
   * @param report - Validation report builder
   */
  private async validateDependencies(
    report: ValidationReportBuilder
  ): Promise<void> {
    // Check tar command (required for archiving)
    try {
      await this.execWithTimeout(
        'tar --version',
        this.DEPENDENCY_CHECK_TIMEOUT_MS
      );
      report.addInfo('tar command available');
    } catch (error) {
      report.addError(
        'tar command not found (required for package archiving)',
        'tar'
      );
    }

    // Check npm (optional but recommended)
    try {
      await this.execWithTimeout(
        'npm --version',
        this.DEPENDENCY_CHECK_TIMEOUT_MS
      );
      report.addInfo('npm command available');
    } catch (error) {
      report.addWarning(
        'npm command not found (optional for package.json generation)',
        'npm'
      );
    }

    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);
    if (majorVersion < 18) {
      report.addError(
        `Node.js version ${nodeVersion} is below minimum required version 18`,
        'node_version'
      );
    } else {
      report.addInfo(`Node.js version ${nodeVersion}`);
    }

    // Check Docker if enabled (optional)
    if (process.env.DOCKER_EXPORT_ENABLED === 'true') {
      try {
        await this.execWithTimeout(
          'docker --version',
          this.DEPENDENCY_CHECK_TIMEOUT_MS
        );
        report.addInfo('Docker available for export');
      } catch (error) {
        report.addWarning(
          'Docker not found (optional, only needed if Docker export enabled)',
          'docker'
        );
      }
    }
  }

  /**
   * Step 6: Validate configuration.
   * Checks environment variables and export settings.
   *
   * @param report - Validation report builder
   */
  private async validateConfiguration(
    report: ValidationReportBuilder
  ): Promise<void> {
    // Check DATABASE_URL (critical)
    if (!process.env.DATABASE_URL) {
      report.addError(
        'DATABASE_URL environment variable not set',
        'config_database_url'
      );
    }

    // Check export timeout configuration
    const timeout = parseInt(process.env.EXPORT_TIMEOUT_MS || '300000');
    if (timeout < 60000) {
      report.addWarning(
        'Export timeout is less than 1 minute',
        'config_timeout'
      );
    }

    // Check max retries configuration
    const maxRetries = parseInt(process.env.EXPORT_MAX_RETRIES || '3');
    if (maxRetries < 1 || maxRetries > 10) {
      report.addWarning(
        'Export max retries should be between 1 and 10',
        'config_max_retries'
      );
    }

    // Check export temp directory configuration
    if (this.EXPORT_TEMP_DIR.length === 0) {
      report.addError('Export temp directory path is empty', 'config_temp_dir');
    }

    report.addInfo('Configuration validation complete');
  }

  /**
   * Execute command with timeout.
   *
   * @param command - Command to execute
   * @param timeoutMs - Timeout in milliseconds
   * @returns Command output
   */
  private async execWithTimeout(
    command: string,
    timeoutMs: number
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Command timeout'));
      }, timeoutMs);

      execAsync(command)
        .then((result) => {
          clearTimeout(timeout);
          resolve(result.stdout);
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }
}

/**
 * Validation report builder.
 * Aggregates validation results (errors, warnings, info) into structured report.
 */
class ValidationReportBuilder {
  private errors: ValidationError[] = [];
  private warnings: ValidationWarning[] = [];
  private info: string[] = [];

  /**
   * Add validation error.
   * Errors prevent export from proceeding.
   *
   * @param message - Error message
   * @param field - Field or check that failed
   */
  addError(message: string, field: string): void {
    this.errors.push({
      message,
      field,
      severity: ValidationSeverity.ERROR,
    });
  }

  /**
   * Add validation warning.
   * Warnings allow export to proceed with notice.
   *
   * @param message - Warning message
   * @param field - Field or check that triggered warning
   */
  addWarning(message: string, field: string): void {
    this.warnings.push({ message, field });
  }

  /**
   * Add informational message.
   * Info messages provide context about validation checks.
   *
   * @param message - Info message
   */
  addInfo(message: string): void {
    this.info.push(message);
  }

  /**
   * Build final validation result.
   * Determines success based on error count.
   *
   * @returns Complete validation result
   */
  build(): ValidationResult {
    return {
      success: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      info: this.info,
      timestamp: new Date(),
      estimatedDurationMs: this.calculateEstimatedDuration(),
    };
  }

  /**
   * Calculate estimated export duration based on validation results.
   * This is a simple heuristic - can be enhanced based on tool complexity.
   *
   * @returns Estimated duration in milliseconds
   */
  private calculateEstimatedDuration(): number {
    // Base duration: 30 seconds
    let duration = 30000;

    // Add time for warnings (each warning adds 5 seconds)
    duration += this.warnings.length * 5000;

    return duration;
  }
}
