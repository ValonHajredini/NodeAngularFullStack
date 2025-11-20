/**
 * Export Orchestrator Service
 * Coordinates export of tools as standalone service packages using strategy pattern
 * Epic 33.1: Export Core Infrastructure
 */

import {
  ExportJob,
  ExportJobStatus,
  ToolRegistryRecord,
} from '@nodeangularfullstack/shared';
import { ToolRegistryRepository } from '../repositories/tool-registry.repository';
import { ExportJobRepository } from '../repositories/export-job.repository';
import { ExportContext, IExportStep } from './export-strategies/base.strategy';
import { ExportStrategyFactory } from './export-strategies/factory';
import { PreFlightValidator } from './pre-flight-validator.service';
import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../utils/logger.utils';
import { generateFileChecksum } from '../utils/checksum.utils';
import { logTamperDetection } from '../utils/security-events.utils';

/**
 * Export orchestrator service.
 * Coordinates multi-step export process with progress tracking,
 * error handling, timeout protection, and rollback capabilities.
 */
export class ExportOrchestratorService {
  /** Temporary directory for export package generation */
  private readonly EXPORT_TEMP_DIR = '/tmp/exports';

  /** Maximum time allowed per export step (5 minutes) */
  private readonly STEP_TIMEOUT_MS = 5 * 60 * 1000;

  /** Maximum retry attempts for retryable steps */
  private readonly MAX_RETRIES = 3;

  /**
   * Create export orchestrator service.
   * @param toolRegistryRepo - Tool registry repository for tool data access
   * @param exportJobRepo - Export job repository for job persistence
   * @param preFlightValidator - Pre-flight validation service
   */
  constructor(
    private readonly toolRegistryRepo: ToolRegistryRepository,
    private readonly exportJobRepo: ExportJobRepository,
    private readonly preFlightValidator: PreFlightValidator
  ) {}

