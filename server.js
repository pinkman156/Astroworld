// Express server to handle API requests
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configure middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// OpenStreetMap geocoding endpoint
app.get('/api/geocode', async (req, res) => {
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
    
    return res.json(response.data);
  } catch (error) {
    console.error('Geocoding error:', error.message);
    return res.status(500).json({ 
      error: 'Geocoding service error',
      message: error.message
    });
  }
});

// Prokerala OAuth token endpoint
app.post('/api/prokerala/token', async (req, res) => {
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
    
    return res.json(response.data);
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
});

// Prokerala planet position endpoint
app.get('/api/prokerala/planet-position', async (req, res) => {
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
    
    return res.json(response.data);
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
});

// Prokerala kundli endpoint
app.get('/api/prokerala/kundli', async (req, res) => {
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
      url: 'https://api.prokerala.com/v2/astrology/kundli',
      params: {
        datetime,
        coordinates,
        ayanamsa: ayanamsa || 1
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return res.json(response.data);
  } catch (error) {
    console.error('Prokerala kundli error:', error.message);
    
    // Forward the error response from Prokerala
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    return res.status(500).json({ 
      error: 'API error',
      message: error.message
    });
  }
});

// Prokerala chart endpoint
app.get('/api/prokerala/chart', async (req, res) => {
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
      url: 'https://api.prokerala.com/v2/astrology/chart',
      params: {
        datetime,
        coordinates,
        ayanamsa: ayanamsa || 1
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return res.json(response.data);
  } catch (error) {
    console.error('Prokerala chart error:', error.message);
    
    // Forward the error response from Prokerala
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    return res.status(500).json({ 
      error: 'API error',
      message: error.message
    });
  }
});

// Together AI API endpoint
app.post('/api/together/chat', async (req, res) => {
  try {
    const apiKey = process.env.VITE_TOGETHER_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing API key' });
    }
    
    const response = await axios({
      method: 'POST',
      url: 'https://api.together.xyz/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      data: req.body
    });
    
    return res.json(response.data);
  } catch (error) {
    console.error('Together AI error:', error.message);
    
    // Forward the error response
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    return res.status(500).json({ 
      error: 'API error',
      message: error.message
    });
  }
});

// Add a simple health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 