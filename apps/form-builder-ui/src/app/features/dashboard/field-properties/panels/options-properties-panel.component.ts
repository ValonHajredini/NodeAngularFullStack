import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDrag, CdkDropList, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { FormField, FormFieldOption } from '@nodeangularfullstack/shared';
import { ButtonDirective } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';

/**
 * Properties panel for OPTIONS-based field types (SELECT, RADIO, CHECKBOX).
 * Allows add/edit/remove/reorder of options with drag-and-drop.
 */
@Component({
  selector: 'app-options-properties-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ButtonDirective,
    Dialog,
    InputTextModule,
    CdkDrag,
    CdkDropList,
  ],
  template: `
    <div class="space-y-4">
      <div class="flex justify-between items-center">
        <label class="text-sm font-medium text-gray-700">Options</label>
        <button
          pButton
          type="button"
          label="Add Option"
          icon="pi pi-plus"
          [outlined]="true"
          size="small"
          (click)="showAddOptionDialog()"
        ></button>
      </div>

      @if (options().length === 0) {
        <p class="text-sm text-gray-500 italic">No options yet. Click "Add Option" to start.</p>
      }

      <!-- Options List with Drag-Drop Reordering -->
      <div cdkDropList (cdkDropListDropped)="onReorder($event)" class="space-y-2">
        @for (option of options(); track option.value; let i = $index) {
          <div
            cdkDrag
            class="flex justify-between items-center p-3 border border-gray-200 rounded bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div class="flex items-center gap-3 flex-1">
              <i class="pi pi-bars text-gray-400 cursor-move" cdkDragHandle></i>
              <div class="flex-1">
                <div class="font-medium text-gray-900">{{ option.label }}</div>
                <div class="text-sm text-gray-500">Value: {{ option.value }}</div>
              </div>
            </div>
            <div class="flex gap-2">
              <button
                pButton
                type="button"
                icon="pi pi-pencil"
                [text]="true"
                severity="secondary"
                size="small"
                (click)="editOption(option, i)"
              ></button>
              <button
                pButton
                type="button"
                icon="pi pi-trash"
                severity="danger"
                [text]="true"
                size="small"
                (click)="removeOption(i)"
              ></button>
            </div>
          </div>
        }
      </div>

      <!-- Add/Edit Option Dialog -->
      <p-dialog
        [(visible)]="showOptionDialog"
        [header]="isEditMode() ? 'Edit Option' : 'Add Option'"
        [modal]="true"
        [style]="{ width: '450px' }"
      >
        <div class="space-y-4">
          <div class="field">
            <label for="optionLabel" class="block text-sm font-medium text-gray-700 mb-1">
              Label
            </label>
            <input
              pInputText
              id="optionLabel"
              [(ngModel)]="currentOption.label"
              class="w-full"
              placeholder="e.g., Red, Yes, Option 1"
            />
          </div>
          <div class="field">
            <label for="optionValue" class="block text-sm font-medium text-gray-700 mb-1">
              Value
            </label>
            <input
              pInputText
              id="optionValue"
              [(ngModel)]="currentOption.value"
              class="w-full"
              placeholder="e.g., red, yes, opt1"
            />
            <small class="text-gray-500 text-xs">Value stored in form submission data</small>
          </div>
        </div>
        <ng-template pTemplate="footer">
          <button
            pButton
            type="button"
            label="Cancel"
            [text]="true"
            (click)="closeOptionDialog()"
          ></button>
          <button
            pButton
            type="button"
            label="Save"
            (click)="saveOption()"
            [disabled]="!currentOption.label || !currentOption.value"
          ></button>
        </ng-template>
      </p-dialog>
    </div>
  `,
  styles: [
    `
      .cdk-drag-preview {
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        border-radius: 4px;
        opacity: 0.9;
      }

      .cdk-drag-animating {
        transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
      }
    `,
  ],
})
export class OptionsPropertiesPanelComponent implements OnInit {
  @Input() field!: FormField;
  @Output() fieldChange = new EventEmitter<FormField>();

  protected readonly options = signal<FormFieldOption[]>([]);
  protected showOptionDialog = false;
  protected readonly isEditMode = signal<boolean>(false);
  protected currentOption: FormFieldOption = { label: '', value: '' };
  protected editIndex = -1;

  ngOnInit(): void {
    // Initialize options from field
    this.options.set([...(this.field.options || [])]);
  }

  protected showAddOptionDialog(): void {
    this.isEditMode.set(false);
    this.currentOption = { label: '', value: '' };
    this.showOptionDialog = true;
  }

  protected editOption(option: FormFieldOption, index: number): void {
    this.isEditMode.set(true);
    this.editIndex = index;
    this.currentOption = { ...option };
    this.showOptionDialog = true;
  }

  protected saveOption(): void {
    if (!this.currentOption.label || !this.currentOption.value) return;

    const updatedOptions = [...this.options()];

    if (this.isEditMode()) {
      // Edit existing option
      updatedOptions[this.editIndex] = { ...this.currentOption };
    } else {
      // Add new option
      updatedOptions.push({ ...this.currentOption });
    }

    this.options.set(updatedOptions);
    this.closeOptionDialog();
    this.emitFieldChange();
  }

  protected removeOption(index: number): void {
    const updatedOptions = this.options().filter((_, i) => i !== index);
    this.options.set(updatedOptions);
    this.emitFieldChange();
  }

  protected onReorder(event: CdkDragDrop<FormFieldOption[]>): void {
    const updatedOptions = [...this.options()];
    moveItemInArray(updatedOptions, event.previousIndex, event.currentIndex);
    this.options.set(updatedOptions);
    this.emitFieldChange();
  }

  protected closeOptionDialog(): void {
    this.showOptionDialog = false;
    this.currentOption = { label: '', value: '' };
    this.editIndex = -1;
  }

  private emitFieldChange(): void {
    this.fieldChange.emit({
      ...this.field,
      options: [...this.options()],
    });
  }
}
