import axios from 'axios';

// Consolidated API handler for geocoding and other non-Prokerala APIs
export default async function handler(req, res) {
  // Extract the specific endpoint from the path
  const path = req.url.split('?')[0];
  const endpoint = path.replace(/^\/api\//, '');
  
  // Log incoming request for debugging
  console.log(`[API] Processing ${req.method} request to ${endpoint}`);
  
  // Route to appropriate handler based on endpoint
  try {
    switch(endpoint) {
      case 'geocode':
        return await handleGeocode(req, res);
      
      // Add more API endpoints here if needed
      
      default:
        return res.status(404).json({ error: 'API endpoint not found' });
    }
  } catch (error) {
    console.error(`[API] Error processing ${endpoint}:`, error.message);
    return res.status(500).json({
      error: 'API Error',
      message: error.message,
      endpoint
    });
  }
}

// Geocoding handler
async function handleGeocode(req, res) {
  try {
    // Accept both 'q' and 'place' parameters for compatibility
    const query = req.query.q || req.query.place;
    
    if (!query) {
      return res.status(400).json({ error: 'Missing query parameter. Use either "q" or "place".' });
    }
    
    const response = await axios({
      method: 'GET',
      url: `https://nominatim.openstreetmap.org/search`,
      params: {
        q: query,
        format: 'json'
      },
      headers: {
        'User-Agent': 'AstroInsights/1.0',
        'Accept': 'application/json',
        'Accept-Language': 'en'
      }
    });
    
    return res.status(200).json(response.data);
  } catch (error) {
    console.error('Geocoding error:', error.message);
    
    return res.status(500).json({ 
      error: 'Geocoding service error',
      message: error.message
    });
  }
} 