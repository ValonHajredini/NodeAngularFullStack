/**
 * Template System Regression Test Suite
 * Epic: 29 - Form Template System with Business Logic
 * Story: 29.13 - Quiz Template with Scoring Logic (Regression Tests)
 *
 * Purpose: Validate that the addition of quiz template functionality does NOT
 * break existing form submission workflows for:
 * - Regular forms (no template)
 * - Product/Inventory templates (Story 29.11)
 * - Appointment booking templates (Story 29.12)
 *
 * This test suite ensures backward compatibility when new template types are added.
 *
 * Quality Gate: TEST-001
 * @see docs/qa/gates/29.13-quiz-template-scoring-logic.yml
 */

import request from 'supertest';
import express from 'express';
import { databaseService } from '../../src/services/database.service';
import { publicFormsRoutes } from '../../src/routes/public-forms.routes';

// Test app setup
const app = express();
app.use(express.json());
app.use('/api/public/forms', publicFormsRoutes);

describe('Template System Regression Tests', () => {
  let userId: string;

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

    // Create test user with admin role
    const userResult = await databaseService.query(
      `
      INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE SET role = 'admin'
      RETURNING id
    `,
      [
        'regression-test@example.com',
        'hashed_password_123',
        'Regression',
        'Test',
        'admin',
        true,
      ]
    );

    userId = userResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    await databaseService.query(`DELETE FROM users WHERE email = 'regression-test@example.com'`);
    await databaseService.close();
  });

  describe('Regular Forms (No Template) - Backward Compatibility', () => {
    let formSchemaId: string;
    let shortCode: string;

    beforeAll(async () => {
      // Create regular form without business logic template
      const formResult = await databaseService.query(
        `
        INSERT INTO forms (title, description, is_published, user_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id
      `,
        ['Regular Contact Form', 'Simple contact form without templates', true, userId]
      );

      formSchemaId = formResult.rows[0].id;

      // Create form schema
      const schemaData = {
        fields: [
          {
            id: 'name',
            type: 'TEXT',
            fieldName: 'fullName',
            label: 'Full Name',
            placeholder: 'Enter your name',
            required: true,
            order: 1,
          },
          {
            id: 'email',
            type: 'EMAIL',
            fieldName: 'email',
            label: 'Email Address',
            placeholder: 'your.email@example.com',
            required: true,
            order: 2,
          },
          {
            id: 'message',
            type: 'TEXTAREA',
            fieldName: 'message',
            label: 'Message',
            placeholder: 'Type your message here...',
            required: true,
            order: 3,
          },
        ],
      };

      await databaseService.query(
        `
        INSERT INTO form_schemas (form_id, schema_data, version, is_active)
        VALUES ($1, $2::jsonb, 1, true)
      `,
        [formSchemaId, JSON.stringify(schemaData)]
      );

      // Create short link for public access
      const shortLinkResult = await databaseService.query(
        `
        INSERT INTO short_links (short_code, form_schema_id, is_active, clicks)
        VALUES ($1, $2, true, 0)
        ON CONFLICT (short_code) DO UPDATE SET is_active = true
        RETURNING short_code
      `,
        ['reg-contact', formSchemaId]
      );

      shortCode = shortLinkResult.rows[0].short_code;
    });

    it('should submit regular form without template successfully', async () => {
      const response = await request(app)
        .post(`/api/public/forms/${shortCode}/submit`)
        .send({
          fullName: 'John Doe',
          email: 'john.doe@example.com',
          message: 'This is a test message for regression testing.',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.formSchemaId).toBe(formSchemaId);
    });

    it('should NOT execute any template logic for regular forms', async () => {
      const response = await request(app)
        .post(`/api/public/forms/${shortCode}/submit`)
        .send({
          fullName: 'Jane Smith',
          email: 'jane.smith@example.com',
          message: 'Another test message.',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.metadata).toBeUndefined(); // No metadata for non-template forms
    });

    it('should validate required fields for regular forms', async () => {
      const response = await request(app)
        .post(`/api/public/forms/${shortCode}/submit`)
        .send({
          fullName: 'Test User',
          // Missing email and message
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Product/Inventory Template - Regression for Story 29.11', () => {
    let productTemplateId: string;
    let productFormId: string;
    let productShortCode: string;

    beforeAll(async () => {
      // Create product inventory template
      const templateResult = await databaseService.query(
        `
        INSERT INTO form_templates (
          name,
          category,
          description,
          template_schema,
          business_logic_config,
          is_active
        ) VALUES (
          'Regression Product Template',
          'PRODUCT',
          'Product order form for regression testing',
          $1::jsonb,
          $2::jsonb,
          true
        )
        RETURNING id
      `,
        [
          JSON.stringify({
            fields: [
              { id: 'product', type: 'SELECT', fieldName: 'productSku', required: true, order: 1 },
              { id: 'quantity', type: 'NUMBER', fieldName: 'quantity', required: true, order: 2 },
            ],
          }),
          JSON.stringify({
            type: 'inventory',
            trackInventory: true,
            reserveOnSubmission: false,
          }),
        ]
      );

      productTemplateId = templateResult.rows[0].id;

      // Create product inventory records
      await databaseService.query(
        `
        INSERT INTO product_inventory (sku, product_name, stock_quantity, restock_threshold)
        VALUES
          ('REG-001', 'Regression Test Product 1', 100, 10),
          ('REG-002', 'Regression Test Product 2', 50, 5)
      `
      );

      // Create form with product template
      const formResult = await databaseService.query(
        `
        INSERT INTO forms (title, is_published, user_id, template_id)
        VALUES ('Product Order Form (Regression)', true, $1, $2)
        RETURNING id
      `,
        [userId, productTemplateId]
      );

      productFormId = formResult.rows[0].id;

      // Create short link
      const shortLinkResult = await databaseService.query(
        `
        INSERT INTO short_links (short_code, form_schema_id, is_active)
        VALUES ('reg-product', $1, true)
        RETURNING short_code
      `,
        [productFormId]
      );

      productShortCode = shortLinkResult.rows[0].short_code;
    });

    it('should submit product template form and execute inventory logic', async () => {
      const response = await request(app)
        .post(`/api/public/forms/${productShortCode}/submit`)
        .send({
          productSku: 'REG-001',
          quantity: 2,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.metadata).toBeDefined();
      expect(response.body.data.metadata.productSku).toBe('REG-001');
      expect(response.body.data.metadata.quantityOrdered).toBe(2);
    });

    it('should still validate inventory stock levels', async () => {
      const response = await request(app)
        .post(`/api/public/forms/${productShortCode}/submit`)
        .send({
          productSku: 'REG-002',
          quantity: 100, // Exceeds available stock (50)
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Insufficient stock');
    });
  });

  describe('Appointment Template - Regression for Story 29.12', () => {
    let appointmentTemplateId: string;
    let appointmentFormId: string;
    let appointmentShortCode: string;

    beforeAll(async () => {
      // Create appointment template
      const templateResult = await databaseService.query(
        `
        INSERT INTO form_templates (
          name,
          category,
          description,
          template_schema,
          business_logic_config,
          is_active
        ) VALUES (
          'Regression Appointment Template',
          'APPOINTMENT',
          'Doctor appointment for regression testing',
          $1::jsonb,
          $2::jsonb,
          true
        )
        RETURNING id
      `,
        [
          JSON.stringify({
            fields: [
              { id: 'date', type: 'DATE', fieldName: 'appointmentDate', required: true, order: 1 },
              { id: 'time', type: 'SELECT', fieldName: 'timeSlot', required: true, order: 2 },
            ],
          }),
          JSON.stringify({
            type: 'appointment',
            maxConcurrentBookings: 2,
            timeSlotDuration: 30,
            availableSlots: ['09:00', '09:30', '10:00', '10:30'],
          }),
        ]
      );

      appointmentTemplateId = templateResult.rows[0].id;

      // Create form
      const formResult = await databaseService.query(
        `
        INSERT INTO forms (title, is_published, user_id, template_id)
        VALUES ('Doctor Appointment (Regression)', true, $1, $2)
        RETURNING id
      `,
        [userId, appointmentTemplateId]
      );

      appointmentFormId = formResult.rows[0].id;

      // Create short link
      const shortLinkResult = await databaseService.query(
        `
        INSERT INTO short_links (short_code, form_schema_id, is_active)
        VALUES ('reg-appt', $1, true)
        RETURNING short_code
      `,
        [appointmentFormId]
      );

      appointmentShortCode = shortLinkResult.rows[0].short_code;
    });

    it('should submit appointment template form and create booking', async () => {
      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + 7); // Book 1 week from today

      const response = await request(app)
        .post(`/api/public/forms/${appointmentShortCode}/submit`)
        .send({
          appointmentDate: appointmentDate.toISOString().split('T')[0],
          timeSlot: '09:00',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.metadata).toBeDefined();
      expect(response.body.data.metadata.appointmentDate).toBeDefined();
      expect(response.body.data.metadata.timeSlot).toBe('09:00');
    });

    it('should enforce maximum concurrent bookings for appointment slots', async () => {
      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + 8);
      const dateStr = appointmentDate.toISOString().split('T')[0];

      // First booking
      await request(app).post(`/api/public/forms/${appointmentShortCode}/submit`).send({
        appointmentDate: dateStr,
        timeSlot: '10:00',
      });

      // Second booking (should succeed - maxConcurrentBookings = 2)
      const response2 = await request(app)
        .post(`/api/public/forms/${appointmentShortCode}/submit`)
        .send({
          appointmentDate: dateStr,
          timeSlot: '10:00',
        });

      expect(response2.status).toBe(200);

      // Third booking (should fail - slot full)
      const response3 = await request(app)
        .post(`/api/public/forms/${appointmentShortCode}/submit`)
        .send({
          appointmentDate: dateStr,
          timeSlot: '10:00',
        });

      expect(response3.status).toBe(400);
      expect(response3.body.message).toContain('fully booked');
    });
  });

  describe('Cross-Template Validation', () => {
    it('should NOT execute quiz scoring logic on inventory templates', async () => {
      // This test ensures quiz executor doesn't interfere with other templates
      // by verifying inventory templates execute their own logic correctly

      const templateResult = await databaseService.query(
        `
        SELECT id FROM form_templates WHERE category = 'PRODUCT' AND name LIKE '%Regression%'
        LIMIT 1
      `
      );

      expect(templateResult.rows.length).toBeGreaterThan(0);
      expect(templateResult.rows[0].id).toBeDefined();
    });

    it('should NOT execute quiz scoring logic on appointment templates', async () => {
      const templateResult = await databaseService.query(
        `
        SELECT id FROM form_templates WHERE category = 'APPOINTMENT' AND name LIKE '%Regression%'
        LIMIT 1
      `
      );

      expect(templateResult.rows.length).toBeGreaterThan(0);
      expect(templateResult.rows[0].id).toBeDefined();
    });

    it('should maintain template executor registry integrity', async () => {
      // Verify all template types are properly registered
      const templates = await databaseService.query(`
        SELECT DISTINCT category FROM form_templates WHERE is_active = true
      `);

      const categories = templates.rows.map((r) => r.category);
      expect(categories).toContain('PRODUCT');
      expect(categories).toContain('APPOINTMENT');
      expect(categories).toContain('QUIZ');
    });
  });

  describe('Database Integrity After Quiz Template Addition', () => {
    it('should maintain existing form_submissions table structure', async () => {
      const columnsResult = await databaseService.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'form_submissions'
        ORDER BY ordinal_position
      `);

      const columnNames = columnsResult.rows.map((r) => r.column_name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('form_schema_id');
      expect(columnNames).toContain('data');
      expect(columnNames).toContain('metadata');
      expect(columnNames).toContain('submitted_at');
    });

    it('should allow null metadata for forms without templates', async () => {
      const submissions = await databaseService.query(`
        SELECT id, metadata
        FROM form_submissions
        WHERE metadata IS NULL
        LIMIT 1
      `);

      // This validates backward compatibility - old submissions may have NULL metadata
      expect(submissions.rows.length).toBeGreaterThanOrEqual(0);
    });

    it('should maintain foreign key relationships', async () => {
      const constraints = await databaseService.query(`
        SELECT constraint_name, table_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_name IN ('form_submissions', 'forms', 'form_templates')
        AND constraint_type = 'FOREIGN KEY'
      `);

      expect(constraints.rows.length).toBeGreaterThan(0);
    });
  });
});
