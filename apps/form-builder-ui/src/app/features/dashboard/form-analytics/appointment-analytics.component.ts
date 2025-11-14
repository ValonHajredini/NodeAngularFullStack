/**
 * Appointment Analytics Component
 *
 * Displays services/appointment booking analytics with heatmap visualization.
 * Shows booking patterns across time slots and days with interactive heatmap.
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.8: Product, Appointment, and Restaurant Analytics Components (Frontend)
 *
 * @since 2025-01-27
 */

import { Component, ChangeDetectionStrategy, input, computed, signal } from '@angular/core';
import { CommonModule, DecimalPipe, PercentPipe } from '@angular/common';
import { AppointmentMetrics } from '@nodeangularfullstack/shared';
import { HorizontalBarChartComponent } from './charts/horizontal-bar-chart.component';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { Message } from 'primeng/message';

/**
 * Interface for heatmap cell data
 */
interface HeatmapCell {
  timeSlot: string;
  bookings: number;
  percentage: number;
  intensity: number; // 0-100 for color intensity
}

/**
 * Component for rendering appointment booking analytics.
 *
 * **Features:**
 * - Booking summary cards (total, cancelled, rate, avg per day)
 * - Interactive heatmap showing bookings by time slot
 * - Popular time slots horizontal bar chart
 * - Cancellation rate visualization
 * - Empty state handling when no bookings exist
 * - Responsive layout adapting to desktop/tablet/mobile
 * - WCAG AA accessibility compliance with keyboard navigation
 * - Data table alternative for heatmap accessibility
 *
 * **Data Flow:**
 * 1. Receives AppointmentMetrics via signal input
 * 2. Transforms popularTimeSlots → HeatmapCell[] for visualization
 * 3. Calculates color intensity based on booking counts
 * 4. Provides table alternative for screen readers
 *
 * **Accessibility:**
 * - ARIA labels for metric regions
 * - Keyboard navigation support via table view
 * - Screen reader announcements for booking data
 * - High contrast color scheme for heatmap
 * - Focus indicators on interactive elements
 *
 * @example Basic Usage
 * ```html
 * <app-appointment-analytics [metrics]="appointmentMetrics()" />
 * ```
 *
 * @example With Loading State
 * ```html
 * @if (isLoading()) {
 *   <div class="skeleton-loader"></div>
 * } @else if (categoryMetrics()?.category === 'services') {
 *   <app-appointment-analytics [metrics]="categoryMetrics() as AppointmentMetrics" />
 * }
 * ```
 */
