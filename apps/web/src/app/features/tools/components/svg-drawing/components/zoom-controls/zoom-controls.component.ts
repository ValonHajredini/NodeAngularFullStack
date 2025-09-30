import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonDirective } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

/**
 * Floating zoom and pan controls component for the SVG drawing canvas.
 * Displays in the bottom-right corner of the canvas with zoom and pan controls.
 */
@Component({
  selector: 'app-zoom-controls',
  standalone: true,
  imports: [CommonModule, ButtonDirective, TooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="zoom-controls-container">
      <!-- Zoom Level Display -->
      <div class="zoom-level">{{ zoomLevel }}%</div>

      <!-- Zoom Controls -->
      <div class="zoom-buttons">
        <button
          pButton
          type="button"
          class="control-btn zoom-btn"
          (click)="onZoomInClick()"
          pTooltip="Zoom In (Ctrl++)"
          tooltipPosition="left"
        >
          <i class="pi pi-plus"></i>
        </button>

        <button
          pButton
          type="button"
          class="control-btn zoom-btn"
          (click)="onZoomOutClick()"
          pTooltip="Zoom Out (Ctrl+-)"
          tooltipPosition="left"
        >
          <i class="pi pi-minus"></i>
        </button>

        <button
          pButton
          type="button"
          class="control-btn reset-btn"
          (click)="onResetZoomClick()"
          pTooltip="Reset Zoom (Ctrl+0)"
          tooltipPosition="left"
        >
          <i class="pi pi-refresh"></i>
        </button>
      </div>

      <!-- Divider -->
      <div class="divider"></div>

      <!-- Pan Controls -->
      <div class="pan-controls">
        <div class="pan-label">Pan</div>
        <div class="pan-grid">
          <!-- Top Row -->
          <div class="pan-spacer"></div>
          <button
            pButton
            type="button"
            class="control-btn pan-btn"
            (click)="onPanClick('up')"
            pTooltip="Pan Up (↑)"
            tooltipPosition="left"
          >
            <i class="pi pi-chevron-up"></i>
          </button>
          <div class="pan-spacer"></div>

          <!-- Middle Row -->
          <button
            pButton
            type="button"
            class="control-btn pan-btn"
            (click)="onPanClick('left')"
            pTooltip="Pan Left (←)"
            tooltipPosition="left"
          >
            <i class="pi pi-chevron-left"></i>
          </button>
          <div class="pan-center">
            <i class="pi pi-arrows-alt text-gray-400"></i>
          </div>
          <button
            pButton
            type="button"
            class="control-btn pan-btn"
            (click)="onPanClick('right')"
            pTooltip="Pan Right (→)"
            tooltipPosition="left"
          >
            <i class="pi pi-chevron-right"></i>
          </button>

          <!-- Bottom Row -->
          <div class="pan-spacer"></div>
          <button
            pButton
            type="button"
            class="control-btn pan-btn"
            (click)="onPanClick('down')"
            pTooltip="Pan Down (↓)"
            tooltipPosition="left"
          >
            <i class="pi pi-chevron-down"></i>
          </button>
          <div class="pan-spacer"></div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .zoom-controls-container {
        position: absolute;
        bottom: 20px;
        right: 20px;
        z-index: 1000;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-width: 140px;
      }

      .zoom-level {
        text-align: center;
        font-size: 1rem;
        font-weight: 700;
        color: #1e40af;
        background: #dbeafe;
        padding: 8px;
        border-radius: 6px;
        border: 2px solid #3b82f6;
      }

      .zoom-buttons {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .control-btn {
        width: 100%;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        border: 2px solid #d1d5db;
        border-radius: 6px;
        background: #f9fafb;
        cursor: pointer;
        transition: all 0.2s;
      }

      .control-btn i {
        font-size: 1.1rem;
        color: #374151;
      }

      .control-btn:hover {
        border-color: #3b82f6;
        background: #eff6ff;
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
      }

      .control-btn:hover i {
        color: #3b82f6;
      }

      .control-btn:active {
        transform: translateY(0);
      }

      .zoom-btn:hover {
        border-color: #3b82f6;
      }

      .reset-btn {
        background: #f3f4f6;
      }

      .reset-btn:hover {
        border-color: #6b7280;
        background: #e5e7eb;
      }

      .reset-btn:hover i {
        color: #4b5563;
      }

      .divider {
        height: 1px;
        background: #e5e7eb;
        margin: 4px 0;
      }

      .pan-controls {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .pan-label {
        text-align: center;
        font-size: 0.75rem;
        font-weight: 600;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .pan-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 4px;
      }

      .pan-btn {
        width: 36px;
        height: 36px;
      }

      .pan-center {
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f9fafb;
        border-radius: 6px;
        border: 1px dashed #d1d5db;
      }

      .pan-center i {
        font-size: 1rem;
      }

      .pan-spacer {
        width: 36px;
        height: 36px;
      }

      /* Responsive adjustments */
      @media (max-width: 768px) {
        .zoom-controls-container {
          bottom: 10px;
          right: 10px;
          padding: 8px;
          min-width: 120px;
          font-size: 0.875rem;
        }

        .control-btn {
          height: 32px;
        }

        .pan-btn {
          width: 32px;
          height: 32px;
        }

        .pan-center,
        .pan-spacer {
          width: 32px;
          height: 32px;
        }
      }
    `,
  ],
})
export class ZoomControlsComponent {
  /** Current zoom level as percentage (e.g., 150 for 150%) */
  @Input() zoomLevel: number = 100;

  /** Emits when zoom in is clicked */
  @Output() zoomIn = new EventEmitter<void>();

  /** Emits when zoom out is clicked */
  @Output() zoomOut = new EventEmitter<void>();

  /** Emits when reset zoom is clicked */
  @Output() resetZoom = new EventEmitter<void>();

  /** Emits when a pan direction button is clicked */
  @Output() panDirection = new EventEmitter<'up' | 'down' | 'left' | 'right'>();

  /**
   * Handles zoom in button click.
   */
  onZoomInClick(): void {
    this.zoomIn.emit();
  }

  /**
   * Handles zoom out button click.
   */
  onZoomOutClick(): void {
    this.zoomOut.emit();
  }

  /**
   * Handles reset zoom button click.
   */
  onResetZoomClick(): void {
    this.resetZoom.emit();
  }

  /**
   * Handles pan direction button click.
   */
  onPanClick(direction: 'up' | 'down' | 'left' | 'right'): void {
    this.panDirection.emit(direction);
  }
}
