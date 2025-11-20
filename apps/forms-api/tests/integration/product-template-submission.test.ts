/**
 * Integration tests for Product Template with Inventory Tracking
 * Epic: 29 - Form Template System with Business Logic
 * Story: 29.11 - Product Template with Inventory Tracking
 * Task: 11 - Integration tests for full submission flow and concurrent handling
 */

import request from 'supertest';
import express from 'express';
import { databaseService } from '../../src/services/database.service';
import publicFormsRoutes from '../../src/routes/public-forms.routes';
import inventoryRoutes from '../../src/routes/inventory.routes';
import { FormFieldType } from '@nodeangularfullstack/shared';

// Test app setup
const app = express();
app.use(express.json());
app.use('/api/public/forms', publicFormsRoutes);
app.use('/api/v1/inventory', inventoryRoutes);

describe('Product Template - Form Submission with Inventory Tracking', () => {
  let testFormId: string;
  let testShortCode: string;
  let testUserId: string;

  beforeAll(async () => {
    // Initialize database connection for tests
    const dbConfig = {
      host: 'localhost',
      port: 5432,
      database: 'nodeangularfullstack',
      username: 'dbuser',
      password: 'dbpassword',
      ssl: false,
    };

    try {
      await databaseService.initialize(dbConfig);
    } catch (error) {
      console.error('Failed to initialize test database:', error);
      throw error;
    }
  });

  afterAll(async () => {
    // Clean up database connection
    await databaseService.close();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    const client = await databaseService.getPool().connect();
    try {
      // Get admin user ID for test form ownership
      const userResult = await client.query(
        "SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1"
      );
      if (userResult.rows.length === 0) {
        throw new Error('Admin user not found - ensure database is seeded');
      }
      testUserId = userResult.rows[0].id;

      // Clean up previous test data
      await client.query("DELETE FROM form_submissions WHERE data->>'customer_email' LIKE '%integration-test%'");
      await client.query("DELETE FROM product_inventory WHERE sku LIKE 'TEST-SKU-%'");
      await client.query("DELETE FROM forms WHERE title LIKE 'Integration Test:%'");

      // Create test product form with inventory config
      const formSchema = {
        fields: [
          {
            id: 'product_images',
            type: FormFieldType.IMAGE_GALLERY,
            label: 'Select Product',
            fieldName: 'product_images',
            required: true,
            order: 1,
            variantMetadata: [
              { sku: 'TEST-SKU-001', size: 'M', color: 'Red', displayName: 'Red - Medium' },
              { sku: 'TEST-SKU-002', size: 'L', color: 'Blue', displayName: 'Blue - Large' },
            ],
          },
          {
            id: 'quantity',
            type: FormFieldType.NUMBER,
            label: 'Quantity',
            fieldName: 'quantity',
            required: true,
            order: 2,
          },
          {
            id: 'customer_email',
            type: FormFieldType.EMAIL,
            label: 'Email',
            fieldName: 'customer_email',
            required: true,
            order: 3,
          },
        ],
        settings: {
          layout: { columns: 1, spacing: 'medium' },
          submission: { showSuccessMessage: true },
        },
      };

      const businessLogicConfig = {
        type: 'inventory',
        variantField: 'product_images',
        quantityField: 'quantity',
        stockTable: 'product_inventory',
      };

      const formResult = await client.query(
        `INSERT INTO forms (
          user_id, title, description, status, schema, business_logic_config, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING id`,
        [
          testUserId,
          'Integration Test: Product Order Form',
          'Test form for inventory integration',
          'published',
          JSON.stringify(formSchema),
          JSON.stringify(businessLogicConfig),
        ]
      );

      testFormId = formResult.rows[0].id;

      // Create short link for the form
      const shortLinkResult = await client.query(
        `INSERT INTO short_links (
          form_schema_id, short_code, custom_slug, original_url, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, true, NOW(), NOW())
        RETURNING short_code`,
        [
          testFormId,
          `TEST${Date.now()}`,
          null,
          `http://localhost:4201/forms/${testFormId}`,
        ]
      );

      testShortCode = shortLinkResult.rows[0].short_code;

      // Seed initial inventory
      await client.query(
        `INSERT INTO product_inventory (form_id, sku, stock_quantity, reserved_quantity, created_at, updated_at)
        VALUES
          ($1, 'TEST-SKU-001', 10, 0, NOW(), NOW()),
          ($1, 'TEST-SKU-002', 5, 0, NOW(), NOW())`,
        [testFormId]
      );
    } finally {
      client.release();
    }
  });

  describe('POST /api/public/forms/:shortCode/submit - Full Submission Flow (AC: 7, 8)', () => {
    it('should successfully submit form and decrement inventory with valid data', async () => {
      const submissionData = {
        product_images: 'TEST-SKU-001',
        quantity: 2,
        customer_email: 'integration-test@example.com',
      };

      const response = await request(app)
        .post(`/api/public/forms/${testShortCode}/submit`)
        .send(submissionData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');

      // Verify inventory was decremented
      const client = await databaseService.getPool().connect();
      try {
        const inventoryResult = await client.query(
          'SELECT stock_quantity FROM product_inventory WHERE sku = $1',
          ['TEST-SKU-001']
        );

        expect(inventoryResult.rows[0].stock_quantity).toBe(8); // 10 - 2
      } finally {
        client.release();
      }
    });

    it('should reject submission when insufficient stock (AC: 8)', async () => {
      const submissionData = {
        product_images: 'TEST-SKU-002', // Only 5 units available
        quantity: 10, // Requesting more than available
        customer_email: 'integration-test@example.com',
      };

      const response = await request(app)
        .post(`/api/public/forms/${testShortCode}/submit`)
        .send(submissionData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toContain('Only 5 units available');
      expect(response.body.error.code).toBe('OUT_OF_STOCK');

      // Verify inventory was NOT changed
      const client = await databaseService.getPool().connect();
      try {
        const inventoryResult = await client.query(
          'SELECT stock_quantity FROM product_inventory WHERE sku = $1',
          ['TEST-SKU-002']
        );

        expect(inventoryResult.rows[0].stock_quantity).toBe(5); // Unchanged
      } finally {
        client.release();
      }
    });

    it('should reject submission when SKU does not exist', async () => {
      const submissionData = {
        product_images: 'NONEXISTENT-SKU',
        quantity: 1,
        customer_email: 'integration-test@example.com',
      };

      const response = await request(app)
        .post(`/api/public/forms/${testShortCode}/submit`)
        .send(submissionData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error.message).toContain('Insufficient stock');
    });

    it('should reject submission when quantity is invalid', async () => {
      const submissionData = {
        product_images: 'TEST-SKU-001',
        quantity: 0, // Invalid quantity
        customer_email: 'integration-test@example.com',
      };

      const response = await request(app)
        .post(`/api/public/forms/${testShortCode}/submit`)
        .send(submissionData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should handle edge case: exactly zero stock remaining', async () => {
      const submissionData = {
        product_images: 'TEST-SKU-002', // 5 units available
        quantity: 5, // Exact stock amount
        customer_email: 'integration-test@example.com',
      };

      const response = await request(app)
        .post(`/api/public/forms/${testShortCode}/submit`)
        .send(submissionData)
        .expect(201);

      expect(response.body.success).toBe(true);

      // Verify stock is now zero
      const client = await databaseService.getPool().connect();
      try {
        const inventoryResult = await client.query(
          'SELECT stock_quantity FROM product_inventory WHERE sku = $1',
          ['TEST-SKU-002']
        );

        expect(inventoryResult.rows[0].stock_quantity).toBe(0);
      } finally {
        client.release();
      }

      // Next submission should fail
      const secondResponse = await request(app)
        .post(`/api/public/forms/${testShortCode}/submit`)
        .send(submissionData)
        .expect(400);

      expect(secondResponse.body.error.code).toBe('OUT_OF_STOCK');
    });
  });

  describe('GET /api/v1/inventory/:sku - Stock API (AC: 9)', () => {
    it('should return stock information for valid SKU', async () => {
      const response = await request(app)
        .get('/api/v1/inventory/TEST-SKU-001')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          sku: 'TEST-SKU-001',
          stock_quantity: 10,
          available: true,
        },
      });
    });

    it('should return 404 for non-existent SKU', async () => {
      const response = await request(app)
        .get('/api/v1/inventory/NONEXISTENT-SKU')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should show available: false when stock is zero', async () => {
      // First, deplete stock
      await request(app)
        .post(`/api/public/forms/${testShortCode}/submit`)
        .send({
          product_images: 'TEST-SKU-002',
          quantity: 5,
          customer_email: 'integration-test@example.com',
        })
        .expect(201);

      // Then check stock
      const response = await request(app)
        .get('/api/v1/inventory/TEST-SKU-002')
        .expect(200);

      expect(response.body.data).toEqual({
        sku: 'TEST-SKU-002',
        stock_quantity: 0,
        available: false,
      });
    });
  });

  describe('Concurrent Submission Handling (AC: IV3)', () => {
    it('should prevent overselling with concurrent requests', async () => {
      // Setup: SKU with limited stock (5 units)
      const submissionData = {
        product_images: 'TEST-SKU-002', // 5 units available
        quantity: 1,
        customer_email: 'integration-test@example.com',
      };

      // Submit 10 concurrent orders (each for 1 unit)
      const submissions = Array(10)
        .fill(null)
        .map(() =>
          request(app)
            .post(`/api/public/forms/${testShortCode}/submit`)
            .send(submissionData)
        );

      const results = await Promise.allSettled(submissions);

      // Count successful and failed submissions
      const successful = results.filter((r) => r.status === 'fulfilled' && r.value.status === 201);
      const failed = results.filter((r) => r.status === 'fulfilled' && r.value.status === 400);

      // Verify: Only 5 succeeded (matching available stock)
      expect(successful.length).toBe(5);
      expect(failed.length).toBe(5);

      // Verify: Final stock is exactly 0 (no overselling)
      const client = await databaseService.getPool().connect();
      try {
        const inventoryResult = await client.query(
          'SELECT stock_quantity FROM product_inventory WHERE sku = $1',
          ['TEST-SKU-002']
        );

        expect(inventoryResult.rows[0].stock_quantity).toBe(0);
      } finally {
        client.release();
      }

      // Verify: Failed requests received out-of-stock error
      const failedResponses = results
        .filter((r) => r.status === 'fulfilled' && r.value.status === 400)
        .map((r: any) => r.value.body);

      failedResponses.forEach((body) => {
        expect(body.error.code).toBe('OUT_OF_STOCK');
      });
    }, 15000); // Increased timeout for concurrent test

    it('should handle race condition with varying quantities', async () => {
      // Setup: 10 units available
      const submissions = [
        { product_images: 'TEST-SKU-001', quantity: 3, customer_email: 'test1@example.com' },
        { product_images: 'TEST-SKU-001', quantity: 5, customer_email: 'test2@example.com' },
        { product_images: 'TEST-SKU-001', quantity: 4, customer_email: 'test3@example.com' },
        { product_images: 'TEST-SKU-001', quantity: 2, customer_email: 'test4@example.com' },
      ];

      const requests = submissions.map((data) =>
        request(app).post(`/api/public/forms/${testShortCode}/submit`).send(data)
      );

      const results = await Promise.allSettled(requests);

      const successful = results.filter((r) => r.status === 'fulfilled' && r.value.status === 201);

      // Verify: At least some succeeded but didn't oversell
      expect(successful.length).toBeGreaterThan(0);
      expect(successful.length).toBeLessThan(4); // Not all can succeed (3+5+4+2 = 14 > 10)

      // Verify: Final stock is non-negative
      const client = await databaseService.getPool().connect();
      try {
        const inventoryResult = await client.query(
          'SELECT stock_quantity FROM product_inventory WHERE sku = $1',
          ['TEST-SKU-001']
        );

        expect(inventoryResult.rows[0].stock_quantity).toBeGreaterThanOrEqual(0);
        expect(inventoryResult.rows[0].stock_quantity).toBeLessThanOrEqual(10);
      } finally {
        client.release();
      }
    }, 15000);
  });

  describe('Performance Requirements (AC: IV2)', () => {
    it('should complete submission + stock update within 200ms', async () => {
      const submissionData = {
        product_images: 'TEST-SKU-001',
        quantity: 1,
        customer_email: 'integration-test@example.com',
      };

      const startTime = Date.now();

      await request(app)
        .post(`/api/public/forms/${testShortCode}/submit`)
        .send(submissionData)
        .expect(201);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Verify performance requirement (AC: IV2)
      expect(responseTime).toBeLessThan(200);
    });

    it('should complete stock API request within 50ms (AC: 9)', async () => {
      const startTime = Date.now();

      await request(app).get('/api/v1/inventory/TEST-SKU-001').expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Verify performance requirement (AC: 9)
      expect(responseTime).toBeLessThan(50);
    });
  });

  describe('Integration Verification (AC: IV1)', () => {
    it('should not affect forms without inventory business logic', async () => {
      // Create form WITHOUT business logic config
      const client = await databaseService.getPool().connect();
      let normalFormShortCode: string;

      try {
        const normalFormSchema = {
          fields: [
            {
              id: 'name',
              type: FormFieldType.TEXT,
              label: 'Name',
              fieldName: 'name',
              required: true,
              order: 1,
            },
          ],
          settings: {
            layout: { columns: 1, spacing: 'medium' },
            submission: { showSuccessMessage: true },
          },
        };

        const normalFormResult = await client.query(
          `INSERT INTO forms (
            user_id, title, description, status, schema, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          RETURNING id`,
          [
            testUserId,
            'Integration Test: Normal Form',
            'Form without business logic',
            'published',
            JSON.stringify(normalFormSchema),
          ]
        );

        const normalFormId = normalFormResult.rows[0].id;

        const shortLinkResult = await client.query(
          `INSERT INTO short_links (
            form_schema_id, short_code, custom_slug, original_url, is_active, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, true, NOW(), NOW())
          RETURNING short_code`,
          [
            normalFormId,
            `NORMAL${Date.now()}`,
            null,
            `http://localhost:4201/forms/${normalFormId}`,
          ]
        );

        normalFormShortCode = shortLinkResult.rows[0].short_code;
      } finally {
        client.release();
      }

      // Submit to normal form (should succeed without inventory check)
      const response = await request(app)
        .post(`/api/public/forms/${normalFormShortCode}/submit`)
        .send({ name: 'Test User' })
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Transaction Rollback on Failure', () => {
    it('should rollback submission if inventory update fails', async () => {
      const submissionData = {
        product_images: 'TEST-SKU-001',
        quantity: 100, // More than available (10 units)
        customer_email: 'integration-test@example.com',
      };

      await request(app)
        .post(`/api/public/forms/${testShortCode}/submit`)
        .send(submissionData)
        .expect(400);

      // Verify: No submission record was created
      const client = await databaseService.getPool().connect();
      try {
        const submissionResult = await client.query(
          "SELECT COUNT(*) FROM form_submissions WHERE data->>'customer_email' = $1",
          ['integration-test@example.com']
        );

        expect(parseInt(submissionResult.rows[0].count)).toBe(0);

        // Verify: Inventory unchanged
        const inventoryResult = await client.query(
          'SELECT stock_quantity FROM product_inventory WHERE sku = $1',
          ['TEST-SKU-001']
        );

        expect(inventoryResult.rows[0].stock_quantity).toBe(10); // Unchanged
      } finally {
        client.release();
      }
    });
  });
});