@Component({
  selector: 'app-appointment-analytics',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    DecimalPipe,
    PercentPipe,
    HorizontalBarChartComponent,
    ButtonModule,
    TableModule,
    Message,
  ],
  template: `
    <div
      class="appointment-analytics-container"
      role="region"
      aria-label="Appointment booking analytics and time slot heatmap"
    >
      <!-- Summary Statistics -->
      <div class="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Total Bookings Card -->
        <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Total Bookings</p>
              <p class="text-2xl font-bold text-blue-600">{{ metrics().totalBookings | number }}</p>
              <p class="text-xs text-gray-500 mt-1">
                {{ metrics().totalSubmissions }} submissions
              </p>
            </div>
            <div
              class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center"
              aria-hidden="true"
            >
              <i class="pi pi-calendar text-blue-600 text-xl"></i>
            </div>
          </div>
        </div>

        <!-- Cancelled Bookings Card -->
        <div
          class="bg-white p-4 rounded-lg border shadow-sm"
          [class.border-red-300]="metrics().cancelledBookings > 0"
          [class.border-gray-200]="metrics().cancelledBookings === 0"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Cancelled</p>
              <p
                class="text-2xl font-bold"
                [class.text-red-600]="metrics().cancelledBookings > 0"
                [class.text-gray-400]="metrics().cancelledBookings === 0"
              >
                {{ metrics().cancelledBookings | number }}
              </p>
              <p class="text-xs text-gray-500 mt-1">
                {{ metrics().cancellationRate | number: '1.1-1' }}% rate
              </p>
            </div>
            <div
              class="w-12 h-12 rounded-lg flex items-center justify-center"
              [class.bg-red-100]="metrics().cancelledBookings > 0"
              [class.bg-gray-100]="metrics().cancelledBookings === 0"
              aria-hidden="true"
            >
              <i
                class="pi pi-times-circle text-xl"
                [class.text-red-600]="metrics().cancelledBookings > 0"
                [class.text-gray-400]="metrics().cancelledBookings === 0"
              ></i>
            </div>
          </div>
        </div>

        <!-- Average Bookings Per Day Card -->
        <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Avg Per Day</p>
              <p class="text-2xl font-bold text-green-600">
                {{ metrics().averageBookingsPerDay | number: '1.1-1' }}
              </p>
              <p class="text-xs text-gray-500 mt-1">daily average</p>
            </div>
            <div
              class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center"
              aria-hidden="true"
            >
              <i class="pi pi-chart-line text-green-600 text-xl"></i>
            </div>
          </div>
        </div>

        <!-- Capacity Utilization Card -->
        <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Capacity Usage</p>
              <p class="text-2xl font-bold text-purple-600">
                {{ metrics().capacityUtilization | number: '1.0-0' }}%
              </p>
              @if (metrics().peakBookingDay) {
                <p class="text-xs text-gray-500 mt-1">Peak: {{ metrics().peakBookingDay }}</p>
              }
            </div>
            <div
              class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center"
              aria-hidden="true"
            >
              <i class="pi pi-percentage text-purple-600 text-xl"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- Booking Heatmap Section -->
      @if (hasBookings()) {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <!-- Time Slot Heatmap -->
          <div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <i class="pi pi-clock text-blue-500" aria-hidden="true"></i>
                Booking Heatmap by Time Slot
              </h3>
              <button
                pButton
                type="button"
                [label]="showHeatmapTable() ? 'Show Heatmap' : 'Show Table'"
                [icon]="showHeatmapTable() ? 'pi pi-th-large' : 'pi pi-table'"
                class="p-button-sm p-button-text"
                (click)="toggleHeatmapTable()"
                [attr.aria-label]="
                  showHeatmapTable() ? 'Switch to heatmap view' : 'Switch to table view'
                "
              ></button>
            </div>

            @if (!showHeatmapTable()) {
              <!-- Heatmap Grid -->
              <div role="img" [attr.aria-label]="getHeatmapAriaLabel()">
                <div class="heatmap-grid space-y-2">
                  @for (cell of heatmapData(); track cell.timeSlot) {
                    <div
                      class="heatmap-cell p-3 rounded border border-gray-200 transition-all duration-200 cursor-help"
                      [style.background-color]="getHeatmapColor(cell.intensity)"
                      [attr.tabindex]="0"
                      [attr.aria-label]="
                        cell.timeSlot + ': ' + cell.bookings + ' bookings (' + cell.percentage.toFixed(1) + '%)'
                      "
                      role="gridcell"
                    >
                      <div class="flex items-center justify-between">
                        <span class="font-medium text-sm" [class.text-white]="cell.intensity > 60">{{
                          cell.timeSlot
                        }}</span>
                        <span
                          class="text-lg font-bold"
                          [class.text-white]="cell.intensity > 60"
                          [class.text-gray-700]="cell.intensity <= 60"
                          >{{ cell.bookings }}</span
                        >
                      </div>
                      <div class="text-xs mt-1" [class.text-gray-200]="cell.intensity > 60" [class.text-gray-500]="cell.intensity <= 60">
                        {{ cell.percentage | number: '1.1-1' }}% of total
                      </div>
                    </div>
                  }
                </div>
              </div>
            } @else {
              <!-- Data Table View -->
              <p-table
                [value]="heatmapData()"
                [tableStyle]="{ 'min-width': '100%' }"
                styleClass="p-datatable-sm"
              >
                <ng-template pTemplate="header">
                  <tr>
                    <th scope="col">Time Slot</th>
                    <th scope="col">Bookings</th>
                    <th scope="col">Percentage</th>
                  </tr>
                </ng-template>
                <ng-template pTemplate="body" let-cell>
                  <tr>
                    <td>{{ cell.timeSlot }}</td>
                    <td>{{ cell.bookings }}</td>
                    <td>{{ cell.percentage | number: '1.1-1' }}%</td>
                  </tr>
                </ng-template>
              </p-table>
            }
          </div>

          <!-- Popular Time Slots Chart -->
          <div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <i class="pi pi-star-fill text-yellow-500" aria-hidden="true"></i>
              Most Popular Time Slots
            </h3>
            <app-horizontal-bar-chart
              [title]="'Bookings by Time Slot'"
              [data]="popularTimeSlotsChartData()"
            ></app-horizontal-bar-chart>
          </div>
        </div>
      } @else {
        <!-- Empty State -->
        <div
          class="bg-white p-8 rounded-lg border border-gray-200 shadow-sm"
          role="status"
          aria-label="No appointment bookings yet"
        >
          <p-message
            severity="info"
            text="No appointment bookings have been recorded yet. Booking data will appear here once appointments are submitted."
            [closable]="false"
            styleClass="w-full"
          ></p-message>
        </div>
      }

      <!-- Screen Reader Summary -->
      <div class="sr-only" aria-live="polite" aria-atomic="true">
        Appointment analytics: {{ metrics().totalBookings }} total bookings,
        {{ metrics().cancelledBookings }} cancelled ({{ metrics().cancellationRate | number: '1.1-1' }}% rate).
        Average {{ metrics().averageBookingsPerDay | number: '1.1-1' }} bookings per day.
        Capacity utilization {{ metrics().capacityUtilization | number: '1.0-0' }}%.
      </div>
    </div>
  `,
  styles: [
    `
      .appointment-analytics-container {
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

      .heatmap-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 0.5rem;
        max-height: 400px;
        overflow-y: auto;
      }

      .heatmap-cell:hover {
        transform: scale(1.02);
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
      }

      .heatmap-cell:focus {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
      }

      /* Responsive adjustments for tablet */
      @media (min-width: 768px) and (max-width: 1024px) {
        .appointment-analytics-container :host ::ng-deep .chart-container {
          height: 350px;
        }
      }

      /* Responsive adjustments for mobile */
      @media (max-width: 767px) {
        .appointment-analytics-container :host ::ng-deep .chart-container {
          height: 400px;
        }

        .heatmap-grid {
          max-height: 300px;
        }
      }
    `,
  ],
})
export class AppointmentAnalyticsComponent {
  /** Appointment metrics data from backend API */
  metrics = input.required<AppointmentMetrics>();

