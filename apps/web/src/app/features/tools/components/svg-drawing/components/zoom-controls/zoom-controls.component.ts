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
          (click)="onZoomOutClick()"
          pTooltip="Zoom Out (Ctrl+-)"
          tooltipPosition="top"
        >
          <i class="pi pi-minus"></i>
        </button>

        <button
          pButton
          type="button"
          class="control-btn reset-btn"
          (click)="onResetZoomClick()"
          pTooltip="Reset Zoom (Ctrl+0)"
          tooltipPosition="top"
        >
          <i class="pi pi-refresh"></i>
        </button>

        <button
          pButton
          type="button"
          class="control-btn zoom-btn"
          (click)="onZoomInClick()"
          pTooltip="Zoom In (Ctrl++)"
          tooltipPosition="top"
        >
          <i class="pi pi-plus"></i>
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
        bottom: 12px;
        right: 12px;
        z-index: 1000;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 100px;
      }

      .zoom-level {
        text-align: center;
        font-size: 0.75rem;
        font-weight: 600;
        color: #1e40af;
        background: #dbeafe;
        padding: 4px 6px;
        border-radius: 4px;
        border: 1px solid #3b82f6;
      }

      .zoom-buttons {
        display: flex;
        flex-direction: row;
        gap: 3px;
      }

      .control-btn {
        flex: 1;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        background: #f9fafb;
        cursor: pointer;
        transition: all 0.2s;
      }

      .control-btn i {
        font-size: 0.875rem;
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
        margin: 2px 0;
      }

      .pan-controls {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }

      .pan-label {
        text-align: center;
        font-size: 0.625rem;
        font-weight: 600;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .pan-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 2px;
      }

      .pan-btn {
        width: 28px;
        height: 28px;
      }

      .pan-center {
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f9fafb;
        border-radius: 4px;
        border: 1px dashed #d1d5db;
      }

      .pan-center i {
        font-size: 0.75rem;
      }

      .pan-spacer {
        width: 28px;
        height: 28px;
      }

      /* Responsive adjustments */
      @media (max-width: 768px) {
        .zoom-controls-container {
          bottom: 8px;
          right: 8px;
          padding: 6px;
          min-width: 90px;
        }

        .control-btn {
          height: 26px;
        }

        .pan-btn {
          width: 26px;
          height: 26px;
        }

        .pan-center,
        .pan-spacer {
          width: 26px;
          height: 26px;
        }
      }
    `,
  ],
})
export class ZoomControlsComponent {
  /** Current zoom level as percentage (e.g., 150 for 150%) */
  @Input() zoomLevel = 100;

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
