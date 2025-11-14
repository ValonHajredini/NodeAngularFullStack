/**
 * Integration Tests for Appointment Booking Template
 * Epic: 29 - Form Template System with Business Logic
 * Story: 29.12 - Appointment Booking Template with Time Slot Management
 *
 * This test suite validates:
 * - AC6: Checks existing bookings count
 * - AC7: Rejects if count >= maxBookingsPerSlot
 * - AC8: Inserts booking with status 'confirmed'
 * - IV3: Conflict detection prevents double-booking with concurrent requests
 *
 * CRITICAL: Tests concurrent booking scenario (20 simultaneous requests)
 * to validate row-level locking prevents race conditions.
 */

import request from 'supertest';
import { Pool } from 'pg';
import app from '../../src/server';
import { getPoolForDatabase, DatabaseType } from '../../src/config/multi-database.config';

describe('Appointment Booking Integration Tests', () => {
  let pool: Pool;
  let formSchemaId: string;
  let templateId: string;
  let shortCode: string;
  let adminToken: string;

  beforeAll(async () => {
    pool = getPoolForDatabase(DatabaseType.FORMS);

    // Create admin user and get auth token
    const adminResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'User123!@#'
      });

    adminToken = adminResponse.body.data.accessToken;

    // Create appointment template
    const templateResponse = await pool.query(`
      INSERT INTO form_templates (
        name,
        category,
        description,
        template_schema,
        business_logic_config,
        is_active
      )
      VALUES (
        $1, $2, $3, $4::jsonb, $5::jsonb, $6
      )
      RETURNING id
    `, [
      'Test Appointment Booking',
      'services',
      'Test template for appointment booking integration tests',
      JSON.stringify({
        id: 'test-schema-001',
        formId: 'test-form-001',
        version: 1,
        isPublished: true,
        fields: [
          {
            id: 'appointment_date',
            type: 'DATE',
            label: 'Appointment Date',
            fieldName: 'appointment_date',
            required: true,
            order: 1
          },
          {
            id: 'time_slot',
            type: 'SELECT',
            label: 'Time Slot',
            fieldName: 'time_slot',
            required: true,
            order: 2,
            options: [
              { label: '09:00 - 10:00', value: '09:00-10:00' },
              { label: '10:00 - 11:00', value: '10:00-11:00' },
              { label: '14:00 - 15:00', value: '14:00-15:00' }
            ]
          },
          {
            id: 'customer_name',
            type: 'TEXT',
            label: 'Customer Name',
            fieldName: 'customer_name',
            required: true,
            order: 3
          },
          {
            id: 'customer_email',
            type: 'EMAIL',
            label: 'Email Address',
            fieldName: 'customer_email',
            required: true,
            order: 4
          }
        ],
        settings: {
          layout: { columns: 1, spacing: 'medium' },
          submission: { showSuccessMessage: true, allowMultipleSubmissions: true }
        }
      }),
      JSON.stringify({
        type: 'appointment',
        dateField: 'appointment_date',
        timeSlotField: 'time_slot',
        maxBookingsPerSlot: 5,
        bookingsTable: 'appointment_bookings'
      }),
      true
    ]);

    templateId = templateResponse.rows[0].id;

    // Create form schema using the template
    const schemaResponse = await pool.query(`
      INSERT INTO form_schemas (
        title,
        description,
        is_published,
        template_id,
        fields,
        settings
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)
      RETURNING id
    `, [
      'Appointment Booking Test Form',
      'Integration test form for appointment bookings',
      true,
      templateId,
      JSON.stringify([
        {
          id: 'appointment_date',
          type: 'DATE',
          label: 'Appointment Date',
          fieldName: 'appointment_date',
          required: true,
          order: 1
        },
        {
          id: 'time_slot',
          type: 'SELECT',
          label: 'Time Slot',
          fieldName: 'time_slot',
          required: true,
          order: 2
        },
        {
          id: 'customer_name',
          type: 'TEXT',
          label: 'Customer Name',
          fieldName: 'customer_name',
          required: true,
          order: 3
        },
        {
          id: 'customer_email',
          type: 'EMAIL',
          label: 'Email',
          fieldName: 'customer_email',
          required: true,
          order: 4
        }
      ]),
      JSON.stringify({
        layout: { columns: 1, spacing: 'medium' },
        submission: { showSuccessMessage: true }
      })
    ]);

    formSchemaId = schemaResponse.rows[0].id;

    // Create short link for public access
    shortCode = `apt-test-${Date.now()}`;
    await pool.query(`
      INSERT INTO short_links (short_code, form_schema_id, created_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
    `, [shortCode, formSchemaId]);
  });

  afterAll(async () => {
    // Cleanup test data
    await pool.query('DELETE FROM appointment_bookings WHERE form_id = $1', [templateId]);
    await pool.query('DELETE FROM short_links WHERE short_code = $1', [shortCode]);
    await pool.query('DELETE FROM form_schemas WHERE id = $1', [formSchemaId]);
    await pool.query('DELETE FROM form_templates WHERE id = $1', [templateId]);

    await pool.end();
  });

  describe('POST /api/public/forms/:shortCode/submit', () => {
    it('should create booking when slot is available', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // 7 days from now
      const futureDateStr = futureDate.toISOString().substring(0, 10);

      const response = await request(app)
        .post(`/api/public/forms/${shortCode}/submit`)
        .send({
          appointment_date: futureDateStr,
          time_slot: '09:00-10:00',
          customer_name: 'John Doe',
          customer_email: 'john@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should reject booking when slot is fully booked', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 8);
      const futureDateStr = futureDate.toISOString().substring(0, 10);

      const slotData = {
        appointment_date: futureDateStr,
        time_slot: '10:00-11:00',
        customer_name: 'Test User',
        customer_email: 'test@example.com'
      };

      // Book 5 times (max capacity)
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post(`/api/public/forms/${shortCode}/submit`)
          .send({ ...slotData, customer_email: `user${i}@example.com` });
      }

      // 6th booking should fail
      const response = await request(app)
        .post(`/api/public/forms/${shortCode}/submit`)
        .send(slotData);

      expect(response.status).toBe(409); // HTTP 409 Conflict
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('fully booked');
    });

    it('should reject booking for past date', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const pastDateStr = yesterday.toISOString().substring(0, 10);

      const response = await request(app)
        .post(`/api/public/forms/${shortCode}/submit`)
        .send({
          appointment_date: pastDateStr,
          time_slot: '14:00-15:00',
          customer_name: 'Jane Doe',
          customer_email: 'jane@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('past');
    });

    it('should reject booking for today (same-day booking not allowed)', async () => {
      const today = new Date();
      const todayStr = today.toISOString().substring(0, 10);

      const response = await request(app)
        .post(`/api/public/forms/${shortCode}/submit`)
        .send({
          appointment_date: todayStr,
          time_slot: '14:00-15:00',
          customer_name: 'Same Day User',
          customer_email: 'sameday@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('past');
    });
  });

  describe('Concurrent Booking Prevention (IV3 - CRITICAL TEST)', () => {
    /**
     * CRITICAL TEST: Story 29.12 Integration Verification IV3
     *
     * Tests that row-level locking (SELECT FOR UPDATE) prevents race conditions
     * when multiple users attempt to book the same time slot simultaneously.
     *
     * Scenario: 20 concurrent requests attempt to book the same slot.
     * Expected: Exactly 5 bookings succeed (maxBookingsPerSlot), 15 fail with HTTP 409.
     *
     * This validates the core risk identified in Story 29.12: "High (Concurrent booking conflicts)"
     */
    it('should prevent double-booking with 20 concurrent requests (maxBookingsPerSlot = 5)', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      const futureDateStr = futureDate.toISOString().substring(0, 10);

      const slotData = {
        appointment_date: futureDateStr,
        time_slot: '09:00-10:00',
        customer_name: 'Concurrent User',
        customer_email: 'concurrent@example.com'
      };

      // Create 20 simultaneous booking requests
      const promises = Array(20)
        .fill(null)
        .map((_, index) =>
          request(app)
            .post(`/api/public/forms/${shortCode}/submit`)
            .send({
              ...slotData,
              customer_email: `concurrent${index}@example.com`
            })
        );

      // Execute all requests concurrently
      const results = await Promise.allSettled(promises);

      // Count successful bookings (HTTP 200)
      const successful = results.filter(
        (r) => r.status === 'fulfilled' && r.value.status === 200
      );

      // Count conflict responses (HTTP 409)
      const conflicts = results.filter(
        (r) => r.status === 'fulfilled' && r.value.status === 409
      );

      // CRITICAL ASSERTION: Exactly 5 bookings should succeed (maxBookingsPerSlot)
      expect(successful.length).toBe(5);

      // Remaining 15 should fail with HTTP 409 Conflict
      expect(conflicts.length).toBe(15);

      // Verify database state matches expected bookings
      const dbCheck = await pool.query(
        `
        SELECT COUNT(*) as count
        FROM appointment_bookings
        WHERE form_id = $1
          AND date = $2
          AND time_slot = $3
          AND status = 'confirmed'
      `,
        [templateId, futureDateStr, slotData.time_slot]
      );

      expect(parseInt(dbCheck.rows[0].count, 10)).toBe(5);

      console.log(`✅ Concurrent booking test passed:
        - Total requests: 20
        - Successful bookings: ${successful.length}
        - Rejected (409 Conflict): ${conflicts.length}
        - Database confirmed bookings: ${dbCheck.rows[0].count}`);
    });

    it('should handle concurrent bookings with different maxBookingsPerSlot values', async () => {
      // Test with maxBookingsPerSlot = 1 (single slot)
      const singleSlotDate = new Date();
      singleSlotDate.setDate(singleSlotDate.getDate() + 11);
      const singleSlotDateStr = singleSlotDate.toISOString().substring(0, 10);

      // Update template config temporarily
      await pool.query(
        `
        UPDATE form_templates
        SET business_logic_config = jsonb_set(
          business_logic_config,
          '{maxBookingsPerSlot}',
          '1'::jsonb
        )
        WHERE id = $1
      `,
        [templateId]
      );

      const slotData = {
        appointment_date: singleSlotDateStr,
        time_slot: '14:00-15:00',
        customer_name: 'Single Slot User',
        customer_email: 'singleslot@example.com'
      };

      // Create 10 concurrent requests for a single-capacity slot
      const promises = Array(10)
        .fill(null)
        .map((_, index) =>
          request(app)
            .post(`/api/public/forms/${shortCode}/submit`)
            .send({
              ...slotData,
              customer_email: `singleslot${index}@example.com`
            })
        );

      const results = await Promise.allSettled(promises);

      const successful = results.filter(
        (r) => r.status === 'fulfilled' && r.value.status === 200
      );

      // ASSERTION: Exactly 1 booking should succeed
      expect(successful.length).toBe(1);

      // Restore original maxBookingsPerSlot value
      await pool.query(
        `
        UPDATE form_templates
        SET business_logic_config = jsonb_set(
          business_logic_config,
          '{maxBookingsPerSlot}',
          '5'::jsonb
        )
        WHERE id = $1
      `,
        [templateId]
      );
    });
  });

  describe('GET /api/public/forms/:shortCode/available-slots', () => {
    it('should return available slots for date range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);

      const startDateStr = startDate.toISOString().substring(0, 10);
      const endDateStr = endDate.toISOString().substring(0, 10);

      const response = await request(app)
        .get(`/api/public/forms/${shortCode}/available-slots`)
        .query({ startDate: startDateStr, endDate: endDateStr });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should require startDate and endDate query parameters', async () => {
      const response = await request(app)
        .get(`/api/public/forms/${shortCode}/available-slots`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('required');
    });

    it('should reject invalid date format', async () => {
      const response = await request(app)
        .get(`/api/public/forms/${shortCode}/available-slots`)
        .query({ startDate: '12/01/2025', endDate: '12/08/2025' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('format');
    });

    it('should reject endDate before startDate', async () => {
      const response = await request(app)
        .get(`/api/public/forms/${shortCode}/available-slots`)
        .query({ startDate: '2025-12-15', endDate: '2025-12-10' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('range');
    });
  });

  describe('Performance Validation (IV2)', () => {
    /**
     * Performance test for IV2: Booking logic executes within 150ms (P95)
     *
     * This test validates that the booking validation + conflict check
     * completes within the required 150ms threshold at P95.
     */
    it('should execute booking within 150ms (P95 performance requirement)', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);
      const futureDateStr = futureDate.toISOString().substring(0, 10);

      const latencies: number[] = [];

      // Run 100 booking requests to calculate P95 latency
      for (let i = 0; i < 100; i++) {
        const startTime = Date.now();

        await request(app)
          .post(`/api/public/forms/${shortCode}/submit`)
          .send({
            appointment_date: futureDateStr,
            time_slot: '14:00-15:00',
            customer_name: `Perf Test User ${i}`,
            customer_email: `perftest${i}@example.com`
          });

        const endTime = Date.now();
        latencies.push(endTime - startTime);
      }

      // Calculate P50, P95, P99
      latencies.sort((a, b) => a - b);
      const p50 = latencies[Math.floor(latencies.length * 0.5)];
      const p95 = latencies[Math.floor(latencies.length * 0.95)];
      const p99 = latencies[Math.floor(latencies.length * 0.99)];

      console.log(`📊 Performance Metrics (100 requests):
        - P50 (Median): ${p50}ms
        - P95: ${p95}ms
        - P99: ${p99}ms
        - Max: ${Math.max(...latencies)}ms
        - Min: ${Math.min(...latencies)}ms`);

      // ASSERTION: P95 latency should be < 150ms (IV2 requirement)
      expect(p95).toBeLessThan(150);
    });
  });
});
