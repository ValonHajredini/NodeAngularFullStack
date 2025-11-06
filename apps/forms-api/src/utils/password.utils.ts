import bcrypt from 'bcryptjs';

/**
 * Password utilities for secure hashing and verification.
 * Uses bcrypt with configurable salt rounds for production security.
 */
export class PasswordUtils {
  private static readonly SALT_ROUNDS = 12;

  /**
   * Hashes a plain text password using bcrypt.
   * @param plainPassword - The plain text password to hash
   * @returns Promise containing the hashed password
   * @throws {Error} When hashing fails
   * @example
   * const hashedPassword = await PasswordUtils.hashPassword('myPassword123!');
   */
  static async hashPassword(plainPassword: string): Promise<string> {
    try {
      if (!plainPassword || typeof plainPassword !== 'string') {
        throw new Error('Password must be a non-empty string');
      }

      return await bcrypt.hash(plainPassword, this.SALT_ROUNDS);
    } catch (error) {
      throw new Error(`Password hashing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verifies a plain text password against a hashed password.
   * @param plainPassword - The plain text password to verify
   * @param hashedPassword - The hashed password to compare against
   * @returns Promise containing boolean indicating if passwords match
   * @throws {Error} When verification fails
   * @example
   * const isValid = await PasswordUtils.verifyPassword('myPassword123!', hashedPassword);
   */
  static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    try {
      if (!plainPassword || typeof plainPassword !== 'string') {
        throw new Error('Password must be a non-empty string');
      }

      if (!hashedPassword || typeof hashedPassword !== 'string') {
        throw new Error('Hashed password must be a non-empty string');
      }

      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      throw new Error(`Password verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validates password strength according to security requirements.
   * @param password - The password to validate
   * @returns Object containing validation result and error messages
   * @example
   * const validation = PasswordUtils.validatePassword('MyPassword123!');
   * if (!validation.isValid) {
   *   console.log(validation.errors);
   * }
   */
  static validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!password || typeof password !== 'string') {
      errors.push('Password is required');
      return { isValid: false, errors };
    }

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (password.length > 128) {
      errors.push('Password must be less than 128 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Generates a secure random password meeting all requirements.
   * @param length - Length of the password to generate (default: 16)
   * @returns Randomly generated secure password
   * @example
   * const randomPassword = PasswordUtils.generateSecurePassword(12);
   */
  static generateSecurePassword(length: number = 16): string {
    if (length < 8) {
      throw new Error('Password length must be at least 8 characters');
    }

    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let password = '';

    // Ensure at least one character from each category
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill the rest randomly
    const allChars = uppercase + lowercase + numbers + special;
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password to avoid predictable patterns
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
}