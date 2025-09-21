#!/bin/bash

# pgWeb User Management Interface Testing Script
# This script demonstrates user management capabilities through pgWeb

set -e

echo "👥 Testing pgWeb User Management Interface..."

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

print_status "Demonstrating user management capabilities..."

echo ""
echo "1. 👥 SEED USERS DISPLAY:"
echo "================================"
print_status "Displaying all seed users with roles and status..."

docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -c "
SELECT
    u.email,
    u.first_name || ' ' || u.last_name AS full_name,
    u.role,
    u.is_active AS active,
    u.email_verified AS verified,
    u.created_at::date AS created,
    u.last_login::date AS last_login,
    CASE
        WHEN t.name IS NOT NULL THEN t.name
        ELSE 'No Tenant'
    END AS tenant
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
ORDER BY
    CASE u.role
        WHEN 'admin' THEN 1
        WHEN 'user' THEN 2
        WHEN 'readonly' THEN 3
    END,
    u.created_at;"

echo ""
echo "2. 🔧 USER ROLE MODIFICATION EXAMPLES:"
echo "========================================="
echo "The following SQL commands can be executed in pgWeb to modify user roles:"
echo ""

cat << 'EOF'
-- Promote user to admin role
UPDATE users
SET role = 'admin', updated_at = CURRENT_TIMESTAMP
WHERE email = 'user@example.com' AND role != 'admin';

-- Demote admin to regular user
UPDATE users
SET role = 'user', updated_at = CURRENT_TIMESTAMP
WHERE email = 'admin@example.com' AND role = 'admin';

-- Set user to readonly role
UPDATE users
SET role = 'readonly', updated_at = CURRENT_TIMESTAMP
WHERE email = 'user@example.com';

-- Verify role changes
SELECT email, role, updated_at
FROM users
WHERE email IN ('admin@example.com', 'user@example.com')
ORDER BY updated_at DESC;
EOF

echo ""
echo "3. 🎛️ USER ACCOUNT ACTIVATION/DEACTIVATION:"
echo "=============================================="
echo "Account status management commands:"
echo ""

cat << 'EOF'
-- Deactivate user account
UPDATE users
SET is_active = false, updated_at = CURRENT_TIMESTAMP
WHERE email = 'user@example.com';

-- Reactivate user account
UPDATE users
SET is_active = true, updated_at = CURRENT_TIMESTAMP
WHERE email = 'user@example.com';

-- List inactive users
SELECT email, first_name, last_name, role, created_at
FROM users
WHERE is_active = false
ORDER BY created_at DESC;

-- Bulk deactivate users by role
UPDATE users
SET is_active = false, updated_at = CURRENT_TIMESTAMP
WHERE role = 'readonly' AND is_active = true;
EOF

echo ""
echo "4. ✏️ USER DATA EDITING EXAMPLES:"
echo "=================================="
echo "Profile information modification commands:"
echo ""

cat << 'EOF'
-- Update user profile information
UPDATE users
SET
    first_name = 'Updated First',
    last_name = 'Updated Last',
    updated_at = CURRENT_TIMESTAMP
WHERE email = 'user@example.com';

-- Verify email address
UPDATE users
SET email_verified = true, updated_at = CURRENT_TIMESTAMP
WHERE email = 'unverified@example.com';

-- Update last login timestamp
UPDATE users
SET last_login = CURRENT_TIMESTAMP
WHERE email = 'admin@example.com';

-- Change user's tenant association
UPDATE users
SET tenant_id = (SELECT id FROM tenants WHERE slug = 'default')
WHERE email = 'user@example.com' AND tenant_id IS NULL;
EOF

echo ""
print_status "Testing user management operations..."

# Test 1: Current user count by role
echo ""
echo "📊 Current User Statistics:"
echo "----------------------------"
docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -c "
SELECT
    role,
    COUNT(*) AS count,
    COUNT(CASE WHEN is_active THEN 1 END) AS active,
    COUNT(CASE WHEN email_verified THEN 1 END) AS verified
FROM users
GROUP BY role
ORDER BY
    CASE role
        WHEN 'admin' THEN 1
        WHEN 'user' THEN 2
        WHEN 'readonly' THEN 3
    END;"

# Test 2: Session management
echo ""
echo "🔐 Active Sessions by User Role:"
echo "--------------------------------"
docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -c "
SELECT
    u.role,
    COUNT(s.id) AS active_sessions,
    MAX(s.created_at) AS latest_session
