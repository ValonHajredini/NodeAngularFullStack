import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonDirective } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

/**
 * Tools sidebar component for SVG drawing.
 * Vertical layout with drawing tools, undo/redo, and actions.
 */
@Component({
  selector: 'app-tools-sidebar',
  standalone: true,
  imports: [CommonModule, ButtonDirective, TooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tools-sidebar">
      <!-- Drawing Tools Section -->
      <div class="tools-section">
        <h3 class="section-title">Drawing Tools</h3>

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
            [class.active]="currentTool() === 'polygon'"
            class="tool-button"
            (click)="onToolSelect('polygon')"
            pTooltip="Polygon (P)"
            tooltipPosition="bottom"
          >
            <i class="pi pi-stop"></i>
          </button>

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
        grid-template-columns: repeat(2, 1fr);
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

      @media (max-width: 768px) {
        .tools-sidebar {
          width: 60px;
          padding: 0.5rem;
        }

        .section-title,
        .action-button span {
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
  @Input() currentTool!: () => 'line' | 'polygon' | 'select' | 'delete';

  /** Whether undo is available */
  @Input() canUndo!: () => boolean;

  /** Whether redo is available */
  @Input() canRedo!: () => boolean;

  /** Tool selection event */
  @Output() toolSelected = new EventEmitter<'line' | 'polygon' | 'select' | 'delete'>();

  /** Undo event */
  @Output() undoClicked = new EventEmitter<void>();

  /** Redo event */
  @Output() redoClicked = new EventEmitter<void>();

  /** Clear all event */
  @Output() clearAllClicked = new EventEmitter<void>();

  /**
   * Handles tool selection.
   */
  onToolSelect(tool: 'line' | 'polygon' | 'select' | 'delete'): void {
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
}
