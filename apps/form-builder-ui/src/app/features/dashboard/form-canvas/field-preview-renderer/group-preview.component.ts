import { Component, Input, ChangeDetectionStrategy, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { FormField, GroupMetadata } from '@nodeangularfullstack/shared';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';

/**
 * Group preview component for GROUP field type.
 * Renders a container with configurable border, background, and collapsible functionality.
 * Supports nesting child fields via drag-and-drop.
 */
@Component({
  selector: 'app-group-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CardModule, DragDropModule],
  template: `
    <div
      class="group-preview-container"
      [ngClass]="{
        'border-solid': borderStyle === 'solid',
        'border-dashed': borderStyle === 'dashed',
        'border-none': borderStyle === 'none'
      }"
      [ngStyle]="{ 'background-color': backgroundColor }"
    >
      <!-- Group Header -->
      <div class="group-header flex items-center justify-between p-3 border-b border-gray-200">
        <div class="flex items-center gap-2">
          <i class="pi pi-objects-column text-blue-600"></i>
          @if (groupTitle) {
            <span class="font-semibold text-gray-800">{{ groupTitle }}</span>
          } @else {
            <span class="font-semibold text-gray-400 italic">Untitled Group</span>
          }
        </div>
        @if (isCollapsible) {
          <button
            type="button"
            class="collapse-toggle p-2 hover:bg-gray-100 rounded transition-colors"
            (click)="toggleCollapse()"
          >
            <i
              [class]="isCollapsed() ? 'pi pi-chevron-down' : 'pi pi-chevron-up'"
              class="text-gray-600"
            ></i>
          </button>
        }
      </div>

      <!-- Group Content Area -->
      @if (!isCollapsed()) {
        <div
          class="group-content p-4 min-h-[120px]"
          cdkDropList
          [id]="dropListId"
          [cdkDropListData]="childFields"
          (cdkDropListDropped)="onDrop($event)"
        >
          <!-- Placeholder when empty -->
          @if (!childFields || childFields.length === 0) {
            <div class="empty-placeholder text-center py-8 text-gray-400 border-2 border-dashed border-gray-300 rounded bg-gray-50">
              <i class="pi pi-inbox text-3xl mb-2 block"></i>
              <p class="text-sm">Drag fields here to add to group</p>
            </div>
          } @else {
            <ng-content></ng-content>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .group-preview-container {
        border-width: 2px;
        border-color: #e5e7eb;
        border-radius: 8px;
        background-color: #ffffff;
        margin: 8px 0;
      }

      .group-preview-container.border-solid {
        border-style: solid;
      }

      .group-preview-container.border-dashed {
        border-style: dashed;
      }

      .group-preview-container.border-none {
        border-style: none;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .group-header {
        background-color: rgba(249, 250, 251, 0.5);
      }

      .collapse-toggle {
        cursor: pointer;
        border: none;
        background: transparent;
      }

      .collapse-toggle:focus {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
      }

      .group-content {
        transition: all 0.3s ease;
        position: relative;
      }

      .group-content.cdk-drop-list-dragging {
        background-color: #eff6ff;
        border: 2px dashed #60a5fa;
        border-radius: 4px;
      }

      .empty-placeholder {
        user-select: none;
        pointer-events: none;
      }

      .cdk-drag-placeholder {
        opacity: 0.4;
        background: #dbeafe;
        border: 2px dashed #3b82f6;
        border-radius: 8px;
        min-height: 60px;
      }

      .cdk-drag-animating {
        transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
      }

      .cdk-drop-list-dragging .group-content:not(.cdk-drag-placeholder) {
        transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
      }
    `,
  ],
})
export class GroupPreviewComponent {
  @Input({ required: true }) field!: FormField;
  @Input() childFields: FormField[] = [];
  @Input() dropListId = '';
  @Output() drop = new EventEmitter<CdkDragDrop<FormField[]>>();

  /**
   * Signal to track collapsed state of the group
   */
  protected isCollapsed = signal(false);

  /**
   * Get group title from field metadata.
   * @returns Group title or undefined if not set
   */
  protected get groupTitle(): string | undefined {
    const metadata = this.field.metadata as GroupMetadata | undefined;
    return metadata?.groupTitle;
  }

  /**
   * Get border style from field metadata with fallback to solid.
   * @returns Border style: 'solid', 'dashed', or 'none'
   */
  protected get borderStyle(): 'solid' | 'dashed' | 'none' {
    const metadata = this.field.metadata as GroupMetadata | undefined;
    return metadata?.groupBorderStyle || 'solid';
  }

  /**
   * Determine if group is collapsible from field metadata.
   * @returns True if group should show collapse/expand toggle
   */
  protected get isCollapsible(): boolean {
    const metadata = this.field.metadata as GroupMetadata | undefined;
    return metadata?.groupCollapsible || false;
  }

  /**
   * Get background color from field metadata with fallback to white.
   * @returns Hex color string for group background
   */
  protected get backgroundColor(): string {
    const metadata = this.field.metadata as GroupMetadata | undefined;
    return metadata?.groupBackgroundColor || '#ffffff';
  }

  /**
   * Toggle the collapsed state of the group
   */
  protected toggleCollapse(): void {
    this.isCollapsed.update((collapsed) => !collapsed);
  }

  protected onDrop(event: CdkDragDrop<FormField[]>): void {
    this.drop.emit(event);
  }
}
