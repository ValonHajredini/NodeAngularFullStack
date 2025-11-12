import { PoolClient } from 'pg';
import { BaseRepository } from './base.repository';
import { ProductInventory } from '@nodeangularfullstack/shared';
import { DatabaseType } from '../config/multi-database.config';

/**
 * Repository for product inventory operations with transaction support.
 * Handles stock tracking, locking, and concurrent access control to prevent overselling.
 *
 * Key Features:
 * - Row-level locking with SELECT FOR UPDATE
 * - Transaction support for atomic stock updates
 * - Race condition prevention
 * - Parameterized queries for SQL injection prevention
 *
 * @extends BaseRepository<ProductInventory>
 */
export class InventoryRepository extends BaseRepository<ProductInventory> {
  /**
   * Creates a new InventoryRepository instance.
   * Uses the FORMS database for inventory data.
   */
  constructor() {
    super('product_inventory', DatabaseType.FORMS);
  }

  /**
   * Finds inventory record by SKU.
   *
   * @param sku - Product/variant SKU
   * @returns Promise containing inventory record or null if not found
   * @throws {Error} When database query fails
   *
   * @example
   * const inventory = await inventoryRepo.findBySku('SKU123');
   * if (inventory) {
   *   console.log(`Stock available: ${inventory.stock_quantity}`);
   * }
   */
  async findBySku(sku: string): Promise<ProductInventory | null> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT
          id,
          form_id AS "formId",
          sku,
          stock_quantity AS "stockQuantity",
          reserved_quantity AS "reservedQuantity",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM ${this.tableName}
        WHERE sku = $1
      `;

      const result = await client.query(query, [sku]);
      return result.rows.length > 0 ? (result.rows[0] as ProductInventory) : null;
    } catch (error: any) {
      throw new Error(
        `Failed to find inventory by SKU: ${error.message}`
      );
    } finally {
      client.release();
    }
  }

  /**
   * Locks inventory row and decrements stock quantity atomically.
   * Uses SELECT FOR UPDATE to prevent race conditions during concurrent access.
   *
   * **CRITICAL**: This method MUST be called within a transaction.
   * The client parameter should be from an active transaction.
   *
   * Transaction Flow:
   * 1. Locks row with SELECT FOR UPDATE (blocks other transactions)
   * 2. Validates sufficient stock availability
   * 3. Decrements stock quantity
   * 4. Returns updated inventory record
   *
   * @param client - PostgreSQL transaction client (from pool.connect())
   * @param sku - Product/variant SKU
   * @param quantity - Quantity to decrement (must be positive)
   * @returns Promise containing updated inventory record
   * @throws {Error} If SKU not found
   * @throws {Error} If insufficient stock available
   * @throws {Error} When database operation fails
   *
   * @example
   * const client = await pool.connect();
   * try {
   *   await client.query('BEGIN');
   *   const inventory = await inventoryRepo.lockAndDecrement(client, 'SKU123', 2);
   *   console.log(`Remaining stock: ${inventory.stock_quantity}`);
   *   await client.query('COMMIT');
   * } catch (error) {
   *   await client.query('ROLLBACK');
   *   throw error;
   * } finally {
   *   client.release();
   * }
   */
  async lockAndDecrement(
    client: PoolClient,
    sku: string,
    quantity: number
  ): Promise<ProductInventory> {
    // Step 1: Lock row for update (blocks other transactions)
    const lockQuery = `
      SELECT
        id,
        form_id AS "formId",
        sku,
        stock_quantity AS "stockQuantity",
        reserved_quantity AS "reservedQuantity",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM ${this.tableName}
      WHERE sku = $1
      FOR UPDATE
    `;

    const lockResult = await client.query(lockQuery, [sku]);

    // Step 2: Validate SKU exists
    if (lockResult.rows.length === 0) {
      throw new Error(`SKU not found: ${sku}`);
    }

    const inventory = lockResult.rows[0] as ProductInventory;

    // Step 3: Check sufficient stock
    if (inventory.stockQuantity < quantity) {
      throw new Error(
        `Insufficient stock. Available: ${inventory.stockQuantity}, Requested: ${quantity}`
      );
    }

    // Step 4: Decrement stock quantity
    const updateQuery = `
      UPDATE ${this.tableName}
      SET stock_quantity = stock_quantity - $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE sku = $2
      RETURNING
        id,
        form_id AS "formId",
        sku,
        stock_quantity AS "stockQuantity",
        reserved_quantity AS "reservedQuantity",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `;

    const updateResult = await client.query(updateQuery, [quantity, sku]);

    return updateResult.rows[0] as ProductInventory;
  }

  /**
   * Checks if sufficient stock is available without locking.
   * Use for pre-validation before starting a transaction.
   *
   * **Note**: This is a non-blocking check. Stock availability may change
   * between this check and the actual transaction. Always use lockAndDecrement()
   * within a transaction for guaranteed atomic operations.
   *
   * @param sku - Product/variant SKU
   * @param quantity - Required quantity
   * @returns Promise containing boolean (true if sufficient stock available)
   *
   * @example
   * const available = await inventoryRepo.checkAvailability('SKU123', 5);
   * if (available) {
   *   // Proceed with transaction
   * } else {
   *   // Show out-of-stock error
   * }
   */
  async checkAvailability(sku: string, quantity: number): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT (stock_quantity - reserved_quantity) >= $1 AS available
        FROM ${this.tableName}
        WHERE sku = $2
      `;

