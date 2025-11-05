import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatCardComponent } from './stat-card.component';
import { NumericStatistics } from '@nodeangularfullstack/shared';

describe('StatCardComponent', () => {
  let component: StatCardComponent;
  let fixture: ComponentFixture<StatCardComponent>;

  const mockData: NumericStatistics = {
    mean: 45.5,
    median: 42,
    min: 10,
    max: 100,
    stdDev: 15.2,
    count: 50,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StatCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('title', 'Test Stat Card');
    fixture.componentRef.setInput('data', mockData);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display title', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const title = compiled.querySelector('h3');
    expect(title?.textContent).toContain('Test Stat Card');
  });

  it('should display all statistics', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const statItems = compiled.querySelectorAll('.stat-item');
    expect(statItems.length).toBe(6); // mean, median, min, max, stdDev, count
  });

  it('should display mean value', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const meanElement = compiled.querySelector('.bg-blue-50 .text-2xl');
    expect(meanElement?.textContent).toContain('45.5');
  });

  it('should display median value', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const medianElement = compiled.querySelector('.bg-green-50 .text-2xl');
    expect(medianElement?.textContent).toContain('42');
  });

  it('should display min value', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const minElement = compiled.querySelector('.bg-amber-50 .text-2xl');
    expect(minElement?.textContent).toContain('10');
  });

  it('should display max value', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const maxElement = compiled.querySelector('.bg-red-50 .text-2xl');
    expect(maxElement?.textContent).toContain('100');
  });

  it('should display standard deviation value', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const stdDevElement = compiled.querySelector('.bg-violet-50 .text-2xl');
    expect(stdDevElement?.textContent).toContain('15.2');
  });

  it('should display sample size', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const countElement = compiled.querySelector('.bg-gray-100 .text-2xl');
    expect(countElement?.textContent).toContain('50');
  });

  it('should show empty state when count is zero', () => {
    const emptyData: NumericStatistics = {
      mean: 0,
      median: 0,
      min: 0,
      max: 0,
      stdDev: 0,
      count: 0,
    };
    fixture.componentRef.setInput('data', emptyData);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const emptyState = compiled.querySelector('.border-dashed');
    expect(emptyState?.textContent).toContain('No numeric data available');
  });

  it('should update when data changes', () => {
    const newData: NumericStatistics = {
      mean: 75,
      median: 70,
      min: 50,
      max: 150,
      stdDev: 20,
      count: 100,
    };
    fixture.componentRef.setInput('data', newData);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const meanElement = compiled.querySelector('.bg-blue-50 .text-2xl');
    expect(meanElement?.textContent).toContain('75');
  });

  it('should have proper accessibility labels', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const statLabels = compiled.querySelectorAll('.text-sm.text-gray-600');
    expect(statLabels.length).toBeGreaterThan(0);
    expect(Array.from(statLabels).some((label) => label.textContent?.includes('Average'))).toBe(
      true,
    );
  });
});
