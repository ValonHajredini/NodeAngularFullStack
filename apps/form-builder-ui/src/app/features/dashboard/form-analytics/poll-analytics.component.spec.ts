/**
 * Poll Analytics Component Tests
 *
 * Comprehensive test suite for PollAnalyticsComponent covering:
 * - Component rendering and initialization
 * - Data transformation (PollMetrics → ChoiceDistribution)
 * - Empty state handling
 * - Summary statistics display
 * - Chart integration
 * - Accessibility compliance (ARIA labels, screen reader support)
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.7: Poll and Quiz Analytics Components (Frontend)
 *
 * @since 2025-01-27
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PollAnalyticsComponent } from './poll-analytics.component';
import { PollMetrics } from '@nodeangularfullstack/shared';
import { By } from '@angular/platform-browser';

describe('PollAnalyticsComponent', () => {
  let component: PollAnalyticsComponent;
  let fixture: ComponentFixture<PollAnalyticsComponent>;

  const mockPollMetrics: PollMetrics = {
    category: 'polls',
    totalSubmissions: 150,
    uniqueVoters: 145,
    voteCounts: {
      'Option A': 75,
      'Option B': 45,
      'Option C': 30,
    },
    votePercentages: {
      'Option A': 50,
      'Option B': 30,
      'Option C': 20,
    },
    mostPopularOption: 'Option A',
    firstSubmissionAt: '2025-01-01T00:00:00Z',
    lastSubmissionAt: '2025-01-27T12:30:00Z',
  };

  const emptyPollMetrics: PollMetrics = {
    category: 'polls',
    totalSubmissions: 0,
    uniqueVoters: 0,
    voteCounts: {},
    votePercentages: {},
    mostPopularOption: '',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PollAnalyticsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PollAnalyticsComponent);
    component = fixture.componentInstance;
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      fixture.componentRef.setInput('metrics', mockPollMetrics);
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('should have poll-analytics-container role region', () => {
      fixture.componentRef.setInput('metrics', mockPollMetrics);
      fixture.detectChanges();
      const container = fixture.nativeElement.querySelector('.poll-analytics-container');
      expect(container).toBeTruthy();
      expect(container.getAttribute('role')).toBe('region');
      expect(container.getAttribute('aria-label')).toContain('Poll analytics');
    });
  });

  describe('Summary Statistics Display', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('metrics', mockPollMetrics);
      fixture.detectChanges();
    });

    it('should display total votes statistic', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const totalVotesCard = compiled.querySelector('.bg-white.p-4.rounded-lg');
      expect(totalVotesCard?.textContent).toContain('Total Votes');
      expect(totalVotesCard?.textContent).toContain('150');
    });

    it('should display unique voters statistic', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const statsText = compiled.textContent || '';
      expect(statsText).toContain('Unique Voters');
      expect(statsText).toContain('145');
    });

    it('should display most popular option', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const statsText = compiled.textContent || '';
      expect(statsText).toContain('Most Popular');
      expect(statsText).toContain('Option A');
    });

    it('should display vote count for most popular option', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const statsText = compiled.textContent || '';
      expect(statsText).toContain('75 votes');
    });
  });

  describe('Data Transformation', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('metrics', mockPollMetrics);
      fixture.detectChanges();
    });

    it('should compute hasVotes correctly when votes exist', () => {
      expect(component.hasVotes()).toBe(true);
    });

    it('should compute hasVotes correctly when no votes', () => {
      fixture.componentRef.setInput('metrics', emptyPollMetrics);
      fixture.detectChanges();
      expect(component.hasVotes()).toBe(false);
    });

    it('should transform voteCounts to ChoiceDistribution format', () => {
      const chartData = component.chartData();
      expect(chartData.length).toBe(3);
      expect(chartData[0].label).toBe('Option A');
      expect(chartData[0].value).toBe('Option A');
      expect(chartData[0].count).toBe(75);
      expect(chartData[0].percentage).toBe(50);
    });

    it('should sort chart data by count descending', () => {
      const chartData = component.chartData();
      expect(chartData[0].count).toBe(75); // Option A
      expect(chartData[1].count).toBe(45); // Option B
      expect(chartData[2].count).toBe(30); // Option C
    });

    it('should handle empty voteCounts', () => {
      fixture.componentRef.setInput('metrics', emptyPollMetrics);
      fixture.detectChanges();
      const chartData = component.chartData();
      expect(chartData.length).toBe(0);
    });
  });

  describe('Chart Rendering', () => {
    it('should render horizontal bar chart when votes exist', () => {
      fixture.componentRef.setInput('metrics', mockPollMetrics);
      fixture.detectChanges();
      const chartComponent = fixture.debugElement.query(By.css('app-horizontal-bar-chart'));
      expect(chartComponent).toBeTruthy();
    });

    it('should pass vote distribution data to chart component', () => {
      fixture.componentRef.setInput('metrics', mockPollMetrics);
      fixture.detectChanges();
      const chartComponent = fixture.debugElement.query(By.css('app-horizontal-bar-chart'));
      const chartData = chartComponent.componentInstance.data();
      expect(chartData.length).toBe(3);
      expect(chartData[0].count).toBe(75);
    });

    it('should pass title to chart component', () => {
      fixture.componentRef.setInput('metrics', mockPollMetrics);
      fixture.detectChanges();
      const chartComponent = fixture.debugElement.query(By.css('app-horizontal-bar-chart'));
      expect(chartComponent.componentInstance.title()).toBe('Vote Distribution');
    });
  });

  describe('Empty State Handling', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('metrics', emptyPollMetrics);
      fixture.detectChanges();
    });

    it('should show empty state message when no votes', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const emptyMessage = compiled.querySelector('p-message');
      expect(emptyMessage).toBeTruthy();
      expect(emptyMessage?.textContent).toContain('No votes have been submitted yet');
    });

    it('should not render chart when no votes', () => {
      const chartComponent = fixture.debugElement.query(By.css('app-horizontal-bar-chart'));
      expect(chartComponent).toBeFalsy();
    });

    it('should have status role on empty state container', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const emptyContainer = compiled.querySelector('[role="status"]');
      expect(emptyContainer).toBeTruthy();
      expect(emptyContainer?.getAttribute('aria-label')).toContain('No poll votes yet');
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('metrics', mockPollMetrics);
      fixture.detectChanges();
    });

    it('should have aria-label on main container', () => {
      const container = fixture.nativeElement.querySelector('.poll-analytics-container');
      expect(container.getAttribute('aria-label')).toBe('Poll analytics and vote distribution');
    });

    it('should have screen reader summary with polite announcement', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const srSummary = compiled.querySelector('.sr-only[aria-live="polite"]');
      expect(srSummary).toBeTruthy();
      expect(srSummary?.textContent).toContain('Poll analytics');
      expect(srSummary?.textContent).toContain('150 total votes');
      expect(srSummary?.textContent).toContain('145 unique voters');
      expect(srSummary?.textContent).toContain('Option A');
    });

    it('should have visually hidden screen reader text with sr-only class', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const srElement = compiled.querySelector('.sr-only');
      expect(srElement).toBeTruthy();

      // Verify sr-only styles are applied (visually hidden but accessible)
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
      fixture.componentRef.setInput('metrics', mockPollMetrics);
      fixture.detectChanges();
    });

    it('should have responsive grid classes for summary cards', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const grid = compiled.querySelector('.grid.grid-cols-1.md\\:grid-cols-3');
      expect(grid).toBeTruthy();
    });

    it('should truncate long option names with title attribute', () => {
      const longOptionMetrics: PollMetrics = {
        ...mockPollMetrics,
        mostPopularOption: 'This is a very long option name that should be truncated',
      };
      fixture.componentRef.setInput('metrics', longOptionMetrics);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const popularOption = compiled.querySelector('.truncate');
      expect(popularOption?.getAttribute('title')).toBe(
        'This is a very long option name that should be truncated',
      );
    });
  });

  describe('Dynamic Updates', () => {
    it('should update statistics when metrics change', () => {
      fixture.componentRef.setInput('metrics', mockPollMetrics);
      fixture.detectChanges();

      let compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('150');

      const updatedMetrics: PollMetrics = {
        ...mockPollMetrics,
        totalSubmissions: 200,
      };
      fixture.componentRef.setInput('metrics', updatedMetrics);
      fixture.detectChanges();

      compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('200');
    });

    it('should update chart data when vote counts change', () => {
      fixture.componentRef.setInput('metrics', mockPollMetrics);
      fixture.detectChanges();

      const initialChartData = component.chartData();
      expect(initialChartData[0].count).toBe(75);

      const updatedMetrics: PollMetrics = {
        ...mockPollMetrics,
        voteCounts: {
          'Option A': 100,
          'Option B': 50,
          'Option C': 50,
        },
        votePercentages: {
          'Option A': 50,
          'Option B': 25,
          'Option C': 25,
        },
      };
      fixture.componentRef.setInput('metrics', updatedMetrics);
      fixture.detectChanges();

      const updatedChartData = component.chartData();
      expect(updatedChartData[0].count).toBe(100);
    });

    it('should toggle between chart and empty state correctly', () => {
      fixture.componentRef.setInput('metrics', mockPollMetrics);
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('app-horizontal-bar-chart'))).toBeTruthy();

      fixture.componentRef.setInput('metrics', emptyPollMetrics);
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('app-horizontal-bar-chart'))).toBeFalsy();
      expect(fixture.nativeElement.querySelector('p-message')).toBeTruthy();
    });
  });
});
