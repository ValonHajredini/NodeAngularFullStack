# Export Jobs Database Schema

**Epic:** 33.1 Export Core Infrastructure **Story:** 33.1.2 Export Jobs Database Schema **Created:**
2025-10-26 **Status:** Active

---

## Table Purpose

The `export_jobs` table tracks the complete lifecycle of tool export operations. It provides:

- **Job Status Tracking**: Real-time status updates for export operations
- **Progress Monitoring**: Step-by-step progress tracking with percentages
- **Audit Trail**: Complete history of job creation, execution, and completion
- **Error Handling**: Detailed error messages and rollback tracking
- **Package Management**: File paths and metadata for generated export packages

## Entity Relationships

```
┌──────────────┐          ┌──────────────┐
│tool_registry │          │    users     │
│──────────────│          │──────────────│
│ tool_id (PK) │◄─────┐   │ user_id (PK) │◄─────┐
└──────────────┘      │   └──────────────┘      │
                      │                         │
                      │                         │
                 ┌────┴─────────────────────────┴────┐
                 │        export_jobs                │
                 │───────────────────────────────────│
                 │ job_id (PK)                       │
                 │ tool_id (FK) ON DELETE CASCADE    │
                 │ user_id (FK) ON DELETE SET NULL   │
                 │ status                            │
                 │ steps_completed                   │
                 │ steps_total                       │
                 │ current_step                      │
                 │ progress_percentage               │
                 │ package_path                      │
                 │ package_size_bytes                │
                 │ error_message                     │
                 │ created_at                        │
                 │ updated_at                        │
                 │ started_at                        │
                 │ completed_at                      │
                 └───────────────────────────────────┘
```

## Table Schema

### Primary Key

| Column   | Type | Constraints                            | Description                  |
| -------- | ---- | -------------------------------------- | ---------------------------- |
| `job_id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique export job identifier |

### Foreign Keys

| Column    | Type | Constraints                                                   | Description               |
| --------- | ---- | ------------------------------------------------------------- | ------------------------- |
| `tool_id` | UUID | NOT NULL, REFERENCES tool_registry(tool_id) ON DELETE CASCADE | Tool being exported       |
| `user_id` | UUID | REFERENCES users(user_id) ON DELETE SET NULL                  | User who initiated export |

**Cascade Behavior:**

- **tool_id CASCADE**: When a tool is deleted, all its export jobs are automatically deleted
- **user_id SET NULL**: When a user is deleted, their export jobs are preserved but user_id is set
  to NULL

### Status Management

| Column   | Type | Constraints                 | Description        |
| -------- | ---- | --------------------------- | ------------------ |
| `status` | ENUM | NOT NULL, DEFAULT 'pending' | Current job status |

**Status ENUM Values:**

- `pending` - Job created, not yet started
- `in_progress` - Job actively executing steps
- `completed` - Job finished successfully
- `failed` - Job failed with error
- `cancelled` - Job cancelled by user
- `cancelling` - Job cancellation in progress
- `rolled_back` - Job rolled back after failure

### Progress Tracking

| Column                | Type         | Constraints                        | Description                        |
| --------------------- | ------------ | ---------------------------------- | ---------------------------------- |
| `steps_completed`     | INTEGER      | NOT NULL, DEFAULT 0                | Number of export steps completed   |
| `steps_total`         | INTEGER      | NOT NULL, DEFAULT 0                | Total number of export steps       |
| `current_step`        | VARCHAR(255) | NULLABLE                           | Description of current export step |
| `progress_percentage` | INTEGER      | NOT NULL, DEFAULT 0, CHECK (0-100) | Calculated progress percentage     |

**CHECK Constraint:** `steps_completed <= steps_total`

### Export Package Information

| Column               | Type         | Constraints            | Description                                           |
| -------------------- | ------------ | ---------------------- | ----------------------------------------------------- |
| `package_path`       | VARCHAR(500) | NULLABLE               | Filesystem path to generated export package (.tar.gz) |
| `package_size_bytes` | BIGINT       | NULLABLE, CHECK (>= 0) | Size of export package in bytes                       |

### Error Handling

| Column          | Type | Constraints | Description                 |
| --------------- | ---- | ----------- | --------------------------- |
| `error_message` | TEXT | NULLABLE    | Error details if job failed |

### Audit Trail

| Column         | Type                     | Constraints             | Description              |
| -------------- | ------------------------ | ----------------------- | ------------------------ |
| `created_at`   | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Job creation timestamp   |
| `updated_at`   | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | Last update timestamp    |
| `started_at`   | TIMESTAMP WITH TIME ZONE | NULLABLE                | Job start timestamp      |
| `completed_at` | TIMESTAMP WITH TIME ZONE | NULLABLE                | Job completion timestamp |

## Status State Machine

```
┌─────────┐
│ pending │
└────┬────┘
     │
     ↓
