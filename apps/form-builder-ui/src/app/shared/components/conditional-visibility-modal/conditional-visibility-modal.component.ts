import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  OnDestroy,
  signal,
  effect,
  computed,
  model,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
} from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule, ButtonDirective } from 'primeng/button';
import { FormField } from '@nodeangularfullstack/shared';
import { Subject } from 'rxjs';

/**
 * Conditional Visibility Modal component for editing field conditional visibility rules.
 *
 * Handles:
 * - Show If Field (select from other fields)
 * - Operator (Equals, Not Equals, Contains)
 * - Value (comparison value)
 * - Clear Rule button
 */
@Component({
  selector: 'app-conditional-visibility-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    DialogModule,
    InputTextModule,
    ButtonModule,
    ButtonDirective,
  ],
  template: `
    <p-dialog
      header="Conditional Visibility"
      [(visible)]="visible"
      [modal]="true"
      [closable]="true"
      [dismissableMask]="false"
      [closeOnEscape]="true"
      [draggable]="false"
      [resizable]="false"
      [blockScroll]="true"
      appendTo="body"
      [style]="{ width: '500px', maxHeight: '90vh' }"
      [contentStyle]="{ maxHeight: 'calc(90vh - 180px)', overflow: 'auto' }"
      (onHide)="onDialogHide()"
      (onShow)="onDialogShow()"
    >
      @if (field()) {
        <div class="mb-4">
          <span class="inline-block bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full">
            {{ field()!.type }}
          </span>
        </div>

        <form [formGroup]="conditionalForm" class="space-y-4">
          <div class="field">
            <label
              for="showIfField"
              class="block text-sm font-medium text-gray-700 mb-1"
            >
              Show If Field
            </label>
            <select
              id="showIfField"
              formControlName="showIfField"
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">Select field</option>
              @for (option of otherFieldsOptions(); track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </div>

          @if (conditionalForm.get('showIfField')?.value) {
            <div class="field">
              <label
                for="showIfOperator"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                Operator
              </label>
              <select
                id="showIfOperator"
                formControlName="showIfOperator"
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                @for (option of operatorOptions; track option.value) {
                  <option [value]="option.value">{{ option.label }}</option>
                }
              </select>
            </div>

            <div class="field">
              <label
                for="showIfValue"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                Value
              </label>
              <input
                pInputText
                id="showIfValue"
                formControlName="showIfValue"
                class="w-full"
                placeholder="Enter comparison value"
              />
            </div>

            <button
              pButton
              type="button"
              label="Clear Rule"
              icon="pi pi-times"
              severity="secondary"
              size="small"
              (click)="clearConditionalRule()"
            ></button>
          }
        </form>
      }

      <ng-template pTemplate="footer">
        <div class="flex gap-2 justify-end">
          <button
            pButton
            type="button"
            label="Cancel"
            icon="pi pi-times"
            severity="secondary"
            (click)="onCancel()"
          ></button>
          <button
            pButton
            type="button"
            label="Save Changes"
            icon="pi pi-check"
            [disabled]="conditionalForm.invalid"
            (click)="onSaveChanges()"
          ></button>
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class ConditionalVisibilityModalComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  // Signal-based inputs/outputs
  readonly visible = model<boolean>(false);
  readonly field = input<FormField | null>(null);
  readonly allFields = input<FormField[]>([]);

  readonly saveChanges = output<Partial<FormField>>();
  readonly cancel = output<void>();

  // Form and state
  conditionalForm: FormGroup;

  // Operator options for conditional visibility
  readonly operatorOptions = [
    { label: 'Equals', value: 'equals' },
    { label: 'Not Equals', value: 'notEquals' },
    { label: 'Contains', value: 'contains' },
  ];

  /**
   * Get list of other fields for conditional visibility
   */
  readonly otherFieldsOptions = computed(() => {
    const currentField = this.field();
    if (!currentField) return [];

    return this.allFields()
      .filter((f) => f.id !== currentField.id)
      .map((f) => ({
        label: f.label || f.fieldName,
        value: f.id,
      }));
  });

  constructor() {
    this.conditionalForm = this.fb.group({
      showIfField: [''],
      showIfOperator: ['equals'],
      showIfValue: [''],
    });

    // Watch for field changes using effect
    effect(() => {
      const selectedField = this.field();
      if (selectedField) {
        this.loadFieldProperties(selectedField);
      }
    });
  }

  ngOnInit(): void {
    // Component initialization
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load field properties into form
   */
  private loadFieldProperties(field: FormField): void {
    // Patch form values
    this.conditionalForm.patchValue(
      {
        showIfField: field.conditional?.watchFieldId || '',
        showIfOperator: field.conditional?.operator || 'equals',
        showIfValue: field.conditional?.value || '',
      },
      { emitEvent: false },
    );

    this.conditionalForm.markAsPristine();
  }

  /**
   * Clear conditional visibility rule
   */
  clearConditionalRule(): void {
    this.conditionalForm.patchValue({
      showIfField: '',
      showIfOperator: 'equals',
      showIfValue: '',
    });
  }

  /**
   * Dialog show event handler
   */
  onDialogShow(): void {
    const field = this.field();
    if (field) {
      this.loadFieldProperties(field);
    }
  }

  /**
   * Dialog hide event handler
   */
  onDialogHide(): void {
    this.conditionalForm.reset();
  }

  /**
   * Save changes handler
   */
  onSaveChanges(): void {
    if (this.conditionalForm.invalid) {
      // Mark all fields as touched to show errors
      Object.keys(this.conditionalForm.controls).forEach((key) => {
        this.conditionalForm.get(key)?.markAsTouched();
      });
      return;
    }

    const formValues = this.conditionalForm.value;

    // Build conditional object
    let conditional = undefined;
    if (formValues.showIfField) {
      conditional = {
        watchFieldId: formValues.showIfField,
        operator: formValues.showIfOperator,
        value: formValues.showIfValue,
      };
    }

    // Emit partial field update
    const updates: Partial<FormField> = {
      conditional,
    };

    this.saveChanges.emit(updates);
    this.visible.set(false);
  }

  /**
   * Cancel handler
   */
  onCancel(): void {
    this.cancel.emit();
    this.visible.set(false);
  }
}
