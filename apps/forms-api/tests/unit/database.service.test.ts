import { DatabaseService } from '../../src/services/database.service';

describe('DatabaseService', () => {
  let databaseService: DatabaseService;

  beforeEach(() => {
    databaseService = new DatabaseService();
  });

  afterEach(async () => {
    if (databaseService) {
      await databaseService.close();
    }
  });

  describe('parseConnectionUrl', () => {
    it('should parse a valid PostgreSQL URL', () => {
      const url = 'postgresql://user:pass@localhost:5432/testdb';
      const config = DatabaseService.parseConnectionUrl(url);

      expect(config).toEqual({
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        username: 'user',
        password: 'pass',
        ssl: false,
      });
    });

    it('should parse URL with SSL enabled', () => {
      const url = 'postgresql://user:pass@localhost:5432/testdb?ssl=true';
      const config = DatabaseService.parseConnectionUrl(url);

      expect(config.ssl).toBe(true);
    });

    it('should use default port when not specified', () => {
      const url = 'postgresql://user:pass@localhost/testdb';
      const config = DatabaseService.parseConnectionUrl(url);

      expect(config.port).toBe(5432);
    });

    it('should throw error for invalid URL format', () => {
      const invalidUrl = 'invalid-url';

      expect(() => DatabaseService.parseConnectionUrl(invalidUrl)).toThrow('Invalid database URL format');
    });
  });

  describe('getStatus', () => {
    it('should return disconnected status when not initialized', () => {
      const status = databaseService.getStatus();

      expect(status.isConnected).toBe(false);
      expect(status.totalConnections).toBeUndefined();
      expect(status.idleConnections).toBeUndefined();
      expect(status.waitingClients).toBeUndefined();
    });
  });

  describe('query without connection', () => {
    it('should throw error when querying without initialization', async () => {
      await expect(databaseService.query('SELECT 1')).rejects.toThrow('Database pool not initialized');
    });
  });

  describe('testConnection without initialization', () => {
    it('should throw error when testing connection without initialization', async () => {
      await expect(databaseService.testConnection()).rejects.toThrow('Database pool not initialized');
    });
  });

  describe('getClient without initialization', () => {
    it('should throw error when getting client without initialization', async () => {
      await expect(databaseService.getClient()).rejects.toThrow('Database pool not initialized');
    });
  });
});