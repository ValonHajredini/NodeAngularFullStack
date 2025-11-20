import request from 'supertest';
import { app } from '../../src/server';
import { templatesRepository } from '../../src/repositories/templates.repository';
import { databaseService } from '../../src/services/database.service';
import { TemplateCategory } from '@nodeangularfullstack/shared';

/**
 * Integration tests for Template Field Validation (Story 29.2)
 * Tests category-specific field validation for all 6 template categories.
 * Verifies that templates with missing or incorrect required fields are rejected.
 */
describe('Template Creation Validation', () => {
  let adminToken: string;
  let adminId: string;
  const createdTemplateIds: string[] = [];

  beforeAll(async () => {
    // Clean up any leftover templates from previous failed test runs
    const cleanupClient = await databaseService.getPool().connect();
    try {
      await cleanupClient.query(
        "DELETE FROM form_templates WHERE name LIKE 'Valid%Template%'"
      );
      await cleanupClient.query(
        "DELETE FROM form_templates WHERE name = 'Test Poll Template'"
      );
    } finally {
      cleanupClient.release();
    }

    // Register a new admin user for this test suite
    const adminRegistrationResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'templatetest-admin@example.com',
        password: 'AdminPass123!',
        firstName: 'Template',
        lastName: 'Admin',
      });

    if (adminRegistrationResponse.status !== 201 || !adminRegistrationResponse.body.data) {
      throw new Error(
        `Admin registration failed: ${adminRegistrationResponse.status} - ${JSON.stringify(adminRegistrationResponse.body)}`
      );
    }

    adminId = adminRegistrationResponse.body.data.user.id;

    // Update user role to admin in database
    const client = await databaseService.getPool().connect();
    try {
      await client.query('UPDATE users SET role = $1 WHERE id = $2', [
        'admin',
        adminId,
      ]);
    } finally {
      client.release();
    }

    // Login to get admin JWT token
    const adminLoginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'templatetest-admin@example.com',
        password: 'AdminPass123!',
      });

    if (adminLoginResponse.status !== 200 || !adminLoginResponse.body.data) {
      throw new Error(
        `Admin login failed: ${adminLoginResponse.status} - ${JSON.stringify(adminLoginResponse.body)}`
      );
    }
    adminToken = adminLoginResponse.body.data.accessToken;
  });

  afterAll(async () => {
    // Clean up all created templates (both by ID and by name pattern for robustness)
    for (const templateId of createdTemplateIds) {
      try {
        await templatesRepository.delete(templateId);
      } catch (error) {
        // Ignore errors if template already deleted
      }
    }

    // Also clean up by name pattern in case some templates weren't added to the array
    const client = await databaseService.getPool().connect();
    try {
      await client.query(
        "DELETE FROM form_templates WHERE name LIKE 'Valid%Template%'"
      );
      await client.query('DELETE FROM sessions WHERE user_id = $1', [adminId]);
      await client.query('DELETE FROM users WHERE id = $1', [adminId]);
    } finally {
      client.release();
    }
  });

  describe('POLLS Category', () => {
    it('should reject poll template missing poll_option field', async () => {
      const invalidPollTemplate = {
        name: 'Invalid Poll Template',
        category: TemplateCategory.POLLS,
        templateSchema: {
          fields: [
            {
              id: 'field-1',
              label: 'Question',
              fieldName: 'question',
              type: 'TEXT',
              required: true,
            },
          ],
          settings: {
            layout: { columns: 1 },
            submission: {
              submitButtonText: 'Submit',
              successMessage: 'Thank you!',
            },
          },
        },
      };

      const response = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidPollTemplate);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('TEMPLATE_VALIDATION_FAILED');
      expect(response.body.message).toContain('Template validation failed for category');
      expect(response.body.validationErrors).toBeDefined();
      expect(response.body.validationErrors).toHaveLength(1);
      expect(response.body.validationErrors[0].field).toBe('poll_option');
      expect(response.body.validationErrors[0].errorType).toBe('MISSING_FIELD');
      expect(response.body.validationErrors[0].autoFixSuggestion).toBeDefined();
    });

    it('should reject poll template with wrong field type for poll_option', async () => {
      const invalidPollTemplate = {
        name: 'Invalid Poll Template - Wrong Type',
        category: TemplateCategory.POLLS,
        templateSchema: {
          fields: [
            {
              id: 'field-1',
              label: 'Poll Option',
              fieldName: 'poll_option',
              type: 'TEXT', // Should be SELECT or RADIO
              required: true,
            },
          ],
          settings: {
            layout: { columns: 1 },
            submission: {
              submitButtonText: 'Submit',
              successMessage: 'Thank you!',
            },
          },
        },
      };

      const response = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidPollTemplate);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('TEMPLATE_VALIDATION_FAILED');
      expect(response.body.validationErrors).toBeDefined();
      expect(response.body.validationErrors[0].field).toBe('poll_option');
      expect(response.body.validationErrors[0].errorType).toBe('WRONG_TYPE');
      expect(response.body.validationErrors[0].actualType).toBe('TEXT');
      expect(response.body.validationErrors[0].expectedType).toContain('SELECT');
    });

    it('should accept valid poll template with poll_option SELECT field', async () => {
      const validPollTemplate = {
        name: 'Valid Poll Template',
        category: TemplateCategory.POLLS,
        templateSchema: {
          fields: [
            {
              id: 'field-1',
              label: 'Poll Option',
              fieldName: 'poll_option',
              type: 'SELECT',
              required: true,
              options: [
                { label: 'Option A', value: 'a' },
                { label: 'Option B', value: 'b' },
              ],
            },
          ],
          settings: {
            layout: { columns: 1 },
            submission: {
              submitButtonText: 'Vote',
              successMessage: 'Vote submitted!',
            },
          },
        },
        businessLogicConfig: {
          type: 'poll',
          voteField: 'poll_option',
          preventDuplicates: true,
          showResultsAfterVote: true,
          trackingMethod: 'session',
        },
      };

      const response = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validPollTemplate);

      expect(response.status).toBe(201);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      createdTemplateIds.push(response.body.data.id);
    });
  });

  describe('QUIZ Category', () => {
    it('should reject quiz template with no question fields', async () => {
      const invalidQuizTemplate = {
        name: 'Invalid Quiz Template - No Questions',
        category: TemplateCategory.QUIZ,
        templateSchema: {
          fields: [
            {
              id: 'field-1',
              label: 'Name',
              fieldName: 'participant_name',
              type: 'TEXT',
              required: true,
            },
          ],
          settings: {
            layout: { columns: 1 },
            submission: {
              submitButtonText: 'Submit',
              successMessage: 'Thank you!',
            },
          },
        },
      };

      const response = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidQuizTemplate);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('TEMPLATE_VALIDATION_FAILED');
      expect(response.body.validationErrors).toBeDefined();
      expect(response.body.validationErrors[0].errorType).toBe('MISSING_FIELD');
    });

    it('should reject quiz template with questions missing correctAnswer metadata', async () => {
      const invalidQuizTemplate = {
        name: 'Invalid Quiz Template - No Metadata',
        category: TemplateCategory.QUIZ,
        templateSchema: {
          fields: [
            {
              id: 'field-1',
              label: 'Question 1',
              fieldName: 'question_1',
              type: 'SELECT',
              required: true,
              options: [
                { label: 'A', value: 'a' },
                { label: 'B', value: 'b' },
              ],
              // Missing metadata.correctAnswer
            },
          ],
          settings: {
            layout: { columns: 1 },
            submission: {
              submitButtonText: 'Submit',
              successMessage: 'Thank you!',
            },
          },
        },
      };

      const response = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidQuizTemplate);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('TEMPLATE_VALIDATION_FAILED');
      expect(response.body.validationErrors).toBeDefined();
      expect(response.body.validationErrors[0].errorType).toBe('MISSING_METADATA');
      expect(response.body.validationErrors[0].message).toContain('correctAnswer');
    });

    it('should accept valid quiz template with question fields and correctAnswer', async () => {
      const validQuizTemplate = {
        name: 'Valid Quiz Template',
        category: TemplateCategory.QUIZ,
        templateSchema: {
          fields: [
            {
              id: 'field-1',
              label: 'Question 1: What is 2+2?',
              fieldName: 'question_1',
              type: 'SELECT',
              required: true,
              options: [
                { label: '3', value: '3' },
                { label: '4', value: '4' },
                { label: '5', value: '5' },
              ],
              metadata: {
                correctAnswer: '4',
                points: 10,
              },
            },
            {
              id: 'field-2',
              label: 'Question 2: Is the sky blue?',
              fieldName: 'question_2',
              type: 'RADIO',
              required: true,
              options: [
                { label: 'Yes', value: 'yes' },
                { label: 'No', value: 'no' },
              ],
              metadata: {
                correctAnswer: 'yes',
                points: 5,
              },
            },
          ],
          settings: {
            layout: { columns: 1 },
            submission: {
              submitButtonText: 'Submit Quiz',
              successMessage: 'Quiz submitted!',
            },
          },
        },
        businessLogicConfig: {
          type: 'quiz',
          scoringRules: [
            { fieldId: 'field-1', correctAnswer: '4', points: 10 },
            { fieldId: 'field-2', correctAnswer: 'yes', points: 5 },
          ],
          passingScore: 60,
          showResults: true,
        },
      };

      const response = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validQuizTemplate);

      expect(response.status).toBe(201);
      expect(response.body.data).toBeDefined();
      createdTemplateIds.push(response.body.data.id);
    });
  });

  describe('ECOMMERCE Category', () => {
    it('should reject ecommerce template missing product_id field', async () => {
      const invalidEcommerceTemplate = {
        name: 'Invalid Ecommerce Template',
        category: TemplateCategory.ECOMMERCE,
        templateSchema: {
          fields: [
            {
              id: 'field-1',
              label: 'Quantity',
              fieldName: 'quantity',
              type: 'NUMBER',
              required: true,
            },
            {
              id: 'field-2',
              label: 'Price',
              fieldName: 'price',
              type: 'NUMBER',
              required: true,
            },
          ],
          settings: {
            layout: { columns: 1 },
            submission: {
              submitButtonText: 'Submit',
              successMessage: 'Thank you!',
            },
          },
        },
      };

      const response = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidEcommerceTemplate);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('TEMPLATE_VALIDATION_FAILED');
      expect(response.body.validationErrors).toBeDefined();
      const productIdError = response.body.validationErrors.find(
        (err: any) => err.field === 'product_id'
      );
      expect(productIdError).toBeDefined();
      expect(productIdError.errorType).toBe('MISSING_FIELD');
    });

    it('should reject ecommerce template with wrong price field type', async () => {
      const invalidEcommerceTemplate = {
        name: 'Invalid Ecommerce Template - Wrong Type',
        category: TemplateCategory.ECOMMERCE,
        templateSchema: {
          fields: [
            {
              id: 'field-1',
              label: 'Product',
              fieldName: 'product_id',
              type: 'SELECT',
              required: true,
              options: [{ label: 'Product A', value: 'prod-1' }],
            },
            {
              id: 'field-2',
              label: 'Quantity',
              fieldName: 'quantity',
              type: 'NUMBER',
              required: true,
            },
            {
              id: 'field-3',
              label: 'Price',
              fieldName: 'price',
              type: 'TEXT', // Should be NUMBER
              required: true,
            },
          ],
          settings: {
            layout: { columns: 1 },
            submission: {
              submitButtonText: 'Submit',
              successMessage: 'Thank you!',
            },
          },
        },
      };

      const response = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidEcommerceTemplate);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('TEMPLATE_VALIDATION_FAILED');
      const priceError = response.body.validationErrors.find(
        (err: any) => err.field === 'price'
      );
      expect(priceError).toBeDefined();
      expect(priceError.errorType).toBe('WRONG_TYPE');
      expect(priceError.actualType).toBe('TEXT');
    });

    it('should accept valid ecommerce template with all required fields', async () => {
      const validEcommerceTemplate = {
        name: 'Valid Ecommerce Template',
        category: TemplateCategory.ECOMMERCE,
        templateSchema: {
          fields: [
            {
              id: 'field-1',
              label: 'Product',
              fieldName: 'product_id',
              type: 'SELECT',
              required: true,
              options: [
                { label: 'Product A', value: 'prod-1' },
                { label: 'Product B', value: 'prod-2' },
              ],
            },
            {
              id: 'field-2',
              label: 'Quantity',
              fieldName: 'quantity',
              type: 'NUMBER',
              required: true,
            },
            {
              id: 'field-3',
              label: 'Price',
              fieldName: 'price',
              type: 'NUMBER',
              required: true,
            },
          ],
          settings: {
            layout: { columns: 1 },
            submission: {
              submitButtonText: 'Order',
              successMessage: 'Order placed!',
            },
          },
        },
        businessLogicConfig: {
          type: 'inventory',
          stockField: 'product_id',
          variantField: 'variant',
          quantityField: 'quantity',
          stockTable: 'product_inventory',
          decrementOnSubmit: true,
        },
      };

      const response = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validEcommerceTemplate);

      expect(response.status).toBe(201);
      expect(response.body.data).toBeDefined();
      createdTemplateIds.push(response.body.data.id);
    });
  });

  describe('SERVICES Category', () => {
    it('should reject service template missing date field', async () => {
      const invalidServiceTemplate = {
        name: 'Invalid Service Template',
        category: TemplateCategory.SERVICES,
        templateSchema: {
          fields: [
            {
              id: 'field-1',
              label: 'Time Slot',
              fieldName: 'time_slot',
              type: 'TIME_SLOT',
              required: true,
            },
          ],
          settings: {
            layout: { columns: 1 },
            submission: {
              submitButtonText: 'Submit',
              successMessage: 'Thank you!',
            },
          },
        },
      };

      const response = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidServiceTemplate);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('TEMPLATE_VALIDATION_FAILED');
      const dateError = response.body.validationErrors.find(
        (err: any) => err.field === 'date'
      );
      expect(dateError).toBeDefined();
      expect(dateError.errorType).toBe('MISSING_FIELD');
    });

    it('should reject service template with wrong time_slot field type', async () => {
      const invalidServiceTemplate = {
        name: 'Invalid Service Template - Wrong Type',
        category: TemplateCategory.SERVICES,
        templateSchema: {
          fields: [
            {
              id: 'field-1',
              label: 'Date',
              fieldName: 'date',
              type: 'DATE',
              required: true,
            },
            {
              id: 'field-2',
              label: 'Time Slot',
              fieldName: 'time_slot',
              type: 'TEXT', // Should be TIME_SLOT or SELECT
              required: true,
            },
          ],
          settings: {
            layout: { columns: 1 },
            submission: {
              submitButtonText: 'Submit',
              successMessage: 'Thank you!',
            },
          },
        },
      };

      const response = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidServiceTemplate);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('TEMPLATE_VALIDATION_FAILED');
      const timeSlotError = response.body.validationErrors.find(
        (err: any) => err.field === 'time_slot'
      );
      expect(timeSlotError).toBeDefined();
      expect(timeSlotError.errorType).toBe('WRONG_TYPE');
    });

    it('should accept valid service template with date and time_slot fields', async () => {
      const validServiceTemplate = {
        name: 'Valid Service Template',
        category: TemplateCategory.SERVICES,
        templateSchema: {
          fields: [
            {
              id: 'field-1',
              label: 'Appointment Date',
              fieldName: 'date',
              type: 'DATE',
              required: true,
            },
            {
              id: 'field-2',
              label: 'Time Slot',
              fieldName: 'time_slot',
              type: 'SELECT',
              required: true,
              options: [
                { label: '9:00 AM', value: '09:00' },
                { label: '10:00 AM', value: '10:00' },
              ],
            },
          ],
          settings: {
            layout: { columns: 1 },
            submission: {
              submitButtonText: 'Book',
              successMessage: 'Appointment booked!',
            },
          },
        },
        businessLogicConfig: {
          type: 'appointment',
          dateField: 'date',
          timeSlotField: 'time_slot',
          bookingsTable: 'appointments',
          maxBookingsPerSlot: 5,
        },
      };

      const response = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validServiceTemplate);

      expect(response.status).toBe(201);
      expect(response.body.data).toBeDefined();
      createdTemplateIds.push(response.body.data.id);
    });
  });

  describe('DATA_COLLECTION Category', () => {
    it('should reject data collection template missing menu_item field', async () => {
      const invalidDataTemplate = {
        name: 'Invalid Data Collection Template',
        category: TemplateCategory.DATA_COLLECTION,
        templateSchema: {
          fields: [
            {
              id: 'field-1',
              label: 'Quantity',
              fieldName: 'quantity',
              type: 'NUMBER',
              required: true,
            },
          ],
          settings: {
            layout: { columns: 1 },
            submission: {
              submitButtonText: 'Submit',
              successMessage: 'Thank you!',
            },
          },
        },
      };

      const response = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidDataTemplate);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('TEMPLATE_VALIDATION_FAILED');
      const menuItemError = response.body.validationErrors.find(
        (err: any) => err.field === 'menu_item'
      );
      expect(menuItemError).toBeDefined();
      expect(menuItemError.errorType).toBe('MISSING_FIELD');
    });

    it('should accept valid data collection template with menu_item and quantity', async () => {
      const validDataTemplate = {
        name: 'Valid Data Collection Template',
        category: TemplateCategory.DATA_COLLECTION,
        templateSchema: {
          fields: [
            {
              id: 'field-1',
              label: 'Menu Item',
              fieldName: 'menu_item',
              type: 'SELECT',
              required: true,
              options: [
                { label: 'Burger', value: 'burger' },
                { label: 'Pizza', value: 'pizza' },
              ],
            },
            {
              id: 'field-2',
              label: 'Quantity',
              fieldName: 'quantity',
              type: 'NUMBER',
              required: true,
            },
          ],
          settings: {
            layout: { columns: 1 },
            submission: {
              submitButtonText: 'Order',
              successMessage: 'Order placed!',
            },
          },
        },
        businessLogicConfig: {
          type: 'order',
          itemFields: ['menu_item', 'quantity'],
          calculateTotal: true,
        },
      };

      const response = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validDataTemplate);

      expect(response.status).toBe(201);
      expect(response.body.data).toBeDefined();
      createdTemplateIds.push(response.body.data.id);
    });
  });

  describe('EVENTS Category', () => {
    it('should reject event template missing attendee_name field', async () => {
      const invalidEventTemplate = {
        name: 'Invalid Event Template',
        category: TemplateCategory.EVENTS,
        templateSchema: {
          fields: [
            {
              id: 'field-1',
              label: 'RSVP Status',
              fieldName: 'rsvp_status',
              type: 'RADIO',
              required: true,
              options: [
                { label: 'Attending', value: 'attending' },
                { label: 'Not Attending', value: 'not_attending' },
              ],
            },
          ],
          settings: {
            layout: { columns: 1 },
            submission: {
              submitButtonText: 'Submit',
              successMessage: 'Thank you!',
            },
          },
        },
      };

      const response = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidEventTemplate);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('TEMPLATE_VALIDATION_FAILED');
      const attendeeError = response.body.validationErrors.find(
        (err: any) => err.field === 'attendee_name'
      );
      expect(attendeeError).toBeDefined();
      expect(attendeeError.errorType).toBe('MISSING_FIELD');
    });

    it('should accept valid event template with attendee_name and rsvp_status', async () => {
      const validEventTemplate = {
        name: 'Valid Event Template',
        category: TemplateCategory.EVENTS,
        templateSchema: {
          fields: [
            {
              id: 'field-1',
              label: 'Attendee Name',
              fieldName: 'attendee_name',
              type: 'TEXT',
              required: true,
            },
            {
              id: 'field-2',
              label: 'RSVP Status',
              fieldName: 'rsvp_status',
              type: 'RADIO',
              required: true,
              options: [
                { label: 'Attending', value: 'attending' },
                { label: 'Not Attending', value: 'not_attending' },
                { label: 'Maybe', value: 'maybe' },
              ],
            },
          ],
          settings: {
            layout: { columns: 1 },
            submission: {
              submitButtonText: 'RSVP',
              successMessage: 'RSVP submitted!',
            },
          },
        },
        businessLogicConfig: {
          type: 'appointment',
          dateField: 'event_date',
          timeSlotField: 'event_time',
          bookingsTable: 'event_registrations',
          maxBookingsPerSlot: 100,
        },
      };

      const response = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validEventTemplate);

      expect(response.status).toBe(201);
      expect(response.body.data).toBeDefined();
      createdTemplateIds.push(response.body.data.id);
    });
  });
});

