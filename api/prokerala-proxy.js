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
    
    console.log('API request parameters:', query);
    
    // Basic required parameters validation
    const validation = validateRequest(query, ['datetime', 'coordinates']);
    if (!validation.valid) {
      return {
        status: 400,
        headers: corsHeaders,
        body: { error: validation.error }
      };
    }
    
    // Token validation
    if (!token) {
      return {
        status: 401,
        headers: corsHeaders,
        body: { error: 'Missing authorization token' }
      };
    }
    
    // CRITICAL FIX: Sanitize and format parameters for Prokerala API
    
    // 1. Handle datetime parameter
    let decodedDatetime = query.datetime;
    try {
      // Safely decode URI components
      try {
        decodedDatetime = decodeURIComponent(decodedDatetime);
      } catch (e) {
        console.warn('Error decoding datetime:', e.message);
      }
      
      // Replace any '+' with ' ' (URL encoding issue)
      decodedDatetime = decodedDatetime.replace(/\+/g, ' ');
      
      // For the chart endpoint
      if (endpoint === 'chart') {
        // Ensure 'T' separator is used instead of space
        if (!decodedDatetime.includes('T')) {
          decodedDatetime = decodedDatetime.replace(' ', 'T');
        }
        
        // VERY IMPORTANT: Standardize the datetime format for chart endpoint
        // First, strip any existing timezone information
        decodedDatetime = decodedDatetime.replace(/([T\s]\d{2}:\d{2}(:\d{2})?)([+-]\d{2}:\d{2})?.*$/, '$1');
        
        // Make sure datetime is in correct format YYYY-MM-DDTHH:MM:SS
        if (!decodedDatetime.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)) {
          return {
            status: 400,
            headers: corsHeaders,
            body: { 
              error: 'Invalid datetime format',
              message: 'Datetime must be in format: YYYY-MM-DDTHH:MM:SS',
              provided: decodedDatetime
            }
          };
        }
        
        // Ensure datetime has seconds part
        if (!decodedDatetime.match(/:\d{2}$/)) {
          decodedDatetime += ':00';
        }
        
        // CRITICAL FIX: Add timezone information required by Prokerala API
        // Add +05:30 for India Standard Time as required by Prokerala
        decodedDatetime += '+05:30';
      } else {
        // For other endpoints, use the standard format with space
        if (decodedDatetime.includes('T')) {
          decodedDatetime = decodedDatetime.replace('T', ' ');
        }
        
        // Remove timezone if present
        decodedDatetime = decodedDatetime.replace(/[+-]\d{2}:\d{2}$/, '');
        
        // Verify format
        if (!decodedDatetime.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/)) {
          return {
            status: 400,
            headers: corsHeaders,
            body: { 
              error: 'Invalid datetime format',
              message: 'Datetime must be in format: YYYY-MM-DD HH:MM:SS',
              provided: decodedDatetime
            }
          };
        }
        
        // Ensure seconds
        if (!decodedDatetime.match(/:\d{2}$/)) {
          decodedDatetime += ':00';
        }
      }
    } catch (datetimeError) {
      console.error('Error processing datetime parameter:', datetimeError);
      return {
        status: 400,
        headers: corsHeaders,
        body: { 
          error: 'Invalid datetime parameter',
          message: datetimeError.message
        }
      };
    }
    
    // 2. Handle chart_type parameter (for chart endpoint)
    let chartType = null;
    if (endpoint === 'chart') {
      if (!query.chart_type) {
        return {
          status: 400,
          headers: corsHeaders,
          body: { 
            error: 'Missing required parameter: chart_type',
            message: 'chart_type is required for chart endpoint. Example: {"name":"Rasi"}'
          }
        };
      }
      
      // Ensure chart_type is valid JSON
      try {
        // If it's already an object, stringify it
        if (typeof query.chart_type === 'object') {
          chartType = JSON.stringify(query.chart_type);
        } else {
          // Try to parse if it's a string
          try {
            const parsedType = JSON.parse(query.chart_type);
            if (!parsedType.name) {
              throw new Error('Missing name property');
            }
            // Re-stringify to ensure proper format
            chartType = JSON.stringify({ name: parsedType.name });
          } catch (parseError) {
            // Handle the case where it might be a single string like "Rasi"
            if (typeof query.chart_type === 'string' && query.chart_type.match(/^[A-Za-z]+$/)) {
              // If it's just a name string (e.g. "Rasi"), convert to proper format
              chartType = JSON.stringify({ name: query.chart_type });
            } else {
              // If parsing fails and it's not a simple string, give clear error
              throw parseError;
            }
          }
        }
      } catch (e) {
        // If parsing fails, give clear error
        return {
          status: 400,
          headers: corsHeaders,
          body: { 
            error: 'Invalid chart_type',
            message: 'chart_type must be valid JSON. Example: {"name":"Rasi"}',
            provided: query.chart_type
          }
        };
      }
      
      // 3. Validate chart_style
      if (!query.chart_style) {
        return {
          status: 400,
          headers: corsHeaders,
          body: { 
            error: 'Missing required parameter: chart_style',
            message: 'chart_style is required for chart endpoint. Example: "north-indian"'
          }
        };
      }
    }
    
    // Construct the final parameters
    const params = {
      datetime: decodedDatetime,
      coordinates: query.coordinates,
      ayanamsa: query.ayanamsa || 1
    };
    
    // Add chart-specific parameters
    if (endpoint === 'chart') {
      params.chart_type = chartType;
      params.chart_style = query.chart_style;

      // Log exactly what's being sent to the API
      console.log('Final parameters being sent to Prokerala API:', {
        url: `https://api.prokerala.com/v2/astrology/${endpoint}`,
        params: JSON.stringify(params),
        decodedParams: params
      });
    }
    
    console.log(`Making ${endpoint} request to Prokerala API with params:`, params);
    
    // Make request to Prokerala API
    try {
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
    } catch (apiError) {
      console.error(`Error from Prokerala API (${endpoint}):`, apiError.message);
      
      // Forward the error response from Prokerala
      if (apiError.response) {
        console.error('Prokerala API error details:', 
          apiError.response.status, 
          JSON.stringify(apiError.response.data, null, 2)
        );
        return {
          status: apiError.response.status,
          headers: corsHeaders,
          body: apiError.response.data
        };
      }
      
      throw apiError; // Re-throw for outer catch block
    }
  } catch (error) {
    console.error(`Prokerala ${endpoint} error:`, error.message);
    
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
  // Return early for OPTIONS requests (CORS preflight)
  if (req.method === 'OPTIONS') {
    return handleOptions(req, res);
  }
  
  // Log the incoming request for debugging
  console.log('Prokerala proxy request received:', {
    url: req.url,
    method: req.method,
    headers: Object.keys(req.headers),
    query: req.query,
    body: req.method === 'POST' ? 'POST data present' : 'No POST data'
  });
  
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
  
  // Add debug endpoint
  if (path === 'debug') {
    // This endpoint just shows how the parameters are being processed without calling the actual API
    try {
      const { query } = req;
      console.log('Debug request with query:', query);
      
      // Process chart_type parameter
      let processedChartType = null;
      if (query.chart_type) {
        try {
          // If it's an object, stringify it
          if (typeof query.chart_type === 'object') {
            processedChartType = JSON.stringify(query.chart_type);
          } else {
            // Try to parse if it's a string
            try {
              const parsed = JSON.parse(query.chart_type);
              processedChartType = JSON.stringify(parsed);
            } catch (parseError) {
              // Handle the case where it might be a single string like "Rasi"
              if (typeof query.chart_type === 'string' && query.chart_type.match(/^[A-Za-z]+$/)) {
                processedChartType = JSON.stringify({ name: query.chart_type });
              } else {
                processedChartType = `Error parsing: ${parseError.message}`;
              }
            }
          }
        } catch (e) {
          processedChartType = `Error parsing: ${e.message}`;
        }
      }
      
      // Process datetime parameter
      let processedDatetime = null;
      if (query.datetime) {
        try {
          // First decode any URL encoding
          const decodedDatetime = decodeURIComponent(query.datetime);
          
          // Replace any '+' with ' ' (URL encoding issue)
          const withoutPlus = decodedDatetime.replace(/\+/g, ' ');
          
          // Convert space to 'T' if needed for ISO format
          let iso = withoutPlus;
          if (!iso.includes('T')) {
            iso = iso.replace(' ', 'T');
          }
          
          // Strip timezone info
          const withoutTZ = iso.replace(/([T\s]\d{2}:\d{2}(:\d{2})?)([+-]\d{2}:\d{2})?.*$/, '$1');
          
          // Add timezone (+05:30 for IST) for chart endpoint
          const withTZ = path === 'chart' ? withoutTZ + '+05:30' : withoutTZ;
          
          processedDatetime = {
            original: query.datetime,
            decoded: decodedDatetime,
            withoutPlus, 
            iso,
            withoutTZ,
            final: withTZ
          };
        } catch (e) {
          processedDatetime = `Error processing: ${e.message}`;
        }
      }
      
      // Construct final parameters as they would be sent to Prokerala
      const finalParams = {
        datetime: processedDatetime?.final || query.datetime,
        coordinates: query.coordinates,
        ayanamsa: query.ayanamsa || '1'
      };
      
      if (path === 'chart') {
        finalParams.chart_type = processedChartType;
        finalParams.chart_style = query.chart_style;
      }
      
      return res.status(200).json({
        debug: true,
        originalRequest: {
          url: req.url,
          query: req.query,
          headers: req.headers
        },
        processedParams: {
          chart_type: {
            original: query.chart_type,
            processed: processedChartType
          },
          datetime: processedDatetime,
          coordinates: query.coordinates,
          ayanamsa: query.ayanamsa,
          chart_style: query.chart_style
        },
        finalParamsForProkerala: finalParams,
        info: "This is a debug endpoint that shows how parameters are processed without calling the actual API"
      });
    } catch (error) {
      return res.status(500).json({
        error: 'Debug error',
        message: error.message || 'An error occurred during debugging'
      });
    }
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