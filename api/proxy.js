const { createProxyMiddleware } = require('http-proxy-middleware');
const { setup, send } = require('vercel-node-server');

// Create a simple Express-like handler
const app = setup();

// Setup proxy middleware
const apiProxy = createProxyMiddleware({
  changeOrigin: true,
  pathRewrite: {
    '^/api/proxy': '',
  },
  onProxyReq: (proxyReq, req) => {
    // Log the proxied request in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Proxying ${req.method} ${req.url}`);
    }
  },
});

// Handle all proxy requests
module.exports = (req, res) => {
  // Extract the target URL from the request query parameter
  const targetUrl = req.query.url;
  
  if (!targetUrl) {
    return send(res, 400, { error: 'Missing URL parameter' });
  }
  
  // Set the target based on the URL parameter
  const proxy = apiProxy({ ...apiProxy.options, target: targetUrl });
  
  // Handle the proxy request
  app(req, res, () => proxy(req, res, () => {
    send(res, 404, { error: 'Proxy not found' });
  }));
}; 