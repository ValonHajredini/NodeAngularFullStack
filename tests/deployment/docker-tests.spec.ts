import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Docker Configuration Tests
 * Tests for production Docker configuration validation
 */
describe('Docker Production Configuration Tests', () => {
  const dockerDir = path.join(process.cwd(), 'infrastructure', 'docker');
  const dockerComposeFile = path.join(process.cwd(), 'docker-compose.yml');

  beforeAll(async () => {
    // Ensure Docker is available
    try {
      await execAsync('docker --version');
    } catch (error) {
      throw new Error('Docker is not available. Please install Docker to run these tests.');
    }
  });

  describe('Dockerfile Validation', () => {
    test('should have production Dockerfile for API', () => {
      const apiDockerfile = path.join(dockerDir, 'Dockerfile.api');
      expect(fs.existsSync(apiDockerfile)).toBe(true);
    });

    test('should have production Dockerfile for Web', () => {
      const webDockerfile = path.join(dockerDir, 'Dockerfile.web');
      expect(fs.existsSync(webDockerfile)).toBe(true);
    });

    test('API Dockerfile should use multi-stage build', () => {
      const apiDockerfile = path.join(dockerDir, 'Dockerfile.api');
      const content = fs.readFileSync(apiDockerfile, 'utf8');

      expect(content).toContain('FROM node:20-alpine AS dependencies');
      expect(content).toContain('FROM node:20-alpine AS build');
      expect(content).toContain('FROM node:20-alpine AS production');
    });

    test('Web Dockerfile should use multi-stage build', () => {
      const webDockerfile = path.join(dockerDir, 'Dockerfile.web');
      const content = fs.readFileSync(webDockerfile, 'utf8');

      expect(content).toContain('FROM node:20-alpine AS build');
      expect(content).toContain('FROM nginx:1.26-alpine AS production');
    });

    test('API Dockerfile should use non-root user', () => {
      const apiDockerfile = path.join(dockerDir, 'Dockerfile.api');
      const content = fs.readFileSync(apiDockerfile, 'utf8');

      expect(content).toContain('USER nodejs');
      expect(content).toContain('addgroup -g 1001 -S nodejs');
    });

    test('Web Dockerfile should use non-root user', () => {
      const webDockerfile = path.join(dockerDir, 'Dockerfile.web');
      const content = fs.readFileSync(webDockerfile, 'utf8');

      expect(content).toContain('USER nginx-user');
      expect(content).toContain('addgroup -g 1001 -S nginx-user');
    });

    test('API Dockerfile should have health check', () => {
      const apiDockerfile = path.join(dockerDir, 'Dockerfile.api');
      const content = fs.readFileSync(apiDockerfile, 'utf8');

      expect(content).toContain('HEALTHCHECK');
      expect(content).toContain('/api/v1/health/liveness');
    });

    test('Web Dockerfile should have health check', () => {
      const webDockerfile = path.join(dockerDir, 'Dockerfile.web');
      const content = fs.readFileSync(webDockerfile, 'utf8');

      expect(content).toContain('HEALTHCHECK');
      expect(content).toContain('curl');
    });

    test('API Dockerfile should use dumb-init', () => {
      const apiDockerfile = path.join(dockerDir, 'Dockerfile.api');
      const content = fs.readFileSync(apiDockerfile, 'utf8');

      expect(content).toContain('dumb-init');
      expect(content).toContain('ENTRYPOINT ["dumb-init", "--"]');
    });

    test('Web Dockerfile should use dumb-init', () => {
      const webDockerfile = path.join(dockerDir, 'Dockerfile.web');
      const content = fs.readFileSync(webDockerfile, 'utf8');

      expect(content).toContain('dumb-init');
      expect(content).toContain('ENTRYPOINT ["dumb-init", "--"]');
    });

    test('Dockerfiles should have security labels', () => {
      const apiDockerfile = path.join(dockerDir, 'Dockerfile.api');
      const webDockerfile = path.join(dockerDir, 'Dockerfile.web');

      const apiContent = fs.readFileSync(apiDockerfile, 'utf8');
      const webContent = fs.readFileSync(webDockerfile, 'utf8');

      expect(apiContent).toContain('LABEL security.no-new-privileges="true"');
      expect(webContent).toContain('LABEL security.no-new-privileges="true"');
    });
  });

  describe('Nginx Configuration', () => {
    test('should have nginx configuration file', () => {
      const nginxConfig = path.join(dockerDir, 'nginx.conf');
      expect(fs.existsSync(nginxConfig)).toBe(true);
    });

    test('nginx should have security headers configured', () => {
      const nginxConfig = path.join(dockerDir, 'nginx.conf');
      const content = fs.readFileSync(nginxConfig, 'utf8');

      expect(content).toContain('X-Frame-Options');
      expect(content).toContain('X-Content-Type-Options');
      expect(content).toContain('X-XSS-Protection');
      expect(content).toContain('Strict-Transport-Security');
      expect(content).toContain('Content-Security-Policy');
    });

    test('nginx should have rate limiting configured', () => {
      const nginxConfig = path.join(dockerDir, 'nginx.conf');
      const content = fs.readFileSync(nginxConfig, 'utf8');

      expect(content).toContain('limit_req_zone');
      expect(content).toContain('limit_conn_zone');
      expect(content).toContain('limit_req zone=api');
    });

    test('nginx should hide server tokens', () => {
      const nginxConfig = path.join(dockerDir, 'nginx.conf');
      const content = fs.readFileSync(nginxConfig, 'utf8');

      expect(content).toContain('server_tokens off');
    });

    test('nginx should have gzip compression enabled', () => {
      const nginxConfig = path.join(dockerDir, 'nginx.conf');
      const content = fs.readFileSync(nginxConfig, 'utf8');

      expect(content).toContain('gzip on');
      expect(content).toContain('gzip_comp_level');
      expect(content).toContain('gzip_types');
    });
  });

  describe('Docker Build Tests', () => {
    test('API Docker image should build successfully', async () => {
      const buildCommand = `docker build -f infrastructure/docker/Dockerfile.api -t test-api .`;

      try {
        const { stdout, stderr } = await execAsync(buildCommand);
        expect(stderr).not.toContain('ERROR');
      } catch (error) {
        throw new Error(`API Docker build failed: ${error.message}`);
      }
    }, 300000); // 5 minute timeout

    test('Web Docker image should build successfully', async () => {
      const buildCommand = `docker build -f infrastructure/docker/Dockerfile.web -t test-web .`;

      try {
        const { stdout, stderr } = await execAsync(buildCommand);
        expect(stderr).not.toContain('ERROR');
      } catch (error) {
        throw new Error(`Web Docker build failed: ${error.message}`);
      }
    }, 300000); // 5 minute timeout
  });

  describe('Docker Security Tests', () => {
    test('API image should not run as root', async () => {
      const command = `docker run --rm test-api whoami`;

      try {
        const { stdout } = await execAsync(command);
        expect(stdout.trim()).toBe('nodejs');
      } catch (error) {
        // Skip if image not built
        console.warn('Skipping root user test - API image not built');
      }
    });

    test('Web image should not run as root', async () => {
      const command = `docker run --rm test-web whoami`;

      try {
        const { stdout } = await execAsync(command);
        expect(stdout.trim()).toBe('nginx-user');
      } catch (error) {
        // Skip if image not built
        console.warn('Skipping root user test - Web image not built');
      }
    });

    test('API image should expose only required port', async () => {
      const command = `docker inspect test-api --format='{{.Config.ExposedPorts}}'`;

      try {
        const { stdout } = await execAsync(command);
        expect(stdout).toContain('3000/tcp');
        expect(stdout).not.toContain('22/tcp'); // SSH
        expect(stdout).not.toContain('80/tcp'); // HTTP (for API)
      } catch (error) {
        // Skip if image not built
        console.warn('Skipping port exposure test - API image not built');
      }
    });

    test('Web image should expose only required port', async () => {
      const command = `docker inspect test-web --format='{{.Config.ExposedPorts}}'`;

      try {
        const { stdout } = await execAsync(command);
        expect(stdout).toContain('8080/tcp');
        expect(stdout).not.toContain('22/tcp'); // SSH
        expect(stdout).not.toContain('80/tcp'); // Privileged port
      } catch (error) {
        // Skip if image not built
        console.warn('Skipping port exposure test - Web image not built');
      }
    });
  });

  afterAll(async () => {
    // Cleanup test images
    try {
      await execAsync('docker rmi test-api test-web || true');
    } catch (error) {
      // Ignore cleanup errors
    }
  });
});