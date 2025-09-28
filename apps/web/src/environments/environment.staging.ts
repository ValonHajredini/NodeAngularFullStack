/**
 * Staging environment configuration.
 * Used for staging deployment and testing.
 */
export const environment = {
  production: false,
  apiUrl: 'https://api-staging.yourapp.com/api/v1',
  shortLinkBaseUrl: 'https://api-staging.yourapp.com',
  appName: 'NodeAngularFullStack (Staging)',
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
    logLevel: 'info',
  },
};
