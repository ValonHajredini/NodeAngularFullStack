/**
 * Production environment configuration - Form Builder UI
 * Domain: form-builder.legopdf.com
 * Used when building the application for production deployment.
 */
export const environment = {
  production: true,
  apiUrl: 'https://api.legopdf.com/api/v1', // Dashboard/Auth API
  formsApiUrl: 'https://forms-api.legopdf.com', // Forms API for analytics and form operations
  shortLinkBaseUrl: 'https://forms-api.legopdf.com',
  mainAppUrl: 'https://legopdf.com', // Main application URL
  appName: 'LegoPDF Form Builder',
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
