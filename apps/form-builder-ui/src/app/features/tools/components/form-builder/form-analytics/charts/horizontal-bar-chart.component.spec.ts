import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HorizontalBarChartComponent } from './horizontal-bar-chart.component';
import { ChoiceDistribution } from '@nodeangularfullstack/shared';

describe('HorizontalBarChartComponent', () => {
  let component: HorizontalBarChartComponent;
  let fixture: ComponentFixture<HorizontalBarChartComponent>;

  const mockData: ChoiceDistribution[] = [
    {
      label: 'Very long option label that needs more space',
      value: 'opt1',
      count: 10,
      percentage: 50,
    },
    { label: 'Another lengthy option text', value: 'opt2', count: 6, percentage: 30 },
    { label: 'Third long option', value: 'opt3', count: 4, percentage: 20 },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HorizontalBarChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HorizontalBarChartComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('title', 'Test Horizontal Bar Chart');
    fixture.componentRef.setInput('data', mockData);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display title', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const title = compiled.querySelector('h3');
    expect(title?.textContent).toContain('Test Horizontal Bar Chart');
  });

  it('should render chart with valid data', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const chart = compiled.querySelector('p-chart');
    expect(chart).toBeTruthy();
    expect(chart?.getAttribute('type')).toBe('bar');
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
    expect(chartData.labels).toEqual([
      'Very long option label that needs more space',
      'Another lengthy option text',
      'Third long option',
    ]);
    expect(chartData.datasets[0].data).toEqual([10, 6, 4]);
    expect(chartData.datasets[0].label).toBe('Responses');
  });

  it('should have correct chart options for horizontal bars', () => {
    expect(component.chartOptions.responsive).toBe(true);
    expect(component.chartOptions.indexAxis).toBe('y');
    expect(component.chartOptions.plugins.legend.display).toBe(false);
    expect(component.chartOptions.scales.x.beginAtZero).toBe(true);
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
    expect(ariaLabel).toContain('Horizontal bar chart');
    expect(ariaLabel).toContain('Test Horizontal Bar Chart');
    expect(ariaLabel).toContain('Total responses: 20');
    expect(ariaLabel).toContain('Very long option label that needs more space');
  });

  it('should update chart when data changes', () => {
    const newData: ChoiceDistribution[] = [
      { label: 'New option', value: 'new', count: 15, percentage: 100 },
    ];
    fixture.componentRef.setInput('data', newData);
    fixture.detectChanges();

    const chartData = component.chartData();
    expect(chartData.labels).toEqual(['New option']);
    expect(chartData.datasets[0].data).toEqual([15]);
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
