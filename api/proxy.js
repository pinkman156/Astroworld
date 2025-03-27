const { createProxyMiddleware } = require('http-proxy-middleware');
const { setup, send } = require('vercel-node-server');

// Create a simple Express-like handler
const app = setup();

// Handle all proxy requests
module.exports = (req, res) => {
  // Extract the target URL from the request query parameter
  const targetUrl = req.query.url;
  
  if (!targetUrl) {
    return send(res, 400, { error: 'Missing URL parameter' });
  }

  // Create a new proxy for each request with the target URL
  const proxy = createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    pathRewrite: path => '',
    onProxyReq: (proxyReq, req) => {
      // Remove the url query parameter as it's not needed for the target
      proxyReq.path = proxyReq.path.split('?')[0];
      
      // Log the proxied request in development
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Proxying to ${targetUrl}`);
      }
    },
    onError: (err, req, res) => {
      console.error('Proxy error:', err);
      send(res, 500, { error: `Proxy error: ${err.message}` });
    }
  });
  
  // Handle the proxy request
  proxy(req, res, () => {
    send(res, 404, { error: 'Proxy not found' });
  });
}; 