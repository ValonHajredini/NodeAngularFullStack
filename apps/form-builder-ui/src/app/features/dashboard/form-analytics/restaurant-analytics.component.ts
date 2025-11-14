/**
 * Restaurant Analytics Component
 *
 * Displays restaurant/menu order analytics with item popularity visualization.
 * Shows revenue metrics, popular menu items, and order statistics.
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.8: Product, Appointment, and Restaurant Analytics Components (Frontend)
 *
 * @since 2025-01-27
 */

import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule, DecimalPipe, CurrencyPipe } from '@angular/common';
import { RestaurantMetrics, ChoiceDistribution } from '@nodeangularfullstack/shared';
import { HorizontalBarChartComponent } from './charts/horizontal-bar-chart.component';
import { Message } from 'primeng/message';

/**
 * Component for rendering restaurant/menu order analytics.
 *
 * **Features:**
 * - Revenue summary cards (total revenue, average order value, items ordered)
 * - Horizontal bar chart for popular menu items by quantity
 * - Revenue breakdown by item
 * - Peak order time display
 * - Average order size metric
 * - Empty state handling when no orders exist
 * - Responsive layout adapting to desktop/tablet/mobile
 * - WCAG AA accessibility compliance
 *
 * **Data Flow:**
 * 1. Receives RestaurantMetrics via signal input
 * 2. Transforms popularItems array → ChoiceDistribution[] for charts
 * 3. Passes formatted data to HorizontalBarChartComponent
 *
 * **Accessibility:**
 * - ARIA labels for metric regions
 * - Keyboard navigation support (inherited from chart components)
 * - Screen reader announcements for order and revenue data
 * - Semantic HTML with proper heading hierarchy
 *
 * @example Basic Usage
 * ```html
 * <app-restaurant-analytics [metrics]="restaurantMetrics()" />
 * ```
 *
 * @example With Loading State
 * ```html
 * @if (isLoading()) {
 *   <div class="skeleton-loader"></div>
 * } @else if (categoryMetrics()?.category === 'data_collection') {
 *   <app-restaurant-analytics [metrics]="categoryMetrics() as RestaurantMetrics" />
 * }
 * ```
 */
