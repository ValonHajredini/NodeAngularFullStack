# Account Lockout Troubleshooting

## Overview

The application includes an **account lockout mechanism** to protect against brute force attacks.
After multiple failed login attempts, accounts are temporarily locked to prevent unauthorized
access.

## Lockout Behavior

### Configuration

- **Maximum attempts**: 5 failed login attempts
- **Time window**: 15 minutes
- **Base lockout duration**: 15 minutes
- **Progressive lockout**: Duration doubles with each subsequent lockout (15min → 30min → 1hr → 2hr
  → 4hr)

### Lockout Triggers

An account is locked when:

1. **5 or more failed login attempts** occur within a 15-minute window
2. Each failed attempt is tracked per email address (case-insensitive)
3. The lockout applies to the **email address**, not the user session

### Lockout Response

When an account is locked, login attempts return:

- **HTTP Status**: 423 (Locked)
- **Error message**: "Account is temporarily locked due to too many failed login attempts. Please
  try again in X minutes."
- **Lockout expiry**: ISO timestamp indicating when the lockout expires

## Troubleshooting

### Symptoms

- Unable to log in despite correct credentials
- Error message: "Account is temporarily locked due to too many failed login attempts"
- HTTP 423 response from login endpoint

### Quick Fix: Unlock Account (Development Only)

#### Option 1: Use the Unlock Script (Recommended)

```bash
# Unlock all test accounts
npm run dev:unlock-accounts

# Unlock specific account
./scripts/unlock-account.sh user@example.com
```

#### Option 2: Use the API Endpoint Directly

```bash
# Unlock a specific account
curl -X POST http://localhost:3000/api/v1/auth/dev/unlock-account \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com"}'
```

#### Option 3: Restart the Server

Since lockout state is stored **in-memory**, restarting the API server will clear all lockouts:

```bash
# Stop and start development environment
npm stop
npm start

# Or restart just the API
pkill -f "node.*api"
npm run dev:api
```

### Production Considerations

⚠️ **Important**: The unlock endpoint is **development-only** and returns 404 in production mode.

In production environments, you have these options:

1. **Wait for auto-unlock**: Lockouts expire automatically after the lockout duration
2. **Database-backed lockout**: Consider implementing persistent lockout storage for production
3. **Admin tools**: Build an admin interface to manage locked accounts
4. **Monitoring**: Set up alerts for excessive lockout events (potential attack indicator)

## Prevention Tips

### For Developers

1. **Use correct credentials**: Check `npm run dev:test-credentials` for test user passwords
2. **Clear browser cache**: Old tokens can cause authentication failures
3. **Check environment**: Ensure `.env.development` is loaded correctly
4. **Monitor logs**: Backend logs show failed login attempts

### Test Credentials (Development)

```bash
# Get test credentials
curl http://localhost:3000/api/v1/auth/test-credentials

# Default test accounts
admin@example.com / Admin123!@#
user@example.com / User123!@#
readonly@example.com / Read123!@#
```

## Implementation Details

### In-Memory Storage

The current implementation uses an in-memory Map to track failed attempts:

**Pros**:

- Fast lookups
- No database overhead
- Automatic cleanup on server restart

**Cons**:

- Lost on server restart
- Not shared across multiple server instances
- Not persistent

### Cleanup Mechanism

The system automatically cleans up expired lockout entries:

- Entries older than 15 minutes (outside attempt window) are removed
- Expired lockouts are cleaned up automatically
- Cleanup runs on each lockout check

### Security Features

- **Progressive lockout**: Duration increases with repeated violations
- **Email normalization**: Case-insensitive email matching
- **Attempt window**: Failed attempts outside the 15-minute window don't count
- **Automatic expiry**: Lockouts expire automatically after the duration

## Related Files

- `apps/api/src/middleware/account-lockout.middleware.ts` - Lockout implementation
- `apps/api/src/controllers/auth.controller.ts` - Auth controller with unlock endpoint
- `apps/api/src/routes/auth.routes.ts` - Auth routes including `/dev/unlock-account`
- `scripts/unlock-account.sh` - Helper script to unlock accounts

## Future Enhancements

Consider these improvements for production:

1. **Database persistence**: Store lockout state in PostgreSQL
2. **Redis caching**: Use Redis for distributed lockout state
3. **IP-based lockout**: Track and limit attempts per IP address
4. **CAPTCHA integration**: Require CAPTCHA after 3 failed attempts
5. **Email notifications**: Notify users when their account is locked
6. **Admin dashboard**: Web UI to manage locked accounts
7. **Audit logging**: Track all lockout events for security monitoring

## References

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [NIST Digital Identity Guidelines - Account Recovery](https://pages.nist.gov/800-63-3/sp800-63b.html#sec5)
