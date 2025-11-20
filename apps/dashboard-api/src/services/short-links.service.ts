import { customAlphabet } from 'nanoid';
import QRCode from 'qrcode';
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
import { storageService } from './storage.service';
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
 * Reserved words that cannot be used as custom short link names.
 * These prevent conflicts with system routes and sensitive paths.
 */
const RESERVED_WORDS = [
  'admin',
  'api',
  'auth',
  'health',
  'static',
  'public',
  'assets',
  'docs',
  'swagger',
  'login',
  'logout',
  'register',
  'dashboard',
  'profile',
  'settings',
  'tools',
  's', // The short link route itself
];

/**
 * Short links service for managing URL shortening operations.
 * Handles short link creation, resolution, and analytics with proper validation.
 */
export class ShortLinksService {
  private static readonly MAX_GENERATION_ATTEMPTS = 10;
  private static readonly BASE_URL =
    process.env.BASE_URL || 'http://localhost:3000';
  private static readonly CUSTOM_NAME_MIN_LENGTH = 3;
  private static readonly CUSTOM_NAME_MAX_LENGTH = 30;
  private shortLinksRepository: ShortLinksRepository;
  private toolsServiceInstance: typeof toolsService;

  constructor(
    repository?: ShortLinksRepository,
    toolsServiceInstance?: typeof toolsService
  ) {
    this.shortLinksRepository = repository || new ShortLinksRepository();
    this.toolsServiceInstance = toolsServiceInstance || toolsService;
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
      qrCodeUrl: entity.qrCodeUrl,
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
   * Validates a custom name for use as a short link code.
   * @param customName - Custom name to validate
   * @returns boolean indicating if custom name is valid
   */
  private validateCustomNameFormat(customName: string): {
    valid: boolean;
    error?: string;
  } {
    // Check length
    if (
      customName.length < ShortLinksService.CUSTOM_NAME_MIN_LENGTH ||
      customName.length > ShortLinksService.CUSTOM_NAME_MAX_LENGTH
    ) {
      return {
        valid: false,
        error: `Custom name must be between ${ShortLinksService.CUSTOM_NAME_MIN_LENGTH} and ${ShortLinksService.CUSTOM_NAME_MAX_LENGTH} characters`,
      };
    }

    // Check allowed characters (alphanumeric and hyphens)
    if (!/^[a-zA-Z0-9-]+$/.test(customName)) {
      return {
        valid: false,
        error: 'Custom name can only contain letters, numbers, and hyphens',
      };
    }

    // Check for consecutive hyphens
    if (/--/.test(customName)) {
      return {
        valid: false,
        error: 'Custom name cannot contain consecutive hyphens',
      };
    }

    // Check for leading/trailing hyphens
    if (customName.startsWith('-') || customName.endsWith('-')) {
      return {
        valid: false,
        error: 'Custom name cannot start or end with a hyphen',
      };
    }

    // Check reserved words (case-insensitive)
    if (RESERVED_WORDS.includes(customName.toLowerCase())) {
      return {
        valid: false,
        error: 'This custom name is reserved and cannot be used',
      };
    }

    return { valid: true };
  }

  /**
   * Generates a QR code for the given short URL.
   * @param shortUrl - Full short URL to encode
   * @returns Promise containing QR code as PNG Buffer
   */
  private async generateQRCode(shortUrl: string): Promise<Buffer> {
    try {
      // Generate QR code as PNG buffer
      const qrCodeBuffer = await QRCode.toBuffer(shortUrl, {
        type: 'png',
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      return qrCodeBuffer;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Uploads QR code image to DigitalOcean Spaces storage.
   * @param code - Short code for naming the QR code file
   * @param qrBuffer - PNG buffer containing QR code image
   * @returns Promise containing public URL of uploaded QR code
   * @throws {Error} When upload fails
   */
  private async uploadQRCodeToStorage(
    code: string,
    qrBuffer: Buffer
  ): Promise<string> {
    try {
      const fileName = `qr-codes/qr-${code}.png`;
      const qrCodeUrl = await storageService.uploadFile(
        qrBuffer,
        fileName,
        'image/png',
        { generateUniqueFileName: false }
      );
      return qrCodeUrl;
    } catch (error) {
      console.error('Error uploading QR code to storage:', error);
      throw new Error('Failed to upload QR code to storage');
    }
  }

  /**
   * Generates QR code as base64 data URL for backwards compatibility.
   * @param shortUrl - Full short URL to encode
   * @returns Promise containing QR code data URL (base64 PNG)
   */
  private async generateQRCodeDataUrl(shortUrl: string): Promise<string> {
    try {
      // Generate QR code as data URL (base64 PNG image)
      const qrCodeDataUrl = await QRCode.toDataURL(shortUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      return qrCodeDataUrl;
    } catch (error) {
      console.error('Error generating QR code data URL:', error);
      throw new Error('Failed to generate QR code data URL');
    }
  }

  /**
   * Checks if the short-link tool is enabled.
   * @returns Promise containing boolean indicating if tool is enabled
   * @throws {Error} When tool status check fails
   */
  private async isToolEnabled(): Promise<boolean> {
    try {
      const tool = await this.toolsServiceInstance.getToolByKey('short-link');
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
   *   expiresAt: new Date('2025-12-31'),
   *   customName: 'my-link'
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
      let code: string;

      // Handle custom name if provided
      if (request.customName) {
        const trimmedName = request.customName.trim();

        // Validate custom name format
        const validation = this.validateCustomNameFormat(trimmedName);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        // Check if custom name already exists (case-insensitive check)
        const exists = await this.shortLinksRepository.codeExists(
          trimmedName.toLowerCase()
        );
        if (exists) {
          throw new Error('This custom name is already taken');
        }

        // Use custom name as code (preserve case)
        code = trimmedName.toLowerCase();
      } else {
        // Generate unique short code
        code = await this.generateUniqueCode();
      }

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

      // Generate QR code and upload to storage
      let qrCodeUrl: string | undefined;
      let qrCodeDataUrl: string | undefined;

      try {
        // Generate QR code as PNG buffer
        const qrCodeBuffer = await this.generateQRCode(shortUrl);

        // Upload to DigitalOcean Spaces
        qrCodeUrl = await this.uploadQRCodeToStorage(code, qrCodeBuffer);

        // Update database with QR code URL
        await this.shortLinksRepository.updateQRCodeUrl(entity.id, qrCodeUrl);

        // Also generate data URL for backwards compatibility
        qrCodeDataUrl = await this.generateQRCodeDataUrl(shortUrl);
      } catch (error) {
        // QR code generation/upload failure should not prevent short link creation
        console.error(
          '⚠️ QR code generation or upload failed, but short link created:',
          error
        );
        // Generate fallback data URL only
        try {
          qrCodeDataUrl = await this.generateQRCodeDataUrl(shortUrl);
        } catch (fallbackError) {
          console.error(
            '⚠️ Fallback QR code generation also failed:',
            fallbackError
          );
        }
      }

      return {
        success: true,
        data: {
          shortLink: {
            ...shortLink,
            qrCodeUrl,
          },
          shortUrl,
          qrCodeDataUrl,
          qrCodeUrl,
        },
      };
    } catch (error) {
      console.error('❌ Error creating short link:');
      console.error(
        '  Message:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      console.error('  Stack:', error instanceof Error ? error.stack : 'N/A');
      console.error('  Request:', {
        customName: request.customName,
        url: sanitizedUrl,
        userId,
      });

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
   * Deletes QR codes from storage before removing database records.
   * @returns Promise containing number of deleted links
   * @throws {Error} When cleanup fails
   * @example
   * const deletedCount = await shortLinksService.cleanupExpiredLinks();
   * console.log(`Cleaned up ${deletedCount} expired links`);
   */
  async cleanupExpiredLinks(): Promise<number> {
    try {
      // First, find all expired links with QR codes
      const expiredLinks =
        await this.shortLinksRepository.findExpiredWithQRCodes();

      // Delete QR codes from storage
      for (const link of expiredLinks) {
        if (link.qrCodeUrl) {
          try {
            const fileName = `qr-codes/qr-${link.code}.png`;
            await storageService.deleteFile(fileName);
            console.log(`✅ Deleted QR code for expired link: ${link.code}`);
          } catch (error) {
            // Log but don't fail cleanup if storage deletion fails
            console.error(
              `⚠️ Failed to delete QR code for ${link.code} from storage:`,
              error
            );
          }
        }
      }

      // Then delete the database records
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
   * Checks if a custom name is available for use.
   * @param customName - Custom name to check
   * @returns Promise containing availability status and validation result
   */
  async checkCustomNameAvailability(customName: string): Promise<{
    available: boolean;
    valid: boolean;
    error?: string;
  }> {
    const trimmedName = customName.trim();

    // Validate format first
    const validation = this.validateCustomNameFormat(trimmedName);
    if (!validation.valid) {
      return {
        available: false,
        valid: false,
        error: validation.error,
      };
    }

    // Check if already exists (case-insensitive)
    const exists = await this.shortLinksRepository.codeExists(
      trimmedName.toLowerCase()
    );

    return {
      available: !exists,
      valid: true,
      error: exists ? 'This custom name is already taken' : undefined,
    };
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
