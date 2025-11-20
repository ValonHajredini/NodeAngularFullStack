/**
 * Analytics Query Profiling Script
 *
 * Profiles poll and quiz analytics queries with EXPLAIN ANALYZE
 * to ensure they meet <300ms performance targets.
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.3: Poll and Quiz Analytics Strategies (Backend)
 *
 * Usage:
 *   npx ts-node scripts/profile-analytics-queries.ts
 */

import { Pool } from 'pg';
import { formsPool } from '../src/config/multi-database.config';

interface QueryProfile {
  queryName: string;
  executionTimeMs: number;
  planningTimeMs: number;
  totalTimeMs: number;
  rowsReturned: number;
  explain: string;
}

/**
 * Profiles a SQL query using EXPLAIN ANALYZE.
 */
async function profileQuery(
  pool: Pool,
  queryName: string,
  query: string,
  params: unknown[]
): Promise<QueryProfile> {
  const client = await pool.connect();

  try {
    const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
    const result = await client.query(explainQuery, params);

    const plan = result.rows[0]['QUERY PLAN'][0];
    const executionTime = plan['Execution Time'];
    const planningTime = plan['Planning Time'];
    const totalTime = executionTime + planningTime;
    const rowsReturned = plan['Plan']['Actual Rows'] || 0;

    return {
      queryName,
      executionTimeMs: Math.round(executionTime * 100) / 100,
      planningTimeMs: Math.round(planningTime * 100) / 100,
      totalTimeMs: Math.round(totalTime * 100) / 100,
      rowsReturned,
      explain: JSON.stringify(plan, null, 2),
    };
  } finally {
    client.release();
  }
}

/**
 * Profiles poll option counts query.
 */
async function profilePollQuery(formSchemaId: string): Promise<QueryProfile> {
  const query = `
    SELECT
      fs.values_json ->> $2 as option,
      COUNT(*) as count
    FROM form_submissions fs
    INNER JOIN form_schemas fsch ON fs.form_schema_id = fsch.id
    WHERE fs.form_schema_id = $1
      AND fs.values_json ? $2
    GROUP BY fs.values_json ->> $2
    ORDER BY count DESC
  `;

  return profileQuery(formsPool, 'getPollOptionCounts', query, [formSchemaId, 'poll_option']);
}

/**
 * Profiles quiz score buckets query.
 */
async function profileQuizQuery(formSchemaId: string): Promise<QueryProfile> {
  const query = `
    SELECT
      CASE
        WHEN (fs.values_json ->> $2)::numeric BETWEEN 0 AND 20 THEN '0-20'
        WHEN (fs.values_json ->> $2)::numeric BETWEEN 21 AND 40 THEN '21-40'
        WHEN (fs.values_json ->> $2)::numeric BETWEEN 41 AND 60 THEN '41-60'
        WHEN (fs.values_json ->> $2)::numeric BETWEEN 61 AND 80 THEN '61-80'
        WHEN (fs.values_json ->> $2)::numeric BETWEEN 81 AND 100 THEN '81-100'
      END as bucket,
      COUNT(*) as count
    FROM form_submissions fs
    INNER JOIN form_schemas fsch ON fs.form_schema_id = fsch.id
    WHERE fs.form_schema_id = $1
      AND fs.values_json ? $2
      AND fs.values_json ->> $2 ~ '^[0-9]+(\\.[0-9]+)?$'
    GROUP BY bucket
    ORDER BY bucket ASC
  `;

  return profileQuery(formsPool, 'getQuizScoreBuckets', query, [formSchemaId, 'score']);
}

/**
 * Main profiling function.
 */
async function main() {
  console.log('='.repeat(80));
  console.log('Analytics Query Performance Profiling');
  console.log('='.repeat(80));
  console.log('');

  try {
    // Note: Replace with actual form_schema_id from your database
    const pollFormId = 'poll-form-id-placeholder';
    const quizFormId = 'quiz-form-id-placeholder';

    console.log('Profiling Poll Analytics Query...');
    const pollProfile = await profilePollQuery(pollFormId);
    console.log(`  Query: ${pollProfile.queryName}`);
    console.log(`  Execution Time: ${pollProfile.executionTimeMs}ms`);
    console.log(`  Planning Time: ${pollProfile.planningTimeMs}ms`);
    console.log(`  Total Time: ${pollProfile.totalTimeMs}ms`);
    console.log(`  Rows Returned: ${pollProfile.rowsReturned}`);
    console.log(`  Status: ${pollProfile.totalTimeMs < 300 ? '✓ PASS' : '✗ FAIL'} (<300ms target)`);
    console.log('');

    console.log('Profiling Quiz Analytics Query...');
    const quizProfile = await profileQuizQuery(quizFormId);
    console.log(`  Query: ${quizProfile.queryName}`);
    console.log(`  Execution Time: ${quizProfile.executionTimeMs}ms`);
    console.log(`  Planning Time: ${quizProfile.planningTimeMs}ms`);
    console.log(`  Total Time: ${quizProfile.totalTimeMs}ms`);
    console.log(`  Rows Returned: ${quizProfile.rowsReturned}`);
    console.log(`  Status: ${quizProfile.totalTimeMs < 300 ? '✓ PASS' : '✗ FAIL'} (<300ms target)`);
    console.log('');

    console.log('='.repeat(80));
    console.log('Summary');
    console.log('='.repeat(80));
    console.log(`Poll Query: ${pollProfile.totalTimeMs}ms (Target: <300ms)`);
    console.log(`Quiz Query: ${quizProfile.totalTimeMs}ms (Target: <300ms)`);

    if (pollProfile.totalTimeMs < 300 && quizProfile.totalTimeMs < 300) {
      console.log('');
      console.log('✓ All queries meet performance targets!');
      process.exit(0);
    } else {
      console.log('');
      console.log('✗ Some queries exceed performance targets. Review EXPLAIN output above.');
      process.exit(1);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error profiling queries:', errorMessage);
    console.error('');
    console.error('Note: This script requires seeded poll/quiz forms in the database.');
    console.error('Run database seeds first: npm --workspace=apps/forms-api run db:seed');
    process.exit(1);
  } finally {
    await formsPool.end();
  }
}

main();
