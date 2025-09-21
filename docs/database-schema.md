# Database Schema Documentation

## Overview

This document describes the database schema for the NodeAngularFullStack application, accessible through the pgWeb interface.

## Access Information

- **pgWeb URL**: http://localhost:8080
- **Authentication**: Required (see .env file for credentials)
- **Database**: PostgreSQL 15+ with full ACID compliance

## Database Tables

### 1. Users Table (`users`)

Core user account information with multi-tenancy support.

**Structure:**
- `id` (UUID, Primary Key) - Unique user identifier
- `tenant_id` (UUID, Foreign Key) - Links to tenants table
- `email` (VARCHAR, Unique per tenant) - User's email address
- `password_hash` (VARCHAR) - Bcrypt hashed password
- `first_name` (VARCHAR) - User's first name
- `last_name` (VARCHAR) - User's last name
- `role` (VARCHAR) - User role: 'admin', 'user', 'readonly'
- `created_at` (TIMESTAMP) - Account creation time
- `updated_at` (TIMESTAMP) - Last modification time
- `last_login` (TIMESTAMP) - Last login timestamp
- `is_active` (BOOLEAN) - Account status
- `email_verified` (BOOLEAN) - Email verification status

**Indexes:**
- Primary key on `id`
- Unique constraint on `email` + `tenant_id`
- Indexes on `email`, `tenant_id`, `role`, `is_active`, `created_at`, `last_login`

**Constraints:**
- Email validation regex
- Name length validation (1-100 characters)
- Role validation (admin, user, readonly)

### 2. Tenants Table (`tenants`)

Multi-tenancy configuration and settings.

**Structure:**
- `id` (UUID, Primary Key) - Unique tenant identifier
- `name` (VARCHAR) - Tenant display name
- `slug` (VARCHAR, Unique) - URL-safe tenant identifier
- `settings` (JSONB) - Flexible tenant configuration
- `is_active` (BOOLEAN) - Tenant status
- `created_at` (TIMESTAMP) - Creation time
- `updated_at` (TIMESTAMP) - Last modification time

**Indexes:**
- Primary key on `id`
- Unique constraint on `slug`
- Indexes on `slug`, `is_active`

### 3. Sessions Table (`sessions`)

User authentication session management.

**Structure:**
- `id` (UUID, Primary Key) - Unique session identifier
- `user_id` (UUID, Foreign Key) - Links to users table
- `refresh_token` (VARCHAR) - JWT refresh token
- `expires_at` (TIMESTAMP) - Session expiration time
- `ip_address` (INET) - Client IP address
- `user_agent` (TEXT) - Client user agent string
- `created_at` (TIMESTAMP) - Session creation time

**Relationships:**
- `user_id` → `users.id` (CASCADE DELETE)

### 4. Password Resets Table (`password_resets`)

Password reset token management.

**Structure:**
- `id` (UUID, Primary Key) - Unique reset identifier
- `user_id` (UUID, Foreign Key) - Links to users table
- `token` (VARCHAR) - Reset token
- `expires_at` (TIMESTAMP) - Token expiration time
- `used_at` (TIMESTAMP) - Token usage time
- `created_at` (TIMESTAMP) - Request creation time

**Relationships:**
- `user_id` → `users.id` (CASCADE DELETE)

## Relationships Diagram

```
tenants (1) ←→ (many) users
users (1) ←→ (many) sessions
users (1) ←→ (many) password_resets
```

## Seed Data

The database includes seed data for testing:

1. **Admin User**: admin@example.com (role: admin)
2. **Regular User**: user@example.com (role: user)
3. **Read-Only User**: readonly@example.com (role: readonly)

## pgWeb Interface Features

### Schema Visualization
- Complete table structure view
- Column data types and constraints
- Index information and performance hints
- Foreign key relationships display

### Data Management
- Browse and edit table data
- Filter and search capabilities
- Pagination for large datasets
- Real-time data updates

### Query Interface
- SQL query execution with syntax highlighting
- Query result display with export options
- Query history and saved queries
- Performance analysis tools

### Export/Import
- CSV export for spreadsheet compatibility
- JSON export for application data
- SQL export for database backup
- Import validation and error handling

## Security Considerations

### Access Control
- Authentication required for all operations
- Role-based access restrictions
- Session management and timeouts
- Development-only access by default

### Data Protection
- Password hashing with bcrypt
- Sensitive data masking in UI
- Audit logging for data changes
- Connection encryption (SSL in production)

### Best Practices
- Regular password rotation
- Access monitoring and logging
- Network restriction in production
- Backup and recovery procedures

## Performance Optimization

### Indexing Strategy
- Primary keys on all tables
- Foreign key indexes for relationships
- Composite indexes for common queries
- Partial indexes for filtered queries

### Query Optimization
- Connection pooling configuration
- Query timeout limits
- Result set pagination
- Index utilization analysis

## Usage Examples

### Common Queries

```sql
-- View all active users
SELECT u.email, u.first_name, u.last_name, u.role, t.name as tenant_name
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE u.is_active = true;

-- Check user sessions
SELECT u.email, s.created_at, s.expires_at, s.ip_address
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE s.expires_at > NOW();

-- Tenant user statistics
SELECT t.name, COUNT(u.id) as user_count,
       COUNT(CASE WHEN u.is_active THEN 1 END) as active_users
FROM tenants t
LEFT JOIN users u ON t.id = u.tenant_id
GROUP BY t.id, t.name;
```

### Data Export Examples

- **User Export**: Export user data as CSV for reporting
- **Session Analytics**: Export session data for security analysis
- **Tenant Reports**: Export tenant statistics for management

## Troubleshooting

### Common Issues

1. **Connection Errors**: Verify PostgreSQL container is running
2. **Authentication Failures**: Check pgWeb credentials in .env
3. **Schema Not Visible**: Ensure database migrations are applied
4. **Performance Issues**: Check index usage and query optimization

### Monitoring

- Container health checks for pgWeb availability
- Database connection monitoring
- Query performance analysis
- Error logging and alerting

## Development Workflow

### Database Changes
1. Create migration files for schema changes
2. Test migrations in development environment
3. Verify changes through pgWeb interface
4. Update documentation and seed data
5. Apply migrations to production

### Testing
- Integration tests for pgWeb functionality
- Schema validation tests
- Performance benchmarking
- Security audit procedures

For detailed setup instructions, see the [setup scripts](../scripts/) directory.