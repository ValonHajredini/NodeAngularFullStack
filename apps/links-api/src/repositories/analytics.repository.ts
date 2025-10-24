import { Pool } from 'pg';
import { ClickAnalytics, CreateClickAnalyticsDto, LinkAnalyticsSummary } from '../types';

/**
 * Repository for click_analytics table operations
 */
export class AnalyticsRepository {
  constructor(private pool: Pool) {}

  /**
   * Create a new click analytics record
   * @param dto - Click analytics creation data
   * @returns Created analytics record
   */
  async create(dto: CreateClickAnalyticsDto): Promise<ClickAnalytics> {
    const query = `
      INSERT INTO click_analytics
      (short_link_id, ip_address, user_agent, referrer, country_code, city, device_type, browser, os)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING
        id, short_link_id as "shortLinkId", ip_address as "ipAddress",
        user_agent as "userAgent", referrer, country_code as "countryCode",
        city, device_type as "deviceType", browser, os,
        accessed_at as "accessedAt"
    `;

    const values = [
      dto.shortLinkId,
      dto.ipAddress || null,
      dto.userAgent || null,
      dto.referrer || null,
      dto.countryCode || null,
      dto.city || null,
      dto.deviceType || 'unknown',
      dto.browser || null,
      dto.os || null,
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Get analytics summary for a short link
   * @param shortLinkId - Short link ID
   * @param limit - Number of recent clicks to include (default: 10)
   * @returns Analytics summary
   */
  async getSummary(shortLinkId: string, limit = 10): Promise<LinkAnalyticsSummary> {
    // Get total clicks
    const totalClicksQuery = `
      SELECT COUNT(*) as total
      FROM click_analytics
      WHERE short_link_id = $1
    `;
    const totalResult = await this.pool.query(totalClicksQuery, [shortLinkId]);
    const totalClicks = parseInt(totalResult.rows[0].total);

    // Get unique visitors (by IP address)
    const uniqueVisitorsQuery = `
      SELECT COUNT(DISTINCT ip_address) as unique_count
      FROM click_analytics
      WHERE short_link_id = $1
    `;
    const uniqueResult = await this.pool.query(uniqueVisitorsQuery, [shortLinkId]);
    const uniqueVisitors = parseInt(uniqueResult.rows[0].unique_count);

    // Get clicks by device type
    const deviceQuery = `
      SELECT device_type, COUNT(*) as count
      FROM click_analytics
      WHERE short_link_id = $1
      GROUP BY device_type
    `;
    const deviceResult = await this.pool.query(deviceQuery, [shortLinkId]);
    const clicksByDevice: Record<string, number> = {};
    deviceResult.rows.forEach((row) => {
      clicksByDevice[row.device_type] = parseInt(row.count);
    });

    // Get clicks by country
    const countryQuery = `
      SELECT country_code, COUNT(*) as count
      FROM click_analytics
      WHERE short_link_id = $1 AND country_code IS NOT NULL
      GROUP BY country_code
      ORDER BY count DESC
      LIMIT 10
    `;
    const countryResult = await this.pool.query(countryQuery, [shortLinkId]);
    const clicksByCountry: Record<string, number> = {};
    countryResult.rows.forEach((row) => {
      clicksByCountry[row.country_code] = parseInt(row.count);
    });

    // Get recent clicks
    const recentQuery = `
      SELECT
        id, short_link_id as "shortLinkId", ip_address as "ipAddress",
        user_agent as "userAgent", referrer, country_code as "countryCode",
        city, device_type as "deviceType", browser, os,
        accessed_at as "accessedAt"
      FROM click_analytics
      WHERE short_link_id = $1
      ORDER BY accessed_at DESC
      LIMIT $2
    `;
    const recentResult = await this.pool.query(recentQuery, [shortLinkId, limit]);
    const recentClicks = recentResult.rows;

    return {
      totalClicks,
      uniqueVisitors,
      clicksByDevice,
      clicksByCountry,
      recentClicks,
    };
  }

  /**
   * Get all analytics records for a short link
   * @param shortLinkId - Short link ID
   * @returns Array of analytics records
   */
  async findByShortLinkId(shortLinkId: string): Promise<ClickAnalytics[]> {
    const query = `
      SELECT
        id, short_link_id as "shortLinkId", ip_address as "ipAddress",
        user_agent as "userAgent", referrer, country_code as "countryCode",
        city, device_type as "deviceType", browser, os,
        accessed_at as "accessedAt"
      FROM click_analytics
      WHERE short_link_id = $1
      ORDER BY accessed_at DESC
    `;

    const result = await this.pool.query(query, [shortLinkId]);
    return result.rows;
  }

  /**
   * Delete analytics records for a short link
   * @param shortLinkId - Short link ID
   * @returns Number of deleted records
   */
  async deleteByShortLinkId(shortLinkId: string): Promise<number> {
    const query = 'DELETE FROM click_analytics WHERE short_link_id = $1';
    const result = await this.pool.query(query, [shortLinkId]);
    return result.rowCount || 0;
  }
}
