/**
 * Epic 33.1 Test Fixtures
 * Provides test data for export infrastructure integration tests.
 */

import { Pool } from 'pg';
import { nanoid } from 'nanoid';
import { randomUUID } from 'crypto';

/**
 * Test tool fixture data.
 */
export interface TestToolFixture {
  toolId: string;
  name: string;
  version: string;
  route: string;
  apiBase: string;
  status: 'beta' | 'active' | 'deprecated';
  manifestJson?: any;
}

/**
 * Test form schema fixture data.
 */
export interface TestFormSchemaFixture {
  formId: string;
  schemaId: string;
  title: string;
  description: string;
  fields: any[];
  settings: any;
}

/**
 * Test user fixture data.
 */
export interface TestUserFixture {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user' | 'readonly';
}

/**
 * Create a test tool in the tool_registry table.
 */
export const createTestTool = async (
  pool: Pool,
  data?: Partial<TestToolFixture>
): Promise<TestToolFixture> => {
  const toolId = data?.toolId || randomUUID();
  const name = data?.name || `Test Tool ${nanoid(5)}`;
  const version = data?.version || '1.0.0';
  const route = data?.route || `/tools/test-${nanoid(5)}`;
  const apiBase = data?.apiBase || `/api/test-${nanoid(5)}`;
  const status = data?.status || 'active';
  const manifestJson = data?.manifestJson || {
    formSchemaId: randomUUID(),
    toolType: 'forms',
    config: { toolType: 'forms' },
  };

  const result = await pool.query(
    `
    INSERT INTO tool_registry (tool_id, name, version, route, api_base, status, manifest_json, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING *
  `,
    [
      toolId,
      name,
      version,
      route,
      apiBase,
      status,
      JSON.stringify(manifestJson),
    ]
  );

  return {
    toolId: result.rows[0].tool_id,
    name: result.rows[0].name,
    version: result.rows[0].version,
    route: result.rows[0].route,
    apiBase: result.rows[0].api_base,
    status: result.rows[0].status,
    manifestJson: result.rows[0].manifest_json,
  };
};

/**
 * Create a test form schema with fields.
 * Creates both forms and form_schemas records (two-table structure).
 */
export const createTestFormSchema = async (
  pool: Pool,
  data?: Partial<TestFormSchemaFixture>
): Promise<TestFormSchemaFixture> => {
  const formId = data?.formId || randomUUID();
  const schemaId = data?.schemaId || randomUUID();
  const title = data?.title || `Test Form ${nanoid(5)}`;
  const description = data?.description || 'Test form for integration testing';

  const fields = data?.fields || [
    {
      id: 'field-1',
      type: 'text',
      label: 'Name',
      required: true,
      order: 0,
    },
    {
      id: 'field-2',
      type: 'email',
      label: 'Email',
      required: true,
      order: 1,
    },
    {
      id: 'field-3',
      type: 'textarea',
      label: 'Message',
      required: false,
      order: 2,
    },
  ];

  const settings = data?.settings || {
    submitButtonText: 'Submit',
    successMessage: 'Thank you for your submission!',
    columnLayout: 1,
  };

  // Get admin user for form ownership
  const userResult = await pool.query(
    `SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1`
  );
  const userId =
    userResult.rows.length > 0 ? userResult.rows[0].id : randomUUID();

  // Step 1: Create forms record
  await pool.query(
    `
    INSERT INTO forms (id, user_id, title, description, status, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO NOTHING
  `,
    [formId, userId, title, description, 'draft']
  );

  // Step 2: Create form_schemas record with schema_json
  const schemaJson = {
    fields,
    settings,
  };

  await pool.query(
    `
    INSERT INTO form_schemas (id, form_id, schema_version, schema_json, is_published, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO NOTHING
  `,
    [schemaId, formId, 1, JSON.stringify(schemaJson), false]
  );

  return {
    formId,
    schemaId,
    title,
    description,
    fields,
    settings,
  };
};

/**
 * Create test form submissions for a form schema.
 */
export const createTestFormSubmissions = async (
  pool: Pool,
  formSchemaId: string,
  count: number = 5
): Promise<void> => {
  const submissions = [];
  for (let i = 0; i < count; i++) {
    submissions.push({
      id: randomUUID(),
      form_schema_id: formSchemaId,
      data: {
        'field-1': `Test Name ${i + 1}`,
        'field-2': `test${i + 1}@example.com`,
        'field-3': `Test message ${i + 1}`,
      },
      submitted_at: new Date(),
    });
  }

  for (const submission of submissions) {
    await pool.query(
      `
      INSERT INTO form_submissions (id, form_schema_id, values_json, submitter_ip, submitted_at)
      VALUES ($1, $2, $3, $4, $5)
    `,
      [
        submission.id,
        submission.form_schema_id,
        JSON.stringify(submission.data),
        '127.0.0.1', // Test IP address
        submission.submitted_at,
      ]
    );
  }
};

