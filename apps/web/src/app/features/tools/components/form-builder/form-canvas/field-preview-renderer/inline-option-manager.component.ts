import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ButtonModule } from 'primeng/button';
import { FormField, FormFieldOption } from '@nodeangularfullstack/shared';

/**
 * Inline option manager for select, radio, and checkbox fields
 * Allows adding, removing, and reordering field options with validation
 */
@Component({
  selector: 'app-inline-option-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="inline-option-manager mt-3 p-3 bg-gray-50 rounded border border-gray-200">
      <div class="flex items-center justify-between mb-3">
        <label class="text-sm font-medium text-gray-700">Field Options</label>
        <p-button
          label="Add Option"
          icon="pi pi-plus"
          size="small"
          (onClick)="addOption()"
          [text]="true"
        />
      </div>

      @if (options.length === 0) {
        <p class="text-sm text-gray-500 text-center py-4">
          No options yet. Click "Add Option" to create your first option.
        </p>
      } @else {
        <div cdkDropList (cdkDropListDropped)="onOptionReordered($event)" class="space-y-2">
          @for (option of options; track $index; let i = $index) {
            <div
              cdkDrag
              class="option-row flex items-center gap-2 p-2 bg-white border rounded"
              [class.border-red-500]="isDuplicateValue(option.value, i)"
            >
              <i
                class="pi pi-bars text-gray-400 cursor-move"
                cdkDragHandle
                aria-label="Reorder option"
              ></i>

              <div class="flex-1 grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="text"
                    [(ngModel)]="option.label"
                    (ngModelChange)="onOptionChanged()"
                    placeholder="Option label"
                    class="w-full px-2 py-1 border rounded text-sm"
                    [class.border-red-500]="!option.label"
                    [attr.aria-label]="'Option ' + (i + 1) + ' label'"
                  />
                  @if (!option.label) {
                    <small class="text-red-600 text-xs" role="alert">Label required</small>
                  }
                </div>

                <div>
                  <input
                    type="text"
                    [(ngModel)]="option.value"
                    (ngModelChange)="onOptionChanged()"
                    placeholder="Option value"
                    class="w-full px-2 py-1 border rounded text-sm"
                    [class.border-red-500]="isDuplicateValue(option.value, i)"
                    [attr.aria-label]="'Option ' + (i + 1) + ' value'"
                  />
                  @if (isDuplicateValue(option.value, i)) {
                    <small class="text-red-600 text-xs" role="alert">Duplicate value</small>
                  }
                </div>
              </div>

              <p-button
                icon="pi pi-times"
                severity="danger"
                size="small"
                [text]="true"
                (onClick)="removeOption(i)"
                [ariaLabel]="'Remove option ' + (i + 1)"
              />
            </div>
          }
        </div>
      }

      <small class="block text-gray-500 mt-2 text-xs">
        <i class="pi pi-info-circle mr-1"></i>
        Label is displayed to users, value is stored in form submission
      </small>
    </div>
  `,
  styles: [
    `
      .option-row {
        transition: border-color 200ms;
      }
      .option-row:hover {
        border-color: #93c5fd;
      }
      .option-row.cdk-drag-preview {
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
      }
      .cdk-drag-placeholder {
        opacity: 0.5;
        background: #e5e7eb;
      }
    `,
  ],
})
export class InlineOptionManagerComponent implements OnInit, OnChanges {
  @Input({ required: true }) field!: FormField;
  @Output() optionsChanged = new EventEmitter<FormFieldOption[]>();

  options: FormFieldOption[] = [];

  ngOnInit(): void {
    this.options = [...(this.field.options || [])];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['field'] && !changes['field'].firstChange) {
      this.options = [...(this.field.options || [])];
    }
  }

  /**
   * Add a new blank option to the list
   */
  addOption(): void {
    const newOption: FormFieldOption = {
      label: '',
      value: '',
    };
    this.options.push(newOption);
    this.onOptionChanged();
  }

  /**
   * Remove option at the specified index
   */
  removeOption(index: number): void {
    this.options.splice(index, 1);
    this.onOptionChanged();
  }

  /**
   * Handle drag-drop reordering of options
   */
  onOptionReordered(event: CdkDragDrop<FormFieldOption[]>): void {
    moveItemInArray(this.options, event.previousIndex, event.currentIndex);
    this.onOptionChanged();
  }

  /**
   * Handle any option change (add, remove, edit, reorder)
   * Auto-generates value from label if value is empty
   */
  onOptionChanged(): void {
    // Auto-generate value from label if value is empty
    this.options.forEach((opt) => {
      if (!opt.value && opt.label) {
        opt.value = this.slugify(opt.label);
      }
    });

    this.optionsChanged.emit([...this.options]);
  }

  /**
   * Check if a value is duplicated in the options array
   */
  isDuplicateValue(value: string | number, currentIndex: number): boolean {
    if (!value) return false;
    return this.options.some((opt, i) => i !== currentIndex && opt.value === value);
  }

  /**
   * Convert text to slug format (lowercase, underscores for spaces)
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_')
      .trim();
  }
}
