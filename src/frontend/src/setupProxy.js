const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://waypoints_backend:3001',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '/api',
      },
      logLevel: 'debug',
      followRedirects: true,
    })
  );

  app.use(
    '/uploads',
    createProxyMiddleware({
      target: 'http://waypoints_backend:3001',
      changeOrigin: true,
      pathRewrite: {
        '^/uploads': '/uploads',
      },
      logLevel: 'debug',
      followRedirects: true,
    })
  );
};

