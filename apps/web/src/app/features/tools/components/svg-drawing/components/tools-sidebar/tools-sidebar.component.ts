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
import { CheckboxModule } from 'primeng/checkbox';

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
    CheckboxModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tools-sidebar">
      <!-- Selection & Editing Tools -->
      <div class="tools-section">
        <h3 class="section-title">
          <i class="pi pi-cursor section-icon"></i>
          <span>SELECTION</span>
        </h3>

        <div class="tools-grid-2col">
          <button
            pButton
            type="button"
            [class.active]="currentTool() === 'select'"
            class="tool-button primary"
            (click)="onToolSelect('select')"
            pTooltip="Select Tool (S)"
            tooltipPosition="right"
          >
            <i class="pi pi-arrow-up-right"></i>
          </button>

          <button
            pButton
            type="button"
            [class.active]="currentTool() === 'move'"
            class="tool-button"
            (click)="onToolSelect('move')"
            pTooltip="Move Tool (M)"
            tooltipPosition="right"
          >
            <i class="pi pi-arrows-alt"></i>
          </button>
        </div>
      </div>

      <div class="section-divider"></div>

      <!-- Basic Shapes Section -->
      <div class="tools-section">
        <h3 class="section-title">
          <i class="pi pi-stop section-icon"></i>
          <span>BASIC SHAPES</span>
        </h3>

        <div class="tools-grid-2col">
          <button
            pButton
            type="button"
            [class.active]="currentTool() === 'line'"
            class="tool-button"
            (click)="onToolSelect('line')"
            pTooltip="Line (L)"
            tooltipPosition="right"
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
            tooltipPosition="right"
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
            tooltipPosition="right"
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
            tooltipPosition="right"
          >
            <i class="pi pi-circle-fill"></i>
          </button>

          <button
            pButton
            type="button"
            [class.active]="currentTool() === 'triangle'"
            class="tool-button"
            (click)="onToolSelect('triangle')"
            pTooltip="Triangle (T)"
            tooltipPosition="right"
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
            tooltipPosition="right"
          >
            <i class="pi pi-star"></i>
          </button>

          <button
            pButton
            type="button"
            [class.active]="currentTool() === 'polyline'"
            class="tool-button"
            (click)="onToolSelect('polyline')"
            pTooltip="Polyline (Y)"
            tooltipPosition="right"
          >
            <i class="pi pi-chart-bar"></i>
          </button>

          <button
            pButton
            type="button"
            [class.active]="currentTool() === 'bezier'"
            class="tool-button"
            (click)="onToolSelect('bezier')"
            pTooltip="Bezier Curve (B)"
            tooltipPosition="right"
          >
            <i class="pi pi-chart-line"></i>
          </button>
        </div>
      </div>

      <div class="section-divider"></div>

      <!-- Edit Tools Section -->
      <div class="tools-section">
        <h3 class="section-title">
          <i class="pi pi-pencil section-icon"></i>
          <span>EDIT TOOLS</span>
        </h3>

        <div class="tools-grid-2col">
          <button
            pButton
            type="button"
            [class.active]="currentTool() === 'fill'"
            class="tool-button"
            (click)="onToolSelect('fill')"
            pTooltip="Fill Tool (F)"
            tooltipPosition="right"
          >
            <i class="pi pi-inbox"></i>
          </button>

          <button
            pButton
            type="button"
            [class.active]="currentTool() === 'cut'"
            class="tool-button"
            (click)="onToolSelect('cut')"
            pTooltip="Cut Line (X)"
            tooltipPosition="right"
          >
            <i class="pi pi-scissors"></i>
          </button>

          <button
            pButton
            type="button"
            [class.active]="currentTool() === 'delete'"
            class="tool-button danger"
            (click)="onToolSelect('delete')"
            pTooltip="Delete Tool (Del)"
            tooltipPosition="right"
          >
            <i class="pi pi-trash"></i>
          </button>
        </div>
      </div>

      <div class="section-divider"></div>

      <!-- Style Settings Section -->
      <div class="tools-section">
        <h3 class="section-title">
          <i class="pi pi-palette section-icon"></i>
          <span>STYLE</span>
        </h3>

        <!-- Compact Color Controls -->
        <div class="style-control-compact">
          <div class="color-row">
            <label class="control-label-inline">Stroke</label>
            <div class="color-input-wrapper">
              <p-colorPicker
                [(ngModel)]="localStrokeColor"
                (onChange)="onStrokeColorChange($event)"
                [inline]="false"
                appendTo="body"
              />
            </div>
          </div>

          <div class="fill-section">
            <label class="control-label-inline">Fill</label>
            <div class="fill-controls-row">
              <p-checkbox
                [(ngModel)]="localFillEnabled"
                (onChange)="onFillEnabledChange($event)"
                [binary]="true"
                class="fill-checkbox"
                pTooltip="Enable/Disable Fill"
                tooltipPosition="right"
              />
              <p-colorPicker
                [(ngModel)]="localFillColor"
                (onChange)="onFillColorChange($event)"
                [inline]="false"
                appendTo="body"
              />
            </div>
          </div>
        </div>

        <!-- Stroke Width -->
        <div class="style-control-compact">
          <label class="control-label-slider">
            <span>Width</span>
            <span class="value-badge">{{ localStrokeWidth }}px</span>
          </label>
          <p-slider
            [(ngModel)]="localStrokeWidth"
            (onChange)="onStrokeWidthChange($event)"
            [min]="1"
            [max]="10"
            [step]="1"
            class="compact-slider"
          />
        </div>

        <!-- Rotation -->
        <div class="style-control-compact">
          <label class="control-label-slider">
            <span>Rotation</span>
            <span class="value-badge">{{ localRotation }}°</span>
          </label>
          <p-slider
            [(ngModel)]="localRotation"
            (onChange)="onRotationChange($event)"
            [min]="0"
            [max]="360"
            [step]="1"
            class="compact-slider"
          />
        </div>
      </div>

      <div class="section-divider"></div>

      <!-- Actions Section -->
      <div class="tools-section">
        <h3 class="section-title">
          <i class="pi pi-history section-icon"></i>
          <span>ACTIONS</span>
        </h3>

        <div class="action-buttons-compact">
          <button
            pButton
            type="button"
            class="action-button-compact"
            [disabled]="!canUndo()"
            (click)="onUndo()"
            pTooltip="Undo (Ctrl+Z)"
            tooltipPosition="right"
          >
            <i class="pi pi-undo"></i>
          </button>

          <button
            pButton
            type="button"
            class="action-button-compact"
            [disabled]="!canRedo()"
            (click)="onRedo()"
            pTooltip="Redo (Ctrl+Y)"
            tooltipPosition="right"
          >
            <i class="pi pi-replay"></i>
          </button>

          <button
            pButton
            type="button"
            class="action-button-compact danger"
            (click)="onClearAll()"
            pTooltip="Clear All"
            tooltipPosition="right"
          >
            <i class="pi pi-times"></i>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .tools-sidebar {
        width: 145px;
        background: linear-gradient(to bottom, #f8fafc 0%, #f1f5f9 100%);
        border-right: 1px solid #cbd5e1;
        padding: 0.75rem 0.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.625rem;
        overflow-y: auto;
        box-shadow: inset -1px 0 0 rgba(203, 213, 225, 0.5);
      }

      .tools-section {
        display: flex;
        flex-direction: column;
        gap: 0.625rem;
      }

      .section-title {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        font-size: 0.625rem;
        font-weight: 700;
        text-transform: uppercase;
        color: #475569;
        margin-bottom: 0.25rem;
        letter-spacing: 0.05em;
        padding: 0.25rem 0.375rem;
        background: rgba(255, 255, 255, 0.6);
        border-radius: 0.25rem;
        border: 1px solid #e2e8f0;
      }

      .section-icon {
        font-size: 0.875rem;
        color: #64748b;
      }

      .section-divider {
        height: 1px;
        background: linear-gradient(to right, transparent, #cbd5e1, transparent);
        margin: 0.25rem 0;
      }

      .tools-grid-2col {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.3rem;
      }

      .tool-button {
        aspect-ratio: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        border: 1.5px solid #cbd5e1;
        border-radius: 0.375rem;
        background: #ffffff;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
        height: 60px;
      }

      .tool-button::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, transparent 100%);
        opacity: 0;
        transition: opacity 0.2s;
      }

      .tool-button:hover::before {
        opacity: 1;
      }

      .tool-button i {
        font-size: 1.2rem;
        color: #475569;
        transition: all 0.2s;
        position: relative;
        z-index: 1;
      }

      .tool-button:hover {
        border-color: #3b82f6;
        background: #f0f9ff;
        transform: translateY(-2px) scale(1.02);
        box-shadow: 0 4px 12px -2px rgba(59, 130, 246, 0.25);
      }

      .tool-button:hover i {
        color: #3b82f6;
        transform: scale(1.1);
      }

      .tool-button.primary {
        border-color: #3b82f6;
        background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%);
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      .tool-button.primary i {
        color: #2563eb;
      }

      .tool-button.active {
        border-color: #3b82f6;
        background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
        box-shadow:
          0 0 0 3px rgba(59, 130, 246, 0.15),
          inset 0 2px 4px rgba(59, 130, 246, 0.1);
      }

      .tool-button.active i {
        color: #1e40af;
        font-weight: 600;
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
        background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
      }

      .tool-button.danger.active i {
        color: #dc2626;
      }

      /* Style Settings */
      .style-control-compact {
        display: flex;
        flex-direction: column;
        gap: 0.625rem;
        padding: 0.5rem;
        background: rgba(255, 255, 255, 0.8);
        border-radius: 0.5rem;
        border: 1px solid #e2e8f0;
      }

      .color-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
      }

      .control-label-inline {
        font-size: 0.75rem;
        font-weight: 600;
        color: #475569;
        text-transform: uppercase;
        letter-spacing: 0.025em;
        min-width: 50px;
      }

      .color-input-wrapper {
        display: flex;
        align-items: center;
        gap: 0.375rem;
      }

      .fill-section {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
      }

      .fill-section .control-label-inline {
        margin-bottom: 0.125rem;
      }

      .fill-controls-row {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 0.5rem;
      }

      .fill-checkbox {
        flex-shrink: 0;
        display: flex;
        align-items: center;
      }

      .fill-checkbox ::ng-deep .p-checkbox {
        width: 1.125rem;
        height: 1.125rem;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .fill-checkbox ::ng-deep .p-checkbox-box {
        width: 1.125rem;
        height: 1.125rem;
        border: 2px solid #94a3b8;
        border-radius: 0.25rem;
        background: white;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .fill-checkbox ::ng-deep .p-checkbox-box:hover {
        border-color: #3b82f6;
        background: #f0f9ff;
      }

      .fill-checkbox ::ng-deep .p-checkbox-box.p-checked {
        background: #3b82f6;
        border-color: #2563eb;
      }

      .fill-checkbox ::ng-deep .p-checkbox-box .p-checkbox-icon {
        font-size: 0.875rem;
        color: white;
        font-weight: bold;
      }

      .control-label-slider {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 0.75rem;
        font-weight: 600;
        color: #475569;
        margin-bottom: 0.375rem;
        text-transform: uppercase;
        letter-spacing: 0.025em;
      }

      .value-badge {
        display: inline-block;
        padding: 0.125rem 0.5rem;
        background: #3b82f6;
        color: white;
        border-radius: 1rem;
        font-size: 0.6875rem;
        font-weight: 700;
        letter-spacing: 0;
        text-transform: none;
        min-width: 42px;
        text-align: center;
      }

      .compact-slider {
        width: 100%;
      }

      /* Action Buttons */
      .action-buttons-compact {
        display: flex;
        gap: 0.25rem;
        padding: 0.25rem;
        background: rgba(255, 255, 255, 0.6);
        border-radius: 0.375rem;
        border: 1px solid #e2e8f0;
      }

      .action-button-compact {
        flex: 1;
        aspect-ratio: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        border: 1.5px solid #cbd5e1;
        border-radius: 0.25rem;
        background: #ffffff;
        cursor: pointer;
        transition: all 0.2s;
      }

      .action-button-compact i {
        font-size: 0.875rem;
        color: #64748b;
        transition: all 0.2s;
      }

      .action-button-compact:hover:not(:disabled) {
        border-color: #3b82f6;
        background: #f0f9ff;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px -2px rgba(59, 130, 246, 0.25);
      }

      .action-button-compact:hover:not(:disabled) i {
        color: #3b82f6;
        transform: scale(1.15);
      }

      .action-button-compact.danger:hover:not(:disabled) {
        border-color: #ef4444;
        background: #fef2f2;
        box-shadow: 0 4px 8px -2px rgba(239, 68, 68, 0.25);
      }

      .action-button-compact.danger:hover:not(:disabled) i {
        color: #ef4444;
      }

      .action-button-compact:disabled {
        opacity: 0.3;
        cursor: not-allowed;
        border-color: #e2e8f0;
        background: #f8fafc;
      }

      .action-button-compact:disabled i {
        color: #cbd5e1;
      }

      @media (max-width: 768px) {
        .tools-sidebar {
          width: 60px;
          padding: 0.5rem;
        }

        .section-title span,
        .section-icon,
        .section-divider,
        .style-control-compact {
          display: none;
        }

        .tools-grid-2col {
          grid-template-columns: 1fr;
        }

        .action-buttons-compact {
          flex-direction: column;
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
    | 'fill'
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

  /** Current rotation angle */
  @Input() set rotation(value: number) {
    this.localRotation = value;
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
    | 'fill'
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
  @Output() rotationChanged = new EventEmitter<number>();

  // Local state for style controls
  localStrokeColor = '#000000';
  localStrokeWidth = 2;
  localFillColor = '#cccccc';
  localFillEnabled = false;
  localRotation = 0;

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
      | 'fill'
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

  /**
   * Handles rotation change.
   */
  onRotationChange(event: any): void {
    this.rotationChanged.emit(event.value);
  }
}
