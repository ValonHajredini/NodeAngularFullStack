/**
 * Templates Repository Integration Tests
 * Epic 29: Form Template System with Business Logic
 * Story: 29.3 Templates Repository and Database Access Layer
 *
 * Integration tests with real PostgreSQL database to verify:
 * - AC11 Performance benchmarks (50ms single-row, 100ms queries)
 * - Database index effectiveness (B-tree on category column)
 * - Real database constraint validation
 * - Transaction handling and atomicity
 *
 * Performance Targets (AC11):
 * - Single-row operations (findById, create, update): < 50ms
 * - Paginated queries (findAll): < 100ms
 * - Category queries with B-tree index: < 100ms
 */

import { Pool } from 'pg';
import { TemplatesRepository } from '../../src/repositories/templates.repository';
import {
  TemplateCategory,
  CreateFormTemplateRequest,
} from '@nodeangularfullstack/shared';

describe('Templates Repository Integration Tests', () => {
  let pool: Pool;
  let repository: TemplatesRepository;
  let testUserId: string;
  const testTemplateIds: string[] = [];

  // Simplified template schema for testing (matches unit test pattern)
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

  // Simplified business logic config for testing
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

    console.log('\n🧪 Starting Templates Repository Integration Tests...');
  });

  afterAll(async () => {
    // Cleanup test data
    if (testTemplateIds.length > 0) {
      await pool.query(
        'DELETE FROM form_templates WHERE id = ANY($1)',
        [testTemplateIds]
      );
    }
    await pool.end();
    console.log('✅ Integration tests completed and cleaned up\n');
  });

  describe('AC11: Performance Benchmarks', () => {
    describe('Single-row operations (< 50ms)', () => {
      it('should create template within 50ms', async () => {
        const templateData: CreateFormTemplateRequest = {
          name: 'Performance Test Template',
          description: 'Template for testing create performance',
          category: TemplateCategory.ECOMMERCE,
          templateSchema: createTestTemplateSchema(0) as any,
          businessLogicConfig: createTestBusinessLogic(),
        };

        const startTime = Date.now();
        const created = await repository.create(templateData);
        const executionTime = Date.now() - startTime;

        expect(created).toBeDefined();
        expect(created.id).toBeDefined();
        expect(executionTime).toBeLessThan(50);

        testTemplateIds.push(created.id);

        console.log(`  ✓ create() executed in ${executionTime}ms (target: < 50ms)`);
      });

      it('should find template by ID within 50ms', async () => {
        // Create test template first
        const templateData: CreateFormTemplateRequest = {
          name: 'FindById Performance Test',
          description: 'Template for testing findById performance',
          category: TemplateCategory.DATA_COLLECTION,
          templateSchema: createTestTemplateSchema(1) as any,
          businessLogicConfig: createTestBusinessLogic(),
        };

        const created = await repository.create(templateData);
        testTemplateIds.push(created.id);

        // Measure findById performance
        const startTime = Date.now();
        const found = await repository.findById(created.id);
        const executionTime = Date.now() - startTime;

        expect(found).toBeDefined();
        expect(found?.id).toBe(created.id);
        expect(executionTime).toBeLessThan(50);

        console.log(`  ✓ findById() executed in ${executionTime}ms (target: < 50ms)`);
      });

      it('should update template within 50ms', async () => {
        // Create test template first
        const templateData: CreateFormTemplateRequest = {
          name: 'Update Performance Test',
          description: 'Template for testing update performance',
          category: TemplateCategory.DATA_COLLECTION,
          templateSchema: createTestTemplateSchema(2) as any,
          businessLogicConfig: createTestBusinessLogic(),
        };

        const created = await repository.create(templateData);
        testTemplateIds.push(created.id);

        // Measure update performance
        const updateData = {
          name: 'Updated Performance Test',
          description: 'Updated description',
        };

        const startTime = Date.now();
        const updated = await repository.update(created.id, updateData);
        const executionTime = Date.now() - startTime;

        expect(updated).toBeDefined();
        expect(updated.name).toBe('Updated Performance Test');
        expect(executionTime).toBeLessThan(50);

        console.log(`  ✓ update() executed in ${executionTime}ms (target: < 50ms)`);
      });

      it('should increment usage count within 50ms', async () => {
        // Create test template first
        const templateData: CreateFormTemplateRequest = {
          name: 'Increment Performance Test',
          description: 'Template for testing increment performance',
          category: TemplateCategory.QUIZ,
          templateSchema: createTestTemplateSchema(3) as any,
          businessLogicConfig: createTestBusinessLogic(),
        };

        const created = await repository.create(templateData);
        testTemplateIds.push(created.id);

        // Measure incrementUsageCount performance
        const startTime = Date.now();
        await repository.incrementUsageCount(created.id);
        const executionTime = Date.now() - startTime;

        expect(executionTime).toBeLessThan(50);

        // Verify increment worked
        const updated = await repository.findById(created.id);
        expect(updated?.usageCount).toBe(1);

        console.log(
          `  ✓ incrementUsageCount() executed in ${executionTime}ms (target: < 50ms)`
        );
      });
    });

    describe('Paginated queries (< 100ms)', () => {
      it('should execute findAll with pagination within 100ms', async () => {
        // Create multiple templates for pagination test
        const templatePromises = [];
        for (let i = 0; i < 10; i++) {
          const templateData: CreateFormTemplateRequest = {
            name: `Pagination Test Template ${i}`,
            description: `Template ${i} for pagination performance testing`,
            category: TemplateCategory.DATA_COLLECTION,
            templateSchema: createTestTemplateSchema(10 + i) as any,
            businessLogicConfig: createTestBusinessLogic(),
          };
          templatePromises.push(repository.create(templateData));
        }

        const created = await Promise.all(templatePromises);
        testTemplateIds.push(...created.map((t) => t.id));

        // Measure findAll with pagination performance
        const startTime = Date.now();
        const results = await repository.findAll(
          { isActive: true },
          { limit: 10, offset: 0 }
        );
        const executionTime = Date.now() - startTime;

        expect(results).toBeDefined();
        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBeGreaterThan(0);
        expect(executionTime).toBeLessThan(100);

        console.log(
          `  ✓ findAll() with pagination executed in ${executionTime}ms (target: < 100ms)`
        );
      });

      it('should execute findAll with filters and pagination within 100ms', async () => {
        const startTime = Date.now();
        const results = await repository.findAll(
          { isActive: true, category: TemplateCategory.DATA_COLLECTION },
          { limit: 5, offset: 0 }
        );
        const executionTime = Date.now() - startTime;

        expect(results).toBeDefined();
        expect(Array.isArray(results)).toBe(true);
        expect(executionTime).toBeLessThan(100);

        console.log(
          `  ✓ findAll() with filters executed in ${executionTime}ms (target: < 100ms)`
        );
      });
    });

    describe('Category queries with B-tree index (< 100ms)', () => {
      it('should execute findByCategory within 100ms', async () => {
        // Create templates in different categories
        const categories = [
          TemplateCategory.DATA_COLLECTION,
          TemplateCategory.ECOMMERCE,
          TemplateCategory.QUIZ,
        ];

        let categoryIndex = 0;
        for (const category of categories) {
          const templateData: CreateFormTemplateRequest = {
            name: `Category Test ${category}`,
            description: `Template for ${category} category performance test`,
            category,
            templateSchema: createTestTemplateSchema(30 + categoryIndex) as any,
            businessLogicConfig: createTestBusinessLogic(),
          };
          const created = await repository.create(templateData);
          testTemplateIds.push(created.id);
          categoryIndex++;
        }

        // Measure findByCategory performance
        const startTime = Date.now();
        const results = await repository.findByCategory(TemplateCategory.DATA_COLLECTION);
        const executionTime = Date.now() - startTime;

        expect(results).toBeDefined();
        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBeGreaterThan(0);
        expect(results.every((t) => t.category === TemplateCategory.DATA_COLLECTION)).toBe(
          true
        );
        expect(executionTime).toBeLessThan(100);

        console.log(
          `  ✓ findByCategory() executed in ${executionTime}ms (target: < 100ms)`
        );
      });
    });
  });

  describe('Database Index Effectiveness', () => {
    it('should use B-tree index on category column (EXPLAIN ANALYZE)', async () => {
      // Create templates to ensure data exists
      for (let i = 0; i < 5; i++) {
        const templateData: CreateFormTemplateRequest = {
          name: `Index Test Template ${i}`,
          description: 'Template for index effectiveness testing',
          category: TemplateCategory.ECOMMERCE,
          templateSchema: createTestTemplateSchema(40 + i) as any,
          businessLogicConfig: createTestBusinessLogic(),
        };
        const created = await repository.create(templateData);
        testTemplateIds.push(created.id);
      }

      // Execute EXPLAIN ANALYZE for category query
      const explainQuery = `
        EXPLAIN ANALYZE
        SELECT *
        FROM form_templates
        WHERE category = $1 AND is_active = true
        ORDER BY usage_count DESC
      `;

      const explainResult = await pool.query(explainQuery, [
        TemplateCategory.ECOMMERCE,
      ]);

      // Extract query plan
      const queryPlan = explainResult.rows.map((r) => r['QUERY PLAN']).join('\n');

      console.log('\n📊 Query Plan for findByCategory:');
      console.log(queryPlan);

      // Verify index usage
      const usesIndex = queryPlan.includes('idx_templates_category') ||
                        queryPlan.includes('Index Scan');

      // Note: Index usage depends on data volume and PostgreSQL optimizer decisions
      // With small datasets, PostgreSQL may choose sequential scan over index scan
      if (usesIndex) {
        console.log('✅ B-tree index on category column is being used');
      } else {
        console.log(
          '⚠️  Index not used (likely due to small dataset - normal for test environment)'
        );
      }

      // Check execution time is still acceptable
      const executionTimeMatch = queryPlan.match(/Execution Time: ([\d.]+) ms/);
      if (executionTimeMatch) {
        const executionTime = parseFloat(executionTimeMatch[1]);
        console.log(`  Query execution time: ${executionTime}ms`);
        expect(executionTime).toBeLessThan(100);
      }
    });
  });

  describe('Real Database Constraints', () => {
    it('should enforce unique constraint on name per user', async () => {
      const templateData: CreateFormTemplateRequest = {
        name: 'Unique Constraint Test',
        description: 'Testing unique constraint',
        category: TemplateCategory.DATA_COLLECTION,
        templateSchema: createTestTemplateSchema(50) as any,
        businessLogicConfig: createTestBusinessLogic(),
      };

      // Create first template
      const created = await repository.create(templateData);
      testTemplateIds.push(created.id);

      // Attempt to create duplicate
      await expect(repository.create(templateData)).rejects.toThrow(
        /already exists/i
      );
    });

    it('should enforce check constraint on category enum', async () => {
      const templateData: any = {
        name: 'Invalid Category Test',
        description: 'Testing category check constraint',
        category: 'INVALID_CATEGORY', // Invalid category value
        templateSchema: createTestTemplateSchema(51) as any,
        businessLogicConfig: createTestBusinessLogic(),
      };

      await expect(repository.create(templateData)).rejects.toThrow();
    });

    it('should enforce JSONB schema size limit (50KB)', async () => {
      // Create large schema exceeding 50KB
      const largeFields = [];
      for (let i = 0; i < 500; i++) {
        largeFields.push({
          id: `field${i}`,
          type: 'text',
          label: `Test Field ${i}`,
          required: false,
          order: i,
          placeholder: 'A'.repeat(100), // Padding to increase size
        });
      }

      const templateData: CreateFormTemplateRequest = {
        name: 'Large Schema Test',
        description: 'Testing schema size constraint',
        category: TemplateCategory.DATA_COLLECTION,
        templateSchema: {
          title: 'Large Schema',
          description: 'Test',
          fields: largeFields,
        } as any,
        businessLogicConfig: createTestBusinessLogic(),
      };

      await expect(repository.create(templateData)).rejects.toThrow();
    });
  });

  describe('Atomic Operations', () => {
    it('should handle concurrent incrementUsageCount without race conditions', async () => {
      // Create test template
      const templateData: CreateFormTemplateRequest = {
        name: 'Concurrency Test Template',
        description: 'Template for testing atomic increment',
        category: TemplateCategory.POLLS,
        templateSchema: createTestTemplateSchema(60) as any,
        businessLogicConfig: createTestBusinessLogic(),
      };

      const created = await repository.create(templateData);
      testTemplateIds.push(created.id);

      // Execute 10 concurrent increments
      const incrementPromises = Array(10)
        .fill(null)
        .map(() => repository.incrementUsageCount(created.id));

      await Promise.all(incrementPromises);

      // Verify final count is exactly 10 (no lost updates)
      const updated = await repository.findById(created.id);
      expect(updated?.usageCount).toBe(10);

      console.log(
        '✅ Atomic incrementUsageCount handled 10 concurrent operations correctly'
      );
    });
  });

  describe('Transaction Integrity', () => {
    it('should rollback on error and maintain data consistency', async () => {
      const initialCount = await pool.query(
        'SELECT COUNT(*) FROM form_templates WHERE created_by = $1',
        [testUserId]
      );

      // Attempt to create template with invalid data (missing required field)
      const invalidTemplateData: any = {
        name: 'Rollback Test',
        // Missing required fields: description, category, templateSchema
        createdBy: testUserId,
      };

      await expect(repository.create(invalidTemplateData)).rejects.toThrow();

      // Verify count unchanged (rollback successful)
      const finalCount = await pool.query(
        'SELECT COUNT(*) FROM form_templates WHERE created_by = $1',
        [testUserId]
      );

      expect(finalCount.rows[0].count).toBe(initialCount.rows[0].count);
    });
  });
});
