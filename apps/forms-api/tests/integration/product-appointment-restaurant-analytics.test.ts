/**
 * Product, Appointment, and Restaurant Analytics Integration Tests
 *
 * Tests end-to-end analytics functionality for ecommerce, services, and data_collection templates.
 * Validates repository methods, strategies, and data flow with real database.
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.4: Product, Appointment, and Restaurant Analytics Strategies (Backend)
 */

import { analyticsRepository } from '../../src/repositories/analytics.repository';
import { ProductAnalyticsStrategy } from '../../src/services/analytics/strategies/product-analytics.strategy';
import { AppointmentAnalyticsStrategy } from '../../src/services/analytics/strategies/appointment-analytics.strategy';
import { RestaurantAnalyticsStrategy } from '../../src/services/analytics/strategies/restaurant-analytics.strategy';
import { formsPool } from '../../src/config/multi-database.config';
import { PoolClient } from 'pg';

describe('Product, Appointment, and Restaurant Analytics Integration Tests', () => {
  let client: PoolClient;
  let productFormSchemaId: string;
  let appointmentFormSchemaId: string;
  let restaurantFormSchemaId: string;
  let testFormId: string;
  let testUserId: string;

  beforeAll(async () => {
    client = await formsPool.connect();

    // Create test user first
    const userResult = await client.query(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, role, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        'test-product-analytics@example.com',
        '$2b$10$dummy.hash.for.testing',
        'Test',
        'User',
        'user',
        NOW(),
        NOW()
      )
      RETURNING id
    `);
    testUserId = userResult.rows[0].id;

    // Create test form
    const formResult = await client.query(`
      INSERT INTO forms (id, title, description, status, user_id, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        'Test Analytics Form',
        'Test form for product/appointment/restaurant analytics',
        'published',
        $1,
        NOW(),
        NOW()
      )
      RETURNING id
    `, [testUserId]);
    testFormId = formResult.rows[0].id;

    // Create test form_schemas for product, appointment, and restaurant
    const productFormResult = await client.query(`
      INSERT INTO form_schemas (id, form_id, schema_json, schema_version, is_published)
      VALUES (
        gen_random_uuid(),
        $1,
        '{"title": "Test Product Order", "fields": [{"type": "text", "label": "Product Name"}]}'::jsonb,
        1,
        true
      )
      RETURNING id
    `, [testFormId]);
    productFormSchemaId = productFormResult.rows[0].id;

    const appointmentFormResult = await client.query(`
      INSERT INTO form_schemas (id, form_id, schema_json, schema_version, is_published)
      VALUES (
        gen_random_uuid(),
        $1,
        '{"title": "Test Appointment Booking", "fields": [{"type": "date", "label": "Appointment Date"}]}'::jsonb,
        1,
        true
      )
      RETURNING id
    `, [testFormId]);
    appointmentFormSchemaId = appointmentFormResult.rows[0].id;

    const restaurantFormResult = await client.query(`
      INSERT INTO form_schemas (id, form_id, schema_json, schema_version, is_published)
      VALUES (
        gen_random_uuid(),
        $1,
        '{"title": "Test Restaurant Order", "fields": [{"type": "text", "label": "Menu Item"}]}'::jsonb,
        1,
        true
      )
      RETURNING id
    `, [testFormId]);
    restaurantFormSchemaId = restaurantFormResult.rows[0].id;

    // Seed product submissions (ecommerce category)
    // Product A: 10 units @ $50, 5 units @ $50, 8 units @ $50 = 23 units, $1,150
    // Product B: 15 units @ $30, 12 units @ $30 = 27 units, $810
    // Product C: 20 units @ $100 = 20 units, $2,000
    const productSubmissions = [
      { product_id: 'prod-a', product_name: 'Product A', quantity: 10, price: 50 },
      { product_id: 'prod-b', product_name: 'Product B', quantity: 15, price: 30 },
      { product_id: 'prod-c', product_name: 'Product C', quantity: 20, price: 100 },
      { product_id: 'prod-a', product_name: 'Product A', quantity: 5, price: 50 },
      { product_id: 'prod-b', product_name: 'Product B', quantity: 12, price: 30 },
      { product_id: 'prod-a', product_name: 'Product A', quantity: 8, price: 50 },
    ];
    for (const submission of productSubmissions) {
      await client.query(`
        INSERT INTO form_submissions (form_schema_id, values_json, submitter_ip, submitted_at)
        VALUES ($1, $2, '127.0.0.1', NOW())
      `, [productFormSchemaId, JSON.stringify(submission)]);
    }

    // Seed appointment submissions (services category)
    // Monday: 10 bookings (8 confirmed, 2 cancelled)
    // Tuesday: 5 bookings (4 confirmed, 1 cancelled)
    // Wednesday: 8 bookings (6 confirmed, 2 cancelled)
    // Thursday: 7 bookings (7 confirmed, 0 cancelled)
    const baseDate = new Date('2025-01-01'); // Wednesday
    const appointmentSubmissions = [
      // Monday bookings (10 total, 8 confirmed)
      ...Array(8).fill(null).map((_, i) => ({
        time_slot: `${9 + i}:00`,
        booking_date: new Date(baseDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'confirmed',
      })),
      ...Array(2).fill(null).map((_, i) => ({
        time_slot: `${17 + i}:00`,
        booking_date: new Date(baseDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'cancelled',
      })),
      // Tuesday bookings (5 total, 4 confirmed)
      ...Array(4).fill(null).map((_, i) => ({
        time_slot: `${10 + i}:00`,
        booking_date: new Date(baseDate.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'confirmed',
      })),
      {
        time_slot: '15:00',
        booking_date: new Date(baseDate.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'cancelled',
      },
      // Wednesday bookings (8 total, 6 confirmed)
      ...Array(6).fill(null).map((_, i) => ({
        time_slot: `${9 + i}:00`,
        booking_date: baseDate.toISOString().split('T')[0],
        status: 'confirmed',
      })),
      ...Array(2).fill(null).map((_, i) => ({
        time_slot: `${16 + i}:00`,
        booking_date: baseDate.toISOString().split('T')[0],
        status: 'cancelled',
      })),
      // Thursday bookings (7 total, 7 confirmed)
      ...Array(7).fill(null).map((_, i) => ({
        time_slot: `${9 + i}:00`,
        booking_date: new Date(baseDate.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'confirmed',
      })),
    ];
    for (const submission of appointmentSubmissions) {
      await client.query(`
        INSERT INTO form_submissions (form_schema_id, values_json, submitter_ip, submitted_at)
        VALUES ($1, $2, '127.0.0.1', NOW())
      `, [appointmentFormSchemaId, JSON.stringify(submission)]);
    }

    // Seed restaurant submissions (data_collection category)
    // Burger: 25 orders @ $12 = $300
    // Pizza: 40 orders @ $15 = $600
    // Salad: 18 orders @ $8 = $144
    // Peak hours: 12:00-13:00 (35 orders), 18:00-19:00 (25 orders), 14:00 (18 orders), 20:00 (5 orders)
    const restaurantData = [
      ...Array(15).fill(null).map(() => ({ data: { item_name: 'Burger', quantity: 1, price: 12 }, time: '2025-01-15T12:15:00' })),
      ...Array(20).fill(null).map(() => ({ data: { item_name: 'Pizza', quantity: 1, price: 15 }, time: '2025-01-15T12:30:00' })),
      ...Array(10).fill(null).map(() => ({ data: { item_name: 'Burger', quantity: 1, price: 12 }, time: '2025-01-15T18:15:00' })),
      ...Array(15).fill(null).map(() => ({ data: { item_name: 'Pizza', quantity: 1, price: 15 }, time: '2025-01-15T18:45:00' })),
      ...Array(18).fill(null).map(() => ({ data: { item_name: 'Salad', quantity: 1, price: 8 }, time: '2025-01-15T14:00:00' })),
      ...Array(5).fill(null).map(() => ({ data: { item_name: 'Pizza', quantity: 1, price: 15 }, time: '2025-01-15T20:00:00' })),
    ];
    for (const item of restaurantData) {
      await client.query(`
        INSERT INTO form_submissions (form_schema_id, values_json, submitter_ip, submitted_at)
        VALUES ($1, $2, '127.0.0.1', $3)
      `, [restaurantFormSchemaId, JSON.stringify(item.data), item.time]);
    }
  });

  afterAll(async () => {
    // Clean up test data (cascade will handle form_submissions and form_schemas)
    await client.query('DELETE FROM forms WHERE id = $1', [testFormId]);
    await client.query('DELETE FROM users WHERE id = $1', [testUserId]);

    client.release();
    await formsPool.end();
  });

  describe('AnalyticsRepository', () => {
    describe('getProductSalesData', () => {
      it('should aggregate product sales correctly', async () => {
        const result = await analyticsRepository.getProductSalesData(
          productFormSchemaId,
          null
        );

        // Total revenue: $500+$450+$2000+$250+$360+$400 = $3,960
        expect(result.totalRevenue).toBe(3960);

        // Total items sold: 10+15+20+5+12+8 = 70
        expect(result.totalItemsSold).toBe(70);

        // Product breakdown should contain entries for products
        expect(result.productBreakdown).toBeDefined();
        expect(result.productBreakdown.length).toBeGreaterThan(0);
      });

      it('should return zero values for empty form', async () => {
        // Create empty product form
        const emptyFormResult = await client.query(`
          INSERT INTO form_schemas (id, form_id, schema_json, schema_version, is_published)
          VALUES (
            gen_random_uuid(),
            $1,
            '{"title": "Empty Product Form"}'::jsonb,
            1,
            true
          )
          RETURNING id
        `, [testFormId]);
        const emptyFormId = emptyFormResult.rows[0].id;

        const result = await analyticsRepository.getProductSalesData(emptyFormId, null);

        expect(result.totalRevenue).toBe(0);
        expect(result.totalItemsSold).toBe(0);
        expect(result.productBreakdown).toEqual([]);

        // Cleanup
        await client.query('DELETE FROM form_schemas WHERE id = $1', [emptyFormId]);
      });
    });

    describe('getAppointmentTimeSlots', () => {
      it('should aggregate appointment bookings by time slot', async () => {
        const result = await analyticsRepository.getAppointmentTimeSlots(
          appointmentFormSchemaId,
          null
        );

        // Result should be an array of time slot aggregations
        expect(Array.isArray(result)).toBe(true);

        // Each entry should have timeSlot, dayOfWeek, and bookings
        if (result.length > 0) {
          expect(result[0]).toHaveProperty('timeSlot');
          expect(result[0]).toHaveProperty('dayOfWeek');
          expect(result[0]).toHaveProperty('bookings');
        }
      });

      it('should return empty array for form with no bookings', async () => {
        // Create empty appointment form
        const emptyFormResult = await client.query(`
          INSERT INTO form_schemas (id, form_id, schema_json, schema_version, is_published)
          VALUES (
            gen_random_uuid(),
            $1,
            '{"title": "Empty Appointment Form"}'::jsonb,
            1,
            true
          )
          RETURNING id
        `, [testFormId]);
        const emptyFormId = emptyFormResult.rows[0].id;

        const result = await analyticsRepository.getAppointmentTimeSlots(emptyFormId, null);

        expect(result).toEqual([]);

        // Cleanup
        await client.query('DELETE FROM form_schemas WHERE id = $1', [emptyFormId]);
      });
    });

    describe('getRestaurantItemPopularity', () => {
      it('should aggregate restaurant orders by item', async () => {
        const result = await analyticsRepository.getRestaurantItemPopularity(
          restaurantFormSchemaId,
          null
        );

        // Total revenue: $300 (Burger) + $600 (Pizza) + $144 (Salad) = $1,044
        expect(result.totalRevenue).toBe(1044);

        // Total items ordered: 25+40+18 = 83
        expect(result.totalItemsOrdered).toBe(83);

        // Item breakdown should contain entries
        expect(result.itemBreakdown).toBeDefined();
        expect(result.itemBreakdown.length).toBeGreaterThan(0);
      });

      it('should return zero values for empty form', async () => {
        // Create empty restaurant form
        const emptyFormResult = await client.query(`
          INSERT INTO form_schemas (id, form_id, schema_json, schema_version, is_published)
          VALUES (
            gen_random_uuid(),
            $1,
            '{"title": "Empty Restaurant Form"}'::jsonb,
            1,
            true
          )
          RETURNING id
        `, [testFormId]);
        const emptyFormId = emptyFormResult.rows[0].id;

        const result = await analyticsRepository.getRestaurantItemPopularity(emptyFormId, null);

        expect(result.totalRevenue).toBe(0);
        expect(result.totalItemsOrdered).toBe(0);
        expect(result.itemBreakdown).toEqual([]);

        // Cleanup
        await client.query('DELETE FROM form_schemas WHERE id = $1', [emptyFormId]);
      });
    });

    describe('getAllSubmissionValues', () => {
      it('should return all submission values for appointment analysis', async () => {
        const result = await analyticsRepository.getAllSubmissionValues(
          appointmentFormSchemaId,
          null
        );

        // Should have 30 submissions (10+5+8+7)
        expect(result).toHaveLength(30);
        expect(result[0]).toHaveProperty('booking_date'); // Field name from test data
        expect(result[0]).toHaveProperty('time_slot');
        expect(result[0]).toHaveProperty('status');
      });

      it('should return all submission values for restaurant analysis', async () => {
        const result = await analyticsRepository.getAllSubmissionValues(
          restaurantFormSchemaId,
          null
        );

        // Should have 83 submissions (25+40+18 items)
        expect(result).toHaveLength(83);
        expect(result[0]).toHaveProperty('item_name');
        expect(result[0]).toHaveProperty('quantity');
        expect(result[0]).toHaveProperty('price');
      });
    });
  });

  describe('ProductAnalyticsStrategy', () => {
    let strategy: ProductAnalyticsStrategy;

    beforeAll(() => {
      strategy = new ProductAnalyticsStrategy(analyticsRepository);
    });

    it('should build complete product metrics', async () => {
      const metrics = await strategy.buildMetrics(productFormSchemaId, null);

      expect(metrics.category).toBe('ecommerce');
      expect(metrics.totalSubmissions).toBe(6); // 6 orders
      expect(metrics.totalRevenue).toBe(3960); // $500+$450+$2000+$250+$360+$400
      expect(metrics.averageOrderValue).toBe(660); // $3960 / 6
      expect(metrics.totalItemsSold).toBe(70); // 10+15+20+5+12+8

      // Top products array
      expect(metrics.topProducts).toBeDefined();
      expect(Array.isArray(metrics.topProducts)).toBe(true);

      // Stock-related metrics
      expect(metrics.lowStockAlerts).toBeDefined();
      expect(metrics.outOfStockCount).toBeDefined();
      expect(metrics.inventoryValue).toBeDefined();

      expect(metrics.firstSubmissionAt).toBeDefined();
      expect(metrics.lastSubmissionAt).toBeDefined();
    });

    it('should handle zero submissions gracefully', async () => {
      // Create empty product form
      const emptyFormResult = await client.query(`
        INSERT INTO form_schemas (id, form_id, schema_json, schema_version, is_published)
        VALUES (
          gen_random_uuid(),
          $1,
          '{"title": "Empty Product Form"}'::jsonb,
          1,
          true
        )
        RETURNING id
      `, [testFormId]);
      const emptyFormId = emptyFormResult.rows[0].id;

      const metrics = await strategy.buildMetrics(emptyFormId, null);

      expect(metrics.category).toBe('ecommerce');
      expect(metrics.totalSubmissions).toBe(0);
      expect(metrics.totalRevenue).toBe(0);
      expect(metrics.averageOrderValue).toBe(0);
      expect(metrics.totalItemsSold).toBe(0);
      expect(metrics.topProducts).toEqual([]);
      expect(metrics.lowStockAlerts).toBe(0);
      expect(metrics.outOfStockCount).toBe(0);
      expect(metrics.inventoryValue).toBe(0);

      // Cleanup
      await client.query('DELETE FROM form_schemas WHERE id = $1', [emptyFormId]);
    });
  });

  describe('AppointmentAnalyticsStrategy', () => {
    let strategy: AppointmentAnalyticsStrategy;

    beforeAll(() => {
      strategy = new AppointmentAnalyticsStrategy(analyticsRepository);
    });

    it('should build complete appointment metrics', async () => {
      const metrics = await strategy.buildMetrics(appointmentFormSchemaId, null);

      expect(metrics.category).toBe('services');
      expect(metrics.totalSubmissions).toBe(30); // 10+5+8+7 bookings

      // Booking metrics
      expect(metrics.totalBookings).toBeDefined();
      expect(metrics.cancelledBookings).toBeDefined();
      expect(metrics.cancellationRate).toBeDefined();
      expect(metrics.averageBookingsPerDay).toBeDefined();

      // Popular time slots
      expect(metrics.popularTimeSlots).toBeDefined();
      expect(Array.isArray(metrics.popularTimeSlots)).toBe(true);

      // Capacity utilization
      expect(metrics.capacityUtilization).toBeDefined();
      expect(typeof metrics.capacityUtilization).toBe('number');

      // Peak booking day (optional)
      expect(metrics.peakBookingDay).toBeDefined();

      expect(metrics.firstSubmissionAt).toBeDefined();
      expect(metrics.lastSubmissionAt).toBeDefined();
    });

    it('should handle zero submissions gracefully', async () => {
      // Create empty appointment form
      const emptyFormResult = await client.query(`
        INSERT INTO form_schemas (id, form_id, schema_json, schema_version, is_published)
        VALUES (
          gen_random_uuid(),
          $1,
          '{"title": "Empty Appointment Form"}'::jsonb,
          1,
          true
        )
        RETURNING id
      `, [testFormId]);
      const emptyFormId = emptyFormResult.rows[0].id;

      const metrics = await strategy.buildMetrics(emptyFormId, null);

      expect(metrics.category).toBe('services');
      expect(metrics.totalSubmissions).toBe(0);
      expect(metrics.totalBookings).toBe(0);
      expect(metrics.cancelledBookings).toBe(0);
      expect(metrics.cancellationRate).toBe(0);
      expect(metrics.averageBookingsPerDay).toBe(0);
      expect(metrics.popularTimeSlots).toEqual([]);
      expect(metrics.capacityUtilization).toBe(0);

      // Cleanup
      await client.query('DELETE FROM form_schemas WHERE id = $1', [emptyFormId]);
    });
  });

  describe('RestaurantAnalyticsStrategy', () => {
    let strategy: RestaurantAnalyticsStrategy;

    beforeAll(() => {
      strategy = new RestaurantAnalyticsStrategy(analyticsRepository);
    });

    it('should build complete restaurant metrics', async () => {
      const metrics = await strategy.buildMetrics(restaurantFormSchemaId, null);

      expect(metrics.category).toBe('data_collection');
      expect(metrics.totalSubmissions).toBe(83); // Total orders

      // Revenue metrics
      expect(metrics.totalRevenue).toBe(1044); // $300 + $600 + $144
      expect(metrics.averageOrderValue).toBeDefined();
      expect(typeof metrics.averageOrderValue).toBe('number');

      // Total items ordered
      expect(metrics.totalItemsOrdered).toBe(83);

      // Popular items array
      expect(metrics.popularItems).toBeDefined();
      expect(Array.isArray(metrics.popularItems)).toBe(true);

      // Average order size
      expect(metrics.averageOrderSize).toBeGreaterThan(0);

      // Peak order time (optional)
      if (metrics.peakOrderTime) {
        expect(metrics.peakOrderTime).toMatch(/^\d{2}:00-\d{2}:00$/);
      }

      expect(metrics.firstSubmissionAt).toBeDefined();
      expect(metrics.lastSubmissionAt).toBeDefined();
    });

    it('should handle zero submissions gracefully', async () => {
      // Create empty restaurant form
      const emptyFormResult = await client.query(`
        INSERT INTO form_schemas (id, form_id, schema_json, schema_version, is_published)
        VALUES (
          gen_random_uuid(),
          $1,
          '{"title": "Empty Restaurant Form"}'::jsonb,
          1,
          true
        )
        RETURNING id
      `, [testFormId]);
      const emptyFormId = emptyFormResult.rows[0].id;

      const metrics = await strategy.buildMetrics(emptyFormId, null);

      expect(metrics.category).toBe('data_collection');
      expect(metrics.totalSubmissions).toBe(0);
      expect(metrics.totalRevenue).toBe(0);
      expect(metrics.averageOrderValue).toBe(0);
      expect(metrics.totalItemsOrdered).toBe(0);
      expect(metrics.popularItems).toEqual([]);
      expect(metrics.averageOrderSize).toBe(0);

      // Cleanup
      await client.query('DELETE FROM form_schemas WHERE id = $1', [emptyFormId]);
    });
  });

  describe('Performance', () => {
    it('should execute product analytics in <300ms', async () => {
      const strategy = new ProductAnalyticsStrategy(analyticsRepository);

      const startTime = Date.now();
      await strategy.buildMetrics(productFormSchemaId, null);
      const endTime = Date.now();

      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(300);
    }, 10000);

    it('should execute appointment analytics in <300ms', async () => {
      const strategy = new AppointmentAnalyticsStrategy(analyticsRepository);

      const startTime = Date.now();
      await strategy.buildMetrics(appointmentFormSchemaId, null);
      const endTime = Date.now();

      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(300);
    }, 10000);

    it('should execute restaurant analytics in <300ms', async () => {
      const strategy = new RestaurantAnalyticsStrategy(analyticsRepository);

      const startTime = Date.now();
      await strategy.buildMetrics(restaurantFormSchemaId, null);
      const endTime = Date.now();

      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(300);
    }, 10000);
  });
});
