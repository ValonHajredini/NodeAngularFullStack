const PROXY_CONFIG = {
  '/api/v1': {
    target: 'http://localhost:3001',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
    bypass: function (req, res, proxyOptions) {
      console.log('[PROXY]', req.method, req.url, '=> http://localhost:3001' + req.url);
    }
  },
  '/api/analytics': {
    target: 'http://localhost:3001',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
    pathRewrite: {
      '^/api/analytics': '/api/v1/analytics'
    }
  },
  '/api': {
    target: 'http://localhost:3000',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug'
  }
};

module.exports = PROXY_CONFIG;
