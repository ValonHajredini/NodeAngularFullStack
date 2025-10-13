# Database Seeds and Migrations

This document explains how database migrations and seeding work in the NodeAngularFullStack project.

## Overview

The project uses a custom migration system built with PostgreSQL and TypeScript. Migrations handle
schema changes (creating tables, altering columns, etc.), while seeds populate the database with
initial or test data.

## Database Architecture

### Database Connection

- **Database**: PostgreSQL 14+
- **Connection**: Managed via `apps/api/src/config/database.ts`
- **Pool Configuration**: Connection pooling with health checks
- **Local Development**: Default port 5432

### Database Credentials (Development)

```
Database: nodeangularfullstack_dev
User: dbuser
Password: dbpassword
Host: localhost
Port: 5432
```

## Migrations

### What Are Migrations?

Migrations are version-controlled schema changes that allow you to:

- Create and modify database tables
- Add, remove, or alter columns
- Create indexes and constraints
- Manage database structure evolution over time

### Migration File Structure

Migration files are located in `apps/api/src/migrations/` and follow this naming convention:

```
YYYYMMDDHHMMSS_migration_name.ts
```

Example: `20240101120000_create_users_table.ts`

### Migration File Template

```typescript
import { Pool } from 'pg';

export async function up(pool: Pool): Promise<void> {
  // Forward migration (apply changes)
  await pool.query(`
    CREATE TABLE example (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export async function down(pool: Pool): Promise<void> {
  // Rollback migration (undo changes)
  await pool.query(`DROP TABLE IF EXISTS example;`);
}
```

### Running Migrations

#### Run All Pending Migrations

```bash
npm --workspace=apps/api run db:migrate
```

This command:

1. Connects to PostgreSQL
2. Creates `migrations` tracking table if it doesn't exist
3. Runs all pending migrations in order
4. Records each migration in the `migrations` table

#### Migration Tracking Table

The system automatically creates a `migrations` table:

```sql
CREATE TABLE migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

This table tracks which migrations have been applied.

### Creating a New Migration

1. **Create the migration file** in `apps/api/src/migrations/`:

   ```typescript
   // 20250211143000_add_user_avatar.ts
   import { Pool } from 'pg';

   export async function up(pool: Pool): Promise<void> {
     await pool.query(`
       ALTER TABLE users
       ADD COLUMN avatar_url VARCHAR(500);
     `);
   }

   export async function down(pool: Pool): Promise<void> {
     await pool.query(`
       ALTER TABLE users
       DROP COLUMN IF EXISTS avatar_url;
     `);
   }
   ```

2. **Run the migration**:
   ```bash
   npm --workspace=apps/api run db:migrate
   ```

### Migration Best Practices

1. **Always include both `up` and `down`**: Ensure rollback capability
2. **Use transactions**: Wrap multiple operations in transactions
3. **Test locally first**: Run migrations on local database before production
4. **Backup production**: Always backup before running migrations in production
5. **Idempotent operations**: Use `IF NOT EXISTS` and `IF EXISTS` clauses
6. **Sequential naming**: Use timestamps to ensure proper ordering

### Example Migrations in the Project

#### Create Users Table

```typescript
// apps/api/src/migrations/20240101120000_create_users_table.ts
export async function up(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      role VARCHAR(50) DEFAULT 'user',
      tenant_id UUID,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX idx_users_email ON users(email);
    CREATE INDEX idx_users_tenant_id ON users(tenant_id);
  `);
}
```

## Seeds

### What Are Seeds?

Seeds are scripts that populate the database with initial or test data. They are useful for:

- Creating test user accounts
- Populating lookup tables
- Generating sample data for development
- Resetting database to known state

### Seed File Location

Seed files are located in `apps/api/src/seeds/` directory.

### Running Seeds

#### Seed Database with Test Data

```bash
npm --workspace=apps/api run db:seed
```

This command:

1. Connects to PostgreSQL
2. Executes all seed scripts
3. Creates test users, forms, and sample data

#### Reset Database (Clear + Seed)

```bash
npm --workspace=apps/api run db:reset
```

This command:

1. Drops all tables
2. Runs all migrations (recreates schema)
3. Runs all seeds (repopulates data)

**⚠️ Warning**: `db:reset` destroys all data. Only use in development.

### Seed File Structure

```typescript
// apps/api/src/seeds/001_users.seed.ts
import { Pool } from 'pg';
import bcrypt from 'bcrypt';

