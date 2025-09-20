import { TestBed } from '@angular/core/testing';
import { EnvironmentValidatorService } from './environment-validator.service';
import { EnvironmentConfig } from '@env/environment.interface';

describe('EnvironmentValidatorService', () => {
  let service: EnvironmentValidatorService;

  const validEnvironment: EnvironmentConfig = {
    production: false,
    apiUrl: 'http://localhost:3000/api/v1',
    appName: 'TestApp',
    enableMultiTenancy: false,
    showTestCredentials: true,
    features: {
      registration: true,
      passwordReset: true,
      profileManagement: true,
      userManagement: true,
      dashboard: true
    },
    jwt: {
      tokenKey: 'access_token',
      refreshTokenKey: 'refresh_token',
      tokenExpirationBuffer: 30000
    },
    api: {
      timeout: 10000,
      retryAttempts: 3,
      retryDelay: 1000
    },
    logging: {
      enableConsoleLogging: true,
      logLevel: 'debug'
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EnvironmentValidatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('validateEnvironment', () => {
    it('should pass for valid environment configuration', () => {
      expect(() => service.validateEnvironment(validEnvironment)).not.toThrow();
    });

    it('should throw error for null environment', () => {
      expect(() => service.validateEnvironment(null)).toThrowError('Environment configuration is required');
    });

    it('should throw error for undefined environment', () => {
      expect(() => service.validateEnvironment(undefined)).toThrowError('Environment configuration is required');
    });

    it('should throw error for missing production property', () => {
      const env = { ...validEnvironment };
      delete (env as any).production;

      expect(() => service.validateEnvironment(env)).toThrowError('Environment property \'production\' must be a boolean');
    });

    it('should throw error for invalid apiUrl', () => {
      const env = { ...validEnvironment, apiUrl: '' };

      expect(() => service.validateEnvironment(env)).toThrowError('Environment property \'apiUrl\' must be a non-empty string');
    });

    it('should throw error for missing features configuration', () => {
      const env = { ...validEnvironment };
      delete (env as any).features;

      expect(() => service.validateEnvironment(env)).toThrowError('Environment features configuration is required');
    });

    it('should throw error for missing JWT configuration', () => {
      const env = { ...validEnvironment };
      delete (env as any).jwt;

      expect(() => service.validateEnvironment(env)).toThrowError('Environment JWT configuration is required');
    });

    it('should throw error for invalid JWT token expiration buffer', () => {
      const env = { ...validEnvironment, jwt: { ...validEnvironment.jwt, tokenExpirationBuffer: 500 } };

      expect(() => service.validateEnvironment(env)).toThrowError('Environment property \'jwt.tokenExpirationBuffer\' must be a positive integer >= 1000');
    });

    it('should throw error for invalid log level', () => {
      const env = { ...validEnvironment, logging: { ...validEnvironment.logging, logLevel: 'invalid' as any } };

      expect(() => service.validateEnvironment(env)).toThrowError('Environment property \'logging.logLevel\' must be one of: debug, info, warn, error');
    });
  });

  describe('validateApiUrl', () => {
    it('should return true for valid HTTP URL', () => {
      expect(service.validateApiUrl('http://localhost:3000')).toBe(true);
    });

    it('should return true for valid HTTPS URL', () => {
      expect(service.validateApiUrl('https://api.example.com')).toBe(true);
    });

    it('should return false for invalid URL', () => {
      expect(service.validateApiUrl('not-a-url')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(service.validateApiUrl('')).toBe(false);
    });
  });
});