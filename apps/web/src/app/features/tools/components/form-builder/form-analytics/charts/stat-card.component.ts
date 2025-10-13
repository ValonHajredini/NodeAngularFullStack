import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NumericStatistics } from '@nodeangularfullstack/shared';

/**
 * Statistics card component for displaying numeric field statistics.
 * Shows mean, median, min, max, and standard deviation in a grid layout.
 */
@Component({
  selector: 'app-stat-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="stat-card">
      <h3 class="text-lg font-semibold mb-4 text-gray-900">{{ title() }}</h3>

      @if (data().count > 0) {
        <div class="grid grid-cols-2 gap-4">
          <!-- Mean -->
          <div class="stat-item bg-blue-50 rounded-lg p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600 mb-1">Average</p>
                <p class="text-2xl font-bold text-blue-600">{{ data().mean }}</p>
              </div>
              <i class="pi pi-chart-line text-2xl text-blue-400"></i>
            </div>
          </div>

          <!-- Median -->
          <div class="stat-item bg-green-50 rounded-lg p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600 mb-1">Median</p>
                <p class="text-2xl font-bold text-green-600">{{ data().median }}</p>
              </div>
              <i class="pi pi-chart-bar text-2xl text-green-400"></i>
            </div>
          </div>

          <!-- Min -->
          <div class="stat-item bg-amber-50 rounded-lg p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600 mb-1">Minimum</p>
                <p class="text-2xl font-bold text-amber-600">{{ data().min }}</p>
              </div>
              <i class="pi pi-arrow-down text-2xl text-amber-400"></i>
            </div>
          </div>

          <!-- Max -->
          <div class="stat-item bg-red-50 rounded-lg p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600 mb-1">Maximum</p>
                <p class="text-2xl font-bold text-red-600">{{ data().max }}</p>
              </div>
              <i class="pi pi-arrow-up text-2xl text-red-400"></i>
            </div>
          </div>

          <!-- Standard Deviation -->
          <div class="stat-item bg-violet-50 rounded-lg p-4 col-span-2">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600 mb-1">Standard Deviation</p>
                <p class="text-2xl font-bold text-violet-600">{{ data().stdDev }}</p>
              </div>
              <i class="pi pi-chart-scatter text-2xl text-violet-400"></i>
            </div>
          </div>

          <!-- Count -->
          <div class="stat-item bg-gray-100 rounded-lg p-4 col-span-2">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600 mb-1">Sample Size</p>
                <p class="text-2xl font-bold text-gray-700">{{ data().count }}</p>
              </div>
              <i class="pi pi-database text-2xl text-gray-400"></i>
            </div>
          </div>
        </div>
      } @else {
        <div
          class="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
        >
          <p class="text-gray-500">No numeric data available</p>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .stat-card {
        height: 100%;
      }

      .stat-item {
        transition: transform 0.2s ease-in-out;
      }

      .stat-item:hover {
        transform: translateY(-2px);
      }
    `,
  ],
})
export class StatCardComponent {
  /** Card title */
  title = input.required<string>();

  /** Numeric statistics data */
  data = input.required<NumericStatistics>();
}
