import { Component, output, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

/**
 * Drawing toolbar component for tool selection.
 * Provides buttons for line, polygon, select, and delete tools with keyboard shortcuts.
 */
@Component({
  selector: 'app-drawing-toolbar',
  standalone: true,
  imports: [CommonModule, ToolbarModule, ButtonModule, TooltipModule],
  templateUrl: './drawing-toolbar.component.html',
  styleUrls: ['./drawing-toolbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrawingToolbarComponent {
  /**
   * Currently active tool input.
   */
  readonly currentTool = input.required<'line' | 'polygon' | 'select' | 'delete'>();

  /**
   * Whether undo is available.
   */
  readonly canUndo = input<boolean>(false);

  /**
   * Whether redo is available.
   */
  readonly canRedo = input<boolean>(false);

  /**
   * Event emitted when a tool is selected.
   */
  readonly toolSelected = output<'line' | 'polygon' | 'select' | 'delete'>();

  /**
   * Event emitted when undo is clicked.
   */
  readonly undoClicked = output<void>();

  /**
   * Event emitted when redo is clicked.
   */
  readonly redoClicked = output<void>();

  /**
   * Event emitted when clear all is clicked.
   */
  readonly clearAllClicked = output<void>();

  /**
   * Handles tool button click.
   * @param tool - Tool to select
   */
  onToolSelect(tool: 'line' | 'polygon' | 'select' | 'delete'): void {
    this.toolSelected.emit(tool);
  }

  /**
   * Handles undo button click.
   */
  onUndo(): void {
    this.undoClicked.emit();
  }

  /**
   * Handles redo button click.
   */
  onRedo(): void {
    this.redoClicked.emit();
  }

  /**
   * Handles clear all button click.
   */
  onClearAll(): void {
    this.clearAllClicked.emit();
  }

  /**
   * Checks if a tool is currently active.
   * @param tool - Tool to check
   * @returns True if tool is active
   */
  isToolActive(tool: 'line' | 'polygon' | 'select' | 'delete'): boolean {
    return this.currentTool() === tool;
  }
}