  /**
   * Start export job for a tool.
   * Creates job record and executes export asynchronously with pre-flight validation.
   * @param toolId - Tool registry ID to export
   * @param userId - User ID initiating export
   * @returns Export job record (job executes in background)
   * @throws Error if tool not found, validation fails, or user lacks permission
   */
  async startExport(toolId: string, userId: string): Promise<ExportJob> {
    // Step 1: Run pre-flight validation
    logger.info('Running pre-flight validation before export', {
      toolId,
      userId,
    });
    const validationResult = await this.preFlightValidator.validate(toolId);

    // Step 2: Check validation result
    if (!validationResult.success) {
      const errorMessages = validationResult.errors
        .map((e) => e.message)
        .join('; ');
      logger.error('Pre-flight validation failed', {
        toolId,
        userId,
        errors: validationResult.errors,
      });
      throw new Error(`Export validation failed: ${errorMessages}`);
    }

    // Log warnings but allow export to proceed
    if (validationResult.warnings.length > 0) {
      logger.warn('Pre-flight validation warnings', {
        toolId,
        userId,
        warnings: validationResult.warnings,
      });
    }

    // Step 3: Get tool record (already validated, but needed for export)
    const tool = await this.toolRegistryRepo.findById(toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`);
    }

    // Step 4: Validate user has export permission
    await this.validateExportPermission(userId, toolId);

    // Step 5: Create export job record
    const jobId = randomUUID();
    const job = await this.exportJobRepo.create({
      jobId: jobId,
      toolId: toolId,
      userId: userId,
      status: ExportJobStatus.PENDING,
      stepsTotal: 0,
      currentStep: 'Initializing export...',
    });

    // Step 4: Execute export asynchronously (don't block API response)
    this.executeExport(job, tool).catch((error) => {
      console.error(`Export job ${jobId} failed:`, error);
      // Error already handled in executeExport, just log here
    });

    return job;
  }

  /**
   * Get export job status for polling.
   * @param jobId - Export job identifier
   * @returns Current export job status and progress
   * @throws Error if job not found
   */
  async getExportStatus(jobId: string): Promise<ExportJob> {
    const job = await this.exportJobRepo.findById(jobId);
    if (!job) {
      throw new Error(`Export job ${jobId} not found`);
    }

    return job;
  }

  /**
   * Cancel in-progress export job.
   * Stops execution and triggers rollback of completed steps.
   * @param jobId - Export job identifier
   * @param userId - User ID requesting cancellation
   * @throws Error if job not found, unauthorized, or cannot be cancelled
   */
  async cancelExport(jobId: string, userId: string): Promise<void> {
    // Step 1: Find job
    const job = await this.exportJobRepo.findById(jobId);
    if (!job) {
      throw new Error(`Export job ${jobId} not found`);
    }

    // Step 2: Validate user authorization
    if (job.userId !== userId) {
      throw new Error('Unauthorized to cancel this export job');
    }

    // Step 3: Validate job can be cancelled
    if (
      job.status !== ExportJobStatus.IN_PROGRESS &&
      job.status !== ExportJobStatus.PENDING
    ) {
      throw new Error(
        `Cannot cancel job with status: ${job.status}. Only pending or in-progress jobs can be cancelled.`
      );
    }

    // Step 4: Update job status to cancelling
    await this.exportJobRepo.update(jobId, {
      status: ExportJobStatus.CANCELLING,
      currentStep: 'Cancelling export...',
    });

    // Note: Actual cancellation and rollback happens in executeExport
    // when it detects the CANCELLING status. For now, we just mark it.

    // Step 5: Update to cancelled status
    await this.exportJobRepo.update(jobId, {
      status: ExportJobStatus.CANCELLED,
      currentStep: 'Export cancelled by user',
      completedAt: new Date(),
    });
  }

  /**
   * Execute export job with strategy pattern (private method).
   * Selects appropriate strategy, validates tool data, and executes steps.
   * @param job - Export job record
   * @param tool - Tool registry record
   */
  private async executeExport(
    job: ExportJob,
    tool: ToolRegistryRecord
  ): Promise<void> {
    const completedSteps: IExportStep[] = [];
    let context: ExportContext | null = null;

    try {
      // Step 1: Update job status to in_progress
      await this.exportJobRepo.update(job.jobId, {
        status: ExportJobStatus.IN_PROGRESS,
        currentStep: 'Selecting export strategy...',
      });

      // Step 2: Select export strategy based on tool type
      const toolType = this.getToolType(tool);
      const strategy = ExportStrategyFactory.create(toolType);

      // Step 3: Validate tool data
      await this.exportJobRepo.update(job.jobId, {
        currentStep: 'Validating tool data...',
      });
      strategy.validateToolData(tool);

      // Step 4: Get export steps from strategy
      const steps = strategy.getSteps(tool);
      await this.exportJobRepo.update(job.jobId, {
        stepsTotal: steps.length,
        currentStep: `Preparing ${steps.length} export steps...`,
      });

      // Step 5: Create working directory
      const workingDir = path.join(this.EXPORT_TEMP_DIR, job.jobId);
      await fs.mkdir(workingDir, { recursive: true });

      // Step 6: Create export context
      context = {
        jobId: job.jobId,
        toolId: tool.tool_id,
        userId: job.userId || '', // Provide empty string if userId is null
        workingDir,
        metadata: {},
        toolData: tool,
      };

      // Step 7: Execute steps sequentially
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];

        // Check if job was cancelled
        const currentJob = await this.exportJobRepo.findById(job.jobId);
        if (
          currentJob?.status === ExportJobStatus.CANCELLING ||
          currentJob?.status === ExportJobStatus.CANCELLED
        ) {
          console.log(`Export job ${job.jobId} cancelled, triggering rollback`);
          if (context) {
            await this.rollbackSteps(completedSteps, context);
          }
          return;
        }

        // Update progress before step execution
        const progressPercent = Math.round((i / steps.length) * 100);
        await this.exportJobRepo.update(job.jobId, {
          currentStep: step.description,
          progressPercentage: progressPercent,
        });

        // Execute step with retry and timeout
        try {
          console.log(`Executing step ${i + 1}/${steps.length}: ${step.name}`);
          await this.executeStepWithRetry(step, context);
          completedSteps.push(step);

          // Update progress after successful step
          await this.exportJobRepo.update(job.jobId, {
            stepsCompleted: i + 1,
            progressPercentage: Math.round(((i + 1) / steps.length) * 100),
          });
        } catch (error) {
          // Step failed - log error and trigger rollback
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          console.error(`Step ${step.name} failed:`, errorMessage);

          // Update job with error details
          await this.exportJobRepo.update(job.jobId, {
            status: ExportJobStatus.FAILED,
            errorMessage: `Step ${step.name} failed: ${errorMessage}`,
            currentStep: `Failed at: ${step.description}`,
            completedAt: new Date(),
          });

          // Trigger rollback
          if (context) {
            await this.rollbackSteps(completedSteps, context);
          }
          return;
        }
      }

      // Step 8: All steps completed successfully
      const completedAt = new Date();
      const packageExpiresAt = this.calculatePackageExpiration(
        completedAt,
        job.packageRetentionDays
      );

      // Step 9: Generate package checksum for integrity verification
      let packageChecksum: string | null = null;
      const packagePath = context?.metadata.packagePath as string;

      if (packagePath) {
        try {
          await this.exportJobRepo.update(job.jobId, {
            currentStep: 'Generating package checksum...',
          });

          logger.info('Generating SHA-256 checksum for export package', {
            jobId: job.jobId,
            packagePath,
          });

          packageChecksum = await generateFileChecksum(packagePath);

          logger.info('Package checksum generated successfully', {
            jobId: job.jobId,
            checksum: packageChecksum,
            algorithm: 'sha256',
          });
        } catch (error) {
          // Log error but don't fail the export - checksum is optional
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          logger.error('Failed to generate package checksum', {
            jobId: job.jobId,
            error: errorMessage,
          });
          // Continue without checksum
        }
      }

      await this.exportJobRepo.update(job.jobId, {
        status: ExportJobStatus.COMPLETED,
        currentStep: 'Export completed successfully',
        progressPercentage: 100,
        packagePath: context?.metadata.packagePath as string,
        packageSizeBytes: context?.metadata.packageSize as number,
        packageChecksum: packageChecksum,
        packageAlgorithm: packageChecksum ? 'sha256' : 'sha256', // Always set to sha256 (default)
        completedAt: completedAt,
        packageExpiresAt: packageExpiresAt,
      });

      console.log(`Export job ${job.jobId} completed successfully`);
    } catch (error) {
      // Unexpected error during orchestration
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      console.error(`Export job ${job.jobId} failed with error:`, errorMessage);

      // Update job as failed
      await this.exportJobRepo.update(job.jobId, {
        status: ExportJobStatus.FAILED,
        errorMessage: errorMessage,
        currentStep: 'Export failed unexpectedly',
        completedAt: new Date(),
      });

      // Attempt rollback if context exists
      if (context && completedSteps.length > 0) {
        await this.rollbackSteps(completedSteps, context);
      }
    }
  }

  /**
   * Execute single export step with retry logic (private method).
   * @param step - Export step to execute
   * @param context - Export context
   */
  private async executeStepWithRetry(
    step: IExportStep,
    context: ExportContext
  ): Promise<void> {
    let lastError: Error | null = null;
    const maxAttempts = step.retryable ? this.MAX_RETRIES : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Execute step with timeout protection
        await this.executeStepWithTimeout(step, context);
        return; // Success - exit retry loop
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        console.warn(
          `Step ${step.name} failed on attempt ${attempt}/${maxAttempts}:`,
          lastError.message
        );

        // If this is the last attempt or step is not retryable, throw error
        if (attempt === maxAttempts) {
          throw lastError;
        }

        // Wait before retry with exponential backoff
        const delayMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`Retrying step ${step.name} in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    // Should never reach here, but throw last error if we do
    throw lastError;
  }

  /**
   * Execute step with timeout protection (private method).
   * @param step - Export step to execute
   * @param context - Export context
   */
  private async executeStepWithTimeout(
    step: IExportStep,
    context: ExportContext
  ): Promise<void> {
    // Create timeout promise that rejects after STEP_TIMEOUT_MS
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            `Step ${step.name} timed out after ${this.STEP_TIMEOUT_MS}ms`
          )
        );
      }, this.STEP_TIMEOUT_MS);
    });

    // Race between step execution and timeout
    await Promise.race([step.execute(context), timeoutPromise]);
  }

  /**
   * Rollback completed steps in reverse order (private method).
   * @param completedSteps - Array of completed steps
   * @param context - Export context
   */
  private async rollbackSteps(
    completedSteps: IExportStep[],
    context: ExportContext
  ): Promise<void> {
    if (completedSteps.length === 0) {
      console.log('No steps to rollback');
      return;
    }

    console.log(`Rolling back ${completedSteps.length} completed steps...`);

    // Update job status to rolled_back
    await this.exportJobRepo.update(context.jobId, {
      status: ExportJobStatus.ROLLED_BACK,
      currentStep: `Rolling back ${completedSteps.length} steps...`,
    });

    // Rollback steps in reverse order (LIFO - last in, first out)
    const reversedSteps = [...completedSteps].reverse();

    for (const step of reversedSteps) {
      try {
        console.log(`Rolling back step: ${step.name}`);
        await step.rollback(context);
      } catch (error) {
        // Log rollback errors but continue with remaining rollbacks
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(`Rollback of step ${step.name} failed: ${errorMessage}`);
        // Don't throw - continue rolling back other steps
      }
    }

    // Clean up working directory
    try {
      console.log(`Cleaning up working directory: ${context.workingDir}`);
      await fs.rm(context.workingDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to clean up working directory:', error);
    }

    // Update job status to rolled_back
    await this.exportJobRepo.update(context.jobId, {
      status: ExportJobStatus.ROLLED_BACK,
      currentStep: 'Export rolled back successfully',
    });

    console.log(`Rollback complete for job ${context.jobId}`);
  }

  /**
   * Validate user has export permission (private method).
   * @param userId - User ID to validate
   * @param toolId - Tool ID being exported
   * @throws Error if user lacks permission
   */
  private async validateExportPermission(
    userId: string,
    toolId: string
  ): Promise<void> {
    // TODO: In production, integrate with AuthService to check:
    // 1. User role (admin, user, readonly)
    // 2. Tool ownership (user must own the tool or be admin)
    // 3. Tenant isolation (if multi-tenancy enabled)
    // 4. Export quota limits (prevent abuse)
    //
    // For now, we'll implement basic validation:

    if (!userId) {
      throw new Error('User ID is required for export permission validation');
    }

    if (!toolId) {
      throw new Error('Tool ID is required for export permission validation');
    }

    // Placeholder: In real implementation, call AuthService here
    // Example: const hasPermission = await authService.canExportTool(userId, toolId);
    // if (!hasPermission) throw new Error('User does not have permission to export this tool');

    // For now, assume all authenticated users with valid IDs have permission
    console.log(
      `Permission validated for user ${userId} to export tool ${toolId}`
    );
  }

  /**
   * Update download tracking for export job.
   * Atomically increments download count and updates last downloaded timestamp.
   * Called after successful package download (both full and range requests).
   *
   * @param jobId - Export job UUID
   * @param currentDownloadCount - Current download count (for atomic increment)
   * @returns Updated export job record
   * @throws Error if job not found
   *
   * @example
   * await orchestrator.updateDownloadTracking('job-123', 5);
   * // Result: download_count = 6, last_downloaded_at = NOW()
   */
  async updateDownloadTracking(
    jobId: string,
    _currentDownloadCount: number // Unused - kept for backwards compatibility
  ): Promise<ExportJob> {
    try {
      // Use atomic repository method for race-condition-safe increment
      const updatedJob = await this.exportJobRepo.incrementDownloadCount(jobId);

      console.log(
        `Download tracking updated: jobId=${jobId}, downloadCount=${updatedJob.downloadCount}`
      );

      return updatedJob;
    } catch (error) {
      console.error(
        `Failed to update download tracking: jobId=${jobId}`,
        error
      );
      throw new Error(
        `Failed to update download tracking: ${(error as Error).message}`
      );
    }
  }

  /**
   * Verify package integrity before download.
   * Computes current file checksum and compares with stored checksum.
   * Updates checksum_verified_at timestamp on successful verification.
   *
   * @param jobId - Export job UUID
   * @param packagePath - Absolute path to export package file
   * @param expectedChecksum - Expected SHA-256 checksum from database
   * @returns True if checksum matches, false if mismatch
   * @throws Error if file not found or checksum computation fails
   *
   * @example
   * const isValid = await orchestrator.verifyPackageIntegrity(
   *   'job-123',
   *   '/tmp/exports/export-customer-form.tar.gz',
   *   'a3f5b1c2d4e6f7a8b9c0d1e2f3a4b5c6...'
   * );
   * if (!isValid) {
   *   throw new Error('Package tampered');
   * }
   */
  async verifyPackageIntegrity(
    jobId: string,
    packagePath: string,
    expectedChecksum: string,
    userId: string
  ): Promise<boolean> {
    try {
      logger.info('Verifying package integrity before download', {
        jobId,
        packagePath,
      });

      // Compute current file checksum
      const actualChecksum = await generateFileChecksum(packagePath);

      // Compare checksums (case-insensitive)
      const checksumMatches =
        actualChecksum.toLowerCase() === expectedChecksum.toLowerCase();

      if (checksumMatches) {
        // Update verification timestamp on success
        await this.exportJobRepo.update(jobId, {
          checksumVerifiedAt: new Date(),
        });

        logger.info('Package integrity verified successfully', {
          jobId,
          packagePath,
        });
      } else {
        // Log checksum mismatch with administrator alert (potential tampering)
        logTamperDetection(
          jobId,
          userId,
          packagePath,
          expectedChecksum,
          actualChecksum
        );
      }

      return checksumMatches;
    } catch (error) {
      logger.error('Failed to verify package integrity', {
        jobId,
        packagePath,
        error: (error as Error).message,
      });
      throw new Error(
        `Failed to verify package integrity: ${(error as Error).message}`
      );
    }
  }

  /**
   * Calculate package expiration timestamp.
   * Adds retention days to completion timestamp.
   *
   * @param completedAt - Job completion timestamp
   * @param retentionDays - Number of days to retain package (default: 30)
   * @returns Package expiration timestamp
   *
   * @example
   * const expiresAt = calculatePackageExpiration(new Date(), 30);
   * // Returns date 30 days in future
   */
  private calculatePackageExpiration(
    completedAt: Date,
    retentionDays: number = 30
  ): Date {
    const expirationDate = new Date(completedAt);
    expirationDate.setDate(expirationDate.getDate() + retentionDays);
    return expirationDate;
  }

  /**
   * Extract tool type from tool record (private method).
   * Derives tool type from toolId or manifest config.
   * @param tool - Tool registry record
   * @returns Tool type string (forms, workflows, themes)
   */
  private getToolType(tool: ToolRegistryRecord): string {
    // First, try to get type from manifest.config.toolType
    const config = tool.manifest_json?.config;
    if (config && typeof config.toolType === 'string') {
      return config.toolType;
    }

    // Fallback: Derive type from tool_id
    // Examples: "form-builder" → "forms", "workflow-engine" → "workflows", "theme-designer" → "themes"
    if (tool.tool_id.includes('form')) {
      return 'forms';
    }
    if (tool.tool_id.includes('workflow')) {
      return 'workflows';
    }
    if (tool.tool_id.includes('theme')) {
      return 'themes';
    }

    // If no match, throw error
    throw new Error(
      `Cannot determine tool type for tool_id: ${tool.tool_id}. ` +
        `Please add 'toolType' to manifest.config or use a recognized tool_id pattern.`
    );
  }
}

export default ExportOrchestratorService;
