/**
 * Environment configuration interface.
 * Defines the structure for all environment files.
 */
export interface EnvironmentConfig {
  /** Whether the app is running in production mode */
  production: boolean;

  /** Base URL for API endpoints */
  apiUrl: string;

  /** Base URL used when constructing public short links */
  shortLinkBaseUrl: string;

  /** Base URL for Form Builder UI application (for SSO navigation) */
  formBuilderUrl: string;

  /** Base URL for Forms API service (forms, themes, templates) */
  formsApiUrl: string;

  /** Application name for display */
  appName: string;

  /** Whether multi-tenancy features are enabled */
  enableMultiTenancy: boolean;

  /** Whether to show test credentials in UI (dev/staging only) */
  showTestCredentials: boolean;

  /** Feature flags for enabling/disabling functionality */
  features: {
    registration: boolean;
    passwordReset: boolean;
    profileManagement: boolean;
    userManagement: boolean;
    dashboard: boolean;
  };

  /** JWT token configuration */
  jwt: {
    /** Local storage key for access token */
    tokenKey: string;

    /** Local storage key for refresh token */
    refreshTokenKey: string;

    /** Buffer time before token expires (milliseconds) */
    tokenExpirationBuffer: number;
  };

  /** API request configuration */
  api: {
    /** Request timeout in milliseconds */
    timeout: number;

    /** Number of retry attempts for failed requests */
    retryAttempts: number;

    /** Delay between retry attempts (milliseconds) */
    retryDelay: number;
  };

  /** Logging configuration */
  logging: {
    /** Whether to enable console logging */
    enableConsoleLogging: boolean;

    /** Minimum log level to display */
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}
