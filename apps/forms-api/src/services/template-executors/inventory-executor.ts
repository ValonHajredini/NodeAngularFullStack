import { PoolClient } from 'pg';
import {
  ITemplateExecutor,
  ExecutorResult,
  ExecutorValidation,
} from './base-executor.interface';
import {
  FormSubmission,
  FormTemplate,
  InventoryConfig,
} from '@nodeangularfullstack/shared';
import { InventoryRepository } from '../../repositories/inventory.repository';
import { getPoolForDatabase, DatabaseType } from '../../config/multi-database.config';

/**
 * Executor for inventory tracking business logic.
 *
 * Implements automatic stock decrementation with transaction locking to prevent
 * race conditions and overselling. Uses PostgreSQL row-level locking (SELECT FOR UPDATE)
 * to ensure atomic operations during concurrent form submissions.
 *
 * Flow:
 * 1. validate() - Checks stock availability without locking (pre-validation)
 * 2. execute() - Uses transaction with row-level lock to decrement stock atomically
 *
 * Epic 29: Form Template System with Business Logic
 * Story 29.11: Product Template with Inventory Tracking
 *
 * @implements {ITemplateExecutor}
 *
 * @example
 * const executor = new InventoryExecutor(inventoryRepository);
 *
 * // Validate before submission
 * const validation = await executor.validate(submission, template, config);
 * if (!validation.valid) {
 *   throw new Error(validation.errors.join(', '));
 * }
 *
 * // Execute after submission created
 * const result = await executor.execute(submission, template, config);
 * console.log(`Remaining stock: ${result.data.remaining_stock}`);
 */
export class InventoryExecutor implements ITemplateExecutor {
  private readonly pool;

  /**
   * Creates a new InventoryExecutor instance.
   *
   * @param inventoryRepository - Repository for inventory data access
   */
  constructor(private inventoryRepository: InventoryRepository) {
    this.pool = getPoolForDatabase(DatabaseType.FORMS);
  }