describe('Template Update Validation', () => {
  let adminToken: string;
  let adminId: string;
  let testTemplateId: string;

  beforeAll(async () => {
    // Clean up any leftover templates from previous failed test runs
    const cleanupClient = await databaseService.getPool().connect();
    try {
      await cleanupClient.query(
        "DELETE FROM form_templates WHERE name = 'Test Poll Template'"
      );
    } finally {
      cleanupClient.release();
    }

    // Register a new admin user for this test suite
    const adminRegistrationResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'templateupdate-admin@example.com',
        password: 'AdminPass123!',
        firstName: 'Template',
        lastName: 'UpdateAdmin',
      });

    if (adminRegistrationResponse.status !== 201 || !adminRegistrationResponse.body.data) {
      throw new Error(
        `Admin registration failed: ${adminRegistrationResponse.status} - ${JSON.stringify(adminRegistrationResponse.body)}`
      );
    }

    adminId = adminRegistrationResponse.body.data.user.id;

    // Update user role to admin in database
    const client = await databaseService.getPool().connect();
    try {
      await client.query('UPDATE users SET role = $1 WHERE id = $2', [
        'admin',
        adminId,
      ]);
    } finally {
      client.release();
    }

    // Login to get admin JWT token
    const adminLoginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'templateupdate-admin@example.com',
        password: 'AdminPass123!',
      });

    if (adminLoginResponse.status !== 200 || !adminLoginResponse.body.data) {
      throw new Error(
        `Admin login failed: ${adminLoginResponse.status} - ${JSON.stringify(adminLoginResponse.body)}`
      );
    }
    adminToken = adminLoginResponse.body.data.accessToken;

    // Create a valid template for update tests
    const validTemplate = {
      name: 'Test Poll Template',
      category: TemplateCategory.POLLS,
      templateSchema: {
        fields: [
          {
            id: 'field-1',
            label: 'Poll Option',
            fieldName: 'poll_option',
            type: 'SELECT',
            required: true,
            options: [{ label: 'Option A', value: 'a' }],
          },
        ],
        settings: {
          layout: { columns: 1 },
          submission: {
            submitButtonText: 'Vote',
            successMessage: 'Vote submitted!',
          },
        },
      },
      businessLogicConfig: {
        type: 'poll',
        voteField: 'poll_option',
        preventDuplicates: true,
        showResultsAfterVote: true,
        trackingMethod: 'session',
      },
    };

    const createResponse = await request(app)
      .post('/api/v1/templates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validTemplate);

    testTemplateId = createResponse.body.data.id;
  });

  afterAll(async () => {
    // Clean up test template (both by ID and by name for robustness)
    const client = await databaseService.getPool().connect();
    try {
      if (testTemplateId) {
        try {
          await templatesRepository.delete(testTemplateId);
        } catch (error) {
          // Ignore errors if template already deleted
        }
      }

      // Also clean up by name in case ID wasn't captured
      await client.query(
        "DELETE FROM form_templates WHERE name = 'Test Poll Template'"
      );
      await client.query('DELETE FROM sessions WHERE user_id = $1', [adminId]);
      await client.query('DELETE FROM users WHERE id = $1', [adminId]);
    } finally {
      client.release();
    }
  });

  it('should reject template update that removes required fields', async () => {
    const invalidUpdate = {
      templateSchema: {
        fields: [
          {
            id: 'field-1',
            label: 'Question',
            fieldName: 'question',
            type: 'TEXT',
            required: true,
          },
        ],
        settings: {
          layout: { columns: 1 },
          submission: {
            submitButtonText: 'Submit',
            successMessage: 'Thank you!',
          },
        },
      },
    };

    const response = await request(app)
      .put(`/api/v1/templates/${testTemplateId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(invalidUpdate);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('TEMPLATE_VALIDATION_FAILED');
    expect(response.body.validationErrors).toBeDefined();
  });

  it('should reject template update that changes field types invalidly', async () => {
    const invalidUpdate = {
      templateSchema: {
        fields: [
          {
            id: 'field-1',
            label: 'Poll Option',
            fieldName: 'poll_option',
            type: 'TEXT', // Changed from SELECT to TEXT (invalid)
            required: true,
          },
        ],
        settings: {
          layout: { columns: 1 },
          submission: {
            submitButtonText: 'Vote',
            successMessage: 'Vote submitted!',
          },
        },
      },
    };

    const response = await request(app)
      .put(`/api/v1/templates/${testTemplateId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(invalidUpdate);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('TEMPLATE_VALIDATION_FAILED');
    expect(response.body.validationErrors[0].errorType).toBe('WRONG_TYPE');
  });

  it('should accept template update that maintains required fields', async () => {
    const validUpdate = {
      templateSchema: {
        fields: [
          {
            id: 'field-1',
            label: 'Updated Poll Option',
            fieldName: 'poll_option',
            type: 'SELECT',
            required: true,
            options: [
              { label: 'New Option A', value: 'a' },
              { label: 'New Option B', value: 'b' },
            ],
          },
        ],
        settings: {
          layout: { columns: 1 },
          submission: {
            submitButtonText: 'Submit Vote',
            successMessage: 'Thanks for voting!',
          },
        },
      },
    };

    const response = await request(app)
      .put(`/api/v1/templates/${testTemplateId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validUpdate);

    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.id).toBe(testTemplateId);
  });
});
