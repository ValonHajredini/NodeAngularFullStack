/**
 * Quiz Analytics Component
 *
 * Displays quiz-specific analytics with score distribution and performance metrics.
 * Uses histogram (bar chart) and pie chart to visualize score ranges and pass/fail rates.
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.7: Poll and Quiz Analytics Components (Frontend)
 *
 * @since 2025-01-27
 */

import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { QuizMetrics, ChoiceDistribution } from '@nodeangularfullstack/shared';
import { BarChartComponent } from './charts/bar-chart.component';
import { PieChartComponent } from './charts/pie-chart.component';
import { Message } from 'primeng/message';
import { Divider } from 'primeng/divider';

/**
 * Component for rendering quiz-specific analytics.
 *
 * **Features:**
 * - Score distribution histogram (bar chart)
 * - Pass/fail rate pie chart
 * - Summary statistics (avg, median, pass rate, high/low scores)
 * - Question accuracy breakdown
 * - Empty state handling when no submissions exist
 * - Responsive layout adapting to desktop/tablet/mobile
 * - WCAG AA accessibility compliance
 *
 * **Data Flow:**
 * 1. Receives QuizMetrics via signal input
 * 2. Transforms scoreDistribution → ChoiceDistribution[] for histogram
 * 3. Computes pass/fail data for pie chart
 * 4. Passes formatted data to BarChartComponent and PieChartComponent
 *
 * **Accessibility:**
 * - ARIA labels for chart regions
 * - Keyboard navigation support (inherited from chart components)
 * - Screen reader announcements for statistics and empty states
 * - Textual summaries for screen readers
 *
 * @example Basic Usage
 * ```html
 * <app-quiz-analytics [metrics]="quizMetrics()" />
 * ```
 *
 * @example With Conditional Rendering
 * ```html
 * @if (isLoading()) {
 *   <div class="skeleton-loader"></div>
 * } @else if (categoryMetrics()?.category === 'quiz') {
 *   <app-quiz-analytics [metrics]="categoryMetrics() as QuizMetrics" />
 * }
 * ```
 */
@Component({
  selector: 'app-quiz-analytics',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    DecimalPipe,
    BarChartComponent,
    PieChartComponent,
    Message,
    Divider,
  ],
  template: `
    <div
      class="quiz-analytics-container"
      role="region"
      aria-label="Quiz analytics and score distribution"
    >
      <!-- Summary Statistics Grid -->
      <div class="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Average Score Card -->
        <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Average Score</p>
              <p class="text-2xl font-bold text-gray-900">
                {{ metrics().averageScore | number: '1.1-1' }}%
              </p>
            </div>
            <div
              class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center"
              aria-hidden="true"
            >
              <i class="pi pi-chart-line text-blue-600 text-xl"></i>
            </div>
          </div>
        </div>

        <!-- Median Score Card -->
        <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Median Score</p>
              <p class="text-2xl font-bold text-gray-900">
                {{ metrics().medianScore | number: '1.0-0' }}%
              </p>
            </div>
            <div
              class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center"
              aria-hidden="true"
            >
              <i class="pi pi-calculator text-purple-600 text-xl"></i>
            </div>
          </div>
        </div>

        <!-- Pass Rate Card -->
        <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Pass Rate</p>
              <p class="text-2xl font-bold text-green-600">
                {{ metrics().passRate | number: '1.1-1' }}%
              </p>
              <p class="text-sm text-gray-500">
                {{ passedCount() }} of {{ metrics().totalSubmissions }} passed
              </p>
            </div>
            <div
              class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center"
              aria-hidden="true"
            >
              <i class="pi pi-check-circle text-green-600 text-xl"></i>
            </div>
          </div>
        </div>

        <!-- Score Range Card -->
        <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Score Range</p>
              <p class="text-lg font-bold text-gray-900">
                {{ metrics().lowestScore }}% - {{ metrics().highestScore }}%
              </p>
              <p class="text-sm text-gray-500">Min to Max</p>
            </div>
            <div
              class="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center"
              aria-hidden="true"
            >
              <i class="pi pi-sort-alt text-amber-600 text-xl"></i>
            </div>
          </div>
        </div>
      </div>

      @if (hasSubmissions()) {
        <!-- Charts Row -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <!-- Score Distribution Histogram -->
          <div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <app-bar-chart
              [title]="'Score Distribution'"
              [data]="scoreDistributionData()"
            ></app-bar-chart>
          </div>

          <!-- Pass/Fail Pie Chart -->
          <div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <app-pie-chart
              [title]="'Pass vs Fail Rate'"
              [data]="passFailData()"
            ></app-pie-chart>
          </div>
        </div>

        <!-- Question Accuracy Section -->
        @if (hasQuestionAccuracy()) {
          <div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Question Accuracy</h3>
            <p-divider styleClass="mb-4"></p-divider>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              @for (question of questionAccuracyList(); track question.questionId) {
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-gray-700">{{ question.questionId }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        class="h-2 rounded-full transition-all"
                        [class.bg-green-500]="question.accuracy >= 70"
                        [class.bg-yellow-500]="question.accuracy >= 50 && question.accuracy < 70"
                        [class.bg-red-500]="question.accuracy < 50"
                        [style.width.%]="question.accuracy"
                        role="progressbar"
                        [attr.aria-valuenow]="question.accuracy"
                        [attr.aria-valuemin]="0"
                        [attr.aria-valuemax]="100"
                        [attr.aria-label]="'Question ' + question.questionId + ' accuracy'"
                      ></div>
                    </div>
                    <span class="text-sm font-semibold text-gray-900 w-12 text-right">
                      {{ question.accuracy | number: '1.0-0' }}%
                    </span>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      } @else {
        <!-- Empty State -->
        <div
          class="bg-white p-8 rounded-lg border border-gray-200 shadow-sm"
          role="status"
          [attr.aria-label]="metrics().missingFields ? 'Incompatible form fields' : 'No quiz submissions yet'"
        >
          @if (metrics().missingFields) {
            <!-- Missing Fields Warning -->
            <p-message
              severity="warn"
              [text]="metrics().missingFields!.message"
              [closable]="false"
              styleClass="w-full"
            >
              <ng-template pTemplate="content">
                <div class="flex flex-col gap-3">
                  <div class="flex items-start gap-3">
                    <i class="pi pi-exclamation-triangle text-xl"></i>
                    <div>
                      <p class="font-semibold mb-2">Incompatible Form Type</p>
                      <p class="mb-2">{{ metrics().missingFields!.message }}</p>
                      <p class="text-sm">
                        <strong>Missing fields:</strong> {{ metrics().missingFields!.missing.join(', ') }}
                      </p>
                      <p class="text-sm mt-2">
                        <strong>Tip:</strong> This form appears to be a different type. Consider viewing the appropriate analytics category instead.
                      </p>
                    </div>
                  </div>
                </div>
              </ng-template>
            </p-message>
          } @else {
            <!-- Standard Empty State -->
            <p-message
              severity="info"
              text="No quiz submissions have been received yet. Score analytics will appear here once participants complete the quiz."
              [closable]="false"
              styleClass="w-full"
            ></p-message>
          }
        </div>
      }

      <!-- Screen Reader Summary -->
      <div class="sr-only" aria-live="polite" aria-atomic="true">
        Quiz analytics for {{ metrics().totalSubmissions }} submissions. Average score
        {{ metrics().averageScore | number: '1.1-1' }}%, median {{ metrics().medianScore }}%,
        pass rate {{ metrics().passRate | number: '1.1-1' }}%. Score range from
        {{ metrics().lowestScore }}% to {{ metrics().highestScore }}%.
      </div>
    </div>
  `,
  styles: [
    `
      .quiz-analytics-container {
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

      /* Responsive chart heights */
      @media (min-width: 768px) and (max-width: 1024px) {
        .quiz-analytics-container :host ::ng-deep .chart-container {
          height: 350px;
        }
      }

      @media (max-width: 767px) {
        .quiz-analytics-container :host ::ng-deep .chart-container {
          height: 400px;
        }
      }
    `,
  ],
})
export class QuizAnalyticsComponent {
  /** Quiz metrics data from backend API */
  metrics = input.required<QuizMetrics>();

