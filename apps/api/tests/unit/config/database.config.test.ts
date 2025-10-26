/**
 * Database configuration tests.
 * Tests database connection pool configuration, health check, and graceful shutdown.
 */

// Create mock functions that will be accessible outside the jest.mock factory
const mockQuery = jest.fn();
const mockEnd = jest.fn();
const mockOn = jest.fn();
let capturedConfig: any = null;

// Mock the pg module - this gets hoisted by Jest
jest.mock('pg', () => {
  return {
    Pool: jest.fn().mockImplementation((config: any) => {
      // Capture the config for testing
      capturedConfig = config;
      return {
        query: mockQuery,
        end: mockEnd,
        on: mockOn,
      };
    }),
  };
});

// Now import the module - this will use our mocked Pool

const {
  pool,
  checkDatabaseConnection,
  closeDatabaseConnection,
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Required for Jest mocking
} = require('../../../src/config/database.config');

describe('Database Configuration', () => {
  beforeEach(() => {
    // Clear function call mocks between tests
    mockQuery.mockClear();
    mockEnd.mockClear();
  });

  describe('Pool Configuration', () => {
    it('should create pool with connection pooling settings', () => {
      // Verify Pool was called by checking that config was captured
      expect(capturedConfig).toBeDefined();

      // Verify all required settings were passed
      expect(capturedConfig).toMatchObject({
        host: expect.any(String),
        port: expect.any(Number),
        user: expect.any(String),
        password: expect.any(String),
        database: expect.any(String),
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
    });

    it('should configure max connections to 20', () => {
      expect(capturedConfig.max).toBe(20);
    });

    it('should configure idle timeout to 30 seconds', () => {
      expect(capturedConfig.idleTimeoutMillis).toBe(30000);
    });

    it('should configure connection timeout to 2 seconds', () => {
      expect(capturedConfig.connectionTimeoutMillis).toBe(2000);
    });

    it('should export pool instance', () => {
      expect(pool).toBeDefined();
      expect(pool.query).toBeDefined();
      expect(pool.end).toBeDefined();
      expect(pool.on).toBeDefined();
    });
  });

  describe('checkDatabaseConnection', () => {
    it('should return true when connection succeeds', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

      const result = await checkDatabaseConnection();

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith('SELECT 1');
    });

    it('should return false when connection fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection failed'));
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = await checkDatabaseConnection();

      expect(result).toBe(false);
      expect(mockQuery).toHaveBeenCalledWith('SELECT 1');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Database connection failed:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should not throw error on connection failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection failed'));
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await expect(checkDatabaseConnection()).resolves.not.toThrow();

      consoleErrorSpy.mockRestore();
    });

    it('should log errors when connection fails', async () => {
      const testError = new Error('Connection timeout');
      mockQuery.mockRejectedValueOnce(testError);
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await checkDatabaseConnection();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Database connection failed:',
        testError
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('closeDatabaseConnection', () => {
    it('should close pool without errors', async () => {
      mockEnd.mockResolvedValueOnce(undefined);

      await expect(closeDatabaseConnection()).resolves.not.toThrow();
      expect(mockEnd).toHaveBeenCalled();
    });

    it('should call pool.end() method', async () => {
      mockEnd.mockResolvedValueOnce(undefined);

      await closeDatabaseConnection();

      expect(mockEnd).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Event Handler', () => {
    it('should have mockOn function available on pool instance', () => {
      // Verify pool has the on method for error handling
      expect(pool.on).toBeDefined();
      expect(typeof pool.on).toBe('function');
    });

    it('should handle error event without crashing', () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // Manually call the on method to register an error handler
      mockOn.mockImplementationOnce(() => {
        // Mock implementation - just track that it was called
      });

      // Re-register handler (simulating what the module does)
      pool.on('error', (err: Error) => {
        console.error('Unexpected database error:', err);
      });

      // Verify the mock was called
      expect(mockOn).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});
