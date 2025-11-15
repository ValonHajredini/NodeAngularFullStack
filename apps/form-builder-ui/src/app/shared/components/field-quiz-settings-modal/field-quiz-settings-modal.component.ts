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
  Validators,
} from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule, ButtonDirective } from 'primeng/button';
import { InputNumber, InputNumberModule } from 'primeng/inputnumber';
import { Message, MessageModule } from 'primeng/message';
import { CheckboxModule } from 'primeng/checkbox';
import {
  FormField,
  FormFieldType,
  QuizFieldMetadata,
} from '@nodeangularfullstack/shared';
import { Subject, takeUntil } from 'rxjs';

/**
 * Field Quiz Settings Modal component for configuring individual field quiz properties.
 *
 * Handles:
 * - Correct answer selection (dropdown for radio/checkbox/select, text input for text fields)
 * - Points value for correct answer
 * - Explanation text shown after quiz submission
 *
 * Only shown when quiz mode is enabled and field type supports quiz questions.
 * This is a FIELD-LEVEL modal (configures one field), different from the form-level QuizSettingsModal.
 */
@Component({
  selector: 'app-field-quiz-settings-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    ButtonModule,
    ButtonDirective,
    InputNumberModule,
    InputNumber,
    MessageModule,
    Message,
    CheckboxModule,
  ],
  template: `
    <p-dialog
      header="Quiz Configuration"
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
          <span class="inline-block bg-purple-100 text-purple-800 text-xs px-3 py-1 rounded-full">
            {{ field()!.type }} Question
          </span>
        </div>

        <form [formGroup]="quizForm" class="space-y-4">
          <!-- Exclude from Quiz Scoring (moved to top) -->
          <div class="field flex items-start gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p-checkbox
              formControlName="excludeFromQuiz"
              [binary]="true"
              inputId="excludeFromQuiz"
            />
            <div class="flex flex-col">
              <label
                for="excludeFromQuiz"
                class="text-sm font-medium text-gray-700 cursor-pointer"
              >
                Exclude from quiz scoring
              </label>
              <small class="text-gray-500">
                Check this for fields like name or email that aren't quiz questions
              </small>
            </div>
          </div>

          <!-- Quiz-specific fields (only shown when NOT excluded) -->
          @if (!quizForm.get('excludeFromQuiz')?.value) {
            <!-- Correct Answer (for fields with options) -->
            @if (hasOptions()) {
              <div class="field">
                <label
                  for="correctAnswer"
                  class="block text-sm font-medium text-gray-700 mb-1"
                >
                  Correct Answer
                  <span class="text-red-500">*</span>
                </label>
                <select
                  id="correctAnswer"
                  formControlName="correctAnswer"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">Select correct answer</option>
                  @for (option of answerOptions(); track option.value) {
                    <option [value]="option.value">{{ option.label }}</option>
                  }
                </select>
                @if (
                  quizForm.get('correctAnswer')?.invalid &&
                  quizForm.get('correctAnswer')?.touched
                ) {
                  <small class="text-red-500">Correct answer is required</small>
                }
              </div>
            }

            <!-- Correct Answer (for text fields) -->
            @if (isTextField()) {
              <div class="field">
                <label
                  for="correctAnswerText"
                  class="block text-sm font-medium text-gray-700 mb-1"
                >
                  Correct Answer
                  <span class="text-red-500">*</span>
                </label>
                <input
                  pInputText
                  id="correctAnswerText"
                  formControlName="correctAnswer"
                  class="w-full"
                  placeholder="Enter correct answer"
                />
                @if (
                  quizForm.get('correctAnswer')?.invalid &&
                  quizForm.get('correctAnswer')?.touched
                ) {
                  <small class="text-red-500">Correct answer is required</small>
                }
              </div>
            }

            <!-- Points -->
            <div class="field">
              <label
                for="points"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                Points
              </label>
              <p-inputNumber
                id="points"
                formControlName="points"
                [min]="0"
                [max]="100"
                [step]="1"
                [showButtons]="true"
                buttonLayout="horizontal"
                spinnerMode="horizontal"
                incrementButtonIcon="pi pi-plus"
                decrementButtonIcon="pi pi-minus"
                styleClass="w-full"
              />
              <small class="text-gray-500 block mt-1">
                Points awarded for correct answer (default: 1)
              </small>
            </div>

            <!-- Explanation -->
            <div class="field">
              <label
                for="explanation"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                Explanation
              </label>
              <textarea
                pTextarea
                id="explanation"
                formControlName="explanation"
                class="w-full"
                rows="4"
                placeholder="Explanation shown after quiz submission (optional)"
              ></textarea>
              <small class="text-gray-500 block mt-1">
                This text will be shown to users after they submit the quiz
              </small>
            </div>

            <!-- Info message -->
            @if (hasOptions()) {
              <p-message
                severity="info"
                text="The correct answer must match one of the field's options exactly."
              />
            }
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
            [disabled]="quizForm.invalid"
            (click)="onSaveChanges()"
          ></button>
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class FieldQuizSettingsModalComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  // Signal-based inputs/outputs
  readonly visible = model<boolean>(false);
  readonly field = input<FormField | null>(null);

  readonly saveChanges = output<Partial<FormField>>();
  readonly cancel = output<void>();

  // Form
  quizForm: FormGroup;

  /**
   * Check if field type has options (RADIO, CHECKBOX, SELECT)
   */
  readonly hasOptions = computed(() => {
    const currentField = this.field();
    if (!currentField) return false;

    const optionFieldTypes = [
      FormFieldType.RADIO,
      FormFieldType.CHECKBOX,
      FormFieldType.SELECT,
    ];
    return optionFieldTypes.includes(currentField.type);
  });

  /**
   * Check if field is TEXT type
   */
  readonly isTextField = computed(() => {
    const currentField = this.field();
    return currentField?.type === FormFieldType.TEXT;
  });

  /**
   * Get answer options for dropdown (from field.options)
   */
  readonly answerOptions = computed(() => {
    const currentField = this.field();
    if (!currentField || !currentField.options) return [];

    return currentField.options.map((opt) => ({
      label: opt.label,
      value: opt.value,
    }));
  });

  constructor() {
    this.quizForm = this.fb.group({
      correctAnswer: [''], // Validation will be set dynamically
      points: [1, [Validators.required, Validators.min(0), Validators.max(100)]],
      explanation: [''],
      excludeFromQuiz: [false],
    });

    // Watch for excludeFromQuiz changes to update correctAnswer validation
    this.quizForm.get('excludeFromQuiz')?.valueChanges.subscribe((excluded) => {
      const correctAnswerControl = this.quizForm.get('correctAnswer');
      if (excluded) {
        // When excluded from quiz, correct answer is not required
        correctAnswerControl?.clearValidators();
        correctAnswerControl?.setValue(''); // Clear the value
      } else {
        // When NOT excluded, correct answer is required
        correctAnswerControl?.setValidators([Validators.required]);
      }
      correctAnswerControl?.updateValueAndValidity();
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
   * Load field quiz properties into form
   */
  private loadFieldProperties(field: FormField): void {
    // Extract quiz metadata
    const quizMetadata = field.metadata as QuizFieldMetadata | undefined;

    // Patch form values
    this.quizForm.patchValue(
      {
        correctAnswer: quizMetadata?.correctAnswer || '',
        points: quizMetadata?.points || 1,
        explanation: quizMetadata?.explanation || '',
        excludeFromQuiz: quizMetadata?.excludeFromQuiz || false,
      },
      { emitEvent: false },
    );

    this.quizForm.markAsPristine();
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
    this.quizForm.reset({
      correctAnswer: '',
      points: 1,
      explanation: '',
      excludeFromQuiz: false,
    });
  }

  /**
   * Save changes handler
   */
  onSaveChanges(): void {
    if (this.quizForm.invalid) {
      // Mark all fields as touched to show errors
      Object.keys(this.quizForm.controls).forEach((key) => {
        this.quizForm.get(key)?.markAsTouched();
      });
      return;
    }

    const formValues = this.quizForm.value;

    // Build quiz metadata object
    const quizMetadata: QuizFieldMetadata = {
      correctAnswer: formValues.correctAnswer,
      points: formValues.points,
      explanation: formValues.explanation || undefined,
      excludeFromQuiz: formValues.excludeFromQuiz || false,
    };

    // Emit partial field update
    const updates: Partial<FormField> = {
      metadata: quizMetadata,
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
