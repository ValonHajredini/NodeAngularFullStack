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
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FormField, FormFieldType } from '@nodeangularfullstack/shared';
import { FormBuilderService } from '../form-builder.service';
import { FormSettings } from '../form-settings/form-settings.component';
import { FieldPreviewRendererComponent } from './field-preview-renderer/field-preview-renderer.component';
import { FieldSettingsModalComponent } from './field-settings-modal.component';
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
  imports: [
    CommonModule,
    DragDropModule,
    FieldPreviewRendererComponent,
    FieldSettingsModalComponent,
    GroupPreviewComponent,
  ],
  template: `
    <div class="form-canvas h-full bg-gray-50 p-6">
      @if (!formBuilderService.hasFields()) {
        <div
          class="drop-zone empty min-h-full flex flex-col items-center justify-center text-center py-20"
          cdkDropList
          #canvasDropList="cdkDropList"
          id="canvas-drop-list"
          [cdkDropListData]="formBuilderService.formFields()"
          (cdkDropListDropped)="onFieldDropped($event)"
        >
          <i class="pi pi-file-edit text-6xl text-gray-300 mb-4"></i>
          <h3 class="text-xl font-semibold text-gray-700 mb-2">Start Building Your Form</h3>
          <p class="text-gray-500 max-w-md">
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
            <h3 class="text-lg font-semibold text-gray-900">
              {{ settings.title || 'Untitled Form' }}
            </h3>
            <p class="text-sm text-gray-600">
              This is a live preview of your form. Click on a field to edit its properties
              @if (settings.columnLayout > 1) {
                <span class="ml-2 text-blue-600">{{ settings.columnLayout }} columns</span>
              }
            </p>
            @if (settings.description) {
              <p class="text-sm text-gray-500 mt-1">{{ settings.description }}</p>
            }
          </div>

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
                class="field-preview-container p-4 bg-white border-2 border-dashed rounded-lg transition-all relative group"
                [class.border-blue-500]="isFieldSelected(field)"
                [class.border-gray-300]="!isFieldSelected(field)"
                [class.shadow-md]="isFieldSelected(field)"
                [class.hover:border-blue-400]="!isFieldSelected(field)"
                (click)="onFieldClicked(field)"
                tabindex="0"
                role="listitem"
                [attr.aria-label]="field.label + ' field'"
                (keydown)="handleKeyboard($event, field, i)"
              >
                <!-- Drag Handle (Top Left) -->
                @if (field.type !== FormFieldType.GROUP) {
                  <div class="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <i
                      class="pi pi-bars text-gray-400 cursor-move hover:text-gray-600 text-lg"
                      cdkDragHandle
                      aria-label="Reorder field"
                    ></i>
                  </div>
                }

                <!-- Delete Button (Top Right) -->
                <button
                  type="button"
                  class="delete-button-card absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  (click)="onDeleteFieldFromCard($event, field)"
                  [attr.aria-label]="'Delete ' + field.label"
                  title="Delete field"
                >
                  <i class="pi pi-times text-red-500 hover:text-red-700"></i>
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
                          class="field-preview-container p-4 bg-white border-2 border-dashed rounded-lg transition-all relative group mb-3"
                          [class.border-blue-500]="isFieldSelected(child)"
                          [class.border-gray-300]="!isFieldSelected(child)"
                          [class.shadow-md]="isFieldSelected(child)"
                          [class.hover:border-blue-400]="!isFieldSelected(child)"
                          (click)="onFieldClicked(child)"
                          tabindex="0"
                          role="listitem"
                          [attr.aria-label]="child.label + ' field'"
                          (keydown)="handleGroupKeyboard($event, child, field.id, childIndex)"
                        >
                          <!-- Drag Handle (Top Left) -->
                          <div class="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <i
                              class="pi pi-bars text-gray-400 cursor-move hover:text-gray-600 text-lg"
                              cdkDragHandle
                              aria-label="Reorder field"
                            ></i>
                          </div>

                          <!-- Delete Button (Top Right) -->
                          <button
                            type="button"
                            class="delete-button-card absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            (click)="onDeleteFieldFromCard($event, child)"
                            [attr.aria-label]="'Delete ' + child.label"
                            title="Delete field"
                          >
                            <i class="pi pi-times text-red-500 hover:text-red-700"></i>
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
        </div>
      }

      <!-- Field Settings Modal -->
      <app-field-settings-modal
        [field]="selectedFieldForSettings()"
        [(displayModal)]="displaySettingsModal"
        (settingsSaved)="onSettingsSaved($event)"
        (fieldDeleted)="onFieldDeleted()"
      />
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

  displaySettingsModal = false;
  selectedFieldForSettings = signal<FormField | null>(null);

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
      (s.backgroundCustomHtml !== undefined ||
        s.backgroundCustomCss !== undefined)
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
  handleGroupKeyboard(event: KeyboardEvent, field: FormField, groupId: string, index: number): void {
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
   * Opens the settings modal for a specific field.
   * @param field - The field to edit settings for
   */
  openSettingsModal(field: FormField): void {
    this.selectedFieldForSettings.set(field);
    this.formBuilderService.selectField(field);
    this.displaySettingsModal = true;
  }

  /**
   * Handles saving of field settings from the modal.
   * Updates all field properties in bulk.
   * @param updates - Partial field object with updated properties
   */
  onSettingsSaved(updates: Partial<FormField>): void {
    const field = this.selectedFieldForSettings();
    if (field) {
      this.formBuilderService.updateFieldProperties(field.id, updates);
    }
  }

  /**
   * Handles field deletion from the settings modal.
   * Removes the field from the form builder.
   */
  onFieldDeleted(): void {
    const field = this.selectedFieldForSettings();
    if (field) {
      this.formBuilderService.removeField(field.id);
      this.selectedFieldForSettings.set(null);
    }
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
    if (
      s.backgroundType !== 'image' ||
      !s.backgroundImageUrl
    ) {
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
    if (
      s.backgroundType !== 'image' ||
      !s.backgroundImageUrl
    ) {
      return {};
    }

    const styles: Record<string, string> = {
      'background-image': `url(${s.backgroundImageUrl})`,
      'background-size': s.backgroundImagePosition ?? 'cover',
      'background-position': s.backgroundImageAlignment ?? 'center',
      'background-repeat':
        s.backgroundImagePosition === 'repeat' ? 'repeat' : 'no-repeat',
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
    return s.backgroundImageOpacity !== undefined
      ? s.backgroundImageOpacity / 100
      : 1;
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
    if (
      s.backgroundType !== 'custom' ||
      (!s.backgroundCustomHtml && !s.backgroundCustomCss)
    ) {
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
}