@Component({
  selector: 'app-restaurant-analytics',
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
      class="restaurant-analytics-container"
      role="region"
      aria-label="Restaurant order analytics and menu item popularity"
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
              <p class="text-xs text-gray-500 mt-1">per order</p>
            </div>
            <div
              class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center"
              aria-hidden="true"
            >
              <i class="pi pi-chart-line text-blue-600 text-xl"></i>
            </div>
          </div>
        </div>

        <!-- Total Items Ordered Card -->
        <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Items Ordered</p>
              <p class="text-2xl font-bold text-purple-600">
                {{ metrics().totalItemsOrdered | number }}
              </p>
              <p class="text-xs text-gray-500 mt-1">total items</p>
            </div>
            <div
              class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center"
              aria-hidden="true"
            >
              <i class="pi pi-shopping-cart text-purple-600 text-xl"></i>
            </div>
          </div>
        </div>

        <!-- Average Order Size Card -->
        <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Avg Order Size</p>
              <p class="text-2xl font-bold text-orange-600">
                {{ metrics().averageOrderSize | number: '1.1-1' }}
              </p>
              <p class="text-xs text-gray-500 mt-1">items per order</p>
              @if (metrics().peakOrderTime) {
                <p class="text-xs text-gray-500">Peak: {{ metrics().peakOrderTime }}</p>
              }
            </div>
            <div
              class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center"
              aria-hidden="true"
            >
              <i class="pi pi-box text-orange-600 text-xl"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- Popular Menu Items Section -->
      @if (hasItems()) {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Popular Items by Quantity Chart -->
          <div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <i class="pi pi-star-fill text-yellow-500" aria-hidden="true"></i>
              Most Popular Items (Quantity)
            </h3>
            <app-horizontal-bar-chart
              [title]="'Items Ordered'"
              [data]="quantityChartData()"
            ></app-horizontal-bar-chart>
          </div>

          <!-- Popular Items by Revenue Chart -->
          <div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <i class="pi pi-dollar text-green-500" aria-hidden="true"></i>
              Top Revenue Items
            </h3>
            <app-horizontal-bar-chart
              [title]="'Item Revenue'"
              [data]="revenueChartData()"
            ></app-horizontal-bar-chart>
          </div>
        </div>
      } @else {
        <!-- Empty State -->
        <div
          class="bg-white p-8 rounded-lg border border-gray-200 shadow-sm"
          role="status"
          aria-label="No restaurant orders yet"
        >
          <p-message
            severity="info"
            text="No menu orders have been received yet. Order data will appear here once customers submit their orders."
            [closable]="false"
            styleClass="w-full"
          ></p-message>
        </div>
      }

      <!-- Screen Reader Summary -->
      <div class="sr-only" aria-live="polite" aria-atomic="true">
        Restaurant analytics: Total revenue {{ metrics().totalRevenue | currency }} from
        {{ metrics().totalSubmissions }} orders. Average order value
        {{ metrics().averageOrderValue | currency }}. Total items ordered
        {{ metrics().totalItemsOrdered }}. Average order size
        {{ metrics().averageOrderSize | number: '1.1-1' }} items.
      </div>
    </div>
  `,
  styles: [
    `
      .restaurant-analytics-container {
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
        .restaurant-analytics-container :host ::ng-deep .chart-container {
          height: 350px;
        }
      }

      /* Responsive adjustments for mobile */
      @media (max-width: 767px) {
        .restaurant-analytics-container :host ::ng-deep .chart-container {
          height: 400px;
        }

        .restaurant-analytics-container .grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4 {
          grid-template-columns: repeat(1, minmax(0, 1fr));
        }
      }
    `,
  ],
})
export class RestaurantAnalyticsComponent {
  /** Restaurant metrics data from backend API */
  metrics = input.required<RestaurantMetrics>();

  /**
   * Check if menu items exist.
   * Used to conditionally render charts vs. empty state.
   */
  hasItems = computed(() => this.metrics().popularItems.length > 0);

  /**
   * Transform RestaurantMetrics.popularItems to quantity-based ChoiceDistribution for chart.
   * Maps item quantity data into horizontal bar chart format.
   *
   * **Transformation Logic:**
   * - Extract item name and quantity from popularItems array
   * - Calculate percentage of total items ordered
   * - Sort by quantity descending (most popular first)
   *
   * @returns Array of chart-ready distribution data with quantity values
   */
  quantityChartData = computed((): ChoiceDistribution[] => {
    const { popularItems, totalItemsOrdered } = this.metrics();

    return popularItems
      .map((item) => ({
        label: item.itemName,
        value: item.itemName,
        count: item.quantity,
        percentage: (item.quantity / totalItemsOrdered) * 100,
      }))
      .sort((a, b) => b.count - a.count) // Sort descending (most popular first)
      .slice(0, 10); // Show top 10 items
  });

  /**
   * Transform RestaurantMetrics.popularItems to revenue-based ChoiceDistribution for chart.
   * Maps item revenue data into horizontal bar chart format.
   *
   * **Transformation Logic:**
   * - Extract item name and revenue from popularItems array
   * - Convert revenue values to formatted labels
   * - Sort by revenue descending (highest revenue first)
   *
   * @returns Array of chart-ready distribution data with revenue values
   */
  revenueChartData = computed((): ChoiceDistribution[] => {
    const { popularItems, totalRevenue } = this.metrics();

    return popularItems
      .map((item) => ({
        label: item.itemName,
        value: item.itemName,
        count: Math.round(item.revenue), // Revenue as count for chart
        percentage: (item.revenue / totalRevenue) * 100,
      }))
      .sort((a, b) => b.count - a.count) // Sort descending (highest revenue first)
      .slice(0, 10); // Show top 10 items
  });
}
