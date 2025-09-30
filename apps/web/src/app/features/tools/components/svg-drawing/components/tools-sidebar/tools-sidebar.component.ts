import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonDirective } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ColorPickerModule } from 'primeng/colorpicker';
import { SliderModule } from 'primeng/slider';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

/**
 * Tools sidebar component for SVG drawing.
 * Vertical layout with drawing tools, undo/redo, and actions.
 */
@Component({
  selector: 'app-tools-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonDirective,
    TooltipModule,
    ColorPickerModule,
    SliderModule,
    ToggleSwitchModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tools-sidebar">
      <!-- Drawing Tools Section -->
      <div class="tools-section">
        <h3 class="section-title">Basic Shapes</h3>

        <div class="tools-grid">
          <button
            pButton
            type="button"
            [class.active]="currentTool() === 'line'"
            class="tool-button"
            (click)="onToolSelect('line')"
            pTooltip="Line (L)"
            tooltipPosition="bottom"
          >
            <i class="pi pi-minus"></i>
          </button>

          <button
            pButton
            type="button"
            [class.active]="currentTool() === 'rectangle'"
            class="tool-button"
            (click)="onToolSelect('rectangle')"
            pTooltip="Rectangle (R)"
            tooltipPosition="bottom"
          >
            <i class="pi pi-stop"></i>
          </button>

          <button
            pButton
            type="button"
            [class.active]="currentTool() === 'circle'"
            class="tool-button"
            (click)="onToolSelect('circle')"
            pTooltip="Circle (C)"
            tooltipPosition="bottom"
          >
            <i class="pi pi-circle"></i>
          </button>

          <button
            pButton
            type="button"
            [class.active]="currentTool() === 'ellipse'"
            class="tool-button"
            (click)="onToolSelect('ellipse')"
            pTooltip="Ellipse (E)"
            tooltipPosition="bottom"
          >
            <i class="pi pi-ellipsis-h"></i>
          </button>

          <button
            pButton
            type="button"
            [class.active]="currentTool() === 'triangle'"
            class="tool-button"
            (click)="onToolSelect('triangle')"
            pTooltip="Triangle (T)"
            tooltipPosition="bottom"
          >
            <i class="pi pi-caret-up"></i>
          </button>

          <button
            pButton
            type="button"
            [class.active]="currentTool() === 'polygon'"
            class="tool-button"
            (click)="onToolSelect('polygon')"
            pTooltip="Polygon (P)"
            tooltipPosition="bottom"
          >
            <i class="pi pi-slack"></i>
          </button>

          <button
            pButton
            type="button"
            [class.active]="currentTool() === 'polyline'"
            class="tool-button"
            (click)="onToolSelect('polyline')"
            pTooltip="Polyline (Y)"
            tooltipPosition="bottom"
          >
            <i class="pi pi-chart-bar"></i>
          </button>

          <button
            pButton
            type="button"
            [class.active]="currentTool() === 'bezier'"
            class="tool-button"
            (click)="onToolSelect('bezier')"
            pTooltip="Curve (B)"
            tooltipPosition="bottom"
          >
            <i class="pi pi-chart-line"></i>
          </button>
        </div>
      </div>

      <!-- Tools Section -->
      <div class="tools-section">
        <h3 class="section-title">Tools</h3>

        <div class="tools-grid">
          <button
            pButton
            type="button"
            [class.active]="currentTool() === 'select'"
            class="tool-button"
            (click)="onToolSelect('select')"
            pTooltip="Select (S)"
            tooltipPosition="bottom"
          >
            <i class="pi pi-arrow-up-right"></i>
          </button>

          <button
            pButton
            type="button"
            [class.active]="currentTool() === 'move'"
            class="tool-button"
            (click)="onToolSelect('move')"
            pTooltip="Move (M)"
            tooltipPosition="bottom"
          >
            <i class="pi pi-arrows-alt"></i>
          </button>

          <button
            pButton
            type="button"
            [class.active]="currentTool() === 'cut'"
            class="tool-button"
            (click)="onToolSelect('cut')"
            pTooltip="Cut Line (X)"
            tooltipPosition="bottom"
          >
            <i class="pi pi-scissors"></i>
          </button>

          <button
            pButton
            type="button"
            [class.active]="currentTool() === 'delete'"
            class="tool-button danger"
            (click)="onToolSelect('delete')"
            pTooltip="Delete (Del)"
            tooltipPosition="bottom"
          >
            <i class="pi pi-trash"></i>
          </button>
        </div>
      </div>

      <!-- Style Settings Section -->
      <div class="tools-section">
        <h3 class="section-title">Style Settings</h3>

        <!-- Stroke Color -->
        <div class="style-control">
          <label class="control-label">Stroke Color</label>
          <div class="color-picker-wrapper">
            <p-colorPicker
              [(ngModel)]="localStrokeColor"
              (onChange)="onStrokeColorChange($event)"
              [inline]="false"
              appendTo="body"
            />
            <span class="color-preview" [style.background-color]="localStrokeColor"></span>
          </div>
        </div>

        <!-- Stroke Width -->
        <div class="style-control">
          <label class="control-label">Stroke Width ({{ localStrokeWidth }}px)</label>
          <p-slider
            [(ngModel)]="localStrokeWidth"
            (onChange)="onStrokeWidthChange($event)"
            [min]="1"
            [max]="10"
            [step]="1"
            class="w-full"
          />
        </div>

        <!-- Fill Toggle -->
        <div class="style-control">
          <label class="control-label">Fill</label>
          <p-toggleswitch [(ngModel)]="localFillEnabled" (onChange)="onFillEnabledChange($event)" />
        </div>

        <!-- Fill Color (only when enabled) -->
        @if (localFillEnabled) {
          <div class="style-control">
            <label class="control-label">Fill Color</label>
            <div class="color-picker-wrapper">
              <p-colorPicker
                [(ngModel)]="localFillColor"
                (onChange)="onFillColorChange($event)"
                [inline]="false"
                appendTo="body"
              />
              <span class="color-preview" [style.background-color]="localFillColor"></span>
            </div>
          </div>
        }
      </div>

      <!-- Actions Section -->
      <div class="tools-section">
        <h3 class="section-title">Actions</h3>

        <button
          pButton
          type="button"
          class="action-button"
          [disabled]="!canUndo()"
          (click)="onUndo()"
          pTooltip="Ctrl+Z"
          tooltipPosition="right"
        >
          <i class="pi pi-undo"></i>
          <span>Undo</span>
        </button>

        <button
          pButton
          type="button"
          class="action-button"
          [disabled]="!canRedo()"
          (click)="onRedo()"
          pTooltip="Ctrl+Y"
          tooltipPosition="right"
        >
          <i class="pi pi-replay"></i>
          <span>Redo</span>
        </button>

        <button
          pButton
          type="button"
          class="action-button danger"
          (click)="onClearAll()"
          pTooltip="Clear all shapes"
          tooltipPosition="right"
        >
          <i class="pi pi-times"></i>
          <span>Clear All</span>
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .tools-sidebar {
        width: 180px;
        background: #f9fafb;
        border-right: 1px solid #e5e7eb;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        overflow-y: auto;
      }

      .tools-section {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .section-title {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        color: #6b7280;
        margin-bottom: 0.5rem;
        letter-spacing: 0.05em;
      }

      .tools-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.5rem;
      }

      .tool-button {
        aspect-ratio: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        border: 2px solid #d1d5db;
        border-radius: 0.5rem;
        background: #f3f4f6;
        cursor: pointer;
        transition: all 0.2s;
      }

      .tool-button i {
        font-size: 1.5rem;
        color: #374151;
      }

      .tool-button:hover {
        border-color: #3b82f6;
        background: #eff6ff;
        transform: translateY(-2px);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }

      .tool-button:hover i {
        color: #3b82f6;
      }

      .tool-button.active {
        border-color: #3b82f6;
        background: #dbeafe;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      .tool-button.active i {
        color: #2563eb;
      }

      .tool-button.danger:hover {
        border-color: #ef4444;
        background: #fef2f2;
      }

      .tool-button.danger:hover i {
        color: #ef4444;
      }

      .tool-button.danger.active {
        border-color: #ef4444;
        background: #fee2e2;
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
      }

      .tool-button.danger.active i {
        color: #dc2626;
      }

      .action-button {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 0.5rem;
        padding: 0.625rem 0.75rem;
        border: 1.5px solid #3b82f6;
        border-radius: 0.375rem;
        background: #f0f9ff;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 0.875rem;
        font-weight: 500;
        color: #1e40af;
      }

      .action-button i {
        font-size: 1rem;
        color: #3b82f6;
      }

      .action-button:hover:not(:disabled) {
        border-color: #2563eb;
        background: #dbeafe;
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
      }

      .action-button:hover:not(:disabled) i {
        color: #2563eb;
      }

      .action-button.danger {
        border-color: #ef4444;
        background: #fef2f2;
        color: #991b1b;
      }

      .action-button.danger i {
        color: #ef4444;
      }

      .action-button.danger:hover:not(:disabled) {
        border-color: #dc2626;
        background: #fee2e2;
        box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2);
      }

      .action-button.danger:hover:not(:disabled) i {
        color: #dc2626;
      }

      .action-button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        border-color: #d1d5db;
        background: #f9fafb;
        color: #9ca3af;
      }

      .action-button:disabled i {
        color: #d1d5db;
      }

      .style-control {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }

      .control-label {
        font-size: 0.75rem;
        font-weight: 500;
        color: #4b5563;
      }

      .color-picker-wrapper {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .color-preview {
        width: 30px;
        height: 30px;
        border: 2px solid #d1d5db;
        border-radius: 0.375rem;
        display: inline-block;
      }

      @media (max-width: 768px) {
        .tools-sidebar {
          width: 60px;
          padding: 0.5rem;
        }

        .section-title,
        .action-button span,
        .style-control {
          display: none;
        }

        .tools-grid {
          grid-template-columns: 1fr;
        }

        .action-button {
          justify-content: center;
          padding: 0.625rem;
        }
      }
    `,
  ],
})
export class ToolsSidebarComponent {
  /** Current active tool */
  @Input() currentTool!: () =>
    | 'line'
    | 'polygon'
    | 'polyline'
    | 'rectangle'
    | 'circle'
    | 'ellipse'
    | 'triangle'
    | 'rounded-rectangle'
    | 'arc'
    | 'bezier'
    | 'star'
    | 'arrow'
    | 'cylinder'
    | 'cone'
    | 'select'
    | 'move'
    | 'delete'
    | 'cut';

  /** Whether undo is available */
  @Input() canUndo!: () => boolean;

  /** Whether redo is available */
  @Input() canRedo!: () => boolean;

  /** Current stroke color */
  @Input() set strokeColor(value: string) {
    this.localStrokeColor = value;
  }

  /** Current stroke width */
  @Input() set strokeWidth(value: number) {
    this.localStrokeWidth = value;
  }

  /** Current fill color */
  @Input() set fillColor(value: string) {
    this.localFillColor = value;
  }

  /** Whether fill is enabled */
  @Input() set fillEnabled(value: boolean) {
    this.localFillEnabled = value;
  }

  /** Tool selection event */
  @Output() toolSelected = new EventEmitter<
    | 'line'
    | 'polygon'
    | 'polyline'
    | 'rectangle'
    | 'circle'
    | 'ellipse'
    | 'triangle'
    | 'rounded-rectangle'
    | 'arc'
    | 'bezier'
    | 'star'
    | 'arrow'
    | 'cylinder'
    | 'cone'
    | 'select'
    | 'move'
    | 'delete'
    | 'cut'
  >();

  /** Undo event */
  @Output() undoClicked = new EventEmitter<void>();

  /** Redo event */
  @Output() redoClicked = new EventEmitter<void>();

  /** Clear all event */
  @Output() clearAllClicked = new EventEmitter<void>();

  /** Style change events */
  @Output() strokeColorChanged = new EventEmitter<string>();
  @Output() strokeWidthChanged = new EventEmitter<number>();
  @Output() fillColorChanged = new EventEmitter<string>();
  @Output() fillEnabledChanged = new EventEmitter<boolean>();

  // Local state for style controls
  localStrokeColor = '#000000';
  localStrokeWidth = 2;
  localFillColor = '#cccccc';
  localFillEnabled = false;

  /**
   * Handles tool selection.
   */
  onToolSelect(
    tool:
      | 'line'
      | 'polygon'
      | 'polyline'
      | 'rectangle'
      | 'circle'
      | 'ellipse'
      | 'triangle'
      | 'rounded-rectangle'
      | 'arc'
      | 'bezier'
      | 'star'
      | 'arrow'
      | 'cylinder'
      | 'cone'
      | 'select'
      | 'move'
      | 'delete'
      | 'cut',
  ): void {
    this.toolSelected.emit(tool);
  }

  /**
   * Handles undo action.
   */
  onUndo(): void {
    this.undoClicked.emit();
  }

  /**
   * Handles redo action.
   */
  onRedo(): void {
    this.redoClicked.emit();
  }

  /**
   * Handles clear all action.
   */
  onClearAll(): void {
    this.clearAllClicked.emit();
  }

  /**
   * Handles stroke color change.
   */
  onStrokeColorChange(event: any): void {
    // PrimeNG ColorPicker returns hex without #
    const color = event.value.startsWith('#') ? event.value : `#${event.value}`;
    this.strokeColorChanged.emit(color);
  }

  /**
   * Handles stroke width change.
   */
  onStrokeWidthChange(event: any): void {
    this.strokeWidthChanged.emit(event.value);
  }

  /**
   * Handles fill color change.
   */
  onFillColorChange(event: any): void {
    // PrimeNG ColorPicker returns hex without #
    const color = event.value.startsWith('#') ? event.value : `#${event.value}`;
    this.fillColorChanged.emit(color);
  }

  /**
   * Handles fill enabled toggle.
   */
  onFillEnabledChange(event: any): void {
    this.fillEnabledChanged.emit(event.checked);
  }
}
