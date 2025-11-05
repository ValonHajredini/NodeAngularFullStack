import { Component, ChangeDetectionStrategy, input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UIChart } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ChoiceDistribution } from '@nodeangularfullstack/shared';

/**
 * Radar chart component for displaying data across multiple axes radiating from center.
 * Best for choice distribution or multi-series comparison data.
 * Data points connected to form polygon shape.
 * WCAG AA compliant with data table alternative and keyboard navigation.
 */
@Component({
  selector: 'app-radar-chart',
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
              type="radar"
              [data]="chartData()"
              [options]="chartOptions"
              [style]="{ height: '300px' }"
            ></p-chart>
          </div>

          <!-- Screen reader accessible data table (visually hidden) -->
          <div class="sr-only" role="table" aria-label="Data table alternative for radar chart">
            <table>
              <caption>
                {{
                  title()
                }}
                - Data Table
              </caption>
              <thead>
                <tr>
                  <th scope="col">Option</th>
                  <th scope="col">Count</th>
                  <th scope="col">Percentage</th>
                </tr>
              </thead>
              <tbody>
                @for (item of data(); track item.value) {
                  <tr>
                    <td>{{ item.label }}</td>
                    <td>{{ item.count }}</td>
                    <td>{{ item.percentage.toFixed(1) }}%</td>
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
                <th scope="col">Option</th>
                <th scope="col">Count</th>
                <th scope="col">Percentage</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-item>
              <tr>
                <td>{{ item.label }}</td>
                <td>{{ item.count }}</td>
                <td>{{ item.percentage.toFixed(1) }}%</td>
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
          Chart updated: {{ data().length }} options displayed
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
export class RadarChartComponent {
  /** Chart title */
  title = input.required<string>();

  /** Distribution data to display */
  data = input.required<ChoiceDistribution[]>();

  /** Toggle between chart and data table view */
  showDataTable = signal(false);

  /** Chart data formatted for PrimeNG Chart */
  chartData = computed(() => ({
    labels: this.data().map((d) => d.label),
    datasets: [
      {
        label: 'Responses',
        data: this.data().map((d) => d.count),
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: '#3B82F6',
        borderWidth: 2,
        pointBackgroundColor: '#3B82F6',
        pointBorderColor: '#FFFFFF',
        pointHoverBackgroundColor: '#FFFFFF',
        pointHoverBorderColor: '#3B82F6',
      },
    ],
  }));

  /** Chart configuration options */
  chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true,
        ticks: { precision: 0 },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: { dataIndex: number; parsed: { r: number } }): string => {
            const distribution = this.data()[context.dataIndex];
            const DECIMAL_PLACES = 1;
            return `${context.parsed.r} responses (${distribution.percentage.toFixed(DECIMAL_PLACES)}%)`;
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
    const totalResponses = this.data().reduce((sum, d) => sum + d.count, 0);
    const topOption = this.data().reduce(
      (max, d) => (d.count > max.count ? d : max),
      this.data()[0],
    );

    return `Radar chart for ${this.title()}. Total responses: ${totalResponses}. Most popular option: ${topOption.label} with ${topOption.count} responses (${topOption.percentage.toFixed(1)}%).`;
  }
}
