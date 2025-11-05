import { TestBed } from '@angular/core/testing';
import { StatisticsEngineService } from './statistics-engine.service';
import { FormFieldOption } from '@nodeangularfullstack/shared';

describe('StatisticsEngineService', () => {
  let service: StatisticsEngineService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StatisticsEngineService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('calculateNumericStats', () => {
    it('should calculate correct statistics for valid numbers', () => {
      const values = [10, 20, 30, 40, 50];
      const stats = service.calculateNumericStats(values);

      expect(stats.mean).toBe(30);
      expect(stats.median).toBe(30);
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(50);
      expect(stats.count).toBe(5);
      expect(stats.stdDev).toBeGreaterThan(0);
    });

    it('should handle empty array', () => {
      const stats = service.calculateNumericStats([]);
      expect(stats.count).toBe(0);
      expect(stats.mean).toBe(0);
      expect(stats.median).toBe(0);
      expect(stats.min).toBe(0);
      expect(stats.max).toBe(0);
      expect(stats.stdDev).toBe(0);
    });

    it('should filter out null and NaN values', () => {
      const values = [10, null as any, 20, NaN, 30];
      const stats = service.calculateNumericStats(values);
      expect(stats.count).toBe(3);
      expect(stats.mean).toBe(20);
    });

    it('should calculate median correctly for even number of values', () => {
      const values = [10, 20, 30, 40];
      const stats = service.calculateNumericStats(values);
      expect(stats.median).toBe(25); // (20 + 30) / 2
    });

    it('should calculate median correctly for odd number of values', () => {
      const values = [10, 20, 30];
      const stats = service.calculateNumericStats(values);
      expect(stats.median).toBe(20);
    });

    it('should handle single value', () => {
      const values = [42];
      const stats = service.calculateNumericStats(values);
      expect(stats.mean).toBe(42);
      expect(stats.median).toBe(42);
      expect(stats.min).toBe(42);
      expect(stats.max).toBe(42);
      expect(stats.stdDev).toBe(0);
      expect(stats.count).toBe(1);
    });

    it('should handle negative numbers', () => {
      const values = [-10, -5, 0, 5, 10];
      const stats = service.calculateNumericStats(values);
      expect(stats.mean).toBe(0);
      expect(stats.median).toBe(0);
      expect(stats.min).toBe(-10);
      expect(stats.max).toBe(10);
    });

    it('should round results to 2 decimal places', () => {
      const values = [1, 2, 3];
      const stats = service.calculateNumericStats(values);
      expect(stats.mean.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
      expect(stats.stdDev.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
    });
  });

  describe('calculateChoiceDistribution', () => {
    const options: FormFieldOption[] = [
      { label: 'Option 1', value: 'option1' },
      { label: 'Option 2', value: 'option2' },
      { label: 'Option 3', value: 'option3' },
    ];

    it('should calculate distribution correctly', () => {
      const values = ['option1', 'option2', 'option1', 'option1'];
      const distribution = service.calculateChoiceDistribution(values, options);

      expect(distribution[0].count).toBe(3);
      expect(distribution[0].percentage).toBe(75);
      expect(distribution[1].count).toBe(1);
      expect(distribution[1].percentage).toBe(25);
      expect(distribution[2].count).toBe(0);
      expect(distribution[2].percentage).toBe(0);
    });

    it('should handle empty values array', () => {
      const distribution = service.calculateChoiceDistribution([], options);
      expect(distribution.every((d) => d.count === 0)).toBe(true);
      expect(distribution.every((d) => d.percentage === 0)).toBe(true);
    });

    it('should filter out null values', () => {
      const values = ['option1', null as any, 'option2', null as any];
      const distribution = service.calculateChoiceDistribution(values, options);
      expect(distribution[0].count).toBe(1);
      expect(distribution[1].count).toBe(1);
    });

    it('should handle checkbox arrays', () => {
      const values = [['option1', 'option2'], ['option1'], ['option2', 'option3']];
      const distribution = service.calculateChoiceDistribution(values, options);
      expect(distribution[0].count).toBe(2); // option1 selected 2 times
      expect(distribution[1].count).toBe(2); // option2 selected 2 times
      expect(distribution[2].count).toBe(1); // option3 selected 1 time
    });

    it('should calculate percentages correctly', () => {
      const values = ['option1', 'option1', 'option2'];
      const distribution = service.calculateChoiceDistribution(values, options);
      expect(distribution[0].percentage).toBeCloseTo(66.7, 1);
      expect(distribution[1].percentage).toBeCloseTo(33.3, 1);
    });

    it('should initialize all options with 0 count', () => {
      const values = ['option1'];
      const distribution = service.calculateChoiceDistribution(values, options);
      expect(distribution.length).toBe(3);
      expect(distribution.every((d) => Object.prototype.hasOwnProperty.call(d, 'count'))).toBe(
        true,
      );
    });
  });

  describe('generateTimeSeries', () => {
    it('should group dates by day', () => {
      const dates = [new Date('2025-01-01'), new Date('2025-01-01'), new Date('2025-01-02')];
      const series = service.generateTimeSeries(dates, 'day');

      expect(series.length).toBe(2);
      expect(series[0].label).toBe('2025-01-01');
      expect(series[0].count).toBe(2);
      expect(series[1].label).toBe('2025-01-02');
      expect(series[1].count).toBe(1);
    });

    it('should group dates by month', () => {
      const dates = [new Date('2025-01-15'), new Date('2025-01-20'), new Date('2025-02-10')];
      const series = service.generateTimeSeries(dates, 'month');

      expect(series.length).toBe(2);
      expect(series[0].label).toBe('2025-01');
      expect(series[0].count).toBe(2);
      expect(series[1].label).toBe('2025-02');
      expect(series[1].count).toBe(1);
    });

    it('should group dates by week', () => {
      const dates = [new Date('2025-01-01'), new Date('2025-01-07'), new Date('2025-01-08')];
      const series = service.generateTimeSeries(dates, 'week');

      expect(series.length).toBeGreaterThan(0);
      expect(series.every((s) => s.label.includes('W'))).toBe(true);
    });

    it('should handle empty dates array', () => {
      const series = service.generateTimeSeries([], 'day');
      expect(series.length).toBe(0);
    });

    it('should sort results chronologically', () => {
      const dates = [new Date('2025-01-03'), new Date('2025-01-01'), new Date('2025-01-02')];
      const series = service.generateTimeSeries(dates, 'day');

      expect(series[0].label).toBe('2025-01-01');
      expect(series[1].label).toBe('2025-01-02');
      expect(series[2].label).toBe('2025-01-03');
    });

    it('should filter out null/undefined dates', () => {
      const dates = [new Date('2025-01-01'), null as any, undefined as any];
      const series = service.generateTimeSeries(dates, 'day');
      expect(series.length).toBe(1);
    });

    it('should default to day interval', () => {
      const dates = [new Date('2025-01-01')];
      const series = service.generateTimeSeries(dates);
      expect(series[0].label).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('calculateTextStats', () => {
    it('should calculate text statistics correctly', () => {
      const values = ['hello', 'world', 'foo'];
      const stats = service.calculateTextStats(values);

      expect(stats.avgLength).toBeCloseTo(4.3, 1);
      expect(stats.maxLength).toBe(5);
      expect(stats.count).toBe(3);
    });

    it('should handle empty array', () => {
      const stats = service.calculateTextStats([]);
      expect(stats.avgLength).toBe(0);
      expect(stats.maxLength).toBe(0);
      expect(stats.count).toBe(0);
    });

    it('should filter out null values', () => {
      const values = ['hello', null as any, 'world'];
      const stats = service.calculateTextStats(values);
      expect(stats.count).toBe(2);
    });

    it('should handle empty strings', () => {
      const values = ['hello', '', 'world'];
      const stats = service.calculateTextStats(values);
      expect(stats.count).toBe(3);
      expect(stats.maxLength).toBe(5);
    });
  });

  describe('calculateToggleDistribution', () => {
    it('should calculate toggle distribution correctly', () => {
      const values = [true, false, true, true];
      const distribution = service.calculateToggleDistribution(values);

      expect(distribution[0].label).toBe('Yes');
      expect(distribution[0].count).toBe(3);
      expect(distribution[0].percentage).toBe(75);
      expect(distribution[1].label).toBe('No');
      expect(distribution[1].count).toBe(1);
      expect(distribution[1].percentage).toBe(25);
    });

    it('should handle empty array', () => {
      const distribution = service.calculateToggleDistribution([]);
      expect(distribution[0].count).toBe(0);
      expect(distribution[1].count).toBe(0);
      expect(distribution[0].percentage).toBe(0);
      expect(distribution[1].percentage).toBe(0);
    });

    it('should handle all true values', () => {
      const values = [true, true, true];
      const distribution = service.calculateToggleDistribution(values);
      expect(distribution[0].count).toBe(3);
      expect(distribution[0].percentage).toBe(100);
      expect(distribution[1].count).toBe(0);
    });

    it('should handle all false values', () => {
      const values = [false, false, false];
      const distribution = service.calculateToggleDistribution(values);
      expect(distribution[0].count).toBe(0);
      expect(distribution[1].count).toBe(3);
      expect(distribution[1].percentage).toBe(100);
    });
  });
});
