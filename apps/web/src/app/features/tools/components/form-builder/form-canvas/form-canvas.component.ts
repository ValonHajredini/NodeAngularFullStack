import {
  Component,
  ChangeDetectionStrategy,
  Output,
  EventEmitter,
  Input,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { FormField, FormFieldType } from '@nodeangularfullstack/shared';
import { FormBuilderService } from '../form-builder.service';
import { FormSettings } from '../form-settings/form-settings.component';

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
  imports: [CommonModule, DragDropModule],
  template: `
    <div class="form-canvas h-full bg-gray-50 p-6">
      @if (!formBuilderService.hasFields()) {
        <div
          class="drop-zone empty min-h-full flex flex-col items-center justify-center text-center py-20"
          cdkDropList
          #dropList="cdkDropList"
          [cdkDropListData]="formBuilderService.formFields()"
          [cdkDropListConnectedTo]="[]"
          (cdkDropListDropped)="onFieldDropped($event)"
        >
          <i class="pi pi-file-edit text-6xl text-gray-300 mb-4"></i>
          <h3 class="text-xl font-semibold text-gray-700 mb-2">Start Building Your Form</h3>
          <p class="text-gray-500 max-w-md">
            Drag fields from the palette to start building your form
          </p>
        </div>
      } @else {
        <div class="form-fields-wrapper">
          <div class="mb-4">
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
            #dropList="cdkDropList"
            [cdkDropListData]="formBuilderService.formFields()"
            [cdkDropListConnectedTo]="[]"
            (cdkDropListDropped)="onFieldDropped($event)"
            class="form-fields-grid"
            [ngClass]="[getGridClass(), getSpacingClass()]"
          >
            @for (field of formBuilderService.formFields(); track field.id; let i = $index) {
              <div
                cdkDrag
                [cdkDragData]="field"
                class="field-card p-4 bg-white border rounded-lg cursor-pointer transition-all"
                [class.border-blue-500]="isFieldSelected(field)"
                [class.border-gray-300]="!isFieldSelected(field)"
                [class.shadow-md]="isFieldSelected(field)"
                [class.hover:border-blue-300]="!isFieldSelected(field)"
                (click)="onFieldClicked(field)"
                tabindex="0"
                role="listitem"
                [attr.aria-label]="field.label + ' field'"
                (keydown)="handleKeyboard($event, field, i)"
              >
                <div class="flex items-center gap-3">
                  <i class="pi pi-bars text-gray-400 cursor-move" cdkDragHandle></i>
                  <i [class]="'pi ' + getFieldIcon(field.type) + ' text-blue-600'"></i>
                  <div class="flex-1">
                    <div class="font-medium text-gray-900">
                      {{ field.label || 'Untitled Field' }}
                    </div>
                    <div class="text-sm text-gray-500">{{ field.fieldName }}</div>
                  </div>
                  @if (field.required) {
                    <span class="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Required</span>
                  }
                  <span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{{
                    field.type
                  }}</span>
                </div>
              </div>
            }

            <div *cdkDragPlaceholder class="field-placeholder"></div>
          </div>
        </div>
      }
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

      .field-card {
        user-select: none;
      }

      .field-card:hover {
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
      }

      .field-card:focus {
        outline: 2px solid #60a5fa;
        outline-offset: 2px;
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

      .cdk-drop-list-dragging .field-card:not(.cdk-drag-placeholder) {
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

  @Input() settings: FormSettings = {
    title: 'Untitled Form',
    description: '',
    columnLayout: 1,
    fieldSpacing: 'normal',
    successMessage: 'Thank you for your submission!',
    redirectUrl: '',
    allowMultipleSubmissions: true,
  };
  @Output() fieldClicked = new EventEmitter<FormField>();

  /**
   * Handles drop events on the canvas.
   * Either adds a new field from the palette or reorders existing fields.
   * @param event - The CdkDragDrop event containing drag-drop metadata
   */
  onFieldDropped(event: CdkDragDrop<FormField[]>): void {
    if (event.previousContainer !== event.container) {
      // Dropped from palette - add new field
      const fieldTypeDef = event.item.data as FieldTypeDefinition;
      this.formBuilderService.addFieldFromType(fieldTypeDef.type);
    } else {
      // Reordering within canvas
      this.formBuilderService.reorderFields(event.previousIndex, event.currentIndex);
    }
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
   * Supports Enter/Space (select), ArrowUp/ArrowDown (reorder), Delete/Backspace (remove).
   * @param event - The keyboard event
   * @param field - The FormField being interacted with
   * @param index - The index of the field in the fields array
   */
  handleKeyboard(event: KeyboardEvent, field: FormField, index: number): void {
    const fields = this.formBuilderService.formFields();

    switch (event.key) {
      case 'Enter':
      case ' ':
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

      case 'Delete':
      case 'Backspace':
        event.preventDefault();
        this.formBuilderService.removeField(field.id);
        break;
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
}
