/**
 * Product Analytics Component Tests
 *
 * Comprehensive test suite for ProductAnalyticsComponent covering:
 * - Component rendering and initialization
 * - Data transformation (ProductMetrics → ChoiceDistribution)
 * - Empty state handling
 * - Summary statistics display (revenue, average order value, items sold, low stock)
 * - Chart integration (revenue and quantity charts)
 * - Accessibility compliance (ARIA labels, screen reader support)
 * - Responsive design class bindings
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.8: Product, Appointment, and Restaurant Analytics Components (Frontend)
 *
 * @since 2025-01-27
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductAnalyticsComponent } from './product-analytics.component';
import { ProductMetrics } from '@nodeangularfullstack/shared';
import { By } from '@angular/platform-browser';

describe('ProductAnalyticsComponent', () => {
  let component: ProductAnalyticsComponent;
  let fixture: ComponentFixture<ProductAnalyticsComponent>;

  const mockProductMetrics: ProductMetrics = {
    category: 'ecommerce',
    totalSubmissions: 500,
    totalRevenue: 15750.5,
    averageOrderValue: 31.5,
    totalItemsSold: 1250,
    topProducts: [
      { productId: 'prod_123', name: 'Widget', quantity: 450, revenue: 6750 },
      { productId: 'prod_456', name: 'Gadget', quantity: 350, revenue: 5250 },
      { productId: 'prod_789', name: 'Gizmo', quantity: 200, revenue: 2000 },
      { productId: 'prod_012', name: 'Doohickey', quantity: 150, revenue: 1200 },
      { productId: 'prod_345', name: 'Thingamajig', quantity: 100, revenue: 550.5 },
    ],
    lowStockAlerts: 3,
    firstSubmissionAt: '2025-01-01T00:00:00Z',
    lastSubmissionAt: '2025-01-27T12:30:00Z',
  };

  const emptyProductMetrics: ProductMetrics = {
    category: 'ecommerce',
    totalSubmissions: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    totalItemsSold: 0,
    topProducts: [],
    lowStockAlerts: 0,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductAnalyticsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductAnalyticsComponent);
    component = fixture.componentInstance;
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      fixture.componentRef.setInput('metrics', mockProductMetrics);
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('should have product-analytics-container role region', () => {
      fixture.componentRef.setInput('metrics', mockProductMetrics);
      fixture.detectChanges();
      const container = fixture.nativeElement.querySelector('.product-analytics-container');
      expect(container).toBeTruthy();
      expect(container.getAttribute('role')).toBe('region');
      expect(container.getAttribute('aria-label')).toContain('Product sales analytics');
    });
  });

  describe('Summary Statistics Display', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('metrics', mockProductMetrics);
      fixture.detectChanges();
    });

    it('should display total revenue statistic', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const revenueCard = compiled.querySelector('.bg-white.p-4.rounded-lg');
      expect(revenueCard?.textContent).toContain('Total Revenue');
      expect(revenueCard?.textContent).toContain('$15,750.50');
    });

    it('should display average order value statistic', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const statsText = compiled.textContent || '';
      expect(statsText).toContain('Avg Order Value');
      expect(statsText).toContain('$31.50');
    });

    it('should display total items sold statistic', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const statsText = compiled.textContent || '';
      expect(statsText).toContain('Items Sold');
      expect(statsText).toContain('1,250');
    });

    it('should display low stock alerts statistic', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const statsText = compiled.textContent || '';
      expect(statsText).toContain('Low Stock Alerts');
      expect(statsText).toContain('3');
    });

    it('should apply orange styling when low stock alerts exist', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const lowStockCard = Array.from(compiled.querySelectorAll('.bg-white.p-4.rounded-lg')).find(
        (card) => card.textContent?.includes('Low Stock Alerts'),
      );
      expect(lowStockCard?.classList.contains('border-orange-300')).toBe(true);
    });

    it('should apply gray styling when no low stock alerts', () => {
      fixture.componentRef.setInput('metrics', { ...mockProductMetrics, lowStockAlerts: 0 });
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const lowStockCard = Array.from(compiled.querySelectorAll('.bg-white.p-4.rounded-lg')).find(
        (card) => card.textContent?.includes('Low Stock Alerts'),
      );
      expect(lowStockCard?.classList.contains('border-gray-200')).toBe(true);
    });
  });

  describe('Chart Data Transformation', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('metrics', mockProductMetrics);
      fixture.detectChanges();
    });

    it('should transform topProducts to revenue chart data correctly', () => {
      const revenueData = component.revenueChartData();
      expect(revenueData.length).toBe(5);
      expect(revenueData[0].label).toBe('Widget');
      expect(revenueData[0].count).toBe(6750);
      expect(revenueData[0].percentage).toBeCloseTo(42.86, 1); // 6750 / 15750.5 * 100
    });

    it('should sort revenue chart data by revenue descending', () => {
      const revenueData = component.revenueChartData();
      expect(revenueData[0].count).toBeGreaterThanOrEqual(revenueData[1].count);
      expect(revenueData[1].count).toBeGreaterThanOrEqual(revenueData[2].count);
    });

    it('should transform topProducts to quantity chart data correctly', () => {
      const quantityData = component.quantityChartData();
      expect(quantityData.length).toBe(5);
      expect(quantityData[0].label).toBe('Widget');
      expect(quantityData[0].count).toBe(450);
      expect(quantityData[0].percentage).toBeCloseTo(36.0, 1); // 450 / 1250 * 100
    });

    it('should sort quantity chart data by quantity descending', () => {
      const quantityData = component.quantityChartData();
      expect(quantityData[0].count).toBeGreaterThanOrEqual(quantityData[1].count);
      expect(quantityData[1].count).toBeGreaterThanOrEqual(quantityData[2].count);
    });

    it('should limit chart data to top 10 products', () => {
      const manyProducts: ProductMetrics = {
        ...mockProductMetrics,
        topProducts: Array.from({ length: 15 }, (_, i) => ({
          productId: `prod_${i}`,
          name: `Product ${i}`,
          quantity: 100 - i,
          revenue: 1000 - i * 10,
        })),
      };
      fixture.componentRef.setInput('metrics', manyProducts);
      fixture.detectChanges();

      const revenueData = component.revenueChartData();
      const quantityData = component.quantityChartData();

      expect(revenueData.length).toBe(10);
      expect(quantityData.length).toBe(10);
    });
  });

  describe('hasProducts Computed Signal', () => {
    it('should return true when products exist', () => {
      fixture.componentRef.setInput('metrics', mockProductMetrics);
      fixture.detectChanges();
      expect(component.hasProducts()).toBe(true);
    });

    it('should return false when no products exist', () => {
      fixture.componentRef.setInput('metrics', emptyProductMetrics);
      fixture.detectChanges();
      expect(component.hasProducts()).toBe(false);
    });
  });

  describe('Chart Rendering', () => {
    it('should render revenue and quantity charts when products exist', () => {
      fixture.componentRef.setInput('metrics', mockProductMetrics);
      fixture.detectChanges();

      const revenueChart = fixture.nativeElement.querySelector('app-horizontal-bar-chart');
      const quantityChart = fixture.nativeElement.querySelectorAll('app-horizontal-bar-chart')[1];

      expect(revenueChart).toBeTruthy();
      expect(quantityChart).toBeTruthy();
    });

    it('should display chart section headings', () => {
      fixture.componentRef.setInput('metrics', mockProductMetrics);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const headingsText = compiled.textContent || '';

      expect(headingsText).toContain('Top Selling Products (Revenue)');
      expect(headingsText).toContain('Top Selling Products (Quantity)');
    });

    it('should include decorative icons in chart headings', () => {
      fixture.componentRef.setInput('metrics', mockProductMetrics);
      fixture.detectChanges();

      const icons = fixture.nativeElement.querySelectorAll('h3 i[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Empty State', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('metrics', emptyProductMetrics);
      fixture.detectChanges();
    });

    it('should display empty state message when no products', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const emptyMessage = compiled.querySelector('p-message');
      expect(emptyMessage).toBeTruthy();
      expect(emptyMessage?.textContent).toContain('No product sales have been recorded yet');
    });

    it('should not render charts when no products', () => {
      const charts = fixture.nativeElement.querySelectorAll('app-horizontal-bar-chart');
      expect(charts.length).toBe(0);
    });

    it('should have role status on empty state container', () => {
      const emptyContainer = fixture.nativeElement.querySelector('[role="status"]');
      expect(emptyContainer).toBeTruthy();
      expect(emptyContainer.getAttribute('aria-label')).toBe('No product sales yet');
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('metrics', mockProductMetrics);
      fixture.detectChanges();
    });

    it('should have screen reader summary with aria-live', () => {
      const srSummary = fixture.nativeElement.querySelector('.sr-only[aria-live="polite"]');
      expect(srSummary).toBeTruthy();
      expect(srSummary.getAttribute('aria-atomic')).toBe('true');
    });

    it('should include revenue in screen reader summary', () => {
      const srSummary = fixture.nativeElement.querySelector('.sr-only[aria-live="polite"]');
      expect(srSummary?.textContent).toContain('Total revenue $15,750.50');
    });

    it('should include order count in screen reader summary', () => {
      const srSummary = fixture.nativeElement.querySelector('.sr-only[aria-live="polite"]');
      expect(srSummary?.textContent).toContain('500 orders');
    });

    it('should mark decorative icons with aria-hidden', () => {
      const icons = fixture.nativeElement.querySelectorAll('.pi[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Design', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('metrics', mockProductMetrics);
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
