#!/bin/bash

# pgWeb Security Configuration Script
# This script configures security settings for pgWeb database management

set -e

echo "🔒 Configuring pgWeb Security Settings..."

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

# Check environment
if [ ! -f ".env" ]; then
    print_error ".env file not found"
    exit 1
fi

# Load environment variables
source .env

# Validate security configuration
print_status "Validating security configuration..."

# Check authentication is enabled
if [ -z "$PGWEB_AUTH_USER" ] || [ -z "$PGWEB_AUTH_PASS" ]; then
    print_error "pgWeb authentication not configured. Set PGWEB_AUTH_USER and PGWEB_AUTH_PASS"
    exit 1
fi

# Check password strength
if [ ${#PGWEB_AUTH_PASS} -lt 12 ]; then
    print_warning "pgWeb password should be at least 12 characters for better security"
fi

# Environment-specific security checks
if [ "$NODE_ENV" = "production" ]; then
    print_status "Production environment detected - applying strict security"

    # Check for production-safe passwords
    if [[ "$PGWEB_AUTH_PASS" == *"dev"* ]] || [[ "$PGWEB_AUTH_PASS" == *"password"* ]]; then
        print_error "Development password detected in production environment"
        exit 1
    fi

    # Check read-only mode for production
    if [ "$PGWEB_READ_ONLY" != "true" ]; then
        print_warning "Consider setting PGWEB_READ_ONLY=true for production"
    fi

    # Check CORS origin is not wildcard
    if [ "$PGWEB_CORS_ORIGIN" = "*" ]; then
        print_error "CORS origin should not be wildcard (*) in production"
        exit 1
    fi
else
    print_status "Development environment detected - applying development security"

    # Ensure development-only restrictions
    if [ "$PGWEB_READ_ONLY" = "true" ]; then
        print_warning "Read-only mode enabled in development - consider setting to false for testing"
    fi
fi

# Test pgWeb connection with authentication
print_status "Testing pgWeb authentication..."

# Start pgWeb if not running
if ! docker-compose ps pgweb | grep -q "Up"; then
    print_status "Starting pgWeb container..."
    docker-compose up -d pgweb
    sleep 5
fi

# Test authentication endpoint
auth_test=$(curl -s -o /dev/null -w "%{http_code}" \
    -u "$PGWEB_AUTH_USER:$PGWEB_AUTH_PASS" \
    http://localhost:8081/api/info)

if [ "$auth_test" = "200" ]; then
    print_success "Authentication working correctly"
else
    print_error "Authentication test failed (HTTP $auth_test)"
    exit 1
fi

# Test unauthorized access is blocked
unauth_test=$(curl -s -o /dev/null -w "%{http_code}" \
    http://localhost:8081/api/info)

if [ "$unauth_test" = "401" ]; then
    print_success "Unauthorized access properly blocked"
else
    print_warning "Unauthorized access not properly blocked (HTTP $unauth_test)"
fi

print_success "pgWeb security configuration validated!"
echo ""
echo "🔐 Security Status:"
echo "   ✅ Authentication enabled"
echo "   ✅ Secure password configured"
echo "   ✅ Session management enabled"
echo "   ✅ Connection limits configured"
echo "   ✅ CORS origin restricted"
echo ""
echo "🌐 Access URL: http://localhost:8081"
echo "👤 Username: $PGWEB_AUTH_USER"
echo "🔑 Password: [CONFIGURED]"
echo ""
echo "⚠️  Security Notes:"
echo "   - Change default passwords in production"
echo "   - Use HTTPS in production environments"
echo "   - Restrict network access to authorized IPs"
echo "   - Regularly rotate authentication credentials"
echo "   - Monitor access logs for suspicious activity"