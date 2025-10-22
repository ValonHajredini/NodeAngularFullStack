import { Pool } from 'pg';
import { databaseService } from '../services/database.service';
import { BaseRepository } from './base.repository';
import { CreateShortLinkData } from '@nodeangularfullstack/shared';

/**
 * Short link database entity interface matching the database schema.
 */
export interface ShortLinkEntity {
  id: string;
  code: string;
  originalUrl: string;
  qrCodeUrl?: string | null;
  expiresAt?: Date | null;
  createdBy?: string | null;
  formSchemaId?: string | null;
  clickCount: number;
  lastAccessedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Short links repository for database operations.
 * Handles all short link-related database queries with proper error handling.
 * Short links are not tenant-specific and are globally accessible.
 */
export class ShortLinksRepository extends BaseRepository<ShortLinkEntity> {
  constructor() {
    super('short_links');
  }

  protected get pool(): Pool {
    return databaseService.getPool();
  }

  /**
   * Creates a new short link in the database.
   * @param shortLinkData - Short link data for creation
   * @returns Promise containing the created short link
   * @throws {Error} When short link creation fails or code already exists
   * @example
   * const shortLink = await shortLinksRepository.create({
   *   code: 'abc123',
   *   originalUrl: 'https://example.com',
   *   expiresAt: new Date('2025-12-31'),
   *   createdBy: 'user-id'
   * });
   */
  async create(
    data: CreateShortLinkData | Partial<ShortLinkEntity>,
    _tenantContext?: any
  ): Promise<ShortLinkEntity> {
    // Handle both CreateShortLinkData and Partial<ShortLinkEntity> for backward compatibility
    const shortLinkData = data as CreateShortLinkData;
    const client = await this.pool.connect();

    try {
      const { code, originalUrl, expiresAt, createdBy, formSchemaId } =
        shortLinkData;

      const query = `
        INSERT INTO short_links (
          code, original_url, expires_at, created_by, form_schema_id,
          click_count, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING
          id,
          code,
          original_url as "originalUrl",
          expires_at as "expiresAt",
          created_by as "createdBy",
          form_schema_id as "formSchemaId",
          click_count as "clickCount",
          last_accessed as "lastAccessedAt",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      const values = [
        code,
        originalUrl,
        expiresAt,
        createdBy,
        formSchemaId || null,
      ];

      const result = await client.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating short link:', error);
      if (error instanceof Error && error.message.includes('duplicate key')) {
        throw new Error(
          `Short link with code '${shortLinkData.code}' already exists`
        );
      }
      throw new Error('Failed to create short link in database');
    } finally {
      client.release();
    }
  }

  /**
   * Finds a short link by its unique code.
   * @param code - Short code to search for
   * @returns Promise containing the short link or null if not found
   * @throws {Error} When database query fails
   * @example
   * const shortLink = await shortLinksRepository.findByCode('abc123');
   * if (shortLink) console.log(`Found link: ${shortLink.originalUrl}`);
   */
  async findByCode(code: string): Promise<ShortLinkEntity | null> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT
          id,
          code,
          original_url as "originalUrl",
          qr_code_url as "qrCodeUrl",
          expires_at as "expiresAt",
          created_by as "createdBy",
          click_count as "clickCount",
          last_accessed as "lastAccessedAt",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM short_links
        WHERE code = $1
      `;

      const result = await client.query(query, [code]);
      return result.rows[0] || null;
    } catch (error) {
      console.error(`Error finding short link by code ${code}:`, error);
      throw new Error('Failed to find short link in database');
    } finally {
      client.release();
    }
  }

