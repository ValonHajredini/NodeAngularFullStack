/**
 * PM2 Ecosystem Configuration for NodeAngularFullStack
 *
 * Production process management configuration for all backend services.
 *
 * Usage:
 *   pm2 start ecosystem.config.js                    # Start all services
 *   pm2 restart ecosystem.config.js                  # Restart all services
 *   pm2 stop ecosystem.config.js                     # Stop all services
 *   pm2 delete ecosystem.config.js                   # Delete all services
 *   pm2 start ecosystem.config.js --only dashboard-api  # Start specific service
 *
 * @see https://pm2.keymetrics.io/docs/usage/application-declaration/
 */

module.exports = {
  apps: [
    {
      name: 'dashboard-api',
      script: 'npm',
      args: 'start',
      cwd: './apps/dashboard-api',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/dashboard-api-error.log',
      out_file: './logs/dashboard-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
    {
      name: 'forms-api',
      script: 'npm',
      args: 'start',
      cwd: './apps/forms-api',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: './logs/forms-api-error.log',
      out_file: './logs/forms-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
