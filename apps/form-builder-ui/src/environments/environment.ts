/**
 * Development environment configuration.
 * Used when running the application in development mode.
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api/v1',
  shortLinkBaseUrl: 'http://localhost:3000',
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
