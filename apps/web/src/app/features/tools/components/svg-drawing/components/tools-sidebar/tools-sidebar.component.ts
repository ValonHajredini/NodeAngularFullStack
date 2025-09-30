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

        <button
          pButton
          type="button"
          [class.active]="currentTool() === 'line'"
          class="tool-button"
          (click)="onToolSelect('line')"
        >
          <i class="pi pi-minus text-xl"></i>
          <div class="tool-info">
            <span class="tool-name">Line</span>
            <span class="tool-shortcut">L</span>
          </div>
        </button>

        <button
          pButton
          type="button"
          [class.active]="currentTool() === 'polygon'"
          class="tool-button"
          (click)="onToolSelect('polygon')"
        >
          <i class="pi pi-stop text-xl"></i>
          <div class="tool-info">
            <span class="tool-name">Polygon</span>
            <span class="tool-shortcut">P</span>
          </div>
        </button>

        <button
          pButton
          type="button"
          [class.active]="currentTool() === 'select'"
          class="tool-button"
          (click)="onToolSelect('select')"
        >
          <i class="pi pi-arrow-up-right text-xl"></i>
          <div class="tool-info">
            <span class="tool-name">Select</span>
            <span class="tool-shortcut">S</span>
          </div>
        </button>

        <button
          pButton
          type="button"
          [class.active]="currentTool() === 'delete'"
          class="tool-button danger"
          (click)="onToolSelect('delete')"
        >
          <i class="pi pi-trash text-xl"></i>
          <div class="tool-info">
            <span class="tool-name">Delete</span>
            <span class="tool-shortcut">Del</span>
          </div>
        </button>
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
        width: 200px;
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

      .tool-button {
        width: 100%;
        height: 70px;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem;
        border: 2px solid #e5e7eb;
        border-radius: 0.5rem;
        background: white;
        cursor: pointer;
        transition: all 0.2s;
      }

      .tool-button:hover {
        border-color: #3b82f6;
        background: #eff6ff;
        transform: translateY(-1px);
      }

      .tool-button.active {
        border-color: #3b82f6;
        background: #dbeafe;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      .tool-button.danger:hover {
        border-color: #ef4444;
        background: #fef2f2;
      }

      .tool-button.danger.active {
        border-color: #ef4444;
        background: #fee2e2;
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
      }

      .tool-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.25rem;
      }

      .tool-name {
        font-size: 0.875rem;
        font-weight: 600;
        color: #374151;
      }

      .tool-shortcut {
        font-size: 0.75rem;
        color: #9ca3af;
        font-family: monospace;
      }

      .action-button {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 0.5rem;
        padding: 0.625rem 0.75rem;
        border: 1px solid #e5e7eb;
        border-radius: 0.375rem;
        background: white;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 0.875rem;
      }

      .action-button:hover:not(:disabled) {
        border-color: #3b82f6;
        background: #eff6ff;
      }

      .action-button.danger:hover:not(:disabled) {
        border-color: #ef4444;
        background: #fef2f2;
      }

      .action-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .action-button i {
        font-size: 1rem;
      }

      @media (max-width: 768px) {
        .tools-sidebar {
          width: 60px;
          padding: 0.5rem;
        }

        .section-title,
        .tool-info,
        .action-button span {
          display: none;
        }

        .tool-button {
          height: 50px;
          justify-content: center;
        }

        .action-button {
          justify-content: center;
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