┌─────────────┐     ┌───────────┐
│ in_progress │ ──→ │ cancelling│
└──────┬──────┘     └─────┬─────┘
       │                  │
    ┌──┴──┐               │
    ↓     ↓               ↓
┌──────┐ ┌──────┐    ┌──────────┐
│completed│failed│    │cancelled │
└────────┘└───┬──┘    └──────────┘
              │
              ↓
        ┌────────────┐
        │rolled_back │
        └────────────┘
```

**State Transitions:**

1. `pending → in_progress` - Job starts executing steps
2. `in_progress → completed` - All steps finished successfully
3. `in_progress → failed` - Step execution error (triggers rollback)
4. `in_progress → cancelling` - User requests cancellation
5. `cancelling → cancelled` - Cancellation completed
6. `failed → rolled_back` - Rollback completed after failure

## Indexes

| Index Name                     | Columns                    | Type        | Purpose                                  |
| ------------------------------ | -------------------------- | ----------- | ---------------------------------------- |
| `export_jobs_pkey`             | job_id                     | PRIMARY KEY | Unique job identifier (O(log n) lookups) |
| `idx_export_jobs_tool_id`      | tool_id                    | B-tree      | Query export jobs for a specific tool    |
| `idx_export_jobs_user_id`      | user_id                    | B-tree      | User export history queries              |
| `idx_export_jobs_status`       | status                     | B-tree      | Filter pending/in_progress jobs          |
| `idx_export_jobs_user_created` | (user_id, created_at DESC) | COMPOSITE   | Sorted user history (index-only scan)    |
| `idx_export_jobs_created_at`   | created_at                 | B-tree      | Cleanup queries (delete old jobs)        |

### Indexing Rationale

**Primary Use Cases:**

1. **Job Polling** (highest frequency): `SELECT * FROM export_jobs WHERE job_id = ?`
   - Uses PRIMARY KEY index (< 1ms)
2. **User History**: `SELECT * FROM export_jobs WHERE user_id = ? ORDER BY created_at DESC`
   - Uses composite index `idx_export_jobs_user_created` (< 50ms)
3. **Job Queue**: `SELECT * FROM export_jobs WHERE status = 'pending' ORDER BY created_at`
   - Uses `idx_export_jobs_status` index (< 100ms)
4. **Cleanup**: `DELETE FROM export_jobs WHERE created_at < ?`
   - Uses `idx_export_jobs_created_at` index (< 500ms)

**Performance Characteristics:**

- All indexes are B-tree (default PostgreSQL index type)
- Composite index enables index-only scans (no table lookup needed)
- Primary key ensures O(log n) lookup complexity
- Indexes optimized for read-heavy workload (exports are infrequent writes)

## Common Query Examples

### 1. Create Export Job

```sql
INSERT INTO export_jobs (
  job_id, tool_id, user_id, status, steps_total, current_step
) VALUES (
  gen_random_uuid(),
  'tool-123',
  'user-456',
  'pending',
  8,
  'Initializing export...'
)
RETURNING *;
```

### 2. Poll Job Status

```sql
SELECT job_id, status, steps_completed, steps_total,
       progress_percentage, current_step, error_message
FROM export_jobs
WHERE job_id = 'job-789';
```

### 3. Update Job Progress

```sql
UPDATE export_jobs
SET status = 'in_progress',
    steps_completed = 3,
    progress_percentage = 37,
    current_step = 'Generating boilerplate...',
    updated_at = NOW()
WHERE job_id = 'job-789'
RETURNING *;
```

### 4. User Export History

```sql
SELECT job_id, tool_id, status, created_at, completed_at
FROM export_jobs
WHERE user_id = 'user-456'
ORDER BY created_at DESC
LIMIT 50;
```

### 5. Find Pending Jobs

```sql
SELECT job_id, tool_id, created_at
FROM export_jobs
WHERE status = 'pending'
ORDER BY created_at ASC;
```

### 6. Cleanup Old Jobs

```sql
DELETE FROM export_jobs
WHERE created_at < NOW() - INTERVAL '30 days'
  AND status IN ('completed', 'failed', 'cancelled', 'rolled_back')
