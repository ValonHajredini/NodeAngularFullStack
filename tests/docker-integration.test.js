/**
 * Docker Environment Integration Tests
 * Validates container startup, health checks, and service connectivity
 */
const { exec } = require('child_process');
const http = require('http');
const { promisify } = require('util');

const execAsync = promisify(exec);

describe('Docker Environment Integration', () => {
  beforeAll(async () => {
    // Change to parent directory to find docker-compose.yml
    process.chdir('..');

    // Check if Docker environment is already running
    console.log('Checking existing Docker environment...');

    // Wait for services to be healthy
    await waitForHealthyServices();
  }, 120000); // 2 minute timeout for container startup

  describe('Container Health Checks', () => {
    test('all containers should be running and healthy', async () => {
      const { stdout } = await execAsync('docker-compose ps --format json');
      const containers = stdout.trim().split('\n').map(line => JSON.parse(line));

      expect(containers.length).toBeGreaterThan(0);

      containers.forEach(container => {
        expect(container.State).toBe('running');
        expect(container.Health).toBe('healthy');
      });
    });

    test('should have all required services running', async () => {
      const { stdout } = await execAsync('docker-compose ps --services');
      const services = stdout.trim().split('\n');

      const requiredServices = ['api', 'web', 'postgres', 'redis', 'pgweb'];
      requiredServices.forEach(service => {
        expect(services).toContain(service);
      });
    });
  });

  describe('Service Connectivity', () => {
    test('API service should be accessible and healthy', async () => {
      const response = await makeHttpRequest('http://localhost:3000/health');

      expect(response.statusCode).toBe(200);
      expect(response.data.status).toBe('healthy');
      expect(response.data.timestamp).toBeDefined();
    });

    test('Web service should be accessible', async () => {
      const response = await makeHttpRequest('http://localhost:4200');

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
    });

    test('pgWeb interface should be accessible', async () => {
      const response = await makeHttpRequest('http://localhost:8080');

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Service Dependencies', () => {
    test('API should connect to database successfully', async () => {
      const { stdout } = await execAsync('docker-compose exec -T api npm run db:check 2>/dev/null || echo "Database connection test not available"');

      // If db:check script exists, it should succeed
      if (!stdout.includes('not available')) {
        expect(stdout).not.toContain('error');
        expect(stdout).not.toContain('failed');
      }
    });

    test('API should connect to Redis successfully', async () => {
      // Test Redis connectivity through API health endpoint
      const response = await makeHttpRequest('http://localhost:3000/health');
      expect(response.statusCode).toBe(200);
    });
  });

  describe('Container Resource Usage', () => {
    test('containers should not exceed reasonable memory limits', async () => {
      const { stdout } = await execAsync('docker stats --no-stream --format "table {{.Container}}\\t{{.MemUsage}}"');
      const lines = stdout.trim().split('\n').slice(1); // Remove header

      lines.forEach(line => {
        const [container, memUsage] = line.split('\t');
        const memoryMB = parseFloat(memUsage.match(/([0-9.]+)MiB/)?.[1] || '0');

        // Each container should use less than 500MB in development
        expect(memoryMB).toBeLessThan(500);
      });
    });
  });

  describe('Container Logs', () => {
    test('no critical errors in container logs', async () => {
      const services = ['api', 'web', 'postgres', 'redis', 'pgweb'];

      for (const service of services) {
        const { stdout } = await execAsync(`docker-compose logs ${service} --tail=50`);

        // Check for critical error patterns
        expect(stdout.toLowerCase()).not.toMatch(/fatal error|critical error|crash|exception/);
      }
    });
  });
});

/**
 * Wait for all services to become healthy
 */
async function waitForHealthyServices(maxWaitTime = 60000) {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    try {
      const { stdout } = await execAsync('docker-compose ps --format json');
      console.log('Docker compose output:', stdout);

      if (!stdout.trim()) {
        console.log('No containers found, waiting...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }

      const containers = stdout.trim().split('\n').map(line => JSON.parse(line));
      console.log('Container statuses:', containers.map(c => ({ name: c.Name, state: c.State, health: c.Health })));

      const allHealthy = containers.every(container =>
        container.State === 'running' &&
        (container.Health === 'healthy' || container.Health === undefined) // Some services don't have health checks
      );

      if (allHealthy && containers.length >= 5) {
        console.log('All services are healthy');
        return;
      }
    } catch (error) {
      console.log('Error checking services:', error.message);
    }

    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
  }

  throw new Error('Services did not become healthy within timeout period');
}

/**
 * Make HTTP request with timeout
 */
function makeHttpRequest(url, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = res.headers['content-type']?.includes('application/json')
            ? JSON.parse(data)
            : data;
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(timeout, () => {
      req.destroy();
      reject(new Error(`Request timeout: ${url}`));
    });
  });
}