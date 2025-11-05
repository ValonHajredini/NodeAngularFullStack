import { Injectable } from '@angular/core';
import { EnvironmentConfig } from '@env/environment.interface';

/**
 * Service for validating environment configuration at runtime.
 * Ensures required environment variables are present and properly typed.
 */
@Injectable({ providedIn: 'root' })
export class EnvironmentValidatorService {
  /**
   * Validates the provided environment configuration.
   * @param env - Environment configuration to validate
   * @throws {Error} When validation fails
   */
  validateEnvironment(env: any): asserts env is EnvironmentConfig {
    if (!env) {
      throw new Error('Environment configuration is required');
    }

    this.validateBoolean(env.production, 'production');
    this.validateString(env.apiUrl, 'apiUrl');
    this.validateString(env.appName, 'appName');
    this.validateBoolean(env.enableMultiTenancy, 'enableMultiTenancy');
    this.validateBoolean(env.showTestCredentials, 'showTestCredentials');

    this.validateFeatures(env.features);
    this.validateJwtConfig(env.jwt);
    this.validateApiConfig(env.api);
    this.validateLoggingConfig(env.logging);
  }

  /**
   * Validates URL format for API endpoints.
   * @param url - URL to validate
   * @returns True if valid URL format
   */
  validateApiUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private validateString(value: any, property: string): void {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`Environment property '${property}' must be a non-empty string`);
    }
  }

  private validateBoolean(value: any, property: string): void {
    if (typeof value !== 'boolean') {
      throw new Error(`Environment property '${property}' must be a boolean`);
    }
  }

  private validateNumber(value: any, property: string, min = 0): void {
    if (typeof value !== 'number' || value < min || !Number.isInteger(value)) {
      throw new Error(`Environment property '${property}' must be a positive integer >= ${min}`);
    }
  }

  private validateFeatures(features: any): void {
    if (!features || typeof features !== 'object') {
      throw new Error('Environment features configuration is required');
    }

    const requiredFeatures = [
      'registration',
      'passwordReset',
      'profileManagement',
      'userManagement',
      'dashboard'
    ];

    for (const feature of requiredFeatures) {
      this.validateBoolean(features[feature], `features.${feature}`);
    }
  }

  private validateJwtConfig(jwt: any): void {
    if (!jwt || typeof jwt !== 'object') {
      throw new Error('Environment JWT configuration is required');
    }

    this.validateString(jwt.tokenKey, 'jwt.tokenKey');
    this.validateString(jwt.refreshTokenKey, 'jwt.refreshTokenKey');
    this.validateNumber(jwt.tokenExpirationBuffer, 'jwt.tokenExpirationBuffer', 1000);
  }

  private validateApiConfig(api: any): void {
    if (!api || typeof api !== 'object') {
      throw new Error('Environment API configuration is required');
    }

    this.validateNumber(api.timeout, 'api.timeout', 1000);
    this.validateNumber(api.retryAttempts, 'api.retryAttempts', 0);
    this.validateNumber(api.retryDelay, 'api.retryDelay', 100);
  }

  private validateLoggingConfig(logging: any): void {
    if (!logging || typeof logging !== 'object') {
      throw new Error('Environment logging configuration is required');
    }

    this.validateBoolean(logging.enableConsoleLogging, 'logging.enableConsoleLogging');

    const validLogLevels = ['debug', 'info', 'warn', 'error'];
    if (!validLogLevels.includes(logging.logLevel)) {
      throw new Error(`Environment property 'logging.logLevel' must be one of: ${validLogLevels.join(', ')}`);
    }
  }
}