import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UIChart } from 'primeng/chart';
import { TimeSeriesData } from '@nodeangularfullstack/shared';

/**
 * Line chart component for displaying time series data and trends.
 * Shows submission counts over time with interactive tooltips.
 */
@Component({
  selector: 'app-line-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, UIChart],
  template: `
    <div class="chart-container">
      <h3 class="text-lg font-semibold mb-3 text-gray-900">{{ title() }}</h3>
      @if (data().length > 0) {
        <p-chart
          type="line"
          [data]="chartData()"
          [options]="chartOptions"
          [style]="{ height: '300px' }"
          aria-label="Line chart showing submissions over time"
        ></p-chart>
      } @else {
        <div
          class="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
        >
          <p class="text-gray-500">No data available</p>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .chart-container {
        height: 100%;
      }
    `,
  ],
})
export class LineChartComponent {
  /** Chart title */
  title = input.required<string>();

  /** Time series data to display */
  data = input.required<TimeSeriesData[]>();

  /** Chart data formatted for PrimeNG Chart */
  chartData = computed(() => ({
    labels: this.data().map((d) => d.label),
    datasets: [
      {
        label: 'Submissions',
        data: this.data().map((d) => d.count),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  }));

  /** Chart configuration options */
  chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { precision: 0 },
        title: {
          display: true,
          text: 'Number of Submissions',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Time Period',
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };
}
