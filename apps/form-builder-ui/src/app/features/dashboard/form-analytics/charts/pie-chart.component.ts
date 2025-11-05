import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UIChart } from 'primeng/chart';
import { ChoiceDistribution } from '@nodeangularfullstack/shared';

/**
 * Pie chart component for displaying proportional distributions.
 * Shows percentage breakdown with interactive legend and tooltips.
 */
@Component({
  selector: 'app-pie-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, UIChart],
  template: `
    <div class="chart-container">
      <h3 class="text-lg font-semibold mb-3 text-gray-900">{{ title() }}</h3>
      @if (data().length > 0 && hasData()) {
        <p-chart
          type="pie"
          [data]="chartData()"
          [options]="chartOptions"
          [style]="{ height: '300px' }"
          aria-label="Pie chart showing percentage distribution"
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
export class PieChartComponent {
  /** Chart title */
  title = input.required<string>();

  /** Distribution data to display */
  data = input.required<ChoiceDistribution[]>();

  /** Check if there is any data to display */
  hasData = computed(() => {
    return this.data().some((d) => d.count > 0);
  });

  /** Color palette for pie segments */
  private readonly colors = [
    '#3B82F6', // blue-500
    '#10B981', // green-500
    '#F59E0B', // amber-500
    '#EF4444', // red-500
    '#8B5CF6', // violet-500
    '#EC4899', // pink-500
    '#14B8A6', // teal-500
    '#F97316', // orange-500
  ];

  /** Chart data formatted for PrimeNG Chart */
  chartData = computed(() => {
    const filteredData = this.data().filter((d) => d.count > 0);
    return {
      labels: filteredData.map((d) => d.label),
      datasets: [
        {
          data: filteredData.map((d) => d.count),
          backgroundColor: this.colors.slice(0, filteredData.length),
          hoverBackgroundColor: this.colors.slice(0, filteredData.length).map((c) => c + 'DD'),
        },
      ],
    };
  });

  /** Chart configuration options */
  chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'right' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
        },
      },
      tooltip: {
        callbacks: {
          label: (context: { dataIndex: number; parsed: number }): string => {
            const filteredData = this.data().filter((d) => d.count > 0);
            const distribution = filteredData[context.dataIndex];
            const DECIMAL_PLACES = 1;
            return `${distribution.label}: ${context.parsed} (${distribution.percentage.toFixed(DECIMAL_PLACES)}%)`;
          },
        },
      },
    },
  };
}
