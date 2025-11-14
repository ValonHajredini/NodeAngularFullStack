/**
 * Appointment Analytics Component Tests
 *
 * Comprehensive test suite for AppointmentAnalyticsComponent covering:
 * - Component rendering and initialization
 * - Data transformation (AppointmentMetrics → HeatmapCell[])
 * - Empty state handling
 * - Summary statistics display (bookings, cancellations, rate, capacity)
 * - Heatmap visualization and color intensity calculation
 * - Chart integration (popular time slots)
 * - View toggle (heatmap vs. table)
 * - Accessibility compliance (ARIA labels, keyboard navigation, screen reader support)
 * - Responsive design class bindings
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.8: Product, Appointment, and Restaurant Analytics Components (Frontend)
 *
 * @since 2025-01-27
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppointmentAnalyticsComponent } from './appointment-analytics.component';
import { AppointmentMetrics } from '@nodeangularfullstack/shared';
import { By } from '@angular/platform-browser';

describe('AppointmentAnalyticsComponent', () => {
  let component: AppointmentAnalyticsComponent;
  let fixture: ComponentFixture<AppointmentAnalyticsComponent>;

  const mockAppointmentMetrics: AppointmentMetrics = {
    category: 'services',
    totalSubmissions: 300,
    totalBookings: 285,
    cancelledBookings: 15,
    cancellationRate: 5.0,
    averageBookingsPerDay: 12.5,
    popularTimeSlots: [
      { timeSlot: '09:00-10:00', bookings: 45 },
      { timeSlot: '10:00-11:00', bookings: 42 },
      { timeSlot: '14:00-15:00', bookings: 38 },
      { timeSlot: '11:00-12:00', bookings: 35 },
      { timeSlot: '13:00-14:00', bookings: 30 },
      { timeSlot: '15:00-16:00', bookings: 28 },
      { timeSlot: '16:00-17:00', bookings: 25 },
      { timeSlot: '08:00-09:00', bookings: 22 },
      { timeSlot: '17:00-18:00', bookings: 20 },
    ],
    capacityUtilization: 75.5,
    peakBookingDay: 'Monday',
    firstSubmissionAt: '2025-01-01T00:00:00Z',
    lastSubmissionAt: '2025-01-27T12:30:00Z',
  };

  const emptyAppointmentMetrics: AppointmentMetrics = {
    category: 'services',
    totalSubmissions: 0,
    totalBookings: 0,
    cancelledBookings: 0,
    cancellationRate: 0,
    averageBookingsPerDay: 0,
    popularTimeSlots: [],
    capacityUtilization: 0,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppointmentAnalyticsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AppointmentAnalyticsComponent);
    component = fixture.componentInstance;
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      fixture.componentRef.setInput('metrics', mockAppointmentMetrics);
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('should have appointment-analytics-container role region', () => {
      fixture.componentRef.setInput('metrics', mockAppointmentMetrics);
      fixture.detectChanges();
      const container = fixture.nativeElement.querySelector('.appointment-analytics-container');
      expect(container).toBeTruthy();
      expect(container.getAttribute('role')).toBe('region');
      expect(container.getAttribute('aria-label')).toContain('Appointment booking analytics');
    });
  });

  describe('Summary Statistics Display', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('metrics', mockAppointmentMetrics);
      fixture.detectChanges();
    });

    it('should display total bookings statistic', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const statsText = compiled.textContent || '';
      expect(statsText).toContain('Total Bookings');
      expect(statsText).toContain('285');
    });

    it('should display cancelled bookings statistic', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const statsText = compiled.textContent || '';
      expect(statsText).toContain('Cancelled');
      expect(statsText).toContain('15');
      expect(statsText).toContain('5.0% rate');
    });

    it('should display average bookings per day statistic', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const statsText = compiled.textContent || '';
      expect(statsText).toContain('Avg Per Day');
      expect(statsText).toContain('12.5');
    });

    it('should display capacity utilization statistic', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const statsText = compiled.textContent || '';
      expect(statsText).toContain('Capacity Usage');
      expect(statsText).toContain('76%');
    });

    it('should display peak booking day when available', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const statsText = compiled.textContent || '';
      expect(statsText).toContain('Peak: Monday');
    });

    it('should apply red styling when cancellations exist', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const cancelledCard = Array.from(compiled.querySelectorAll('.bg-white.p-4.rounded-lg')).find(
        (card) => card.textContent?.includes('Cancelled'),
      );
      expect(cancelledCard?.classList.contains('border-red-300')).toBe(true);
    });

    it('should apply gray styling when no cancellations', () => {
      fixture.componentRef.setInput('metrics', {
        ...mockAppointmentMetrics,
        cancelledBookings: 0,
      });
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const cancelledCard = Array.from(compiled.querySelectorAll('.bg-white.p-4.rounded-lg')).find(
        (card) => card.textContent?.includes('Cancelled'),
      );
      expect(cancelledCard?.classList.contains('border-gray-200')).toBe(true);
    });
  });

  describe('Heatmap Data Transformation', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('metrics', mockAppointmentMetrics);
      fixture.detectChanges();
    });

    it('should transform popularTimeSlots to heatmap data correctly', () => {
      const heatmapData = component.heatmapData();
      expect(heatmapData.length).toBe(9);
      expect(heatmapData[0].timeSlot).toBe('09:00-10:00');
      expect(heatmapData[0].bookings).toBe(45);
    });

    it('should calculate intensity correctly (0-100 range)', () => {
      const heatmapData = component.heatmapData();
      const maxIntensity = Math.max(...heatmapData.map((cell) => cell.intensity));
      expect(maxIntensity).toBe(100); // Busiest slot should be 100%
      expect(heatmapData[0].intensity).toBe(100); // 45 bookings is max
    });

    it('should calculate percentage of total bookings', () => {
      const heatmapData = component.heatmapData();
      expect(heatmapData[0].percentage).toBeCloseTo(15.79, 1); // 45 / 285 * 100
    });

    it('should sort heatmap data by bookings descending', () => {
      const heatmapData = component.heatmapData();
      expect(heatmapData[0].bookings).toBeGreaterThanOrEqual(heatmapData[1].bookings);
      expect(heatmapData[1].bookings).toBeGreaterThanOrEqual(heatmapData[2].bookings);
    });
  });

  describe('Heatmap Color Calculation', () => {
    it('should return gray for zero intensity', () => {
      const color = component.getHeatmapColor(0);
      expect(color).toBe('#f3f4f6');
    });

    it('should return light blue for low intensity (< 20)', () => {
      const color = component.getHeatmapColor(15);
      expect(color).toBe('#dbeafe');
    });

    it('should return medium blue for mid intensity (40-60)', () => {
      const color = component.getHeatmapColor(50);
      expect(color).toBe('#93c5fd');
    });

    it('should return dark blue for high intensity (>= 80)', () => {
      const color = component.getHeatmapColor(85);
      expect(color).toBe('#3b82f6');
    });

    it('should have distinct colors for each intensity range', () => {
      const colors = [0, 15, 35, 55, 75, 95].map((intensity) =>
        component.getHeatmapColor(intensity),
      );
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(6);
    });
  });

  describe('Popular Time Slots Chart Data', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('metrics', mockAppointmentMetrics);
      fixture.detectChanges();
    });

    it('should transform to ChoiceDistribution format correctly', () => {
      const chartData = component.popularTimeSlotsChartData();
      expect(chartData.length).toBe(9);
      expect(chartData[0].label).toBe('09:00-10:00');
      expect(chartData[0].count).toBe(45);
    });

    it('should sort chart data by count descending', () => {
      const chartData = component.popularTimeSlotsChartData();
      expect(chartData[0].count).toBeGreaterThanOrEqual(chartData[1].count);
    });

    it('should limit to top 10 time slots', () => {
      const manySlots: AppointmentMetrics = {
        ...mockAppointmentMetrics,
        popularTimeSlots: Array.from({ length: 15 }, (_, i) => ({
          timeSlot: `${8 + i}:00-${9 + i}:00`,
          bookings: 50 - i,
        })),
      };
      fixture.componentRef.setInput('metrics', manySlots);
      fixture.detectChanges();

      const chartData = component.popularTimeSlotsChartData();
      expect(chartData.length).toBe(10);
    });
  });

  describe('hasBookings Computed Signal', () => {
    it('should return true when bookings exist', () => {
      fixture.componentRef.setInput('metrics', mockAppointmentMetrics);
      fixture.detectChanges();
      expect(component.hasBookings()).toBe(true);
    });

    it('should return false when no bookings exist', () => {
      fixture.componentRef.setInput('metrics', emptyAppointmentMetrics);
      fixture.detectChanges();
      expect(component.hasBookings()).toBe(false);
    });
  });

  describe('Heatmap and Chart Rendering', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('metrics', mockAppointmentMetrics);
      fixture.detectChanges();
    });

    it('should render heatmap grid when bookings exist', () => {
      const heatmapGrid = fixture.nativeElement.querySelector('.heatmap-grid');
      expect(heatmapGrid).toBeTruthy();
    });

    it('should render heatmap cells with correct attributes', () => {
      const cells = fixture.nativeElement.querySelectorAll('.heatmap-cell');
      expect(cells.length).toBe(9);
      expect(cells[0].getAttribute('role')).toBe('gridcell');
      expect(cells[0].getAttribute('tabindex')).toBe('0');
    });

    it('should render horizontal bar chart for popular time slots', () => {
      const chart = fixture.nativeElement.querySelector('app-horizontal-bar-chart');
      expect(chart).toBeTruthy();
    });

    it('should display section headings', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const headingsText = compiled.textContent || '';
      expect(headingsText).toContain('Booking Heatmap by Time Slot');
      expect(headingsText).toContain('Most Popular Time Slots');
    });
  });

  describe('Heatmap/Table Toggle', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('metrics', mockAppointmentMetrics);
      fixture.detectChanges();
    });

    it('should start with heatmap view by default', () => {
      expect(component.showHeatmapTable()).toBe(false);
      const heatmapGrid = fixture.nativeElement.querySelector('.heatmap-grid');
      expect(heatmapGrid).toBeTruthy();
    });

    it('should toggle to table view when button clicked', () => {
      const toggleButton = fixture.nativeElement.querySelector('button[type="button"]');
      toggleButton.click();
      fixture.detectChanges();

      expect(component.showHeatmapTable()).toBe(true);
      const table = fixture.nativeElement.querySelector('p-table');
      expect(table).toBeTruthy();
    });

    it('should toggle back to heatmap view', () => {
      component.toggleHeatmapTable();
      fixture.detectChanges();
      component.toggleHeatmapTable();
      fixture.detectChanges();

      expect(component.showHeatmapTable()).toBe(false);
      const heatmapGrid = fixture.nativeElement.querySelector('.heatmap-grid');
      expect(heatmapGrid).toBeTruthy();
    });

    it('should update button label based on current view', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      let buttonText = compiled.textContent || '';
      expect(buttonText).toContain('Show Table');

      component.toggleHeatmapTable();
      fixture.detectChanges();
      buttonText = compiled.textContent || '';
      expect(buttonText).toContain('Show Heatmap');
    });
  });

  describe('Empty State', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('metrics', emptyAppointmentMetrics);
      fixture.detectChanges();
    });

    it('should display empty state message when no bookings', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const emptyMessage = compiled.querySelector('p-message');
      expect(emptyMessage).toBeTruthy();
      expect(emptyMessage?.textContent).toContain('No appointment bookings have been recorded yet');
    });

    it('should not render heatmap when no bookings', () => {
      const heatmapGrid = fixture.nativeElement.querySelector('.heatmap-grid');
      expect(heatmapGrid).toBeFalsy();
    });

    it('should not render charts when no bookings', () => {
      const chart = fixture.nativeElement.querySelector('app-horizontal-bar-chart');
      expect(chart).toBeFalsy();
    });

    it('should have role status on empty state container', () => {
      const emptyContainer = fixture.nativeElement.querySelector('[role="status"]');
      expect(emptyContainer).toBeTruthy();
      expect(emptyContainer.getAttribute('aria-label')).toBe('No appointment bookings yet');
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('metrics', mockAppointmentMetrics);
      fixture.detectChanges();
    });

    it('should have screen reader summary with aria-live', () => {
      const srSummary = fixture.nativeElement.querySelector('.sr-only[aria-live="polite"]');
      expect(srSummary).toBeTruthy();
      expect(srSummary.getAttribute('aria-atomic')).toBe('true');
    });

    it('should include booking counts in screen reader summary', () => {
      const srSummary = fixture.nativeElement.querySelector('.sr-only[aria-live="polite"]');
      expect(srSummary?.textContent).toContain('285 total bookings');
      expect(srSummary?.textContent).toContain('15 cancelled');
    });

    it('should provide accessible heatmap aria-label', () => {
      const heatmapLabel = component.getHeatmapAriaLabel();
      expect(heatmapLabel).toContain('285 total bookings');
      expect(heatmapLabel).toContain('Busiest time slot is 09:00-10:00 with 45 bookings');
    });

    it('should have aria-labels on heatmap cells', () => {
      const cells = fixture.nativeElement.querySelectorAll('.heatmap-cell');
      expect(cells[0].getAttribute('aria-label')).toContain('09:00-10:00');
      expect(cells[0].getAttribute('aria-label')).toContain('45 bookings');
    });

    it('should mark decorative icons with aria-hidden', () => {
      const icons = fixture.nativeElement.querySelectorAll('.pi[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should support keyboard navigation on heatmap cells', () => {
      const cells = fixture.nativeElement.querySelectorAll('.heatmap-cell');
      cells.forEach((cell: any) => {
        expect(cell.getAttribute('tabindex')).toBe('0');
      });
    });
  });

  describe('Responsive Design', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('metrics', mockAppointmentMetrics);
      fixture.detectChanges();
    });

    it('should apply grid classes for responsive summary cards', () => {
      const statsGrid = fixture.nativeElement.querySelector(
        '.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4',
      );
      expect(statsGrid).toBeTruthy();
    });

    it('should apply grid classes for responsive heatmap/chart layout', () => {
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
