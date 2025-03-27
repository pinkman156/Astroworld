// Serverless function for geocoding using OpenStreetMap
const axios = require('axios');

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
  'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
};

// Simple in-memory cache for geocoding results (lasts for the function instance lifetime)
const geocodeCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Handle OPTIONS requests for CORS preflight
function handleOptions(req, res) {
  res.status(204).set(corsHeaders).end();
}

// Helper function for exponential backoff retry
async function fetchWithRetry(url, options, maxRetries = 3) {
  let lastError;
  let delay = 1000; // Initial delay of 1 second

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await axios(options);
    } catch (error) {
      console.log(`Attempt ${attempt + 1} failed: ${error.message}`);
      lastError = error;
      
      // Only retry certain errors
      if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET' || 
          (error.response && (error.response.status === 429 || error.response.status >= 500))) {
        // Wait with exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Double the delay for next attempt
      } else {
        // Don't retry other errors
        throw error;
      }
    }
  }
  
  // If we got here, all retries failed
  throw lastError;
}

// Geocoding API handler
module.exports = async (req, res) => {
  console.log('Geocoding API called with query:', req.query);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleOptions(req, res);
  }
  
  // Validate query parameter
  const { q } = req.query;
  
  if (!q) {
    console.error('Missing query parameter');
    return res.status(400).set(corsHeaders).json({ error: 'Missing query parameter' });
  }

  // Check cache first
  const cacheKey = q.toLowerCase().trim();
  if (geocodeCache.has(cacheKey)) {
    const cacheEntry = geocodeCache.get(cacheKey);
    // If cache entry is still valid
    if (Date.now() - cacheEntry.timestamp < CACHE_TTL) {
      console.log(`Cache hit for "${q}"`);
      
      // Set CORS headers
      Object.keys(corsHeaders).forEach(key => {
        res.setHeader(key, corsHeaders[key]);
      });
      
      return res.status(200).json(cacheEntry.data);
    } else {
      // Clear expired cache entry
      geocodeCache.delete(cacheKey);
    }
  }
  
  try {
    console.log(`Searching for location: "${q}"`);
    
    const requestOptions = {
      method: 'GET',
      url: `https://nominatim.openstreetmap.org/search`,
      params: {
        q,
        format: 'json',
        limit: 5
      },
      headers: {
        'User-Agent': 'AstroInsights/1.0 (https://astroworld-delta.vercel.app)',
        'Accept': 'application/json',
        'Accept-Language': 'en',
        'Referer': 'https://astroworld-delta.vercel.app/'
      },
      timeout: 10000 // 10 second timeout
    };
    
    // Try using our retry mechanism
    const response = await fetchWithRetry(
      'https://nominatim.openstreetmap.org/search',
      requestOptions,
      3 // maximum 3 retries
    );
    
    console.log(`Found ${response.data.length} results for "${q}"`);
    
    // Cache the successful result
    geocodeCache.set(cacheKey, {
      data: response.data,
      timestamp: Date.now()
    });
    
    // Set CORS headers
    Object.keys(corsHeaders).forEach(key => {
      res.setHeader(key, corsHeaders[key]);
    });
    
    // Return the geocoding data
    return res.status(200).json(response.data);
  } catch (error) {
    console.error('Geocoding error:', error.message);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      request: error.request ? 'present' : 'absent',
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : 'absent'
    });
    
    // Set CORS headers
    Object.keys(corsHeaders).forEach(key => {
      res.setHeader(key, corsHeaders[key]);
    });
    
    return res.status(500).json({ 
      error: 'Geocoding service error',
      message: error.message,
      code: error.code || 'UNKNOWN',
      suggestion: 'Try a different location or check if the service is accessible'
    });
  }
}; 