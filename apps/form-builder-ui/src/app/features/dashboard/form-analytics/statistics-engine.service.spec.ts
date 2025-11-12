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

  describe('analyzeQuizScores (Epic 29, Story 29.13, TEST-003)', () => {
    it('should categorize submissions into correct score ranges', () => {
      const submissions = [
        createQuizSubmission(10), // 0-20%
        createQuizSubmission(35), // 21-40%
        createQuizSubmission(50), // 41-60%
        createQuizSubmission(75), // 61-80%
        createQuizSubmission(95), // 81-100%
      ];

      const result = service.analyzeQuizScores(submissions);

      expect(result.labels).toEqual(['0-20%', '21-40%', '41-60%', '61-80%', '81-100%']);
      expect(result.datasets[0].data).toEqual([1, 1, 1, 1, 1]);
    });

    it('should handle boundary values correctly', () => {
      const submissions = [
        createQuizSubmission(0), // 0-20%
        createQuizSubmission(20), // 0-20%
        createQuizSubmission(40), // 21-40%
        createQuizSubmission(60), // 41-60%
        createQuizSubmission(80), // 61-80%
        createQuizSubmission(100), // 81-100%
      ];

      const result = service.analyzeQuizScores(submissions);

      expect(result.datasets[0].data).toEqual([2, 1, 1, 1, 1]);
    });

    it('should handle empty submissions array', () => {
      const result = service.analyzeQuizScores([]);

      expect(result.labels).toEqual(['0-20%', '21-40%', '41-60%', '61-80%', '81-100%']);
      expect(result.datasets[0].data).toEqual([0, 0, 0, 0, 0]);
    });

    it('should skip submissions without quiz metadata', () => {
      const submissions = [
        createQuizSubmission(50),
        createRegularSubmission(), // No quiz metadata
        createQuizSubmission(80),
      ];

      const result = service.analyzeQuizScores(submissions);

      // Should only count the 2 quiz submissions
      expect(result.datasets[0].data).toEqual([0, 0, 1, 1, 0]);
    });

    it('should handle perfect score (100%)', () => {
      const submissions = [createQuizSubmission(100)];

      const result = service.analyzeQuizScores(submissions);

      expect(result.datasets[0].data[4]).toBe(1); // 81-100% range
    });

    it('should handle zero score (0%)', () => {
      const submissions = [createQuizSubmission(0)];

      const result = service.analyzeQuizScores(submissions);

      expect(result.datasets[0].data[0]).toBe(1); // 0-20% range
    });

    it('should count multiple submissions in the same range', () => {
      const submissions = [
        createQuizSubmission(85),
        createQuizSubmission(90),
        createQuizSubmission(95),
        createQuizSubmission(100),
      ];

      const result = service.analyzeQuizScores(submissions);

      expect(result.datasets[0].data[4]).toBe(4); // All in 81-100% range
    });

    it('should return correct ChartData structure', () => {
      const submissions = [createQuizSubmission(50)];

      const result = service.analyzeQuizScores(submissions);

      expect(result).toHaveProperty('labels');
      expect(result).toHaveProperty('datasets');
      expect(Array.isArray(result.labels)).toBe(true);
      expect(Array.isArray(result.datasets)).toBe(true);
      expect(result.datasets[0]).toHaveProperty('label');
      expect(result.datasets[0].label).toBe('Number of Submissions');
    });

    it('should have 5 color-coded background colors', () => {
      const result = service.analyzeQuizScores([]);

      const colors = result.datasets[0].backgroundColor as string[];
      expect(colors.length).toBe(5);
      expect(colors[0]).toContain('244, 67, 54'); // Red
      expect(colors[4]).toContain('76, 175, 80'); // Green
    });

    it('should analyze a typical class quiz distribution', () => {
      const submissions = [
        // Failed (0-20%): 2 students
        createQuizSubmission(10),
        createQuizSubmission(15),
        // Poor (21-40%): 3 students
        createQuizSubmission(25),
        createQuizSubmission(30),
        createQuizSubmission(38),
        // Average (41-60%): 5 students
        createQuizSubmission(45),
        createQuizSubmission(50),
        createQuizSubmission(52),
        createQuizSubmission(55),
        createQuizSubmission(60),
        // Good (61-80%): 8 students
        createQuizSubmission(65),
        createQuizSubmission(70),
        createQuizSubmission(72),
        createQuizSubmission(75),
        createQuizSubmission(76),
        createQuizSubmission(78),
        createQuizSubmission(79),
        createQuizSubmission(80),
        // Excellent (81-100%): 12 students
        createQuizSubmission(82),
        createQuizSubmission(85),
        createQuizSubmission(88),
        createQuizSubmission(90),
        createQuizSubmission(92),
        createQuizSubmission(94),
        createQuizSubmission(95),
        createQuizSubmission(96),
        createQuizSubmission(97),
        createQuizSubmission(98),
        createQuizSubmission(99),
        createQuizSubmission(100),
      ];

      const result = service.analyzeQuizScores(submissions);

      // Bell curve distribution
      expect(result.datasets[0].data).toEqual([2, 3, 5, 8, 12]);
    });
  });
});

// Helper Functions for Quiz Tests

function createQuizSubmission(score: number): any {
  return {
    id: `quiz-sub-${Math.random()}`,
    formSchemaId: 'test-form-id',
    data: {},
    metadata: {
      score,
      passed: score >= 60,
      correctAnswers: Math.floor((score / 100) * 10),
      totalQuestions: 10,
    },
    submittedAt: new Date(),
    submitterIp: '127.0.0.1',
  };
}

function createRegularSubmission(): any {
  return {
    id: `regular-sub-${Math.random()}`,
    formSchemaId: 'test-form-id',
    data: { name: 'Test User', email: 'test@example.com' },
    metadata: null,
    submittedAt: new Date(),
    submitterIp: '127.0.0.1',
  };
}
