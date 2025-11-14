/**
 * Quiz Analytics Component Tests
 *
 * Comprehensive test suite for QuizAnalyticsComponent covering:
 * - Component rendering and initialization
 * - Summary statistics display (average, median, pass rate, score range)
 * - Score distribution histogram rendering
 * - Pass/fail pie chart rendering
 * - Question accuracy visualization
 * - Data transformation (QuizMetrics → ChoiceDistribution)
 * - Empty state handling
 * - Accessibility compliance (ARIA labels, progress bars, screen reader support)
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.7: Poll and Quiz Analytics Components (Frontend)
 *
 * @since 2025-01-27
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuizAnalyticsComponent } from './quiz-analytics.component';
import { QuizMetrics } from '@nodeangularfullstack/shared';
import { By } from '@angular/platform-browser';

describe('QuizAnalyticsComponent', () => {
  let component: QuizAnalyticsComponent;
  let fixture: ComponentFixture<QuizAnalyticsComponent>;

  const mockQuizMetrics: QuizMetrics = {
    category: 'quiz',
    totalSubmissions: 200,
    averageScore: 75.5,
    medianScore: 80,
    passRate: 68.5,
    scoreDistribution: {
      '0-20': 10,
      '21-40': 15,
      '41-60': 25,
      '61-80': 80,
      '81-100': 70,
    },
    questionAccuracy: {
      q1: 85.5,
      q2: 62.0,
      q3: 91.5,
    },
    highestScore: 100,
    lowestScore: 15,
    firstSubmissionAt: '2025-01-01T00:00:00Z',
    lastSubmissionAt: '2025-01-27T12:30:00Z',
  };

  const emptyQuizMetrics: QuizMetrics = {
    category: 'quiz',
    totalSubmissions: 0,
    averageScore: 0,
    medianScore: 0,
    passRate: 0,
    scoreDistribution: {},
    questionAccuracy: {},
    highestScore: 0,
    lowestScore: 0,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizAnalyticsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(QuizAnalyticsComponent);
    component = fixture.componentInstance;
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      fixture.componentRef.setInput('metrics', mockQuizMetrics);
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('should have quiz-analytics-container role region', () => {
      fixture.componentRef.setInput('metrics', mockQuizMetrics);
      fixture.detectChanges();
      const container = fixture.nativeElement.querySelector('.quiz-analytics-container');
      expect(container).toBeTruthy();
      expect(container.getAttribute('role')).toBe('region');
      expect(container.getAttribute('aria-label')).toContain('Quiz analytics');
    });
  });

  describe('Summary Statistics Display', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('metrics', mockQuizMetrics);
      fixture.detectChanges();
    });

    it('should display average score with one decimal place', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const statsText = compiled.textContent || '';
      expect(statsText).toContain('Average Score');
      expect(statsText).toContain('75.5%');
    });

    it('should display median score as integer', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const statsText = compiled.textContent || '';
      expect(statsText).toContain('Median Score');
      expect(statsText).toContain('80%');
    });

    it('should display pass rate with one decimal place', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const statsText = compiled.textContent || '';
      expect(statsText).toContain('Pass Rate');
      expect(statsText).toContain('68.5%');
    });

    it('should display passed count correctly', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const passedCount = component.passedCount();
      expect(passedCount).toBe(137); // 68.5% of 200 = 137
      expect(compiled.textContent).toContain('137 of 200 passed');
    });

    it('should display score range (min to max)', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const statsText = compiled.textContent || '';
      expect(statsText).toContain('Score Range');
      expect(statsText).toContain('15% - 100%');
    });
  });

  describe('Data Transformation - Score Distribution', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('metrics', mockQuizMetrics);
      fixture.detectChanges();
    });

    it('should compute hasSubmissions correctly when submissions exist', () => {
      expect(component.hasSubmissions()).toBe(true);
    });

    it('should compute hasSubmissions correctly when no submissions', () => {
      fixture.componentRef.setInput('metrics', emptyQuizMetrics);
      fixture.detectChanges();
      expect(component.hasSubmissions()).toBe(false);
    });

    it('should transform scoreDistribution to ChoiceDistribution format', () => {
      const chartData = component.scoreDistributionData();
      expect(chartData.length).toBe(5);
      expect(chartData[0].label).toBe('0-20');
      expect(chartData[0].count).toBe(10);
      expect(chartData[0].percentage).toBe(5); // 10/200 * 100
    });

    it('should sort score distribution by range (ascending)', () => {
      const chartData = component.scoreDistributionData();
      expect(chartData[0].label).toBe('0-20');
      expect(chartData[1].label).toBe('21-40');
      expect(chartData[2].label).toBe('41-60');
      expect(chartData[3].label).toBe('61-80');
      expect(chartData[4].label).toBe('81-100');
    });

    it('should handle empty scoreDistribution', () => {
      fixture.componentRef.setInput('metrics', emptyQuizMetrics);
      fixture.detectChanges();
      const chartData = component.scoreDistributionData();
      expect(chartData.length).toBe(0);
    });
  });

  describe('Data Transformation - Pass/Fail', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('metrics', mockQuizMetrics);
      fixture.detectChanges();
    });

    it('should generate pass/fail data for pie chart', () => {
      const passFailData = component.passFailData();
      expect(passFailData.length).toBe(2);

      const passedData = passFailData.find((d) => d.label === 'Passed');
      expect(passedData).toBeTruthy();
      expect(passedData?.count).toBe(137);
      expect(passedData?.percentage).toBe(68.5);

      const failedData = passFailData.find((d) => d.label === 'Failed');
      expect(failedData).toBeTruthy();
      expect(failedData?.count).toBe(63); // 200 - 137
      expect(failedData?.percentage).toBe(31.5); // 100 - 68.5
    });

    it('should handle 100% pass rate correctly', () => {
      const perfectMetrics: QuizMetrics = {
        ...mockQuizMetrics,
        passRate: 100,
      };
      fixture.componentRef.setInput('metrics', perfectMetrics);
      fixture.detectChanges();

      const passFailData = component.passFailData();
      const passedData = passFailData.find((d) => d.label === 'Passed');
      const failedData = passFailData.find((d) => d.label === 'Failed');

      expect(passedData?.count).toBe(200);
      expect(failedData?.count).toBe(0);
    });

    it('should handle 0% pass rate correctly', () => {
      const zeroPassMetrics: QuizMetrics = {
        ...mockQuizMetrics,
        passRate: 0,
      };
      fixture.componentRef.setInput('metrics', zeroPassMetrics);
      fixture.detectChanges();

      const passFailData = component.passFailData();
      const passedData = passFailData.find((d) => d.label === 'Passed');
      const failedData = passFailData.find((d) => d.label === 'Failed');

      expect(passedData?.count).toBe(0);
      expect(failedData?.count).toBe(200);
    });
  });

  describe('Data Transformation - Question Accuracy', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('metrics', mockQuizMetrics);
      fixture.detectChanges();
    });

    it('should check if question accuracy data exists', () => {
      expect(component.hasQuestionAccuracy()).toBe(true);
    });

    it('should return false when no question accuracy data', () => {
      fixture.componentRef.setInput('metrics', emptyQuizMetrics);
      fixture.detectChanges();
      expect(component.hasQuestionAccuracy()).toBe(false);
    });

    it('should transform questionAccuracy to array format', () => {
      const questionList = component.questionAccuracyList();
      expect(questionList.length).toBe(3);
      expect(questionList[0].questionId).toBeTruthy();
      expect(questionList[0].accuracy).toBeGreaterThan(0);
    });

    it('should sort questions by accuracy ascending (hardest first)', () => {
      const questionList = component.questionAccuracyList();
      expect(questionList[0].accuracy).toBe(62.0); // q2 (hardest)
      expect(questionList[1].accuracy).toBe(85.5); // q1
      expect(questionList[2].accuracy).toBe(91.5); // q3 (easiest)
    });
  });

  describe('Chart Rendering', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('metrics', mockQuizMetrics);
      fixture.detectChanges();
    });

    it('should render score distribution bar chart when submissions exist', () => {
      const barChart = fixture.debugElement.query(By.css('app-bar-chart'));
      expect(barChart).toBeTruthy();
    });

    it('should pass score distribution data to bar chart component', () => {
      const barChart = fixture.debugElement.query(By.css('app-bar-chart'));
      const chartData = barChart.componentInstance.data();
      expect(chartData.length).toBe(5);
      expect(chartData[0].label).toBe('0-20');
    });

    it('should render pass/fail pie chart when submissions exist', () => {
      const pieChart = fixture.debugElement.query(By.css('app-pie-chart'));
      expect(pieChart).toBeTruthy();
    });

    it('should pass pass/fail data to pie chart component', () => {
      const pieChart = fixture.debugElement.query(By.css('app-pie-chart'));
      const chartData = pieChart.componentInstance.data();
      expect(chartData.length).toBe(2);
      expect(chartData.find((d: any) => d.label === 'Passed')).toBeTruthy();
    });

    it('should set correct titles on charts', () => {
      const barChart = fixture.debugElement.query(By.css('app-bar-chart'));
      const pieChart = fixture.debugElement.query(By.css('app-pie-chart'));

      expect(barChart.componentInstance.title()).toBe('Score Distribution');
      expect(pieChart.componentInstance.title()).toBe('Pass vs Fail Rate');
    });
  });

  describe('Question Accuracy Visualization', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('metrics', mockQuizMetrics);
      fixture.detectChanges();
    });

    it('should display question accuracy section when data exists', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Question Accuracy');
    });

    it('should render progress bars for each question', () => {
      const progressBars = fixture.nativeElement.querySelectorAll('[role="progressbar"]');
      expect(progressBars.length).toBe(3);
    });

    it('should set correct aria attributes on progress bars', () => {
      const progressBars = fixture.nativeElement.querySelectorAll('[role="progressbar"]');
      const firstProgress = progressBars[0] as HTMLElement;

      expect(firstProgress.getAttribute('aria-valuemin')).toBe('0');
      expect(firstProgress.getAttribute('aria-valuemax')).toBe('100');
      expect(firstProgress.getAttribute('aria-valuenow')).toBeTruthy();
      expect(firstProgress.getAttribute('aria-label')).toContain('accuracy');
    });

    it('should apply color coding based on accuracy level', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const progressBars = compiled.querySelectorAll('.h-2.rounded-full.transition-all');

      // Check that different color classes are applied
      const hasGreen = Array.from(progressBars).some((bar) =>
        bar.classList.contains('bg-green-500'),
      );
      const hasYellow = Array.from(progressBars).some((bar) =>
        bar.classList.contains('bg-yellow-500'),
      );

      expect(hasGreen || hasYellow).toBe(true);
    });

    it('should not render question accuracy section when no data', () => {
      fixture.componentRef.setInput('metrics', emptyQuizMetrics);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).not.toContain('Question Accuracy');
    });
  });

  describe('Empty State Handling', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('metrics', emptyQuizMetrics);
      fixture.detectChanges();
    });

    it('should show empty state message when no submissions', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const emptyMessage = compiled.querySelector('p-message');
      expect(emptyMessage).toBeTruthy();
      expect(emptyMessage?.textContent).toContain('No quiz submissions');
    });

    it('should not render charts when no submissions', () => {
      const barChart = fixture.debugElement.query(By.css('app-bar-chart'));
      const pieChart = fixture.debugElement.query(By.css('app-pie-chart'));
      expect(barChart).toBeFalsy();
      expect(pieChart).toBeFalsy();
    });

    it('should have status role on empty state container', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const emptyContainer = compiled.querySelector('[role="status"]');
      expect(emptyContainer).toBeTruthy();
      expect(emptyContainer?.getAttribute('aria-label')).toContain('No quiz submissions yet');
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('metrics', mockQuizMetrics);
      fixture.detectChanges();
    });

    it('should have aria-label on main container', () => {
      const container = fixture.nativeElement.querySelector('.quiz-analytics-container');
      expect(container.getAttribute('aria-label')).toContain('Quiz analytics');
    });

    it('should have screen reader summary with polite announcement', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const srSummary = compiled.querySelector('.sr-only[aria-live="polite"]');
      expect(srSummary).toBeTruthy();
      expect(srSummary?.textContent).toContain('Quiz analytics');
      expect(srSummary?.textContent).toContain('200 submissions');
      expect(srSummary?.textContent).toContain('75.5%');
      expect(srSummary?.textContent).toContain('68.5%');
    });

    it('should have visually hidden screen reader text with sr-only class', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const srElement = compiled.querySelector('.sr-only');
      expect(srElement).toBeTruthy();

      const styles = window.getComputedStyle(srElement as Element);
      expect(styles.position).toBe('absolute');
    });

    it('should have decorative icons with aria-hidden', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const icons = compiled.querySelectorAll('.pi[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Design', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('metrics', mockQuizMetrics);
      fixture.detectChanges();
    });

    it('should have responsive grid classes for summary cards', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const grid = compiled.querySelector(
        '.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4',
      );
      expect(grid).toBeTruthy();
    });

    it('should have responsive grid for charts', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const chartsGrid = compiled.querySelector('.grid.grid-cols-1.lg\\:grid-cols-2');
      expect(chartsGrid).toBeTruthy();
    });

    it('should have responsive grid for question accuracy', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const accuracyGrid = compiled.querySelector(
        '.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3',
      );
      expect(accuracyGrid).toBeTruthy();
    });
  });

  describe('Dynamic Updates', () => {
    it('should update statistics when metrics change', () => {
      fixture.componentRef.setInput('metrics', mockQuizMetrics);
      fixture.detectChanges();

      let compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('75.5%');

      const updatedMetrics: QuizMetrics = {
        ...mockQuizMetrics,
        averageScore: 85.0,
      };
      fixture.componentRef.setInput('metrics', updatedMetrics);
      fixture.detectChanges();

      compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('85.0%');
    });

    it('should update chart data when score distribution changes', () => {
      fixture.componentRef.setInput('metrics', mockQuizMetrics);
      fixture.detectChanges();

      const initialChartData = component.scoreDistributionData();
      expect(initialChartData[0].count).toBe(10);

      const updatedMetrics: QuizMetrics = {
        ...mockQuizMetrics,
        scoreDistribution: {
          '0-20': 20,
          '21-40': 30,
          '41-60': 40,
          '61-80': 60,
          '81-100': 50,
        },
      };
      fixture.componentRef.setInput('metrics', updatedMetrics);
      fixture.detectChanges();

      const updatedChartData = component.scoreDistributionData();
      expect(updatedChartData[0].count).toBe(20);
    });

    it('should toggle between charts and empty state correctly', () => {
      fixture.componentRef.setInput('metrics', mockQuizMetrics);
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('app-bar-chart'))).toBeTruthy();
      expect(fixture.debugElement.query(By.css('app-pie-chart'))).toBeTruthy();

      fixture.componentRef.setInput('metrics', emptyQuizMetrics);
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('app-bar-chart'))).toBeFalsy();
      expect(fixture.debugElement.query(By.css('app-pie-chart'))).toBeFalsy();
      expect(fixture.nativeElement.querySelector('p-message')).toBeTruthy();
    });

    it('should recalculate passed count when pass rate changes', () => {
      fixture.componentRef.setInput('metrics', mockQuizMetrics);
      fixture.detectChanges();
      expect(component.passedCount()).toBe(137);

      const updatedMetrics: QuizMetrics = {
        ...mockQuizMetrics,
        passRate: 80.0,
      };
      fixture.componentRef.setInput('metrics', updatedMetrics);
      fixture.detectChanges();
      expect(component.passedCount()).toBe(160); // 80% of 200
    });
  });
});
