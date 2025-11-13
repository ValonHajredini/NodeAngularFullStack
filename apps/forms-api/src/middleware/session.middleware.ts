/**
 * Express Session Middleware
 * Provides session management for public form submissions (poll voting, etc.)
 * Sessions stored in PostgreSQL for persistence across server restarts
 *
 * @module middleware/session
 * @since Epic 29, Story 29.14
 * @source docs/architecture/backend-architecture.md (Session Management)
 */

import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from '../config/database.config';

/**
 * PostgreSQL session store
 * Uses connect-pg-simple for session persistence in database
 */
const PgSession = connectPgSimple(session);

/**
 * Session middleware configuration
 * Stores session data in PostgreSQL for duplicate vote prevention
 *
 * @example
 * ```typescript
 * // Apply to router
 * import { sessionMiddleware } from '../middleware/session.middleware';
 * router.use(sessionMiddleware);
 *
 * // Access session ID in route handler
 * router.post('/vote', (req, res) => {
 *   const sessionId = req.session.id;
 *   // Use sessionId for duplicate prevention
 * });
 * ```
 */
export const sessionMiddleware = session({
  store: new PgSession({
    pool,
    tableName: 'session',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || 'forms-api-session-secret-change-in-production',
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
  name: 'forms.sid', // Custom session cookie name
});
