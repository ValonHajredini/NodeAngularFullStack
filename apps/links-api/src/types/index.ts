/**
 * Type definitions for Links Service
 */

export interface ShortLink {
  id: string;
  userId: string;
  resourceType: 'form' | 'survey' | 'svg' | 'generic';
  resourceId?: string;
  originalUrl: string;
  shortCode: string;
  token?: string;
  expiresAt?: Date;
  clickCount: number;
  lastAccessedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateShortLinkDto {
  userId: string;
  resourceType: 'form' | 'survey' | 'svg' | 'generic';
  resourceId?: string;
  originalUrl: string;
  shortCode: string;
  token?: string;
  expiresAt?: Date;
}

export interface UpdateShortLinkDto {
  expiresAt?: Date;
  token?: string;
}

export interface ClickAnalytics {
  id: string;
  shortLinkId: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  countryCode?: string;
  city?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown';
  browser?: string;
  os?: string;
  accessedAt: Date;
}

export interface CreateClickAnalyticsDto {
  shortLinkId: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  countryCode?: string;
  city?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown';
  browser?: string;
  os?: string;
}

export interface LinkAnalyticsSummary {
  totalClicks: number;
  uniqueVisitors: number;
  clicksByDevice: Record<string, number>;
  clicksByCountry: Record<string, number>;
  recentClicks: ClickAnalytics[];
}
