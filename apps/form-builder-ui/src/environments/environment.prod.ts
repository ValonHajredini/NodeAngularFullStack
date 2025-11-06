/**
 * Production environment configuration.
 * Used when building the application for production deployment.
 */
export const environment = {
  production: true,
  apiUrl: 'https://api.yourapp.com/api/v1',
  shortLinkBaseUrl: 'https://api.yourapp.com',
  mainAppUrl: 'https://yourapp.com',
  appName: 'NodeAngularFullStack',
  enableMultiTenancy: false,
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
