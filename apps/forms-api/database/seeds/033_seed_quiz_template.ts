import { Pool } from 'pg';

/**
 * Seed quiz assessment template
 *
 * Epic 29: Form Template System with Business Logic
 * Story 29.13: Quiz Template with Scoring Logic
 *
 * Creates a "Quiz Assessment" template with:
 * - 5 multiple choice questions (RADIO type)
 * - Custom point values (higher value for harder questions)
 * - 60% passing score
 * - Immediate results display enabled
 * - Retakes allowed for learning purposes
 */
export async function seedQuizTemplate(pool: Pool): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if template already exists
    const existing = await client.query(
      `SELECT id FROM form_templates WHERE name = 'Quiz Assessment'`
    );

    if (existing.rows.length > 0) {
      console.log('✓ Quiz Assessment template already exists, skipping...');
      await client.query('COMMIT');
      return;
    }

    // Create template schema with 5 quiz questions
    const templateSchema = {
      fields: [
        {
          id: 'q1',
          type: 'radio',
          fieldName: 'q1',
          label: 'What is 2 + 2?',
          required: true,
          options: [
            { label: 'Three', value: 'A' },
            { label: 'Four', value: 'B' },
            { label: 'Five', value: 'C' },
            { label: 'Six', value: 'D' },
          ],
          order: 1,
        },
        {
          id: 'q2',
          type: 'radio',
          fieldName: 'q2',
          label: 'What is the capital of France?',
          required: true,
          options: [
            { label: 'London', value: 'A' },
            { label: 'Berlin', value: 'B' },
            { label: 'Paris', value: 'C' },
            { label: 'Madrid', value: 'D' },
          ],
          order: 2,
        },
        {
          id: 'q3',
          type: 'radio',
          fieldName: 'q3',
          label: 'Which planet is known as the Red Planet?',
          required: true,
          options: [
            { label: 'Mars', value: 'A' },
            { label: 'Venus', value: 'B' },
            { label: 'Jupiter', value: 'C' },
            { label: 'Saturn', value: 'D' },
          ],
          order: 3,
        },
        {
          id: 'q4',
          type: 'radio',
          fieldName: 'q4',
          label: 'What is the largest ocean on Earth?',
          required: true,
          options: [
            { label: 'Atlantic Ocean', value: 'A' },
            { label: 'Indian Ocean', value: 'B' },
            { label: 'Arctic Ocean', value: 'C' },
            { label: 'Pacific Ocean', value: 'D' },
          ],
          order: 4,
        },
        {
          id: 'q5',
          type: 'radio',
          fieldName: 'q5',
          label: 'How many continents are there?',
          required: true,
          options: [
            { label: 'Five', value: 'A' },
            { label: 'Seven', value: 'B' },
            { label: 'Six', value: 'C' },
            { label: 'Eight', value: 'D' },
          ],
          order: 5,
        },
      ],
    };

    // Business logic configuration with scoring rules
    const businessLogicConfig = {
      type: 'quiz',
      scoringRules: [
        { fieldId: 'q1', correctAnswer: 'B', points: 2 }, // Basic math
        { fieldId: 'q2', correctAnswer: 'C', points: 2 }, // Geography
        { fieldId: 'q3', correctAnswer: 'A', points: 2 }, // Science
        { fieldId: 'q4', correctAnswer: 'D', points: 2 }, // Geography
        { fieldId: 'q5', correctAnswer: 'B', points: 2 }, // General knowledge
      ],
      passingScore: 60,
      showResults: true,
      allowRetakes: true,
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
        'Quiz Assessment',
        'quiz',
        'Educational quiz template with automatic scoring and immediate results. Perfect for knowledge assessments, training validation, and self-paced learning.',
        JSON.stringify(templateSchema),
        JSON.stringify(businessLogicConfig),
        true,
      ]
    );

    console.log('✓ Quiz Assessment template seeded successfully');

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding quiz template:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Auto-run if executed directly
if (require.main === module) {
  const { formsPool } = require('../../src/config/multi-database.config');
  seedQuizTemplate(formsPool)
    .then(() => {
      console.log('Seed completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}
