import axios from 'axios';

export default async function handler(req, res) {
  try {
    const { datetime, coordinates, ayanamsa } = req.query;
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!datetime || !coordinates) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    if (!token) {
      return res.status(401).json({ error: 'Missing authorization token' });
    }
    
    const response = await axios({
      method: 'GET',
      url: 'https://api.prokerala.com/v2/astrology/planet-position',
      params: {
        datetime,
        coordinates,
        ayanamsa: ayanamsa || 1
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return res.status(200).json(response.data);
  } catch (error) {
    console.error('Prokerala planet position error:', error.message);
    
    // Forward the error response from Prokerala
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    return res.status(500).json({ 
      error: 'API error',
      message: error.message
    });
  }
} 