import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  signal,
  model,
  input,
  output,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AccordionModule } from 'primeng/accordion';
import { CheckboxModule } from 'primeng/checkbox';
import {
  FormField,
  QuizConfig,
  QuizScoringRule,
  FormFieldType,
} from '@nodeangularfullstack/shared';

/**
 * Quiz Settings Modal Component
 * Provides UI for configuring quiz scoring rules in the form builder.
 *
 * Features:
 * - Configure correct answer for each quiz question
 * - Set custom points per question
 * - Define passing score percentage
 * - Show/hide results after submission
 * - Allow/disallow retakes
 *
 * Epic 29: Form Template System with Business Logic
 * Story 29.13: Quiz Template with Scoring Logic - Form Builder Integration
 */
@Component({
  selector: 'app-quiz-settings-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    InputNumberModule,
    SelectModule,
    ButtonModule,
    InputTextModule,
    AccordionModule,
    CheckboxModule,
  ],
  styles: [
    `
      ::ng-deep .quiz-settings-modal .p-dialog {
        max-width: 800px;
        width: 90vw;
      }

      ::ng-deep .quiz-settings-modal .p-dialog-content {
        max-height: 70vh;
        overflow-y: auto;
      }

      .question-card {
        transition: all 0.2s ease;
      }

      .question-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .settings-section {
        background: linear-gradient(to right, #f9fafb, #ffffff);
        border-left: 3px solid #14b8a6;
      }
    `,
  ],
  template: `
    <p-dialog
      [(visible)]="visible"
      [modal]="true"
      [closable]="true"
      [dismissableMask]="false"
      [draggable]="false"
      [resizable]="false"
      header="Quiz Settings"
      styleClass="quiz-settings-modal"
      (onHide)="onCancel()"
    >
      <div class="space-y-6 py-4">
        <!-- Global Quiz Settings -->
        <div class="settings-section rounded-lg border border-gray-200 p-5">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <i class="pi pi-cog text-teal-600"></i>
            Global Settings
          </h3>

          <div class="space-y-4">
            <!-- Passing Score -->
            <div class="flex flex-col gap-2">
              <label for="passingScore" class="text-sm font-medium text-gray-700">
                Passing Score (%)
              </label>
              <p-inputNumber
                id="passingScore"
                [ngModel]="localConfig().passingScore"
                (ngModelChange)="updatePassingScore($event)"
                [ngModelOptions]="{ standalone: true }"
                [min]="0"
                [max]="100"
                [showButtons]="true"
                [step]="5"
                suffix="%"
                styleClass="w-full"
              />
              <small class="text-gray-500">
                Minimum score required to pass the quiz
              </small>
            </div>

            <!-- Show Results Toggle -->
            <div class="flex items-center gap-3">
              <p-checkbox
                [ngModel]="localConfig().showResults"
                (ngModelChange)="updateShowResults($event)"
                [ngModelOptions]="{ standalone: true }"
                [binary]="true"
                inputId="showResults"
              />
              <label for="showResults" class="text-sm font-medium text-gray-700 cursor-pointer">
                Show results to user after submission
              </label>
            </div>

            <!-- Allow Retakes Toggle -->
            <div class="flex items-center gap-3">
              <p-checkbox
                [ngModel]="localConfig().allowRetakes"
                (ngModelChange)="updateAllowRetakes($event)"
                [ngModelOptions]="{ standalone: true }"
                [binary]="true"
                inputId="allowRetakes"
              />
              <label for="allowRetakes" class="text-sm font-medium text-gray-700 cursor-pointer">
                Allow users to retake the quiz
              </label>
            </div>
          </div>
        </div>

        <!-- Question Configuration -->
        <div>
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <i class="pi pi-list text-teal-600"></i>
            Question Configuration
            <span class="text-sm font-normal text-gray-500">
              ({{ quizQuestions().length }} questions)
            </span>
          </h3>

          @if (quizQuestions().length === 0) {
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <i class="pi pi-exclamation-triangle text-yellow-600 text-3xl mb-2"></i>
              <p class="text-yellow-800 font-medium mb-1">No Quiz Questions Found</p>
              <p class="text-yellow-700 text-sm">
                Add radio or select fields to your form to configure quiz questions
              </p>
            </div>
          } @else {
            <p-accordion [multiple]="true">
              @for (question of quizQuestions(); track question.id; let i = $index) {
                <p-accordion-panel [value]="i">
                  <p-accordion-header>
                    {{ getQuestionHeader(question, i) }}
                  </p-accordion-header>
                  <p-accordion-content>
                    <div class="space-y-4">
                    <!-- Question Label -->
                    <div>
                      <label class="text-sm font-medium text-gray-700 mb-1 block">
                        Question
                      </label>
                      <div class="bg-gray-50 rounded-md p-3 border border-gray-200">
                        <p class="text-gray-900">{{ question.label }}</p>
                      </div>
                    </div>

                    <!-- Points Input -->
                    <div class="flex flex-col gap-2">
                      <label
                        [for]="'points-' + question.id"
                        class="text-sm font-medium text-gray-700"
                      >
                        Points
                      </label>
                      <p-inputNumber
                        [id]="'points-' + question.id"
                        [ngModel]="getScoringRuleForQuestion(question.id).points || 1"
                        (ngModelChange)="updateQuizQuestionPoints(question.id, $event)"
                        [ngModelOptions]="{ standalone: true }"
                        [min]="1"
                        [max]="100"
                        [showButtons]="true"
                        styleClass="w-full"
                      />
                    </div>

                    <!-- Correct Answer Dropdown -->
                    <div class="flex flex-col gap-2">
                      <label
                        [for]="'correctAnswer-' + question.id"
                        class="text-sm font-medium text-gray-700"
                      >
                        Correct Answer
                      </label>
                      <select
                        [id]="'correctAnswer-' + question.id"
                        [ngModel]="getScoringRuleForQuestion(question.id).correctAnswer"
                        (ngModelChange)="updateQuizQuestionCorrectAnswer(question.id, $event)"
                        [ngModelOptions]="{ standalone: true }"
                        class="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                      >
                        <option value="">Select correct answer</option>
                        @for (option of question.options; track option.value) {
                          <option [value]="option.value">{{ option.label }}</option>
                        }
                      </select>
                      @if (!getScoringRuleForQuestion(question.id).correctAnswer) {
                        <small class="text-orange-600 flex items-center gap-1">
                          <i class="pi pi-exclamation-circle text-xs"></i>
                          Please select a correct answer
                        </small>
                      }
                    </div>
                  </div>
                  </p-accordion-content>
                </p-accordion-panel>
              }
            </p-accordion>
          }
        </div>

        <!-- Validation Summary -->
        @if (validationErrors().length > 0) {
          <div class="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 class="text-red-800 font-medium mb-2 flex items-center gap-2">
              <i class="pi pi-times-circle"></i>
              Please fix the following errors:
            </h4>
            <ul class="list-disc list-inside space-y-1">
              @for (error of validationErrors(); track error) {
                <li class="text-red-700 text-sm">{{ error }}</li>
              }
            </ul>
          </div>
        }
      </div>

      <ng-template pTemplate="footer">
        <div class="flex justify-between items-center w-full">
          <div class="text-sm text-gray-600">
            Total Points: <span class="font-semibold text-teal-600">{{ totalPoints() }}</span>
          </div>
          <div class="flex gap-2">
            <button
              pButton
              label="Cancel"
              icon="pi pi-times"
              severity="secondary"
              [outlined]="true"
              (click)="onCancel()"
            ></button>
            <button
              pButton
              label="Save Settings"
              icon="pi pi-check"
              severity="success"
              (click)="onSave()"
              [disabled]="!isValid()"
            ></button>
          </div>
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class QuizSettingsModalComponent implements OnInit {
  // Two-way binding for modal visibility
  visible = model<boolean>(false);

  // Input: current form fields
  formFields = input.required<FormField[]>();

  // Input: current quiz configuration
  quizConfig = input<QuizConfig | null>(null);

  // Output: emit updated quiz configuration
  configSaved = output<QuizConfig>();

  // Local state for quiz configuration
  localConfig = signal<QuizConfig>({
    type: 'quiz',
    scoringRules: [],
    passingScore: 70,
    showResults: true,
    allowRetakes: false,
  });

  ngOnInit(): void {
    // Initialize local config from input when component initializes
    effect(() => {
      const config = this.quizConfig();
      if (config) {
        this.localConfig.set({ ...config });
      }
    });
  }

  /**
   * Computed: Filter form fields to only quiz questions (radio and select fields with options)
   */
  quizQuestions = computed(() => {
    return this.formFields().filter(
      (field) =>
        (field.type === FormFieldType.RADIO || field.type === FormFieldType.SELECT) &&
        field.options &&
        field.options.length > 0
    );
  });

  /**
   * Computed: Calculate total points across all questions
   */
  totalPoints = computed(() => {
    return this.localConfig().scoringRules.reduce((sum, rule) => sum + (rule.points || 1), 0);
  });

  /**
   * Computed: Validation errors
   */
  validationErrors = computed(() => {
    const errors: string[] = [];
    const config = this.localConfig();
    const questions = this.quizQuestions();

    if (questions.length === 0) {
      errors.push('Add at least one quiz question (radio or select field) to your form');
    }

    // Check if all questions have correct answers configured
    questions.forEach((question, index) => {
      const rule = this.getScoringRuleForQuestion(question.id);
      if (!rule.correctAnswer) {
        errors.push(`Question ${index + 1} (${question.label}): No correct answer selected`);
      }
    });

    if (config.passingScore < 0 || config.passingScore > 100) {
      errors.push('Passing score must be between 0 and 100');
    }

    return errors;
  });

  /**
   * Computed: Check if configuration is valid
   */
  isValid = computed(() => {
    return this.validationErrors().length === 0 && this.quizQuestions().length > 0;
  });

  /**
   * Update passing score
   */
  updatePassingScore(value: number): void {
    this.localConfig.update((config) => ({
      ...config,
      passingScore: value,
    }));
  }

  /**
   * Update show results toggle
   */
  updateShowResults(value: boolean): void {
    this.localConfig.update((config) => ({
      ...config,
      showResults: value,
    }));
  }

  /**
   * Update allow retakes toggle
   */
  updateAllowRetakes(value: boolean): void {
    this.localConfig.update((config) => ({
      ...config,
      allowRetakes: value,
    }));
  }

  /**
   * Get scoring rule for a specific question, or create a default one
   */
  getScoringRuleForQuestion(fieldId: string): QuizScoringRule {
    const rule = this.localConfig().scoringRules.find((r) => r.fieldId === fieldId);
    if (rule) {
      return rule;
    }

    // Return default rule (not yet saved)
    return {
      fieldId,
      correctAnswer: '',
      points: 1,
    };
  }

  /**
   * Update points for a specific question
   */
  updateQuizQuestionPoints(fieldId: string, points: number): void {
    this.localConfig.update((config) => {
      const existingRuleIndex = config.scoringRules.findIndex((r) => r.fieldId === fieldId);

      if (existingRuleIndex >= 0) {
        // Update existing rule
        const updatedRules = [...config.scoringRules];
        updatedRules[existingRuleIndex] = {
          ...updatedRules[existingRuleIndex],
          points,
        };
        return { ...config, scoringRules: updatedRules };
      } else {
        // Create new rule
        const newRule: QuizScoringRule = {
          fieldId,
          correctAnswer: '',
          points,
        };
        return { ...config, scoringRules: [...config.scoringRules, newRule] };
      }
    });
  }

  /**
   * Update correct answer for a specific question
   */
  updateQuizQuestionCorrectAnswer(fieldId: string, correctAnswer: string): void {
    this.localConfig.update((config) => {
      const existingRuleIndex = config.scoringRules.findIndex((r) => r.fieldId === fieldId);

      if (existingRuleIndex >= 0) {
        // Update existing rule
        const updatedRules = [...config.scoringRules];
        updatedRules[existingRuleIndex] = {
          ...updatedRules[existingRuleIndex],
          correctAnswer,
        };
        return { ...config, scoringRules: updatedRules };
      } else {
        // Create new rule
        const newRule: QuizScoringRule = {
          fieldId,
          correctAnswer,
          points: 1,
        };
        return { ...config, scoringRules: [...config.scoringRules, newRule] };
      }
    });
  }

  /**
   * Get accordion header for a question
   */
  getQuestionHeader(question: FormField, index: number): string {
    const rule = this.getScoringRuleForQuestion(question.id);
    const points = rule.points || 1;
    const hasAnswer = !!rule.correctAnswer;

    return `Q${index + 1}: ${question.label} (${points} ${points === 1 ? 'point' : 'points'}) ${hasAnswer ? '✓' : '⚠️'}`;
  }

  /**
   * Handle cancel action
   */
  onCancel(): void {
    this.visible.set(false);
  }

  /**
   * Handle save action
   */
  onSave(): void {
    if (!this.isValid()) {
      return;
    }

    // Clean up scoring rules to only include questions that still exist
    const validQuestionIds = this.quizQuestions().map((q) => q.id);
    const cleanedConfig = {
      ...this.localConfig(),
      scoringRules: this.localConfig().scoringRules.filter((rule) =>
        validQuestionIds.includes(rule.fieldId)
      ),
    };

    this.configSaved.emit(cleanedConfig);
    this.visible.set(false);
  }
}
