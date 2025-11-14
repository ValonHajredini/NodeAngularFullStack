/**
 * Poll Analytics Component
 *
 * Displays poll-specific analytics with vote distribution visualization.
 * Uses horizontal bar charts to show vote counts and percentages per option.
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.7: Poll and Quiz Analytics Components (Frontend)
 *
 * @since 2025-01-27
 */

import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PollMetrics, ChoiceDistribution } from '@nodeangularfullstack/shared';
import { HorizontalBarChartComponent } from './charts/horizontal-bar-chart.component';
import { Message } from 'primeng/message';

/**
 * Component for rendering poll-specific analytics.
 *
 * **Features:**
 * - Horizontal bar chart for vote distribution
 * - Empty state handling when no votes exist
 * - Responsive layout adapting to desktop/tablet
 * - WCAG AA accessibility compliance via HorizontalBarChartComponent
 * - Summary statistics (total votes, most popular option)
 *
 * **Data Flow:**
 * 1. Receives PollMetrics via signal input
 * 2. Transforms voteCounts/votePercentages → ChoiceDistribution[]
 * 3. Passes formatted data to HorizontalBarChartComponent
 *
 * **Accessibility:**
 * - ARIA labels for chart region
 * - Keyboard navigation support (inherited from HorizontalBarChartComponent)
 * - Screen reader announcements for empty states
 *
 * @example Basic Usage
 * ```html
 * <app-poll-analytics [metrics]="pollMetrics()" />
 * ```
 *
 * @example With Loading State
 * ```html
 * @if (isLoading()) {
 *   <div class="skeleton-loader"></div>
 * } @else if (categoryMetrics()?.category === 'polls') {
 *   <app-poll-analytics [metrics]="categoryMetrics() as PollMetrics" />
 * }
 * ```
 */
@Component({
  selector: 'app-poll-analytics',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, HorizontalBarChartComponent, Message],
  template: `
    <div
      class="poll-analytics-container"
      role="region"
      aria-label="Poll analytics and vote distribution"
    >
      <!-- Summary Statistics -->
      <div class="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Total Votes Card -->
        <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Total Votes</p>
              <p class="text-2xl font-bold text-gray-900">{{ metrics().totalSubmissions }}</p>
            </div>
            <div
              class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center"
              aria-hidden="true"
            >
              <i class="pi pi-chart-bar text-blue-600 text-xl"></i>
            </div>
          </div>
        </div>

        <!-- Unique Voters Card -->
        <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Unique Voters</p>
              <p class="text-2xl font-bold text-gray-900">{{ metrics().uniqueVoters }}</p>
            </div>
            <div
              class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center"
              aria-hidden="true"
            >
              <i class="pi pi-users text-green-600 text-xl"></i>
            </div>
          </div>
        </div>

        <!-- Most Popular Card -->
        <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Most Popular</p>
              <p class="text-lg font-bold text-gray-900 truncate" [title]="metrics().mostPopularOption">
                {{ metrics().mostPopularOption }}
              </p>
              <p class="text-sm text-gray-500">
                {{ metrics().voteCounts[metrics().mostPopularOption] }} votes
              </p>
            </div>
            <div
              class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center"
              aria-hidden="true"
            >
              <i class="pi pi-star-fill text-purple-600 text-xl"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- Vote Distribution Chart -->
      @if (hasVotes()) {
        <div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <app-horizontal-bar-chart
            [title]="'Vote Distribution'"
            [data]="chartData()"
          ></app-horizontal-bar-chart>
        </div>
      } @else {
        <!-- Empty State -->
        <div
          class="bg-white p-8 rounded-lg border border-gray-200 shadow-sm"
          role="status"
          aria-label="No poll votes yet"
        >
          <p-message
            severity="info"
            text="No votes have been submitted yet. Vote counts will appear here once submissions are received."
            [closable]="false"
            styleClass="w-full"
          ></p-message>
        </div>
      }

      <!-- Screen Reader Summary -->
      <div class="sr-only" aria-live="polite" aria-atomic="true">
        Poll analytics for {{ metrics().totalSubmissions }} total votes from
        {{ metrics().uniqueVoters }} unique voters. Most popular option is
        "{{ metrics().mostPopularOption }}" with {{ metrics().voteCounts[metrics().mostPopularOption] }} votes.
      </div>
    </div>
  `,
  styles: [
    `
      .poll-analytics-container {
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
        .poll-analytics-container :host ::ng-deep .chart-container {
          height: 350px;
        }
      }

      /* Responsive adjustments for mobile */
      @media (max-width: 767px) {
        .poll-analytics-container :host ::ng-deep .chart-container {
          height: 400px;
        }
      }
    `,
  ],
})
export class PollAnalyticsComponent {
  /** Poll metrics data from backend API */
  metrics = input.required<PollMetrics>();

  /**
   * Check if poll has any votes.
   * Used to conditionally render chart vs. empty state.
   */
  hasVotes = computed(() => this.metrics().totalSubmissions > 0);

  /**
   * Transform PollMetrics to ChoiceDistribution format for HorizontalBarChartComponent.
   * Maps voteCounts and votePercentages into the chart data structure.
   *
   * **Transformation Logic:**
   * - Extract option labels from voteCounts keys
   * - Combine counts and percentages into ChoiceDistribution objects
   * - Sort by count descending (most popular first)
   *
   * @returns Array of chart-ready distribution data
   */
  chartData = computed((): ChoiceDistribution[] => {
    const { voteCounts, votePercentages } = this.metrics();

    return Object.keys(voteCounts)
      .map((optionValue) => ({
        label: optionValue,
        value: optionValue,
        count: voteCounts[optionValue],
        percentage: votePercentages[optionValue],
      }))
      .sort((a, b) => b.count - a.count); // Sort descending (most popular first) - highlights winning options at top for poll analysis
  });
}
