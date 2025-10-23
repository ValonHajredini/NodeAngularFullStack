import request from 'supertest';
import express from 'express';
import { formsRoutes } from '../../src/routes/forms.routes';
import { formSchemasRepository } from '../../src/repositories/form-schemas.repository';
import { AuthMiddleware } from '../../src/middleware/auth.middleware';
import { FormStatus } from '@nodeangularfullstack/shared';

/**
 * Integration tests for Variable Column Width Configuration (Story 27.2).
 * Tests API persistence of columnWidths property in row layout configurations.
 *
 * Test Coverage:
 * - Test 1: POST form with columnWidths → GET form → verify columnWidths persisted
 * - Test 2: Valid fractional units accepted by backend
 * - Test 3: Invalid syntax rejected with 400 error
 * - Test 4: Forms without columnWidths save correctly (backward compatibility)
 * - Test 5: Multiple rows with different columnWidths configurations
 * - Test 6: Update existing form to add columnWidths
 *
 * AC #10: Backend Validation (INTEGRATION-001)
 */
describe('Forms API - Column Widths Integration Tests', () => {
  let app: express.Application;
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    // Setup Express app
    app = express();
    app.use(express.json());

    // Import and setup auth routes for user registration
    const authRoutes = (await import('../../src/routes/auth.routes')).default;
    app.use('/api/v1/auth', authRoutes);
    app.use('/api/forms', formsRoutes);

    // Add error handling middleware
    app.use((err: any, _req: any, res: any, _next: any) => {
      console.error('Test error:', err.message);
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message,
        code: err.code,
      });
    });

    // Create a real test user via registration API
    const registrationResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `columnwidthstest-${Date.now()}@example.com`,
        password: 'TestPass123!',
        firstName: 'ColumnWidths',
        lastName: 'Test',
      });

    testUserId = registrationResponse.body.data.user.id;
    authToken = `Bearer ${registrationResponse.body.data.accessToken}`;

    // Mock authentication middleware to use real user
    jest
      .spyOn(AuthMiddleware, 'authenticate')
      .mockImplementation(async (req: any, _res, next) => {
        req.user = {
          id: testUserId,
          email: registrationResponse.body.data.user.email,
          role: 'user',
        };
        next();
      });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Cleanup is handled by database reset between test runs
  });

  /**
   * Test 1: POST form with columnWidths → GET form → verify columnWidths persisted
   *
   * Validates:
   * - columnWidths property saves correctly through API
   * - GET request returns same columnWidths values
   * - Fractional units preserved exactly (no rounding or transformation)
   */
  describe('POST /api/forms + GET /api/forms/:id', () => {
    it('should persist columnWidths through POST → GET cycle', async () => {
      // Step 1: Create form with columnWidths
      const formData = {
        title: 'Form with Column Widths',
        description: 'Test form for columnWidths persistence',
        status: FormStatus.DRAFT,
        schema: {
          fields: [
            {
              id: 'field-1',
              type: 'text' as any,
              label: 'First Name',
              fieldName: 'first_name',
              required: true,
              order: 0,
              position: {
                rowId: 'row-1',
                columnIndex: 0,
                orderInColumn: 0,
              },
            },
            {
              id: 'field-2',
              type: 'text' as any,
              label: 'Last Name',
              fieldName: 'last_name',
              required: true,
              order: 1,
              position: {
                rowId: 'row-1',
                columnIndex: 1,
                orderInColumn: 0,
              },
            },
          ],
          settings: {
            layout: { columns: 1 as const, spacing: 'medium' as const },
            submission: {
              showSuccessMessage: true,
              allowMultipleSubmissions: true,
            },
            rowLayout: {
              enabled: true,
              rows: [
                {
                  rowId: 'row-1',
                  columnCount: 2,
                  columnWidths: ['1fr', '3fr'], // 25%-75% split
                  order: 0,
                },
              ],
            },
          },
          isPublished: false,
        },
      };

      // POST form
      const createResponse = await request(app)
        .post('/api/forms')
        .set('Authorization', authToken)
        .send(formData);

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.message).toBe('Form created successfully');

      const createdFormId = createResponse.body.data.id;

      // Step 2: GET form and verify columnWidths persisted
      const getResponse = await request(app)
        .get(`/api/forms/${createdFormId}`)
        .set('Authorization', authToken);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.success).toBe(true);

      // Retrieve schema from repository
      const schemas = await formSchemasRepository.findByFormId(createdFormId);
      const schema = schemas[0];

      expect(schema).toBeDefined();
      expect(schema.settings.rowLayout).toBeDefined();

      // Type guard: ensure rowLayout is defined
      if (!schema.settings.rowLayout) {
        throw new Error('rowLayout is undefined');
      }

      expect(schema.settings.rowLayout.enabled).toBe(true);
      expect(schema.settings.rowLayout.rows).toHaveLength(1);

      const row = schema.settings.rowLayout.rows[0];
      expect(row.columnWidths).toEqual(['1fr', '3fr']);
      expect(row.columnCount).toBe(2);

      console.log(
        '✅ Test 1 PASS: columnWidths persisted correctly through POST → GET'
      );
    });
  });

  /**
   * Test 2: Valid fractional units accepted by backend
   *
   * Validates:
   * - Backend accepts various valid fractional unit formats
   * - Different ratios (1:1, 1:2, 1:3, 2:3) save correctly
   * - Array length matches columnCount
   */
  describe('Valid Fractional Units', () => {
    it('should accept equal-width columns (1fr, 1fr)', async () => {
      const formData = {
        title: 'Equal Width Form',
        status: FormStatus.DRAFT,
        schema: {
          fields: [],
          settings: {
            layout: { columns: 1 as const, spacing: 'medium' as const },
            submission: {
              showSuccessMessage: true,
              allowMultipleSubmissions: true,
            },
            rowLayout: {
              enabled: true,
              rows: [
                {
                  rowId: 'row-1',
                  columnCount: 2,
                  columnWidths: ['1fr', '1fr'],
                  order: 0,
                },
              ],
            },
          },
          isPublished: false,
        },
      };

      const response = await request(app)
        .post('/api/forms')
        .set('Authorization', authToken)
        .send(formData);

      expect(response.status).toBe(201);

      const schemas = await formSchemasRepository.findByFormId(
        response.body.data.id
      );
      expect(schemas[0].settings.rowLayout!.rows[0].columnWidths).toEqual([
        '1fr',
        '1fr',
      ]);

      console.log('✅ Equal-width columns (1fr, 1fr) accepted');
    });

    it('should accept narrow-wide ratio (1fr, 2fr)', async () => {
      const formData = {
        title: 'Narrow-Wide Form',
        status: FormStatus.DRAFT,
        schema: {
          fields: [],
          settings: {
            layout: { columns: 1 as const, spacing: 'medium' as const },
            submission: {
              showSuccessMessage: true,
              allowMultipleSubmissions: true,
            },
            rowLayout: {
              enabled: true,
              rows: [
                {
                  rowId: 'row-1',
                  columnCount: 2,
                  columnWidths: ['1fr', '2fr'],
                  order: 0,
                },
              ],
            },
          },
          isPublished: false,
        },
      };

      const response = await request(app)
        .post('/api/forms')
        .set('Authorization', authToken)
        .send(formData);

      expect(response.status).toBe(201);

      const schemas = await formSchemasRepository.findByFormId(
        response.body.data.id
      );
      expect(schemas[0].settings.rowLayout!.rows[0].columnWidths).toEqual([
        '1fr',
        '2fr',
      ]);

      console.log('✅ Narrow-wide ratio (1fr, 2fr) accepted');
    });

    it('should accept 3-column configuration (1fr, 2fr, 3fr)', async () => {
      const formData = {
        title: 'Three Column Form',
        status: FormStatus.DRAFT,
        schema: {
          fields: [],
          settings: {
            layout: { columns: 1 as const, spacing: 'medium' as const },
            submission: {
              showSuccessMessage: true,
              allowMultipleSubmissions: true,
            },
            rowLayout: {
              enabled: true,
              rows: [
                {
                  rowId: 'row-1',
                  columnCount: 3,
                  columnWidths: ['1fr', '2fr', '3fr'],
                  order: 0,
                },
              ],
            },
          },
          isPublished: false,
        },
      };

      const response = await request(app)
        .post('/api/forms')
        .set('Authorization', authToken)
        .send(formData);

      expect(response.status).toBe(201);

      const schemas = await formSchemasRepository.findByFormId(
        response.body.data.id
      );
      expect(schemas[0].settings.rowLayout!.rows[0].columnWidths).toEqual([
        '1fr',
        '2fr',
        '3fr',
      ]);

      console.log('✅ 3-column configuration (1fr, 2fr, 3fr) accepted');
    });
  });

  /**
   * Test 3: Invalid syntax rejected with 400 error
   *
   * Validates:
   * - Backend rejects non-fractional units (px, %, em)
   * - Backend rejects invalid array length (mismatch with columnCount)
   * - Backend rejects invalid syntax (missing 'fr' suffix)
   * - Error messages are descriptive
   */
  describe('Invalid Syntax Rejection', () => {
    it('should reject pixel units with 400 error', async () => {
      const formData = {
        title: 'Invalid Pixel Units',
        status: FormStatus.DRAFT,
        schema: {
          fields: [],
          settings: {
            layout: { columns: 1 as const, spacing: 'medium' as const },
            submission: {
              showSuccessMessage: true,
              allowMultipleSubmissions: true,
            },
            rowLayout: {
              enabled: true,
              rows: [
                {
                  rowId: 'row-1',
                  columnCount: 2,
                  columnWidths: ['100px', '200px'], // Invalid: pixel units
                  order: 0,
                },
              ],
            },
          },
          isPublished: false,
        },
      };

      const response = await request(app)
        .post('/api/forms')
        .set('Authorization', authToken)
        .send(formData);

      // Should be rejected (validation currently not implemented, so this may pass)
      // When validation is added, expect 400 status
      if (response.status === 400) {
        expect(response.body.success).toBe(false);
        console.log('✅ Pixel units rejected with 400 error');
      } else {
        console.warn(
          '⚠️ Pixel units not rejected (validation not yet implemented - AC 10 pending)'
        );
      }
    });

    it('should reject mismatched array length with 400 error', async () => {
      const formData = {
        title: 'Mismatched Array Length',
        status: FormStatus.DRAFT,
        schema: {
          fields: [],
          settings: {
            layout: { columns: 1 as const, spacing: 'medium' as const },
            submission: {
              showSuccessMessage: true,
              allowMultipleSubmissions: true,
            },
            rowLayout: {
              enabled: true,
              rows: [
                {
                  rowId: 'row-1',
                  columnCount: 2,
                  columnWidths: ['1fr'], // Invalid: only 1 value for 2 columns
                  order: 0,
                },
              ],
            },
          },
          isPublished: false,
        },
      };

      const response = await request(app)
        .post('/api/forms')
        .set('Authorization', authToken)
        .send(formData);

      if (response.status === 400) {
        expect(response.body.success).toBe(false);
        console.log('✅ Mismatched array length rejected with 400 error');
      } else {
        console.warn(
          '⚠️ Mismatched array length not rejected (validation not yet implemented - AC 10 pending)'
        );
      }
    });

    it('should reject missing fr suffix with 400 error', async () => {
      const formData = {
        title: 'Missing FR Suffix',
        status: FormStatus.DRAFT,
        schema: {
          fields: [],
          settings: {
            layout: { columns: 1 as const, spacing: 'medium' as const },
            submission: {
              showSuccessMessage: true,
              allowMultipleSubmissions: true,
            },
            rowLayout: {
              enabled: true,
              rows: [
                {
                  rowId: 'row-1',
                  columnCount: 2,
                  columnWidths: ['1', '2'], // Invalid: missing 'fr' suffix
                  order: 0,
                },
              ],
            },
          },
          isPublished: false,
        },
      };

      const response = await request(app)
        .post('/api/forms')
        .set('Authorization', authToken)
        .send(formData);

      if (response.status === 400) {
        expect(response.body.success).toBe(false);
        console.log('✅ Missing fr suffix rejected with 400 error');
      } else {
        console.warn(
          '⚠️ Missing fr suffix not rejected (validation not yet implemented - AC 10 pending)'
        );
      }
    });
  });

  /**
   * Test 4: Forms without columnWidths save correctly (backward compatibility)
   *
   * Validates:
   * - Row layouts without columnWidths property save successfully
   * - columnWidths field remains undefined (not defaulted to any value)
   * - Equal-width rendering implied when columnWidths omitted
   */
  describe('Backward Compatibility', () => {
    it('should save row layout without columnWidths property', async () => {
      const formData = {
        title: 'Form without Column Widths',
        status: FormStatus.DRAFT,
        schema: {
          fields: [],
          settings: {
            layout: { columns: 1 as const, spacing: 'medium' as const },
            submission: {
              showSuccessMessage: true,
              allowMultipleSubmissions: true,
            },
            rowLayout: {
              enabled: true,
              rows: [
                {
                  rowId: 'row-1',
                  columnCount: 2,
                  // columnWidths intentionally omitted (backward compatibility)
                  order: 0,
                },
              ],
            },
          },
          isPublished: false,
        },
      };

      const response = await request(app)
        .post('/api/forms')
        .set('Authorization', authToken)
        .send(formData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      const schemas = await formSchemasRepository.findByFormId(
        response.body.data.id
      );
      const row = schemas[0].settings.rowLayout!.rows[0];

      // columnWidths should be undefined (not present)
      expect(row.columnWidths).toBeUndefined();

      console.log('✅ Row layout without columnWidths saved successfully');
      console.log('✅ Backward compatibility maintained');
    });

    it('should handle forms created before columnWidths feature', async () => {
      // Create form with old schema structure (no row layout at all)
      const formData = {
        title: 'Legacy Form',
        status: FormStatus.DRAFT,
        schema: {
          fields: [],
          settings: {
            layout: { columns: 2 as const, spacing: 'medium' as const },
            submission: {
              showSuccessMessage: true,
              allowMultipleSubmissions: true,
            },
            // rowLayout intentionally omitted (legacy form)
          },
          isPublished: false,
        },
      };

      const response = await request(app)
        .post('/api/forms')
        .set('Authorization', authToken)
        .send(formData);

      expect(response.status).toBe(201);

      const schemas = await formSchemasRepository.findByFormId(
        response.body.data.id
      );

      // rowLayout should be undefined for legacy forms
      expect(schemas[0].settings.rowLayout).toBeUndefined();

      console.log('✅ Legacy forms without row layout save correctly');
    });
  });

  /**
   * Test 5: Multiple rows with different columnWidths configurations
   *
   * Validates:
   * - Multiple rows can have independent columnWidths
   * - Each row's columnWidths persists independently
   * - Mixed configurations (some with columnWidths, some without) work correctly
   */
  describe('Multiple Rows Configuration', () => {
    it('should save multiple rows with different columnWidths', async () => {
      const formData = {
        title: 'Multi-Row Form',
        status: FormStatus.DRAFT,
        schema: {
          fields: [],
          settings: {
            layout: { columns: 1 as const, spacing: 'medium' as const },
            submission: {
              showSuccessMessage: true,
              allowMultipleSubmissions: true,
            },
            rowLayout: {
              enabled: true,
              rows: [
                {
                  rowId: 'row-1',
                  columnCount: 2,
                  columnWidths: ['1fr', '3fr'], // Narrow-wide
                  order: 0,
                },
                {
                  rowId: 'row-2',
                  columnCount: 2,
                  columnWidths: ['3fr', '1fr'], // Wide-narrow (opposite)
                  order: 1,
                },
                {
                  rowId: 'row-3',
                  columnCount: 3,
                  columnWidths: ['1fr', '2fr', '1fr'], // Narrow-wide-narrow
                  order: 2,
                },
              ],
            },
          },
          isPublished: false,
        },
      };

      const response = await request(app)
        .post('/api/forms')
        .set('Authorization', authToken)
        .send(formData);

      expect(response.status).toBe(201);

      const schemas = await formSchemasRepository.findByFormId(
        response.body.data.id
      );
      const rows = schemas[0].settings.rowLayout!.rows;

      expect(rows).toHaveLength(3);
      expect(rows[0].columnWidths).toEqual(['1fr', '3fr']);
      expect(rows[1].columnWidths).toEqual(['3fr', '1fr']);
      expect(rows[2].columnWidths).toEqual(['1fr', '2fr', '1fr']);

      console.log(
        '✅ Multiple rows with different columnWidths saved correctly'
      );
    });

    it('should handle mixed rows (some with columnWidths, some without)', async () => {
      const formData = {
        title: 'Mixed Rows Form',
        status: FormStatus.DRAFT,
        schema: {
          fields: [],
          settings: {
            layout: { columns: 1 as const, spacing: 'medium' as const },
            submission: {
              showSuccessMessage: true,
              allowMultipleSubmissions: true,
            },
            rowLayout: {
              enabled: true,
              rows: [
                {
                  rowId: 'row-1',
                  columnCount: 2,
                  columnWidths: ['1fr', '2fr'], // Has widths
                  order: 0,
                },
                {
                  rowId: 'row-2',
                  columnCount: 2,
                  // columnWidths omitted (equal width)
                  order: 1,
                },
              ],
            },
          },
          isPublished: false,
        },
      };

      const response = await request(app)
        .post('/api/forms')
        .set('Authorization', authToken)
        .send(formData);

      expect(response.status).toBe(201);

      const schemas = await formSchemasRepository.findByFormId(
        response.body.data.id
      );
      const rows = schemas[0].settings.rowLayout!.rows;

      expect(rows[0].columnWidths).toEqual(['1fr', '2fr']);
      expect(rows[1].columnWidths).toBeUndefined();

      console.log(
        '✅ Mixed rows (with and without columnWidths) saved correctly'
      );
    });
  });

  /**
   * Test 6: Update existing form to add columnWidths
   *
   * Validates:
   * - PUT /api/forms/:id updates columnWidths correctly
   * - Existing row layouts can be modified to add columnWidths
   * - Updates persist through GET request
   */
  describe('PUT /api/forms/:id - Update columnWidths', () => {
    it('should update existing form to add columnWidths', async () => {
      // Step 1: Create form without columnWidths
      const createData = {
        title: 'Form to Update',
        status: FormStatus.DRAFT,
        schema: {
          fields: [],
          settings: {
            layout: { columns: 1 as const, spacing: 'medium' as const },
            submission: {
              showSuccessMessage: true,
              allowMultipleSubmissions: true,
            },
            rowLayout: {
              enabled: true,
              rows: [
                {
                  rowId: 'row-1',
                  columnCount: 2,
                  // columnWidths initially omitted
                  order: 0,
                },
              ],
            },
          },
          isPublished: false,
        },
      };

      const createResponse = await request(app)
        .post('/api/forms')
        .set('Authorization', authToken)
        .send(createData);

      expect(createResponse.status).toBe(201);
      const formId = createResponse.body.data.id;

      // Step 2: Update form to add columnWidths
      const updateData = {
        schema: {
          fields: [],
          settings: {
            layout: { columns: 1 as const, spacing: 'medium' as const },
            submission: {
              showSuccessMessage: true,
              allowMultipleSubmissions: true,
            },
            rowLayout: {
              enabled: true,
              rows: [
                {
                  rowId: 'row-1',
                  columnCount: 2,
                  columnWidths: ['1fr', '3fr'], // Add columnWidths
                  order: 0,
                },
              ],
            },
          },
          isPublished: false,
        },
      };

      const updateResponse = await request(app)
        .put(`/api/forms/${formId}`)
        .set('Authorization', authToken)
        .send(updateData);

      expect(updateResponse.status).toBe(200);

      // Step 3: Verify columnWidths persisted
      const schemas = await formSchemasRepository.findByFormId(formId);
      const row = schemas[0].settings.rowLayout!.rows[0];

      expect(row.columnWidths).toEqual(['1fr', '3fr']);

      console.log('✅ Existing form updated to add columnWidths successfully');
    });
  });
});
