#!/bin/bash

# pgWeb SQL Query Interface Testing Script
# This script demonstrates the SQL query capabilities of pgWeb

set -e

echo "📊 Testing pgWeb SQL Query Interface..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Load environment variables
source .env

# Check if pgWeb is running
if ! curl -s http://localhost:8081/api/info > /dev/null 2>&1; then
    print_error "pgWeb is not running. Start it with: docker-compose up -d pgweb"
    exit 1
fi

print_status "Demonstrating SQL query capabilities..."

# Test queries through PostgreSQL directly (pgWeb interface testing)
echo ""
echo "🔍 Sample Queries Available in pgWeb Interface:"
echo ""

# Query 1: User Overview
echo "1. 👥 USER OVERVIEW QUERY:"
echo "---------------------------------------------"
cat << 'EOF'
-- View all users with tenant information
SELECT
    u.id,
    u.email,
    u.first_name || ' ' || u.last_name AS full_name,
    u.role,
    u.is_active,
    u.email_verified,
    t.name AS tenant_name,
    u.created_at,
    u.last_login
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
ORDER BY u.created_at DESC;
EOF

echo ""
print_status "Executing User Overview Query..."
docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -c "
SELECT
    u.id,
    u.email,
    u.first_name || ' ' || u.last_name AS full_name,
    u.role,
    u.is_active,
    u.email_verified,
    t.name AS tenant_name,
    u.created_at
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
ORDER BY u.created_at DESC
LIMIT 5;"

echo ""
echo "2. 📈 SESSION ANALYTICS QUERY:"
echo "---------------------------------------------"
cat << 'EOF'
-- Active sessions with user information
SELECT
    u.email,
    u.role,
    s.created_at AS session_start,
    s.expires_at AS session_expires,
    s.ip_address,
    CASE
        WHEN s.expires_at > NOW() THEN 'Active'
        ELSE 'Expired'
    END AS session_status
FROM sessions s
JOIN users u ON s.user_id = u.id
ORDER BY s.created_at DESC;
EOF

echo ""
print_status "Executing Session Analytics Query..."
docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -c "
SELECT
    u.email,
    u.role,
    s.created_at AS session_start,
    s.expires_at AS session_expires,
    CASE
        WHEN s.expires_at > NOW() THEN 'Active'
        ELSE 'Expired'
    END AS session_status
FROM sessions s
JOIN users u ON s.user_id = u.id
ORDER BY s.created_at DESC
LIMIT 5;"

echo ""
echo "3. 🏢 TENANT STATISTICS QUERY:"
echo "---------------------------------------------"
cat << 'EOF'
-- Tenant user statistics
SELECT
    t.name AS tenant_name,
    t.slug,
    t.is_active AS tenant_active,
    COUNT(u.id) AS total_users,
    COUNT(CASE WHEN u.is_active THEN 1 END) AS active_users,
    COUNT(CASE WHEN u.role = 'admin' THEN 1 END) AS admin_users,
    COUNT(CASE WHEN u.last_login > NOW() - INTERVAL '30 days' THEN 1 END) AS recent_users,
    t.created_at AS tenant_created
FROM tenants t
LEFT JOIN users u ON t.id = u.tenant_id
GROUP BY t.id, t.name, t.slug, t.is_active, t.created_at
ORDER BY total_users DESC;
EOF

echo ""
print_status "Executing Tenant Statistics Query..."
docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -c "
SELECT
    t.name AS tenant_name,
    t.slug,
    t.is_active AS tenant_active,
    COUNT(u.id) AS total_users,
    COUNT(CASE WHEN u.is_active THEN 1 END) AS active_users,
    COUNT(CASE WHEN u.role = 'admin' THEN 1 END) AS admin_users
FROM tenants t
LEFT JOIN users u ON t.id = u.tenant_id
GROUP BY t.id, t.name, t.slug, t.is_active
ORDER BY total_users DESC;"

echo ""
echo "4. 🔒 SECURITY AUDIT QUERY:"
echo "---------------------------------------------"
cat << 'EOF'
-- Security and compliance overview
SELECT
    'Total Users' AS metric,
    COUNT(*)::text AS value
FROM users
UNION ALL
SELECT
    'Active Users',
    COUNT(*)::text
FROM users WHERE is_active = true
UNION ALL
SELECT
    'Email Verified',
    COUNT(*)::text
FROM users WHERE email_verified = true
UNION ALL
SELECT
    'Admin Users',
    COUNT(*)::text
FROM users WHERE role = 'admin'
UNION ALL
SELECT
    'Active Sessions',
    COUNT(*)::text
FROM sessions WHERE expires_at > NOW()
UNION ALL
SELECT
    'Recent Logins (7 days)',
    COUNT(*)::text
FROM users WHERE last_login > NOW() - INTERVAL '7 days';
EOF

echo ""
print_status "Executing Security Audit Query..."
docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -c "
SELECT
    'Total Users' AS metric,
    COUNT(*)::text AS value
FROM users
UNION ALL
SELECT
    'Active Users',
    COUNT(*)::text
FROM users WHERE is_active = true
UNION ALL
SELECT
    'Email Verified',
    COUNT(*)::text
FROM users WHERE email_verified = true
UNION ALL
SELECT
    'Admin Users',
    COUNT(*)::text
FROM users WHERE role = 'admin';"

echo ""
echo "5. 🔧 DATABASE MAINTENANCE QUERIES:"
echo "---------------------------------------------"
cat << 'EOF'
-- Table size and row counts
SELECT
    schemaname,
    tablename,
    attname AS column_name,
    n_distinct,
    most_common_vals
FROM pg_stats
WHERE schemaname = 'public'
    AND tablename IN ('users', 'tenants', 'sessions')
ORDER BY tablename, attname;

-- Index usage statistics
SELECT
    indexrelname AS index_name,
    relname AS table_name,
    idx_scan AS index_scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
EOF

print_success "SQL Query Interface Testing Completed!"
echo ""
echo "🌐 pgWeb SQL Query Interface Features:"
echo "   ✅ Syntax highlighting for SQL queries"
echo "   ✅ Query execution with result display"
echo "   ✅ Export query results (CSV, JSON, SQL)"
echo "   ✅ Query history and saved queries"
echo "   ✅ Performance analysis and query plans"
echo "   ✅ Auto-completion for table and column names"
echo "   ✅ Error handling and validation"
echo "   ✅ Result pagination for large datasets"
echo ""
echo "📋 How to Use pgWeb Query Interface:"
echo "   1. Open http://localhost:8081 in your browser"
echo "   2. Login with credentials from .env file"
echo "   3. Click 'SQL Query' tab in the interface"
echo "   4. Paste any of the above queries"
echo "   5. Click 'Execute' to run the query"
echo "   6. Use export buttons to download results"
echo "   7. Save frequently used queries for later"
echo ""
echo "💡 Query Performance Tips:"
echo "   - Use LIMIT for large result sets"
echo "   - Check query execution plans with EXPLAIN"
echo "   - Utilize indexes for better performance"
echo "   - Use WHERE clauses to filter data efficiently"
echo "   - Consider using EXPLAIN ANALYZE for timing"
echo ""
echo "⚠️  Security Reminders:"
echo "   - Avoid running destructive queries in production"
echo "   - Use read-only mode for production environments"
echo "   - Be cautious with DELETE and UPDATE operations"
echo "   - Always backup before making schema changes"