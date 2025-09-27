import { customAlphabet } from 'nanoid';
import {
  ShortLinksRepository,
  ShortLinkEntity,
} from '../repositories/short-links.repository';
import {
  ShortLink,
  CreateShortLinkRequest,
  CreateShortLinkResponse,
  CreateShortLinkData,
  ResolveShortLinkResponse,
  ExpiredShortLinkError,
  NotFoundShortLinkError,
} from '@nodeangularfullstack/shared';
import { toolsService } from './tools.service';
import {
  isValidUrl,
  sanitizeUrl,
  performSecurityCheck,
  isDomainAllowed,
} from '../validators/url.validators';

/**
 * Custom alphabet for short codes excluding confusing characters.
 * Excludes: 0, O, o, 1, l, I to prevent confusion.
 */
const SHORT_CODE_ALPHABET =
  '23456789ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';

/**
 * Custom nanoid generator for short codes.
 */
const generateShortCode = customAlphabet(SHORT_CODE_ALPHABET, 7); // 7 characters for good balance

/**
 * Short links service for managing URL shortening operations.
 * Handles short link creation, resolution, and analytics with proper validation.
 */
export class ShortLinksService {
  private static readonly MAX_GENERATION_ATTEMPTS = 10;
  private static readonly BASE_URL =
    process.env.BASE_URL || 'http://localhost:3000';
  private shortLinksRepository: ShortLinksRepository;

  constructor() {
    this.shortLinksRepository = new ShortLinksRepository();
  }

