import request from 'supertest';
import { app } from '../../src/server';
import { databaseService } from '../../src/services/database.service';
import { FormStatus, FormFieldType } from '@nodeangularfullstack/shared';

/**
 * Integration tests for enhanced CSV export endpoint with filtering capabilities.
 * Tests field selection, date range filtering, and value filtering.
 */
describe('Export Submissions with Filtering', () => {
  let authToken: string;
  let userId: string;
  let formId: string;

  beforeAll(async () => {
    // Register test user
    const userRegistrationResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `test-export-${Date.now()}@example.com`,
        password: 'TestPass123!',
        firstName: 'Test',
        lastName: 'User',
      });

    userId = userRegistrationResponse.body.data.user.id;

    // Login to get token
    const loginResponse = await request(app).post('/api/v1/auth/login').send({
      email: userRegistrationResponse.body.data.user.email,
      password: 'TestPass123!',
    });

    authToken = loginResponse.body.data.accessToken;
  });

  afterAll(async () => {
    // Clean up test data
    const client = await databaseService.getPool().connect();
    try {
      await client.query(
        'DELETE FROM form_submissions WHERE form_schema_id IN (SELECT id FROM form_schemas WHERE form_id IN (SELECT id FROM forms WHERE user_id = $1))',
        [userId]
      );
      await client.query(
        'DELETE FROM form_schemas WHERE form_id IN (SELECT id FROM forms WHERE user_id = $1)',
        [userId]
      );
      await client.query('DELETE FROM forms WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM sessions');
      await client.query('DELETE FROM users WHERE id = $1', [userId]);
    } finally {
      client.release();
    }

    // Clean up database connection
    await databaseService.close();
  });

  beforeEach(async () => {
    // Create test form with schema
    const formResponse = await request(app)
      .post('/api/v1/forms')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Export Test Form',
        description: 'Form for testing export functionality',
        status: FormStatus.DRAFT,
      });

    formId = formResponse.body.data.id;

    // Create form schema with multiple fields
    await request(app)
      .post(`/api/v1/forms/${formId}/schema`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        fields: [
          {
            id: 'field-name',
            type: FormFieldType.TEXT,
            label: 'Name',
            fieldName: 'name',
            required: true,
            order: 1,
          },
          {
            id: 'field-email',
            type: FormFieldType.EMAIL,
            label: 'Email',
            fieldName: 'email',
            required: true,
            order: 2,
          },
          {
            id: 'field-age',
            type: FormFieldType.NUMBER,
            label: 'Age',
            fieldName: 'age',
            required: false,
            order: 3,
          },
          {
            id: 'field-status',
            type: FormFieldType.TEXT,
            label: 'Status',
            fieldName: 'status',
            required: false,
            order: 4,
          },
        ],
      });

    // Publish the form
    await request(app)
      .patch(`/api/v1/forms/${formId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        status: FormStatus.PUBLISHED,
      });

    // Create test submissions with varied data
    const submissions = [
      {
        values: {
          name: 'Alice',
          email: 'alice@example.com',
          age: 25,
          status: 'active',
        },
        submittedAt: new Date('2024-01-15'),
      },
      {
        values: {
          name: 'Bob',
          email: 'bob@example.com',
          age: 30,
          status: 'inactive',
        },
        submittedAt: new Date('2024-06-20'),
      },
      {
        values: {
          name: 'Charlie',
          email: 'charlie@example.com',
          age: 35,
          status: 'active',
        },
        submittedAt: new Date('2024-12-10'),
      },
    ];

    // Insert submissions directly into database for testing
    const client = await databaseService.getPool().connect();
    try {
      const schemaResult = await client.query(
        'SELECT id FROM form_schemas WHERE form_id = $1 ORDER BY schema_version DESC LIMIT 1',
        [formId]
      );
      const formSchemaId = schemaResult.rows[0].id;

      for (const submission of submissions) {
        await client.query(
          `INSERT INTO form_submissions (form_schema_id, values_json, submitted_at, submitter_ip)
           VALUES ($1, $2, $3, $4)`,
          [
            formSchemaId,
            JSON.stringify(submission.values),
            submission.submittedAt,
            '192.168.1.100',
          ]
        );
      }
    } finally {
      client.release();
    }
  });

  afterEach(async () => {
    // Clean up forms and submissions after each test
    const client = await databaseService.getPool().connect();
    try {
      await client.query(
        'DELETE FROM form_submissions WHERE form_schema_id IN (SELECT id FROM form_schemas WHERE form_id = $1)',
        [formId]
      );
      await client.query('DELETE FROM form_schemas WHERE form_id = $1', [
        formId,
      ]);
      await client.query('DELETE FROM forms WHERE id = $1', [formId]);
    } finally {
      client.release();
    }
  });

  describe('GET /api/v1/forms/:id/submissions/export', () => {
    it('should export all submissions when no filters', async () => {
      const response = await request(app)
        .get(`/api/v1/forms/${formId}/submissions/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain(
        'attachment; filename='
      );

      const csvContent = response.text;
      expect(csvContent).toContain('Submitted At');
      expect(csvContent).toContain('Submitter IP');
      expect(csvContent).toContain('name');
      expect(csvContent).toContain('email');
      expect(csvContent).toContain('Alice');
      expect(csvContent).toContain('Bob');
      expect(csvContent).toContain('Charlie');
    });

    it('should filter by selected fields', async () => {
      const response = await request(app)
        .get(`/api/v1/forms/${formId}/submissions/export`)
        .query({ fields: 'name,email' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const csvContent = response.text;
      const lines = csvContent.split('\n');
      const headers = lines[0];

      expect(headers).toContain('name');
      expect(headers).toContain('email');
      expect(headers).not.toContain('age');
      expect(headers).not.toContain('status');
    });

    it('should filter by date range', async () => {
      const response = await request(app)
        .get(`/api/v1/forms/${formId}/submissions/export`)
        .query({ dateFrom: '2024-06-01', dateTo: '2024-12-31' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const csvContent = response.text;
      expect(csvContent).toContain('Bob'); // June submission
      expect(csvContent).toContain('Charlie'); // December submission
      expect(csvContent).not.toContain('Alice'); // January submission (out of range)
    });

    it('should filter by field value', async () => {
      const response = await request(app)
        .get(`/api/v1/forms/${formId}/submissions/export`)
        .query({ filterField: 'status', filterValue: 'active' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const csvContent = response.text;
      expect(csvContent).toContain('Alice'); // status: active
      expect(csvContent).toContain('Charlie'); // status: active
      expect(csvContent).not.toContain('Bob'); // status: inactive
    });

    it('should combine multiple filters', async () => {
      const response = await request(app)
        .get(`/api/v1/forms/${formId}/submissions/export`)
        .query({
          fields: 'name,status',
          dateFrom: '2024-01-01',
          dateTo: '2024-12-31',
          filterField: 'status',
          filterValue: 'active',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const csvContent = response.text;
      const lines = csvContent.split('\n');
      const headers = lines[0];

      // Check field selection
      expect(headers).toContain('name');
      expect(headers).toContain('status');
      expect(headers).not.toContain('email');

      // Check value filtering
      expect(csvContent).toContain('Alice');
      expect(csvContent).toContain('Charlie');
      expect(csvContent).not.toContain('Bob');
    });

    it('should include UTF-8 BOM for Excel compatibility', async () => {
      const response = await request(app)
        .get(`/api/v1/forms/${formId}/submissions/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .buffer(true)
        .parse((res: any, callback: any) => {
          res.setEncoding('binary');
          let data = '';
          res.on('data', (chunk: any) => {
            data += chunk;
          });
          res.on('end', () => {
            callback(null, data);
          });
        });

      const content = response.body;
      // UTF-8 BOM is \ufeff (EF BB BF in hex)
      expect(content.charCodeAt(0)).toBe(0xfeff);
    });

    it('should mask IP addresses', async () => {
      const response = await request(app)
        .get(`/api/v1/forms/${formId}/submissions/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const csvContent = response.text;
      expect(csvContent).toContain('192.168._._');
      expect(csvContent).not.toContain('192.168.1.100');
    });

    it('should return 403 for unauthorized access', async () => {
      // Create another user
      const otherUserResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `other-${Date.now()}@example.com`,
          password: 'TestPass123!',
          firstName: 'Other',
          lastName: 'User',
        });

      const otherLoginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: otherUserResponse.body.data.user.email,
          password: 'TestPass123!',
        });

      const otherToken = otherLoginResponse.body.data.accessToken;

      const response = await request(app)
        .get(`/api/v1/forms/${formId}/submissions/export`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      expect(response.body.error).toBeDefined();

      // Clean up other user
      const client = await databaseService.getPool().connect();
      try {
        await client.query('DELETE FROM sessions');
        await client.query('DELETE FROM users WHERE id = $1', [
          otherUserResponse.body.data.user.id,
        ]);
      } finally {
        client.release();
      }
    });

    it('should return 400 for invalid field names', async () => {
      const response = await request(app)
        .get(`/api/v1/forms/${formId}/submissions/export`)
        .query({ fields: 'name,invalid_field' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('Invalid field');
    });

    it('should return 404 when form has no submissions', async () => {
      // Create a new form without submissions
      const emptyFormResponse = await request(app)
        .post('/api/v1/forms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Empty Form',
          description: 'Form with no submissions',
          status: FormStatus.DRAFT,
        });

      const emptyFormId = emptyFormResponse.body.data.id;

      // Create schema
      await request(app)
        .post(`/api/v1/forms/${emptyFormId}/schema`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fields: [
            {
              id: 'field-1',
              type: FormFieldType.TEXT,
              label: 'Test',
              fieldName: 'test',
              required: true,
              order: 1,
            },
          ],
        });

      // Publish
      await request(app)
        .patch(`/api/v1/forms/${emptyFormId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: FormStatus.PUBLISHED,
        });

      const response = await request(app)
        .get(`/api/v1/forms/${emptyFormId}/submissions/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBeDefined();

      // Clean up
      const client = await databaseService.getPool().connect();
      try {
        await client.query('DELETE FROM form_schemas WHERE form_id = $1', [
          emptyFormId,
        ]);
        await client.query('DELETE FROM forms WHERE id = $1', [emptyFormId]);
      } finally {
        client.release();
      }
    });
  });
});
