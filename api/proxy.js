const axios = require('axios');
const { setup, send } = require('vercel-node-server');

// Create a simple Express-like handler
const app = setup();

// Handle all proxy requests
module.exports = async (req, res) => {
  try {
    // Extract the target URL from the request query parameter
    const targetUrl = req.query.url;
    
    if (!targetUrl) {
      return send(res, 400, { error: 'Missing URL parameter' });
    }

    console.log('Proxying request to:', targetUrl);
    
    // Use axios to make the request - simpler than http-proxy-middleware
    const response = await axios({
      method: req.method,
      url: targetUrl,
      headers: {
        // Forward necessary headers but remove host to avoid conflicts
        ...req.headers,
        host: undefined,
        'user-agent': 'AstroInsightsApp/1.0'
      },
      // Forward request body for POST requests
      data: req.method === 'POST' ? req.body : undefined,
      // Handle redirects
      maxRedirects: 5,
      // Important: we want the full response with headers
      validateStatus: () => true, // Don't throw on any status code
    });

    // Set response headers including CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': response.headers['content-type'] || 'application/json'
    };

    // Send the response with the same status code from the upstream server
    return send(res, response.status, response.data, headers);
  } catch (error) {
    console.error('Proxy error:', error.message);
    
    // Detailed error message for debugging
    const errorMessage = {
      error: 'Proxy error',
      message: error.message,
      url: req.query.url,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
    
    return send(res, 500, errorMessage);
  }
}; 