  /**
   * Check if quiz has any submissions.
   * Used to conditionally render charts vs. empty state.
   */
  hasSubmissions = computed(() => this.metrics().totalSubmissions > 0);

  /**
   * Check if question accuracy data is available.
   */
  hasQuestionAccuracy = computed(
    () => Object.keys(this.metrics().questionAccuracy).length > 0,
  );

  /**
   * Calculate number of participants who passed.
   * Used for summary statistics display.
   */
  passedCount = computed(() =>
    Math.round((this.metrics().passRate / 100) * this.metrics().totalSubmissions),
  );

  /**
   * Transform scoreDistribution to ChoiceDistribution format for histogram.
   *
   * **Transformation Logic:**
   * - Extract score range buckets (e.g., "0-20", "21-40")
   * - Calculate percentage for each bucket
   * - Sort by score range (ascending)
   *
   * @returns Array of chart-ready distribution data
   */
  scoreDistributionData = computed((): ChoiceDistribution[] => {
    const { scoreDistribution, totalSubmissions } = this.metrics();

    return Object.entries(scoreDistribution)
      .map(([range, count]) => ({
        label: range,
        value: range,
        count,
        percentage: totalSubmissions > 0 ? (count / totalSubmissions) * 100 : 0,
      }))
      .sort((a, b) => {
        // Extract first number from range for sorting (e.g., "0-20" -> 0)
        const aStart = parseInt(a.label.split('-')[0], 10);
        const bStart = parseInt(b.label.split('-')[0], 10);
        return aStart - bStart;
      });
  });

  /**
   * Generate pass/fail data for pie chart.
   *
   * **Data Structure:**
   * - Pass: Number of submissions with passing scores
   * - Fail: Number of submissions with failing scores
   * - Calculated from passRate and totalSubmissions
   *
   * @returns Array with pass/fail counts and percentages
   */
  passFailData = computed((): ChoiceDistribution[] => {
    const { passRate, totalSubmissions } = this.metrics();
    const passedCount = Math.round((passRate / 100) * totalSubmissions);
    const failedCount = totalSubmissions - passedCount;

    return [
      {
        label: 'Passed',
        value: 'passed',
        count: passedCount,
        percentage: passRate,
      },
      {
        label: 'Failed',
        value: 'failed',
        count: failedCount,
        percentage: 100 - passRate,
      },
    ];
  });

  /**
   * Transform questionAccuracy object to array for template iteration.
   *
   * **Transformation Logic:**
   * - Convert Record<string, number> to array of {questionId, accuracy}
   * - Sort by accuracy descending (hardest questions first)
   *
   * @returns Sorted array of question accuracy data
   */
  questionAccuracyList = computed(() => {
    const { questionAccuracy } = this.metrics();

    return Object.entries(questionAccuracy)
      .map(([questionId, accuracy]) => ({
        questionId,
        accuracy,
      }))
      .sort((a, b) => a.accuracy - b.accuracy); // Sort ascending (hardest questions first) - prioritizes questions needing improvement for quiz analysis
  });
}
