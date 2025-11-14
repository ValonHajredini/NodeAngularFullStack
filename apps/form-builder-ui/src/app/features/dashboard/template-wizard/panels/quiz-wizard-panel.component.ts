import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  FormArray,
} from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { Textarea } from 'primeng/textarea';
import { TableModule } from 'primeng/table';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TemplateWizardService } from '../services/template-wizard.service';

/**
 * Quiz question interface for question bank
 */
interface QuizQuestion {
  question: string;
  correctAnswer: string;
  points: number;
}

/**
 * Quiz Wizard Panel Component
 *
 * Provides a 5-step wizard interface for creating quiz templates:
 * 1. Basic Configuration - Set quiz title and description
 * 2. Question Bank - Add questions with correct answers
 * 3. Scoring Weights - Assign point values to questions
 * 4. Pass Criteria - Define passing score threshold
 * 5. Feedback Messages - Configure pass/fail messages
 *
 * Binds to TemplateWizardService config signals for reactive state management.
 * Includes contextual tooltips with keyboard/focus support for accessibility.
 *
 * @since Epic 30, Story 30.11
 *
 * @example
 * ```html
 * <app-quiz-wizard-panel></app-quiz-wizard-panel>
 * ```
 */
@Component({
  selector: 'app-quiz-wizard-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    InputNumberModule,
    CheckboxModule,
    MessageModule,
    TooltipModule,
    Textarea,
    TableModule,
    RadioButtonModule,
  ],
  templateUrl: './quiz-wizard-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizWizardPanelComponent implements OnInit {
  /**
   * Injected services
   */
  private readonly wizardService = inject(TemplateWizardService);
  private readonly fb = inject(FormBuilder);

  /**
   * Current wizard step (0-based index)
   * Maps to 5-step quiz configuration flow
   */
  public readonly currentStep = computed(() => this.wizardService.currentStep());

  /**
   * Quiz configuration form group
   * Contains all 5 steps' form controls
   */
  public quizForm!: FormGroup;

  /**
   * Question bank array signal
   * Holds all quiz questions with their correct answers and point values
   */
  public readonly questionBank = signal<QuizQuestion[]>([]);

  /**
   * Step metadata for display
   * Controls step navigation and labels
   */
  public readonly steps = [
    { label: 'Basic Config', icon: 'pi pi-cog' },
    { label: 'Question Bank', icon: 'pi pi-question-circle' },
    { label: 'Scoring', icon: 'pi pi-calculator' },
    { label: 'Pass Criteria', icon: 'pi pi-check-circle' },
    { label: 'Feedback', icon: 'pi pi-comment' },
  ];

  /**
   * Scoring mode options
   * Equal points or custom points per question
   */
  public readonly scoringModeOptions = [
    { label: 'Equal Points (All questions worth same value)', value: 'equal' },
    { label: 'Custom Points (Set individual question weights)', value: 'custom' },
  ];

  /**
   * Validation error messages signal
   * Updated reactively based on form validation state
   */
  public readonly validationErrors = computed(() => {
    const errors: string[] = [];

    if (this.currentStep() === 0) {
      if (this.quizForm?.get('title')?.invalid) {
        if (this.quizForm.get('title')?.errors?.['required']) {
          errors.push('Quiz title is required');
        }
        if (this.quizForm.get('title')?.errors?.['minlength']) {
          errors.push('Quiz title must be at least 5 characters');
        }
      }
    }

    if (this.currentStep() === 1 && this.questionBank().length < 1) {
      errors.push('Quiz must have at least 1 question');
    }

    if (this.currentStep() === 3) {
      const passingScore = this.quizForm?.get('passingScore')?.value;
      if (passingScore < 0 || passingScore > 100) {
        errors.push('Passing score must be between 0 and 100');
      }
    }

    if (this.currentStep() === 4) {
      if (this.quizForm?.get('passMessage')?.invalid) {
        errors.push('Pass message is required');
      }
      if (this.quizForm?.get('failMessage')?.invalid) {
        errors.push('Fail message is required');
      }
    }

    return errors;
  });

  /**
   * Is current step valid computed signal
   * Used to enable/disable "Next" button
   */
  public readonly isStepValid = computed(() => {
    const errors = this.validationErrors();
    return errors.length === 0;
  });

  /**
   * Total possible points computed signal
   * Sums up all question points
   */
  public readonly totalPoints = computed(() => {
    return this.questionBank().reduce((sum, q) => sum + q.points, 0);
  });

  constructor() {
    // Effect: Sync form state to wizard service config on changes
    effect(() => {
      if (this.quizForm) {
        const formValue = this.quizForm.value;
        this.wizardService.updateConfig({
          categoryData: {
            title: formValue.title,
            description: formValue.description,
            questions: this.questionBank(),
            scoringMode: formValue.scoringMode,
            passingScore: formValue.passingScore,
            showResults: formValue.showResults,
            allowRetakes: formValue.allowRetakes,
            passMessage: formValue.passMessage,
            failMessage: formValue.failMessage,
          },
        });
      }
    });
  }

  /**
   * Component initialization
   * Creates form controls and hydrates from wizard service if resuming
   */
  ngOnInit(): void {
    this.initializeForm();
    this.hydrateFromWizardConfig();
  }

  /**
   * Initializes the quiz configuration form
   * Sets up form controls with validation rules
   * @private
   */
  private initializeForm(): void {
    this.quizForm = this.fb.group({
      // Step 1: Basic Configuration
      title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(255)]],
      description: ['', Validators.maxLength(1000)],

      // Step 2: Question Bank (handled via questionBank signal)

      // Step 3: Scoring Weights
      scoringMode: ['equal', Validators.required],

      // Step 4: Pass Criteria
      passingScore: [70, [Validators.required, Validators.min(0), Validators.max(100)]],
      showResults: [true],
      allowRetakes: [true],

      // Step 5: Feedback Messages
      passMessage: [
        'Congratulations! You passed the quiz.',
        [Validators.required, Validators.minLength(10)],
      ],
      failMessage: [
        'Sorry, you did not pass. Please try again.',
        [Validators.required, Validators.minLength(10)],
      ],
    });
  }

  /**
   * Hydrates form from existing wizard configuration
   * Called when resuming a saved draft
   * @private
   */
  private hydrateFromWizardConfig(): void {
    const config = this.wizardService.config();
    const categoryData = config.categoryData as Record<string, any>;

    if (categoryData['title']) {
      this.quizForm.patchValue({
        title: categoryData['title'],
        description: categoryData['description'] || '',
        scoringMode: categoryData['scoringMode'] || 'equal',
        passingScore: categoryData['passingScore'] ?? 70,
        showResults: categoryData['showResults'] ?? true,
        allowRetakes: categoryData['allowRetakes'] ?? true,
        passMessage: categoryData['passMessage'] || 'Congratulations! You passed the quiz.',
        failMessage: categoryData['failMessage'] || 'Sorry, you did not pass. Please try again.',
      });
    }

    if (Array.isArray(categoryData['questions']) && categoryData['questions'].length > 0) {
      this.questionBank.set(categoryData['questions'] as any[]);
    }
  }

  /**
   * Navigate to previous step
   * Delegates to wizard service
   */
  public previousStep(): void {
    this.wizardService.previousStep();
  }

  /**
   * Navigate to next step
   * Validates current step before proceeding
   */
  public nextStep(): void {
    if (this.isStepValid()) {
      this.wizardService.nextStep();
    }
  }

  /**
   * Add a new question to the question bank
   * @param question - Question text
   * @param correctAnswer - Correct answer text
   * @param points - Point value for this question (default: 1)
   */
  public addQuestion(question: string, correctAnswer: string, points: number = 1): void {
    const trimmedQuestion = question.trim();
    const trimmedAnswer = correctAnswer.trim();

    if (trimmedQuestion && trimmedAnswer) {
      this.questionBank.update((questions) => [
        ...questions,
        { question: trimmedQuestion, correctAnswer: trimmedAnswer, points },
      ]);
    }
  }

  /**
   * Remove a question from the question bank by index
   * @param index - Question index to remove
   */
  public removeQuestion(index: number): void {
    this.questionBank.update((questions) => questions.filter((_, i) => i !== index));
  }

  /**
   * Update question points
   * @param index - Question index
   * @param points - New point value
   */
  public updateQuestionPoints(index: number, points: number): void {
    this.questionBank.update((questions) => {
      const updated = [...questions];
      updated[index] = { ...updated[index], points };
      return updated;
    });
  }

  /**
   * Apply equal points distribution to all questions
   * Typically 1 point per question
   */
  public applyEqualPoints(): void {
    this.questionBank.update((questions) => questions.map((q) => ({ ...q, points: 1 })));
  }

  /**
   * Get help text for current step
   * Displayed in tooltip or info message
   */
  public getStepHelpText(): string {
    switch (this.currentStep()) {
      case 0:
        return 'Provide a title and description for your quiz. This helps users understand what the quiz is about.';
      case 1:
        return 'Add questions to your quiz. Each question must have a correct answer.';
      case 2:
        return 'Choose how points are assigned. Equal points gives all questions the same weight, while custom allows individual weighting.';
      case 3:
        return 'Set the passing score threshold (0-100%). Users must score at or above this to pass.';
      case 4:
        return 'Configure messages shown to users when they pass or fail the quiz.';
      default:
        return '';
    }
  }
}
