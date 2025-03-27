// Serverless function for geocoding using OpenStreetMap
const axios = require('axios');

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
  'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
};

// Handle OPTIONS requests for CORS preflight
function handleOptions(req, res) {
  res.status(204).set(corsHeaders).end();
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
    return res.status(400).json({ error: 'Missing query parameter' });
  }
  
  try {
    console.log(`Searching for location: "${q}"`);
    
    const response = await axios({
      method: 'GET',
      url: `https://nominatim.openstreetmap.org/search`,
      params: {
        q,
        format: 'json'
      },
      headers: {
        'User-Agent': 'AstroInsights/1.0',
        'Accept': 'application/json',
        'Accept-Language': 'en'
      }
    });
    
    console.log(`Found ${response.data.length} results for "${q}"`);
    
    // Set CORS headers
    Object.keys(corsHeaders).forEach(key => {
      res.setHeader(key, corsHeaders[key]);
    });
    
    // Return the geocoding data
    return res.status(200).json(response.data);
  } catch (error) {
    console.error('Geocoding error:', error.message);
    console.error('Error details:', error.stack);
    
    // Set CORS headers
    Object.keys(corsHeaders).forEach(key => {
      res.setHeader(key, corsHeaders[key]);
    });
    
    return res.status(500).json({ 
      error: 'Geocoding service error',
      message: error.message
    });
  }
}; 