  /**
   * Validates inventory availability before submission.
   *
   * Performs early validation checks:
   * - Config references existing fields in template schema
   * - SKU is present in submission data
   * - Quantity is valid (positive integer)
   * - Sufficient stock is available (non-blocking check)
   *
   * **Note**: Stock availability is checked without locking. The actual stock
   * may change between validation and execution. The execute() method performs
   * a locked check for guaranteed atomicity.
   *
   * @param submission - Form submission data (not yet persisted)
   * @param template - Template configuration with schema
   * @param config - Inventory configuration
   * @returns Promise containing validation result
   */
  async validate(
    submission: Partial<FormSubmission>,
    template: FormTemplate,
    config: InventoryConfig
  ): Promise<ExecutorValidation> {
    const errors: string[] = [];

    // Validate config references exist in template schema
    const variantFieldExists = template.templateSchema.fields.some(
      (f) => f.fieldName === config.variantField
    );
    const quantityFieldExists = template.templateSchema.fields.some(
      (f) => f.fieldName === config.quantityField
    );

    if (!variantFieldExists) {
      errors.push(`Variant field "${config.variantField}" not found in schema`);
    }
    if (!quantityFieldExists) {
      errors.push(`Quantity field "${config.quantityField}" not found in schema`);
    }

    // Extract SKU and quantity from submission data
    const sku = this.extractSku(submission.values || {}, config);
    const quantity = this.extractQuantity(submission.values || {}, config);

    // Validate SKU present
    if (!sku) {
      errors.push('No SKU selected (variant selection required)');
    }

    // Validate quantity
    if (!quantity || quantity < 1) {
      errors.push('Invalid quantity (must be >= 1)');
    }

    // Check stock availability (pre-validation without lock)
    if (sku && quantity && quantity >= 1) {
      try {
        const available = await this.inventoryRepository.checkAvailability(
          sku,
          quantity
        );

        if (!available) {
          const inventory = await this.inventoryRepository.findBySku(sku);
          const stockQty = inventory?.stockQuantity || 0;
          errors.push(
            `Insufficient stock. Only ${stockQty} unit${
              stockQty === 1 ? '' : 's'
            } available.`
          );
        }
      } catch (error: any) {
        // SKU not found or database error
        errors.push(`Stock check failed: ${error.message}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Executes inventory decrement with transaction locking.
   *
   * Uses PostgreSQL transaction with row-level locking (SELECT FOR UPDATE) to
   * ensure atomic stock decrementation. This prevents race conditions when multiple
   * users submit orders for the same product simultaneously.
   *
   * Transaction Flow:
   * 1. Begin transaction
   * 2. Lock inventory row (SELECT FOR UPDATE)
   * 3. Validate sufficient stock (with lock held)
   * 4. Decrement stock quantity
   * 5. Commit transaction
   * 6. On error: Rollback transaction
   *
   * @param submission - Created form submission record (persisted)
   * @param template - Template configuration
   * @param config - Inventory configuration
   * @returns Promise containing execution result with remaining stock
   * @throws {Error} When execution fails (will trigger submission deletion)
   */
  async execute(
    submission: FormSubmission,
    _template: FormTemplate,
    config: InventoryConfig
  ): Promise<ExecutorResult> {
    const sku = this.extractSku(submission.values, config);
    const quantity = this.extractQuantity(submission.values, config);

    if (!sku || !quantity) {
      throw new Error('Invalid submission data: missing SKU or quantity');
    }

    const client: PoolClient = await this.pool.connect();

    try {
      // Begin transaction
      await client.query('BEGIN');

      // Lock and decrement stock (atomic operation with row-level lock)
      const updatedInventory = await this.inventoryRepository.lockAndDecrement(
        client,
        sku,
        quantity
      );

      // Commit transaction
      await client.query('COMMIT');

      return {
        success: true,
        data: {
          sku: updatedInventory.sku,
          remaining_stock: updatedInventory.stockQuantity,
          decremented_quantity: quantity,
        },
        message: `Stock decremented successfully. ${updatedInventory.stockQuantity} units remaining.`,
      };
    } catch (error: any) {
      // Rollback on error
      await client.query('ROLLBACK');

      // Re-throw with context
      throw new Error(`Inventory update failed: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Extracts and validates SKU from submission data based on variant field configuration.
   *
   * **Security Note**: SKU format validation prevents injection attacks and ensures
   * data integrity. Only alphanumeric characters and hyphens are allowed.
   *
   * For product forms, the variant field typically contains either:
   * - Direct SKU string (simplified)
   * - Selected image metadata with SKU property (IMAGE_GALLERY with variants)
   *
   * @param data - Submission data
   * @param config - Inventory configuration
   * @returns SKU string or empty string if not found/invalid
   * @throws {Error} When SKU format is invalid
   * @private
   */
  private extractSku(data: Record<string, any>, config: InventoryConfig): string {
    // SKU format: 3-50 characters, uppercase letters, numbers, and hyphens only
    const SKU_REGEX = /^[A-Z0-9-]{3,50}$/;
    const variantValue = data[config.variantField];

    if (!variantValue) {
      return '';
    }

    let sku = '';

    // If variant value is object with SKU property (IMAGE_GALLERY variant metadata)
    if (typeof variantValue === 'object' && variantValue.sku) {
      sku = variantValue.sku;
    }
    // If variant value is direct SKU string
    else if (typeof variantValue === 'string') {
      sku = variantValue;
    }
    else {
      return '';
    }

    // Validate SKU format
    if (sku && !SKU_REGEX.test(sku)) {
      throw new Error(
        `Invalid SKU format: "${sku}". SKU must be 3-50 characters (A-Z, 0-9, hyphen only).`
      );
    }

    return sku;
  }

  /**
   * Extracts quantity from submission data with bounds validation.
   *
   * **Security Note**: Maximum quantity limit (99 units) prevents abuse and ensures
   * reasonable order sizes. This is a business rule enforced at the executor level.
   *
   * @param data - Submission data
   * @param config - Inventory configuration
   * @returns Quantity as positive integer, or 0 if invalid
   * @throws {Error} When quantity exceeds maximum allowed (99 units)
   * @private
   */
  private extractQuantity(
    data: Record<string, any>,
    config: InventoryConfig
  ): number {
    const MAX_QUANTITY = 99; // Maximum units per order (business rule)
    const quantityValue = data[config.quantityField];

    if (quantityValue === undefined || quantityValue === null) {
      return 0;
    }

    const quantity = parseInt(quantityValue, 10);

    // Validate quantity bounds
    if (isNaN(quantity) || quantity < 1) {
      return 0; // Invalid quantity
    }

    if (quantity > MAX_QUANTITY) {
      throw new Error(
        `Quantity exceeds maximum allowed. Maximum: ${MAX_QUANTITY} units, Requested: ${quantity} units.`
      );
    }

    return quantity;
  }
}
