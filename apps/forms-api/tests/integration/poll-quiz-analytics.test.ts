/**
 * Poll and Quiz Analytics Integration Tests
 *
 * Tests end-to-end analytics functionality for poll and quiz templates.
 * Validates repository methods, strategies, and data flow with real database.
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.3: Poll and Quiz Analytics Strategies (Backend)
 */

import { analyticsRepository } from '../../src/repositories/analytics.repository';
import { PollAnalyticsStrategy } from '../../src/services/analytics/strategies/poll-analytics.strategy';
import { QuizAnalyticsStrategy } from '../../src/services/analytics/strategies/quiz-analytics.strategy';
import { formsPool, authPool } from '../../src/config/multi-database.config';
import { PoolClient } from 'pg';

describe('Poll and Quiz Analytics Integration Tests', () => {
  let formsClient: PoolClient;
  let authClient: PoolClient;
  let pollFormSchemaId: string;
  let quizFormSchemaId: string;
  let testFormId: string;
  let testUserId: string;

  beforeAll(async () => {
    formsClient = await formsPool.connect();
    authClient = await authPool.connect();

    // Create test user first (in auth database)
    const userResult = await authClient.query(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, role, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        'test-analytics@example.com',
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

    // Create test form (in forms database)
    const formResult = await formsClient.query(`
      INSERT INTO forms (id, title, description, status, user_id, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        'Test Form',
        'Test form for analytics',
        'published',
        $1,
        NOW(),
        NOW()
      )
      RETURNING id
    `, [testUserId]);
    testFormId = formResult.rows[0].id;

    // Create test form_schemas for poll and quiz (in forms database)
    const pollFormResult = await formsClient.query(`
      INSERT INTO form_schemas (id, form_id, schema_json, schema_version, is_published)
      VALUES (
        gen_random_uuid(),
        $1,
        '{"title": "Test Poll", "fields": [{"type": "radio", "label": "Poll Question"}]}'::jsonb,
        1,
        true
      )
      RETURNING id
    `, [testFormId]);
    pollFormSchemaId = pollFormResult.rows[0].id;

    const quizFormResult = await formsClient.query(`
      INSERT INTO form_schemas (id, form_id, schema_json, schema_version, is_published)
      VALUES (
        gen_random_uuid(),
        $1,
        '{"title": "Test Quiz", "fields": [{"type": "number", "label": "Quiz Score"}]}'::jsonb,
        1,
        true
      )
      RETURNING id
    `, [testFormId]);
    quizFormSchemaId = quizFormResult.rows[0].id;

    // Seed poll submissions (in forms database)
    for (let i = 0; i < 150; i++) {
      const option = i < 75 ? 'Option A' : i < 120 ? 'Option B' : 'Option C';
      await formsClient.query(`
        INSERT INTO form_submissions (form_schema_id, values_json, submitter_ip, submitted_at)
        VALUES ($1, $2, '127.0.0.1', NOW() - INTERVAL '${i} hours')
      `, [pollFormSchemaId, JSON.stringify({ poll_option: option })]);
    }

    // Seed quiz submissions with scores and question responses (in forms database)
    const scores = [85, 90, 75, 55, 40, 95, 80, 70, 65, 50, 88, 92, 78, 60, 45];
    for (const score of scores) {
      const q1 = score >= 60;
      const q2 = score >= 70;
      const q3 = score >= 80;
      await formsClient.query(`
        INSERT INTO form_submissions (form_schema_id, values_json, submitter_ip, submitted_at)
        VALUES ($1, $2, '127.0.0.1', NOW())
      `, [quizFormSchemaId, JSON.stringify({ score, q1, q2, q3 })]);
    }
  });

  afterAll(async () => {
    // Clean up test data (cascade will handle form_submissions and form_schemas)
    await formsClient.query('DELETE FROM forms WHERE id = $1', [testFormId]);
    await authClient.query('DELETE FROM users WHERE id = $1', [testUserId]);

    formsClient.release();
    authClient.release();
    await formsPool.end();
    await authPool.end();
  });

  describe('AnalyticsRepository', () => {
    describe('getPollOptionCounts', () => {
      it('should aggregate poll votes correctly', async () => {
        const result = await analyticsRepository.getPollOptionCounts(
          pollFormSchemaId,
          'poll_option',
          null
        );

        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({ option: 'Option A', count: 75 });
        expect(result[1]).toEqual({ option: 'Option B', count: 45 });
        expect(result[2]).toEqual({ option: 'Option C', count: 30 });
      });

      it('should return empty array for non-existent field key', async () => {
        const result = await analyticsRepository.getPollOptionCounts(
          pollFormSchemaId,
          'nonexistent_field',
          null
        );

        expect(result).toEqual([]);
      });
    });

    describe('getQuizScoreBuckets', () => {
      it('should group scores into histogram buckets', async () => {
        const result = await analyticsRepository.getQuizScoreBuckets(
          quizFormSchemaId,
          'score',
          null
        );

        // Expected distribution from scores: [85, 90, 75, 55, 40, 95, 80, 70, 65, 50, 88, 92, 78, 60, 45]
        // 21-40: 1 (40)
        // 41-60: 4 (55, 50, 45, 60)
        // 61-80: 5 (75, 70, 65, 78, 80)
        // 81-100: 5 (85, 90, 95, 88, 92)
        expect(result.find((r) => r.bucket === '21-40')).toEqual({ bucket: '21-40', count: 1 }); // 40
        expect(result.find((r) => r.bucket === '41-60')).toEqual({ bucket: '41-60', count: 4 }); // 55, 50, 45, 60
        expect(result.find((r) => r.bucket === '61-80')).toEqual({ bucket: '61-80', count: 5 }); // 75, 70, 65, 78, 80
        expect(result.find((r) => r.bucket === '81-100')).toEqual({ bucket: '81-100', count: 5 }); // 85, 90, 95, 88, 92
      });

      it('should handle forms with no valid scores', async () => {
        // Create form with no scores (in forms database)
        const emptyFormResult = await formsClient.query(`
          INSERT INTO form_schemas (id, form_id, schema_json, schema_version, is_published)
          VALUES (
            gen_random_uuid(),
            $1,
            '{"title": "Empty Quiz"}'::jsonb,
            1,
            true
          )
          RETURNING id
        `, [testFormId]);
        const emptyFormId = emptyFormResult.rows[0].id;

        const result = await analyticsRepository.getQuizScoreBuckets(emptyFormId, 'score', null);

        expect(result).toEqual([]);

        // Cleanup
        await formsClient.query('DELETE FROM form_schemas WHERE id = $1', [emptyFormId]);
      });
    });
  });

  describe('PollAnalyticsStrategy', () => {
    let strategy: PollAnalyticsStrategy;

    beforeAll(() => {
      strategy = new PollAnalyticsStrategy(analyticsRepository);
    });

    it('should build complete poll metrics', async () => {
      const metrics = await strategy.buildMetrics(pollFormSchemaId, null);

      expect(metrics.category).toBe('polls');
      expect(metrics.totalSubmissions).toBe(150);
      expect(metrics.voteCounts).toEqual({
        'Option A': 75,
        'Option B': 45,
        'Option C': 30,
      });
      expect(metrics.votePercentages).toEqual({
        'Option A': 50,
        'Option B': 30,
        'Option C': 20,
      });
      expect(metrics.uniqueVoters).toBe(150);
      expect(metrics.mostPopularOption).toBe('Option A');
      expect(metrics.firstSubmissionAt).toBeDefined();
      expect(metrics.lastSubmissionAt).toBeDefined();
    });

    it('should handle zero submissions gracefully', async () => {
      // Create empty form (in forms database)
      const emptyFormResult = await formsClient.query(`
        INSERT INTO form_schemas (id, form_id, schema_json, schema_version, is_published)
        VALUES (
          gen_random_uuid(),
          $1,
          '{"title": "Empty Poll"}'::jsonb,
          1,
          true
        )
        RETURNING id
      `, [testFormId]);
      const emptyFormId = emptyFormResult.rows[0].id;

      const metrics = await strategy.buildMetrics(emptyFormId, null);

      expect(metrics.category).toBe('polls');
      expect(metrics.totalSubmissions).toBe(0);
      expect(metrics.voteCounts).toEqual({});
      expect(metrics.votePercentages).toEqual({});
      expect(metrics.uniqueVoters).toBe(0);
      expect(metrics.mostPopularOption).toBe('');

      // Cleanup
      await formsClient.query('DELETE FROM form_schemas WHERE id = $1', [emptyFormId]);
    });
  });

  describe('QuizAnalyticsStrategy', () => {
    let strategy: QuizAnalyticsStrategy;

    beforeAll(() => {
      strategy = new QuizAnalyticsStrategy(analyticsRepository);
    });

    it('should build complete quiz metrics', async () => {
      const metrics = await strategy.buildMetrics(quizFormSchemaId, null);

      expect(metrics.category).toBe('quiz');
      expect(metrics.totalSubmissions).toBe(15);

      // Statistical validations
      expect(metrics.averageScore).toBeGreaterThan(60);
      expect(metrics.averageScore).toBeLessThan(80);
      expect(metrics.medianScore).toBeGreaterThan(70);
      expect(metrics.medianScore).toBeLessThan(80);
      expect(metrics.passRate).toBeGreaterThan(60); // Most scores are >= 60
      expect(metrics.passRate).toBeLessThan(100);

      // Score distribution validation
      expect(metrics.scoreDistribution).toHaveProperty('41-60');
      expect(metrics.scoreDistribution).toHaveProperty('61-80');
      expect(metrics.scoreDistribution).toHaveProperty('81-100');

      // Question accuracy validation
      expect(metrics.questionAccuracy).toHaveProperty('q1');
      expect(metrics.questionAccuracy).toHaveProperty('q2');
      expect(metrics.questionAccuracy).toHaveProperty('q3');
      expect(metrics.questionAccuracy.q1).toBeGreaterThan(50); // Most scores >= 60
      expect(metrics.questionAccuracy.q2).toBeGreaterThan(40); // Most scores >= 70
      expect(metrics.questionAccuracy.q3).toBeGreaterThan(30); // Most scores >= 80

      // High/low scores
      expect(metrics.highestScore).toBe(95);
      expect(metrics.lowestScore).toBe(40);

      // Timestamps
      expect(metrics.firstSubmissionAt).toBeDefined();
      expect(metrics.lastSubmissionAt).toBeDefined();
    });

    it('should handle zero submissions gracefully', async () => {
      // Create empty quiz (in forms database)
      const emptyQuizResult = await formsClient.query(`
        INSERT INTO form_schemas (id, form_id, schema_json, schema_version, is_published)
        VALUES (
          gen_random_uuid(),
          $1,
          '{"title": "Empty Quiz"}'::jsonb,
          1,
          true
        )
        RETURNING id
      `, [testFormId]);
      const emptyQuizId = emptyQuizResult.rows[0].id;

      const metrics = await strategy.buildMetrics(emptyQuizId, null);

      expect(metrics.category).toBe('quiz');
      expect(metrics.totalSubmissions).toBe(0);
      expect(metrics.averageScore).toBe(0);
      expect(metrics.medianScore).toBe(0);
      expect(metrics.passRate).toBe(0);
      expect(metrics.scoreDistribution).toEqual({});
      expect(metrics.questionAccuracy).toEqual({});
      expect(metrics.highestScore).toBe(0);
      expect(metrics.lowestScore).toBe(0);

      // Cleanup
      await formsClient.query('DELETE FROM form_schemas WHERE id = $1', [emptyQuizId]);
    });
  });

  describe('Performance', () => {
    it('should execute poll analytics in <300ms', async () => {
      const strategy = new PollAnalyticsStrategy(analyticsRepository);

      const startTime = Date.now();
      await strategy.buildMetrics(pollFormSchemaId, null);
      const endTime = Date.now();

      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(300);
    }, 10000);

    it('should execute quiz analytics in <300ms', async () => {
      const strategy = new QuizAnalyticsStrategy(analyticsRepository);

      const startTime = Date.now();
      await strategy.buildMetrics(quizFormSchemaId, null);
      const endTime = Date.now();

      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(300);
    }, 10000);
  });
});