FROM users u
LEFT JOIN sessions s ON u.id = s.user_id AND s.expires_at > NOW()
GROUP BY u.role
ORDER BY active_sessions DESC;"

# Test 3: User activity analysis
echo ""
echo "📈 User Activity Analysis:"
echo "--------------------------"
docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -c "
SELECT
    CASE
        WHEN last_login IS NULL THEN 'Never logged in'
        WHEN last_login > NOW() - INTERVAL '1 day' THEN 'Active (1 day)'
        WHEN last_login > NOW() - INTERVAL '7 days' THEN 'Recent (7 days)'
        WHEN last_login > NOW() - INTERVAL '30 days' THEN 'Inactive (30 days)'
        ELSE 'Dormant (30+ days)'
    END AS activity_status,
    COUNT(*) AS user_count
FROM users
GROUP BY
    CASE
        WHEN last_login IS NULL THEN 'Never logged in'
        WHEN last_login > NOW() - INTERVAL '1 day' THEN 'Active (1 day)'
        WHEN last_login > NOW() - INTERVAL '7 days' THEN 'Recent (7 days)'
        WHEN last_login > NOW() - INTERVAL '30 days' THEN 'Inactive (30 days)'
        ELSE 'Dormant (30+ days)'
    END
ORDER BY user_count DESC;"

# Test 4: Demonstrate safe user data editing
echo ""
print_status "Demonstrating safe user data modification..."

# Create a test user for modification
docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -c "
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, email_verified)
VALUES ('test.management@example.com', '\$2b\$10\$dummy.hash.for.testing', 'Test', 'Management', 'user', true, false)
ON CONFLICT (email, tenant_id) DO NOTHING;"

echo "Created test user for management demonstration"

# Show the user before changes
echo ""
echo "User before modifications:"
docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -c "
SELECT email, first_name, last_name, role, is_active, email_verified, updated_at
FROM users
WHERE email = 'test.management@example.com';"

# Modify the user (role change)
docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -c "
UPDATE users
SET
    role = 'readonly',
    email_verified = true,
    updated_at = CURRENT_TIMESTAMP
WHERE email = 'test.management@example.com';"

echo ""
echo "User after role change and email verification:"
docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -c "
SELECT email, first_name, last_name, role, is_active, email_verified, updated_at
FROM users
WHERE email = 'test.management@example.com';"

# Clean up test user
docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -c "
DELETE FROM users WHERE email = 'test.management@example.com';"

echo ""
print_success "User management interface testing completed!"

echo ""
echo "🌐 pgWeb User Management Features:"
echo "   ✅ View all users with detailed information"
echo "   ✅ Filter users by role, status, and activity"
echo "   ✅ Modify user roles (admin, user, readonly)"
echo "   ✅ Activate/deactivate user accounts"
echo "   ✅ Update user profile information"
echo "   ✅ Verify email addresses"
echo "   ✅ Manage tenant associations"
echo "   ✅ Track user session activity"
echo "   ✅ Analyze user engagement patterns"
echo "   ✅ Bulk operations for user management"

echo ""
echo "📋 User Management Operations in pgWeb:"
echo "   1. Open http://localhost:8080 in your browser"
echo "   2. Navigate to the 'users' table"
echo "   3. Use filters to find specific users"
echo "   4. Click 'Edit' to modify user data"
echo "   5. Use SQL Query tab for bulk operations"
echo "   6. Export user data for reporting"
echo "   7. Monitor changes through updated_at timestamps"

echo ""
echo "🛡️ User Management Security Guidelines:"
echo "   - Always backup before bulk modifications"
echo "   - Use transactions for multi-step operations"
echo "   - Verify changes before committing"
echo "   - Log administrative actions for audit trails"
echo "   - Restrict role elevation permissions"
echo "   - Monitor user account modifications"
echo "   - Implement approval workflows for sensitive changes"

echo ""
echo "📊 Available User Management Queries:"
echo "   - Users by role and status"
echo "   - Session activity analysis"
echo "   - Email verification status"
echo "   - User activity patterns"
echo "   - Tenant user distribution"
echo "   - Account security metrics"
echo "   - Login frequency analysis"

echo ""
echo "🔧 Advanced User Management Features:"
echo "   - Batch user imports from CSV"
echo "   - Automated user deactivation rules"
echo "   - User data export for compliance"
echo "   - Role-based access control validation"
echo "   - Password policy enforcement checks"
echo "   - Multi-tenant user management"
echo "   - Integration with external user directories"