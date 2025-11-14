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

import { Component, ChangeDetectionStrategy, input, computed, signal, inject, effect } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { AppointmentMetrics } from '@nodeangularfullstack/shared';
import { HorizontalBarChartComponent } from './charts/horizontal-bar-chart.component';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { Message } from 'primeng/message';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { CalendarModule, CalendarEvent, CalendarView, DateAdapter, CalendarUtils, CalendarDateFormatter, CalendarEventTitleFormatter, CalendarA11y, CalendarEventTimesChangedEventType } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';
import { HttpClient } from '@angular/common/http';

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
 * Interface for appointment submission
 */
interface AppointmentSubmission {
  id: string;
  formSchemaId: string;
  valuesJson: {
    booking_date: string;
    time_slot: string;
    service_type: string;
    customer_name: string;
    customer_email: string;
  };
  submittedAt: string;
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
    HorizontalBarChartComponent,
    ButtonModule,
    TableModule,
    Message,
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    CalendarModule,
  ],
  providers: [
    {
      provide: DateAdapter,
      useFactory: adapterFactory,
    },
    CalendarUtils,
    CalendarDateFormatter,
    CalendarEventTitleFormatter,
    CalendarA11y,
  ],
  template: `
    <div
      class="appointment-analytics-container"
      role="region"
      aria-label="Appointment booking analytics and time slot heatmap"
    >
      <!-- Summary Statistics -->
      <div class="mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      <!-- Tabs Section -->
      <p-tabs [(value)]="activeTab" styleClass="appointment-analytics-tabs">
        <p-tablist>
          <p-tab value="0">Analytics</p-tab>
          <p-tab value="1">Calendar</p-tab>
        </p-tablist>

        <p-tabpanels>
          <!-- Tab 1: Analytics (Heatmap & Charts) -->
          <p-tabpanel value="0">
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
          </p-tabpanel>

          <!-- Tab 2: Calendar View -->
          <p-tabpanel value="1">
            <div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <!-- Calendar Controls -->
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2">
                  <h3 class="text-lg font-semibold text-gray-900">Appointments Calendar</h3>
                </div>
                <div class="flex items-center gap-2">
                  <!-- View Buttons -->
                  <button
                    pButton
                    type="button"
                    label="Month"
                    [class]="calendarView() === 'month' ? 'p-button-sm' : 'p-button-sm p-button-outlined'"
                    (click)="setCalendarView('month')"
                  ></button>
                  <button
                    pButton
                    type="button"
                    label="Week"
                    [class]="calendarView() === 'week' ? 'p-button-sm' : 'p-button-sm p-button-outlined'"
                    (click)="setCalendarView('week')"
                  ></button>
                  <button
                    pButton
                    type="button"
                    label="Day"
                    [class]="calendarView() === 'day' ? 'p-button-sm' : 'p-button-sm p-button-outlined'"
                    (click)="setCalendarView('day')"
                  ></button>
                </div>
              </div>

              <!-- Calendar Navigation -->
              <div class="flex items-center justify-between mb-4">
                <button
                  pButton
                  type="button"
                  icon="pi pi-chevron-left"
                  class="p-button-text"
                  (click)="previousPeriod()"
                  aria-label="Previous period"
                ></button>
                <h4 class="text-md font-semibold text-gray-700">{{ viewDateTitle() }}</h4>
                <button
                  pButton
                  type="button"
                  icon="pi pi-chevron-right"
                  class="p-button-text"
                  (click)="nextPeriod()"
                  aria-label="Next period"
                ></button>
              </div>

              <!-- Calendar Component -->
              <div class="calendar-container">
                @switch (calendarView()) {
                  @case ('month') {
                    <mwl-calendar-month-view
                      [viewDate]="viewDate()"
                      [events]="calendarEvents()"
                      [locale]="'en'"
                      [weekStartsOn]="1"
                    ></mwl-calendar-month-view>
                  }
                  @case ('week') {
                    <mwl-calendar-week-view
                      [viewDate]="viewDate()"
                      [events]="calendarEvents()"
                      [locale]="'en'"
                      [weekStartsOn]="1"
                    ></mwl-calendar-week-view>
                  }
                  @case ('day') {
                    <mwl-calendar-day-view
                      [viewDate]="viewDate()"
                      [events]="calendarEvents()"
                      [locale]="'en'"
                    ></mwl-calendar-day-view>
                  }
                }
              </div>
            </div>
          </p-tabpanel>
        </p-tabpanels>
      </p-tabs>

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

      /* Calendar styles */
      .calendar-container {
        min-height: 600px;
      }

      /* Override angular-calendar default styles to match design system */
      :host ::ng-deep .cal-month-view {
        .cal-header {
          background-color: #f3f4f6;
          padding: 8px 0;

          .cal-cell {
            font-weight: 600;
            color: #374151;
            font-size: 0.875rem;
          }
        }

        .cal-days {
          border-left: 1px solid #e5e7eb;
          border-right: 1px solid #e5e7eb;

          .cal-cell {
            border: 1px solid #e5e7eb;
            min-height: 100px;

            &:hover {
              background-color: #f9fafb;
            }
          }

          .cal-day-number {
            font-size: 0.875rem;
            color: #6b7280;
            margin: 4px;
          }

          .cal-out-month .cal-day-number {
            opacity: 0.3;
          }

          .cal-today {
            background-color: #eff6ff !important;

            .cal-day-number {
              color: #3b82f6;
              font-weight: 600;
            }
          }
        }

        .cal-event {
          font-size: 0.75rem;
          padding: 2px 4px;
          margin: 2px;
          border-radius: 4px;
          cursor: pointer;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }

      :host ::ng-deep .cal-week-view,
      :host ::ng-deep .cal-day-view {
        .cal-header {
          background-color: #f3f4f6;
          border-bottom: 1px solid #e5e7eb;

          .cal-header-cell {
            padding: 8px;
            font-weight: 600;
            color: #374151;
          }
        }

        .cal-time {
          color: #6b7280;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .cal-hour-segment {
          border-bottom: 1px solid #f3f4f6;

          &:hover {
            background-color: #f9fafb;
          }
        }

        .cal-event {
          border-radius: 4px;
          padding: 4px;
          font-size: 0.875rem;
          cursor: pointer;

          &:hover {
            opacity: 0.9;
          }
        }

        .cal-today {
          background-color: #eff6ff;
        }
      }
    `,
  ],
})
export class AppointmentAnalyticsComponent {
  private http = inject(HttpClient);

