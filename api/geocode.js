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

// Hard-coded fallback locations for common cities
const FALLBACK_LOCATIONS = {
  'new york': [{"place_id":325644,"licence":"Data © OpenStreetMap contributors, ODbL 1.0. https://osm.org/copyright","osm_type":"relation","osm_id":175905,"boundingbox":["40.477399","40.9175771","-74.2590899","-73.7004637"],"lat":"40.7127281","lon":"-74.0060152","display_name":"Manhattan, New York County, New York, United States","class":"place","type":"city","importance":0.9758032287459471,"icon":"https://nominatim.openstreetmap.org/ui/mapicons/poi_place_city.p.20.png"}],
  'los angeles': [{"place_id":326519,"licence":"Data © OpenStreetMap contributors, ODbL 1.0. https://osm.org/copyright","osm_type":"relation","osm_id":207359,"boundingbox":["33.7036929","34.3373061","-118.6681759","-118.1552891"],"lat":"34.0536909","lon":"-118.2427666","display_name":"Los Angeles, Los Angeles County, California, United States","class":"place","type":"city","importance":0.9778238771732245,"icon":"https://nominatim.openstreetmap.org/ui/mapicons/poi_place_city.p.20.png"}],
  'chicago': [{"place_id":326324,"licence":"Data © OpenStreetMap contributors, ODbL 1.0. https://osm.org/copyright","osm_type":"relation","osm_id":122604,"boundingbox":["41.6443589","42.023131","-87.9402669","-87.5241868"],"lat":"41.8755616","lon":"-87.6244212","display_name":"Chicago, Cook County, Illinois, United States","class":"place","type":"city","importance":0.9594863321237561,"icon":"https://nominatim.openstreetmap.org/ui/mapicons/poi_place_city.p.20.png"}],
  'delhi': [{"place_id":235505683,"licence":"Data © OpenStreetMap contributors, ODbL 1.0. https://osm.org/copyright","osm_type":"relation","osm_id":1942586,"boundingbox":["28.4047589","28.8816427","76.8382322","77.3465131"],"lat":"28.6517178","lon":"77.2219388","display_name":"Delhi, India","class":"boundary","type":"administrative","importance":0.7940354208965525,"icon":"https://nominatim.openstreetmap.org/ui/mapicons/poi_boundary_administrative.p.20.png"}],
  'mumbai': [{"place_id":235505733,"licence":"Data © OpenStreetMap contributors, ODbL 1.0. https://osm.org/copyright","osm_type":"relation","osm_id":1953654,"boundingbox":["18.8754781","19.2729841","72.7736984","73.0298731"],"lat":"19.0759899","lon":"72.8773928","display_name":"Mumbai, Greater Mumbai City, Maharashtra, India","class":"place","type":"city","importance":0.7999539542884649,"icon":"https://nominatim.openstreetmap.org/ui/mapicons/poi_place_city.p.20.png"}],
  'morena': [{"place_id":235494883,"licence":"Data © OpenStreetMap contributors, ODbL 1.0. https://osm.org/copyright","osm_type":"relation","osm_id":8133235,"boundingbox":["26.4330634","26.3690634","77.9653401","78.0293401"],"lat":"26.4973401","lon":"77.9973401","display_name":"Morena, Morena District, Madhya Pradesh, India","class":"boundary","type":"administrative","importance":0.5301306636629977,"icon":"https://nominatim.openstreetmap.org/ui/mapicons/poi_boundary_administrative.p.20.png"}]
};

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

  // Check for fallback locations first (for reliability)
  const normalizedQuery = q.toLowerCase().trim();
  
  // Check if we have a fallback for this location or a part of it
  for (const [key, value] of Object.entries(FALLBACK_LOCATIONS)) {
    if (normalizedQuery.includes(key)) {
      console.log(`Using fallback data for "${q}" (matched "${key}")`);
      
      // Set CORS headers
      Object.keys(corsHeaders).forEach(key => {
        res.setHeader(key, corsHeaders[key]);
      });
      
      return res.status(200).json(value);
    }
  }
  
  try {
    console.log(`Searching for location: "${q}"`);
    
    // Simplified direct request to Nominatim
    const response = await axios({
      method: 'GET',
      url: 'https://nominatim.openstreetmap.org/search',
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
      timeout: 8000 // 8 second timeout
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
    
    // Try to see if we have a partial match in our fallbacks
    for (const [key, value] of Object.entries(FALLBACK_LOCATIONS)) {
      const words = normalizedQuery.split(/\s+/);
      for (const word of words) {
        if (word.length > 3 && key.includes(word)) {
          console.log(`Using fallback data after error for "${q}" (partial match on "${word}")`);
          
          // Set CORS headers
          Object.keys(corsHeaders).forEach(key => {
            res.setHeader(key, corsHeaders[key]);
          });
          
          return res.status(200).json(value);
        }
      }
    }
    
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