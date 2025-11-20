import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RadarChartComponent } from './radar-chart.component';
import { ChoiceDistribution } from '@nodeangularfullstack/shared';

describe('RadarChartComponent', () => {
  let component: RadarChartComponent;
  let fixture: ComponentFixture<RadarChartComponent>;

  const mockData: ChoiceDistribution[] = [
    { label: 'Option 1', value: 'opt1', count: 10, percentage: 50 },
    { label: 'Option 2', value: 'opt2', count: 6, percentage: 30 },
    { label: 'Option 3', value: 'opt3', count: 4, percentage: 20 },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RadarChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RadarChartComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('title', 'Test Radar Chart');
    fixture.componentRef.setInput('data', mockData);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display title', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const title = compiled.querySelector('h3');
    expect(title?.textContent).toContain('Test Radar Chart');
  });

  it('should render chart with valid data', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const chart = compiled.querySelector('p-chart');
    expect(chart).toBeTruthy();
    expect(chart?.getAttribute('type')).toBe('radar');
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
    expect(chartData.labels).toEqual(['Option 1', 'Option 2', 'Option 3']);
    expect(chartData.datasets[0].data).toEqual([10, 6, 4]);
    expect(chartData.datasets[0].label).toBe('Responses');
    expect(chartData.datasets[0].borderColor).toBe('#3B82F6');
  });

  it('should have correct chart options for radar', () => {
    expect(component.chartOptions.responsive).toBe(true);
    expect(component.chartOptions.plugins.legend.display).toBe(false);
    expect(component.chartOptions.scales.r.beginAtZero).toBe(true);
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
    expect(ariaLabel).toContain('Radar chart');
    expect(ariaLabel).toContain('Test Radar Chart');
    expect(ariaLabel).toContain('Total responses: 20');
    expect(ariaLabel).toContain('Option 1');
  });

  it('should update chart when data changes', () => {
    const newData: ChoiceDistribution[] = [
      { label: 'Option A', value: 'optA', count: 5, percentage: 100 },
    ];
    fixture.componentRef.setInput('data', newData);
    fixture.detectChanges();

    const chartData = component.chartData();
    expect(chartData.labels).toEqual(['Option A']);
    expect(chartData.datasets[0].data).toEqual([5]);
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
