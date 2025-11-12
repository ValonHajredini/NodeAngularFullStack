import { ITemplateExecutor } from './template-executors/base-executor.interface';
import { InventoryExecutor } from './template-executors/inventory-executor';
import { AppointmentExecutor } from './template-executors/appointment-executor';
import { QuizExecutor } from './template-executors/quiz-executor';
import { inventoryRepository } from '../repositories/inventory.repository';
import { appointmentBookingRepository } from '../repositories/appointment-booking.repository';
import {
  FormSubmission,
  FormTemplate,
} from '@nodeangularfullstack/shared';

/**
 * Template Executor Registry Service
 *
 * Manages registration and selection of template executors based on business logic type.
 * Implements the Factory Pattern to instantiate appropriate executors.
 *
 * Epic 29: Form Template System with Business Logic
 * Story 29.11: Product Template with Inventory Tracking
 * Story 29.12: Appointment Booking Template with Time Slot Management
 *
 * @example
 * const executor = TemplateExecutorRegistry.getExecutor('inventory');
 * await executor.validate(submission, template, config);
 *
 * const appointmentExecutor = TemplateExecutorRegistry.getExecutor('appointment');
 * await appointmentExecutor.validate(submission, template, config);
 */
export class TemplateExecutorRegistry {
  /**
   * Registry mapping business logic types to executor instances.
   * Executors are singletons - instantiated once and reused.
   */
  private static executors: Map<string, ITemplateExecutor> = new Map();

  /**
   * Initializes executor registry with all available executors.
   * Called automatically on first use (lazy initialization).
   */
  private static initializeExecutors(): void {
    if (this.executors.size === 0) {
      // Register inventory executor
      this.executors.set('inventory', new InventoryExecutor(inventoryRepository));

      // Register appointment booking executor
      this.executors.set('appointment', new AppointmentExecutor(appointmentBookingRepository));

      // Register quiz executor (Story 29.13)
      this.executors.set('quiz', new QuizExecutor());

      // Future executors will be registered here:
      // this.executors.set('poll', new PollExecutor(...));
      // this.executors.set('order', new OrderExecutor(...));
    }
  }

  /**
   * Retrieves executor for a given business logic type.
   *
   * @param type - Business logic type (inventory, appointment, quiz, poll, order)
   * @returns Executor instance
   * @throws {Error} When executor type is not registered
   *
   * @example
   * const executor = TemplateExecutorRegistry.getExecutor('inventory');
   */
  static getExecutor(type: string): ITemplateExecutor {
    this.initializeExecutors();

    const executor = this.executors.get(type);

    if (!executor) {
      throw new Error(`Unknown executor type: ${type}. Available types: ${Array.from(this.executors.keys()).join(', ')}`);
    }

    return executor;
  }

  /**
   * Checks if an executor is registered for a given type.
   *
   * @param type - Business logic type to check
   * @returns True if executor is registered
   *
   * @example
   * if (TemplateExecutorRegistry.hasExecutor('inventory')) {
   *   // Use inventory executor
   * }
   */
  static hasExecutor(type: string): boolean {
    this.initializeExecutors();
    return this.executors.has(type);
  }

  /**
   * Executes template business logic for a form submission.
   *
   * This is the main integration point called from the form submission controller.
   * Handles the complete validation → create submission → execute → rollback flow.
   *
   * Flow:
   * 1. Get executor for template business logic type
   * 2. Validate submission data (early validation before DB write)
   * 3. Return validation result (controller will create submission if valid)
   * 4. Controller calls executeAfterSubmission() after creating submission
   *
   * @param submissionData - Form submission data (not yet persisted)
   * @param template - Template with business logic configuration
   * @returns Promise containing validation result
   *
   * @example
   * const validation = await TemplateExecutorRegistry.validateBeforeSubmission(
   *   { values: { quantity: 5, sku: 'SKU123' } },
   *   template
   * );
   *
   * if (!validation.valid) {
   *   throw new ApiError(400, validation.errors.join(', '));
   * }
   */
  static async validateBeforeSubmission(
    submissionData: Partial<FormSubmission>,
    template: FormTemplate
  ) {
    if (!template.businessLogicConfig) {
      // No business logic - validation passes
      return { valid: true, errors: [] };
    }

    const executor = this.getExecutor(template.businessLogicConfig.type);
    return await executor.validate(
      submissionData,
      template,
      template.businessLogicConfig
    );
  }

  /**
   * Executes business logic after submission is created.
   *
   * Called by controller after submission record is persisted.
   * If execution fails, controller should delete the submission (compensating transaction).
   *
   * @param submission - Created form submission record (persisted)
   * @param template - Template with business logic configuration
   * @param client - Optional PostgreSQL client with active transaction context
   * @returns Promise containing execution result
   * @throws {Error} When execution fails (triggers submission deletion)
   *
   * @example
   * const client = await pool.connect();
   * try {
   *   await client.query('BEGIN');
   *   const result = await TemplateExecutorRegistry.executeAfterSubmission(
   *     submission,
   *     template,
   *     client
   *   );
   *   await client.query('COMMIT');
   *   console.log(`Execution result: ${result.message}`);
   * } catch (error) {
   *   await client.query('ROLLBACK');
   *   // Delete submission (compensating transaction)
   *   await formSubmissionsRepository.delete(submission.id);
   *   throw error;
   * } finally {
   *   client.release();
   * }
   */
  static async executeAfterSubmission(
    submission: FormSubmission,
    template: FormTemplate,
    client?: any
  ) {
    if (!template.businessLogicConfig) {
      // No business logic - return success
      return { success: true };
    }

    const executor = this.getExecutor(template.businessLogicConfig.type);
    return await executor.execute(
      submission,
      template,
      template.businessLogicConfig,
      client
    );
  }
}
