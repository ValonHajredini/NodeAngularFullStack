import { TokenUsageRepository } from '../repositories/token-usage.repository';
import { TenantContext } from '../repositories/base.repository';
import {
  TokenUsage,
  TokenUsageFilters,
  TokenUsageResponse,
  TokenUsageStats,
  TokenUsageTimeSeries,
} from '@nodeangularfullstack/shared';
import { ApiTokenService } from './api-token.service';

/**
 * Service for managing API token usage tracking and analytics.
 * Provides business logic for token usage operations with tenant isolation.
 */
export class TokenUsageService {
  private tokenUsageRepository: TokenUsageRepository;
  private apiTokenService: ApiTokenService;

  constructor() {
    this.tokenUsageRepository = new TokenUsageRepository();
    this.apiTokenService = new ApiTokenService();
  }

  /**
   * Gets paginated usage history for a specific token.
   * @param tokenId - API token ID
   * @param userId - User ID for authorization
   * @param filters - Optional filters for date range and status
   * @param pagination - Pagination options
   * @param tenantContext - Optional tenant context
   * @returns Promise containing paginated usage data
   * @throws {Error} When token access is denied or query fails
   * @example
   * const usage = await service.getTokenUsage('token-id', 'user-id', {
   *   from: new Date('2024-01-01'),
   *   to: new Date('2024-12-31')
   * }, { page: 1, limit: 50 });
   */
  async getTokenUsage(
    tokenId: string,
    userId: string,
    filters: TokenUsageFilters = {},
    pagination: { page?: number; limit?: number } = {},
    tenantContext?: TenantContext
  ): Promise<TokenUsageResponse> {
    try {
      // Verify user owns the token
      const token = await this.apiTokenService.findByIdForUser(
        tokenId,
        userId,
        tenantContext
      );
      if (!token) {
        throw new Error('Token not found or access denied');
      }

      // Get paginated usage data
      const result = await this.tokenUsageRepository.findUsageByTokenId(
        tokenId,
        filters,
        tenantContext,
        pagination
      );

      return {
        usage: result.usage,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to get token usage: ${error.message}`);
    }
  }

  /**
   * Gets usage statistics for a specific token.
   * @param tokenId - API token ID
   * @param userId - User ID for authorization
   * @param tenantContext - Optional tenant context
   * @param dateRange - Optional date range for statistics
   * @returns Promise containing usage statistics
   * @throws {Error} When token access is denied or query fails
   */
  async getTokenUsageStats(
    tokenId: string,
    userId: string,
    tenantContext?: TenantContext,
    dateRange?: { from: Date; to: Date }
  ): Promise<TokenUsageStats> {
    try {
      // Verify user owns the token
      const token = await this.apiTokenService.findByIdForUser(
        tokenId,
        userId,
        tenantContext
      );
      if (!token) {
        throw new Error('Token not found or access denied');
      }

      // Get usage statistics
      const stats = await this.tokenUsageRepository.getUsageStats(
        tokenId,
        tenantContext,
        dateRange
      );

      return stats;
    } catch (error: any) {
      throw new Error(`Failed to get token usage statistics: ${error.message}`);
    }
  }

  /**
   * Gets time-series usage data for analytics and charts.
   * @param tokenId - API token ID
   * @param userId - User ID for authorization
   * @param period - Aggregation period ('hour' | 'day')
   * @param tenantContext - Optional tenant context
   * @param dateRange - Optional date range for time series
   * @returns Promise containing time-series data
   * @throws {Error} When token access is denied or query fails
   */
  async getTokenUsageTimeSeries(
    tokenId: string,
    userId: string,
    period: 'hour' | 'day' = 'day',
    tenantContext?: TenantContext,
    dateRange?: { from: Date; to: Date }
  ): Promise<TokenUsageTimeSeries> {
    try {
      // Verify user owns the token
      const token = await this.apiTokenService.findByIdForUser(
        tokenId,
        userId,
        tenantContext
      );
      if (!token) {
        throw new Error('Token not found or access denied');
      }

      // Get time-series data
      const data = await this.tokenUsageRepository.getUsageTimeSeries(
        tokenId,
        period,
        tenantContext,
        dateRange
      );

      return {
        data,
        period,
      };
    } catch (error: any) {
      throw new Error(
        `Failed to get token usage time series: ${error.message}`
      );
    }
  }

  /**
   * Updates the last_used_at field on a token based on latest usage.
   * Called internally when new usage is logged.
   * @param tokenId - API token ID
   * @param tenantContext - Optional tenant context
   * @returns Promise<void>
   * @throws {Error} When update fails
   */
  async updateTokenLastUsed(
    tokenId: string,
    tenantContext?: TenantContext
  ): Promise<void> {
    try {
      // Find the most recent usage
      const lastUsage = await this.tokenUsageRepository.findLastUsage(
        tokenId,
        tenantContext
      );

      if (lastUsage) {
        // Update the token's last_used_at field
        await this.apiTokenService.updateLastUsedAt(
          tokenId,
          lastUsage.timestamp
        );
      }
    } catch (error: any) {
      // Log error but don't throw - this is a background operation
      console.error(`Failed to update token last used: ${error.message}`);
    }
  }

  /**
   * Logs a new token usage record.
   * Called by the monitoring middleware during API requests.
   * @param usageData - Token usage data to log
   * @returns Promise<TokenUsage>
   * @throws {Error} When logging fails
   */
  async logTokenUsage(usageData: {
    tokenId: string;
    endpoint: string;
    method: string;
    responseStatus: number;
    processingTime?: number;
    ipAddress?: string;
    userAgent?: string;
    tenantId?: string;
  }): Promise<TokenUsage> {
    try {
      const usage = await this.tokenUsageRepository.create(
        {
          token_id: usageData.tokenId,
          endpoint: usageData.endpoint.substring(0, 512),
          method: usageData.method.substring(0, 10),
          response_status: usageData.responseStatus,
          processing_time: usageData.processingTime,
          ip_address: usageData.ipAddress,
          user_agent: usageData.userAgent
            ? usageData.userAgent.substring(0, 1000)
            : null,
          timestamp: new Date(),
          created_at: new Date(),
        } as any,
        usageData.tenantId
          ? ({ id: usageData.tenantId } as TenantContext)
          : undefined
      );

      // Update token's last used timestamp in background
      setImmediate(() => {
        this.updateTokenLastUsed(
          usageData.tokenId,
          usageData.tenantId
            ? ({ id: usageData.tenantId } as TenantContext)
            : undefined
        );
      });

      return usage;
    } catch (error: any) {
      throw new Error(`Failed to log token usage: ${error.message}`);
    }
  }

  /**
   * Cleans up old usage records for maintenance.
   * Should be called periodically to prevent database bloat.
   * @param retentionDays - Number of days to retain usage records
   * @param tenantContext - Optional tenant context for cleanup
   * @returns Promise containing number of records deleted
   * @throws {Error} When cleanup fails
   */
  async cleanupOldUsage(
    retentionDays: number = 90,
    tenantContext?: TenantContext
  ): Promise<number> {
    try {
      return await this.tokenUsageRepository.cleanupOldUsage(
        retentionDays,
        tenantContext
      );
    } catch (error: any) {
      throw new Error(`Failed to cleanup old usage records: ${error.message}`);
    }
  }

  /**
   * Gets usage summary across all tokens for a user.
   * @param userId - User ID to get summary for
   * @param tenantContext - Optional tenant context
   * @param dateRange - Optional date range for summary
   * @returns Promise containing usage summary
   * @throws {Error} When query fails
   */
  async getUserUsageSummary(
    userId: string,
    tenantContext?: TenantContext,
    dateRange?: { from: Date; to: Date }
  ): Promise<{
    totalTokens: number;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    mostActiveToken: { id: string; name: string; requests: number } | null;
  }> {
    try {
      // Get all user's tokens
      const tokens = await this.apiTokenService.findByUserId(
        userId,
        tenantContext
      );

      if (tokens.length === 0) {
        return {
          totalTokens: 0,
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageResponseTime: 0,
          mostActiveToken: null,
        };
      }

      // Get stats for each token and aggregate
      let totalRequests = 0;
      let successfulRequests = 0;
      let failedRequests = 0;
      let totalResponseTime = 0;
      let mostActiveToken: {
        id: string;
        name: string;
        requests: number;
      } | null = null;
      let maxRequests = 0;

      for (const token of tokens) {
        const stats = await this.tokenUsageRepository.getUsageStats(
          token.id,
          tenantContext,
          dateRange
        );

        totalRequests += stats.totalRequests;
        successfulRequests += stats.successfulRequests;
        failedRequests += stats.failedRequests;
        totalResponseTime += stats.averageResponseTime * stats.totalRequests;

        if (stats.totalRequests > maxRequests) {
          maxRequests = stats.totalRequests;
          mostActiveToken = {
            id: token.id,
            name: token.name,
            requests: stats.totalRequests,
          };
        }
      }

      const averageResponseTime =
        totalRequests > 0 ? totalResponseTime / totalRequests : 0;

      return {
        totalTokens: tokens.length,
        totalRequests,
        successfulRequests,
        failedRequests,
        averageResponseTime,
        mostActiveToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to get user usage summary: ${error.message}`);
    }
  }
}