  /**
   * Finds a short link by its unique code, excluding expired links.
   * @param code - Short code to search for
   * @returns Promise containing the short link or null if not found/expired
   * @throws {Error} When database query fails
   * @example
   * const shortLink = await shortLinksRepository.findActiveByCode('abc123');
   * if (shortLink) console.log(`Active link found: ${shortLink.originalUrl}`);
   */
  async findActiveByCode(code: string): Promise<ShortLinkEntity | null> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT
          id,
          code,
          original_url as "originalUrl",
          qr_code_url as "qrCodeUrl",
          expires_at as "expiresAt",
          created_by as "createdBy",
          click_count as "clickCount",
          last_accessed as "lastAccessedAt",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM short_links
        WHERE code = $1
          AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      `;

      const result = await client.query(query, [code]);
      return result.rows[0] || null;
    } catch (error) {
      console.error(`Error finding active short link by code ${code}:`, error);
      throw new Error('Failed to find active short link in database');
    } finally {
      client.release();
    }
  }

  /**
   * Increments the click count for a short link and updates last accessed timestamp.
   * @param code - Short code to increment
   * @returns Promise containing the updated short link
   * @throws {Error} When short link not found or database query fails
   * @example
   * const updatedLink = await shortLinksRepository.incrementClickCount('abc123');
   * console.log(`Click count is now: ${updatedLink.clickCount}`);
   */
  async incrementClickCount(code: string): Promise<ShortLinkEntity> {
    const client = await this.pool.connect();

    try {
      const query = `
        UPDATE short_links
        SET
          click_count = click_count + 1,
          last_accessed = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE code = $1
        RETURNING
          id,
          code,
          original_url as "originalUrl",
          qr_code_url as "qrCodeUrl",
          expires_at as "expiresAt",
          created_by as "createdBy",
          click_count as "clickCount",
          last_accessed as "lastAccessedAt",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      const result = await client.query(query, [code]);

      if (result.rows.length === 0) {
        throw new Error(`Short link with code '${code}' not found`);
      }

