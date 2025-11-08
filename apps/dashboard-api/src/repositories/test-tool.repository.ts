import { Pool, QueryResult } from 'pg';
import {
  TestToolRecord,
  CreateTestToolInput,
  UpdateTestToolInput,
} from '@nodeangularfullstack/shared';
import { dashboardPool } from '../config/multi-database.config';

/**
 * Test Tool Repository
 *
 * Data access layer for test_tool table.
 * Handles PostgreSQL queries and row mapping.
 * Uses dashboard database pool.
 */
export class TestToolRepository {
  private pool: Pool;

  constructor(pool?: Pool) {
    this.pool = pool || dashboardPool;
  }

  /**
   * Find all Test Tool records.
   * @returns Promise containing array of records
   */
  async findAll(): Promise<TestToolRecord[]> {
    const query = 'SELECT * FROM test_tool ORDER BY created_at DESC';
    const result: QueryResult = await this.pool.query(query);
    return result.rows.map(this.mapRow);
  }

  /**
   * Find Test Tool record by ID.
   * @param id - Record ID (UUID)
   * @returns Promise containing record or null
   */
  async findById(id: string): Promise<TestToolRecord | null> {
    const query = 'SELECT * FROM test_tool WHERE id = $1';
    const result: QueryResult = await this.pool.query(query, [id]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  /**
   * Create new Test Tool record.
   * @param input - Record data
   * @returns Promise containing created record
   */
  async create(input: CreateTestToolInput): Promise<TestToolRecord> {
    const query = `
      INSERT INTO test_tool (name, description, created_by)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const values = [input.name, input.description || null, input.createdBy];
    const result: QueryResult = await this.pool.query(query, values);
    return this.mapRow(result.rows[0]);
  }

  /**
   * Update Test Tool record.
   * @param id - Record ID
   * @param input - Updated data
   * @returns Promise containing updated record
   */
  async update(
    id: string,
    input: UpdateTestToolInput
  ): Promise<TestToolRecord> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(input.name);
    }
    if (input.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(input.description);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE test_tool
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result: QueryResult = await this.pool.query(query, values);
    return this.mapRow(result.rows[0]);
  }

  /**
   * Delete Test Tool record.
   * @param id - Record ID
   * @returns Promise of void
   */
  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM test_tool WHERE id = $1';
    await this.pool.query(query, [id]);
  }

  /**
   * Map database row to TypeScript record.
   * @param row - PostgreSQL row
   * @returns Typed record
   */
  private mapRow(row: any): TestToolRecord {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
    };
  }
}
