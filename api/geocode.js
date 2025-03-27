import axios from 'axios';

export default async function handler(req, res) {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Missing query parameter' });
    }
    
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
    
    return res.status(200).json(response.data);
  } catch (error) {
    console.error('Geocoding error:', error.message);
    return res.status(500).json({ 
      error: 'Geocoding service error',
      message: error.message
    });
  }
} 