      return result.rows[0];
    } catch (error) {
      console.error(`Error incrementing click count for code ${code}:`, error);
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      throw new Error('Failed to increment click count in database');
    } finally {
      client.release();
    }
  }

  /**
   * Checks if a short code is already in use.
   * @param code - Short code to check
   * @returns Promise containing boolean indicating if code exists
   * @throws {Error} When database query fails
   * @example
   * const exists = await shortLinksRepository.codeExists('abc123');
   * if (exists) console.log('Code already in use');
   */
  async codeExists(code: string): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      const query = 'SELECT 1 FROM short_links WHERE code = $1 LIMIT 1';
      const result = await client.query(query, [code]);
      return result.rows.length > 0;
    } catch (error) {
      console.error(`Error checking if code exists ${code}:`, error);
      throw new Error('Failed to check code existence in database');
    } finally {
      client.release();
    }
  }

  /**
   * Updates the QR code URL for a short link.
   * @param id - Short link ID
   * @param qrCodeUrl - Public URL of the QR code image
   * @returns Promise resolving when update is complete
   * @throws {Error} When database query fails
   * @example
   * await shortLinksRepository.updateQRCodeUrl('link-id', 'https://cdn.example.com/qr-abc123.png');
   */
  async updateQRCodeUrl(id: string, qrCodeUrl: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      const query = `
        UPDATE short_links
        SET qr_code_url = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `;

      await client.query(query, [qrCodeUrl, id]);
    } catch (error) {
      console.error(`Error updating QR code URL for short link ${id}:`, error);
      throw new Error('Failed to update QR code URL in database');
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves expired short links with their QR code URLs for cleanup.
   * @returns Promise containing array of expired short links with QR code URLs
   * @throws {Error} When database query fails
   */
  async findExpiredWithQRCodes(): Promise<
    Array<{ code: string; qrCodeUrl: string | null }>
  > {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT code, qr_code_url as "qrCodeUrl"
        FROM short_links
        WHERE expires_at IS NOT NULL
          AND expires_at <= CURRENT_TIMESTAMP
          AND qr_code_url IS NOT NULL
      `;

      const result = await client.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error finding expired short links with QR codes:', error);
      throw new Error('Failed to find expired short links with QR codes');
    } finally {
      client.release();
    }
  }

  /**
   * Deletes expired short links from the database (cleanup operation).
   * @returns Promise containing the number of deleted links
   * @throws {Error} When database query fails
   * @example
   * const deletedCount = await shortLinksRepository.deleteExpired();
   * console.log(`Deleted ${deletedCount} expired links`);
   */
  async deleteExpired(): Promise<number> {
    const client = await this.pool.connect();

    try {
      const query = `
        DELETE FROM short_links
        WHERE expires_at IS NOT NULL
          AND expires_at <= CURRENT_TIMESTAMP
      `;

      const result = await client.query(query);
      return result.rowCount || 0;
    } catch (error) {
      console.error('Error deleting expired short links:', error);
      throw new Error('Failed to delete expired short links from database');
    } finally {
      client.release();
    }
  }

  /**
   * Executes a custom query for analytics and reporting.
   * @param queryText - SQL query to execute
   * @param params - Query parameters (optional)
   * @returns Promise containing query result
   * @throws {Error} When query execution fails
   */
  async query(
    queryText: string,
    params?: any[]
  ): Promise<{ rows: any[]; rowCount: number | null }> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(queryText, params);
      return {
        rows: result.rows,
        rowCount: result.rowCount,
      };
    } catch (error) {
      console.error('Error executing custom query:', error);
      throw new Error('Failed to execute database query');
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves short links created by a specific user.
   * @param userId - User ID to filter by
   * @param limit - Maximum number of results (default: 100)
   * @param offset - Number of results to skip (default: 0)
   * @returns Promise containing array of user's short links
   * @throws {Error} When database query fails
   * @example
   * const userLinks = await shortLinksRepository.findByUser('user-id', 10, 0);
   * console.log(`User has ${userLinks.length} short links`);
   */
  async findByUser(
    userId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<ShortLinkEntity[]> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT
          id,
          code,
          original_url as "originalUrl",
          qr_code_url as "qrCodeUrl",
          expires_at as "expiresAt",
          created_by as "createdBy",
          click_count as "clickCount",
          last_accessed as "lastAccessedAt",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM short_links
        WHERE created_by = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await client.query(query, [userId, limit, offset]);
      return result.rows;
    } catch (error) {
      console.error(`Error finding short links by user ${userId}:`, error);
      throw new Error('Failed to retrieve user short links from database');
    } finally {
      client.release();
    }
  }

  /**
   * Finds a form schema by short code with embedded theme data.
   * @param code - Short code to search for
   * @returns Promise containing form schema with theme or null if not found
   * @throws {Error} When database query fails
   * @example
   * const formData = await shortLinksRepository.findFormSchemaByCode('abc123');
   * if (formData) console.log(`Found form: ${formData.schema.id}`);
   */
  async findFormSchemaByCode(code: string): Promise<{
    schema: any;
    settings: any;
    theme: any | null;
    shortCode: string;
    renderToken: string;
  } | null> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT
          short_links.code as "shortCode",
          form_schemas.id as "schemaId",
          form_schemas.schema_json,
          form_schemas.theme_id as "themeId",
          form_schemas.is_published as "isPublished",
          form_schemas.expires_at as "expiresAt",
          form_schemas.render_token as "renderToken",
          form_themes.id as "theme.id",
          form_themes.name as "theme.name",
          form_themes.description as "theme.description",
          form_themes.thumbnail_url as "theme.thumbnailUrl",
          form_themes.theme_config as "theme.themeConfig",
          form_themes.usage_count as "theme.usageCount",
          form_themes.is_active as "theme.isActive",
          form_themes.created_at as "theme.createdAt",
          form_themes.updated_at as "theme.updatedAt"
        FROM short_links
        INNER JOIN form_schemas ON short_links.form_schema_id = form_schemas.id
        LEFT JOIN form_themes ON form_schemas.theme_id = form_themes.id AND form_themes.is_active = true
        WHERE short_links.code = $1
          AND form_schemas.is_published = true
          AND (short_links.expires_at IS NULL OR short_links.expires_at > CURRENT_TIMESTAMP)
      `;

      const result = await client.query(query, [code]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const parsedSchemaJson = row.schema_json;

      // Extract settings and add themeId from separate column if present
      const settings = parsedSchemaJson.settings || {};
      if (row.themeId) {
        settings.themeId = row.themeId;
      }

      const formData = {
        schema: {
          id: row.schemaId,
          fields: parsedSchemaJson.fields || [],
          isPublished: row.isPublished,
          expiresAt: row.expiresAt,
        },
        settings,
        theme: null as any,
        shortCode: row.shortCode,
        renderToken: row.renderToken,
      };

      // Add embedded theme object if theme exists
      if (row['theme.id']) {
        formData.theme = {
          id: row['theme.id'],
          name: row['theme.name'],
          description: row['theme.description'],
          thumbnailUrl: row['theme.thumbnailUrl'],
          themeConfig: row['theme.themeConfig'],
          usageCount: row['theme.usageCount'],
          isActive: row['theme.isActive'],
          createdAt: row['theme.createdAt'],
          updatedAt: row['theme.updatedAt'],
        };
      }

      return formData;
    } catch (error) {
      console.error(`Error finding form schema by short code ${code}:`, error);
      throw new Error('Failed to find form schema by short code');
    } finally {
      client.release();
    }
  }
}

// Export singleton instance
export const shortLinksRepository = new ShortLinksRepository();
