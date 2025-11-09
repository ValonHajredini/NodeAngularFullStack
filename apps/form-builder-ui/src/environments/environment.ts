/**
 * Development environment configuration.
 * Used when running the application in development mode.
 */
export const environment = {
  production: false,
  // Multi-database architecture: Use relative path for proxy routing
  // Proxy routes /api/v1/tools to dashboard-api (3000), /api/v1/forms to forms-api (3001)
  apiUrl: '/api/v1',
  shortLinkBaseUrl: 'http://localhost:3001',
  mainAppUrl: 'http://localhost:4200',
  appName: 'NodeAngularFullStack',
  enableMultiTenancy: false,
  showTestCredentials: true,
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
    enableConsoleLogging: true,
    logLevel: 'debug',
  },
};
