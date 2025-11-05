import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LineChartComponent } from './line-chart.component';
import { TimeSeriesData } from '@nodeangularfullstack/shared';

describe('LineChartComponent', () => {
  let component: LineChartComponent;
  let fixture: ComponentFixture<LineChartComponent>;

  const mockData: TimeSeriesData[] = [
    { label: '2025-01-01', count: 5 },
    { label: '2025-01-02', count: 8 },
    { label: '2025-01-03', count: 3 },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LineChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LineChartComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('title', 'Test Line Chart');
    fixture.componentRef.setInput('data', mockData);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display title', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const title = compiled.querySelector('h3');
    expect(title?.textContent).toContain('Test Line Chart');
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
    expect(chartData.labels).toEqual(['2025-01-01', '2025-01-02', '2025-01-03']);
    expect(chartData.datasets[0].data).toEqual([5, 8, 3]);
  });

  it('should have correct chart options', () => {
    expect(component.chartOptions.responsive).toBe(true);
    expect(component.chartOptions.plugins.legend.display).toBe(true);
    expect(component.chartOptions.scales.y.beginAtZero).toBe(true);
  });

  it('should update chart when data changes', () => {
    const newData: TimeSeriesData[] = [{ label: '2025-02-01', count: 10 }];
    fixture.componentRef.setInput('data', newData);
    fixture.detectChanges();

    const chartData = component.chartData();
    expect(chartData.labels).toEqual(['2025-02-01']);
    expect(chartData.datasets[0].data).toEqual([10]);
  });
});
