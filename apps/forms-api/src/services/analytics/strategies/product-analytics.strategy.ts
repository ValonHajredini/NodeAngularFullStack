/**
 * Product Analytics Strategy
 *
 * Computes e-commerce/product sales metrics: revenue, order totals, product popularity.
 * Implements IAnalyticsStrategy for ECOMMERCE category.
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.4: Product, Appointment, and Restaurant Analytics Strategies (Backend)
 *
 * @since 2025-01-27
 */

import { ProductMetrics } from '@nodeangularfullstack/shared';
import { AnalyticsRepository } from '../../../repositories/analytics.repository';
import { IAnalyticsStrategy } from './analytics-strategy.interface';

/**
 * Analytics strategy for product/e-commerce templates.
 *
 * Computes:
 * - Total revenue and average order value
 * - Total items sold
 * - Top-selling products ranked by quantity and revenue
 * - Low stock and out-of-stock alerts (placeholder for future inventory integration)
 *
 * Data Requirements:
 * - Submission JSONB must contain: quantity, price, product_id, product_name
 * - Revenue = quantity * price per submission
 * - Aggregates across all submissions for the form
 *
 * Performance:
 * - Uses GIN indexes on JSONB columns
 * - Single aggregation query with json_agg for product breakdown
 * - Target: <300ms for datasets with 10,000+ submissions
 *
 * @example
 * ```typescript
 * const strategy = new ProductAnalyticsStrategy(analyticsRepository);
 * const metrics = await strategy.buildMetrics(formSchemaId, tenantId);
 * console.log(`Total revenue: $${metrics.totalRevenue}`);
 * console.log(`Top product: ${metrics.topProducts[0].name}`);
 * ```
 */
export class ProductAnalyticsStrategy implements IAnalyticsStrategy {
  constructor(private readonly repository: AnalyticsRepository) {}

  /**
   * Checks if this strategy supports the given category.
   *
   * @param category - Template category to check
   * @returns True if category is 'ecommerce' or 'ECOMMERCE'
   */
  supports(category: string | null): boolean {
    return category?.toLowerCase() === 'ecommerce';
  }

  /**
   * Detects if the form has required product/ecommerce fields.
   *
   * Checks a sample submission for the presence of required fields:
   * - product_id: Product identifier
   * - product_name: Product name
   * - quantity: Number of items
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
    const requiredFields = ['product_id', 'product_name', 'quantity', 'price'];
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
   * Builds product analytics metrics from form submissions.
   *
   * Process:
   * 1. Fetch submission counts and time range
   * 2. Detect if form has required product fields
   * 3. If missing fields, return empty metrics with helpful message
   * 4. Aggregate product sales data (revenue, quantities, product breakdown)
   * 5. Calculate average order value
   * 6. Sort and rank top products by revenue
   * 7. Compute stock alerts (placeholder - requires inventory table)
   *
   * @param formSchemaId - UUID of the form schema to analyze
   * @param tenantId - Optional tenant ID for isolation
   * @returns Promise containing strongly-typed ProductMetrics
   * @throws {Error} When database queries fail
   */
  async buildMetrics(formSchemaId: string, tenantId: string | null): Promise<ProductMetrics> {
    try {
      // Fetch base submission counts
      const counts = await this.repository.getSubmissionCounts(formSchemaId, tenantId);

      // Handle zero submissions case
      if (counts.totalSubmissions === 0) {
        return {
          category: 'ecommerce',
          totalSubmissions: 0,
          totalRevenue: 0,
          averageOrderValue: 0,
          totalItemsSold: 0,
          topProducts: [],
          lowStockAlerts: 0,
          outOfStockCount: 0,
          inventoryValue: 0,
        };
      }

      // Detect if form has required product fields
      const fieldDetection = await this.detectRequiredFields(formSchemaId, tenantId);

      // If form doesn't have product fields, return empty metrics with helpful message
      if (!fieldDetection.hasRequiredFields) {
        return {
          category: 'ecommerce',
          totalSubmissions: counts.totalSubmissions,
          totalRevenue: 0,
          averageOrderValue: 0,
          totalItemsSold: 0,
          topProducts: [],
          lowStockAlerts: 0,
          outOfStockCount: 0,
          inventoryValue: 0,
          firstSubmissionAt: counts.firstSubmissionAt ?? undefined,
          lastSubmissionAt: counts.lastSubmissionAt ?? undefined,
          missingFields: {
            hasRequiredFields: false,
            missing: fieldDetection.missing,
            message: `This form does not contain product/ecommerce fields (${fieldDetection.missing.join(', ')}). Product analytics require forms with product_id, product_name, quantity, and price fields. Consider using a different template category for this type of data collection.`
          }
        };
      }

      // Fetch product sales aggregation
      const salesData = await this.repository.getProductSalesData(formSchemaId, tenantId);

      // Calculate average order value
      const averageOrderValue =
        counts.totalSubmissions > 0
          ? Math.round((salesData.totalRevenue / counts.totalSubmissions) * 100) / 100
          : 0;

      // Group products by ID and aggregate quantities/revenue
      const productMap = new Map<
        string,
        { productId: string; name: string; quantity: number; revenue: number }
      >();

      salesData.productBreakdown.forEach((item) => {
        if (!item.productId) return;

        const existing = productMap.get(item.productId);
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += item.revenue;
        } else {
          productMap.set(item.productId, {
            productId: item.productId,
            name: item.name || 'Unknown Product',
            quantity: item.quantity,
            revenue: Math.round(item.revenue * 100) / 100,
          });
        }
      });

      // Sort products by revenue descending and take top 10
      const topProducts = Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Stock alerts (placeholder - would require product_inventory table join)
      // For now, return 0 since we don't have inventory data
      const lowStockAlerts = 0;
      const outOfStockCount = 0;
      const inventoryValue = 0;

      // Return strongly-typed ProductMetrics
      const metrics: ProductMetrics = {
        category: 'ecommerce',
        totalSubmissions: counts.totalSubmissions,
        totalRevenue: Math.round(salesData.totalRevenue * 100) / 100,
        averageOrderValue,
        totalItemsSold: salesData.totalItemsSold,
        topProducts,
        lowStockAlerts,
        outOfStockCount,
        inventoryValue,
        firstSubmissionAt: counts.firstSubmissionAt ?? undefined,
        lastSubmissionAt: counts.lastSubmissionAt ?? undefined,
      };

      return metrics;
    } catch (error: any) {
      throw new Error(
        `[ProductAnalyticsStrategy] Failed to build metrics for form ${formSchemaId}: ${error.message}`
      );
    }
  }
}
