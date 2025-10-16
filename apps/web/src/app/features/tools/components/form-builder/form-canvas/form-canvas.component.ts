import {
  Component,
  ChangeDetectionStrategy,
  Output,
  EventEmitter,
  Input,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop, CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FormField, FormFieldType, FieldPosition } from '@nodeangularfullstack/shared';
import { FormBuilderService } from '../form-builder.service';
import { FormSettings } from '../form-settings/form-settings.component';
import { FieldPreviewRendererComponent } from './field-preview-renderer/field-preview-renderer.component';
import { GroupPreviewComponent } from './field-preview-renderer/group-preview.component';
import { sanitizeCustomBackground } from '../../../../../shared/utils/sanitizer';
import { validateCSS, stripDangerousCSS } from '../../../../../shared/utils/css-validator';

interface FieldTypeDefinition {
  type: FormFieldType;
  icon: string;
  label: string;
}

/**
 * Form canvas component for displaying and managing form fields.
 * Shows the current form structure and allows field selection.
 */
@Component({
  selector: 'app-form-canvas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DragDropModule, FieldPreviewRendererComponent, GroupPreviewComponent],
  template: `
    <div class="form-canvas h-full bg-gray-50 p-6 theme-transition">
      <!-- Step Navigation Tabs (shown when step mode enabled) -->
      @if (stepFormEnabled()) {
        <div class="step-navigation-container mb-6">
          <div
            class="step-tabs-bar flex items-center gap-2 border-b theme-transition pb-0 overflow-x-auto"
          >
            @for (step of steps(); track step.id) {
              <button
                type="button"
                class="step-tab flex items-center gap-2 px-4 py-2 rounded-t-md border border-b-0 theme-container theme-text-primary hover:opacity-80 theme-transition whitespace-nowrap"
                [class.active]="step.id === activeStepId()"
                [attr.aria-selected]="step.id === activeStepId()"
                [attr.aria-label]="'Switch to ' + step.title"
                (click)="onStepTabClick(step.id)"
              >
                <span
                  class="step-number flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-sm font-bold theme-transition"
                >
                  {{ step.order + 1 }}
                </span>
                <span class="step-title truncate max-w-[150px]">{{ step.title }}</span>
              </button>
            }
          </div>

          <!-- Step Indicator Badge -->
          <div
            class="step-indicator-bar flex items-center gap-3 px-4 py-3 theme-container border-b theme-transition"
          >
            <span
              class="badge-primary inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-primary-100 text-primary-700 theme-transition"
            >
              Step {{ activeStepOrder() + 1 }} of {{ steps().length }}
            </span>
            <span class="theme-text-primary font-medium">{{ activeStep()?.title }}</span>
            @if (activeStep()?.description) {
              <span class="text-sm theme-text-secondary">{{ activeStep()?.description }}</span>
            }
          </div>
        </div>
      }

      @if (!formBuilderService.hasFields() && !formBuilderService.rowLayoutEnabled()) {
        <div
          class="drop-zone empty min-h-full flex flex-col items-center justify-center text-center py-20"
          cdkDropList
          #canvasDropList="cdkDropList"
          id="canvas-drop-list"
          [cdkDropListData]="formBuilderService.formFields()"
          (cdkDropListDropped)="onFieldDropped($event)"
        >
          <i class="pi pi-file-edit text-6xl theme-text-secondary mb-4 theme-transition"></i>
          <h3 class="text-xl font-semibold theme-heading mb-2">Start Building Your Form</h3>
          <p class="theme-text-secondary max-w-md">
            Drag fields from the palette to start building your form
          </p>
        </div>
      } @else {
        <div
          class="form-fields-wrapper"
          [style.position]="hasBackgroundImage() || hasCustomBackground() ? 'relative' : ''"
        >
          <!-- Background layer with blur -->
          @if (hasBackgroundImage()) {
            <div
              class="background-layer"
              [ngStyle]="getBackgroundStyles()"
              style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 0;"
            ></div>
          }

          <!-- Custom Background (Sandboxed) -->
          @if (hasCustomBackground()) {
            <iframe
              [srcdoc]="getSandboxedPreviewHTML()"
              sandbox="allow-same-origin"
              class="custom-background-preview"
              style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; border: none; background: transparent;"
            ></iframe>
          }

          <!-- Background overlay for opacity control -->
          @if (shouldShowBackgroundOverlay()) {
            <div
              class="background-overlay"
              [style.opacity]="1 - getBackgroundOpacity()"
              style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: white; pointer-events: none; z-index: 1;"
            ></div>
          }

          <div class="mb-4" style="position: relative; z-index: 2;">
            <h3 class="text-lg font-semibold theme-heading">
              {{ settings.title || 'Untitled Form' }}
            </h3>
            <p class="text-sm theme-text-secondary">
              This is a live preview of your form. Click on a field to edit its properties
              @if (settings.columnLayout > 1) {
                <span class="ml-2 theme-text-primary font-medium"
                  >{{ settings.columnLayout }} columns</span
                >
              }
            </p>
            @if (settings.description) {
              <p class="text-sm theme-text-secondary mt-1">{{ settings.description }}</p>
            }
          </div>

          @if (formBuilderService.rowLayoutEnabled()) {
            <!-- Row-based layout mode -->
            @if (stepFormEnabled() && visibleRows().length === 0 && visibleFields().length === 0) {
              <!-- Empty step placeholder -->
              <div
                class="empty-step-state flex flex-col items-center justify-center min-h-[400px] p-8 text-center"
                style="position: relative; z-index: 2;"
              >
                <div class="empty-icon mb-4">
                  <i
                    class="pi pi-inbox theme-text-secondary theme-transition"
                    style="font-size: 6rem;"
                  ></i>
                </div>
                <h3 class="text-xl font-semibold theme-heading mb-2">
                  No fields in Step {{ activeStepOrder() + 1 }} yet
                </h3>
                <p class="theme-text-secondary mb-4 max-w-md">
                  Drag field types from the palette on the left to add them to this step.
                </p>
                <p
                  class="flex items-center gap-2 text-sm theme-text-secondary bg-blue-50 px-4 py-2 rounded-md"
                >
                  <i class="pi pi-info-circle"></i>
                  You can organize fields within this step using rows and columns.
                </p>
              </div>
            } @else {
              <div class="row-layout-container space-y-4" style="position: relative; z-index: 2;">
                @for (row of visibleRows(); track row.rowId) {
                  <div class="row-wrapper">
                    <!-- Row separator with label -->
                    <div class="row-separator mb-2 flex items-center gap-2">
                      <span class="text-sm font-medium theme-text-primary">
                        Row {{ row.order + 1 }} ({{ row.columnCount }} columns)
                      </span>
                      <div class="flex-1 h-px bg-gray-300"></div>
                    </div>

                    <!-- Row columns grid -->
                    <div
                      class="row-grid"
                      [style.grid-template-columns]="'repeat(' + row.columnCount + ', 1fr)'"
                      style="display: grid; gap: 16px; min-height: 120px;"
                    >
                      @for (columnIndex of getColumnIndices(row.columnCount); track columnIndex) {
                        <div
                          class="column-drop-zone"
                          [attr.data-row-id]="row.rowId"
                          [attr.data-column-index]="columnIndex"
                          [class.occupied]="getFieldsInColumn(row.rowId, columnIndex).length > 0"
                          cdkDropList
                          [cdkDropListData]="{ rowId: row.rowId, columnIndex: columnIndex }"
                          [cdkDropListEnterPredicate]="canDropIntoColumn"
                          (cdkDropListDropped)="onFieldDroppedInRow($event)"
                        >
                          @if (getFieldsInColumn(row.rowId, columnIndex); as columnFields) {
                            @if (columnFields.length > 0) {
                              <!-- Occupied column: render fields vertically stacked -->
                              <div class="column-fields-container">
                                @for (
                                  field of columnFields;
                                  track field.id;
                                  let fieldIndex = $index
                                ) {
                                  <!-- Field wrapper with drag support -->
                                  <div class="field-wrapper mb-3" cdkDrag [cdkDragData]="field">
                                    <div
                                      class="field-preview-container p-4 theme-container theme-transition relative group"
                                      [class.theme-card]="isFieldSelected(field)"
                                      [class.last:mb-0]="fieldIndex === columnFields.length - 1"
                                      (click)="onFieldClicked(field)"
                                      tabindex="0"
                                      role="listitem"
                                      [attr.aria-label]="field.label + ' field'"
                                    >
                                      <!-- Delete Button (Top Right) -->
                                      <button
                                        type="button"
                                        class="delete-button-card absolute top-2 right-2 opacity-0 group-hover:opacity-100 theme-transition z-10"
                                        (click)="onDeleteFieldFromCard($event, field)"
                                        [attr.aria-label]="'Delete ' + field.label"
                                        title="Delete field"
                                      >
                                        <i
                                          class="pi pi-times text-red-500 hover:text-red-700 theme-transition"
                                        ></i>
                                      </button>

                                      <div
                                        class="field-preview-content cursor-pointer"
                                        (click)="onFieldPreviewClicked($event, field)"
                                      >
                                        <app-field-preview-renderer
                                          [field]="field"
                                          (labelChanged)="onLabelChanged(field, $event)"
                                          (settingsClick)="openSettingsModal(field)"
                                          (fieldUpdated)="onFieldUpdated(field.id, $event)"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                }
                              </div>
                            } @else {
                              <!-- Empty column: placeholder -->
                              <div class="empty-column-placeholder">
                                <i
                                  class="pi pi-inbox theme-text-secondary text-2xl mb-2 theme-transition"
                                ></i>
                                <span class="text-xs theme-text-secondary">Drop field here</span>
                              </div>
                            }
                          }
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          } @else {
            <!-- Global column layout mode (existing functionality) -->
            <div
              cdkDropList
              #canvasDropList="cdkDropList"
              id="canvas-drop-list"
              [cdkDropListData]="formBuilderService.formFields()"
              (cdkDropListDropped)="onFieldDropped($event)"
              class="form-fields-grid"
              [ngClass]="[getGridClass(), getSpacingClass()]"
              style="position: relative; z-index: 2;"
            >
              @for (field of formBuilderService.formFields(); track field.id; let i = $index) {
                <div
                  cdkDrag
                  [cdkDragData]="field"
                  [cdkDragDisabled]="field.type === FormFieldType.GROUP"
                  class="field-preview-container p-4 theme-container theme-transition relative group"
                  [class.theme-card]="isFieldSelected(field)"
                  (click)="onFieldClicked(field)"
                  tabindex="0"
                  role="listitem"
                  [attr.aria-label]="field.label + ' field'"
                  (keydown)="handleKeyboard($event, field, i)"
                >
                  <!-- Drag Handle (Top Left) -->
                  @if (field.type !== FormFieldType.GROUP) {
                    <div
                      class="absolute top-2 left-2 opacity-0 group-hover:opacity-100 theme-transition z-10"
                    >
                      <i
                        class="pi pi-bars theme-text-secondary cursor-move hover:opacity-80 text-lg theme-transition"
                        cdkDragHandle
                        aria-label="Reorder field"
                      ></i>
                    </div>
                  }

                  <!-- Delete Button (Top Right) -->
                  <button
                    type="button"
                    class="delete-button-card absolute top-2 right-2 opacity-0 group-hover:opacity-100 theme-transition z-10"
                    (click)="onDeleteFieldFromCard($event, field)"
                    [attr.aria-label]="'Delete ' + field.label"
                    title="Delete field"
                  >
                    <i class="pi pi-times text-red-500 hover:text-red-700 theme-transition"></i>
                  </button>
                  @if (field.type === FormFieldType.GROUP) {
                    <!-- Group fields - no click handler to allow drop zone interaction -->
                    <div class="field-preview-content">
                      @let childFields = getChildFields(field.id);
                      <app-group-preview
                        [field]="field"
                        [childFields]="childFields"
                        [dropListId]="getGroupDropListId(field.id)"
                        (drop)="onGroupDrop($event, field)"
                      >
                        @for (child of childFields; track child.id; let childIndex = $index) {
                          <div
                            cdkDrag
                            [cdkDragData]="child"
                            class="field-preview-container p-4 theme-container theme-transition relative group mb-3"
                            [class.theme-card]="isFieldSelected(child)"
                            (click)="onFieldClicked(child)"
                            tabindex="0"
                            role="listitem"
                            [attr.aria-label]="child.label + ' field'"
                            (keydown)="handleGroupKeyboard($event, child, field.id, childIndex)"
                          >
                            <!-- Drag Handle (Top Left) -->
                            <div
                              class="absolute top-2 left-2 opacity-0 group-hover:opacity-100 theme-transition z-10"
                            >
                              <i
                                class="pi pi-bars theme-text-secondary cursor-move hover:opacity-80 text-lg theme-transition"
                                cdkDragHandle
                                aria-label="Reorder field"
                              ></i>
                            </div>

                            <!-- Delete Button (Top Right) -->
                            <button
                              type="button"
                              class="delete-button-card absolute top-2 right-2 opacity-0 group-hover:opacity-100 theme-transition z-10"
                              (click)="onDeleteFieldFromCard($event, child)"
                              [attr.aria-label]="'Delete ' + child.label"
                              title="Delete field"
                            >
                              <i
                                class="pi pi-times text-red-500 hover:text-red-700 theme-transition"
                              ></i>
                            </button>
                            <div
                              class="field-preview-content group cursor-pointer"
                              (click)="onFieldPreviewClicked($event, child)"
                            >
                              <app-field-preview-renderer
                                [field]="child"
                                (labelChanged)="onLabelChanged(child, $event)"
                                (settingsClick)="openSettingsModal(child)"
                                (fieldUpdated)="onFieldUpdated(child.id, $event)"
                              />
                            </div>

                            <div *cdkDragPlaceholder class="field-placeholder"></div>
                          </div>
                        }
                      </app-group-preview>
                    </div>
                  } @else {
                    <div
                      class="field-preview-content group cursor-pointer"
                      (click)="onFieldPreviewClicked($event, field)"
                    >
                      <app-field-preview-renderer
                        [field]="field"
                        (labelChanged)="onLabelChanged(field, $event)"
                        (settingsClick)="openSettingsModal(field)"
                        (fieldUpdated)="onFieldUpdated(field.id, $event)"
                      />
                    </div>
                  }
                </div>
              }

              <div *cdkDragPlaceholder class="field-placeholder"></div>
            </div>
          }
        </div>
      }

      <!-- Field Settings Modal removed - now handled by parent UnifiedFieldEditorModal (Story 16.8) -->
    </div>
  `,
  styles: [
    `
      .form-canvas {
        min-height: 400px;
      }

      .drop-zone {
        min-height: 400px;
        transition: border-color 200ms;
      }

      .drop-zone.empty {
        border: 2px dashed #e5e7eb;
        border-radius: 8px;
      }

      .drop-zone.cdk-drop-list-dragging {
        border-color: #60a5fa;
        background-color: #eff6ff;
      }

      .form-fields-grid {
        display: grid;
        gap: 1rem;
        min-height: 200px;
      }

      .form-fields-grid.spacing-compact {
        gap: 0.5rem;
      }

      .form-fields-grid.spacing-normal {
        gap: 1rem;
      }

      .form-fields-grid.spacing-relaxed {
        gap: 1.5rem;
      }

      .form-fields-grid.grid-cols-1 {
        grid-template-columns: 1fr;
      }

      .form-fields-grid.grid-cols-2 {
        grid-template-columns: repeat(2, 1fr);
      }

      .form-fields-grid.grid-cols-3 {
        grid-template-columns: repeat(3, 1fr);
      }

      .field-preview-container {
        user-select: none;
        cursor: pointer;
      }

      .field-preview-container:hover {
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
      }

      .field-preview-container:focus {
        outline: 2px solid #60a5fa;
        outline-offset: 2px;
      }

      .field-preview-header {
        cursor: pointer;
      }

      .delete-button-card {
        background: white;
        border: 1px solid #fee2e2;
        border-radius: 0.375rem;
        padding: 0.375rem 0.5rem;
        cursor: pointer;
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      }

      .delete-button-card:hover {
        background: #fef2f2;
        border-color: #ef4444;
      }

      .field-preview-content {
        cursor: pointer;
        position: relative;
      }

      .field-placeholder {
        background: #dbeafe;
        border: 2px dashed #3b82f6;
        border-radius: 8px;
        min-height: 60px;
      }

      .cdk-drag-preview {
        opacity: 0.8;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
      }

      .cdk-drag-animating {
        transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
      }

      .cdk-drop-list-dragging .field-preview-container:not(.cdk-drag-placeholder) {
        transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
      }

      /* Responsive breakpoints */
      @media (max-width: 768px) {
        .form-fields-grid {
          grid-template-columns: 1fr !important;
        }
      }

      /* Row layout styles */
      .row-layout-container {
        .row-grid {
          display: grid;
          gap: 16px;
          min-height: 120px;
        }

        .column-drop-zone {
          border: 2px dashed #d1d5db;
          border-radius: 8px;
          padding: 12px;
          background: #f9fafb;
          min-height: 100px;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          transition: all 0.2s ease;

          &.cdk-drop-list-dragging {
            border-color: #10b981;
            background: rgba(16, 185, 129, 0.1);
          }

          &.cdk-drop-list-receiving {
            border-color: #10b981;
            border-style: solid;
            background: rgba(16, 185, 129, 0.15);
          }

          &.occupied {
            border: 1px solid #e5e7eb;
            background: transparent;
            padding: 0;
          }
        }

        .column-fields-container {
          display: flex;
          flex-direction: column;
          gap: 0;
          width: 100%;
        }

        .empty-column-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          width: 100%;
          height: 100%;
          min-height: 100px;
        }

        .field-wrapper {
          cursor: move;
          width: 100%;
          margin-bottom: 12px;

          &:last-child {
            margin-bottom: 0;
          }

          &.cdk-drag-preview {
            opacity: 0.8;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
        }

        .row-separator {
          user-select: none;
        }
      }

      .global-layout-container {
        display: grid;
        gap: 16px;
        grid-auto-rows: auto;
      }

      /* Step navigation styles */
      .step-navigation-container {
        .step-tabs-bar {
          /* Horizontal scrolling for many steps */
          scrollbar-width: thin;
          scrollbar-color: #cbd5e0 #f7fafc;

          &::-webkit-scrollbar {
            height: 6px;
          }

          &::-webkit-scrollbar-track {
            background: #f7fafc;
          }

          &::-webkit-scrollbar-thumb {
            background: #cbd5e0;
            border-radius: 3px;
          }
        }

        .step-tab {
          &.active {
            background: white;
            border-color: #3b82f6;
            color: #1d4ed8;
            font-weight: 600;
            border-bottom: 2px solid white;
            position: relative;
            margin-bottom: -1px;

            .step-number {
              background: #3b82f6;
              color: white;
            }
          }
        }

        .step-indicator-bar {
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }
      }

      .empty-step-state {
        animation: fadeIn 0.3s ease-in;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class FormCanvasComponent {
  readonly formBuilderService = inject(FormBuilderService);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly FormFieldType = FormFieldType;

  private _settings = signal<FormSettings>({
    title: 'Untitled Form',
    description: '',
    columnLayout: 1,
    fieldSpacing: 'normal',
    successMessage: 'Thank you for your submission!',
    redirectUrl: '',
    allowMultipleSubmissions: true,
  });

  @Input()
  set settings(value: FormSettings) {
    this._settings.set(value);
  }
  get settings(): FormSettings {
    return this._settings();
  }

  @Output() fieldClicked = new EventEmitter<FormField>();

  // Step form computed signals
  protected readonly stepFormEnabled = this.formBuilderService.stepFormEnabled;
  protected readonly steps = this.formBuilderService.steps;
  protected readonly activeStepId = this.formBuilderService.activeStepId;
  protected readonly activeStep = this.formBuilderService.activeStep;
  protected readonly activeStepOrder = this.formBuilderService.activeStepOrder;

  /**
   * Computed signal: Visible fields filtered by active step
   * Returns all fields when step mode is disabled, or only fields for active step when enabled
   */
  protected readonly visibleFields = computed(() => {
    if (!this.stepFormEnabled()) {
      return this.formBuilderService.formFields();
    }
    const activeId = this.activeStepId();
    if (!activeId) return [];
    return this.formBuilderService
      .formFields()
      .filter((field) => field.position?.stepId === activeId);
  });

  /**
   * Computed signal: Visible rows filtered by active step
   * Returns all rows when step mode is disabled, or only rows for active step when enabled
   */
  protected readonly visibleRows = computed(() => {
    const rows = this.formBuilderService.rowConfigs();
    if (!this.stepFormEnabled()) {
      return rows;
    }
    const activeId = this.activeStepId();
    if (!activeId) return [];
    return rows.filter((row) => row.stepId === activeId);
  });

  /**
   * Check if background image exists with URL (from settings)
   */
  protected readonly hasBackgroundImage = computed(() => {
    const s = this._settings();
    return (
      s.backgroundType === 'image' &&
      s.backgroundImageUrl !== undefined &&
      s.backgroundImageUrl !== ''
    );
  });

  /**
   * Check if custom background exists with HTML/CSS (from settings)
   */
  protected readonly hasCustomBackground = computed(() => {
    const s = this._settings();
    return (
      s.backgroundType === 'custom' &&
      (s.backgroundCustomHtml !== undefined || s.backgroundCustomCss !== undefined)
    );
  });

  /**
   * Handles drop events on the canvas.
   * Either adds a new field from the palette or reorders existing fields.
   * @param event - The CdkDragDrop event containing drag-drop metadata
   */
  onFieldDropped(event: CdkDragDrop<FormField[]>): void {
    const data = event.item.data;

    if (this.isFieldTypeDefinition(data)) {
      this.formBuilderService.addFieldFromType(data.type, event.currentIndex);
      return;
    }

    const field = data as FormField;

    if (event.previousContainer === event.container) {
      this.formBuilderService.reorderFields(event.previousIndex, event.currentIndex);
      return;
    }

    const previousContainerId = event.previousContainer.id;
    if (previousContainerId.startsWith('group-drop-')) {
      this.formBuilderService.assignFieldToGroup(field.id, null, event.currentIndex);
    } else {
      this.formBuilderService.reorderFields(event.previousIndex, event.currentIndex);
    }
  }

  /**
   * Handles drop interactions within a group container.
   * Supports adding new fields, moving fields between groups, and reordering children.
   */
  onGroupDrop(event: CdkDragDrop<FormField[]>, group: FormField): void {
    const data = event.item.data;
    const groupId = group.id;

    if (this.isFieldTypeDefinition(data)) {
      const newField = this.formBuilderService.addFieldFromType(data.type);
      this.formBuilderService.assignFieldToGroup(newField.id, groupId, event.currentIndex);
      return;
    }

    const field = data as FormField;
    this.formBuilderService.assignFieldToGroup(field.id, groupId, event.currentIndex);
  }

  /**
   * Keyboard interactions for fields within a group container.
   * Supports Enter/Space (select), ArrowUp/ArrowDown (reorder within group).
   * Note: Delete/Backspace functionality has been disabled to prevent accidental deletion.
   */
  handleGroupKeyboard(
    event: KeyboardEvent,
    field: FormField,
    groupId: string,
    index: number,
  ): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        // Don't handle space/enter if user is typing in an input field
        if (this.isUserTyping(event)) {
          return;
        }
        event.preventDefault();
        this.onFieldClicked(field);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (index > 0) {
          this.formBuilderService.assignFieldToGroup(field.id, groupId, index - 1);
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.formBuilderService.assignFieldToGroup(field.id, groupId, index + 1);
        break;
      // Backspace/Delete functionality disabled to prevent accidental field deletion
      // Users can still delete fields using the delete button or settings modal
      // case 'Delete':
      // case 'Backspace':
      //   if (!this.isUserTyping(event)) {
      //     event.preventDefault();
      //     this.formBuilderService.removeField(field.id);
      //   }
      //   break;
    }
  }

  /**
   * Retrieves child fields for a group.
   */
  getChildFields(groupId: string): FormField[] {
    return this.formBuilderService.getChildFields(groupId);
  }

  /**
   * Provides drop list IDs connected to the canvas drop zone.
   */
  getConnectedDropListsForCanvas(): string[] {
    return ['palette-drop-list', ...this.getAllGroupDropListIds()];
  }

  /**
   * Provides drop list IDs connected to a specific group.
   */
  getConnectedDropLists(groupId: string): string[] {
    return ['palette-drop-list', 'canvas-drop-list', ...this.getAllGroupDropListIds(groupId)];
  }

  /**
   * Generates the drop list ID for a group container.
   */
  getGroupDropListId(groupId: string): string {
    return `group-drop-${groupId}`;
  }

  protected getAllGroupDropListIds(excludeGroupId?: string): string[] {
    return this.formBuilderService
      .getAllFields()
      .filter((field) => field.type === FormFieldType.GROUP)
      .map((field) => this.getGroupDropListId(field.id))
      .filter((id) => !excludeGroupId || id !== this.getGroupDropListId(excludeGroupId));
  }

  private isFieldTypeDefinition(data: unknown): data is FieldTypeDefinition {
    return (
      !!data &&
      typeof data === 'object' &&
      'type' in (data as Record<string, unknown>) &&
      !('id' in (data as Record<string, unknown>))
    );
  }

  /**
   * Handles field selection when a user clicks on a field card.
   * Selects the field in the service and emits the fieldClicked event.
   * @param field - The FormField that was clicked
   */
  onFieldClicked(field: FormField): void {
    this.formBuilderService.selectField(field);
    this.fieldClicked.emit(field);
  }

  /**
   * Checks if a field is currently selected.
   * @param field - The FormField to check
   * @returns true if the field is selected, false otherwise
   */
  isFieldSelected(field: FormField): boolean {
    const selected = this.formBuilderService.selectedField();
    return selected?.id === field.id;
  }

  /**
   * Handles keyboard navigation and actions on fields.
   * Supports Enter/Space (select), ArrowUp/ArrowDown (reorder).
   * Note: Delete/Backspace functionality has been disabled to prevent accidental deletion.
   * @param event - The keyboard event
   * @param field - The FormField being interacted with
   * @param index - The index of the field in the fields array
   */
  handleKeyboard(event: KeyboardEvent, field: FormField, index: number): void {
    const fields = this.formBuilderService.formFields();

    switch (event.key) {
      case 'Enter':
      case ' ':
        // Don't handle space/enter if user is typing in an input field
        if (this.isUserTyping(event)) {
          return;
        }
        event.preventDefault();
        this.onFieldClicked(field);
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (index > 0) {
          this.formBuilderService.reorderFields(index, index - 1);
        }
        break;

      case 'ArrowDown':
        event.preventDefault();
        if (index < fields.length - 1) {
          this.formBuilderService.reorderFields(index, index + 1);
        }
        break;

      // Backspace/Delete functionality disabled to prevent accidental field deletion
      // Users can still delete fields using the delete button or settings modal
      // case 'Delete':
      // case 'Backspace':
      //   if (!this.isUserTyping(event)) {
      //     event.preventDefault();
      //     this.formBuilderService.removeField(field.id);
      //   }
      //   break;
    }
  }

  /**
   * Gets the PrimeNG icon class for a given field type.
   * @param type - The field type string (e.g., 'text', 'email', 'number')
   * @returns The PrimeNG icon class name (e.g., 'pi-pencil')
   */
  getFieldIcon(type: string): string {
    const iconMap: Record<string, string> = {
      text: 'pi-pencil',
      email: 'pi-envelope',
      number: 'pi-hashtag',
      select: 'pi-list',
      textarea: 'pi-align-left',
      file: 'pi-upload',
      checkbox: 'pi-check-square',
      radio: 'pi-circle',
      date: 'pi-calendar',
      datetime: 'pi-clock',
      toggle: 'pi-toggle-on',
      divider: 'pi-minus',
    };
    return iconMap[type] || 'pi-question';
  }

  /**
   * Gets the CSS grid class based on column layout.
   * @returns The grid class name for the current column layout
   */
  getGridClass(): string {
    return `grid-cols-${this.settings.columnLayout}`;
  }

  /**
   * Maps the spacing setting to a CSS class for grid gap control.
   */
  getSpacingClass(): string {
    switch (this.settings.fieldSpacing) {
      case 'compact':
        return 'spacing-compact';
      case 'relaxed':
        return 'spacing-relaxed';
      default:
        return 'spacing-normal';
    }
  }

  /**
   * Handles label changes from the inline label editor.
   * Updates the field's label property and auto-generates fieldName in the service.
   * @param field - The field being edited
   * @param newLabel - The new label value
   */
  onLabelChanged(field: FormField, newLabel: string): void {
    // Auto-generate fieldName from label (kebab-case)
    const generatedFieldName = this.generateFieldNameFromLabel(newLabel);

    // Update both label and fieldName
    this.formBuilderService.updateFieldProperties(field.id, {
      label: newLabel,
      fieldName: generatedFieldName,
    });
  }

  /**
   * Generates a kebab-case field name from a label.
   * @param label - The label to convert
   * @returns Kebab-case field name
   */
  private generateFieldNameFromLabel(label: string): string {
    return label
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .replace(/[^\w-]/g, '')
      .toLowerCase()
      .trim();
  }

  /**
   * Opens the unified field editor modal for a specific field.
   * Story 16.8: Simplified to emit fieldClicked event instead of managing separate modal.
   * Parent FormBuilderComponent handles the unified modal.
   * @param field - The field to edit settings for
   */
  openSettingsModal(field: FormField): void {
    this.formBuilderService.selectField(field);
    this.fieldClicked.emit(field);
  }

  /**
   * Handles field deletion from the card delete button.
   * Shows confirmation and removes the field.
   * @param event - The click event
   * @param field - The field to delete
   */
  onDeleteFieldFromCard(event: MouseEvent, field: FormField): void {
    event.stopPropagation();
    if (
      confirm(`Are you sure you want to delete "${field.label}"? This action cannot be undone.`)
    ) {
      this.formBuilderService.removeField(field.id);
    }
  }

  /**
   * Handles field updates from the field preview renderer (e.g., option changes).
   * @param fieldId - The ID of the field being updated
   * @param updates - Partial field object with updated properties
   */
  onFieldUpdated(fieldId: string, updates: Partial<FormField>): void {
    this.formBuilderService.updateFieldProperties(fieldId, updates);
  }

  /**
   * Handles clicks on the field preview area.
   * Opens the settings modal for the field.
   * @param event - The click event
   * @param field - The field being clicked
   */
  onFieldPreviewClicked(event: MouseEvent, field: FormField): void {
    // Check if the click target is an interactive element (input, button, etc.)
    const target = event.target as HTMLElement;
    const isInteractive =
      target.tagName === 'INPUT' ||
      target.tagName === 'BUTTON' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.closest('button') ||
      target.closest('p-button') ||
      target.closest('.pi-bars') ||
      target.closest('.inline-option-manager');

    // Only open modal if not clicking on interactive elements
    if (!isInteractive) {
      event.stopPropagation();
      this.openSettingsModal(field);
    } else {
      // For interactive elements, just stop propagation to prevent field selection
      event.stopPropagation();
    }
  }

  /**
   * Checks if the user is currently typing in an input field, textarea, or other editable element.
   * Used to prevent keyboard shortcuts from interfering with typing.
   * @param event - The keyboard event to check
   * @returns True if user is typing in an editable element, false otherwise
   */
  private isUserTyping(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement;

    // Check if target is an editable element
    const isEditable =
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable ||
      target.closest('input') !== null ||
      target.closest('textarea') !== null ||
      target.closest('select') !== null ||
      target.closest('[contenteditable="true"]') !== null;

    return isEditable;
  }

  /**
   * Get background image CSS url() value (from settings)
   * @returns CSS url() string or 'none'
   */
  getBackgroundImageStyle(): string {
    const s = this._settings();
    if (s.backgroundType !== 'image' || !s.backgroundImageUrl) {
      return 'none';
    }
    return `url(${s.backgroundImageUrl})`;
  }

  /**
   * Get background styles object for canvas (from settings)
   * @returns Object with CSS style properties
   */
  getBackgroundStyles(): Record<string, string> {
    const s = this._settings();
    if (s.backgroundType !== 'image' || !s.backgroundImageUrl) {
      return {};
    }

    const styles: Record<string, string> = {
      'background-image': `url(${s.backgroundImageUrl})`,
      'background-size': s.backgroundImagePosition ?? 'cover',
      'background-position': s.backgroundImageAlignment ?? 'center',
      'background-repeat': s.backgroundImagePosition === 'repeat' ? 'repeat' : 'no-repeat',
    };

    // Apply blur filter if specified
    if (s.backgroundImageBlur !== undefined && s.backgroundImageBlur > 0) {
      styles['filter'] = `blur(${s.backgroundImageBlur}px)`;
    }

    return styles;
  }

  /**
   * Get opacity value for background overlay (from settings)
   * @returns Opacity value as CSS decimal (0-1)
   */
  getBackgroundOpacity(): number {
    const s = this._settings();
    return s.backgroundImageOpacity !== undefined ? s.backgroundImageOpacity / 100 : 1;
  }

  /**
   * Check if background overlay should be shown (when opacity < 100%, from settings)
   * @returns True if overlay should be displayed
   */
  shouldShowBackgroundOverlay(): boolean {
    const s = this._settings();
    return (
      s.backgroundType === 'image' &&
      s.backgroundImageUrl !== undefined &&
      s.backgroundImageOpacity !== undefined &&
      s.backgroundImageOpacity < 100
    );
  }

  /**
   * Generates sandboxed iframe HTML for custom background preview (from settings)
   * Implements defense-in-depth security: sanitizes HTML, validates CSS, and uses restrictive sandbox
   * @returns SafeHtml for iframe srcdoc attribute
   */
  protected getSandboxedPreviewHTML(): SafeHtml {
    const s = this._settings();
    // Return empty if no custom background in settings
    if (s.backgroundType !== 'custom' || (!s.backgroundCustomHtml && !s.backgroundCustomCss)) {
      return this.sanitizer.bypassSecurityTrustHtml('');
    }

    // Sanitize HTML (already sanitized in settings dialog, but defense-in-depth)
    const sanitizedHTML = sanitizeCustomBackground(s.backgroundCustomHtml || '');

    // Validate and clean CSS
    const validatedCSS = this.validateAndCleanCSS(s.backgroundCustomCss || '');

    // Build iframe content with HTML5 DOCTYPE
    const iframeContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* Reset default styles */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: transparent;
    }
    /* User custom CSS */
    ${validatedCSS}
  </style>
</head>
<body>
  ${sanitizedHTML}
</body>
</html>`;

    // Bypass Angular's sanitization for srcdoc (safe because we've already sanitized)
    return this.sanitizer.bypassSecurityTrustHtml(iframeContent);
  }

  /**
   * Validates CSS and strips dangerous patterns
   * @param css - CSS code to validate
   * @returns Safe CSS code
   */
  private validateAndCleanCSS(css: string): string {
    if (!css || css.trim() === '') {
      return '';
    }

    // Validate CSS for dangerous patterns
    const validation = validateCSS(css);

    // If CSS has critical errors, return empty string
    if (!validation.isValid) {
      console.warn('Custom background CSS validation errors:', validation.errors);
      return '';
    }

    // Strip any dangerous patterns (defense-in-depth)
    return stripDangerousCSS(css);
  }

  /**
   * Get array of column indices for rendering columns in row layout
   * @param columnCount - Number of columns in the row
   * @returns Array of column indices [0, 1, 2, ...]
   */
  getColumnIndices(columnCount: number): number[] {
    return Array.from({ length: columnCount }, (_, i) => i);
  }

  /**
   * Get field at specific row-column position (legacy method for backward compatibility)
   * @param rowId - Row ID to search in
   * @param columnIndex - Column index within the row
   * @returns FormField if found, null otherwise
   * @deprecated Use getFieldsInColumn instead for multi-field column support
   */
  getFieldAtPosition(rowId: string, columnIndex: number): FormField | null {
    const fields = this.formBuilderService.getFieldsInColumn(rowId, columnIndex);
    return fields.length > 0 ? fields[0] : null;
  }

  /**
   * Get all fields in a specific column, sorted by orderInColumn.
   * @param rowId - Row ID to search in
   * @param columnIndex - Column index within the row
   * @returns Array of FormField objects in the column, sorted by orderInColumn
   */
  getFieldsInColumn(rowId: string, columnIndex: number): FormField[] {
    return this.formBuilderService.getFieldsInColumn(rowId, columnIndex);
  }

  /**
   * Can drop predicate for row-column drop zones.
   * With multi-field column support, all drops are now allowed (no more "occupied" restriction).
   * @param drag - The CDK dragged item
   * @param drop - The CDK drop list target
   * @returns Always returns true (all drops allowed)
   */
  canDropIntoColumn = (drag: CdkDrag, drop: CdkDropList): boolean => {
    // Multi-field column support: allow drops into any column
    return true;
  };

  /**
   * Handle field dropped into row-column position.
   * Creates new field from palette or moves existing field to new position.
   * Calculates orderInColumn based on drop index within column.
   * Assigns stepId to field when step mode is enabled.
   * @param event - The CdkDragDrop event with row-column position data
   */
  onFieldDroppedInRow(event: CdkDragDrop<{ rowId: string; columnIndex: number }>): void {
    const dropData = event.container.data as { rowId: string; columnIndex: number };
    const dragData = event.item.data;

    // Get fields currently in target column
    const columnFields = this.getFieldsInColumn(dropData.rowId, dropData.columnIndex);

    // Calculate orderInColumn based on drop index (defaults to end of column)
    const orderInColumn = event.currentIndex ?? columnFields.length;

    // Check if dragging field type from palette (create new field)
    if (this.isFieldTypeDefinition(dragData)) {
      this.createFieldAtPosition(dragData.type, {
        rowId: dropData.rowId,
        columnIndex: dropData.columnIndex,
        orderInColumn,
      });
      return;
    }

    // Dragging existing field (reorder or move)
    const field = dragData as FormField;

    // Prevent moving fields between steps
    if (this.stepFormEnabled() && field.position?.stepId) {
      const targetStepId = this.activeStepId();
      if (field.position.stepId !== targetStepId) {
        this.showErrorToast(
          'Cannot move fields between steps. Create a new field in the target step instead.',
        );
        return;
      }
    }

    const position: FieldPosition = {
      rowId: dropData.rowId,
      columnIndex: dropData.columnIndex,
      orderInColumn,
      stepId: this.stepFormEnabled() ? this.activeStepId() || undefined : undefined,
    };

    // Check if trying to drop in same position (no-op)
    if (
      field.position?.rowId === position.rowId &&
      field.position?.columnIndex === position.columnIndex &&
      field.position?.orderInColumn === orderInColumn
    ) {
      return;
    }

    // Update field position
    this.formBuilderService.setFieldPosition(field.id, position);
  }

  /**
   * Create new field at specific row-column position.
   * Called when dropping field type from palette into row-column zone.
   * Assigns stepId when step mode is enabled.
   * @param type - The field type to create
   * @param position - The row-column position with orderInColumn
   */
  private createFieldAtPosition(
    type: FormFieldType,
    position: { rowId: string; columnIndex: number; orderInColumn?: number },
  ): void {
    // Create field using service (auto-generates ID and defaults)
    const newField = this.formBuilderService.addFieldFromType(type);

    // Set position after creation (includes orderInColumn and stepId)
    this.formBuilderService.setFieldPosition(newField.id, {
      rowId: position.rowId,
      columnIndex: position.columnIndex,
      orderInColumn: position.orderInColumn ?? 0,
      stepId: this.stepFormEnabled() ? this.activeStepId() || undefined : undefined,
    });
  }

  /**
   * Show error toast notification.
   * TODO: Integrate with MessageService (injected from FormBuilderComponent)
   * @param message - Error message to display
   */
  private showErrorToast(message: string): void {
    // Temporary console.error until MessageService integration
    console.error(message);
    // Future: Use MessageService to show toast
    // this.messageService.add({ severity: 'error', summary: 'Error', detail: message });
  }

  /**
   * Handle step tab click to switch active step
   * @param stepId - ID of the step to activate
   */
  onStepTabClick(stepId: string): void {
    this.formBuilderService.setActiveStep(stepId);
  }

  /**
   * Get step order by step ID for displaying step badges
   * @param stepId - ID of the step
   * @returns Step order (0-based) or 0 if not found
   */
  getStepOrder(stepId: string): number {
    const step = this.steps().find((s) => s.id === stepId);
    return step?.order ?? 0;
  }

  /**
   * Check if field can be dropped into target (step validation)
   * Prevents dragging fields between steps
   * @param drag - The CDK dragged item
   * @param drop - The CDK drop list target
   * @returns True if drop is allowed
   */
  canDropField = (drag: CdkDrag, drop: CdkDropList): boolean => {
    const draggedField = drag.data as FormField;

    // Allow drop from palette (new fields have no stepId yet)
    if (!draggedField.position?.stepId) {
      return true;
    }

    const targetStepId = this.activeStepId();

    // Prevent drop if different step
    if (draggedField.position.stepId !== targetStepId) {
      return false;
    }

    return true;
  };
}
