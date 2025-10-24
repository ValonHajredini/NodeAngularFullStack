import { Pool } from 'pg';
import { ShortLink, CreateShortLinkDto, UpdateShortLinkDto } from '../types';

/**
 * Repository for short_links table operations
 */
export class LinksRepository {
  constructor(private pool: Pool) {}

  /**
   * Create a new short link
   * @param dto - Short link creation data
   * @returns Created short link
   */
  async create(dto: CreateShortLinkDto): Promise<ShortLink> {
    const query = `
      INSERT INTO short_links
      (user_id, resource_type, resource_id, original_url, short_code, token, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        id, user_id as "userId", resource_type as "resourceType",
        resource_id as "resourceId", original_url as "originalUrl",
        short_code as "shortCode", token, expires_at as "expiresAt",
        click_count as "clickCount", last_accessed_at as "lastAccessedAt",
        created_at as "createdAt", updated_at as "updatedAt"
    `;

    const values = [
      dto.userId,
      dto.resourceType,
      dto.resourceId || null,
      dto.originalUrl,
      dto.shortCode,
      dto.token || null,
      dto.expiresAt || null,
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Find a short link by its short code
   * @param shortCode - The short code to search for
   * @returns Short link or null if not found
   */
  async findByShortCode(shortCode: string): Promise<ShortLink | null> {
    const query = `
      SELECT
        id, user_id as "userId", resource_type as "resourceType",
        resource_id as "resourceId", original_url as "originalUrl",
        short_code as "shortCode", token, expires_at as "expiresAt",
        click_count as "clickCount", last_accessed_at as "lastAccessedAt",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM short_links
      WHERE short_code = $1
    `;

    const result = await this.pool.query(query, [shortCode]);
    return result.rows[0] || null;
  }

  /**
   * Find a short link by ID
   * @param id - The link ID
   * @returns Short link or null if not found
   */
  async findById(id: string): Promise<ShortLink | null> {
    const query = `
      SELECT
        id, user_id as "userId", resource_type as "resourceType",
        resource_id as "resourceId", original_url as "originalUrl",
        short_code as "shortCode", token, expires_at as "expiresAt",
        click_count as "clickCount", last_accessed_at as "lastAccessedAt",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM short_links
      WHERE id = $1
    `;

    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find all short links for a specific user
   * @param userId - The user ID
   * @returns Array of short links
   */
  async findByUserId(userId: string): Promise<ShortLink[]> {
    const query = `
      SELECT
        id, user_id as "userId", resource_type as "resourceType",
        resource_id as "resourceId", original_url as "originalUrl",
        short_code as "shortCode", token, expires_at as "expiresAt",
        click_count as "clickCount", last_accessed_at as "lastAccessedAt",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM short_links
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Find short link by resource
   * @param resourceType - Type of resource
   * @param resourceId - ID of the resource
   * @returns Short link or null if not found
   */
  async findByResource(
    resourceType: string,
    resourceId: string
  ): Promise<ShortLink | null> {
    const query = `
      SELECT
        id, user_id as "userId", resource_type as "resourceType",
        resource_id as "resourceId", original_url as "originalUrl",
        short_code as "shortCode", token, expires_at as "expiresAt",
        click_count as "clickCount", last_accessed_at as "lastAccessedAt",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM short_links
      WHERE resource_type = $1 AND resource_id = $2
    `;

    const result = await this.pool.query(query, [resourceType, resourceId]);
    return result.rows[0] || null;
  }

  /**
   * Update a short link
   * @param id - Link ID
   * @param dto - Update data
   * @returns Updated short link or null if not found
   */
  async update(id: string, dto: UpdateShortLinkDto): Promise<ShortLink | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (dto.expiresAt !== undefined) {
      fields.push(`expires_at = $${paramCount++}`);
      values.push(dto.expiresAt);
    }

    if (dto.token !== undefined) {
      fields.push(`token = $${paramCount++}`);
      values.push(dto.token);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE short_links
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING
        id, user_id as "userId", resource_type as "resourceType",
        resource_id as "resourceId", original_url as "originalUrl",
        short_code as "shortCode", token, expires_at as "expiresAt",
        click_count as "clickCount", last_accessed_at as "lastAccessedAt",
        created_at as "createdAt", updated_at as "updatedAt"
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Increment click count and update last accessed timestamp
   * @param id - Link ID
   */
  async incrementClickCount(id: string): Promise<void> {
    const query = `
      UPDATE short_links
      SET click_count = click_count + 1,
          last_accessed_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await this.pool.query(query, [id]);
  }

  /**
   * Delete a short link
   * @param id - Link ID
   * @returns True if deleted, false if not found
   */
  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM short_links WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Delete expired short links
   * @returns Number of deleted links
   */
  async deleteExpired(): Promise<number> {
    const query = `
      DELETE FROM short_links
      WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP
    `;

    const result = await this.pool.query(query);
    return result.rowCount || 0;
  }
}
