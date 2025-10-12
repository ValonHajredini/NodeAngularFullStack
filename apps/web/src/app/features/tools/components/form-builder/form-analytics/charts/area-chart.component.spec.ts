import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AreaChartComponent } from './area-chart.component';
import { TimeSeriesData } from '@nodeangularfullstack/shared';

describe('AreaChartComponent', () => {
  let component: AreaChartComponent;
  let fixture: ComponentFixture<AreaChartComponent>;

  const mockData: TimeSeriesData[] = [
    { label: '2024-01-01', count: 5 },
    { label: '2024-01-02', count: 8 },
    { label: '2024-01-03', count: 3 },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AreaChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AreaChartComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('title', 'Test Area Chart');
    fixture.componentRef.setInput('data', mockData);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display title', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const title = compiled.querySelector('h3');
    expect(title?.textContent).toContain('Test Area Chart');
  });

  it('should render chart with valid data', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const chart = compiled.querySelector('p-chart');
    expect(chart).toBeTruthy();
    expect(chart?.getAttribute('type')).toBe('line');
  });

  it('should show empty state when data is empty', () => {
    fixture.componentRef.setInput('data', []);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const emptyState = compiled.querySelector('.border-dashed');
    expect(emptyState?.textContent).toContain('No data available');
  });

  it('should compute chart data correctly', () => {
    const chartData = component.chartData();
    expect(chartData.labels).toEqual(['2024-01-01', '2024-01-02', '2024-01-03']);
    expect(chartData.datasets[0].data).toEqual([5, 8, 3]);
    expect(chartData.datasets[0].label).toBe('Submissions');
    expect(chartData.datasets[0].fill).toBe(true);
  });

  it('should have correct chart options for area chart', () => {
    expect(component.chartOptions.responsive).toBe(true);
    expect(component.chartOptions.plugins.legend.display).toBe(false);
    expect(component.chartOptions.scales.y.beginAtZero).toBe(true);
  });

  it('should toggle data table view', () => {
    expect(component.showDataTable()).toBe(false);
    component.toggleDataTable();
    expect(component.showDataTable()).toBe(true);
    component.toggleDataTable();
    expect(component.showDataTable()).toBe(false);
  });

  it('should generate accessible aria-label', () => {
    const ariaLabel = component.getChartAriaLabel();
    expect(ariaLabel).toContain('Area chart');
    expect(ariaLabel).toContain('Test Area Chart');
    expect(ariaLabel).toContain('Total submissions: 16');
    expect(ariaLabel).toContain('2024-01-02');
  });

  it('should update chart when data changes', () => {
    const newData: TimeSeriesData[] = [{ label: '2024-02-01', count: 12 }];
    fixture.componentRef.setInput('data', newData);
    fixture.detectChanges();

    const chartData = component.chartData();
    expect(chartData.labels).toEqual(['2024-02-01']);
    expect(chartData.datasets[0].data).toEqual([12]);
  });

  it('should have proper accessibility attributes', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const chartContainer = compiled.querySelector('[role="img"]');
    expect(chartContainer).toBeTruthy();

    const liveRegion = compiled.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeTruthy();

    const button = compiled.querySelector('button');
    expect(button?.getAttribute('aria-label')).toBeTruthy();
  });
});
