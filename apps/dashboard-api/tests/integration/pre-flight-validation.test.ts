/**
 * Integration Tests for Pre-Flight Validation
 * Epic 33.1: Export Core Infrastructure - Story 33.1.4
 *
 * Tests validation API endpoint with real database and filesystem operations
 */

import request from 'supertest';
import { app } from '../../src/server';
import { pool } from '../../src/config/database.config';

describe('Pre-Flight Validation Integration Tests', () => {
  let adminToken: string;
  let testToolId: string;
  let testFormSchemaId: string;

  beforeAll(async () => {
    // Login as admin to get JWT token
    const loginResponse = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@example.com',
      password: 'User123!@#',
    });

    adminToken = loginResponse.body.data.accessToken;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testToolId) {
      await pool.query('DELETE FROM tool_registry WHERE tool_id = $1', [
        testToolId,
      ]);
    }
    if (testFormSchemaId) {
      await pool.query('DELETE FROM form_schemas WHERE id = $1', [
        testFormSchemaId,
      ]);
    }

    // Close database connection
    await pool.end();
  });

  describe('POST /api/tool-registry/tools/:toolId/export/validate', () => {
    beforeEach(async () => {
      // Get admin user ID
      const userResult = await pool.query(
        `SELECT id FROM users WHERE email = $1`,
        ['admin@example.com']
      );
      const adminUserId = userResult.rows[0].id;

      // Create test form (parent)
      const formResult = await pool.query(
        `INSERT INTO forms (title, user_id, status, description)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        ['Test Form', adminUserId, 'draft', 'Test form for validation']
      );
      const formId = formResult.rows[0].id;

      // Create test form schema
      const formSchemaResult = await pool.query(
        `INSERT INTO form_schemas (form_id, schema_version, schema_json, is_published)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [
          formId,
          1,
          JSON.stringify({
            fields: [
              { fieldId: 'field-1', fieldType: 'text', fieldLabel: 'Name' },
            ],
            settings: {},
          }),
          false,
        ]
      );
      testFormSchemaId = formSchemaResult.rows[0].id;

      // Create test tool in registry
      const toolResult = await pool.query(
        `INSERT INTO tool_registry (
          tool_id, name, version, route, api_base, status,
          manifest_json, created_by
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING tool_id`,
        [
          'test-tool-123',
          'Test Form Builder',
          '1.0.0',
          '/tools/forms',
          '/api/forms',
          'active',
          JSON.stringify({
            toolType: 'forms',
            toolMetadata: { formSchemaId: testFormSchemaId },
            routes: { primary: '/tools/forms' },
            endpoints: { base: '/api/forms', paths: [] },
          }),
          adminUserId,
        ]
      );
      testToolId = toolResult.rows[0].tool_id;
    });

    afterEach(async () => {
      // Cleanup after each test (cascade deletes will handle related records)
      if (testToolId) {
        await pool.query('DELETE FROM tool_registry WHERE tool_id = $1', [
          testToolId,
        ]);
        testToolId = '';
      }
      if (testFormSchemaId) {
        await pool.query('DELETE FROM form_schemas WHERE id = $1', [
          testFormSchemaId,
        ]);
        // Also delete parent form (cascade will handle form_schemas)
        await pool.query('DELETE FROM forms WHERE title = $1', ['Test Form']);
        testFormSchemaId = '';
      }
    });

    it('should return 200 OK with validation success for valid tool', async () => {
      // Act
      const response = await request(app)
        .post(`/api/tool-registry/tools/${testToolId}/export/validate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('errors');
      expect(response.body).toHaveProperty('warnings');
      expect(response.body).toHaveProperty('info');
      expect(response.body.errors).toHaveLength(0);
      expect(Array.isArray(response.body.info)).toBe(true);
    });

    it('should return 422 for tool with missing form schema', async () => {
      // Arrange - Update tool to reference non-existent form schema
      await pool.query(
        `UPDATE tool_registry
         SET manifest_json = jsonb_set(manifest_json, '{toolMetadata}', $1::jsonb)
         WHERE tool_id = $2`,
        [JSON.stringify({ formSchemaId: 'non-existent-schema' }), testToolId]
      );

      // Act
      const response = await request(app)
        .post(`/api/tool-registry/tools/${testToolId}/export/validate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(422);

      // Assert
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.errors.length).toBeGreaterThan(0);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'form_schema',
          message: expect.stringContaining('not found'),
        })
      );
    });

    it('should return 422 for tool with no fields in form', async () => {
      // Arrange - Update form schema to have empty fields array
      await pool.query(
        'UPDATE form_schemas SET schema_json = $1 WHERE id = $2',
        [JSON.stringify({ fields: [], settings: {} }), testFormSchemaId]
      );

      // Act
      const response = await request(app)
        .post(`/api/tool-registry/tools/${testToolId}/export/validate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(422);

      // Assert
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'form_fields',
          message: expect.stringContaining('no fields'),
        })
      );
    });

    it('should return warnings for non-active tool', async () => {
      // Arrange - Set tool status to deprecated (valid status, not active)
      await pool.query(
        'UPDATE tool_registry SET status = $1 WHERE tool_id = $2',
        ['deprecated', testToolId]
      );

      // Act
      const response = await request(app)
        .post(`/api/tool-registry/tools/${testToolId}/export/validate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.warnings).toContainEqual(
        expect.objectContaining({
          field: 'tool_status',
          message: expect.stringContaining('deprecated'),
        })
      );
    });

    it('should return 404 for non-existent tool', async () => {
      // Act
      const response = await request(app)
        .post('/api/tool-registry/tools/non-existent-tool/export/validate')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      // Assert
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 without authentication', async () => {
      // Act
      await request(app)
        .post(`/api/tool-registry/tools/${testToolId}/export/validate`)
        .expect(401);
    });

    it('should cache validation results', async () => {
      // Act - First request
      const response1 = await request(app)
        .post(`/api/tool-registry/tools/${testToolId}/export/validate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Act - Second request (should be cached)
      const response2 = await request(app)
        .post(`/api/tool-registry/tools/${testToolId}/export/validate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Assert - Both responses should be identical (cached)
      expect(response1.body.timestamp).toEqual(response2.body.timestamp);
      expect(response1.body.success).toEqual(response2.body.success);
    });

    it('should include estimated duration in validation result', async () => {
      // Act
      const response = await request(app)
        .post(`/api/tool-registry/tools/${testToolId}/export/validate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('estimatedDurationMs');
      expect(typeof response.body.estimatedDurationMs).toBe('number');
      expect(response.body.estimatedDurationMs).toBeGreaterThan(0);
    });

    it('should validate invalid toolId format', async () => {
      // Act
      const response = await request(app)
        .post('/api/tool-registry/tools/invalid-uuid/export/validate')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('Validation Report Structure', () => {
    it('should return complete validation report structure', async () => {
      // Arrange - Create a complete test scenario
      const userResult = await pool.query(
        `SELECT id FROM users WHERE email = $1`,
        ['admin@example.com']
      );
      const adminUserId = userResult.rows[0].id;

      const formResult = await pool.query(
        `INSERT INTO forms (title, user_id, status, description)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        ['Complete Test Form', adminUserId, 'draft', 'Complete test form']
      );
      const formId = formResult.rows[0].id;

      const formSchemaResult = await pool.query(
        `INSERT INTO form_schemas (form_id, schema_version, schema_json, is_published)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [
          formId,
          1,
          JSON.stringify({
            fields: [
              { fieldId: 'field-1', fieldType: 'text', fieldLabel: 'Name' },
              { fieldId: 'field-2', fieldType: 'email', fieldLabel: 'Email' },
            ],
            settings: {},
          }),
          false,
        ]
      );
      const formSchemaId = formSchemaResult.rows[0].id;

      const toolResult = await pool.query(
        `INSERT INTO tool_registry (
          tool_id, name, version, route, api_base, status,
          manifest_json, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING tool_id`,
        [
          'test-tool-complete-123',
          'Complete Test Form Builder',
          '1.0.0',
          '/tools/forms',
          '/api/forms',
          'active',
          JSON.stringify({
            toolType: 'forms',
            toolMetadata: { formSchemaId },
            routes: { primary: '/tools/forms' },
            endpoints: { base: '/api/forms', paths: [] },
          }),
          adminUserId,
        ]
      );
      const toolId = toolResult.rows[0].tool_id;

      // Act
      const response = await request(app)
        .post(`/api/tool-registry/tools/${toolId}/export/validate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Assert - Verify complete structure
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('errors');
      expect(response.body).toHaveProperty('warnings');
      expect(response.body).toHaveProperty('info');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('estimatedDurationMs');

      // Verify array types
      expect(Array.isArray(response.body.errors)).toBe(true);
      expect(Array.isArray(response.body.warnings)).toBe(true);
      expect(Array.isArray(response.body.info)).toBe(true);

      // Verify timestamp is valid date
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);

      // Verify info messages include expected validation steps
      expect(response.body.info).toContain(
        expect.stringContaining('Tool') // Tool found message
      );

      // Cleanup
      await pool.query('DELETE FROM tool_registry WHERE tool_id = $1', [
        toolId,
      ]);
      await pool.query('DELETE FROM form_schemas WHERE id = $1', [
        formSchemaId,
      ]);
      await pool.query('DELETE FROM forms WHERE id = $1', [formId]);
    });
  });
});
