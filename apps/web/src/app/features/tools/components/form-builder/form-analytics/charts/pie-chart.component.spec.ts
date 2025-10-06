import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PieChartComponent } from './pie-chart.component';
import { ChoiceDistribution } from '@nodeangularfullstack/shared';

describe('PieChartComponent', () => {
  let component: PieChartComponent;
  let fixture: ComponentFixture<PieChartComponent>;

  const mockData: ChoiceDistribution[] = [
    { label: 'Yes', value: 'true', count: 15, percentage: 75 },
    { label: 'No', value: 'false', count: 5, percentage: 25 },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PieChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PieChartComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('title', 'Test Pie Chart');
    fixture.componentRef.setInput('data', mockData);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display title', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const title = compiled.querySelector('h3');
    expect(title?.textContent).toContain('Test Pie Chart');
  });

  it('should render chart with valid data', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const chart = compiled.querySelector('p-chart');
    expect(chart).toBeTruthy();
  });

  it('should show empty state when data is empty', () => {
    fixture.componentRef.setInput('data', []);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const emptyState = compiled.querySelector('.border-dashed');
    expect(emptyState?.textContent).toContain('No data available');
  });

  it('should show empty state when all counts are zero', () => {
    const emptyData: ChoiceDistribution[] = [
      { label: 'Option 1', value: 'opt1', count: 0, percentage: 0 },
      { label: 'Option 2', value: 'opt2', count: 0, percentage: 0 },
    ];
    fixture.componentRef.setInput('data', emptyData);
    fixture.detectChanges();

    expect(component.hasData()).toBe(false);
    const compiled = fixture.nativeElement as HTMLElement;
    const emptyState = compiled.querySelector('.border-dashed');
    expect(emptyState?.textContent).toContain('No data available');
  });

  it('should compute chart data correctly', () => {
    const chartData = component.chartData();
    expect(chartData.labels).toEqual(['Yes', 'No']);
    expect(chartData.datasets[0].data).toEqual([15, 5]);
  });

  it('should filter out zero count items from chart data', () => {
    const dataWithZeros: ChoiceDistribution[] = [
      { label: 'Yes', value: 'true', count: 10, percentage: 100 },
      { label: 'No', value: 'false', count: 0, percentage: 0 },
    ];
    fixture.componentRef.setInput('data', dataWithZeros);
    fixture.detectChanges();

    const chartData = component.chartData();
    expect(chartData.labels).toEqual(['Yes']);
    expect(chartData.datasets[0].data).toEqual([10]);
  });

  it('should have correct chart options', () => {
    expect(component.chartOptions.responsive).toBe(true);
    expect(component.chartOptions.plugins.legend.display).toBe(true);
    expect(component.chartOptions.plugins.legend.position).toBe('right');
  });

  it('should detect when there is data', () => {
    expect(component.hasData()).toBe(true);
  });

  it('should update chart when data changes', () => {
    const newData: ChoiceDistribution[] = [
      { label: 'Option A', value: 'optA', count: 7, percentage: 70 },
      { label: 'Option B', value: 'optB', count: 3, percentage: 30 },
    ];
    fixture.componentRef.setInput('data', newData);
    fixture.detectChanges();

    const chartData = component.chartData();
    expect(chartData.labels).toEqual(['Option A', 'Option B']);
    expect(chartData.datasets[0].data).toEqual([7, 3]);
  });
});
