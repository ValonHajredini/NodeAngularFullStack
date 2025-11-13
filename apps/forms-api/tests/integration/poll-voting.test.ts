/**
 * Integration Tests for Poll Template with Vote Aggregation
 * Epic: 29 - Form Template System with Business Logic
 * Story: 29.14 - Poll Template with Vote Aggregation
 *
 * This test suite validates:
 * - AC3: Duplicate vote prevention using session-based tracking
 * - AC4: Real-time vote aggregation with PostgreSQL JSONB queries
 * - AC5: Poll results endpoint returning vote counts and percentages
 * - AC6: Session middleware integration for duplicate detection
 *
 * Tests include:
 * - Session-based duplicate vote prevention
 * - Vote aggregation across multiple sessions
 * - Poll results calculation with percentages
 * - Vote submission validation
 */

import request from 'supertest';
import { Pool } from 'pg';
import { app } from '../../src/server';
import { getPoolForDatabase, DatabaseType } from '../../src/config/multi-database.config';

describe('Poll Voting Integration Tests', () => {
  let pool: Pool;
  let formSchemaId: string;
  let templateId: string;
  let shortCode: string;

  beforeAll(async () => {
    pool = getPoolForDatabase(DatabaseType.FORMS);

    // Create poll template
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
      'Test Quick Poll',
      'polls',
      'Test template for poll voting integration tests',
      JSON.stringify({
        id: 'test-poll-schema-001',
        formId: 'test-poll-form-001',
        version: 1,
        isPublished: true,
        fields: [
          {
            id: 'favorite_language',
            type: 'RADIO',
            label: 'What is your favorite programming language?',
            fieldName: 'favorite_language',
            required: true,
            order: 1,
            options: [
              { label: 'JavaScript', value: 'javascript' },
              { label: 'Python', value: 'python' },
              { label: 'TypeScript', value: 'typescript' },
              { label: 'Go', value: 'go' }
            ]
          }
        ]
      }),
      JSON.stringify({
        type: 'poll',
        voteField: 'favorite_language',
        preventDuplicates: true,
        showResultsAfterVote: true,
        trackingMethod: 'session',
        allowChangeVote: false
      }),
      true
    ]);

    templateId = templateResponse.rows[0].id;

    // Create form schema using template
    const formResponse = await pool.query(`
      INSERT INTO form_schemas (
        title,
        admin_id,
        template_id,
        schema_json
      )
      VALUES ($1, (SELECT id FROM users WHERE email = 'admin@example.com'), $2, $3::jsonb)
      RETURNING id
    `, [
      'Test Poll Form',
      templateId,
      JSON.stringify({
        id: 'test-poll-form-001',
        formId: 'test-poll-form-001',
        version: 1,
        isPublished: true,
        fields: [
          {
            id: 'favorite_language',
            type: 'RADIO',
            label: 'What is your favorite programming language?',
            fieldName: 'favorite_language',
            required: true,
            order: 1,
            options: [
              { label: 'JavaScript', value: 'javascript' },
              { label: 'Python', value: 'python' },
              { label: 'TypeScript', value: 'typescript' },
              { label: 'Go', value: 'go' }
            ]
          }
        ]
      })
    ]);

    formSchemaId = formResponse.rows[0].id;

    // Create short link for form
    const shortLinkResponse = await pool.query(`
      INSERT INTO short_links (
        form_schema_id,
        short_code,
        is_active
      )
      VALUES ($1, $2, $3)
      RETURNING short_code
    `, [formSchemaId, 'testpoll123', true]);

    shortCode = shortLinkResponse.rows[0].short_code;
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM form_submissions WHERE form_schema_id = $1', [formSchemaId]);
    await pool.query('DELETE FROM short_links WHERE form_schema_id = $1', [formSchemaId]);
    await pool.query('DELETE FROM form_schemas WHERE id = $1', [formSchemaId]);
    await pool.query('DELETE FROM form_templates WHERE id = $1', [templateId]);
    await pool.end();
  });

  describe('Poll Vote Submission', () => {
    it('should submit a valid vote and return vote metadata', async () => {
      const agent = request.agent(app);

      const response = await agent
        .post(`/api/public/forms/${shortCode}/submit`)
        .send({
          values: {
            favorite_language: 'javascript'
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.submissionId).toBeDefined();
      expect(response.body.data.executorResult).toBeDefined();
      expect(response.body.data.executorResult.data.session_id).toBeDefined();
      expect(response.body.data.executorResult.data.vote_value).toBe('javascript');
      expect(response.body.data.executorResult.data.voted_at).toBeDefined();
    });

    it('should reject duplicate vote from same session', async () => {
      const agent = request.agent(app);

      // First vote
      await agent
        .post(`/api/public/forms/${shortCode}/submit`)
        .send({
          values: {
            favorite_language: 'python'
          }
        });

      // Attempt duplicate vote from same session
      const response = await agent
        .post(`/api/public/forms/${shortCode}/submit`)
        .send({
          values: {
            favorite_language: 'typescript'
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already voted');
    });

    it('should allow votes from different sessions', async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);

      // Vote from session 1
      const response1 = await agent1
        .post(`/api/public/forms/${shortCode}/submit`)
        .send({
          values: {
            favorite_language: 'go'
          }
        });

      // Vote from session 2 (different session)
      const response2 = await agent2
        .post(`/api/public/forms/${shortCode}/submit`)
        .send({
          values: {
            favorite_language: 'python'
          }
        });

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);
      expect(response1.body.data.executorResult.data.session_id).not.toBe(
        response2.body.data.executorResult.data.session_id
      );
    });

    it('should reject vote with missing vote field', async () => {
      const agent = request.agent(app);

      const response = await agent
        .post(`/api/public/forms/${shortCode}/submit`)
        .send({
          values: {}
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject vote with empty vote value', async () => {
      const agent = request.agent(app);

      const response = await agent
        .post(`/api/public/forms/${shortCode}/submit`)
        .send({
          values: {
            favorite_language: ''
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Poll Results Endpoint', () => {
    beforeAll(async () => {
      // Clear previous votes
      await pool.query('DELETE FROM form_submissions WHERE form_schema_id = $1', [formSchemaId]);

      // Submit multiple votes from different sessions to test aggregation
      const votes = [
        { language: 'javascript', count: 5 },
        { language: 'python', count: 3 },
        { language: 'typescript', count: 2 }
      ];

      for (const vote of votes) {
        for (let i = 0; i < vote.count; i++) {
          const agent = request.agent(app);
          await agent
            .post(`/api/public/forms/${shortCode}/submit`)
            .send({
              values: {
                favorite_language: vote.language
              }
            });
        }
      }
    });

    it('should return aggregated poll results with counts and percentages', async () => {
      const response = await request(app)
        .get(`/api/public/forms/${shortCode}/poll-results`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.total_votes).toBe(10);
      expect(response.body.data.vote_counts).toEqual({
        javascript: 5,
        python: 3,
        typescript: 2
      });
      expect(response.body.data.vote_percentages).toEqual({
        javascript: 50, // 5/10 = 50%
        python: 30,     // 3/10 = 30%
        typescript: 20  // 2/10 = 20%
      });
    });

    it('should return zero results for poll with no votes', async () => {
      // Create new poll form without votes
      const newFormResponse = await pool.query(`
        INSERT INTO form_schemas (
          title,
          admin_id,
          template_id,
          schema_json
        )
        VALUES ($1, (SELECT id FROM users WHERE email = 'admin@example.com'), $2, $3::jsonb)
        RETURNING id
      `, [
        'Empty Poll Form',
        templateId,
        JSON.stringify({
          id: 'empty-poll-form-001',
          formId: 'empty-poll-form-001',
          version: 1,
          isPublished: true,
          fields: []
        })
      ]);

      const newFormId = newFormResponse.rows[0].id;

      const shortLinkResponse = await pool.query(`
        INSERT INTO short_links (
          form_schema_id,
          short_code,
          is_active
        )
        VALUES ($1, $2, $3)
        RETURNING short_code
      `, [newFormId, 'emptypoll123', true]);

      const newShortCode = shortLinkResponse.rows[0].short_code;

      const response = await request(app)
        .get(`/api/public/forms/${newShortCode}/poll-results`);

      expect(response.status).toBe(200);
      expect(response.body.data.total_votes).toBe(0);
      expect(response.body.data.vote_counts).toEqual({});
      expect(response.body.data.vote_percentages).toEqual({});

      // Clean up
      await pool.query('DELETE FROM short_links WHERE form_schema_id = $1', [newFormId]);
      await pool.query('DELETE FROM form_schemas WHERE id = $1', [newFormId]);
    });

    it('should return 404 for non-existent poll form', async () => {
      const response = await request(app)
        .get('/api/public/forms/nonexistent123/poll-results');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Vote Aggregation Performance', () => {
    it('should aggregate votes in under 150ms', async () => {
      const startTime = Date.now();

      await request(app)
        .get(`/api/public/forms/${shortCode}/poll-results`);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(150);
    });
  });

  describe('Poll Results Display After Vote', () => {
    it('should include poll results in submission response when showResultsAfterVote is true', async () => {
      const agent = request.agent(app);

      const response = await agent
        .post(`/api/public/forms/${shortCode}/submit`)
        .send({
          values: {
            favorite_language: 'typescript'
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.data.executorResult.data.poll_results).toBeDefined();
      expect(response.body.data.executorResult.data.poll_results.total_votes).toBeGreaterThan(0);
      expect(response.body.data.executorResult.data.poll_results.vote_counts).toBeDefined();
      expect(response.body.data.executorResult.data.poll_results.vote_percentages).toBeDefined();
    });
  });

  describe('Session Persistence', () => {
    it('should maintain session across multiple requests', async () => {
      const agent = request.agent(app);

      // First request - get form
      await agent.get(`/api/public/forms/${shortCode}`);

      // Second request - submit vote
      const submitResponse = await agent
        .post(`/api/public/forms/${shortCode}/submit`)
        .send({
          values: {
            favorite_language: 'go'
          }
        });

      expect(submitResponse.status).toBe(201);

      // Third request - attempt duplicate vote
      const duplicateResponse = await agent
        .post(`/api/public/forms/${shortCode}/submit`)
        .send({
          values: {
            favorite_language: 'python'
          }
        });

      expect(duplicateResponse.status).toBe(400);
      expect(duplicateResponse.body.message).toContain('already voted');
    });
  });
});
