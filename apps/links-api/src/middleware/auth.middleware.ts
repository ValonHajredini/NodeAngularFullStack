import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

/**
 * User object attached to request after authentication
 */
export interface AuthUser {
  id: string;
  email: string;
  role: string;
  tenantId?: string;
}

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const PLATFORM_API_URL = process.env.PLATFORM_API_URL || 'http://localhost:3000';
const SERVICE_AUTH_TOKEN = process.env.SERVICE_AUTH_TOKEN || '';

/**
 * Authentication middleware for protected routes
 * Validates JWT token with Platform Service
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.replace('Bearer ', '');

    // Validate token with Platform Service
    const response = await axios.post(
      `${PLATFORM_API_URL}/api/auth/validate`,
      { token },
      {
        headers: {
          'X-Service-Token': SERVICE_AUTH_TOKEN,
        },
        timeout: 5000, // 5 second timeout
      }
    );

    // Attach user to request
    req.user = response.data.user;

    next();
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
        return;
      }

      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        console.error('Platform Service unavailable:', error.message);
        res.status(503).json({ error: 'Authentication service unavailable' });
        return;
      }
    }

    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Internal authentication error' });
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token present, but doesn't fail if missing
 */
export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without user
      next();
      return;
    }

    const token = authHeader.replace('Bearer ', '');

    // Attempt to validate token
    const response = await axios.post(
      `${PLATFORM_API_URL}/api/auth/validate`,
      { token },
      {
        headers: {
          'X-Service-Token': SERVICE_AUTH_TOKEN,
        },
        timeout: 5000,
      }
    );

    req.user = response.data.user;
    next();
  } catch (error) {
    // Token validation failed, continue without user
    console.warn('Optional auth failed, continuing without user:', error);
    next();
  }
}
