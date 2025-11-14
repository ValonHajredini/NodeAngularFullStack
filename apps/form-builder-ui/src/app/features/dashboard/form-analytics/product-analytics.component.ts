/**
 * Product Analytics Component
 *
 * Displays ecommerce product sales analytics with revenue visualizations.
 * Uses multi-series bar charts to show top selling products, revenue trends,
 * and inventory metrics.
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.8: Product, Appointment, and Restaurant Analytics Components (Frontend)
 *
 * @since 2025-01-27
 */

import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule, DecimalPipe, CurrencyPipe } from '@angular/common';
import { ProductMetrics, ChoiceDistribution } from '@nodeangularfullstack/shared';
import { HorizontalBarChartComponent } from './charts/horizontal-bar-chart.component';
import { Message } from 'primeng/message';

/**
 * Component for rendering ecommerce product analytics.
 *
 * **Features:**
 * - Revenue summary cards (total revenue, average order value, items sold)
 * - Horizontal bar chart for top selling products by revenue
 * - Low stock alerts display
 * - Empty state handling when no sales exist
 * - Responsive layout adapting to desktop/tablet/mobile
 * - WCAG AA accessibility compliance
 *
 * **Data Flow:**
 * 1. Receives ProductMetrics via signal input
 * 2. Transforms topProducts array → ChoiceDistribution[] for charts
 * 3. Passes formatted data to HorizontalBarChartComponent/BarChartComponent
 *
 * **Accessibility:**
 * - ARIA labels for metric regions
 * - Keyboard navigation support (inherited from chart components)
 * - Screen reader announcements for revenue and sales data
 * - Semantic HTML with proper heading hierarchy
 *
 * @example Basic Usage
 * ```html
 * <app-product-analytics [metrics]="productMetrics()" />
 * ```
 *
 * @example With Loading State
 * ```html
 * @if (isLoading()) {
 *   <div class="skeleton-loader"></div>
 * } @else if (categoryMetrics()?.category === 'ecommerce') {
 *   <app-product-analytics [metrics]="categoryMetrics() as ProductMetrics" />
 * }
 * ```
 */
