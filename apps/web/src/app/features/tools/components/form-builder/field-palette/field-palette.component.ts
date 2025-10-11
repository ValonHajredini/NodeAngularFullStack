import {
  Component,
  ChangeDetectionStrategy,
  Output,
  EventEmitter,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { FormFieldType, isInputField, isDisplayElement } from '@nodeangularfullstack/shared';

interface FieldTypeDefinition {
  type: FormFieldType;
  icon: string;
  label: string;
  category: 'input' | 'preview';
}

/**
 * Field palette component for displaying available field types.
 * Users can click field types to add them to the form canvas.
 */
@Component({
  selector: 'app-field-palette',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ScrollPanelModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    DragDropModule,
  ],
  template: `
    <div class="field-palette h-full bg-white border-r border-gray-200">
      <div class="p-4 border-b border-gray-200">
        <h3 class="text-lg font-semibold text-gray-900">Field Types</h3>
        <p class="text-sm text-gray-600 mt-1">Drag or click to add to form</p>

        <!-- Search Input -->
        <div class="mt-3">
          <p-iconfield iconPosition="left">
            <p-inputicon styleClass="pi pi-search" />
            <input
              type="text"
              pInputText
              placeholder="Search fields..."
              [value]="searchQuery()"
              (input)="onSearchChange($any($event.target).value)"
              class="w-full"
            />
          </p-iconfield>
        </div>
      </div>

      <p-scrollpanel [style]="{ width: '100%', height: 'calc(100vh - 260px)' }">
        <div
          cdkDropList
          #paletteDropList="cdkDropList"
          id="palette-drop-list"
          [cdkDropListData]="fieldTypes"
          [cdkDropListSortingDisabled]="true"
          class="space-y-4"
        >
          <!-- Input Fields Section -->
          @if (filteredInputFields().length > 0) {
            <div>
              <div class="flex items-center gap-2 mb-2 px-1">
                <span class="text-xs font-bold text-green-700 uppercase tracking-wider"
                  >Input Fields</span
                >
                <span class="flex-1 h-px bg-green-200"></span>
              </div>
              <div class="space-y-2">
                @for (fieldType of filteredInputFields(); track fieldType.type) {
                  <div
                    cdkDrag
                    [cdkDragData]="fieldType"
                    class="field-type-card p-3 border border-gray-300 rounded-lg cursor-move hover:bg-green-50 hover:border-green-400 transition-all"
                    (click)="onFieldTypeSelected(fieldType.type)"
                  >
                    <div class="flex items-center gap-3">
                      <i [class]="'pi ' + fieldType.icon + ' text-green-600 text-xl'"></i>
                      <span class="text-sm font-medium text-gray-800">{{ fieldType.label }}</span>
                    </div>

                    <div
                      *cdkDragPreview
                      class="drag-preview p-3 bg-white border-2 border-green-400 rounded-lg shadow-lg opacity-90"
                    >
                      <div class="flex items-center gap-3">
                        <i [class]="'pi ' + fieldType.icon + ' text-green-600 text-xl'"></i>
                        <span class="text-sm font-medium text-gray-800">{{ fieldType.label }}</span>
                      </div>
                    </div>

                    <div *cdkDragPlaceholder class="field-type-placeholder bg-green-50"></div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Preview Elements Section -->
          @if (filteredPreviewFields().length > 0) {
            <div>
              <div class="flex items-center gap-2 mb-2 px-1">
                <span class="text-xs font-bold text-purple-700 uppercase tracking-wider"
                  >Preview Elements</span
                >
                <span class="flex-1 h-px bg-purple-200"></span>
              </div>
              <div class="space-y-2">
                @for (fieldType of filteredPreviewFields(); track fieldType.type) {
                  <div
                    cdkDrag
                    [cdkDragData]="fieldType"
                    class="field-type-card p-3 border border-gray-300 rounded-lg cursor-move hover:bg-purple-50 hover:border-purple-400 transition-all"
                    (click)="onFieldTypeSelected(fieldType.type)"
                  >
                    <div class="flex items-center gap-3">
                      <i [class]="'pi ' + fieldType.icon + ' text-purple-600 text-xl'"></i>
                      <span class="text-sm font-medium text-gray-800">{{ fieldType.label }}</span>
                    </div>

                    <div
                      *cdkDragPreview
                      class="drag-preview p-3 bg-white border-2 border-purple-400 rounded-lg shadow-lg opacity-90"
                    >
                      <div class="flex items-center gap-3">
                        <i [class]="'pi ' + fieldType.icon + ' text-purple-600 text-xl'"></i>
                        <span class="text-sm font-medium text-gray-800">{{ fieldType.label }}</span>
                      </div>
                    </div>

                    <div *cdkDragPlaceholder class="field-type-placeholder bg-purple-50"></div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- No Results Message -->
          @if (
            filteredInputFields().length === 0 &&
            filteredPreviewFields().length === 0 &&
            searchQuery()
          ) {
            <div class="text-center py-8 px-4">
              <i class="pi pi-search text-4xl text-gray-400 mb-3 block"></i>
              <p class="text-sm text-gray-600">No fields found matching "{{ searchQuery() }}"</p>
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

  // Search query signal
  searchQuery = signal<string>('');

  readonly fieldTypes: FieldTypeDefinition[] = [
    { type: FormFieldType.TEXT, icon: 'pi-pencil', label: 'Text Input', category: 'input' },
    { type: FormFieldType.EMAIL, icon: 'pi-envelope', label: 'Email', category: 'input' },
    { type: FormFieldType.NUMBER, icon: 'pi-hashtag', label: 'Number', category: 'input' },
    { type: FormFieldType.SELECT, icon: 'pi-list', label: 'Select', category: 'input' },
    { type: FormFieldType.TEXTAREA, icon: 'pi-align-left', label: 'Textarea', category: 'input' },
    { type: FormFieldType.FILE, icon: 'pi-upload', label: 'File Upload', category: 'input' },
    { type: FormFieldType.CHECKBOX, icon: 'pi-check-square', label: 'Checkbox', category: 'input' },
    { type: FormFieldType.RADIO, icon: 'pi-circle', label: 'Radio Group', category: 'input' },
    { type: FormFieldType.DATE, icon: 'pi-calendar', label: 'Date', category: 'input' },
    { type: FormFieldType.DATETIME, icon: 'pi-clock', label: 'DateTime', category: 'input' },
    { type: FormFieldType.TOGGLE, icon: 'pi-toggle-on', label: 'Toggle', category: 'input' },
    {
      type: FormFieldType.DIVIDER,
      icon: 'pi-minus',
      label: 'Section Divider',
      category: 'preview',
    },
    { type: FormFieldType.HEADING, icon: 'pi-align-center', label: 'Heading', category: 'preview' },
    { type: FormFieldType.IMAGE, icon: 'pi-image', label: 'Image', category: 'preview' },
    {
      type: FormFieldType.TEXT_BLOCK,
      icon: 'pi-align-justify',
      label: 'Text Block',
      category: 'preview',
    },
    // Note: Background Image and Custom Background moved to Form Settings
  ];

  // Base arrays for Input and Preview fields
  readonly inputFields = this.fieldTypes.filter((f) => f.category === 'input');
  readonly previewFields = this.fieldTypes.filter((f) => f.category === 'preview');

  // Computed filtered arrays based on search query
  readonly filteredInputFields = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.inputFields;
    return this.inputFields.filter((field) => field.label.toLowerCase().includes(query));
  });

  readonly filteredPreviewFields = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.previewFields;
    return this.previewFields.filter((field) => field.label.toLowerCase().includes(query));
  });

  /**
   * Handles search input change
   */
  onSearchChange(value: string): void {
    this.searchQuery.set(value);
  }

  /**
   * Emits the selected field type when a user clicks on a field type card.
   * This allows the parent component to add the field to the form canvas.
   * @param type - The FormFieldType that was selected
   */
  onFieldTypeSelected(type: FormFieldType): void {
    this.fieldSelected.emit(type);
  }
}
