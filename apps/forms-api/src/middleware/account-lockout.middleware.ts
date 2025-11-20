import { Request, Response, NextFunction } from 'express';

/**
 * Account lockout middleware to prevent brute force attacks on user accounts.
 * Tracks failed login attempts per user account and implements progressive delays.
 */
export class AccountLockoutMiddleware {
  private static readonly attempts = new Map<string, {
    count: number;
    lastAttempt: number;
    lockedUntil?: number;
  }>();

  private static readonly MAX_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION_BASE = 15 * 60 * 1000; // 15 minutes base
  private static readonly ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes window

  /**
   * Middleware to check and enforce account lockout for login attempts.
   * Tracks failed attempts per email address and implements progressive lockout.
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   * @example
   * app.post('/login',
   *   AccountLockoutMiddleware.checkAccountLockout,
   *   authController.login
   * );
   */
  static checkAccountLockout = (req: Request, res: Response, next: NextFunction): void => {
    const email = req.body?.email?.toLowerCase()?.trim();

    if (!email) {
      next();
      return;
    }

    const now = Date.now();
    const userAttempts = AccountLockoutMiddleware.attempts.get(email);

    // Clean up old entries periodically
    AccountLockoutMiddleware.cleanupExpiredEntries(now);

    if (!userAttempts) {
      // First attempt for this user
      next();
      return;
    }

    // Check if account is currently locked
    if (userAttempts.lockedUntil && now < userAttempts.lockedUntil) {
      const remainingTime = Math.ceil((userAttempts.lockedUntil - now) / 1000 / 60);
      res.status(423).json({
        error: 'Account Locked',
        message: `Account is temporarily locked due to too many failed login attempts. Please try again in ${remainingTime} minutes.`,
        lockedUntil: new Date(userAttempts.lockedUntil).toISOString(),
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Check if attempts are within the time window
    if (now - userAttempts.lastAttempt > AccountLockoutMiddleware.ATTEMPT_WINDOW) {
      // Reset attempts if outside the window
      AccountLockoutMiddleware.attempts.set(email, {
        count: 0,
        lastAttempt: now,
      });
    }

    next();
  };

  /**
   * Records a failed login attempt for the given email.
   * Implements progressive lockout with increasing durations.
   * @param email - User email address
   */
  static recordFailedAttempt(email: string): void {
    const normalizedEmail = email.toLowerCase().trim();
    const now = Date.now();
    const userAttempts = AccountLockoutMiddleware.attempts.get(normalizedEmail) || {
      count: 0,
      lastAttempt: now,
    };

    userAttempts.count++;
    userAttempts.lastAttempt = now;

    // Implement progressive lockout
    if (userAttempts.count >= AccountLockoutMiddleware.MAX_ATTEMPTS) {
      // Progressive lockout: 15min, 30min, 1hr, 2hr, 4hr
      const lockoutMultiplier = Math.min(Math.pow(2, userAttempts.count - AccountLockoutMiddleware.MAX_ATTEMPTS), 16);
      const lockoutDuration = AccountLockoutMiddleware.LOCKOUT_DURATION_BASE * lockoutMultiplier;
      userAttempts.lockedUntil = now + lockoutDuration;
    }

    AccountLockoutMiddleware.attempts.set(normalizedEmail, userAttempts);
  }

  /**
   * Records a successful login attempt for the given email.
   * Clears any failed attempt history.
   * @param email - User email address
   */
  static recordSuccessfulLogin(email: string): void {
    const normalizedEmail = email.toLowerCase().trim();
    AccountLockoutMiddleware.attempts.delete(normalizedEmail);
  }

  /**
   * Gets the current lockout status for an email address.
   * @param email - User email address
   * @returns Lockout status information
   */
  static getLockoutStatus(email: string): {
    isLocked: boolean;
    attemptsRemaining: number;
    lockedUntil?: Date;
    nextAttemptIn?: number;
  } {
    const normalizedEmail = email.toLowerCase().trim();
    const userAttempts = AccountLockoutMiddleware.attempts.get(normalizedEmail);
    const now = Date.now();

    if (!userAttempts) {
      return {
        isLocked: false,
        attemptsRemaining: AccountLockoutMiddleware.MAX_ATTEMPTS,
      };
    }

    const isLocked = userAttempts.lockedUntil ? now < userAttempts.lockedUntil : false;
    const attemptsRemaining = Math.max(0, AccountLockoutMiddleware.MAX_ATTEMPTS - userAttempts.count);

    return {
      isLocked,
      attemptsRemaining,
      lockedUntil: userAttempts.lockedUntil ? new Date(userAttempts.lockedUntil) : undefined,
      nextAttemptIn: isLocked && userAttempts.lockedUntil ?
        Math.ceil((userAttempts.lockedUntil - now) / 1000) : undefined,
    };
  }

  /**
   * Manually unlocks an account (for admin use).
   * @param email - User email address
   */
  static unlockAccount(email: string): void {
    const normalizedEmail = email.toLowerCase().trim();
    AccountLockoutMiddleware.attempts.delete(normalizedEmail);
  }

  /**
   * Cleans up expired entries from the attempts map.
   * @param now - Current timestamp
   * @private
   */
  private static cleanupExpiredEntries(now: number): void {
    for (const [email, attempts] of AccountLockoutMiddleware.attempts.entries()) {
      // Remove entries that are older than the attempt window and not locked
      if (!attempts.lockedUntil && (now - attempts.lastAttempt > AccountLockoutMiddleware.ATTEMPT_WINDOW)) {
        AccountLockoutMiddleware.attempts.delete(email);
      }
      // Remove entries where lockout has expired
      else if (attempts.lockedUntil && now > attempts.lockedUntil) {
        AccountLockoutMiddleware.attempts.delete(email);
      }
    }
  }

  /**
   * Gets statistics about current lockout state (for monitoring).
   * @returns Statistics object
   */
  static getStatistics(): {
    totalTrackedAccounts: number;
    lockedAccounts: number;
    accountsWithFailedAttempts: number;
  } {
    const now = Date.now();
    let lockedAccounts = 0;
    let accountsWithFailedAttempts = 0;

    for (const attempts of AccountLockoutMiddleware.attempts.values()) {
      if (attempts.lockedUntil && now < attempts.lockedUntil) {
        lockedAccounts++;
      }
      if (attempts.count > 0) {
        accountsWithFailedAttempts++;
      }
    }

    return {
      totalTrackedAccounts: AccountLockoutMiddleware.attempts.size,
      lockedAccounts,
      accountsWithFailedAttempts,
    };
  }
}