export async function seed(pool: Pool): Promise<void> {
  const hashedPassword = await bcrypt.hash('password123', 10);

  await pool.query(
    `
    INSERT INTO users (email, password_hash, first_name, last_name, role)
    VALUES
      ('admin@example.com', $1, 'Admin', 'User', 'admin'),
      ('user@example.com', $1, 'Test', 'User', 'user')
    ON CONFLICT (email) DO NOTHING;
  `,
    [hashedPassword]
  );
}
```

### Example Seeds in the Project

#### Test Users Seed

Creates three test accounts:

- **Admin**: admin@example.com / password123
- **User**: user@example.com / password123
- **ReadOnly**: readonly@example.com / password123

#### Forms Seed

Creates sample forms with:

- Contact forms
- Survey forms
- Registration forms
- Various field types (text, email, dropdown, etc.)

### Seed Best Practices

1. **Idempotent operations**: Use `ON CONFLICT DO NOTHING` to prevent duplicates
2. **Use transactions**: Wrap seed operations in transactions
3. **Order matters**: Name seeds sequentially (001*, 002*, etc.)
4. **Clean data**: Ensure seed data is realistic and useful
5. **Security**: Use bcrypt for password hashing
6. **Foreign keys**: Respect foreign key constraints when inserting related data

## Development Workflow

### Initial Setup

1. **Start PostgreSQL**:

   ```bash
   brew services start postgresql@14
   ```

2. **Create database and user**:

   ```bash
   psql postgres
   CREATE DATABASE nodeangularfullstack_dev;
   CREATE USER dbuser WITH PASSWORD 'dbpassword';
   GRANT ALL PRIVILEGES ON DATABASE nodeangularfullstack_dev TO dbuser;
   \q
   ```

3. **Run migrations**:

   ```bash
   npm --workspace=apps/api run db:migrate
   ```

4. **Seed database**:
   ```bash
   npm --workspace=apps/api run db:seed
   ```

### Full Development Environment

Use the convenience script to start everything:

```bash
npm start
# or
./start-dev.sh
```

This automatically:

- Verifies PostgreSQL connection
- Runs migrations
- Seeds database
- Starts backend API (port 3000)
- Starts frontend (port 4200)
- Starts pgWeb UI (port 8080)

### Reset Database During Development

When you need a fresh database:

```bash
npm --workspace=apps/api run db:reset
```

This is useful when:

- Testing migrations
- Fixing data inconsistencies
- Starting fresh after major changes

## Database Inspection Tools

### pgWeb Database UI

Access the database UI at http://localhost:8080 (when running `npm start`)

Features:

- Browse tables and data
- Execute SQL queries
- View table structure
- Export data

### Command Line

```bash
# Connect to database
psql -U dbuser -d nodeangularfullstack_dev

# List tables
\dt

# Describe table structure
\d table_name

# View migrations history
SELECT * FROM migrations ORDER BY executed_at DESC;
```

## Troubleshooting

### Migration Failed

If a migration fails:

1. Check the error message
2. Fix the migration file
3. Manually remove the failed migration from `migrations` table:
   ```sql
   DELETE FROM migrations WHERE name = 'failed_migration_name';
   ```
4. Re-run migrations

### Database Connection Issues

```bash
# Check PostgreSQL is running
brew services list

# Start PostgreSQL
brew services start postgresql@14

# Check connection
psql -U dbuser -d nodeangularfullstack_dev -c "SELECT 1;"
```

### Reset Everything

If database is in an inconsistent state:

```bash
# Drop and recreate database
psql postgres
DROP DATABASE nodeangularfullstack_dev;
CREATE DATABASE nodeangularfullstack_dev;
GRANT ALL PRIVILEGES ON DATABASE nodeangularfullstack_dev TO dbuser;
\q

# Run migrations and seeds
npm --workspace=apps/api run db:migrate
npm --workspace=apps/api run db:seed
```

## Production Considerations

### Migration Strategy

1. **Backup first**: Always backup production database
2. **Test in staging**: Run migrations in staging environment first
3. **Plan downtime**: Schedule migrations during low-traffic periods
4. **Rollback plan**: Have rollback procedure ready
5. **Monitor**: Watch logs and application behavior after migration

### Seeding in Production

**⚠️ Never run `db:seed` in production** unless:

- It's initial deployment
- Seeds only insert lookup/reference data
- You understand the data will be inserted

Instead:

- Use migrations to insert required reference data
- Manually create production user accounts
- Use data import scripts for bulk data

## Summary

- **Migrations**: Version-controlled schema changes tracked in `migrations` table
- **Seeds**: Test/initial data population for development
- **Commands**: `db:migrate`, `db:seed`, `db:reset`
- **Location**: `apps/api/src/migrations/` and `apps/api/src/seeds/`
- **Workflow**: migrate → seed → develop → repeat
- **Tools**: pgWeb UI, psql command line
- **Safety**: Always backup before production migrations

For more information, see the main [README.md](../README.md) or [CLAUDE.md](../CLAUDE.md).
