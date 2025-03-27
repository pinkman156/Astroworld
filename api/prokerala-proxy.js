// Serverless function to proxy Prokerala API requests
import axios from 'axios';

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
    // Debug information about environment
    console.log('Node environment:', process.env.NODE_ENV);
    console.log('Environment variables available:', Object.keys(process.env).filter(key => key.includes('PROKERALA') || key.includes('VITE')));
    
    // Get client credentials from environment variables - try multiple sources
    const clientId = process.env.PROKERALA_CLIENT_ID || 
                     process.env.VITE_PROKERALA_CLIENT_ID ||
                     process.env.NEXT_PUBLIC_PROKERALA_CLIENT_ID;
                     
    const clientSecret = process.env.PROKERALA_CLIENT_SECRET || 
                         process.env.VITE_PROKERALA_CLIENT_SECRET ||
                         process.env.NEXT_PUBLIC_PROKERALA_CLIENT_SECRET;
    
    // This is a fallback for development and testing only
    // IMPORTANT: Replace with your actual credentials for your own deployment
    const fallbackId = "169_6kggk7ouf0w4wccs4skg80kgkws0kc";
    const fallbackSecret = "1ukzhrd7u1c0sgkksgwo0ss84coc0wk8oows80gwkw8gc08kgs";
    
    // Use fallbacks in development only
    const useDevFallbacks = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview';
    const effectiveClientId = clientId || (useDevFallbacks ? fallbackId : null);
    const effectiveClientSecret = clientSecret || (useDevFallbacks ? fallbackSecret : null);
    
    if (!effectiveClientId || !effectiveClientSecret) {
      console.error('Missing API credentials. Client ID present:', !!effectiveClientId, 'Client Secret present:', !!effectiveClientSecret);
      return {
        status: 500,
        headers: corsHeaders,
        body: { 
          error: 'Missing API credentials',
          message: 'The server is not properly configured with Prokerala API credentials.'
        }
      };
    }
    
    console.log('Getting Prokerala token with client ID:', effectiveClientId.substring(0, 5) + '...');
    
    try {
      const response = await axios({
        method: 'POST',
        url: 'https://api.prokerala.com/token',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: new URLSearchParams({
          'grant_type': 'client_credentials',
          'client_id': effectiveClientId,
          'client_secret': effectiveClientSecret
        })
      });
      
      console.log('Successfully retrieved Prokerala token');
      
      return {
        status: 200,
        headers: corsHeaders,
        body: response.data
      };
    } catch (requestError) {
      console.error('Error requesting Prokerala token:', requestError.message);
      if (requestError.response) {
        console.error('Prokerala API response:', requestError.response.status, requestError.response.data);
      }
      
      // Forward the error response from Prokerala
      if (requestError.response) {
        return {
          status: requestError.response.status,
          headers: corsHeaders,
          body: {
            error: 'Authentication error with Prokerala API',
            details: requestError.response.data
          }
        };
      }
      
      throw requestError; // Let the outer catch block handle it
    }
  } catch (error) {
    console.error('Prokerala token error:', error.message);
    
    return {
      status: 500,
      headers: corsHeaders,
      body: { 
        error: 'Authentication error',
        message: error.message || 'Failed to authenticate with Prokerala API'
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
export default async function handler(req, res) {
  // Log the incoming request for debugging
  console.log('Prokerala proxy request received:', {
    url: req.url,
    method: req.method,
    headers: Object.keys(req.headers),
    query: req.query,
    body: req.method === 'POST' ? 'POST data present' : 'No POST data'
  });
  
  // Return early for OPTIONS requests (CORS preflight)
  if (req.method === 'OPTIONS') {
    return handleOptions(req, res);
  }
  
  // Check rate limit
  const rateLimitError = checkRateLimit(req, res);
  if (rateLimitError) {
    res.status(rateLimitError.status).json(rateLimitError.body);
    return;
  }
  
  // Get the endpoint from the path
  let path = '';
  
  // Handle different URL formats
  if (req.url.includes('?')) {
    // Extract path before query parameters
    path = req.url.split('?')[0];
  } else {
    path = req.url;
  }
  
  // Remove any leading/trailing slashes and extract the endpoint
  path = path.replace(/^\/+|\/+$/g, '');
  
  // Check for different possible path formats
  if (path.startsWith('api/prokerala-proxy/')) {
    path = path.replace('api/prokerala-proxy/', '');
  } else if (path.startsWith('prokerala-proxy/')) {
    path = path.replace('prokerala-proxy/', '');
  } else if (path === 'api/prokerala-proxy' || path === 'prokerala-proxy') {
    // Default to token for the base endpoint
    path = 'token';
  }
  
  console.log('Extracted endpoint path:', path);
  
  // Special case for token endpoint - also handle empty path as token
  if (path === '' && req.method === 'POST') {
    path = 'token';
  }
  
  // Add health check endpoint
  if (path === 'health' || path === 'ping') {
    return res.status(200).json({
      status: 'ok',
      message: 'Prokerala proxy is operational',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      serverInfo: {
        nodejs: process.version,
        vercel: process.env.VERCEL_ENV || 'not-vercel',
        region: process.env.VERCEL_REGION || 'unknown'
      }
    });
  }
  
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
      body: { 
        error: 'Endpoint not found',
        message: `No handler found for path: ${path}`,
        requestUrl: req.url
      }
    };
  }
  
  // Set response headers
  Object.entries(response.headers || {}).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  
  // Return response
  res.status(response.status).json(response.body);
} 