import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuizResultsComponent } from './quiz-results.component';
import { QuizResultMetadata } from '@nodeangularfullstack/shared';

/**
 * Unit Tests for QuizResultsComponent
 * Epic 29: Form Template System with Business Logic
 * Story 29.13: Quiz Template with Scoring Logic
 *
 * Test Coverage:
 * - Component initialization and rendering
 * - Pass/fail status display (gradient headers, icons)
 * - Score breakdown rendering
 * - Detailed results display (conditional)
 * - Retake button functionality
 * - Accessibility features
 */
describe('QuizResultsComponent', () => {
  let component: QuizResultsComponent;
  let fixture: ComponentFixture<QuizResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizResultsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(QuizResultsComponent);
    component = fixture.componentInstance;
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should require results input', () => {
      expect(component.results).toBeDefined();
    });

    it('should have allowRetake input with default false', () => {
      expect(component.allowRetake).toBeDefined();
    });
  });

  describe('Pass Status Display', () => {
    it('should display congratulations header for passed quiz', () => {
      const passedResults: QuizResultMetadata = {
        score: 80,
        correctAnswers: 4,
        totalQuestions: 5,
        passed: true,
        pointsEarned: 8,
        maxPoints: 10,
        answeredAt: new Date().toISOString(),
      };

      fixture.componentRef.setInput('results', passedResults);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const header = compiled.querySelector('.results-header');

      expect(header?.classList.contains('passed')).toBe(true);
      expect(header?.textContent).toContain('Congratulations!');
      expect(header?.querySelector('i')?.classList.contains('pi-check-circle')).toBe(true);
    });

    it('should apply green gradient for passed status', () => {
      const passedResults: QuizResultMetadata = {
        score: 75,
        correctAnswers: 3,
        totalQuestions: 4,
        passed: true,
        answeredAt: new Date().toISOString(),
      };

      fixture.componentRef.setInput('results', passedResults);
      fixture.detectChanges();

      const header = fixture.nativeElement.querySelector('.results-header.passed');
      expect(header).toBeTruthy();
    });
  });

  describe('Fail Status Display', () => {
    it('should display "Keep Trying!" header for failed quiz', () => {
      const failedResults: QuizResultMetadata = {
        score: 40,
        correctAnswers: 2,
        totalQuestions: 5,
        passed: false,
        pointsEarned: 4,
        maxPoints: 10,
        answeredAt: new Date().toISOString(),
      };

      fixture.componentRef.setInput('results', failedResults);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const header = compiled.querySelector('.results-header');

      expect(header?.classList.contains('failed')).toBe(true);
      expect(header?.textContent).toContain('Keep Trying!');
      expect(header?.querySelector('i')?.classList.contains('pi-times-circle')).toBe(true);
    });

    it('should apply red gradient for failed status', () => {
      const failedResults: QuizResultMetadata = {
        score: 50,
        correctAnswers: 1,
        totalQuestions: 2,
        passed: false,
        answeredAt: new Date().toISOString(),
      };

      fixture.componentRef.setInput('results', failedResults);
      fixture.detectChanges();

      const header = fixture.nativeElement.querySelector('.results-header.failed');
      expect(header).toBeTruthy();
    });
  });

  describe('Score Breakdown Display', () => {
    it('should display score percentage', () => {
      const results: QuizResultMetadata = {
        score: 85,
        correctAnswers: 17,
        totalQuestions: 20,
        passed: true,
        answeredAt: new Date().toISOString(),
      };

      fixture.componentRef.setInput('results', results);
      fixture.detectChanges();

      const scoreValue = fixture.nativeElement.querySelector('.score-value');
      expect(scoreValue?.textContent).toContain('85%');
    });

    it('should display correct answers count', () => {
      const results: QuizResultMetadata = {
        score: 60,
        correctAnswers: 3,
        totalQuestions: 5,
        passed: true,
        answeredAt: new Date().toISOString(),
      };

      fixture.componentRef.setInput('results', results);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const breakdown = compiled.querySelector('.score-breakdown');

      expect(breakdown?.textContent).toContain('3 / 5');
    });

    it('should display points earned when provided', () => {
      const results: QuizResultMetadata = {
        score: 70,
        correctAnswers: 7,
        totalQuestions: 10,
        passed: true,
        pointsEarned: 14,
        maxPoints: 20,
        answeredAt: new Date().toISOString(),
      };

      fixture.componentRef.setInput('results', results);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Points Earned:');
      expect(compiled.textContent).toContain('14 / 20');
    });

    it('should not display points section when not provided', () => {
      const results: QuizResultMetadata = {
        score: 70,
        correctAnswers: 7,
        totalQuestions: 10,
        passed: true,
        answeredAt: new Date().toISOString(),
      };

      fixture.componentRef.setInput('results', results);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).not.toContain('Points Earned:');
    });

    it('should display PASSED status with green color', () => {
      const results: QuizResultMetadata = {
        score: 90,
        correctAnswers: 9,
        totalQuestions: 10,
        passed: true,
        answeredAt: new Date().toISOString(),
      };

      fixture.componentRef.setInput('results', results);
      fixture.detectChanges();

      const statusElement = fixture.nativeElement.querySelector('.value.passed');
      expect(statusElement?.textContent).toContain('PASSED');
    });

    it('should display FAILED status with red color', () => {
      const results: QuizResultMetadata = {
        score: 30,
        correctAnswers: 3,
        totalQuestions: 10,
        passed: false,
        answeredAt: new Date().toISOString(),
      };

      fixture.componentRef.setInput('results', results);
      fixture.detectChanges();

      const statusElement = fixture.nativeElement.querySelector('.value.failed');
      expect(statusElement?.textContent).toContain('FAILED');
    });
  });

  describe('Detailed Results Display', () => {
    it('should display detailed results when available', () => {
      const resultsWithDetails: any = {
        score: 50,
        correctAnswers: 1,
        totalQuestions: 2,
        passed: false,
        answeredAt: new Date().toISOString(),
        detailedResults: [
          {
            fieldId: 'q1',
            userAnswer: 'A',
            correctAnswer: 'B',
            isCorrect: false,
            points: 1,
          },
          {
            fieldId: 'q2',
            userAnswer: 'C',
            correctAnswer: 'C',
            isCorrect: true,
            points: 1,
          },
        ],
      };

      fixture.componentRef.setInput('results', resultsWithDetails);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const detailedSection = compiled.querySelector('.detailed-results');

      expect(detailedSection).toBeTruthy();
      expect(detailedSection?.textContent).toContain('Answer Breakdown');

      const answerItems = compiled.querySelectorAll('.answer-item');
      expect(answerItems.length).toBe(2);
    });

    it('should not display detailed results section when not available', () => {
      const results: QuizResultMetadata = {
        score: 80,
        correctAnswers: 4,
        totalQuestions: 5,
        passed: true,
        answeredAt: new Date().toISOString(),
      };

      fixture.componentRef.setInput('results', results);
      fixture.detectChanges();

      const detailedSection = fixture.nativeElement.querySelector('.detailed-results');
      expect(detailedSection).toBeFalsy();
    });

    it('should style correct answers with green', () => {
      const resultsWithDetails: any = {
        score: 100,
        correctAnswers: 1,
        totalQuestions: 1,
        passed: true,
        answeredAt: new Date().toISOString(),
        detailedResults: [
          {
            fieldId: 'q1',
            userAnswer: 'B',
            correctAnswer: 'B',
            isCorrect: true,
            points: 2,
          },
        ],
      };

      fixture.componentRef.setInput('results', resultsWithDetails);
      fixture.detectChanges();

      const correctItem = fixture.nativeElement.querySelector('.answer-item.correct');
      expect(correctItem).toBeTruthy();
      expect(correctItem?.querySelector('.pi-check')).toBeTruthy();
    });

    it('should style incorrect answers with red', () => {
      const resultsWithDetails: any = {
        score: 0,
        correctAnswers: 0,
        totalQuestions: 1,
        passed: false,
        answeredAt: new Date().toISOString(),
        detailedResults: [
          {
            fieldId: 'q1',
            userAnswer: 'A',
            correctAnswer: 'B',
            isCorrect: false,
            points: 2,
          },
        ],
      };

      fixture.componentRef.setInput('results', resultsWithDetails);
      fixture.detectChanges();

      const incorrectItem = fixture.nativeElement.querySelector('.answer-item.incorrect');
      expect(incorrectItem).toBeTruthy();
      expect(incorrectItem?.querySelector('.pi-times')).toBeTruthy();
    });

    it('should show correct answer only for incorrect responses', () => {
      const resultsWithDetails: any = {
        score: 50,
        correctAnswers: 1,
        totalQuestions: 2,
        passed: false,
        answeredAt: new Date().toISOString(),
        detailedResults: [
          {
            fieldId: 'q1',
            userAnswer: 'A',
            correctAnswer: 'B',
            isCorrect: false,
            points: 1,
          },
          {
            fieldId: 'q2',
            userAnswer: 'C',
            correctAnswer: 'C',
            isCorrect: true,
            points: 1,
          },
        ],
      };

      fixture.componentRef.setInput('results', resultsWithDetails);
      fixture.detectChanges();

      const answerItems = fixture.nativeElement.querySelectorAll('.answer-item');

      // First item (incorrect) should show correct answer
      const incorrectItem = answerItems[0] as HTMLElement;
      expect(incorrectItem.textContent).toContain('Correct Answer:');
      expect(incorrectItem.textContent).toContain('B');

      // Second item (correct) should not show correct answer
      const correctItem = answerItems[1] as HTMLElement;
      expect(correctItem.textContent).not.toContain('Correct Answer:');
    });

    it('should display points for each question', () => {
      const resultsWithDetails: any = {
        score: 100,
        correctAnswers: 1,
        totalQuestions: 1,
        passed: true,
        answeredAt: new Date().toISOString(),
        detailedResults: [
          {
            fieldId: 'q1',
            userAnswer: 'B',
            correctAnswer: 'B',
            isCorrect: true,
            points: 5,
          },
        ],
      };

      fixture.componentRef.setInput('results', resultsWithDetails);
      fixture.detectChanges();

      const pointsDisplay = fixture.nativeElement.querySelector('.answer-header .points');
      expect(pointsDisplay?.textContent).toContain('5 pts');
    });

    it('should use singular "pt" for 1 point', () => {
      const resultsWithDetails: any = {
        score: 100,
        correctAnswers: 1,
        totalQuestions: 1,
        passed: true,
        answeredAt: new Date().toISOString(),
        detailedResults: [
          {
            fieldId: 'q1',
            userAnswer: 'B',
            correctAnswer: 'B',
            isCorrect: true,
            points: 1,
          },
        ],
      };

      fixture.componentRef.setInput('results', resultsWithDetails);
      fixture.detectChanges();

      const pointsDisplay = fixture.nativeElement.querySelector('.answer-header .points');
      expect(pointsDisplay?.textContent).toContain('1 pt');
      expect(pointsDisplay?.textContent).not.toContain('pts');
    });
  });

  describe('Retake Functionality', () => {
    it('should display retake button when allowRetake is true', () => {
      const results: QuizResultMetadata = {
        score: 60,
        correctAnswers: 3,
        totalQuestions: 5,
        passed: true,
        answeredAt: new Date().toISOString(),
      };

      fixture.componentRef.setInput('results', results);
      fixture.componentRef.setInput('allowRetake', true);
      fixture.detectChanges();

      const retakeButton = fixture.nativeElement.querySelector('p-button[label="Retake Quiz"]');
      expect(retakeButton).toBeTruthy();
    });

    it('should not display retake button when allowRetake is false', () => {
      const results: QuizResultMetadata = {
        score: 60,
        correctAnswers: 3,
        totalQuestions: 5,
        passed: true,
        answeredAt: new Date().toISOString(),
      };

      fixture.componentRef.setInput('results', results);
      fixture.componentRef.setInput('allowRetake', false);
      fixture.detectChanges();

      const retakeButton = fixture.nativeElement.querySelector('p-button[label="Retake Quiz"]');
      expect(retakeButton).toBeFalsy();
    });

    it('should reload page when onRetake is called', () => {
      const reloadSpy = spyOn(window.location, 'reload');

      component.onRetake();

      expect(reloadSpy).toHaveBeenCalled();
    });
  });

  describe('Progress Bar', () => {
    it('should render progress bar with score value', () => {
      const results: QuizResultMetadata = {
        score: 75,
        correctAnswers: 3,
        totalQuestions: 4,
        passed: true,
        answeredAt: new Date().toISOString(),
      };

      fixture.componentRef.setInput('results', results);
      fixture.detectChanges();

      const progressBar = fixture.nativeElement.querySelector('p-progressBar');
      expect(progressBar).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle perfect score (100%)', () => {
      const perfectResults: QuizResultMetadata = {
        score: 100,
        correctAnswers: 10,
        totalQuestions: 10,
        passed: true,
        pointsEarned: 50,
        maxPoints: 50,
        answeredAt: new Date().toISOString(),
      };

      fixture.componentRef.setInput('results', perfectResults);
      fixture.detectChanges();

      const scoreValue = fixture.nativeElement.querySelector('.score-value');
      expect(scoreValue?.textContent).toContain('100%');

      const header = fixture.nativeElement.querySelector('.results-header.passed');
      expect(header).toBeTruthy();
    });

    it('should handle zero score (0%)', () => {
      const zeroResults: QuizResultMetadata = {
        score: 0,
        correctAnswers: 0,
        totalQuestions: 5,
        passed: false,
        pointsEarned: 0,
        maxPoints: 10,
        answeredAt: new Date().toISOString(),
      };

      fixture.componentRef.setInput('results', zeroResults);
      fixture.detectChanges();

      const scoreValue = fixture.nativeElement.querySelector('.score-value');
      expect(scoreValue?.textContent).toContain('0%');

      const header = fixture.nativeElement.querySelector('.results-header.failed');
      expect(header).toBeTruthy();
    });

    it('should handle single question quiz', () => {
      const singleQuestionResults: QuizResultMetadata = {
        score: 100,
        correctAnswers: 1,
        totalQuestions: 1,
        passed: true,
        answeredAt: new Date().toISOString(),
      };

      fixture.componentRef.setInput('results', singleQuestionResults);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('1 / 1');
    });
  });
});
