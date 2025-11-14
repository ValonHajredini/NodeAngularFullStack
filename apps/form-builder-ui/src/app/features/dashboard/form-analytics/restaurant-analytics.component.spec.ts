/**
 * Restaurant Analytics Component Tests
 *
 * Comprehensive test suite for RestaurantAnalyticsComponent covering:
 * - Component rendering and initialization
 * - Data transformation (RestaurantMetrics → ChoiceDistribution)
 * - Empty state handling
 * - Summary statistics display (revenue, average order value, items ordered, order size)
 * - Chart integration (quantity and revenue charts)
 * - Accessibility compliance (ARIA labels, screen reader support)
 * - Responsive design class bindings
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.8: Product, Appointment, and Restaurant Analytics Components (Frontend)
 *
 * @since 2025-01-27
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RestaurantAnalyticsComponent } from './restaurant-analytics.component';
import { RestaurantMetrics } from '@nodeangularfullstack/shared';
import { By } from '@angular/platform-browser';

describe('RestaurantAnalyticsComponent', () => {
  let component: RestaurantAnalyticsComponent;
  let fixture: ComponentFixture<RestaurantAnalyticsComponent>;

  const mockRestaurantMetrics: RestaurantMetrics = {
    category: 'data_collection',
    totalSubmissions: 450,
    totalRevenue: 12500.75,
    averageOrderValue: 27.78,
    totalItemsOrdered: 1850,
    popularItems: [
      { itemName: 'Burger', quantity: 350, revenue: 3500 },
      { itemName: 'Fries', quantity: 425, revenue: 1275 },
      { itemName: 'Pizza', quantity: 320, revenue: 4800 },
      { itemName: 'Salad', quantity: 280, revenue: 2100 },
      { itemName: 'Soda', quantity: 475, revenue: 925.75 },
    ],
    peakOrderTime: '12:00-13:00',
    averageOrderSize: 4.1,
    firstSubmissionAt: '2025-01-01T00:00:00Z',
    lastSubmissionAt: '2025-01-27T12:30:00Z',
  };

  const emptyRestaurantMetrics: RestaurantMetrics = {
    category: 'data_collection',
    totalSubmissions: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    totalItemsOrdered: 0,
    popularItems: [],
    averageOrderSize: 0,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestaurantAnalyticsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RestaurantAnalyticsComponent);
    component = fixture.componentInstance;
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      fixture.componentRef.setInput('metrics', mockRestaurantMetrics);
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('should have restaurant-analytics-container role region', () => {
      fixture.componentRef.setInput('metrics', mockRestaurantMetrics);
      fixture.detectChanges();
      const container = fixture.nativeElement.querySelector('.restaurant-analytics-container');
      expect(container).toBeTruthy();
      expect(container.getAttribute('role')).toBe('region');
      expect(container.getAttribute('aria-label')).toContain('Restaurant order analytics');
    });
  });

  describe('Summary Statistics Display', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('metrics', mockRestaurantMetrics);
      fixture.detectChanges();
    });

    it('should display total revenue statistic', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const revenueCard = compiled.querySelector('.bg-white.p-4.rounded-lg');
      expect(revenueCard?.textContent).toContain('Total Revenue');
      expect(revenueCard?.textContent).toContain('$12,500.75');
    });

    it('should display average order value statistic', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const statsText = compiled.textContent || '';
      expect(statsText).toContain('Avg Order Value');
      expect(statsText).toContain('$27.78');
    });

    it('should display total items ordered statistic', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const statsText = compiled.textContent || '';
      expect(statsText).toContain('Items Ordered');
      expect(statsText).toContain('1,850');
    });

    it('should display average order size statistic', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const statsText = compiled.textContent || '';
      expect(statsText).toContain('Avg Order Size');
      expect(statsText).toContain('4.1');
    });

    it('should display peak order time when available', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const statsText = compiled.textContent || '';
      expect(statsText).toContain('Peak: 12:00-13:00');
    });

    it('should not display peak order time when not available', () => {
      fixture.componentRef.setInput('metrics', {
        ...mockRestaurantMetrics,
        peakOrderTime: undefined,
      });
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const statsText = compiled.textContent || '';
      expect(statsText).not.toContain('Peak:');
    });
  });

  describe('Chart Data Transformation', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('metrics', mockRestaurantMetrics);
      fixture.detectChanges();
    });

    it('should transform popularItems to quantity chart data correctly', () => {
      const quantityData = component.quantityChartData();
      expect(quantityData.length).toBe(5);
      expect(quantityData[0].label).toBe('Soda'); // Most ordered (475)
      expect(quantityData[0].count).toBe(475);
      expect(quantityData[0].percentage).toBeCloseTo(25.68, 1); // 475 / 1850 * 100
    });

    it('should sort quantity chart data by quantity descending', () => {
      const quantityData = component.quantityChartData();
      expect(quantityData[0].count).toBeGreaterThanOrEqual(quantityData[1].count);
      expect(quantityData[1].count).toBeGreaterThanOrEqual(quantityData[2].count);
    });

    it('should transform popularItems to revenue chart data correctly', () => {
      const revenueData = component.revenueChartData();
      expect(revenueData.length).toBe(5);
      expect(revenueData[0].label).toBe('Pizza'); // Highest revenue (4800)
      expect(revenueData[0].count).toBe(4800);
      expect(revenueData[0].percentage).toBeCloseTo(38.4, 1); // 4800 / 12500.75 * 100
    });

    it('should sort revenue chart data by revenue descending', () => {
      const revenueData = component.revenueChartData();
      expect(revenueData[0].count).toBeGreaterThanOrEqual(revenueData[1].count);
      expect(revenueData[1].count).toBeGreaterThanOrEqual(revenueData[2].count);
    });

    it('should limit chart data to top 10 items', () => {
      const manyItems: RestaurantMetrics = {
        ...mockRestaurantMetrics,
        popularItems: Array.from({ length: 15 }, (_, i) => ({
          itemName: `Item ${i}`,
          quantity: 100 - i,
          revenue: 1000 - i * 10,
        })),
      };
      fixture.componentRef.setInput('metrics', manyItems);
      fixture.detectChanges();

      const quantityData = component.quantityChartData();
      const revenueData = component.revenueChartData();

      expect(quantityData.length).toBe(10);
      expect(revenueData.length).toBe(10);
    });
  });

  describe('hasItems Computed Signal', () => {
    it('should return true when items exist', () => {
      fixture.componentRef.setInput('metrics', mockRestaurantMetrics);
      fixture.detectChanges();
      expect(component.hasItems()).toBe(true);
    });

    it('should return false when no items exist', () => {
      fixture.componentRef.setInput('metrics', emptyRestaurantMetrics);
      fixture.detectChanges();
      expect(component.hasItems()).toBe(false);
    });
  });

  describe('Chart Rendering', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('metrics', mockRestaurantMetrics);
      fixture.detectChanges();
    });

    it('should render quantity and revenue charts when items exist', () => {
      const charts = fixture.nativeElement.querySelectorAll('app-horizontal-bar-chart');
      expect(charts.length).toBe(2);
    });

    it('should display chart section headings', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const headingsText = compiled.textContent || '';

      expect(headingsText).toContain('Most Popular Items (Quantity)');
      expect(headingsText).toContain('Top Revenue Items');
    });

    it('should include decorative icons in chart headings', () => {
      const icons = fixture.nativeElement.querySelectorAll('h3 i[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Empty State', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('metrics', emptyRestaurantMetrics);
      fixture.detectChanges();
    });

    it('should display empty state message when no items', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const emptyMessage = compiled.querySelector('p-message');
      expect(emptyMessage).toBeTruthy();
      expect(emptyMessage?.textContent).toContain('No menu orders have been received yet');
    });

    it('should not render charts when no items', () => {
      const charts = fixture.nativeElement.querySelectorAll('app-horizontal-bar-chart');
      expect(charts.length).toBe(0);
    });

    it('should have role status on empty state container', () => {
      const emptyContainer = fixture.nativeElement.querySelector('[role="status"]');
      expect(emptyContainer).toBeTruthy();
      expect(emptyContainer.getAttribute('aria-label')).toBe('No restaurant orders yet');
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('metrics', mockRestaurantMetrics);
      fixture.detectChanges();
    });

    it('should have screen reader summary with aria-live', () => {
      const srSummary = fixture.nativeElement.querySelector('.sr-only[aria-live="polite"]');
      expect(srSummary).toBeTruthy();
      expect(srSummary.getAttribute('aria-atomic')).toBe('true');
    });

    it('should include revenue in screen reader summary', () => {
      const srSummary = fixture.nativeElement.querySelector('.sr-only[aria-live="polite"]');
      expect(srSummary?.textContent).toContain('Total revenue $12,500.75');
    });

    it('should include order count in screen reader summary', () => {
      const srSummary = fixture.nativeElement.querySelector('.sr-only[aria-live="polite"]');
      expect(srSummary?.textContent).toContain('450 orders');
    });

    it('should include average order size in screen reader summary', () => {
      const srSummary = fixture.nativeElement.querySelector('.sr-only[aria-live="polite"]');
      expect(srSummary?.textContent).toContain('4.1 items');
    });

    it('should mark decorative icons with aria-hidden', () => {
      const icons = fixture.nativeElement.querySelectorAll('.pi[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Design', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('metrics', mockRestaurantMetrics);
      fixture.detectChanges();
    });

    it('should apply grid classes for responsive summary cards', () => {
      const statsGrid = fixture.nativeElement.querySelector(
        '.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4',
      );
      expect(statsGrid).toBeTruthy();
    });

    it('should apply grid classes for responsive chart layout', () => {
      const chartsGrid = fixture.nativeElement.querySelector('.grid.grid-cols-1.lg\\:grid-cols-2');
      expect(chartsGrid).toBeTruthy();
    });

    it('should have responsive gap spacing', () => {
      const statsGrid = fixture.nativeElement.querySelector('.gap-4');
      const chartsGrid = fixture.nativeElement.querySelector('.gap-6');
      expect(statsGrid).toBeTruthy();
      expect(chartsGrid).toBeTruthy();
    });
  });
});
