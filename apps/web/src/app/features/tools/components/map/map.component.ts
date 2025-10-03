import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { MapService } from './map.service';

/**
 * map tool component.
 * Proident ipsa mini
 */
@Component({
  selector: 'app-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CardModule, ButtonModule, MessageModule],
  template: `
    <div class="tool-container p-4">
      <p-card>
        <ng-template pTemplate="header">
          <div class="flex items-center gap-3 p-4">
            <i class="pi pi-wrench text-2xl text-primary"></i>
            <div>
              <h2 class="text-xl font-bold text-gray-900 m-0">map</h2>
              <p class="text-gray-600 text-sm m-0">Proident ipsa mini</p>
            </div>
          </div>
        </ng-template>

        <div class="tool-content">
          @if (loading()) {
            <p-message severity="info" text="Loading map..." [closable]="false"></p-message>
          } @else if (error()) {
            <p-message
              severity="error"
              [text]="error() || 'An error occurred'"
              [closable]="false"
            ></p-message>
          } @else {
            <div class="text-center py-8">
              <i class="pi pi-cog text-4xl text-gray-400 mb-4"></i>
              <h3 class="text-lg font-semibold text-gray-900 mb-2">Tool Implementation</h3>
              <p class="text-gray-600 mb-4">Hello world</p>
              <p class="text-sm text-gray-500">Tool Key: map | Component: MapComponent</p>

              <div class="mt-6">
                <p-button
                  label="Get Started"
                  icon="pi pi-play"
                  (click)="onGetStarted()"
                  [disabled]="loading()"
                ></p-button>
              </div>
            </div>
          }
        </div>
      </p-card>
    </div>
  `,
  styles: [
    `
      .tool-container {
        max-width: 800px;
        margin: 0 auto;
      }

      :host ::ng-deep .p-card-header {
        padding: 0;
      }

      :host ::ng-deep .p-card-body {
        padding: 1.5rem;
      }
    `,
  ],
})
export class MapComponent implements OnInit {
  private readonly mapService = inject(MapService);

  // Component state
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.initializeTool();
  }

  /**
   * Initializes the tool component.
   */
  private async initializeTool(): Promise<void> {
    try {
      this.loading.set(true);
      this.error.set(null);

      // Initialize tool-specific functionality here
      await this.mapService.initialize();
    } catch (error) {
      console.error('Failed to initialize map:', error);
      this.error.set('Failed to initialize tool. Please try again later.');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Handles the get started action.
   */
  onGetStarted(): void {
    // Implement tool-specific get started logic here
    console.log('map tool started');
  }
}
