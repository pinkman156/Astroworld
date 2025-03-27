import axios from 'axios';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get client credentials from environment variables
    const clientId = process.env.VITE_PROKERALA_CLIENT_ID;
    const clientSecret = process.env.VITE_PROKERALA_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: 'Missing API credentials' });
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
    
    return res.status(200).json(response.data);
  } catch (error) {
    console.error('Prokerala token error:', error.message);
    
    // Forward the error response from Prokerala
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    return res.status(500).json({ 
      error: 'Authentication error',
      message: error.message
    });
  }
} 