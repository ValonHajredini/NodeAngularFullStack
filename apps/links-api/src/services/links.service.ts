import { customAlphabet } from 'nanoid';
import * as QRCode from 'qrcode';
import { LinksRepository } from '../repositories/links.repository';
import { AnalyticsRepository } from '../repositories/analytics.repository';
import { ShortLink, CreateShortLinkDto, UpdateShortLinkDto, LinkAnalyticsSummary } from '../types';

// Generate URL-safe short codes (no confusing characters)
const nanoid = customAlphabet('0123456789ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz', 8);

/**
 * Business logic for short links management
 */
export class LinksService {
  private baseUrl: string;

  constructor(
    private linksRepo: LinksRepository,
    private analyticsRepo: AnalyticsRepository,
    baseUrl?: string
  ) {
    this.baseUrl = baseUrl || process.env.BASE_URL || 'http://localhost:3003';
  }

  /**
   * Generate a new short link
   * @param userId - User creating the link
   * @param originalUrl - The original URL to shorten
   * @param resourceType - Type of resource
   * @param resourceId - Optional resource ID
   * @param expiresAt - Optional expiration date
   * @param token - Optional JWT token for private resources
   * @returns Created short link with QR code
   */
  async generateShortLink(params: {
    userId: string;
    originalUrl: string;
    resourceType?: 'form' | 'survey' | 'svg' | 'generic';
    resourceId?: string;
    expiresAt?: Date;
    token?: string;
  }): Promise<ShortLink & { qrCode: string; shortUrl: string }> {
    const { userId, originalUrl, resourceType = 'generic', resourceId, expiresAt, token } = params;

    // Check if a short link already exists for this resource
    if (resourceType !== 'generic' && resourceId) {
      const existing = await this.linksRepo.findByResource(resourceType, resourceId);
      if (existing) {
        const shortUrl = `${this.baseUrl}/${existing.shortCode}`;
        const qrCode = await QRCode.toDataURL(shortUrl);
        return { ...existing, qrCode, shortUrl };
      }
    }

    // Generate unique short code
    let shortCode: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      shortCode = nanoid();
      const existing = await this.linksRepo.findByShortCode(shortCode);
      if (!existing) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique short code');
    }

    // Create short link
    const dto: CreateShortLinkDto = {
      userId,
      resourceType,
      resourceId,
      originalUrl,
      shortCode,
      token,
      expiresAt,
    };

    const shortLink = await this.linksRepo.create(dto);

    // Generate QR code
    const shortUrl = `${this.baseUrl}/${shortCode}`;
    const qrCode = await QRCode.toDataURL(shortUrl);

    return { ...shortLink, qrCode, shortUrl };
  }

  /**
   * Handle redirect from short code to original URL
   * Tracks analytics and validates expiration/token
   * @param shortCode - The short code to redirect
   * @param metadata - Request metadata for analytics
   * @returns Original URL to redirect to
   */
  async redirect(
    shortCode: string,
    metadata: {
      ipAddress: string;
      userAgent: string;
      referrer: string;
    }
  ): Promise<string> {
    // Find short link
    const shortLink = await this.linksRepo.findByShortCode(shortCode);
    if (!shortLink) {
      throw new Error('Short link not found');
    }

    // Check expiration
    if (shortLink.expiresAt && new Date() > new Date(shortLink.expiresAt)) {
      throw new Error('Short link has expired');
    }

    // Parse device type from user agent
    const deviceType = this.parseDeviceType(metadata.userAgent);
    const browser = this.parseBrowser(metadata.userAgent);
    const os = this.parseOS(metadata.userAgent);

    // Track analytics
    await this.analyticsRepo.create({
      shortLinkId: shortLink.id,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      referrer: metadata.referrer,
      deviceType,
      browser,
      os,
    });

    // Increment click count
    await this.linksRepo.incrementClickCount(shortLink.id);

    // Return original URL with token if present
    let redirectUrl = shortLink.originalUrl;
    if (shortLink.token && !redirectUrl.includes('token=')) {
      const separator = redirectUrl.includes('?') ? '&' : '?';
      redirectUrl = `${redirectUrl}${separator}token=${shortLink.token}`;
    }

    return redirectUrl;
  }

  /**
   * Get short link by code
   * @param shortCode - Short code to find
   * @returns Short link or null
   */
  async getByShortCode(shortCode: string): Promise<ShortLink | null> {
    return this.linksRepo.findByShortCode(shortCode);
  }

  /**
   * Get all short links for a user
   * @param userId - User ID
   * @returns Array of short links
   */
  async getUserLinks(userId: string): Promise<ShortLink[]> {
    return this.linksRepo.findByUserId(userId);
  }

  /**
   * Get analytics summary for a short link
   * @param shortLinkId - Short link ID
   * @returns Analytics summary
   */
  async getAnalyticsSummary(shortLinkId: string): Promise<LinkAnalyticsSummary> {
    return this.analyticsRepo.getSummary(shortLinkId);
  }

  /**
   * Update a short link
   * @param id - Link ID
   * @param userId - User making the update (for authorization)
   * @param dto - Update data
   * @returns Updated short link or null
   */
  async updateLink(
    id: string,
    userId: string,
    dto: UpdateShortLinkDto
  ): Promise<ShortLink | null> {
    // Verify ownership
    const existing = await this.linksRepo.findById(id);
    if (!existing || existing.userId !== userId) {
      throw new Error('Short link not found or unauthorized');
    }

    return this.linksRepo.update(id, dto);
  }

  /**
   * Delete a short link
   * @param id - Link ID
   * @param userId - User making the deletion (for authorization)
   * @returns True if deleted
   */
  async deleteLink(id: string, userId: string): Promise<boolean> {
    // Verify ownership
    const existing = await this.linksRepo.findById(id);
    if (!existing || existing.userId !== userId) {
      throw new Error('Short link not found or unauthorized');
    }

    return this.linksRepo.delete(id);
  }

  /**
   * Clean up expired short links (cron job)
   * @returns Number of deleted links
   */
  async cleanupExpired(): Promise<number> {
    return this.linksRepo.deleteExpired();
  }

  /**
   * Parse device type from user agent
   */
  private parseDeviceType(userAgent: string): 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown' {
    const ua = userAgent.toLowerCase();

    if (ua.includes('bot') || ua.includes('crawler') || ua.includes('spider')) {
      return 'bot';
    }

    if (ua.includes('mobile')) {
      return 'mobile';
    }

    if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'tablet';
    }

    if (ua.includes('windows') || ua.includes('macintosh') || ua.includes('linux')) {
      return 'desktop';
    }

    return 'unknown';
  }

  /**
   * Parse browser from user agent
   */
  private parseBrowser(userAgent: string): string {
    const ua = userAgent.toLowerCase();

    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('chrome')) return 'Chrome';
    if (ua.includes('safari')) return 'Safari';
    if (ua.includes('edge')) return 'Edge';
    if (ua.includes('opera')) return 'Opera';

    return 'Unknown';
  }

  /**
   * Parse OS from user agent
   */
  private parseOS(userAgent: string): string {
    const ua = userAgent.toLowerCase();

    if (ua.includes('windows')) return 'Windows';
    if (ua.includes('macintosh') || ua.includes('mac os')) return 'macOS';
    if (ua.includes('linux')) return 'Linux';
    if (ua.includes('android')) return 'Android';
    if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) return 'iOS';

    return 'Unknown';
  }
}
