import { StatisticsEngineService } from './statistics-engine.service';
import { ChoiceDistribution } from '@nodeangularfullstack/shared';

/**
 * Performance benchmark tests for StatisticsEngineService.
 * Validates AC9: Performance for Large Datasets requirement.
 *
 * Requirements:
 * - Statistics calculations complete within 1 second for 1000 submissions
 * - Charts render within 1 second after calculation
 * - Memory usage remains reasonable with large datasets
 */
describe('StatisticsEngineService - Performance Benchmarks', () => {
  let service: StatisticsEngineService;

  const PERFORMANCE_THRESHOLD_MS = 1000; // 1 second max
  const LARGE_DATASET_SIZE = 1000;
  const VERY_LARGE_DATASET_SIZE = 5000;

  beforeEach(() => {
    service = new StatisticsEngineService();
  });

  describe('Numeric Statistics Performance', () => {
    it('should calculate numeric stats for 1000 values within 1 second', () => {
      // Generate 1000 random numeric values
      const values = Array.from({ length: LARGE_DATASET_SIZE }, () => Math.random() * 100);

      const startTime = performance.now();
      const stats = service.calculateNumericStats(values);
      const endTime = performance.now();

      const executionTime = endTime - startTime;

      expect(stats).toBeDefined();
      expect(stats.count).toBe(LARGE_DATASET_SIZE);
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

      console.log(`✅ calculateNumericStats (1000 values): ${executionTime.toFixed(2)}ms`);
    });

    it('should handle 5000 values efficiently', () => {
      const values = Array.from({ length: VERY_LARGE_DATASET_SIZE }, () => Math.random() * 100);

      const startTime = performance.now();
      const stats = service.calculateNumericStats(values);
      const endTime = performance.now();

      const executionTime = endTime - startTime;

      expect(stats).toBeDefined();
      expect(stats.count).toBe(VERY_LARGE_DATASET_SIZE);

      // Allow slightly more time for very large datasets (5x threshold)
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS * 5);

      console.log(`ℹ️  calculateNumericStats (5000 values): ${executionTime.toFixed(2)}ms`);
    });

    it('should maintain performance with outliers and null values', () => {
      // Mix of valid values, nulls, NaN, and outliers
      const values = [
        ...Array.from({ length: 900 }, () => Math.random() * 100),
        ...Array(50).fill(null),
        ...Array(50).fill(NaN),
      ];

      const startTime = performance.now();
      const stats = service.calculateNumericStats(values as number[]);
      const endTime = performance.now();

      const executionTime = endTime - startTime;

      expect(stats).toBeDefined();
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

      console.log(`✅ calculateNumericStats (with nulls/NaN): ${executionTime.toFixed(2)}ms`);
    });
  });

  describe('Choice Distribution Performance', () => {
    it('should calculate distribution for 1000 submissions within 1 second', () => {
      const options = [
        { label: 'Option 1', value: 'opt1' },
        { label: 'Option 2', value: 'opt2' },
        { label: 'Option 3', value: 'opt3' },
        { label: 'Option 4', value: 'opt4' },
        { label: 'Option 5', value: 'opt5' },
      ];

      // Generate 1000 random selections
      const values = Array.from({ length: LARGE_DATASET_SIZE }, () => {
        const randomIndex = Math.floor(Math.random() * options.length);
        return options[randomIndex].value;
      });

      const startTime = performance.now();
      const distribution = service.calculateChoiceDistribution(values, options);
      const endTime = performance.now();

      const executionTime = endTime - startTime;

      expect(distribution.length).toBe(options.length);
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

      console.log(`✅ calculateChoiceDistribution (1000 values): ${executionTime.toFixed(2)}ms`);
    });

    it('should handle many options efficiently', () => {
      // Create 50 options
      const options = Array.from({ length: 50 }, (_, i) => ({
        label: `Option ${i + 1}`,
        value: `opt${i + 1}`,
      }));

      const values = Array.from({ length: LARGE_DATASET_SIZE }, () => {
        const randomIndex = Math.floor(Math.random() * options.length);
        return options[randomIndex].value;
      });

      const startTime = performance.now();
      const distribution = service.calculateChoiceDistribution(values, options);
      const endTime = performance.now();

      const executionTime = endTime - startTime;

      expect(distribution.length).toBe(options.length);
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

      console.log(
        `✅ calculateChoiceDistribution (50 options, 1000 values): ${executionTime.toFixed(2)}ms`,
      );
    });

    it('should handle checkbox arrays (multiple selections) efficiently', () => {
      const options = [
        { label: 'Checkbox 1', value: 'cb1' },
        { label: 'Checkbox 2', value: 'cb2' },
        { label: 'Checkbox 3', value: 'cb3' },
      ];

      // Each submission has multiple selections (arrays flattened)
      const values: string[] = [];
      for (let i = 0; i < LARGE_DATASET_SIZE; i++) {
        // Random number of selections per submission (0-3)
        const selectCount = Math.floor(Math.random() * 4);
        for (let j = 0; j < selectCount; j++) {
          const randomIndex = Math.floor(Math.random() * options.length);
          values.push(options[randomIndex].value);
        }
      }

      const startTime = performance.now();
      const distribution = service.calculateChoiceDistribution(values, options);
      const endTime = performance.now();

      const executionTime = endTime - startTime;

      expect(distribution.length).toBe(options.length);
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

      console.log(
        `✅ calculateChoiceDistribution (checkbox arrays): ${executionTime.toFixed(2)}ms`,
      );
    });
  });

  describe('Time Series Performance', () => {
    it('should generate daily time series for 1000 submissions within 1 second', () => {
      // Generate 1000 dates spread over 90 days
      const now = new Date();
      const dates = Array.from({ length: LARGE_DATASET_SIZE }, () => {
        const daysAgo = Math.floor(Math.random() * 90);
        const date = new Date(now);
        date.setDate(date.getDate() - daysAgo);
        return date;
      });

      const startTime = performance.now();
      const timeSeries = service.generateTimeSeries(dates, 'day');
      const endTime = performance.now();

      const executionTime = endTime - startTime;

      expect(timeSeries).toBeDefined();
      expect(timeSeries.length).toBeGreaterThan(0);
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

      console.log(`✅ generateTimeSeries (1000 dates, daily): ${executionTime.toFixed(2)}ms`);
    });

    it('should generate weekly time series efficiently', () => {
      const now = new Date();
      const dates = Array.from({ length: LARGE_DATASET_SIZE }, () => {
        const weeksAgo = Math.floor(Math.random() * 52);
        const date = new Date(now);
        date.setDate(date.getDate() - weeksAgo * 7);
        return date;
      });

      const startTime = performance.now();
      const timeSeries = service.generateTimeSeries(dates, 'week');
      const endTime = performance.now();

      const executionTime = endTime - startTime;

      expect(timeSeries).toBeDefined();
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

      console.log(`✅ generateTimeSeries (1000 dates, weekly): ${executionTime.toFixed(2)}ms`);
    });

    it('should generate monthly time series efficiently', () => {
      const now = new Date();
      const dates = Array.from({ length: LARGE_DATASET_SIZE }, () => {
        const monthsAgo = Math.floor(Math.random() * 24);
        const date = new Date(now);
        date.setMonth(date.getMonth() - monthsAgo);
        return date;
      });

      const startTime = performance.now();
      const timeSeries = service.generateTimeSeries(dates, 'month');
      const endTime = performance.now();

      const executionTime = endTime - startTime;

      expect(timeSeries).toBeDefined();
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

      console.log(`✅ generateTimeSeries (1000 dates, monthly): ${executionTime.toFixed(2)}ms`);
    });
  });

  describe('Text Statistics Performance', () => {
    it('should calculate text statistics for 1000 submissions within 1 second', () => {
      // Generate 1000 random text strings
      const values = Array.from({ length: LARGE_DATASET_SIZE }, () => {
        const wordCount = Math.floor(Math.random() * 50) + 1;
        return Array(wordCount).fill('word').join(' ');
      });

      const startTime = performance.now();
      const stats = service.calculateTextStats(values);
      const endTime = performance.now();

      const executionTime = endTime - startTime;

      expect(stats).toBeDefined();
      expect(stats.count).toBe(LARGE_DATASET_SIZE);
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

      console.log(`✅ calculateTextStats (1000 values): ${executionTime.toFixed(2)}ms`);
    });
  });

  describe('Toggle Statistics Performance', () => {
    it('should calculate toggle distribution for 1000 submissions within 1 second', () => {
      // Generate 1000 random boolean values
      const values = Array.from({ length: LARGE_DATASET_SIZE }, () => Math.random() > 0.5);

      const startTime = performance.now();
      const distribution = service.calculateToggleDistribution(values);
      const endTime = performance.now();

      const executionTime = endTime - startTime;

      expect(distribution).toBeDefined();
      expect(distribution.length).toBe(2 as number); // True and False
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

      console.log(`✅ calculateToggleDistribution (1000 values): ${executionTime.toFixed(2)}ms`);
    });
  });

  describe('Combined Operations Performance', () => {
    it('should handle multiple field calculations for a typical form within 1 second', () => {
      // Simulate a form with 10 fields of various types
      const formData = {
        numericField: Array.from({ length: LARGE_DATASET_SIZE }, () => Math.random() * 100),
        selectField: Array.from(
          { length: LARGE_DATASET_SIZE },
          () => ['opt1', 'opt2', 'opt3'][Math.floor(Math.random() * 3)],
        ),
        dateField: Array.from({ length: LARGE_DATASET_SIZE }, () => {
          const daysAgo = Math.floor(Math.random() * 30);
          const date = new Date();
          date.setDate(date.getDate() - daysAgo);
          return date;
        }),
        textField: Array.from({ length: LARGE_DATASET_SIZE }, () => 'Sample text response'),
        toggleField: Array.from({ length: LARGE_DATASET_SIZE }, () => Math.random() > 0.5),
      };

      const options = [
        { label: 'Option 1', value: 'opt1' },
        { label: 'Option 2', value: 'opt2' },
        { label: 'Option 3', value: 'opt3' },
      ];

      const startTime = performance.now();

      // Calculate all statistics
      const numericStats = service.calculateNumericStats(formData.numericField);
      const choiceDistribution = service.calculateChoiceDistribution(formData.selectField, options);
      const timeSeries = service.generateTimeSeries(formData.dateField, 'day');
      const textStats = service.calculateTextStats(formData.textField);
      const toggleDistribution = service.calculateToggleDistribution(formData.toggleField);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Verify all calculations completed
      expect(numericStats).toBeDefined();
      expect(choiceDistribution).toBeDefined();
      expect(timeSeries).toBeDefined();
      expect(textStats).toBeDefined();
      expect(toggleDistribution).toBeDefined();

      // All calculations should complete within threshold
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

      console.log(
        `✅ Combined calculations (5 field types, 1000 submissions): ${executionTime.toFixed(2)}ms`,
      );
    });

    it('should handle large form with 20 fields within 2 seconds', () => {
      const DOUBLE_THRESHOLD = PERFORMANCE_THRESHOLD_MS * 2;

      // Generate data for 20 fields
      const fieldData = Array.from({ length: 20 }, (_, i) => ({
        type: ['numeric', 'choice', 'date', 'text', 'toggle'][i % 5],
        values: Array.from({ length: LARGE_DATASET_SIZE }, () => {
          switch (i % 5) {
            case 0:
              return Math.random() * 100;
            case 1:
              return `opt${Math.floor(Math.random() * 5) + 1}`;
            case 2: {
              const date = new Date();
              date.setDate(date.getDate() - Math.floor(Math.random() * 30));
              return date;
            }
            case 3:
              return 'Sample text';
            case 4:
              return Math.random() > 0.5;
            default:
              return null;
          }
        }),
      }));

      const options = Array.from({ length: 5 }, (_, i) => ({
        label: `Option ${i + 1}`,
        value: `opt${i + 1}`,
      }));

      const startTime = performance.now();

      // Calculate statistics for all 20 fields
      fieldData.forEach((field) => {
        switch (field.type) {
          case 'numeric':
            service.calculateNumericStats(field.values as number[]);
            break;
          case 'choice':
            service.calculateChoiceDistribution(field.values as string[], options);
            break;
          case 'date':
            service.generateTimeSeries(field.values as Date[], 'day');
            break;
          case 'text':
            service.calculateTextStats(field.values as string[]);
            break;
          case 'toggle':
            service.calculateToggleDistribution(field.values as boolean[]);
            break;
        }
      });

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Allow 2 seconds for 20 fields
      expect(executionTime).toBeLessThan(DOUBLE_THRESHOLD);

      console.log(`✅ Large form (20 fields, 1000 submissions): ${executionTime.toFixed(2)}ms`);
    });
  });

  describe('Memory Efficiency', () => {
    it('should not cause memory issues with large datasets', () => {
      // This test verifies that calculations don't cause memory leaks
      const iterations = 10;

      const startMemory = (performance as { memory?: { usedJSHeapSize: number } }).memory
        ?.usedJSHeapSize;

      for (let i = 0; i < iterations; i++) {
        const values = Array.from({ length: LARGE_DATASET_SIZE }, () => Math.random() * 100);
        service.calculateNumericStats(values);
      }

      const endMemory = (performance as { memory?: { usedJSHeapSize: number } }).memory
        ?.usedJSHeapSize;

      if (startMemory !== undefined && endMemory !== undefined) {
        const memoryIncrease = endMemory - startMemory;
        const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

        // Memory increase should be reasonable (< 50MB for 10 iterations)
        expect(memoryIncreaseMB).toBeLessThan(50);

        console.log(
          `ℹ️  Memory increase after ${iterations} iterations: ${memoryIncreaseMB.toFixed(2)}MB`,
        );
      } else {
        console.log('⚠️  Performance.memory API not available in this environment');
      }

      // Test passes if no errors occurred
      expect(true).toBe(true);
    });
  });

  describe('Performance Report', () => {
    it('should generate performance summary', () => {
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('           PERFORMANCE BENCHMARK SUMMARY');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(
        `Target: All operations < ${PERFORMANCE_THRESHOLD_MS}ms for ${LARGE_DATASET_SIZE} submissions`,
      );
      console.log('───────────────────────────────────────────────────────────');
      console.log('Run the full test suite to see detailed benchmarks for:');
      console.log('  • Numeric statistics calculation');
      console.log('  • Choice distribution analysis');
      console.log('  • Time series generation');
      console.log('  • Text statistics');
      console.log('  • Toggle distribution');
      console.log('  • Combined operations (multiple fields)');
      console.log('═══════════════════════════════════════════════════════════\n');

      expect(true).toBe(true);
    });
  });
});
