// Serverless function to proxy Prokerala API requests
const axios = require('axios');

// Define rate limiting parameters
const RATE_LIMIT = 50; // requests per minute
const RATE_WINDOW_MS = 60 * 1000; // 1 minute in milliseconds
let requestCount = 0;
let windowStart = Date.now();

// Reset rate limiting window periodically
setInterval(() => {
  requestCount = 0;
  windowStart = Date.now();
}, RATE_WINDOW_MS);

// Helper function to validate request parameters
function validateRequest(params, requiredParams) {
  const missingParams = requiredParams.filter(param => !params[param]);
  
  if (missingParams.length > 0) {
    return {
      valid: false,
      error: `Missing required parameters: ${missingParams.join(', ')}`
    };
  }
  
  return { valid: true };
}

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
  'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
};

// Rate limiting middleware
function checkRateLimit(req, res) {
  // Reset counter if window has expired
  const now = Date.now();
  if (now - windowStart > RATE_WINDOW_MS) {
    requestCount = 0;
    windowStart = now;
  }
  
  // Check if rate limit exceeded
  if (requestCount >= RATE_LIMIT) {
    return {
      status: 429,
      body: { error: 'Rate limit exceeded. Please try again later.' }
    };
  }
  
  // Increment counter
  requestCount++;
  
  return null; // No rate limiting error
}

// Handle OPTIONS requests for CORS preflight
function handleOptions(req, res) {
  return {
    status: 204,
    headers: corsHeaders,
    body: ''
  };
}

// Get Prokerala OAuth token
async function getProkeralaToken(req, res) {
  try {
    // Get client credentials from environment variables
    const clientId = process.env.VITE_PROKERALA_CLIENT_ID;
    const clientSecret = process.env.VITE_PROKERALA_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return {
        status: 500,
        headers: corsHeaders,
        body: { error: 'Missing API credentials' }
      };
    }
    
    const response = await axios({
      method: 'POST',
      url: 'https://api.prokerala.com/token',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: new URLSearchParams({
        'grant_type': 'client_credentials',
        'client_id': clientId,
        'client_secret': clientSecret
      })
    });
    
    return {
      status: 200,
      headers: corsHeaders,
      body: response.data
    };
  } catch (error) {
    console.error('Prokerala token error:', error.message);
    
    // Forward the error response from Prokerala
    if (error.response) {
      return {
        status: error.response.status,
        headers: corsHeaders,
        body: error.response.data
      };
    }
    
    return {
      status: 500,
      headers: corsHeaders,
      body: { 
        error: 'Authentication error',
        message: error.message
      }
    };
  }
}

// Generic Prokerala API request handler
async function prokeralaApiRequest(req, res, endpoint) {
  try {
    const { query } = req;
    const token = req.headers.authorization?.split(' ')[1];
    
    // Validate request
    const validation = validateRequest(query, ['datetime', 'coordinates']);
    if (!validation.valid) {
      return {
        status: 400,
        headers: corsHeaders,
        body: { error: validation.error }
      };
    }
    
    if (!token) {
      return {
        status: 401,
        headers: corsHeaders,
        body: { error: 'Missing authorization token' }
      };
    }
    
    // Construct query parameters
    const params = {
      datetime: query.datetime,
      coordinates: query.coordinates,
      ayanamsa: query.ayanamsa || 1
    };
    
    // Add additional parameters if provided
    if (query.chart_type) params.chart_type = query.chart_type;
    if (query.chart_style) params.chart_style = query.chart_style;
    
    // Make request to Prokerala API
    const response = await axios({
      method: 'GET',
      url: `https://api.prokerala.com/v2/astrology/${endpoint}`,
      params,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return {
      status: 200,
      headers: corsHeaders,
      body: response.data
    };
  } catch (error) {
    console.error(`Prokerala ${endpoint} error:`, error.message);
    
    // Forward the error response from Prokerala
    if (error.response) {
      return {
        status: error.response.status,
        headers: corsHeaders,
        body: error.response.data
      };
    }
    
    return {
      status: 500,
      headers: corsHeaders,
      body: { 
        error: 'API error',
        message: error.message
      }
    };
  }
}

// Main request handler for serverless function
module.exports = async (req, res) => {
  // Return early for OPTIONS requests (CORS preflight)
  if (req.method === 'OPTIONS') {
    return handleOptions(req, res);
  }
  
  // Check rate limit
  const rateLimitError = checkRateLimit(req, res);
  if (rateLimitError) {
    return rateLimitError;
  }
  
  // Get the endpoint from the path
  const path = req.url.replace(/^\/api\/prokerala-proxy\//, '');
  
  // Route to the appropriate handler
  let response;
  if (path === 'token') {
    response = await getProkeralaToken(req, res);
  } else if (path === 'planet-position') {
    response = await prokeralaApiRequest(req, res, 'planet-position');
  } else if (path === 'kundli') {
    response = await prokeralaApiRequest(req, res, 'kundli');
  } else if (path === 'chart') {
    response = await prokeralaApiRequest(req, res, 'chart');
  } else {
    response = {
      status: 404,
      headers: corsHeaders,
      body: { error: 'Endpoint not found' }
    };
  }
  
  // Set response headers
  Object.entries(response.headers || {}).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  
  // Return response
  res.status(response.status).json(response.body);
}; 