/**
 * Create a test user.
 */
export const createTestUser = async (
  pool: Pool,
  data?: Partial<TestUserFixture>
): Promise<TestUserFixture> => {
  const userId = data?.id || randomUUID();
  const email = data?.email || `test-user-${nanoid(5)}@example.com`;
  const password = data?.password || 'TestPassword123!';
  const firstName = data?.firstName || 'Test';
  const lastName = data?.lastName || 'User';
  const role = data?.role || 'admin';

  // Note: In real implementation, password should be hashed
  // For testing, we'll use plain text (should match auth-helper.ts patterns)
  const result = await pool.query(
    `
    INSERT INTO users (id, email, password_hash, first_name, last_name, role, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING *
  `,
    [userId, email, password, firstName, lastName, role]
  );

  return {
    id: result.rows[0].id,
    email: result.rows[0].email,
    password: password, // Return plain password for testing
    firstName: result.rows[0].first_name,
    lastName: result.rows[0].last_name,
    role: result.rows[0].role,
  };
};

/**
 * Create a complete test tool with form schema and submissions.
 */
export const createCompleteTestTool = async (
  pool: Pool,
  options?: {
    toolName?: string;
    submissionCount?: number;
  }
): Promise<{ tool: TestToolFixture; formSchema: TestFormSchemaFixture }> => {
  // Create form schema first (creates both forms and form_schemas records)
  const formSchema = await createTestFormSchema(pool, {
    title: options?.toolName || `Test Form ${nanoid(5)}`,
  });

  // Create tool referencing the form schema ID
  const tool = await createTestTool(pool, {
    name: options?.toolName || formSchema.title,
    manifestJson: {
      formSchemaId: formSchema.schemaId,
      formId: formSchema.formId,
      toolType: 'forms',
      config: { toolType: 'forms' },
    },
  });

  // Create form submissions
  const submissionCount = options?.submissionCount ?? 5;
  if (submissionCount > 0) {
    await createTestFormSubmissions(pool, formSchema.schemaId, submissionCount);
  }

  return { tool, formSchema };
};

/**
 * Seed user fixture (matches existing seed data).
 */
export const SEED_USERS = {
  admin: {
    email: 'admin@example.com',
    password: 'Admin123!@#',
    role: 'admin',
  },
  user: {
    email: 'user@example.com',
    password: 'User123!@#',
    role: 'user',
  },
  readonly: {
    email: 'readonly@example.com',
    password: 'Read123!@#',
    role: 'readonly',
  },
};

/**
 * Mock export strategy execution (for testing without real export).
 */
export const mockExportStrategyExecution = {
  forms: {
    steps: [
      { name: 'validate-tool', duration: 100 },
      { name: 'create-working-directory', duration: 50 },
      { name: 'generate-boilerplate', duration: 200 },
      { name: 'copy-form-data', duration: 150 },
      { name: 'generate-docker-config', duration: 100 },
      { name: 'create-package-json', duration: 50 },
      { name: 'create-readme', duration: 50 },
      { name: 'create-archive', duration: 300 },
    ],
    totalDuration: 1000, // 1 second
  },
  workflows: {
    steps: [
      { name: 'validate-tool', duration: 100 },
      { name: 'create-working-directory', duration: 50 },
      { name: 'generate-workflow-engine', duration: 300 },
      { name: 'copy-workflow-definitions', duration: 200 },
      { name: 'generate-docker-config', duration: 100 },
      { name: 'create-package-json', duration: 50 },
      { name: 'create-readme', duration: 50 },
      { name: 'create-archive', duration: 300 },
    ],
    totalDuration: 1150,
  },
  themes: {
    steps: [
      { name: 'validate-tool', duration: 100 },
      { name: 'create-working-directory', duration: 50 },
      { name: 'generate-theme-system', duration: 250 },
      { name: 'copy-theme-assets', duration: 150 },
      { name: 'generate-docker-config', duration: 100 },
      { name: 'create-package-json', duration: 50 },
      { name: 'create-readme', duration: 50 },
      { name: 'create-archive', duration: 300 },
    ],
    totalDuration: 1050,
  },
};