@Component({
  selector: 'app-product-analytics',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    DecimalPipe,
    CurrencyPipe,
    HorizontalBarChartComponent,
    Message,
  ],
  template: `
    <div
      class="product-analytics-container"
      role="region"
      aria-label="Product sales analytics and revenue metrics"
    >
      <!-- Summary Statistics -->
      <div class="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Total Revenue Card -->
        <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Total Revenue</p>
              <p class="text-2xl font-bold text-green-600">
                {{ metrics().totalRevenue | currency }}
              </p>
              <p class="text-xs text-gray-500 mt-1">
                {{ metrics().totalSubmissions }} orders
              </p>
            </div>
            <div
              class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center"
              aria-hidden="true"
            >
              <i class="pi pi-dollar text-green-600 text-xl"></i>
            </div>
          </div>
        </div>

        <!-- Average Order Value Card -->
        <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Avg Order Value</p>
              <p class="text-2xl font-bold text-blue-600">
                {{ metrics().averageOrderValue | currency }}
              </p>
              <p class="text-xs text-gray-500 mt-1">per transaction</p>
            </div>
            <div
              class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center"
              aria-hidden="true"
            >
              <i class="pi pi-chart-line text-blue-600 text-xl"></i>
            </div>
          </div>
        </div>

        <!-- Total Items Sold Card -->
        <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Items Sold</p>
              <p class="text-2xl font-bold text-purple-600">
                {{ metrics().totalItemsSold | number }}
              </p>
              <p class="text-xs text-gray-500 mt-1">total units</p>
            </div>
            <div
              class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center"
              aria-hidden="true"
            >
              <i class="pi pi-box text-purple-600 text-xl"></i>
            </div>
          </div>
        </div>

        <!-- Low Stock Alerts Card -->
        <div
          class="bg-white p-4 rounded-lg border shadow-sm"
          [class.border-orange-300]="metrics().lowStockAlerts > 0"
          [class.border-gray-200]="metrics().lowStockAlerts === 0"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Low Stock Alerts</p>
              <p
                class="text-2xl font-bold"
                [class.text-orange-600]="metrics().lowStockAlerts > 0"
                [class.text-gray-400]="metrics().lowStockAlerts === 0"
              >
                {{ metrics().lowStockAlerts | number }}
              </p>
              <p class="text-xs text-gray-500 mt-1">items need restock</p>
            </div>
            <div
              class="w-12 h-12 rounded-lg flex items-center justify-center"
              [class.bg-orange-100]="metrics().lowStockAlerts > 0"
              [class.bg-gray-100]="metrics().lowStockAlerts === 0"
              aria-hidden="true"
            >
              <i
                class="pi pi-exclamation-triangle text-xl"
                [class.text-orange-600]="metrics().lowStockAlerts > 0"
                [class.text-gray-400]="metrics().lowStockAlerts === 0"
              ></i>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Selling Products Section -->
      @if (hasProducts()) {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Top Products by Revenue Chart -->
          <div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <i class="pi pi-star-fill text-yellow-500" aria-hidden="true"></i>
              Top Selling Products (Revenue)
            </h3>
            <app-horizontal-bar-chart
              [title]="'Product Revenue'"
              [data]="revenueChartData()"
            ></app-horizontal-bar-chart>
          </div>

          <!-- Top Products by Quantity Chart -->
          <div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <i class="pi pi-box text-purple-500" aria-hidden="true"></i>
              Top Selling Products (Quantity)
            </h3>
            <app-horizontal-bar-chart
              [title]="'Units Sold'"
              [data]="quantityChartData()"
            ></app-horizontal-bar-chart>
          </div>
        </div>
      } @else {
        <!-- Empty State -->
        <div
          class="bg-white p-8 rounded-lg border border-gray-200 shadow-sm"
          role="status"
          aria-label="No product sales yet"
        >
          <p-message
            severity="info"
            text="No product sales have been recorded yet. Sales data will appear here once orders are submitted."
            [closable]="false"
            styleClass="w-full"
          ></p-message>
        </div>
      }

      <!-- Screen Reader Summary -->
      <div class="sr-only" aria-live="polite" aria-atomic="true">
        Product analytics: Total revenue {{ metrics().totalRevenue | currency }} from
        {{ metrics().totalSubmissions }} orders. Average order value
        {{ metrics().averageOrderValue | currency }}. Total items sold
        {{ metrics().totalItemsSold }}. Low stock alerts {{ metrics().lowStockAlerts }}.
      </div>
    </div>
  `,
  styles: [
    `
      .product-analytics-container {
        width: 100%;
      }

      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
      }

      /* Responsive adjustments for tablet */
      @media (min-width: 768px) and (max-width: 1024px) {
        .product-analytics-container :host ::ng-deep .chart-container {
          height: 350px;
        }
      }

      /* Responsive adjustments for mobile */
      @media (max-width: 767px) {
        .product-analytics-container :host ::ng-deep .chart-container {
          height: 400px;
        }

        .product-analytics-container .grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4 {
          grid-template-columns: repeat(1, minmax(0, 1fr));
        }
      }
    `,
  ],
})
export class ProductAnalyticsComponent {
  /** Product metrics data from backend API */
  metrics = input.required<ProductMetrics>();

  /**
   * Check if product sales exist.
   * Used to conditionally render charts vs. empty state.
   */
  hasProducts = computed(() => this.metrics().topProducts.length > 0);

  /**
   * Transform ProductMetrics.topProducts to revenue-based ChoiceDistribution for chart.
   * Maps product revenue data into horizontal bar chart format.
   *
   * **Transformation Logic:**
   * - Extract product name and revenue from topProducts array
   * - Convert revenue values to formatted labels
   * - Sort by revenue descending (highest revenue first)
   *
   * @returns Array of chart-ready distribution data with revenue values
   */
  revenueChartData = computed((): ChoiceDistribution[] => {
    const { topProducts } = this.metrics();

    return topProducts
      .map((product) => ({
        label: product.name,
        value: product.name,
        count: Math.round(product.revenue), // Revenue as count for chart
        percentage: (product.revenue / this.metrics().totalRevenue) * 100,
      }))
      .sort((a, b) => b.count - a.count) // Sort descending (highest revenue first)
      .slice(0, 10); // Show top 10 products
  });

  /**
   * Transform ProductMetrics.topProducts to quantity-based ChoiceDistribution for chart.
   * Maps product quantity data into horizontal bar chart format.
   *
   * **Transformation Logic:**
   * - Extract product name and quantity from topProducts array
   * - Calculate percentage of total items sold
   * - Sort by quantity descending (highest quantity first)
   *
   * @returns Array of chart-ready distribution data with quantity values
   */
  quantityChartData = computed((): ChoiceDistribution[] => {
    const { topProducts, totalItemsSold } = this.metrics();

    return topProducts
      .map((product) => ({
        label: product.name,
        value: product.name,
        count: product.quantity,
        percentage: (product.quantity / totalItemsSold) * 100,
      }))
      .sort((a, b) => b.count - a.count) // Sort descending (highest quantity first)
      .slice(0, 10); // Show top 10 products
  });
}
