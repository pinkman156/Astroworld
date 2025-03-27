// Central API router for Vercel 
// This file serves as a backup entry point for API requests

// Import handlers
const geocodeHandler = require('./geocode');
const prokeralaProxyHandler = require('./prokerala-proxy');
const togetherChatHandler = require('./together-chat');

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
  'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
};

// Main handler
module.exports = async (req, res) => {
  console.log('API request received:', req.url);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(204).set(corsHeaders).end();
    return;
  }
  
  // Set CORS headers
  Object.keys(corsHeaders).forEach(key => {
    res.setHeader(key, corsHeaders[key]);
  });
  
  // Route the request to the appropriate handler
  const path = req.url.split('?')[0]; // Get path without query params
  
  try {
    if (path.startsWith('/api/geocode')) {
      return await geocodeHandler(req, res);
    } else if (path.startsWith('/api/prokerala-proxy')) {
      return await prokeralaProxyHandler(req, res);
    } else if (path.startsWith('/api/together/chat')) {
      return await togetherChatHandler(req, res);
    } else {
      // Handle unknown routes
      return res.status(404).json({
        error: 'API endpoint not found',
        message: `No handler for ${path}`
      });
    }
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'An unknown error occurred'
    });
  }
}; 