      const result = await client.query(query, [quantity, sku]);

      if (result.rows.length === 0) {
        return false; // SKU not found
      }

      return result.rows[0].available;
    } catch (error: any) {
      throw new Error(
        `Failed to check stock availability: ${error.message}`
      );
    } finally {
      client.release();
    }
  }

  /**
   * Finds all inventory records for a specific form.
   *
   * @param formId - UUID of the form
   * @returns Promise containing array of inventory records
   * @throws {Error} When database query fails
   *
   * @example
   * const inventories = await inventoryRepo.findByFormId('form-uuid');
   * inventories.forEach(inv => {
   *   console.log(`${inv.sku}: ${inv.stock_quantity} units`);
   * });
   */
  async findByFormId(formId: string): Promise<ProductInventory[]> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT
          id,
          form_id AS "formId",
          sku,
          stock_quantity AS "stockQuantity",
          reserved_quantity AS "reservedQuantity",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM ${this.tableName}
        WHERE form_id = $1
        ORDER BY created_at DESC
      `;

      const result = await client.query(query, [formId]);
      return result.rows as ProductInventory[];
    } catch (error: any) {
      throw new Error(
        `Failed to find inventory by form ID: ${error.message}`
      );
    } finally {
      client.release();
    }
  }

  /**
   * Creates a new inventory record for a product variant.
   *
   * @param data - Inventory data (form_id, sku, stock_quantity, reserved_quantity)
   * @returns Promise containing the created inventory record
   * @throws {Error} When creation fails or SKU already exists
   *
   * @example
   * const inventory = await inventoryRepo.createInventory({
   *   form_id: 'form-uuid',
   *   sku: 'SKU123',
   *   stock_quantity: 100,
   *   reserved_quantity: 0
   * });
   */
  async createInventory(
    data: Omit<ProductInventory, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ProductInventory> {
    const client = await this.pool.connect();

    try {
      const query = `
        INSERT INTO ${this.tableName}
          (form_id, sku, stock_quantity, reserved_quantity)
        VALUES ($1, $2, $3, $4)
        RETURNING
          id,
          form_id AS "formId",
          sku,
          stock_quantity AS "stockQuantity",
          reserved_quantity AS "reservedQuantity",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `;

      const values = [
        data.formId,
        data.sku,
        data.stockQuantity || 0,
        data.reservedQuantity || 0,
      ];

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Failed to create inventory record');
      }

      return result.rows[0] as ProductInventory;
    } catch (error: any) {
      if (error.code === '23505') {
        // Unique constraint violation
        throw new Error(`SKU already exists: ${data.sku}`);
      }
      throw new Error(`Failed to create inventory: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Updates stock quantity for a SKU (outside of transaction).
   * Use this for administrative stock adjustments.
   *
   * For order processing, use lockAndDecrement() within a transaction.
   *
   * @param sku - Product/variant SKU
   * @param newQuantity - New stock quantity (must be >= 0)
   * @returns Promise containing updated inventory record
   * @throws {Error} When update fails or SKU not found
   *
   * @example
   * const inventory = await inventoryRepo.updateStock('SKU123', 50);
   */
  async updateStock(
    sku: string,
    newQuantity: number
  ): Promise<ProductInventory> {
    const client = await this.pool.connect();

    try {
      const query = `
        UPDATE ${this.tableName}
        SET stock_quantity = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE sku = $2
        RETURNING
          id,
          form_id AS "formId",
          sku,
          stock_quantity AS "stockQuantity",
          reserved_quantity AS "reservedQuantity",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `;

      const result = await client.query(query, [newQuantity, sku]);

      if (result.rows.length === 0) {
        throw new Error(`SKU not found: ${sku}`);
      }

      return result.rows[0] as ProductInventory;
    } catch (error: any) {
      throw new Error(`Failed to update stock: ${error.message}`);
    } finally {
      client.release();
    }
  }
}

/**
 * Singleton instance of InventoryRepository.
 * Import this instance in services and controllers.
 *
 * @example
 * import { inventoryRepository } from './repositories/inventory.repository';
 *
 * const stock = await inventoryRepository.findBySku('SKU123');
 */
export const inventoryRepository = new InventoryRepository();