  /**
   * Converts database entity to shared interface format.
   * @param entity - Database short link entity
   * @returns ShortLink interface for API responses
   */
  private entityToShortLink(entity: ShortLinkEntity): ShortLink {
    return {
      id: entity.id,
      code: entity.code,
      originalUrl: entity.originalUrl,
      expiresAt: entity.expiresAt,
      createdBy: entity.createdBy,
      clickCount: entity.clickCount,
      lastAccessedAt: entity.lastAccessedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  /**
   * Generates a unique short code that doesn't exist in the database.
   * @returns Promise containing unique short code
   * @throws {Error} When unable to generate unique code after max attempts
   */
  private async generateUniqueCode(): Promise<string> {
    let attempts = 0;

    while (attempts < ShortLinksService.MAX_GENERATION_ATTEMPTS) {
      const code = generateShortCode();

      // Check if code already exists
      const exists = await this.shortLinksRepository.codeExists(code);
      if (!exists) {
        return code;
      }

      attempts++;
    }

    throw new Error(
      'Unable to generate unique short code after maximum attempts'
    );
  }

  /**
   * Validates and sanitizes URL for short link creation.
   * @param url - Original URL to validate
   * @returns sanitized URL string
   * @throws {Error} When URL validation fails
   */
  private validateAndSanitizeUrl(url: string): string {
    const sanitized = sanitizeUrl(url);

    if (!isValidUrl(sanitized)) {
      throw new Error('Invalid URL format or unsafe scheme detected');
    }

    if (!performSecurityCheck(sanitized)) {
      throw new Error('URL contains potentially dangerous content');
    }

    try {
      const parsedUrl = new URL(sanitized);
      if (!isDomainAllowed(parsedUrl.hostname)) {
        throw new Error('Domain is not allowed for URL shortening');
      }
    } catch {
      throw new Error('Invalid URL format');
    }

    return sanitized;
  }

  /**
   * Checks if the short-link tool is enabled.
   * @returns Promise containing boolean indicating if tool is enabled
   * @throws {Error} When tool status check fails
   */
  private async isToolEnabled(): Promise<boolean> {
    try {
      const tool = await toolsService.getToolByKey('short-link');
      return tool?.active ?? false;
    } catch (error) {
      console.error('Error checking short-link tool status:', error);
      return false;
    }
  }

  /**
   * Creates a new short link.
   * @param request - Short link creation request
   * @param userId - Optional user ID for tracking (nullable)
   * @returns Promise containing created short link response
   * @throws {Error} When tool is disabled, URL validation fails, or creation fails
   * @example
   * const response = await shortLinksService.createShortLink({
   *   originalUrl: 'https://example.com',
   *   expiresAt: new Date('2025-12-31')
   * }, 'user-id');
   */
  async createShortLink(
    request: CreateShortLinkRequest,
    userId?: string
  ): Promise<CreateShortLinkResponse> {
    // Check if tool is enabled
    const toolEnabled = await this.isToolEnabled();
    if (!toolEnabled) {
      throw new Error('Short link tool is currently disabled');
    }

    // Validate and sanitize URL
    const sanitizedUrl = this.validateAndSanitizeUrl(request.originalUrl);

    // Validate expiration date if provided
    if (request.expiresAt) {
      const now = new Date();
      if (request.expiresAt <= now) {
        throw new Error('Expiration date must be in the future');
      }
    }

    try {
      // Generate unique short code
      const code = await this.generateUniqueCode();

      // Create short link data
      const createData: CreateShortLinkData = {
        code,
        originalUrl: sanitizedUrl,
        expiresAt: request.expiresAt,
        createdBy: userId,
      };

      // Save to database
      const entity = await this.shortLinksRepository.create(createData);
      const shortLink = this.entityToShortLink(entity);

      // Generate full short URL
      const shortUrl = `${ShortLinksService.BASE_URL}/s/${code}`;

      return {
        success: true,
        data: {
          shortLink,
          shortUrl,
        },
      };
    } catch (error) {
      console.error('Error creating short link:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to create short link');
    }
  }

  /**
   * Resolves a short code to its original URL and increments analytics.
   * @param code - Short code to resolve
   * @returns Promise containing resolved short link response
   * @throws {ExpiredShortLinkError} When link has expired
   * @throws {NotFoundShortLinkError} When link not found
   * @throws {Error} When resolution fails
   * @example
   * const response = await shortLinksService.resolveShortLink('abc123');
   * console.log(`Redirecting to: ${response.data.originalUrl}`);
   */
  async resolveShortLink(code: string): Promise<ResolveShortLinkResponse> {
    try {
      // Find the short link
      const entity = await this.shortLinksRepository.findByCode(code);

      if (!entity) {
        const error: NotFoundShortLinkError = {
          success: false,
          message: 'Short link not found',
          code: 'LINK_NOT_FOUND',
          details: { code },
        };
        throw error;
      }

      // Check if link has expired
      if (entity.expiresAt && entity.expiresAt <= new Date()) {
        const error: ExpiredShortLinkError = {
          success: false,
          message: 'Short link has expired',
          code: 'LINK_EXPIRED',
          details: {
            code,
            expiredAt: entity.expiresAt,
          },
        };
        throw error;
      }

      // Increment click count and update last accessed
      const updatedEntity =
        await this.shortLinksRepository.incrementClickCount(code);
      const shortLink = this.entityToShortLink(updatedEntity);

      return {
        success: true,
        data: {
          shortLink,
          originalUrl: shortLink.originalUrl,
        },
      };
    } catch (error) {
      // Re-throw custom errors as-is
      if (error && typeof error === 'object' && 'code' in error) {
        throw error;
      }

      console.error(`Error resolving short link ${code}:`, error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to resolve short link');
    }
  }

  /**
   * Retrieves short links created by a specific user with complete URLs.
   * @param userId - User ID to filter by
   * @param limit - Maximum number of results (default: 20)
   * @param offset - Number of results to skip (default: 0)
   * @returns Promise containing array of user's short links with complete URLs
   * @throws {Error} When retrieval fails
   * @example
   * const userLinks = await shortLinksService.getUserShortLinks('user-id', 10, 0);
   * console.log(`User has ${userLinks.length} short links`);
   */
  async getUserShortLinks(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<Array<ShortLink & { shortUrl: string }>> {
    try {
      const entities = await this.shortLinksRepository.findByUser(
        userId,
        limit,
        offset
      );
      return entities.map((entity) => {
        const shortLink = this.entityToShortLink(entity);
        return {
          ...shortLink,
          shortUrl: `${ShortLinksService.BASE_URL}/s/${entity.code}`,
        };
      });
    } catch (error) {
      console.error(`Error retrieving short links for user ${userId}:`, error);
      throw new Error('Failed to retrieve user short links');
    }
  }

  /**
   * Performs cleanup of expired short links.
   * This is typically called by a scheduled job or maintenance task.
   * @returns Promise containing number of deleted links
   * @throws {Error} When cleanup fails
   * @example
   * const deletedCount = await shortLinksService.cleanupExpiredLinks();
   * console.log(`Cleaned up ${deletedCount} expired links`);
   */
  async cleanupExpiredLinks(): Promise<number> {
    try {
      return await this.shortLinksRepository.deleteExpired();
    } catch (error) {
      console.error('Error during expired links cleanup:', error);
      throw new Error('Failed to cleanup expired links');
    }
  }

  /**
   * Gets comprehensive statistics for analytics.
   * @returns Promise containing detailed statistics
   * @throws {Error} When statistics retrieval fails
   */
  async getStatistics(): Promise<{
    totalLinks: number;
    activeLinks: number;
    expiredLinks: number;
    totalClicks: number;
    topLinks: Array<{
      code: string;
      originalUrl: string;
      clickCount: number;
    }>;
  }> {
    try {
      // Get overall statistics using proper aggregation queries
      const statsQuery = `
        SELECT
          COUNT(*) as total_links,
          COUNT(CASE WHEN expires_at IS NULL OR expires_at > NOW() THEN 1 END) as active_links,
          COUNT(CASE WHEN expires_at IS NOT NULL AND expires_at <= NOW() THEN 1 END) as expired_links,
          COALESCE(SUM(click_count), 0) as total_clicks
        FROM short_links
      `;

      const statsResult = await this.shortLinksRepository.query(statsQuery);
      const stats = statsResult.rows[0];

      // Get top performing links
      const topLinksQuery = `
        SELECT code, original_url, click_count
        FROM short_links
        WHERE click_count > 0
        ORDER BY click_count DESC
        LIMIT 10
      `;

      const topLinksResult =
        await this.shortLinksRepository.query(topLinksQuery);

      return {
        totalLinks: parseInt(stats.total_links) || 0,
        activeLinks: parseInt(stats.active_links) || 0,
        expiredLinks: parseInt(stats.expired_links) || 0,
        totalClicks: parseInt(stats.total_clicks) || 0,
        topLinks: topLinksResult.rows.map((row: any) => ({
          code: row.code,
          originalUrl: row.original_url,
          clickCount: row.click_count,
        })),
      };
    } catch (error) {
      console.error('Error retrieving short link statistics:', error);
      throw new Error('Failed to retrieve statistics');
    }
  }

  /**
   * Validates a short code format without database lookup.
   * @param code - Short code to validate
   * @returns boolean indicating if code format is valid
   */
  static isValidCodeFormat(code: string): boolean {
    return (
      code.length >= 6 &&
      code.length <= 8 &&
      /^[a-zA-Z0-9]+$/.test(code) &&
      !/[0oO1lI]/.test(code) // No confusing characters
    );
  }

  /**
   * Generates preview information for a URL without creating a short link.
   * @param url - URL to preview
   * @returns Promise containing URL validation and preview info
   * @throws {Error} When URL validation fails
   */
  async previewUrl(url: string): Promise<{
    valid: boolean;
    sanitizedUrl: string;
    domain: string;
    isSecure: boolean;
  }> {
    try {
      const sanitized = this.validateAndSanitizeUrl(url);
      const parsedUrl = new URL(sanitized);

      return {
        valid: true,
        sanitizedUrl: sanitized,
        domain: parsedUrl.hostname,
        isSecure: parsedUrl.protocol === 'https:',
      };
    } catch (error) {
      return {
        valid: false,
        sanitizedUrl: '',
        domain: '',
        isSecure: false,
      };
    }
  }
}

// Export singleton instance
export const shortLinksService = new ShortLinksService();