  /** Appointment metrics data from backend API */
  metrics = input.required<AppointmentMetrics>();

  /** Form schema ID for fetching appointment submissions */
  formSchemaId = input.required<string>();

  /** Active tab index */
  activeTab = signal<string>('0');

  /** Toggle between heatmap and table view */
  showHeatmapTable = signal<boolean>(false);

  /** Calendar view type */
  calendarView = signal<'month' | 'week' | 'day'>('month');

  /** Current calendar view date */
  viewDate = signal<Date>(new Date());

  /** Calendar events (appointments) */
  appointments = signal<AppointmentSubmission[]>([]);

  /** CalendarView enum for template */
  CalendarView = CalendarView;

  constructor() {
    // Fetch appointments when component initializes or formSchemaId changes
    effect(() => {
      const schemaId = this.formSchemaId();
      if (!schemaId) return;

      this.http.get<{ submissions: AppointmentSubmission[] }>(
        `/api/forms/${schemaId}/submissions`
      ).subscribe({
        next: (response) => {
          this.appointments.set(response.submissions);
        },
        error: (error) => {
          console.error('Failed to fetch appointments:', error);
          this.appointments.set([]);
        }
      });
    }, { allowSignalWrites: true });
  }

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

  /**
   * Computed signal for calendar view date title.
   * Formats the current view date based on the calendar view type.
   */
  viewDateTitle = computed(() => {
    const date = this.viewDate();
    const view = this.calendarView();

    if (view === 'month') {
      return format(date, 'MMMM yyyy');
    } else if (view === 'week') {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
    } else {
      return format(date, 'MMMM d, yyyy');
    }
  });

  /**
   * Transform appointments to calendar events with color coding by service type.
   */
  calendarEvents = computed((): CalendarEvent[] => {
    return this.appointments().map((appointment) => {
      const { booking_date, time_slot, service_type, customer_name } = appointment.valuesJson;

      // Parse date and time
      const [hours, minutes] = time_slot.split(':').map(Number);
      const startDate = new Date(booking_date);
      startDate.setHours(hours, minutes, 0, 0);

      const endDate = new Date(startDate);
      endDate.setHours(hours + 1, minutes, 0, 0); // 1-hour appointments

      return {
        title: `${customer_name} - ${this.getServiceLabel(service_type)}`,
        start: startDate,
        end: endDate,
        color: this.getServiceColor(service_type),
        meta: appointment,
      };
    });
  });

  /**
   * Get human-readable label for service type.
   */
  private getServiceLabel(serviceType: string): string {
    const labels: Record<string, string> = {
      general: 'General Consultation',
      technical: 'Technical Review',
      strategy: 'Strategy Session',
    };
    return labels[serviceType] || serviceType;
  }

  /**
   * Get color scheme for service type based on existing color palette.
   */
  private getServiceColor(serviceType: string): { primary: string; secondary: string } {
    const colors: Record<string, { primary: string; secondary: string }> = {
      general: { primary: '#3b82f6', secondary: '#dbeafe' }, // blue
      technical: { primary: '#10b981', secondary: '#d1fae5' }, // green
      strategy: { primary: '#8b5cf6', secondary: '#ede9fe' }, // purple
    };
    return colors[serviceType] || { primary: '#6b7280', secondary: '#f3f4f6' };
  }

  /**
   * Set the calendar view type.
   */
  setCalendarView(view: 'month' | 'week' | 'day'): void {
    this.calendarView.set(view);
  }

  /**
   * Navigate to previous period.
   */
  previousPeriod(): void {
    const date = this.viewDate();
    const view = this.calendarView();

    let newDate: Date;
    if (view === 'month') {
      newDate = new Date(date.getFullYear(), date.getMonth() - 1, 1);
    } else if (view === 'week') {
      newDate = new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      newDate = new Date(date.getTime() - 24 * 60 * 60 * 1000);
    }
    this.viewDate.set(newDate);
  }

  /**
   * Navigate to next period.
   */
  nextPeriod(): void {
    const date = this.viewDate();
    const view = this.calendarView();

    let newDate: Date;
    if (view === 'month') {
      newDate = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    } else if (view === 'week') {
      newDate = new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else {
      newDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
    }
    this.viewDate.set(newDate);
  }
}
