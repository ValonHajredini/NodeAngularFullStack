import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BarChartComponent } from './bar-chart.component';
import { ChoiceDistribution } from '@nodeangularfullstack/shared';

describe('BarChartComponent', () => {
  let component: BarChartComponent;
  let fixture: ComponentFixture<BarChartComponent>;

  const mockData: ChoiceDistribution[] = [
    { label: 'Option 1', value: 'opt1', count: 10, percentage: 50 },
    { label: 'Option 2', value: 'opt2', count: 6, percentage: 30 },
    { label: 'Option 3', value: 'opt3', count: 4, percentage: 20 },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BarChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BarChartComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('title', 'Test Bar Chart');
    fixture.componentRef.setInput('data', mockData);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display title', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const title = compiled.querySelector('h3');
    expect(title?.textContent).toContain('Test Bar Chart');
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

  it('should compute chart data correctly', () => {
    const chartData = component.chartData();
    expect(chartData.labels).toEqual(['Option 1', 'Option 2', 'Option 3']);
    expect(chartData.datasets[0].data).toEqual([10, 6, 4]);
  });

  it('should have correct chart options', () => {
    expect(component.chartOptions.responsive).toBe(true);
    expect(component.chartOptions.plugins.legend.display).toBe(false);
    expect(component.chartOptions.scales.y.beginAtZero).toBe(true);
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
});
