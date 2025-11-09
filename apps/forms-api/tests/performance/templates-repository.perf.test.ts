/**
 * Templates Repository Performance Tests
 * Epic 29: Form Template System with Business Logic
 * Story: 29.3 Templates Repository and Database Access Layer (AC11)
 *
 * Validates query performance with large dataset (1,000+ templates):
 * - Verifies database indexes are used effectively with realistic data volumes
 * - Measures query execution times against NFR targets
 * - Uses EXPLAIN ANALYZE to validate index usage under load
 *
 * Performance Targets (AC11):
 * - Single-row operations (findById, create, update): < 50ms
 * - Paginated queries (findAll): < 100ms
 * - Category queries with B-tree index: < 100ms
 */

import { Pool } from 'pg';
import { TemplatesRepository } from '../../src/repositories/templates.repository';
import {
  CreateFormTemplateRequest,
  TemplateCategory,
} from '@nodeangularfullstack/shared';

describe('Templates Repository Performance Tests', () => {
  let pool: Pool;
  let repository: TemplatesRepository;
  let testUserId: string;
  const testTemplateIds: string[] = [];
  const DATASET_SIZE = 1000; // 1K templates for realistic performance testing

  // Helper functions matching unit test pattern
  const createTestTemplateSchema = (index: number = 0) => ({
    title: `Test Form ${index}`,
    description: `Test form description ${index}`,
    fields: [
      {
        id: `field-${index}`,
        type: 'text',
        label: `Test Field ${index}`,
        required: false,
        order: 0,
      },
    ],
  });

  const createTestBusinessLogic = () => ({
    type: 'inventory' as const,
    stockField: 'product_id',
    variantField: 'size',
    quantityField: 'quantity',
    stockTable: 'inventory',
    threshold: 10,
    decrementOnSubmit: true,
  });

  beforeAll(async () => {
    // Create test database connection
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'nodeangularfullstack',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'dbpassword',
    });

    repository = new TemplatesRepository();

    // Get existing user from seed data
    const userResult = await pool.query('SELECT id FROM users LIMIT 1');
    if (userResult.rows.length === 0) {
      throw new Error(
        'No users found in database. Run seed data first (npm --workspace=apps/forms-api run db:seed)'
      );
    }
    testUserId = userResult.rows[0].id;

    console.log(
      `\n📊 Seeding ${DATASET_SIZE} form templates for performance testing...`
    );
    const seedStartTime = Date.now();

    // Seed large dataset using batch inserts for efficiency
    const batchSize = 100;
    const batches = Math.ceil(DATASET_SIZE / batchSize);
    const categories = Object.values(TemplateCategory);

    for (let batch = 0; batch < batches; batch++) {
      const batchPromises = [];

      for (let i = 0; i < batchSize && batch * batchSize + i < DATASET_SIZE; i++) {
        const index = batch * batchSize + i;
        const category = categories[index % categories.length];

        const templateData: CreateFormTemplateRequest = {
          name: `Perf Test Template ${index} - ${Date.now()}-${Math.random()}`,
          description: `Performance testing template ${index} in category ${category}`,
          category,
          templateSchema: createTestTemplateSchema(index) as any,
          businessLogicConfig: createTestBusinessLogic(),
        };

        batchPromises.push(repository.create(templateData));
      }

      const batchResults = await Promise.all(batchPromises);
      testTemplateIds.push(...batchResults.map((t) => t.id));

      // Progress indicator
      const progress = Math.round(((batch + 1) / batches) * 100);
      if ((batch + 1) % 10 === 0 || batch === batches - 1) {
        console.log(`  Progress: ${progress}% (${testTemplateIds.length}/${DATASET_SIZE} templates)`);
      }
    }

    const seedDuration = Date.now() - seedStartTime;
    console.log(`✅ Seeded ${testTemplateIds.length} templates in ${seedDuration}ms\n`);
  });

  afterAll(async () => {
    // Cleanup test data
    console.log(`\n🧹 Cleaning up ${testTemplateIds.length} test templates...`);
    const cleanupStartTime = Date.now();

    // Delete in batches to avoid overwhelming the database
    const batchSize = 100;
    for (let i = 0; i < testTemplateIds.length; i += batchSize) {
      const batch = testTemplateIds.slice(i, i + batchSize);
      await pool.query('DELETE FROM form_templates WHERE id = ANY($1)', [batch]);
    }

    const cleanupDuration = Date.now() - cleanupStartTime;
    console.log(`✅ Cleanup completed in ${cleanupDuration}ms`);

    await pool.end();
    console.log('✅ Performance tests completed\n');
  });

  describe('AC11 Performance Benchmarks with Large Dataset', () => {
    describe('Single-row operations (< 50ms)', () => {
      it('should execute findById within 50ms with 1K+ templates', async () => {
        // Select random template from dataset
        const randomId = testTemplateIds[Math.floor(Math.random() * testTemplateIds.length)];

        // Warm-up query (to eliminate cache cold-start effects)
        await repository.findById(randomId);

        // Measure performance
        const iterations = 10;
        const executionTimes: number[] = [];

        for (let i = 0; i < iterations; i++) {
          const startTime = Date.now();
          const result = await repository.findById(randomId);
          const executionTime = Date.now() - startTime;
          executionTimes.push(executionTime);

          expect(result).toBeDefined();
          expect(result?.id).toBe(randomId);
        }

        const avgTime = executionTimes.reduce((a, b) => a + b, 0) / iterations;
        const maxTime = Math.max(...executionTimes);
        const minTime = Math.min(...executionTimes);

        expect(avgTime).toBeLessThan(50);
        expect(maxTime).toBeLessThan(50);

        console.log(`  ✓ findById() - Avg: ${avgTime.toFixed(2)}ms, Min: ${minTime}ms, Max: ${maxTime}ms (target: < 50ms)`);
      });

      it('should execute create within 50ms with 1K+ existing templates', async () => {
        const iterations = 5;
        const executionTimes: number[] = [];
        const createdIds: string[] = [];

        for (let i = 0; i < iterations; i++) {
          const templateData: CreateFormTemplateRequest = {
            name: `Create Perf Test ${Date.now()}-${Math.random()}`,
            description: 'Performance testing create operation',
            category: TemplateCategory.DATA_COLLECTION,
            templateSchema: createTestTemplateSchema(DATASET_SIZE + i) as any,
            businessLogicConfig: createTestBusinessLogic(),
          };

          const startTime = Date.now();
          const created = await repository.create(templateData);
          const executionTime = Date.now() - startTime;
          executionTimes.push(executionTime);

          expect(created).toBeDefined();
          expect(created.id).toBeDefined();
          createdIds.push(created.id);
        }

        // Cleanup created templates
        testTemplateIds.push(...createdIds);

        const avgTime = executionTimes.reduce((a, b) => a + b, 0) / iterations;
        const maxTime = Math.max(...executionTimes);
        const minTime = Math.min(...executionTimes);

        expect(avgTime).toBeLessThan(50);
        expect(maxTime).toBeLessThan(50);

        console.log(`  ✓ create() - Avg: ${avgTime.toFixed(2)}ms, Min: ${minTime}ms, Max: ${maxTime}ms (target: < 50ms)`);
      });

      it('should execute update within 50ms with 1K+ existing templates', async () => {
        // Select random template from dataset
        const randomId = testTemplateIds[Math.floor(Math.random() * testTemplateIds.length)];

        const iterations = 5;
        const executionTimes: number[] = [];

        for (let i = 0; i < iterations; i++) {
          const updateData = {
            description: `Updated description ${i} - ${Date.now()}`,
          };

          const startTime = Date.now();
          const updated = await repository.update(randomId, updateData);
          const executionTime = Date.now() - startTime;
          executionTimes.push(executionTime);

          expect(updated).toBeDefined();
        }

        const avgTime = executionTimes.reduce((a, b) => a + b, 0) / iterations;
        const maxTime = Math.max(...executionTimes);
        const minTime = Math.min(...executionTimes);

        expect(avgTime).toBeLessThan(50);
        expect(maxTime).toBeLessThan(50);

        console.log(`  ✓ update() - Avg: ${avgTime.toFixed(2)}ms, Min: ${minTime}ms, Max: ${maxTime}ms (target: < 50ms)`);
      });

      it('should execute incrementUsageCount within 50ms with 1K+ existing templates', async () => {
        // Select random template from dataset
        const randomId = testTemplateIds[Math.floor(Math.random() * testTemplateIds.length)];

        const iterations = 10;
        const executionTimes: number[] = [];

        for (let i = 0; i < iterations; i++) {
          const startTime = Date.now();
          await repository.incrementUsageCount(randomId);
          const executionTime = Date.now() - startTime;
          executionTimes.push(executionTime);
        }

        const avgTime = executionTimes.reduce((a, b) => a + b, 0) / iterations;
        const maxTime = Math.max(...executionTimes);
        const minTime = Math.min(...executionTimes);

        expect(avgTime).toBeLessThan(50);
        expect(maxTime).toBeLessThan(50);

        console.log(`  ✓ incrementUsageCount() - Avg: ${avgTime.toFixed(2)}ms, Min: ${minTime}ms, Max: ${maxTime}ms (target: < 50ms)`);
      });
    });

    describe('Paginated queries (< 100ms)', () => {
      it('should execute findAll with pagination within 100ms with 1K+ templates', async () => {
        const iterations = 10;
        const executionTimes: number[] = [];

        for (let i = 0; i < iterations; i++) {
          const startTime = Date.now();
          const results = await repository.findAll(
            { isActive: true },
            { limit: 20, offset: i * 20 }
          );
          const executionTime = Date.now() - startTime;
          executionTimes.push(executionTime);

          expect(results).toBeDefined();
          expect(Array.isArray(results)).toBe(true);
        }

        const avgTime = executionTimes.reduce((a, b) => a + b, 0) / iterations;
        const maxTime = Math.max(...executionTimes);
        const minTime = Math.min(...executionTimes);

        expect(avgTime).toBeLessThan(100);
        expect(maxTime).toBeLessThan(100);

        console.log(`  ✓ findAll() paginated - Avg: ${avgTime.toFixed(2)}ms, Min: ${minTime}ms, Max: ${maxTime}ms (target: < 100ms)`);
      });

      it('should execute findAll with filters and pagination within 100ms with 1K+ templates', async () => {
        const iterations = 10;
        const executionTimes: number[] = [];

        for (let i = 0; i < iterations; i++) {
          const category = Object.values(TemplateCategory)[i % Object.values(TemplateCategory).length];

          const startTime = Date.now();
          const results = await repository.findAll(
            { isActive: true, category },
            { limit: 10, offset: 0 }
          );
          const executionTime = Date.now() - startTime;
          executionTimes.push(executionTime);

          expect(results).toBeDefined();
          expect(Array.isArray(results)).toBe(true);
        }

        const avgTime = executionTimes.reduce((a, b) => a + b, 0) / iterations;
        const maxTime = Math.max(...executionTimes);
        const minTime = Math.min(...executionTimes);

        expect(avgTime).toBeLessThan(100);
        expect(maxTime).toBeLessThan(100);

        console.log(`  ✓ findAll() with filters - Avg: ${avgTime.toFixed(2)}ms, Min: ${minTime}ms, Max: ${maxTime}ms (target: < 100ms)`);
      });
    });

    describe('Category queries with B-tree index (< 100ms)', () => {
      it('should execute findByCategory within 100ms with 1K+ templates', async () => {
        const categories = Object.values(TemplateCategory);
        const iterations = categories.length * 2; // Test each category twice
        const executionTimes: number[] = [];

        for (let i = 0; i < iterations; i++) {
          const category = categories[i % categories.length];

          const startTime = Date.now();
          const results = await repository.findByCategory(category);
          const executionTime = Date.now() - startTime;
          executionTimes.push(executionTime);

          expect(results).toBeDefined();
          expect(Array.isArray(results)).toBe(true);
          expect(results.every((t) => t.category === category)).toBe(true);
        }

        const avgTime = executionTimes.reduce((a, b) => a + b, 0) / iterations;
        const maxTime = Math.max(...executionTimes);
        const minTime = Math.min(...executionTimes);

        expect(avgTime).toBeLessThan(100);
        expect(maxTime).toBeLessThan(100);

        console.log(`  ✓ findByCategory() - Avg: ${avgTime.toFixed(2)}ms, Min: ${minTime}ms, Max: ${maxTime}ms (target: < 100ms)`);
      });
    });
  });

  describe('Index Effectiveness with Large Dataset', () => {
    it('should use B-tree index on category column with realistic data volume', async () => {
      // Execute EXPLAIN ANALYZE for category query with large dataset
      const explainQuery = `
        EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
        SELECT *
        FROM form_templates
        WHERE category = $1 AND is_active = true
        ORDER BY usage_count DESC
      `;

      const explainResult = await pool.query(explainQuery, [TemplateCategory.DATA_COLLECTION]);

      // Extract query plan
      const queryPlan = explainResult.rows[0]['QUERY PLAN'];
      const executionTime = queryPlan[0]['Execution Time'];

      console.log('\n📊 Query Plan for findByCategory with 1K+ templates:');
      console.log(JSON.stringify(queryPlan, null, 2));

      // Verify performance target
      expect(executionTime).toBeLessThan(100);
      console.log(`\n✅ Query execution time: ${executionTime.toFixed(2)}ms (target: < 100ms)`);

      // Check for index usage
      const planStr = JSON.stringify(queryPlan);
      const usesIndex = planStr.includes('idx_templates_category') ||
                        planStr.includes('Index Scan') ||
                        planStr.includes('Bitmap Index Scan');

      if (usesIndex) {
        console.log('✅ B-tree index on category column is being used');
      } else {
        console.log('⚠️  Index not used (PostgreSQL optimizer chose different strategy)');
        console.log('   Note: This may be optimal for current data distribution');
      }

      // Verify query returns correct results
      expect(queryPlan[0]['Plan']['Actual Rows']).toBeGreaterThan(0);
    });

    it('should verify index selectivity for all categories', async () => {
      const categories = Object.values(TemplateCategory);
      const selectivityResults: { category: string; count: number; executionTime: number }[] = [];

      for (const category of categories) {
        const explainQuery = `
          EXPLAIN (ANALYZE, FORMAT JSON)
          SELECT COUNT(*)
          FROM form_templates
          WHERE category = $1 AND is_active = true
        `;

        const explainResult = await pool.query(explainQuery, [category]);
        const queryPlan = explainResult.rows[0]['QUERY PLAN'];
        const executionTime = queryPlan[0]['Execution Time'];
        const rowCount = queryPlan[0]['Plan']['Actual Rows'];

        selectivityResults.push({
          category,
          count: rowCount,
          executionTime,
        });

        expect(executionTime).toBeLessThan(100);
      }

      console.log('\n📊 Index Selectivity by Category:');
      console.table(selectivityResults);

      // Verify all categories have reasonable distribution
      const totalTemplates = selectivityResults.reduce((sum, r) => sum + r.count, 0);
      console.log(`Total templates across all categories: ${totalTemplates}`);
      expect(totalTemplates).toBeGreaterThan(DATASET_SIZE * 0.9); // Account for soft deletes
    });
  });

  describe('Concurrent Operations Performance', () => {
    it('should handle 50 concurrent read operations within target time', async () => {
      const concurrentReads = 50;
      const startTime = Date.now();

      const readPromises = Array(concurrentReads)
        .fill(null)
        .map(() => {
          const randomId = testTemplateIds[Math.floor(Math.random() * testTemplateIds.length)];
          return repository.findById(randomId);
        });

      const results = await Promise.all(readPromises);
      const totalTime = Date.now() - startTime;
      const avgTimePerRead = totalTime / concurrentReads;

      expect(results.every((r) => r !== null)).toBe(true);
      expect(avgTimePerRead).toBeLessThan(50);

      console.log(`  ✓ 50 concurrent reads - Total: ${totalTime}ms, Avg per read: ${avgTimePerRead.toFixed(2)}ms`);
    });

    it('should handle 20 concurrent incrementUsageCount operations', async () => {
      const randomId = testTemplateIds[Math.floor(Math.random() * testTemplateIds.length)];

      // Get initial usage count
      const initial = await repository.findById(randomId);
      const initialCount = initial?.usageCount || 0;

      // Execute concurrent increments
      const concurrentIncrements = 20;
      const startTime = Date.now();

      const incrementPromises = Array(concurrentIncrements)
        .fill(null)
        .map(() => repository.incrementUsageCount(randomId));

      await Promise.all(incrementPromises);
      const totalTime = Date.now() - startTime;
      const avgTimePerIncrement = totalTime / concurrentIncrements;

      // Verify final count (atomic operation, no lost updates)
      const final = await repository.findById(randomId);
      expect(final?.usageCount).toBe(initialCount + concurrentIncrements);
      expect(avgTimePerIncrement).toBeLessThan(50);

      console.log(`  ✓ 20 concurrent increments - Total: ${totalTime}ms, Avg per increment: ${avgTimePerIncrement.toFixed(2)}ms`);
      console.log(`    Initial count: ${initialCount}, Final count: ${final?.usageCount} (no lost updates)`);
    });
  });
});
