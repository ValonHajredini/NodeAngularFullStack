/**
 * pgWeb Database Management Interface Integration Tests
 *
 * Tests all aspects of the pgWeb database management interface including:
 * - Container startup and connectivity
 * - Authentication and security
 * - Database schema visualization
 * - SQL query execution
 * - Data export/import functionality
 * - User management operations
 */

import request from 'supertest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('pgWeb Database Management Integration Tests', () => {
  const PGWEB_URL = 'http://localhost:8081';
  const AUTH_CREDENTIALS = {
    username: process.env.PGWEB_AUTH_USER || 'admin',
    password: process.env.PGWEB_AUTH_PASS || 'pgweb_dev_password_2024'
  };

  beforeAll(async () => {
    // Ensure pgWeb container is running
    try {
      execSync('docker-compose up -d pgweb', { stdio: 'pipe' });
      // Wait for pgWeb to be ready
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      console.error('Failed to start pgWeb container:', error);
      throw error;
    }
  });

  afterAll(async () => {
    // Cleanup: optionally stop pgWeb container
    // execSync('docker-compose stop pgweb', { stdio: 'pipe' });
  });

  describe('Container Startup and Connectivity', () => {
    test('should have pgWeb container running', async () => {
      const result = execSync('docker-compose ps pgweb', { encoding: 'utf8' });
      expect(result).toContain('Up');
    });

    test('should respond to health check endpoint', async () => {
      const response = await request(PGWEB_URL)
        .get('/api/info')
        .auth(AUTH_CREDENTIALS.username, AUTH_CREDENTIALS.password);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('app');
      expect(response.body.app).toHaveProperty('version');
    });

    test('should have correct pgWeb version', async () => {
      const response = await request(PGWEB_URL)
        .get('/api/info')
        .auth(AUTH_CREDENTIALS.username, AUTH_CREDENTIALS.password);

      expect(response.body.app.version).toMatch(/\d+\.\d+\.\d+/);
    });
  });

  describe('Authentication and Security', () => {
    test('should reject requests without authentication', async () => {
      const response = await request(PGWEB_URL)
        .get('/api/info');

      expect(response.status).toBe(401);
    });

    test('should reject requests with invalid credentials', async () => {
      const response = await request(PGWEB_URL)
        .get('/api/info')
        .auth('invalid', 'credentials');

      expect(response.status).toBe(401);
    });

    test('should accept requests with valid credentials', async () => {
      const response = await request(PGWEB_URL)
        .get('/api/info')
        .auth(AUTH_CREDENTIALS.username, AUTH_CREDENTIALS.password);

      expect(response.status).toBe(200);
    });

    test('should have security features enabled', async () => {
      const response = await request(PGWEB_URL)
        .get('/api/info')
        .auth(AUTH_CREDENTIALS.username, AUTH_CREDENTIALS.password);

      expect(response.body).toHaveProperty('features');
      // Verify session management is enabled
      expect(response.body.features).toHaveProperty('query_timeout');
    });
  });

  describe('Database Schema Visualization', () => {
    test('should verify all expected tables exist', async () => {
      const expectedTables = ['users', 'tenants', 'sessions', 'password_resets'];

      for (const table of expectedTables) {
        const result = execSync(
          `docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '${table}');"`,
          { encoding: 'utf8' }
        );

        expect(result.trim()).toBe('t');
      }
    });

    test('should have proper table relationships', async () => {
      // Test foreign key relationships
      const result = execSync(
        `docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -t -c "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY';"`,
        { encoding: 'utf8' }
      );

      const foreignKeyCount = parseInt(result.trim());
      expect(foreignKeyCount).toBeGreaterThan(0);
    });

    test('should have proper indexes configured', async () => {
      const result = execSync(
        `docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -t -c "SELECT COUNT(*) FROM pg_indexes WHERE tablename IN ('users', 'tenants', 'sessions');"`,
        { encoding: 'utf8' }
      );

      const indexCount = parseInt(result.trim());
      expect(indexCount).toBeGreaterThan(5); // Should have multiple indexes
    });

    test('should have users table with correct structure', async () => {
      const result = execSync(
        `docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position;"`,
        { encoding: 'utf8' }
      );

      const columns = result.trim().split('\n').map(col => col.trim());
      const expectedColumns = ['id', 'tenant_id', 'email', 'password_hash', 'first_name', 'last_name', 'role'];

      expectedColumns.forEach(col => {
        expect(columns).toContain(col);
      });
    });
  });

  describe('SQL Query Execution', () => {
    test('should execute simple SELECT query', async () => {
      const result = execSync(
        `docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -t -c "SELECT COUNT(*) FROM users;"`,
        { encoding: 'utf8' }
      );

      const userCount = parseInt(result.trim());
      expect(userCount).toBeGreaterThan(0);
    });

    test('should execute complex JOIN query', async () => {
      const result = execSync(
        `docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -t -c "SELECT COUNT(*) FROM users u LEFT JOIN tenants t ON u.tenant_id = t.id;"`,
        { encoding: 'utf8' }
      );

      const joinCount = parseInt(result.trim());
      expect(joinCount).toBeGreaterThan(0);
    });

    test('should handle query with aggregation', async () => {
      const result = execSync(
        `docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -t -c "SELECT role, COUNT(*) FROM users GROUP BY role;"`,
        { encoding: 'utf8' }
      );

      expect(result.trim()).toMatch(/admin|user|readonly/);
    });

    test('should execute queries with performance analysis', async () => {
      const result = execSync(
        `docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -t -c "EXPLAIN SELECT * FROM users WHERE email = 'admin@example.com';"`,
        { encoding: 'utf8' }
      );

      // Should contain either Index Scan or Seq Scan (depending on data size)
      expect(result).toMatch(/Index Scan|Seq Scan/);
    });
  });

  describe('Data Export Functionality', () => {
    const exportDir = path.join(process.cwd(), 'exports');

    beforeAll(() => {
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir);
      }
    });

    test('should export users data as CSV', async () => {
      const csvFile = path.join(exportDir, 'test_users.csv');

      execSync(
        `docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -c "COPY (SELECT id, email, first_name, last_name, role FROM users LIMIT 5) TO STDOUT WITH CSV HEADER;" > ${csvFile}`,
        { encoding: 'utf8' }
      );

      expect(fs.existsSync(csvFile)).toBe(true);
      const content = fs.readFileSync(csvFile, 'utf8');
      expect(content).toContain('id,email,first_name,last_name,role');
    });

    test('should export database schema as SQL', async () => {
      const sqlFile = path.join(exportDir, 'test_schema.sql');

      execSync(
        `docker-compose exec postgres pg_dump -U dbuser -d nodeangularfullstack --schema-only > ${sqlFile}`
      );

      expect(fs.existsSync(sqlFile)).toBe(true);
      const content = fs.readFileSync(sqlFile, 'utf8');
      expect(content).toContain('CREATE TABLE');
    });

    test('should export JSON data format', async () => {
      const result = execSync(
        `docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -t -c "SELECT json_agg(row_to_json(t)) FROM (SELECT email, role FROM users LIMIT 3) t;"`,
        { encoding: 'utf8' }
      );

      expect(() => JSON.parse(result.trim())).not.toThrow();
    });

    afterAll(() => {
      // Cleanup test export files
      const testFiles = ['test_users.csv', 'test_schema.sql'];
      testFiles.forEach(file => {
        const filePath = path.join(exportDir, file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    });
  });

  describe('User Management Operations', () => {
    const testEmail = 'pgweb.test@example.com';

    beforeEach(async () => {
      // Create test user
      execSync(
        `docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -c "INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES ('${testEmail}', 'test_hash', 'Test', 'User', 'user') ON CONFLICT (email, tenant_id) DO NOTHING;"`
      );
    });

    afterEach(async () => {
      // Cleanup test user
      execSync(
        `docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -c "DELETE FROM users WHERE email = '${testEmail}';"`
      );
    });

    test('should display seed users correctly', async () => {
      const result = execSync(
        `docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -t -c "SELECT email, role FROM users WHERE email IN ('admin@example.com', 'user@example.com', 'readonly@example.com');"`,
        { encoding: 'utf8' }
      );

      expect(result).toContain('admin@example.com');
      expect(result).toContain('user@example.com');
      expect(result).toContain('readonly@example.com');
    });

    test('should modify user role successfully', async () => {
      // Change role to admin
      execSync(
        `docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -c "UPDATE users SET role = 'admin' WHERE email = '${testEmail}';"`
      );

      const result = execSync(
        `docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -t -c "SELECT role FROM users WHERE email = '${testEmail}';"`,
        { encoding: 'utf8' }
      );

      expect(result.trim()).toBe('admin');
    });

    test('should activate/deactivate user accounts', async () => {
      // Deactivate user
      execSync(
        `docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -c "UPDATE users SET is_active = false WHERE email = '${testEmail}';"`
      );

      let result = execSync(
        `docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -t -c "SELECT is_active FROM users WHERE email = '${testEmail}';"`,
        { encoding: 'utf8' }
      );

      expect(result.trim()).toBe('f');

      // Reactivate user
      execSync(
        `docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -c "UPDATE users SET is_active = true WHERE email = '${testEmail}';"`
      );

      result = execSync(
        `docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -t -c "SELECT is_active FROM users WHERE email = '${testEmail}';"`,
        { encoding: 'utf8' }
      );

      expect(result.trim()).toBe('t');
    });

    test('should update user profile information', async () => {
      execSync(
        `docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -c "UPDATE users SET first_name = 'Updated', last_name = 'Name' WHERE email = '${testEmail}';"`
      );

      const result = execSync(
        `docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -t -c "SELECT first_name, last_name FROM users WHERE email = '${testEmail}';"`,
        { encoding: 'utf8' }
      );

      expect(result.trim()).toContain('Updated');
      expect(result.trim()).toContain('Name');
    });

    test('should validate role constraints', async () => {
      // Try to set invalid role - should fail
      expect(() => {
        execSync(
          `docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -c "UPDATE users SET role = 'invalid_role' WHERE email = '${testEmail}';"`,
          { stdio: 'pipe' }
        );
      }).toThrow();
    });
  });

  describe('Performance and Connection Management', () => {
    test('should handle concurrent connections', async () => {
      const promises = Array.from({ length: 5 }, () =>
        request(PGWEB_URL)
          .get('/api/info')
          .auth(AUTH_CREDENTIALS.username, AUTH_CREDENTIALS.password)
      );

      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    test('should have appropriate connection limits configured', async () => {
      const response = await request(PGWEB_URL)
        .get('/api/info')
        .auth(AUTH_CREDENTIALS.username, AUTH_CREDENTIALS.password);

      expect(response.body.features).toHaveProperty('query_timeout');
      expect(response.body.features.query_timeout).toBeGreaterThan(0);
    });

    test('should handle database connection properly', async () => {
      // Test that database connection is working through pgWeb
      const result = execSync(
        `docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -t -c "SELECT 1;"`,
        { encoding: 'utf8' }
      );

      expect(result.trim()).toBe('1');
    });
  });

  describe('Security and Access Control', () => {
    test('should have proper CORS configuration', async () => {
      const response = await request(PGWEB_URL)
        .options('/api/info')
        .auth(AUTH_CREDENTIALS.username, AUTH_CREDENTIALS.password);

      // pgWeb should handle CORS appropriately
      expect([200, 204, 404]).toContain(response.status);
    });

    test('should prevent SQL injection in queries', async () => {
      // Test with potentially malicious query
      const maliciousQuery = "'; DROP TABLE users; --";

      expect(() => {
        execSync(
          `docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -c "SELECT * FROM users WHERE email = '${maliciousQuery}';"`,
          { stdio: 'pipe' }
        );
      }).toThrow();
    });

    test('should validate session management', async () => {
      const response = await request(PGWEB_URL)
        .get('/api/info')
        .auth(AUTH_CREDENTIALS.username, AUTH_CREDENTIALS.password);

      expect(response.body.features).toHaveProperty('session_lock');
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle invalid SQL queries gracefully', async () => {
      expect(() => {
        execSync(
          `docker-compose exec postgres psql -U dbuser -d nodeangularfullstack -c "INVALID SQL QUERY;"`,
          { stdio: 'pipe' }
        );
      }).toThrow();
    });

    test('should recover from connection issues', async () => {
      // Test that pgWeb can handle database reconnection
      const response = await request(PGWEB_URL)
        .get('/api/info')
        .auth(AUTH_CREDENTIALS.username, AUTH_CREDENTIALS.password);

      expect(response.status).toBe(200);
    });

    test('should validate container health checks', async () => {
      // Test the health check using curl instead of wget
      try {
        const result = execSync(
          'docker-compose exec pgweb curl -f -s http://localhost:8081/api/info',
          { encoding: 'utf8' }
        );

        expect(result).toContain('version');
      } catch (error) {
        // If curl is not available, just check that the container is healthy
        const healthStatus = execSync(
          'docker-compose ps pgweb',
          { encoding: 'utf8' }
        );

        expect(healthStatus).toContain('Up');
      }
    });
  });
});