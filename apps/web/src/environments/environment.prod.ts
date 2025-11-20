/**
 * Production environment configuration - Main Web App
 * Domain: legopdf.com
 * Used when building the application for production deployment.
 */
export const environment = {
  production: true,
  apiUrl: 'https://api.legopdf.com/api/v1', // Dashboard/Auth API
  shortLinkBaseUrl: 'https://forms-api.legopdf.com', // Forms API for short links
  formBuilderUrl: 'https://form-builder.legopdf.com', // Form Builder UI
  appName: 'LegoPDF',
  enableMultiTenancy: true,
  showTestCredentials: false,
  features: {
    registration: true,
    passwordReset: true,
    profileManagement: true,
    userManagement: true,
    dashboard: true,
  },
  jwt: {
    tokenKey: 'access_token',
    refreshTokenKey: 'refresh_token',
    tokenExpirationBuffer: 300000, // 5 minutes buffer before token expires
  },
  api: {
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
  },
  logging: {
    enableConsoleLogging: false,
    logLevel: 'error',
  },
};
