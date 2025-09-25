/**
 * Configuration validation middleware.
 * Provides middleware functions for runtime configuration validation and consistency checks.
 */
import { Request, Response, NextFunction } from 'express';
import { appConfig, tenantConfig, isMultiTenancyEnabled } from '../config';
import { validateTenantConfigConsistency } from '../validators/config.validators';

/**
 * Extended request interface with configuration context.
 */
export interface ConfigRequest extends Request {
  config?: {
    multiTenancyEnabled: boolean;
    tenantId?: string;
    isolationLevel: string;
  };
}

/**
 * API Error class for configuration-related errors.
 */
export class ConfigError extends Error {
  public statusCode: number;
  public code: string;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'CONFIG_ERROR'
  ) {
    super(message);
    this.name = 'ConfigError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Middleware to validate tenant configuration consistency on startup.
 * Runs configuration validation and logs warnings for inconsistent settings.
 */
export const validateTenantConfiguration = (
  req: ConfigRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    // Run tenant configuration consistency checks
    const validationResult = validateTenantConfigConsistency();

    // Log any warnings
    if (validationResult.warnings.length > 0) {
      validationResult.warnings.forEach((warning) => {
        console.warn(`⚠️  Configuration Warning: ${warning}`);
      });
    }

    // Throw errors for critical configuration issues
    if (!validationResult.isValid) {
      const errorMessage = `Configuration errors detected: ${validationResult.errors.join(', ')}`;
      throw new ConfigError(errorMessage, 500, 'CONFIG_VALIDATION_FAILED');
    }

    // Add configuration context to request
    req.config = {
      multiTenancyEnabled: tenantConfig.multiTenancyEnabled,
      isolationLevel: tenantConfig.isolationLevel,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to require multi-tenancy to be enabled.
 * Returns 404 for multi-tenancy features when disabled.
 */
export const requireMultiTenancy = (
  _req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!isMultiTenancyEnabled()) {
    throw new ConfigError(
      'Multi-tenancy features are not enabled in this deployment',
      404,
      'MULTI_TENANCY_DISABLED'
    );
  }
  next();
};

/**
 * Middleware to require single-tenant mode.
 * Returns 404 for single-tenant only features when multi-tenancy is enabled.
 */
export const requireSingleTenant = (
  _req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (isMultiTenancyEnabled()) {
    throw new ConfigError(
      'This feature is only available in single-tenant mode',
      404,
      'SINGLE_TENANT_ONLY'
    );
  }
  next();
};

/**
 * Middleware to validate tenant isolation settings.
 * Ensures tenant isolation is properly configured for the current request.
 */
export const validateTenantIsolation = (
  req: ConfigRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    if (!tenantConfig.multiTenancyEnabled) {
      next();
      return;
    }

    // Check if RLS is enabled for row-level isolation
    if (tenantConfig.isolationLevel === 'row' && !tenantConfig.rlsEnabled) {
      throw new ConfigError(
        'Row-level tenant isolation requires RLS to be enabled',
        500,
        'RLS_REQUIRED'
      );
    }

    // Check cross-access prevention settings
    if (tenantConfig.crossAccessPrevention && !tenantConfig.tokenIsolation) {
      console.warn(
        '⚠️  Cross-access prevention enabled without token isolation. Consider enabling token isolation for better security.'
      );
    }

    // Add tenant isolation context to request
    if (req.config) {
      req.config.isolationLevel = tenantConfig.isolationLevel;
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to validate configuration hash and detect changes.
 * Warns about configuration changes that require application restart.
 */
export const validateConfigurationHash = (
  _req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    // This middleware runs on startup to detect configuration changes
    // In a real implementation, you would store the config hash and compare
    const configKeys = [
      'ENABLE_MULTI_TENANCY',
      'TENANT_ISOLATION_LEVEL',
      'TENANT_RLS_ENABLED',
      'TENANT_TOKEN_ISOLATION',
      'DB_HOST',
      'DB_PORT',
      'DB_NAME',
    ];

    const currentConfigHash = generateConfigHash(configKeys);
    const storedHash = process.env.CONFIG_HASH;

    if (storedHash && currentConfigHash !== storedHash) {
      console.warn(
        '⚠️  Configuration change detected. Application restart required for changes to take effect.'
      );
      console.warn('   Current hash:', currentConfigHash);
      console.warn('   Stored hash:', storedHash);
    }

    next();
  } catch (error) {
    console.error('Error validating configuration hash:', error);
    next(); // Don't fail the request for hash validation errors
  }
};

/**
 * Middleware to log configuration summary on startup.
 * Provides a summary of current configuration for debugging.
 */
export const logConfigurationSummary = (
  _req: Request,
  _res: Response,
  next: NextFunction
): void => {
  // Only log on first request or in development
  if (process.env.NODE_ENV === 'development' || !global.configLogged) {
    console.log('📋 Configuration Summary:');
    console.log('  Environment:', appConfig.app.nodeEnv);
    console.log(
      '  Multi-tenancy:',
      tenantConfig.multiTenancyEnabled ? 'Enabled' : 'Disabled'
    );

    if (tenantConfig.multiTenancyEnabled) {
      console.log('  Isolation Level:', tenantConfig.isolationLevel);
      console.log('  RLS Enabled:', tenantConfig.rlsEnabled);
      console.log('  Token Isolation:', tenantConfig.tokenIsolation);
      console.log('  Default Plan:', tenantConfig.defaultPlan);
    } else {
      console.log('  Default Tenant ID:', tenantConfig.defaultTenantId);
    }

    console.log('  Database SSL:', appConfig.database.ssl);
    console.log(
      '  Rate Limiting:',
      `${appConfig.rateLimit.maxRequests} requests/${appConfig.rateLimit.windowMs}ms`
    );

    global.configLogged = true;
  }

  next();
};

/**
 * Error handler middleware for configuration errors.
 * Handles configuration-specific errors with appropriate responses.
 */
export const handleConfigurationErrors = (
  error: Error,
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (error instanceof ConfigError) {
    res.status(error.statusCode).json({
      error: {
        message: error.message,
        code: error.code,
        type: 'ConfigurationError',
      },
    });
    return;
  }

  // Pass non-configuration errors to the next error handler
  next(error);
};

/**
 * Utility function to generate configuration hash.
 * Creates a hash from specified configuration keys for change detection.
 * @param configKeys - Array of environment variable keys to include in hash
 * @returns {string} Configuration hash
 */
function generateConfigHash(configKeys: string[]): string {
  const crypto = require('crypto');
  const configString = configKeys
    .map((key) => `${key}=${process.env[key] || ''}`)
    .sort()
    .join('|');

  return crypto
    .createHash('sha256')
    .update(configString)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Declare global type for config logged flag.
 */
declare global {
  var configLogged: boolean | undefined;
}
