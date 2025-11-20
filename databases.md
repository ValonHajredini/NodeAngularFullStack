# Database Configuration

This document provides the database credentials for the multi-database architecture used in this
project.

## Multi-Database Architecture

The application uses a separated database architecture with three PostgreSQL databases:

1. **Auth Database** - Shared authentication and user data
2. **Dashboard Database** - Main dashboard application data
3. **Forms Database** - Form builder application data

## Database Credentials

| Database         | Database Name                    | Host        | Port   | Username | Password     | Purpose                                   |
| ---------------- | -------------------------------- | ----------- | ------ | -------- | ------------ | ----------------------------------------- |
| **Auth DB**      | `nodeangularfullstack_auth`      | `localhost` | `5432` | `dbuser` | `dbpassword` | User authentication, roles, tenants       |
| **Dashboard DB** | `nodeangularfullstack_dashboard` | `localhost` | `5432` | `dbuser` | `dbpassword` | Dashboard application data                |
| **Forms DB**     | `nodeangularfullstack_forms`     | `localhost` | `5432` | `dbuser` | `dbpassword` | Form builder schemas, submissions, themes |

## Connection Details

### PostgreSQL Connection Strings

```bash
# Auth Database
postgresql://dbuser:dbpassword@localhost:5432/nodeangularfullstack_auth

# Dashboard Database
postgresql://dbuser:dbpassword@localhost:5432/nodeangularfullstack_dashboard

# Forms Database
postgresql://dbuser:dbpassword@localhost:5432/nodeangularfullstack_forms
```

### psql Commands

```bash
# Connect to Auth Database
psql -h localhost -p 5432 -U dbuser -d nodeangularfullstack_auth

# Connect to Dashboard Database
psql -h localhost -p 5432 -U dbuser -d nodeangularfullstack_dashboard

# Connect to Forms Database
psql -h localhost -p 5432 -U dbuser -d nodeangularfullstack_forms
```

## Database Schema Overview

### Auth Database (`nodeangularfullstack_auth`)

- **Tables**: `users`, `tenants`, `refresh_tokens`, `password_reset_tokens`
- **Purpose**: Central authentication and user management shared across all services
- **Used By**: dashboard-api, forms-api

### Dashboard Database (`nodeangularfullstack_dashboard`)

- **Tables**: `tool_registry`, `export_jobs`, `short_links`, `user_avatars`
- **Purpose**: Main dashboard application features and tool management
- **Used By**: dashboard-api

### Forms Database (`nodeangularfullstack_forms`)

- **Tables**: `forms`, `form_schemas`, `form_submissions`, `form_themes`
- **Purpose**: Form builder features including schemas, submissions, and themes
- **Used By**: forms-api

## pgWeb Database Management UI

Access pgWeb at: **http://localhost:8080**

**Credentials:**

- Username: `admin`
- Password: `development-password`

You can connect to any of the three databases through the pgWeb interface.

## Security Notes

⚠️ **Development Credentials Only**

The credentials shown above are for development purposes only. In production:

- Use strong, unique passwords
- Enable SSL/TLS connections (`DB_SSL=true`)
- Use environment-specific credentials
- Consider using managed database services
- Implement proper database user roles and permissions
- Enable audit logging for sensitive operations

## Migration Scripts

Database migrations are organized by database:

```
apps/dashboard-api/migrations/
├── auth/       # Auth database migrations
├── dashboard/  # Dashboard database migrations
└── forms/      # Forms database migrations
```

Run migrations with:

```bash
# Run all migrations
npm --workspace=apps/dashboard-api run db:migrate
```

## Database Management Commands

```bash
# Create all databases
./scripts/db/create-separated-databases.sh

# Run migrations for all databases
./scripts/db/run-separated-migrations.sh

# Reset and re-seed databases
npm --workspace=apps/dashboard-api run db:reset

# Backup all databases
pg_dump -U dbuser nodeangularfullstack_auth > backup_auth.sql
pg_dump -U dbuser nodeangularfullstack_dashboard > backup_dashboard.sql
pg_dump -U dbuser nodeangularfullstack_forms > backup_forms.sql
```

## Service Database Mapping

| Service                       | Auth DB       | Dashboard DB  | Forms DB      |
| ----------------------------- | ------------- | ------------- | ------------- |
| **dashboard-api** (port 3000) | ✅ Read/Write | ✅ Read/Write | ❌ No Access  |
| **forms-api** (port 3001)     | ✅ Read Only  | ❌ No Access  | ✅ Read/Write |

### Cross-Database Authentication

Both services use `SharedAuthService` to validate users and tenants across databases:

- **dashboard-api**: Reads from auth DB, writes to dashboard DB
- **forms-api**: Reads from auth DB, writes to forms DB
- **User validation**: Always performed against auth DB
- **Tenant validation**: Always performed against auth DB

## Troubleshooting

### Common Issues

**Connection refused:**

```bash
# Check if PostgreSQL is running
brew services list | grep postgresql

# Start PostgreSQL
brew services start postgresql@14
```

**Permission denied:**

```bash
# Grant privileges to dbuser
GRANT ALL PRIVILEGES ON DATABASE nodeangularfullstack_auth TO dbuser;
GRANT ALL PRIVILEGES ON DATABASE nodeangularfullstack_dashboard TO dbuser;
GRANT ALL PRIVILEGES ON DATABASE nodeangularfullstack_forms TO dbuser;
```

**Database does not exist:**

```bash
# Create databases manually
createdb -U dbuser nodeangularfullstack_auth
createdb -U dbuser nodeangularfullstack_dashboard
createdb -U dbuser nodeangularfullstack_forms
```

## References

- Environment Configuration: `.env.development`
- Database Service: `apps/dashboard-api/src/config/database.service.ts`
- Migration Scripts: `scripts/db/`
- Architecture Documentation: `docs/architecture/database-separation-plan.md`
