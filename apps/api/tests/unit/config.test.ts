import { getConfig } from '../../src/utils/config.utils';

describe('Config Utils', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getConfig', () => {
    it('should return default configuration for development', () => {
      process.env.NODE_ENV = 'development';
      process.env.PORT = '3000'; // Explicitly set PORT for test
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';
      process.env.JWT_SECRET = 'test-secret-key-at-least-32-chars';
      process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars';

      const config = getConfig();

      expect(config.NODE_ENV).toBe('development');
      expect(config.PORT).toBe(3000);
      expect(config.FRONTEND_URL).toBe('http://localhost:4200');
      expect(config.DATABASE_URL).toBe('postgresql://user:pass@localhost:5432/test');
    });

    it('should throw error when required variables are missing', () => {
      delete process.env.DATABASE_URL;
      delete process.env.JWT_SECRET;

      expect(() => getConfig()).toThrow('Missing required environment variables');
    });

    it('should validate PORT is a valid number', () => {
      process.env.PORT = 'invalid';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';
      process.env.JWT_SECRET = 'test-secret-key-at-least-32-chars';
      process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars';

      expect(() => getConfig()).toThrow('PORT must be a valid number');
    });

    it('should validate NODE_ENV is valid', () => {
      process.env.NODE_ENV = 'invalid';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';
      process.env.JWT_SECRET = 'test-secret-key-at-least-32-chars';
      process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars';

      expect(() => getConfig()).toThrow('NODE_ENV must be one of');
    });

    it('should enforce production-specific validations', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';
      process.env.JWT_SECRET = 'short'; // Too short for production
      process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars';

      expect(() => getConfig()).toThrow('JWT_SECRET must be at least 32 characters long');
    });

    it('should require HTTPS for FRONTEND_URL in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.FRONTEND_URL = 'http://example.com'; // HTTP not allowed in production
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';
      process.env.JWT_SECRET = 'test-secret-key-at-least-32-chars';
      process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars';

      expect(() => getConfig()).toThrow('FRONTEND_URL must use HTTPS in production');
    });
  });
});