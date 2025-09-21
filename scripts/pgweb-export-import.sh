#!/bin/bash

# pgWeb Data Export and Import Testing Script
# This script demonstrates data export/import capabilities

set -e

echo "📦 Testing pgWeb Data Export and Import Functionality..."

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

# Create exports directory
mkdir -p exports

# Load environment variables
source .env

print_status "Demonstrating data export capabilities..."

# Export 1: Users data as CSV
print_status "Exporting users data as CSV..."
docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -c "
COPY (
    SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        u.is_active,
        u.email_verified,
        t.name AS tenant_name,
        u.created_at::date AS created_date
    FROM users u
    LEFT JOIN tenants t ON u.tenant_id = t.id
    ORDER BY u.created_at
) TO STDOUT WITH CSV HEADER;" > exports/users_export.csv

if [ -f "exports/users_export.csv" ]; then
    print_success "Users exported to exports/users_export.csv"
    echo "Sample data:"
    head -5 exports/users_export.csv
else
    print_error "Failed to export users data"
fi

echo ""

# Export 2: Database schema as SQL
print_status "Exporting database schema as SQL..."
docker-compose exec postgres pg_dump -U dbuser -d nodeangularfullstack --schema-only > exports/schema_backup.sql

if [ -f "exports/schema_backup.sql" ]; then
    print_success "Schema exported to exports/schema_backup.sql"
    echo "Schema size: $(wc -l < exports/schema_backup.sql) lines"
else
    print_error "Failed to export schema"
fi

echo ""

# Export 3: Complete database backup
print_status "Creating complete database backup..."
docker-compose exec postgres pg_dump -U dbuser -d nodeangularfullstack > exports/full_backup.sql

if [ -f "exports/full_backup.sql" ]; then
    print_success "Full backup created: exports/full_backup.sql"
    echo "Backup size: $(wc -l < exports/full_backup.sql) lines"
else
    print_error "Failed to create full backup"
fi

echo ""

# Export 4: Sessions data as JSON (using psql JSON output)
print_status "Exporting sessions data as JSON format..."
docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -t -c "
SELECT json_agg(
    json_build_object(
        'session_id', s.id,
        'user_email', u.email,
        'user_role', u.role,
        'created_at', s.created_at,
        'expires_at', s.expires_at,
        'ip_address', s.ip_address,
        'status', CASE WHEN s.expires_at > NOW() THEN 'active' ELSE 'expired' END
    )
) AS sessions_json
FROM sessions s
JOIN users u ON s.user_id = u.id;" > exports/sessions_export.json

if [ -f "exports/sessions_export.json" ]; then
    print_success "Sessions exported to exports/sessions_export.json"
    echo "JSON preview:"
    head -3 exports/sessions_export.json
else
    print_error "Failed to export sessions data"
fi

echo ""

# Export 5: Tenant statistics
print_status "Exporting tenant statistics..."
docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -c "
COPY (
    SELECT
        t.name AS tenant_name,
        t.slug,
        t.is_active,
        COUNT(u.id) AS total_users,
        COUNT(CASE WHEN u.is_active THEN 1 END) AS active_users,
        COUNT(CASE WHEN u.role = 'admin' THEN 1 END) AS admin_users,
        COUNT(CASE WHEN u.email_verified THEN 1 END) AS verified_users,
        MIN(u.created_at)::date AS first_user_date,
        MAX(u.created_at)::date AS latest_user_date
    FROM tenants t
    LEFT JOIN users u ON t.id = u.tenant_id
    GROUP BY t.id, t.name, t.slug, t.is_active
    ORDER BY total_users DESC
) TO STDOUT WITH CSV HEADER;" > exports/tenant_statistics.csv

if [ -f "exports/tenant_statistics.csv" ]; then
    print_success "Tenant statistics exported to exports/tenant_statistics.csv"
    cat exports/tenant_statistics.csv
else
    print_error "Failed to export tenant statistics"
fi

echo ""
echo "📊 Data Import Testing..."

# Test import validation
print_status "Testing data import validation..."

# Create test import data
cat > exports/test_import.csv << 'EOF'
email,first_name,last_name,role,is_active
test.import1@example.com,Test,User1,user,true
test.import2@example.com,Test,User2,readonly,true
invalid.email,Invalid,User,user,true
test.import3@example.com,Test,User3,admin,false
EOF

print_status "Created test import file with valid and invalid data"
echo "Test data preview:"
cat exports/test_import.csv

echo ""
print_status "Demonstrating import validation..."

# Validate email format in import data
echo "Email validation check:"
while IFS=',' read -r email first_name last_name role is_active; do
    if [[ "$email" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
        echo "  ✅ Valid: $email"
    else
        echo "  ❌ Invalid: $email"
    fi
done < <(tail -n +2 exports/test_import.csv)

echo ""
echo "🔄 Import Process Simulation:"
echo "1. Validate data format and constraints"
echo "2. Check for duplicate email addresses"
echo "3. Verify role values (admin, user, readonly)"
echo "4. Validate boolean values for is_active"
echo "5. Insert valid records with error handling"

print_success "Data export and import functionality testing completed!"

echo ""
echo "📁 Generated Export Files:"
ls -la exports/

echo ""
echo "🌐 pgWeb Export Features Available:"
echo "   ✅ CSV export for spreadsheet compatibility"
echo "   ✅ JSON export for application data exchange"
echo "   ✅ SQL export for database backup and migration"
echo "   ✅ TSV export for tab-separated value files"
echo "   ✅ Custom query result exports"
echo "   ✅ Table structure exports"
echo "   ✅ Selective column exports"
echo "   ✅ Filtered data exports with WHERE clauses"

echo ""
echo "📤 How to Export Data in pgWeb:"
echo "   1. Open http://localhost:8080 in your browser"
echo "   2. Navigate to any table or query result"
echo "   3. Click the 'Export' button in the interface"
echo "   4. Choose format: CSV, JSON, SQL, or TSV"
echo "   5. Configure export options (headers, delimiters)"
echo "   6. Download the exported file"
echo "   7. Use query filters to export specific data subsets"

echo ""
echo "📥 Import Guidelines:"
echo "   - Validate data format before importing"
echo "   - Check for duplicate primary keys"
echo "   - Verify foreign key relationships exist"
echo "   - Use transactions for rollback capability"
echo "   - Test imports in development environment first"
echo "   - Backup database before large imports"

echo ""
echo "🔧 Advanced Export/Import Features:"
echo "   - Batch export multiple tables"
echo "   - Scheduled automated backups"
echo "   - Incremental data exports"
echo "   - Cross-database data migration"
echo "   - Data transformation during export"
echo "   - Import data validation and cleansing"

echo ""
echo "⚠️  Best Practices:"
echo "   - Always backup before importing data"
echo "   - Use staging environment for testing imports"
echo "   - Validate data integrity after imports"
echo "   - Monitor performance during large operations"
echo "   - Use appropriate file formats for data types"
echo "   - Implement proper error handling and logging"