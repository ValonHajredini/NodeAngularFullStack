/**
 * Restaurant Analytics Strategy
 *
 * Computes restaurant/menu order metrics: item popularity, revenue, order patterns.
 * Implements IAnalyticsStrategy for DATA_COLLECTION category.
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.4: Product, Appointment, and Restaurant Analytics Strategies (Backend)
 *
 * @since 2025-01-27
 */

import { RestaurantMetrics } from '@nodeangularfullstack/shared';
import { AnalyticsRepository } from '../../../repositories/analytics.repository';
import { IAnalyticsStrategy } from './analytics-strategy.interface';

/**
 * Analytics strategy for restaurant/menu order templates.
 *
 * Computes:
 * - Total revenue and average order value
 * - Total items ordered across all orders
 * - Popular menu items ranked by quantity and revenue
 * - Peak order time (busiest hour)
 * - Average order size (items per order)
 *
 * Data Requirements:
 * - Submission JSONB must contain: item_name, quantity, item_price, total_price
 * - Optional: order_time for peak hour analysis
 * - Revenue calculated from total_price field
 *
 * Performance:
 * - Uses GIN indexes on JSONB columns
 * - Single aggregation query with json_agg for item breakdown
 * - Target: <300ms for datasets with 10,000+ submissions
 *
 * @example
 * ```typescript
 * const strategy = new RestaurantAnalyticsStrategy(analyticsRepository);
 * const metrics = await strategy.buildMetrics(formSchemaId, tenantId);
 * console.log(`Total revenue: $${metrics.totalRevenue}`);
 * console.log(`Top item: ${metrics.popularItems[0].itemName}`);
 * ```
 */
export class RestaurantAnalyticsStrategy implements IAnalyticsStrategy {
  constructor(private readonly repository: AnalyticsRepository) {}

  /**
   * Checks if this strategy supports the given category.
   *
   * @param category - Template category to check
   * @returns True if category is 'data_collection' or 'DATA_COLLECTION'
   */
  supports(category: string | null): boolean {
    return category?.toLowerCase() === 'data_collection';
  }

  /**
   * Detects if the form has required restaurant order fields.
   *
   * Checks a sample submission for the presence of required fields:
   * - item_name: Menu item name
   * - quantity: Number of items ordered
   * - price: Item price
   *
   * @param formSchemaId - UUID of the form schema to check
   * @param tenantId - Optional tenant ID for isolation
   * @returns Object with detection results and missing field information
   * @private
   */
  private async detectRequiredFields(
    formSchemaId: string,
    tenantId: string | null
  ): Promise<{ hasRequiredFields: boolean; missing: string[] }> {
    const requiredFields = ['item_name', 'quantity', 'price'];
    const submissions = await this.repository.getAllSubmissionValues(formSchemaId, tenantId);

    if (submissions.length === 0) {
      return { hasRequiredFields: false, missing: [] };
    }

    // Check first submission for required fields
    const sampleSubmission = submissions[0];
    const missing: string[] = [];

    for (const field of requiredFields) {
      if (!(field in sampleSubmission) || sampleSubmission[field] === null || sampleSubmission[field] === undefined) {
        missing.push(field);
      }
    }

    return {
      hasRequiredFields: missing.length === 0,
      missing
    };
  }

