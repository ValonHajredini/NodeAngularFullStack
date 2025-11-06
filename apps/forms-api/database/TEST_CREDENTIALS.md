# Test User Credentials

This document contains the test user credentials that are automatically created during database
seeding in development mode.

## Development Test Users

The following test users are created automatically when running `npm run db:setup` or
`npm run db:seed` in development mode:

### Admin User

- **Email:** admin@example.com
- **Password:** Admin123!@#
- **Role:** admin
- **Status:** Active, Email Verified
- **Description:** Full administrative access with all permissions

### Regular User

- **Email:** user@example.com
- **Password:** User123!@#
- **Role:** user
- **Status:** Active, Email Verified
- **Description:** Standard user with normal permissions

### Readonly User

- **Email:** readonly@example.com
- **Password:** Read123!@#
- **Role:** readonly
- **Status:** Active, Email Verified
- **Description:** Limited access user with read-only permissions

### Inactive User

- **Email:** inactive@example.com
- **Password:** Inactive123!@#
- **Role:** user
- **Status:** Inactive, Email Verified
- **Description:** User account that is disabled (for testing account lockout scenarios)

### Unverified User

- **Email:** unverified@example.com
- **Password:** Unverified123!@#
- **Role:** user
- **Status:** Active, Email Not Verified
- **Description:** User with unverified email (for testing email verification flow)

## API Endpoint

In development mode, these credentials are also available via the API endpoint:

```
GET /api/v1/auth/test-credentials
```

This endpoint returns a JSON response with all test user credentials and is only available when
`NODE_ENV=development`.

## Usage in Testing

These credentials can be used for:

1. **Manual Testing:** Use these credentials to log in and test different user scenarios
2. **Automated Testing:** Reference these credentials in integration tests
3. **Development:** Quick access to users with different permission levels
4. **Demo Purposes:** Showcase different user types and their capabilities

## Security Notes

⚠️ **Important Security Information:**

- These credentials are **only available in development mode**
- The test credentials endpoint returns `404 Not Found` in production
- All test users use bcrypt-hashed passwords with 12 salt rounds
- Test data should be cleared before deploying to production
- Never use these credentials in production environments

## Database Commands

### Seed Test Users

```bash
npm run db:seed
```

### Clear Test Data

```bash
npm run db:reset
```

### Full Database Setup

```bash
npm run db:setup
```

## Multi-tenancy Support

When multi-tenancy is enabled (`ENABLE_MULTI_TENANCY=true`), all test users are created within a
test tenant organization. The tenant information is also included in the API response.

## Password Requirements

All test passwords follow the application's security requirements:

- Minimum 8 characters
- Contains uppercase letters
- Contains lowercase letters
- Contains numbers
- Contains special characters

## Last Updated

This document was last updated: September 20, 2025
