import {
  Component,
  computed,
  input,
  effect,
  viewChild,
  ElementRef,
  ChangeDetectionStrategy,
  afterNextRender,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { PollResults } from '@nodeangularfullstack/shared';
import {
  Chart,
  ChartConfiguration,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

/**
 * Component displays poll results after voting
 * Shows aggregated vote counts and percentages with Chart.js horizontal bar chart
 *
 * Epic 29: Form Template System with Business Logic
 * Story 29.14: Poll Template with Vote Aggregation
 *
 * @since Epic 29, Story 29.14
 * @source docs/architecture/frontend-architecture.md (Signal-based State)
 */
@Component({
  selector: 'app-poll-results',
  standalone: true,
  imports: [CommonModule, CardModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-card class="poll-results-card">
      <ng-template pTemplate="header">
        <div class="results-header">
          <i class="pi pi-chart-bar"></i>
          <h2>Poll Results</h2>
        </div>
      </ng-template>

      <div class="poll-summary">
        <div class="total-votes">
          <span class="votes-count">{{ results().total_votes }}</span>
          <span class="votes-label">Total Votes</span>
        </div>

        @if (results().user_voted) {
          <div class="user-vote-indicator">
            <i class="pi pi-check-circle"></i>
            <span>Thank you for voting!</span>
          </div>
        }
      </div>

      <div class="chart-container">
        <canvas #chartCanvas></canvas>
      </div>

      <div class="vote-breakdown">
        <h3>Vote Breakdown</h3>
        @for (option of chartData(); track option.label) {
          <div class="breakdown-item">
            <div class="option-label">
              <span class="option-name">{{ option.label }}</span>
              @if (results().user_vote === option.value) {
                <span class="your-vote-badge">Your vote</span>
              }
            </div>
            <div class="option-stats">
              <span class="vote-count">{{ option.count }} votes</span>
              <span class="vote-percentage">{{ option.percentage }}%</span>
            </div>
          </div>
        }
      </div>
    </p-card>
  `,
  styles: [
    `
      .poll-results-card {
        max-width: 700px;
        margin: 2rem auto;
      }

      .results-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1.5rem;
        background: linear-gradient(135deg, var(--blue-500), var(--blue-600));
        color: white;
        border-radius: 6px 6px 0 0;
      }

      .results-header i {
        font-size: 2.5rem;
      }

      .results-header h2 {
        margin: 0;
        font-size: 1.75rem;
      }

      .poll-summary {
        padding: 1.5rem 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
      }

      .total-votes {
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .votes-count {
        font-size: 3rem;
        font-weight: bold;
        color: var(--primary-color);
      }

      .votes-label {
        font-size: 1rem;
        color: var(--text-color-secondary);
      }

      .user-vote-indicator {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: var(--green-50);
        border-radius: 20px;
        color: var(--green-700);
        font-weight: 500;
      }

      .user-vote-indicator i {
        font-size: 1.25rem;
        color: var(--green-600);
      }

      .chart-container {
        margin: 2rem 0;
        padding: 1rem;
        background: var(--surface-50);
        border-radius: 6px;
      }

      .chart-container canvas {
        max-height: 400px;
      }

      .vote-breakdown {
        margin-top: 2rem;
        border-top: 1px solid var(--surface-border);
        padding-top: 1.5rem;
      }

      .vote-breakdown h3 {
        margin-bottom: 1rem;
        font-size: 1.25rem;
        color: var(--text-color);
      }

      .breakdown-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        margin-bottom: 0.75rem;
        background: var(--surface-0);
        border: 1px solid var(--surface-border);
        border-radius: 6px;
        transition: all 0.2s ease;
      }

      .breakdown-item:hover {
        background: var(--surface-50);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .option-label {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex: 1;
      }

      .option-name {
        font-weight: 600;
        color: var(--text-color);
      }

      .your-vote-badge {
        display: inline-flex;
        align-items: center;
        padding: 0.25rem 0.75rem;
        background: var(--blue-100);
        color: var(--blue-700);
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 600;
      }

      .option-stats {
        display: flex;
        gap: 1rem;
        align-items: center;
      }

      .vote-count {
        color: var(--text-color-secondary);
        font-size: 0.875rem;
      }

      .vote-percentage {
        font-weight: bold;
        color: var(--primary-color);
        font-size: 1.125rem;
        min-width: 50px;
        text-align: right;
      }

      @media (max-width: 640px) {
        .breakdown-item {
          flex-direction: column;
          align-items: flex-start;
          gap: 0.5rem;
        }

        .option-stats {
          width: 100%;
          justify-content: space-between;
        }
      }
    `,
  ],
})
export class PollResultsComponent {
  // Inputs
  readonly results = input.required<PollResults>();

  // View children
  readonly chartCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('chartCanvas');

  // Chart instance
  private chartInstance: Chart | null = null;

  // Computed data for chart
  readonly chartData = computed(() => {
    const results = this.results();
    const voteCounts = results.vote_counts;
    const votePercentages = results.vote_percentages;

    return Object.keys(voteCounts)
      .map((key) => ({
        label: this.formatLabel(key),
        value: key,
        count: voteCounts[key],
        percentage: votePercentages[key],
      }))
      .sort((a, b) => b.count - a.count); // Sort by count descending
  });

  constructor() {
    // Initialize chart after view init
    afterNextRender(() => {
      this.initializeChart();
    });

    // Update chart when data changes
    effect(() => {
      const data = this.chartData();
      if (this.chartInstance && data.length > 0) {
        this.updateChart(data);
      }
    });
  }

  /**
   * Initialize Chart.js horizontal bar chart
   */
  private initializeChart(): void {
    const canvas = this.chartCanvas().nativeElement;
    const data = this.chartData();

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: data.map((d) => d.label),
        datasets: [
          {
            label: 'Votes',
            data: data.map((d) => d.count),
            backgroundColor: [
              'rgba(54, 162, 235, 0.8)',
              'rgba(75, 192, 192, 0.8)',
              'rgba(255, 159, 64, 0.8)',
              'rgba(153, 102, 255, 0.8)',
              'rgba(255, 99, 132, 0.8)',
              'rgba(255, 206, 86, 0.8)',
            ],
            borderColor: [
              'rgba(54, 162, 235, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(255, 159, 64, 1)',
              'rgba(153, 102, 255, 1)',
              'rgba(255, 99, 132, 1)',
              'rgba(255, 206, 86, 1)',
            ],
            borderWidth: 2,
            borderRadius: 4,
          },
        ],
      },
      options: {
        indexAxis: 'y', // Horizontal bar chart
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 1.5,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const index = context.dataIndex;
                const percentage = data[index].percentage;
                return `${context.formattedValue} votes (${percentage}%)`;
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              precision: 0,
            },
            title: {
              display: true,
              text: 'Number of Votes',
            },
          },
          y: {
            ticks: {
              font: {
                size: 13,
                weight: 500,
              },
            },
          },
        },
      },
    };

    this.chartInstance = new Chart(canvas, config);
  }

  /**
   * Update chart with new data
   */
  private updateChart(
    data: Array<{ label: string; value: string; count: number; percentage: number }>,
  ): void {
    if (!this.chartInstance) return;

    this.chartInstance.data.labels = data.map((d) => d.label);
    this.chartInstance.data.datasets[0].data = data.map((d) => d.count);
    this.chartInstance.update();
  }

  /**
   * Format option value into readable label
   * Converts snake_case to Title Case
   */
  private formatLabel(value: string): string {
    return value
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