  /**
   * Builds restaurant analytics metrics from form submissions.
   *
   * Process:
   * 1. Fetch submission counts and time range
   * 2. Detect if form has required restaurant order fields
   * 3. If missing fields, return empty metrics with helpful message
   * 4. Aggregate menu item sales data (revenue, quantities, item breakdown)
   * 5. Calculate average order value and average order size
   * 6. Rank popular items by quantity sold
   * 7. Determine peak order time from submission timestamps
   *
   * @param formSchemaId - UUID of the form schema to analyze
   * @param tenantId - Optional tenant ID for isolation
   * @returns Promise containing strongly-typed RestaurantMetrics
   * @throws {Error} When database queries fail
   */
  async buildMetrics(formSchemaId: string, tenantId: string | null): Promise<RestaurantMetrics> {
    try {
      // Fetch base submission counts
      const counts = await this.repository.getSubmissionCounts(formSchemaId, tenantId);

      // Handle zero submissions case
      if (counts.totalSubmissions === 0) {
        return {
          category: 'data_collection',
          totalSubmissions: 0,
          totalRevenue: 0,
          averageOrderValue: 0,
          totalItemsOrdered: 0,
          popularItems: [],
          peakOrderTime: undefined,
          averageOrderSize: 0,
        };
      }

      // Detect if form has required restaurant fields
      const fieldDetection = await this.detectRequiredFields(formSchemaId, tenantId);

      // If form doesn't have restaurant order fields, return empty metrics with helpful message
      if (!fieldDetection.hasRequiredFields) {
        return {
          category: 'data_collection',
          totalSubmissions: counts.totalSubmissions,
          totalRevenue: 0,
          averageOrderValue: 0,
          totalItemsOrdered: 0,
          popularItems: [],
          peakOrderTime: undefined,
          averageOrderSize: 0,
          firstSubmissionAt: counts.firstSubmissionAt ?? undefined,
          lastSubmissionAt: counts.lastSubmissionAt ?? undefined,
          missingFields: {
            hasRequiredFields: false,
            missing: fieldDetection.missing,
            message: `This form does not contain restaurant order fields (${fieldDetection.missing.join(', ')}). Restaurant analytics require forms with item_name, quantity, and price fields. Consider using a different template category for this type of data collection.`
          }
        };
      }

      // Fetch restaurant item popularity
      const itemData = await this.repository.getRestaurantItemPopularity(formSchemaId, tenantId);

      // Calculate average order value
      const averageOrderValue =
        counts.totalSubmissions > 0
          ? Math.round((itemData.totalRevenue / counts.totalSubmissions) * 100) / 100
          : 0;

      // Calculate average order size (items per order)
      const averageOrderSize =
        counts.totalSubmissions > 0
          ? Math.round((itemData.totalItemsOrdered / counts.totalSubmissions) * 100) / 100
          : 0;

      // Group items by name and aggregate quantities/revenue
      const itemMap = new Map<string, { itemName: string; quantity: number; revenue: number }>();

      itemData.itemBreakdown.forEach((item) => {
        if (!item.itemName) return;

        const existing = itemMap.get(item.itemName);
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += item.revenue;
        } else {
          itemMap.set(item.itemName, {
            itemName: item.itemName,
            quantity: item.quantity,
            revenue: Math.round(item.revenue * 100) / 100,
          });
        }
      });

      // Sort items by quantity descending and take top 10
      const popularItems = Array.from(itemMap.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);

      // Determine peak order time by analyzing submission timestamps
      const submissions = await this.repository.getAllSubmissionValues(formSchemaId, tenantId);
      const peakOrderTime = this.calculatePeakOrderTime(submissions);

      // Return strongly-typed RestaurantMetrics
      const metrics: RestaurantMetrics = {
        category: 'data_collection',
        totalSubmissions: counts.totalSubmissions,
        totalRevenue: Math.round(itemData.totalRevenue * 100) / 100,
        averageOrderValue,
        totalItemsOrdered: itemData.totalItemsOrdered,
        popularItems,
        peakOrderTime,
        averageOrderSize,
        firstSubmissionAt: counts.firstSubmissionAt ?? undefined,
        lastSubmissionAt: counts.lastSubmissionAt ?? undefined,
      };

      return metrics;
    } catch (error: any) {
      throw new Error(
        `[RestaurantAnalyticsStrategy] Failed to build metrics for form ${formSchemaId}: ${error.message}`
      );
    }
  }

  /**
   * Calculates peak order time by grouping submissions into hourly buckets.
   * Returns the hour range with the most orders.
   *
   * @param submissions - Array of submission value objects
   * @returns Peak hour range string (e.g., '12:00-13:00') or undefined
   * @private
   */
  private calculatePeakOrderTime(submissions: any[]): string | undefined {
    if (submissions.length === 0) return undefined;

    // Group by hour of day
    const hourMap = new Map<number, number>();

    submissions.forEach((sub) => {
      // Try to get order_time from submission, or use submitted_at timestamp
      const timeStr = sub.order_time || sub.submitted_at;
      if (!timeStr) return;

      try {
        const date = new Date(timeStr);
        const hour = date.getHours();
        hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
      } catch {
        // Skip invalid timestamps
      }
    });

    // Find hour with max orders
    let peakHour = 0;
    let maxOrders = 0;

    hourMap.forEach((orders, hour) => {
      if (orders > maxOrders) {
        maxOrders = orders;
        peakHour = hour;
      }
    });

    // Format as time range (e.g., '12:00-13:00')
    const startHour = peakHour.toString().padStart(2, '0');
    const endHour = ((peakHour + 1) % 24).toString().padStart(2, '0');
    return `${startHour}:00-${endHour}:00`;
  }
}
