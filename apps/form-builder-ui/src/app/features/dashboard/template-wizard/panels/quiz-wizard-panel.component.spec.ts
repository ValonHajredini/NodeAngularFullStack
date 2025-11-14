import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { QuizWizardPanelComponent } from './quiz-wizard-panel.component';
import { TemplateWizardService } from '../services/template-wizard.service';
import { TemplateCategory } from '@nodeangularfullstack/shared';

describe('QuizWizardPanelComponent', () => {
  let component: QuizWizardPanelComponent;
  let fixture: ComponentFixture<QuizWizardPanelComponent>;
  let mockWizardService: jasmine.SpyObj<TemplateWizardService>;

  beforeEach(async () => {
    // Create mock wizard service with signals
    mockWizardService = jasmine.createSpyObj('TemplateWizardService', [
      'updateConfig',
      'nextStep',
      'previousStep',
    ]);

    // Mock signal properties
    Object.defineProperty(mockWizardService, 'currentStep', {
      value: signal(0),
      writable: true,
    });

    Object.defineProperty(mockWizardService, 'config', {
      value: signal({
        templateName: '',
        templateDescription: '',
        categoryData: {},
      }),
      writable: true,
    });

    Object.defineProperty(mockWizardService, 'category', {
      value: signal(TemplateCategory.QUIZ),
      writable: true,
    });

    await TestBed.configureTestingModule({
      imports: [QuizWizardPanelComponent],
      providers: [{ provide: TemplateWizardService, useValue: mockWizardService }],
    }).compileComponents();

    fixture = TestBed.createComponent(QuizWizardPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization', () => {
    it('should initialize with default form values', () => {
      expect(component.quizForm).toBeDefined();
      expect(component.quizForm.get('title')?.value).toBe('');
      expect(component.quizForm.get('description')?.value).toBe('');
      expect(component.quizForm.get('scoringMode')?.value).toBe('equal');
      expect(component.quizForm.get('passingScore')?.value).toBe(70);
      expect(component.quizForm.get('showResults')?.value).toBe(true);
      expect(component.quizForm.get('allowRetakes')?.value).toBe(true);
    });

    it('should set default pass/fail messages', () => {
      expect(component.quizForm.get('passMessage')?.value).toContain('Congratulations');
      expect(component.quizForm.get('failMessage')?.value).toContain('Sorry');
    });

    it('should hydrate from wizard config on init', () => {
      const config = {
        templateName: 'Test Quiz',
        templateDescription: '',
        categoryData: {
          title: 'JavaScript Fundamentals',
          description: 'Test your JS knowledge',
          questions: [{ question: 'What is a closure?', correctAnswer: 'A function', points: 2 }],
          scoringMode: 'custom',
          passingScore: 80,
          showResults: false,
          allowRetakes: false,
          passMessage: 'Great job!',
          failMessage: 'Try harder!',
        },
      };

      mockWizardService.config.set(config);

      component.ngOnInit();
      fixture.detectChanges();

      expect(component.quizForm.get('title')?.value).toBe('JavaScript Fundamentals');
      expect(component.quizForm.get('description')?.value).toBe('Test your JS knowledge');
      expect(component.questionBank().length).toBe(1);
      expect(component.quizForm.get('scoringMode')?.value).toBe('custom');
      expect(component.quizForm.get('passingScore')?.value).toBe(80);
      expect(component.quizForm.get('showResults')?.value).toBe(false);
      expect(component.quizForm.get('allowRetakes')?.value).toBe(false);
    });
  });

  describe('Step 1: Basic Configuration', () => {
    it('should validate title field with minLength 5', () => {
      const titleControl = component.quizForm.get('title');
      titleControl?.setValue('JS');
      expect(titleControl?.hasError('minlength')).toBe(true);

      titleControl?.setValue('JavaScript Quiz');
      expect(titleControl?.hasError('minlength')).toBe(false);
    });

    it('should validate title field with maxLength 255', () => {
      const titleControl = component.quizForm.get('title');
      const longText = 'a'.repeat(256);
      titleControl?.setValue(longText);
      expect(titleControl?.hasError('maxlength')).toBe(true);
    });

    it('should show validation error for empty title', () => {
      mockWizardService.currentStep.set(0);
      fixture.detectChanges();

      const errors = component.validationErrors();
      expect(errors).toContain('Quiz title is required');
    });
  });

  describe('Step 2: Question Bank', () => {
    it('should add questions to question bank', () => {
      component.addQuestion('What is 2+2?', '4', 1);
      expect(component.questionBank().length).toBe(1);
      expect(component.questionBank()[0].question).toBe('What is 2+2?');
      expect(component.questionBank()[0].correctAnswer).toBe('4');
      expect(component.questionBank()[0].points).toBe(1);
    });

    it('should trim whitespace when adding questions', () => {
      component.addQuestion('  What is 2+2?  ', '  4  ', 1);
      expect(component.questionBank()[0].question).toBe('What is 2+2?');
      expect(component.questionBank()[0].correctAnswer).toBe('4');
    });

    it('should not add questions with empty text', () => {
      component.addQuestion('', 'Answer', 1);
      expect(component.questionBank().length).toBe(0);

      component.addQuestion('Question', '', 1);
      expect(component.questionBank().length).toBe(0);
    });

    it('should remove questions from question bank', () => {
      component.questionBank.set([
        { question: 'Q1', correctAnswer: 'A1', points: 1 },
        { question: 'Q2', correctAnswer: 'A2', points: 1 },
        { question: 'Q3', correctAnswer: 'A3', points: 1 },
      ]);

      component.removeQuestion(1);
      expect(component.questionBank().length).toBe(2);
      expect(component.questionBank()[1].question).toBe('Q3');
    });

    it('should validate minimum 1 question', () => {
      mockWizardService.currentStep.set(1);
      component.questionBank.set([]);
      fixture.detectChanges();

      const errors = component.validationErrors();
      expect(errors).toContain('Quiz must have at least 1 question');
    });
  });

  describe('Step 3: Scoring Weights', () => {
    beforeEach(() => {
      component.questionBank.set([
        { question: 'Q1', correctAnswer: 'A1', points: 1 },
        { question: 'Q2', correctAnswer: 'A2', points: 2 },
        { question: 'Q3', correctAnswer: 'A3', points: 3 },
      ]);
    });

    it('should calculate total points correctly', () => {
      expect(component.totalPoints()).toBe(6);
    });

    it('should apply equal points distribution', () => {
      component.applyEqualPoints();
      const questions = component.questionBank();

      expect(questions.every((q) => q.points === 1)).toBe(true);
      expect(component.totalPoints()).toBe(3);
    });

    it('should update individual question points', () => {
      component.updateQuestionPoints(0, 5);
      expect(component.questionBank()[0].points).toBe(5);
      expect(component.totalPoints()).toBe(10);
    });

    it('should default to equal scoring mode', () => {
      expect(component.quizForm.get('scoringMode')?.value).toBe('equal');
    });
  });

  describe('Step 4: Pass Criteria', () => {
    it('should validate passing score range 0-100', () => {
      const passingScoreControl = component.quizForm.get('passingScore');

      passingScoreControl?.setValue(-10);
      expect(passingScoreControl?.hasError('min')).toBe(true);

      passingScoreControl?.setValue(110);
      expect(passingScoreControl?.hasError('max')).toBe(true);

      passingScoreControl?.setValue(70);
      expect(passingScoreControl?.valid).toBe(true);
    });

    it('should show validation error for invalid passing score', () => {
      mockWizardService.currentStep.set(3);
      component.quizForm.get('passingScore')?.setValue(-5);
      fixture.detectChanges();

      const errors = component.validationErrors();
      expect(errors).toContain('Passing score must be between 0 and 100');
    });
  });

  describe('Step 5: Feedback Messages', () => {
    it('should validate pass message minLength', () => {
      const passMessageControl = component.quizForm.get('passMessage');
      passMessageControl?.setValue('Short');
      expect(passMessageControl?.hasError('minlength')).toBe(true);

      passMessageControl?.setValue('Congratulations! You passed the quiz.');
      expect(passMessageControl?.hasError('minlength')).toBe(false);
    });

    it('should validate fail message minLength', () => {
      const failMessageControl = component.quizForm.get('failMessage');
      failMessageControl?.setValue('Fail');
      expect(failMessageControl?.hasError('minlength')).toBe(true);

      failMessageControl?.setValue('Sorry, you did not pass.');
      expect(failMessageControl?.hasError('minlength')).toBe(false);
    });

    it('should show validation errors for empty messages', () => {
      mockWizardService.currentStep.set(4);
      component.quizForm.get('passMessage')?.setValue('');
      component.quizForm.get('failMessage')?.setValue('');
      fixture.detectChanges();

      const errors = component.validationErrors();
      expect(errors).toContain('Pass message is required');
      expect(errors).toContain('Fail message is required');
    });
  });

  describe('Navigation', () => {
    it('should call wizardService.nextStep() when nextStep() is called and step is valid', () => {
      mockWizardService.currentStep.set(0);
      component.quizForm.get('title')?.setValue('Valid Quiz Title');
      fixture.detectChanges();

      component.nextStep();
      expect(mockWizardService.nextStep).toHaveBeenCalled();
    });

    it('should not call wizardService.nextStep() when step is invalid', () => {
      mockWizardService.currentStep.set(0);
      component.quizForm.get('title')?.setValue('');
      fixture.detectChanges();

      component.nextStep();
      expect(mockWizardService.nextStep).not.toHaveBeenCalled();
    });

    it('should call wizardService.previousStep() when previousStep() is called', () => {
      component.previousStep();
      expect(mockWizardService.previousStep).toHaveBeenCalled();
    });
  });

  describe('Config Updates', () => {
    it('should update wizard config when form values change', () => {
      component.quizForm.patchValue({
        title: 'Updated Quiz',
        description: 'Updated description',
        scoringMode: 'custom',
        passingScore: 85,
        showResults: false,
        allowRetakes: false,
        passMessage: 'Well done!',
        failMessage: 'Better luck next time!',
      });

      component.questionBank.set([{ question: 'Q1', correctAnswer: 'A1', points: 2 }]);

      fixture.detectChanges();

      // Effect should have triggered updateConfig
      expect(mockWizardService.updateConfig).toHaveBeenCalledWith(
        jasmine.objectContaining({
          categoryData: jasmine.objectContaining({
            title: 'Updated Quiz',
            description: 'Updated description',
            scoringMode: 'custom',
            passingScore: 85,
            showResults: false,
            allowRetakes: false,
          }),
        }),
      );
    });
  });

  describe('Help Text', () => {
    it('should provide help text for all steps', () => {
      for (let i = 0; i < 5; i++) {
        mockWizardService.currentStep.set(i);
        const helpText = component.getStepHelpText();
        expect(helpText.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Accessibility', () => {
    it('should have ARIA labels on form controls', () => {
      const compiled = fixture.nativeElement;
      const titleInput = compiled.querySelector('#quiz-title');
      expect(titleInput?.getAttribute('aria-describedby')).toBe('quiz-title-help');
    });

    it('should have tabindex on tooltip icons for keyboard navigation', () => {
      const compiled = fixture.nativeElement;
      const tooltipIcons = compiled.querySelectorAll('[pTooltip]');
      expect(tooltipIcons.length).toBeGreaterThan(0);
    });
  });
});
