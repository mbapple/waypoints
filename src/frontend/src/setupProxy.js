const { createProxyMiddleware } = require('http-proxy-middleware');

// Dev-server proxy: the browser only talks to this server, which forwards
// API and photo requests to the backend container.
const BACKEND_URL = process.env.BACKEND_URL || 'http://waypoints_backend:3001';

module.exports = function(app) {
  for (const prefix of ['/api', '/uploads']) {
    app.use(
      prefix,
      createProxyMiddleware({
        target: BACKEND_URL,
        changeOrigin: true,
        // http-proxy-middleware v2 forwards req.originalUrl, so the prefix is kept as-is
        logLevel: 'warn',
        followRedirects: true,
      })
    );
  }
};