RETURNING job_id;
```

## Performance Expectations

| Query Type             | Expected Performance | Index Used                      |
| ---------------------- | -------------------- | ------------------------------- |
| Find by job_id         | < 1ms                | PRIMARY KEY                     |
| User history (50 jobs) | < 50ms               | Composite (user_id, created_at) |
| Filter by status       | < 100ms              | Status index                    |
| Cleanup old jobs       | < 500ms              | created_at index                |

**Tested with 10,000 export job records**

## Data Integrity Constraints

### CHECK Constraints

1. **Status Validation**

   ```sql
   CONSTRAINT check_status_valid CHECK (
     status IN ('pending', 'in_progress', 'completed', 'failed',
                'cancelled', 'cancelling', 'rolled_back')
   )
   ```

2. **Progress Validation**

   ```sql
   CONSTRAINT check_steps_valid CHECK (steps_completed <= steps_total)
   ```

3. **Percentage Validation**

   ```sql
   CONSTRAINT check_progress_valid CHECK (
     progress_percentage BETWEEN 0 AND 100
   )
   ```

4. **Package Size Validation**
   ```sql
   CONSTRAINT check_package_size_valid CHECK (
     package_size_bytes IS NULL OR package_size_bytes >= 0
   )
   ```

### NOT NULL Constraints

Required fields that cannot be NULL:

- `job_id` - Primary key
- `tool_id` - Must reference a valid tool
- `status` - Job must have a status
- `steps_completed` - Defaults to 0
- `steps_total` - Defaults to 0
- `progress_percentage` - Defaults to 0
- `created_at` - Auto-generated timestamp
- `updated_at` - Auto-generated timestamp

## Migration Strategy

### UP Migration

- File: `apps/api/database/migrations/027_create_export_jobs_table.sql`
- Creates `export_job_status` ENUM type
- Creates `export_jobs` table with all constraints
- Creates all indexes
- Adds table and column comments
- **Idempotent**: Uses `IF NOT EXISTS` checks

### DOWN Migration

- File: `apps/api/database/migrations/DOWN_027_drop_export_jobs_table.sql`
- Drops `export_jobs` table with CASCADE
- Drops `export_job_status` ENUM type
- **Idempotent**: Uses `IF EXISTS` checks

### Rollback Procedure

```bash
# Apply rollback migration
psql -U postgres -d nodeangularfullstack \
  -f apps/api/database/migrations/DOWN_027_drop_export_jobs_table.sql

# Verify table dropped
psql -U postgres -d nodeangularfullstack -c "\d export_jobs"
```

## Troubleshooting

### Issue: Foreign Key Constraint Violation

**Error:** `insert or update on table "export_jobs" violates foreign key constraint`

**Cause:** Attempting to create export job with invalid `tool_id` or `user_id`

**Solution:**

```sql
-- Verify tool exists
SELECT tool_id, name FROM tool_registry WHERE tool_id = 'your-tool-id';

-- Verify user exists
SELECT user_id, email FROM users WHERE user_id = 'your-user-id';
```

### Issue: CHECK Constraint Violation

**Error:** `new row for relation "export_jobs" violates check constraint`

**Cause:** Attempting to set invalid values (e.g., `progress_percentage = 150`)

**Solution:** Ensure:

- `steps_completed <= steps_total`
- `progress_percentage` between 0 and 100
- `package_size_bytes >= 0`
- `status` is a valid ENUM value

### Issue: Slow Query Performance

**Symptoms:** Queries taking > 100ms with 10K+ rows

**Diagnosis:**

```sql
-- Check if indexes are being used
EXPLAIN ANALYZE
SELECT * FROM export_jobs WHERE user_id = 'user-123';

-- Should show "Index Scan using idx_export_jobs_user_id"
```

**Solution:**

- Run `ANALYZE export_jobs` to update statistics
- Check for missing indexes
- Consider adding partial indexes for specific query patterns

## Design Decisions

### Why UUID for job_id?

- Globally unique identifiers (no conflicts across services)
- Prevents job_id guessing (security)
- Supports distributed job creation
- Compatible with microservices architecture

### Why CASCADE for tool_id?

When a tool is deleted, its export jobs become meaningless and should be removed. CASCADE delete
ensures referential integrity and prevents orphaned export jobs.

### Why SET NULL for user_id?

When a user is deleted, we still want to preserve export job history for audit purposes. Setting
`user_id` to NULL retains the job record while removing the user reference.

### Why separate started_at and completed_at?

- `created_at` - Job record creation (may sit in queue)
- `started_at` - Job execution begins
- `completed_at` - Job finishes (success or failure)

This enables calculation of:

- **Queue time**: `started_at - created_at`
- **Execution time**: `completed_at - started_at`
- **Total time**: `completed_at - created_at`

### Why ENUM for status?

- Database-level validation (invalid statuses rejected)
- Query optimization (PostgreSQL can optimize ENUM queries)
- Type safety across frontend and backend
- Self-documenting schema

## Related Documentation

- [Tool Registry Schema](./tool-registry-schema.md) - Foreign key reference
- [Export Orchestrator Service](../stories/33/33.1.1.export-orchestrator-service.md) - Service layer
- [Export Progress Modal](../stories/32/32.2.4.export-progress-modal.md) - Frontend UI

---

**Last Updated:** 2025-10-26 **Maintained By:** Development Team **Review Cycle:** Quarterly
