/**
 * Seed Quick Poll Template
 * Creates a poll template with duplicate vote prevention and real-time results
 *
 * Epic 29: Form Template System with Business Logic
 * Story 29.14: Poll Template with Vote Aggregation
 */

import { Pool } from 'pg';
import { formsPool } from '../../src/config/multi-database.config';

/**
 * Seeds the Quick Poll template into the database.
 * Template includes a poll question with 6 programming language options.
 *
 * Business Logic Configuration:
 * - Type: poll
 * - Duplicate Prevention: Enabled (session-based)
 * - Show Results After Vote: Enabled
 * - Tracking Method: session
 *
 * @returns Promise that resolves when seeding is complete
 */
export async function seedPollTemplate(): Promise<void> {
  const pool: Pool = formsPool;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if template already exists
    const existing = await client.query(
      `SELECT id FROM form_templates WHERE name = 'Quick Poll'`
    );

    if (existing.rows.length > 0) {
      console.log('✓ Quick Poll template already exists, skipping...');
      await client.query('COMMIT');
      return;
    }

    // Create template schema
    const templateSchema = {
      fields: [
        {
          id: 'poll_question',
          type: 'RADIO',
          label: 'What is your favorite programming language?',
          required: true,
          options: [
            { label: 'JavaScript', value: 'javascript' },
            { label: 'Python', value: 'python' },
            { label: 'Java', value: 'java' },
            { label: 'TypeScript', value: 'typescript' },
            { label: 'Go', value: 'go' },
            { label: 'Rust', value: 'rust' },
          ],
          order: 1,
        },
      ],
    };

    // Create business logic configuration
    const businessLogicConfig = {
      type: 'poll',
      voteField: 'poll_question',
      preventDuplicates: true,
      showResultsAfterVote: true,
      trackingMethod: 'session',
      allowChangeVote: false,
    };

    // Insert template
    await client.query(
      `
      INSERT INTO form_templates (
        name,
        category,
        description,
        template_schema,
        business_logic_config,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `,
      [
        'Quick Poll',
        'POLLS',
        'Simple poll template with duplicate vote prevention and real-time results. Perfect for gathering opinions and feedback.',
        JSON.stringify(templateSchema),
        JSON.stringify(businessLogicConfig),
        true,
      ]
    );

    console.log('✓ Quick Poll template seeded successfully');

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding poll template:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run seed if executed directly
if (require.main === module) {
  seedPollTemplate()
    .then(() => {
      console.log('Poll template seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Poll template seeding failed:', error);
      process.exit(1);
    });
}
