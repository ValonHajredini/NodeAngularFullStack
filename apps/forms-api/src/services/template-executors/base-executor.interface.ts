/**
 * Base Template Executor Interface
 *
 * Defines the contract for all template-specific business logic executors.
 * Implements the Strategy Pattern to enable different business logic implementations
 * for various template types (inventory, appointments, quizzes, polls, etc.).
 *
 * Key Design Principles:
 * - Separation of concerns: Validation separate from execution
 * - Early validation: Check constraints before creating submission records
 * - Transaction support: Executors should use database transactions for atomic operations
 * - Error handling: Clear error messages with specific codes
 *
 * Epic 29: Form Template System with Business Logic
 * Story 29.11: Product Template with Inventory Tracking
 */

/**
 * Result returned by executor after successful execution.
 *
 * @template T - Type of data returned by the executor (executor-specific)
 */
export interface ExecutorResult<T = any> {
  /** Indicates if execution was successful */
  success: boolean;

  /** Executor-specific data (e.g., remaining stock, appointment confirmation) */
  data?: T;

  /** Human-readable message describing the result */
  message?: string;
}

/**
 * Validation result before execution.
 * Provides early validation before creating submission records.
 */
export interface ExecutorValidation {
  /** Indicates if validation passed */
  valid: boolean;

  /** Array of validation error messages (empty if valid) */
  errors: string[];

  /** Optional warning messages (non-blocking) */
  warnings?: string[];
}

/**
 * Base interface for all template business logic executors.
 *
 * Executors implement template-specific behavior such as:
 * - Inventory tracking and stock decrementation
 * - Appointment booking and time slot management
 * - Quiz scoring and result calculation
 * - Poll vote aggregation
 * - Custom workflow execution
 *
 * Implementation Flow:
 * 1. FormsService receives form submission
 * 2. FormsService calls executor.validate() before creating submission record
 * 3. If validation passes, FormsService creates submission record
 * 4. FormsService calls executor.execute() with created submission
 * 5. If execution fails, FormsService deletes submission (compensating transaction)
 *
 * @example
 * // Inventory Executor Implementation
 * class InventoryExecutor implements ITemplateExecutor {
 *   async validate(submission, template, config) {
 *     // Check stock availability before creating submission
 *     const available = await checkStock(config.sku, submission.quantity);
 *     return {
 *       valid: available,
 *       errors: available ? [] : ['Insufficient stock']
 *     };
 *   }
 *
 *   async execute(submission, template, config) {
 *     // Decrement stock with transaction locking
 *     await decrementStock(config.sku, submission.quantity);
 *     return { success: true };
 *   }
 * }
 */
export interface ITemplateExecutor {
  /**
   * Validates submission data and configuration before execution.
   *
   * This method is called BEFORE creating the submission record, allowing
   * early validation and rejection without polluting the database.
   *
   * Validation should check:
   * - Configuration validity (referenced fields exist, correct types)
   * - Business constraints (stock availability, time slot availability)
   * - Data integrity (required fields present, valid formats)
   *
   * **IMPORTANT**: This method should NOT modify any state (read-only).
   *
   * @param submission - Form submission data (not yet persisted)
   * @param template - Template configuration with schema and business logic config
   * @param config - Business logic configuration (executor-specific)
   * @returns Promise containing validation result with errors if invalid
   *
   * @throws {Error} Only for unexpected errors (database failures, etc.)
   *                 Business validation failures should return { valid: false, errors: [...] }
   *
   * @example
   * const validation = await executor.validate(
   *   { data: { quantity: 5, sku: 'SKU123' } },
   *   template,
   *   { type: 'inventory', variantField: 'sku', quantityField: 'quantity' }
   * );
   *
   * if (!validation.valid) {
   *   throw new ApiError(400, validation.errors.join(', '), 'VALIDATION_FAILED');
   * }
   */
  validate(
    submission: Partial<any>,
    template: any,
    config: any
  ): Promise<ExecutorValidation>;

  /**
   * Executes template-specific business logic after submission is created.
   *
   * This method is called AFTER the submission record is persisted to the database.
   * If this method throws an error, the submission will be deleted (compensating transaction).
   *
   * Execution should:
   * - Use database transactions for atomic operations
   * - Handle concurrent access (row-level locking if needed)
   * - Return meaningful results (e.g., remaining stock, booking confirmation)
   * - Clean up on error (transactions will rollback)
   *
   * **IMPORTANT**: This method MUST be idempotent where possible.
   * If called multiple times with the same submission, it should not cause data corruption.
   *
   * **Transaction Context**: The optional `client` parameter provides a database connection
   * within an active transaction. When provided, the executor should use this client for
   * all database operations to ensure atomicity. If not provided, the executor should
   * create its own transaction.
   *
   * @param submission - Created form submission record (persisted)
   * @param template - Template configuration with schema and business logic config
   * @param config - Business logic configuration (executor-specific)
   * @param client - Optional PostgreSQL client with active transaction context
   * @returns Promise containing execution result
   *
   * @throws {Error} When execution fails (will trigger submission deletion)
   *
   * @example
   * // With transaction context (preferred for atomic operations)
   * const client = await pool.connect();
   * await client.query('BEGIN');
   * try {
   *   const result = await executor.execute(
   *     { id: 'sub-uuid', data: { quantity: 5, sku: 'SKU123' } },
   *     template,
   *     { type: 'inventory', variantField: 'sku', quantityField: 'quantity' },
   *     client
   *   );
   *   await client.query('COMMIT');
   *   console.log(`Stock remaining: ${result.data.remaining_stock}`);
   * } catch (error) {
   *   await client.query('ROLLBACK');
   *   throw error;
   * } finally {
   *   client.release();
   * }
   */
  execute(
    submission: any,
    template: any,
    config: any,
    client?: any
  ): Promise<ExecutorResult>;
}

/**
 * Type guard to check if an object implements ITemplateExecutor.
 *
 * @param obj - Object to check
 * @returns True if object implements ITemplateExecutor interface
 *
 * @example
 * if (isTemplateExecutor(maybeExecutor)) {
 *   await maybeExecutor.validate(submission, template, config);
 * }
 */
export function isTemplateExecutor(obj: any): obj is ITemplateExecutor {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.validate === 'function' &&
    typeof obj.execute === 'function'
  );
}
