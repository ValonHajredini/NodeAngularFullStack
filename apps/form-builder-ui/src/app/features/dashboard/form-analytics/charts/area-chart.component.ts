import { Component, ChangeDetectionStrategy, input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UIChart } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TimeSeriesData } from '@nodeangularfullstack/shared';

/**
 * Area chart component for displaying timeseries or trend data with filled area under curve.
 * Best for date/datetime fields showing submission trends over time.
 * Uses smooth curves with gradient fill under line.
 * WCAG AA compliant with data table alternative and keyboard navigation.
 */
@Component({
  selector: 'app-area-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, UIChart, TableModule, ButtonModule],
  template: `
    <div class="chart-container" role="region" [attr.aria-label]="'Chart: ' + title()">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-semibold text-gray-900">{{ title() }}</h3>
        <button
          pButton
          type="button"
          [label]="showDataTable() ? 'Show Chart' : 'Show Data Table'"
          [icon]="showDataTable() ? 'pi pi-chart-bar' : 'pi pi-table'"
          class="p-button-sm p-button-text"
          (click)="toggleDataTable()"
          [attr.aria-label]="showDataTable() ? 'Switch to chart view' : 'Switch to data table view'"
        ></button>
      </div>

      @if (data().length > 0) {
        @if (!showDataTable()) {
          <!-- Visual Chart -->
          <div role="img" [attr.aria-label]="getChartAriaLabel()">
            <p-chart
              type="line"
              [data]="chartData()"
              [options]="chartOptions"
              [style]="{ height: '300px' }"
            ></p-chart>
          </div>

          <!-- Screen reader accessible data table (visually hidden) -->
          <div class="sr-only" role="table" aria-label="Data table alternative for area chart">
            <table>
              <caption>
                {{
                  title()
                }}
                - Data Table
              </caption>
              <thead>
                <tr>
                  <th scope="col">Time Period</th>
                  <th scope="col">Count</th>
                </tr>
              </thead>
              <tbody>
                @for (item of data(); track item.label) {
                  <tr>
                    <td>{{ item.label }}</td>
                    <td>{{ item.count }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <!-- Visible Data Table View -->
          <p-table
            [value]="data()"
            [tableStyle]="{ 'min-width': '100%' }"
            styleClass="p-datatable-sm"
          >
            <ng-template pTemplate="header">
              <tr>
                <th scope="col">Time Period</th>
                <th scope="col">Count</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-item>
              <tr>
                <td>{{ item.label }}</td>
                <td>{{ item.count }}</td>
              </tr>
            </ng-template>
          </p-table>
        }
      } @else {
        <div
          class="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
        >
          <p class="text-gray-500">No data available</p>
        </div>
      }

      <!-- Live region for dynamic updates -->
      <div aria-live="polite" aria-atomic="true" class="sr-only">
        @if (data().length > 0) {
          Chart updated: {{ data().length }} time periods displayed
        }
      </div>
    </div>
  `,
  styles: [
    `
      .chart-container {
        height: 100%;
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
    `,
  ],
})
export class AreaChartComponent {
  /** Chart title */
  title = input.required<string>();

  /** Time series data to display */
  data = input.required<TimeSeriesData[]>();

  /** Toggle between chart and data table view */
  showDataTable = signal(false);

  /** Chart data formatted for PrimeNG Chart */
  chartData = computed(() => ({
    labels: this.data().map((d) => d.label),
    datasets: [
      {
        label: 'Submissions',
        data: this.data().map((d) => d.count),
        fill: true,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: '#3B82F6',
        borderWidth: 2,
        tension: 0.4, // Smooth curves
      },
    ],
  }));

  /** Chart configuration options */
  chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
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
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: { dataIndex: number; parsed: { y: number } }): string => {
            const item = this.data()[context.dataIndex];
            return `${context.parsed.y} submissions on ${item.label}`;
          },
        },
      },
    },
  };

  /**
   * Toggle between chart and data table view
   */
  toggleDataTable(): void {
    this.showDataTable.update((current) => !current);
  }

  /**
   * Generate accessible aria-label for the chart
   */
  getChartAriaLabel(): string {
    const totalSubmissions = this.data().reduce((sum, d) => sum + d.count, 0);
    const peakPeriod = this.data().reduce(
      (max, d) => (d.count > max.count ? d : max),
      this.data()[0],
    );

    return `Area chart for ${this.title()}. Total submissions: ${totalSubmissions}. Peak period: ${peakPeriod.label} with ${peakPeriod.count} submissions.`;
  }
}
