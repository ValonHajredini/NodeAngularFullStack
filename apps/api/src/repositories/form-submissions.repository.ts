import { Pool } from 'pg';
import { FormSubmission } from '@nodeangularfullstack/shared';
import { databaseService } from '../services/database.service';

/**
 * Repository for form submission database operations.
 * Handles submission creation, retrieval, and statistics.
 */
export class FormSubmissionsRepository {
  private get pool(): Pool {
    return databaseService.getPool();
  }

  /**
   * Creates a new form submission.
   * @param submission - Form submission data
   * @returns Promise containing the created submission
   * @throws {Error} When submission creation fails
   * @example
   * const submission = await formSubmissionsRepository.create({
   *   formSchemaId: 'schema-uuid',
   *   values: { name: 'John Doe', email: 'john@example.com' },
   *   submitterIp: '192.168.1.1',
   *   userId: 'user-uuid',
   *   metadata: {}
   * });
   */
  async create(
    submission: Omit<FormSubmission, 'id' | 'submittedAt'>
  ): Promise<FormSubmission> {
    const client = await this.pool.connect();

    try {
      const query = `
        INSERT INTO form_submissions (
          form_schema_id,
          values,
          submitter_ip,
          user_id,
          metadata,
          submitted_at
        )
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        RETURNING
          id,
          form_schema_id as "formSchemaId",
          values,
          submitted_at as "submittedAt",
          submitter_ip as "submitterIp",
          user_id as "userId",
          metadata
      `;

      const values = [
        submission.formSchemaId,
        JSON.stringify(submission.values),
        submission.submitterIp,
        submission.userId || null,
        submission.metadata ? JSON.stringify(submission.metadata) : null,
      ];

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Failed to create form submission');
      }

      const row = result.rows[0];
      return {
        ...row,
        values: row.values,
        metadata: row.metadata || undefined,
      } as FormSubmission;
    } catch (error: any) {
      throw new Error(`Failed to create form submission: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Finds submissions for a specific form schema.
   * @param schemaId - Form schema ID to find submissions for
   * @param limit - Optional limit on number of results
   * @returns Promise containing array of submissions ordered by submission date descending
   * @throws {Error} When database query fails
   * @example
   * const submissions = await formSubmissionsRepository.findByFormSchemaId('schema-uuid', 50);
   */
  async findByFormSchemaId(
    schemaId: string,
    limit?: number
  ): Promise<FormSubmission[]> {
    const client = await this.pool.connect();

    try {
      let query = `
        SELECT
          id,
          form_schema_id as "formSchemaId",
          values,
          submitted_at as "submittedAt",
          submitter_ip as "submitterIp",
          user_id as "userId",
          metadata
        FROM form_submissions
        WHERE form_schema_id = $1
        ORDER BY submitted_at DESC
      `;

      const params: any[] = [schemaId];

      if (limit) {
        query += ' LIMIT $2';
        params.push(limit);
      }

      const result = await client.query(query, params);
      return result.rows.map((row) => ({
        ...row,
        values: row.values,
        metadata: row.metadata || undefined,
      })) as FormSubmission[];
    } catch (error: any) {
      throw new Error(
        `Failed to find submissions by schema ID: ${error.message}`
      );
    } finally {
      client.release();
    }
  }

  /**
   * Finds all submissions for a form (across all schema versions).
   * @param formId - Form ID to find submissions for
   * @returns Promise containing array of submissions ordered by submission date descending
   * @throws {Error} When database query fails
   * @example
   * const submissions = await formSubmissionsRepository.findByFormId('form-uuid');
   */
  async findByFormId(formId: string): Promise<FormSubmission[]> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT
          fs.id,
          fs.form_schema_id as "formSchemaId",
          fs.values,
          fs.submitted_at as "submittedAt",
          fs.submitter_ip as "submitterIp",
          fs.user_id as "userId",
          fs.metadata
        FROM form_submissions fs
        INNER JOIN form_schemas fsch ON fs.form_schema_id = fsch.id
        WHERE fsch.form_id = $1
        ORDER BY fs.submitted_at DESC
      `;

      const result = await client.query(query, [formId]);
      return result.rows.map((row) => ({
        ...row,
        values: row.values,
        metadata: row.metadata || undefined,
      })) as FormSubmission[];
    } catch (error: any) {
      throw new Error(
        `Failed to find submissions by form ID: ${error.message}`
      );
    } finally {
      client.release();
    }
  }

  /**
   * Counts submissions for a specific form schema.
   * @param schemaId - Form schema ID to count submissions for
   * @returns Promise containing submission count
   * @throws {Error} When database query fails
   * @example
   * const count = await formSubmissionsRepository.countByFormSchemaId('schema-uuid');
   */
  async countByFormSchemaId(schemaId: string): Promise<number> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT COUNT(*) as count
        FROM form_submissions
        WHERE form_schema_id = $1
      `;

      const result = await client.query(query, [schemaId]);
      return parseInt(result.rows[0].count, 10);
    } catch (error: any) {
      throw new Error(
        `Failed to count submissions by schema ID: ${error.message}`
      );
    } finally {
      client.release();
    }
  }
}

// Export singleton instance
export const formSubmissionsRepository = new FormSubmissionsRepository();
