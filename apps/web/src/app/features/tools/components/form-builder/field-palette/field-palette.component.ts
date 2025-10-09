import { Component, ChangeDetectionStrategy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { FormFieldType } from '@nodeangularfullstack/shared';

interface FieldTypeDefinition {
  type: FormFieldType;
  icon: string;
  label: string;
}

/**
 * Field palette component for displaying available field types.
 * Users can click field types to add them to the form canvas.
 */
@Component({
  selector: 'app-field-palette',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ScrollPanelModule, DragDropModule],
  template: `
    <div class="field-palette h-full bg-white border-r border-gray-200">
      <div class="p-4 border-b border-gray-200">
        <h3 class="text-lg font-semibold text-gray-900">Field Types</h3>
        <p class="text-sm text-gray-600 mt-1">Drag or click to add to form</p>
      </div>

      <p-scrollpanel [style]="{ width: '100%', height: 'calc(100vh - 200px)' }">
        <div
          cdkDropList
          #paletteDropList="cdkDropList"
          id="palette-drop-list"
          [cdkDropListData]="fieldTypes"
          [cdkDropListSortingDisabled]="true"
          class="p-3 space-y-2"
        >
          @for (fieldType of fieldTypes; track fieldType.type) {
            <div
              cdkDrag
              [cdkDragData]="fieldType"
              class="field-type-card p-3 border border-gray-300 rounded-lg cursor-move hover:bg-blue-50 hover:border-blue-400 transition-all"
              (click)="onFieldTypeSelected(fieldType.type)"
            >
              <div class="flex items-center gap-3">
                <i [class]="'pi ' + fieldType.icon + ' text-blue-600 text-xl'"></i>
                <span class="text-sm font-medium text-gray-800">{{ fieldType.label }}</span>
              </div>

              <div
                *cdkDragPreview
                class="drag-preview p-3 bg-white border-2 border-blue-400 rounded-lg shadow-lg opacity-90"
              >
                <div class="flex items-center gap-3">
                  <i [class]="'pi ' + fieldType.icon + ' text-blue-600 text-xl'"></i>
                  <span class="text-sm font-medium text-gray-800">{{ fieldType.label }}</span>
                </div>
              </div>

              <div *cdkDragPlaceholder class="field-type-placeholder"></div>
            </div>
          }
        </div>
      </p-scrollpanel>
    </div>
  `,
  styles: [
    `
      .field-type-card {
        user-select: none;
      }

      .field-type-card:active {
        transform: scale(0.98);
      }

      .drag-preview {
        min-width: 200px;
      }

      .field-type-placeholder {
        background: #dbeafe;
        border: 2px dashed #3b82f6;
        border-radius: 8px;
        min-height: 48px;
      }

      .cdk-drag-animating {
        transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
      }
    `,
  ],
})
export class FieldPaletteComponent {
  @Output() fieldSelected = new EventEmitter<FormFieldType>();

  readonly fieldTypes: FieldTypeDefinition[] = [
    { type: FormFieldType.TEXT, icon: 'pi-pencil', label: 'Text Input' },
    { type: FormFieldType.EMAIL, icon: 'pi-envelope', label: 'Email' },
    { type: FormFieldType.NUMBER, icon: 'pi-hashtag', label: 'Number' },
    { type: FormFieldType.SELECT, icon: 'pi-list', label: 'Select' },
    { type: FormFieldType.TEXTAREA, icon: 'pi-align-left', label: 'Textarea' },
    { type: FormFieldType.FILE, icon: 'pi-upload', label: 'File Upload' },
    { type: FormFieldType.CHECKBOX, icon: 'pi-check-square', label: 'Checkbox' },
    { type: FormFieldType.RADIO, icon: 'pi-circle', label: 'Radio Group' },
    { type: FormFieldType.DATE, icon: 'pi-calendar', label: 'Date' },
    { type: FormFieldType.DATETIME, icon: 'pi-clock', label: 'DateTime' },
    { type: FormFieldType.TOGGLE, icon: 'pi-toggle-on', label: 'Toggle' },
    { type: FormFieldType.DIVIDER, icon: 'pi-minus', label: 'Section Divider' },
    // Note: Background Image and Custom Background moved to Form Settings
  ];

  /**
   * Emits the selected field type when a user clicks on a field type card.
   * This allows the parent component to add the field to the form canvas.
   * @param type - The FormFieldType that was selected
   */
  onFieldTypeSelected(type: FormFieldType): void {
    this.fieldSelected.emit(type);
  }
}
