import { Pool } from 'pg';
import {
  FormSubmission,
  SubmissionFilterOptions,
} from '@nodeangularfullstack/shared';
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
          values_json,
          submitter_ip,
          user_id,
          metadata,
          submitted_at
        )
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        RETURNING
          id,
          form_schema_id as "formSchemaId",
          values_json as "values",
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
          values_json as "values",
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
   * Finds all submissions for a form (across all schema versions) with pagination and optional filtering.
   * @param formId - Form ID to find submissions for
   * @param page - Page number (1-indexed)
   * @param limit - Number of items per page
   * @param filterOptions - Optional filtering criteria (date range, field filters)
   * @returns Promise containing array of submissions and total count
   * @throws {Error} When database query fails
   * @example
   * // Basic pagination
   * const { submissions, total } = await formSubmissionsRepository.findByFormId('form-uuid', 1, 10);
   *
   * // With filtering
   * const { submissions, total } = await formSubmissionsRepository.findByFormId('form-uuid', 1, 10, {
   *   dateFrom: new Date('2024-01-01'),
   *   dateTo: new Date('2024-12-31'),
   *   fieldFilters: [{ field: 'status', value: 'approved' }]
   * });
   */
  async findByFormId(
    formId: string,
    page = 1,
    limit = 10,
    filterOptions?: SubmissionFilterOptions
  ): Promise<{ submissions: FormSubmission[]; total: number }> {
    const client = await this.pool.connect();

    try {
      const offset = (page - 1) * limit;

      // Validate field names against schema if field filters are provided
      if (
        filterOptions?.fieldFilters &&
        filterOptions.fieldFilters.length > 0
      ) {
        // Get form schema to validate field names
        const schemaQuery = `
          SELECT fsch.fields
          FROM form_schemas fsch
          WHERE fsch.form_id = $1
          ORDER BY fsch.version DESC
          LIMIT 1
        `;
        const schemaResult = await client.query(schemaQuery, [formId]);

        if (schemaResult.rows.length === 0) {
          throw new Error('Form schema not found');
        }

        const validFieldNames = schemaResult.rows[0].fields.map(
          (f: any) => f.fieldName
        );

        // Validate each filter field name
        for (const filter of filterOptions.fieldFilters) {
          if (!validFieldNames.includes(filter.field)) {
            throw new Error(`Invalid field name: ${filter.field}`);
          }
        }
      }

      // Build WHERE clause with filters
      const params: any[] = [formId];
      let paramIndex = 2;
      let whereClause = 'WHERE fsch.form_id = $1';

      // Apply date filters
      if (filterOptions?.dateFrom) {
        whereClause += ` AND fs.submitted_at >= $${paramIndex}`;
        params.push(filterOptions.dateFrom);
        paramIndex++;
      }

      if (filterOptions?.dateTo) {
        whereClause += ` AND fs.submitted_at <= $${paramIndex}`;
        params.push(filterOptions.dateTo);
        paramIndex++;
      }

      // Apply field value filters (field names already validated above)
      if (
        filterOptions?.fieldFilters &&
        filterOptions.fieldFilters.length > 0
      ) {
        filterOptions.fieldFilters.forEach((filter) => {
          whereClause += ` AND fs.values_json->>'${filter.field}' = $${paramIndex}`;
          params.push(filter.value);
          paramIndex++;
        });
      }

      // Get total count with filters
      const countQuery = `
        SELECT COUNT(*) as count
        FROM form_submissions fs
        INNER JOIN form_schemas fsch ON fs.form_schema_id = fsch.id
        ${whereClause}
      `;
      const countResult = await client.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count, 10);

      // Get paginated submissions with filters
      const query = `
        SELECT
          fs.id,
          fs.form_schema_id as "formSchemaId",
          fs.values_json as "values",
          fs.submitted_at as "submittedAt",
          fs.submitter_ip as "submitterIp",
          fs.user_id as "userId",
          fs.metadata
        FROM form_submissions fs
        INNER JOIN form_schemas fsch ON fs.form_schema_id = fsch.id
        ${whereClause}
        ORDER BY fs.submitted_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limit, offset);
      const result = await client.query(query, params);
      const submissions = result.rows.map((row) => ({
        ...row,
        values: row.values,
        metadata: row.metadata || undefined,
      })) as FormSubmission[];

      return { submissions, total };
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

  /**
   * Counts submissions from a specific IP address within a time window.
   * Used for rate limiting.
   * @param submitterIp - IP address to check
   * @param hoursAgo - Number of hours to look back
   * @returns Promise containing submission count
   * @throws {Error} When database query fails
   * @example
   * const count = await formSubmissionsRepository.countByIpSince('192.168.1.1', 1);
   */
  async countByIpSince(submitterIp: string, hoursAgo: number): Promise<number> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT COUNT(*) as count
        FROM form_submissions
        WHERE submitter_ip = $1
          AND submitted_at > NOW() - $2 * INTERVAL '1 hour'
      `;

      const result = await client.query(query, [submitterIp, hoursAgo]);
      return parseInt(result.rows[0].count, 10);
    } catch (error: any) {
      throw new Error(`Failed to count submissions by IP: ${error.message}`);
    } finally {
      client.release();
    }
  }
}

// Export singleton instance
export const formSubmissionsRepository = new FormSubmissionsRepository();