  /** Toggle between heatmap and table view */
  showHeatmapTable = signal<boolean>(false);

  /**
   * Check if appointment bookings exist.
   * Used to conditionally render heatmap/charts vs. empty state.
   */
  hasBookings = computed(() => this.metrics().popularTimeSlots.length > 0);

  /**
   * Transform AppointmentMetrics.popularTimeSlots to heatmap cell data.
   * Calculates color intensity based on booking counts relative to max.
   *
   * **Transformation Logic:**
   * - Find max bookings to normalize intensity (0-100)
   * - Calculate percentage of total bookings for each time slot
   * - Sort by booking count descending (busiest times first)
   *
   * @returns Array of heatmap cell data with color intensity
   */
  heatmapData = computed((): HeatmapCell[] => {
    const { popularTimeSlots, totalBookings } = this.metrics();

    if (popularTimeSlots.length === 0) {
      return [];
    }

    const maxBookings = Math.max(...popularTimeSlots.map((slot) => slot.bookings));

    return popularTimeSlots
      .map((slot) => ({
        timeSlot: slot.timeSlot,
        bookings: slot.bookings,
        percentage: (slot.bookings / totalBookings) * 100,
        intensity: maxBookings > 0 ? (slot.bookings / maxBookings) * 100 : 0,
      }))
      .sort((a, b) => b.bookings - a.bookings); // Sort descending (busiest first)
  });

  /**
   * Transform popularTimeSlots to ChoiceDistribution format for horizontal bar chart.
   *
   * @returns Array of chart-ready distribution data
   */
  popularTimeSlotsChartData = computed(() => {
    const { popularTimeSlots, totalBookings } = this.metrics();

    return popularTimeSlots
      .map((slot) => ({
        label: slot.timeSlot,
        value: slot.timeSlot,
        count: slot.bookings,
        percentage: (slot.bookings / totalBookings) * 100,
      }))
      .sort((a, b) => b.count - a.count) // Sort descending (busiest first)
      .slice(0, 10); // Show top 10 time slots
  });

  /**
   * Get heatmap color based on intensity (0-100).
   * Uses blue color scale from light to dark for accessibility.
   *
   * @param intensity - Booking intensity percentage (0-100)
   * @returns CSS color value
   */
  getHeatmapColor(intensity: number): string {
    if (intensity === 0) return '#f3f4f6'; // gray-100
    if (intensity < 20) return '#dbeafe'; // blue-100
    if (intensity < 40) return '#bfdbfe'; // blue-200
    if (intensity < 60) return '#93c5fd'; // blue-300
    if (intensity < 80) return '#60a5fa'; // blue-400
    return '#3b82f6'; // blue-500
  }

  /**
   * Toggle between heatmap visual and data table view.
   */
  toggleHeatmapTable(): void {
    this.showHeatmapTable.update((current) => !current);
  }

  /**
   * Get accessible ARIA label for heatmap visualization.
   *
   * @returns Descriptive aria-label text
   */
  getHeatmapAriaLabel(): string {
    const { popularTimeSlots, totalBookings } = this.metrics();
    if (popularTimeSlots.length === 0) {
      return 'No booking data available';
    }
    const busiestSlot = popularTimeSlots.reduce((max, slot) =>
      slot.bookings > max.bookings ? slot : max,
    );
    return `Booking heatmap showing ${totalBookings} total bookings. Busiest time slot is ${busiestSlot.timeSlot} with ${busiestSlot.bookings} bookings.`;
  }
}
