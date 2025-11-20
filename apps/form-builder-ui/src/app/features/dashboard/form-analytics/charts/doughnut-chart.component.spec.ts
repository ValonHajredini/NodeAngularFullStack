import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DoughnutChartComponent } from './doughnut-chart.component';
import { ChoiceDistribution } from '@nodeangularfullstack/shared';

describe('DoughnutChartComponent', () => {
  let component: DoughnutChartComponent;
  let fixture: ComponentFixture<DoughnutChartComponent>;

  const mockData: ChoiceDistribution[] = [
    { label: 'Yes', value: 'yes', count: 12, percentage: 60 },
    { label: 'No', value: 'no', count: 8, percentage: 40 },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DoughnutChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DoughnutChartComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('title', 'Test Doughnut Chart');
    fixture.componentRef.setInput('data', mockData);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display title', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const title = compiled.querySelector('h3');
    expect(title?.textContent).toContain('Test Doughnut Chart');
  });

  it('should render chart with valid data', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const chart = compiled.querySelector('p-chart');
    expect(chart).toBeTruthy();
    expect(chart?.getAttribute('type')).toBe('doughnut');
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
    expect(chartData.labels).toEqual(['Yes', 'No']);
    expect(chartData.datasets[0].data).toEqual([12, 8]);
    expect(chartData.datasets[0].backgroundColor).toBeDefined();
    expect(chartData.datasets[0].borderColor).toBe('#FFFFFF');
  });

  it('should have correct chart options for doughnut', () => {
    expect(component.chartOptions.responsive).toBe(true);
    expect(component.chartOptions.cutout).toBe('60%');
    expect(component.chartOptions.plugins.legend.position).toBe('bottom');
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
    expect(ariaLabel).toContain('Doughnut chart');
    expect(ariaLabel).toContain('Test Doughnut Chart');
    expect(ariaLabel).toContain('Total responses: 20');
    expect(ariaLabel).toContain('Yes');
  });

  it('should update chart when data changes', () => {
    const newData: ChoiceDistribution[] = [
      { label: 'Maybe', value: 'maybe', count: 7, percentage: 100 },
    ];
    fixture.componentRef.setInput('data', newData);
    fixture.detectChanges();

    const chartData = component.chartData();
    expect(chartData.labels).toEqual(['Maybe']);
    expect(chartData.datasets[0].data).toEqual([7]);
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
