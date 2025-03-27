// ESM to CommonJS conversion (package.json has "type": "module")
const axios = require('axios');
const https = require('https');
const http = require('http');
const url = require('url');

// Debug function that only logs when DEBUG is true
const debug = (...args) => {
  if (process.env.DEBUG === 'true') {
    console.log('[PROXY DEBUG]', ...args);
  }
};

// Create Axios instance with longer timeout and keep-alive
const client = axios.create({
  timeout: 30000, // 30 seconds
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ 
    keepAlive: true,
    rejectUnauthorized: false // Allow self-signed certs for testing
  }),
  maxRedirects: 5,
  validateStatus: () => true, // Don't throw on error status codes
});

// Handle all proxy requests
module.exports = async (req, res) => {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  try {
    // Extract the target URL from the request query parameter
    const targetUrl = req.query.url;
    
    if (!targetUrl) {
      return res.status(400).json({ error: 'Missing URL parameter' });
    }

    debug('Request received for URL:', targetUrl);
    debug('Request method:', req.method);
    debug('Request headers:', JSON.stringify(req.headers, null, 2));
    
    // Parse the URL to handle any special cases
    const parsedUrl = new URL(targetUrl);
    debug('Parsed URL:', parsedUrl.toString());
    
    // Make the request
    debug('Sending request to target URL');
    const response = await client({
      method: req.method || 'GET',
      url: targetUrl,
      headers: {
        // Forward request headers except host
        ...req.headers,
        host: undefined,
        'user-agent': 'AstroInsightsApp/1.0',
      },
      // Forward request body for POST requests
      data: req.method === 'POST' ? req.body : undefined,
      responseType: 'json',
    });

    debug('Response received:', response.status);
    debug('Response headers:', JSON.stringify(response.headers, null, 2));
    
    // If debug is enabled, also log first part of response body
    if (process.env.DEBUG === 'true') {
      const responsePreview = 
        typeof response.data === 'string' 
          ? response.data.substring(0, 200) 
          : JSON.stringify(response.data).substring(0, 200);
      debug('Response preview:', responsePreview + '...');
    }

    // Forward the response
    return res.status(response.status)
      .setHeader('Content-Type', response.headers['content-type'] || 'application/json')
      .json(response.data);
    
  } catch (error) {
    debug('Proxy error:', error.message);
    debug('Error stack:', error.stack);
    
    if (error.response) {
      debug('Error response:', error.response.status);
      debug('Error data:', error.response.data);
    }
    
    return res.status(500).json({
      error: 'Proxy error',
      message: error.message,
      url: req.query.url,
      stack: error.stack,
    });
  }
}; 