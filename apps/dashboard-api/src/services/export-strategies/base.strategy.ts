/**
 * Base export strategy interfaces and abstract class.
 * Defines the contract for tool-type-specific export strategies.
 * Epic 33.1: Export Core Infrastructure
 */

import { ToolRegistryRecord } from '@nodeangularfullstack/shared';

/**
 * Export context passed to each step in the export process.
 * Contains all data needed by any step to avoid global state.
 */
export interface ExportContext {
  /** Export job ID (UUID) */
  jobId: string;

  /** Tool being exported (tool_id from registry) */
  toolId: string;

  /** User who initiated the export */
  userId: string;

  /** Temporary working directory for export files */
  workingDir: string;

  /** Tool-specific metadata (forms, workflows, themes) */
  metadata: Record<string, unknown>;

  /** Complete tool data retrieved from registry */
  toolData: ToolRegistryRecord;
}

/**
 * Export step interface defining the contract for each step in the export process.
 * Each step must be independently executable and rollbackable.
 */
export interface IExportStep {
  /** Unique step identifier (kebab-case) */
  name: string;

  /** Human-readable step description for progress tracking */
  description: string;

  /** Estimated duration in milliseconds */
  estimatedDurationMs: number;

  /** Whether this step can be retried on failure */
  retryable: boolean;

  /** Step execution priority (lower = earlier, used for ordering) */
  priority: number;

  /**
   * Execute the export step.
   * @param context - Export context with tool data and working directory
   * @returns Promise resolving when step completes
   * @throws Error if step execution fails
   */
  execute(context: ExportContext): Promise<void>;

  /**
   * Rollback the export step (undo changes).
   * Called when export fails or is cancelled to cleanup partial work.
   * @param context - Export context
   * @returns Promise resolving when rollback completes
   */
  rollback(context: ExportContext): Promise<void>;
}

/**
 * Export strategy interface for tool-type-specific export logic.
 * Each tool type (forms, workflows, themes) implements this interface.
 */
export interface IExportStrategy {
  /**
   * Get ordered list of export steps for this tool type.
   * Steps are executed sequentially in the order returned.
   * @param toolData - Tool registry record
   * @returns Array of export steps sorted by priority
   */
  getSteps(toolData: ToolRegistryRecord): IExportStep[];

  /**
   * Validate tool data before export begins.
   * Throws error if tool data is invalid or missing required fields.
   * @param toolData - Tool registry record
   * @throws Error if tool data invalid
   */
  validateToolData(toolData: ToolRegistryRecord): void;

  /**
   * Generate package metadata (package.json, README frontmatter).
   * Creates metadata for the standalone service package.
   * @param toolData - Tool registry record
   * @returns Package metadata object
   */
  generatePackageMetadata(
    toolData: ToolRegistryRecord
  ): Record<string, unknown>;
}

/**
 * Base export strategy with common functionality.
 * Concrete strategies extend this class and implement abstract methods.
 */
export abstract class BaseExportStrategy implements IExportStrategy {
  /** Abstract methods that must be implemented by concrete strategies */
  abstract getSteps(toolData: ToolRegistryRecord): IExportStep[];
  abstract validateToolData(toolData: ToolRegistryRecord): void;
  abstract generatePackageMetadata(
    toolData: ToolRegistryRecord
  ): Record<string, unknown>;

  /**
   * Common step execution wrapper with error handling.
   * Provides consistent error messages across all strategies.
   * @param step - Export step to execute
   * @param context - Export context
   * @throws Error with step context if execution fails
   */
  protected async executeWithErrorHandling(
    step: IExportStep,
    context: ExportContext
  ): Promise<void> {
    try {
      await step.execute(context);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Step ${step.name} failed: ${errorMessage}`);
    }
  }

  /**
   * Validate that required metadata exists in tool data.
   * Helper method for concrete strategies.
   * @param toolData - Tool registry record
   * @param requiredFields - Array of required metadata field names
   * @throws Error if any required field is missing
   */
  protected validateRequiredMetadata(
    toolData: ToolRegistryRecord,
    requiredFields: string[]
  ): void {
    if (
      toolData.manifest_json === undefined ||
      toolData.manifest_json === null
    ) {
      throw new Error('Tool manifest is missing');
    }

    for (const field of requiredFields) {
      if (
        toolData.manifest_json.config === undefined ||
        toolData.manifest_json.config[field] === undefined
      ) {
        throw new Error(`Required metadata field missing: ${field}`);
      }
    }
  }

  /**
   * Get tool configuration from manifest.
   * Helper method to safely access tool config.
   * @param toolData - Tool registry record
   * @returns Tool configuration object
   */
  protected getToolConfig(
    toolData: ToolRegistryRecord
  ): Record<string, unknown> {
    return toolData.manifest_json?.config ?? {};
  }
}
