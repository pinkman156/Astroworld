import axios from 'axios';

// Consolidated API handler for all Prokerala endpoints
export default async function handler(req, res) {
  // Extract the specific endpoint from the path
  const path = req.url.split('?')[0];
  const endpoint = path.replace(/^\/api\//, '');
  
  // Log incoming request for debugging
  console.log(`[Prokerala API] Processing ${req.method} request to ${endpoint}`);
  
  // Get credentials (try multiple formats)
  const clientId = 
    process.env.VITE_PROKERALA_CLIENT_ID || 
    process.env.PROKERALA_CLIENT_ID || 
    process.env.NEXT_PUBLIC_PROKERALA_CLIENT_ID;
  
  const clientSecret = 
    process.env.VITE_PROKERALA_CLIENT_SECRET || 
    process.env.PROKERALA_CLIENT_SECRET || 
    process.env.NEXT_PUBLIC_PROKERALA_CLIENT_SECRET;
  
  // Route to appropriate handler based on endpoint
  try {
    switch(endpoint) {
      case 'prokerala-token':
      case 'auth/prokerala':
        return await handleProkeralaToken(req, res, clientId, clientSecret);
      
      case 'prokerala-planet-position':
        return await handlePlanetPosition(req, res);
      
      case 'prokerala-kundli':
        return await handleKundli(req, res);
      
      case 'prokerala-chart':
        return await handleChart(req, res);
      
      case 'prokerala-test':
        return await handleProkeralaTest(req, res, clientId, clientSecret);
      
      case 'env-test':
        return handleEnvTest(req, res);
      
      default:
        return res.status(404).json({ error: 'API endpoint not found' });
    }
  } catch (error) {
    console.error(`[Prokerala API] Error processing ${endpoint}:`, error.message);
    return res.status(500).json({
      error: 'API Error',
      message: error.message,
      endpoint
    });
  }
}

// Token handler
async function handleProkeralaToken(req, res, clientId, clientSecret) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Log for debugging
    console.log('Token request with credentials:', {
      clientIdExists: !!clientId,
      clientIdLength: clientId ? clientId.length : 0,
      clientSecretExists: !!clientSecret
    });
    
    if (!clientId || !clientSecret) {
      return res.status(500).json({ 
        error: 'Missing API credentials'
      });
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
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    return res.status(500).json({ 
      error: 'Authentication error',
      message: error.message
    });
  }
}

// Planet position handler
async function handlePlanetPosition(req, res) {
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
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    return res.status(500).json({ 
      error: 'API error',
      message: error.message
    });
  }
}

// Kundli handler
async function handleKundli(req, res) {
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
    
    return res.status(200).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    return res.status(500).json({ 
      error: 'API error',
      message: error.message
    });
  }
}

// Chart handler
async function handleChart(req, res) {
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
    
    return res.status(200).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    return res.status(500).json({ 
      error: 'API error',
      message: error.message
    });
  }
}

// Prokerala Test handler
async function handleProkeralaTest(req, res, clientId, clientSecret) {
  try {
    // Log for debugging
    console.log('Prokerala test with credentials:', { 
      clientIdExists: !!clientId,
      clientIdLength: clientId ? clientId.length : 0,
      clientSecretExists: !!clientSecret
    });
    
    if (!clientId || !clientSecret) {
      return res.status(500).json({
        error: 'Missing credentials',
        tip: 'Make sure to set VITE_PROKERALA_CLIENT_ID and VITE_PROKERALA_CLIENT_SECRET in Vercel environment variables'
      });
    }
    
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId)) {
      return res.status(400).json({
        error: 'Invalid client ID format',
        message: 'The client ID must be a valid UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)'
      });
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
    
    return res.status(200).json({
      success: true,
      tokenType: response.data.token_type,
      expiresIn: response.data.expires_in,
      message: 'Successfully authenticated with Prokerala API'
    });
    
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json({
        error: 'Prokerala API error',
        response: error.response.data
      });
    }
    
    return res.status(500).json({
      error: 'Prokerala API error',
      message: error.message
    });
  }
}

// Environment Test handler
function handleEnvTest(req, res) {
  try {
    // Get environment variables (redacted for security)
    const envVars = Object.keys(process.env)
      .filter(key => key.includes('PROKERALA') || key.includes('VITE_'))
      .reduce((obj, key) => {
        const value = process.env[key];
        obj[key] = {
          exists: !!value,
          length: value ? value.length : 0,
          isUUID: value ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) : false
        };
        return obj;
      }, {});

    return res.status(200).json({
      message: 'Environment variables check',
      environment: process.env.NODE_ENV || 'Not set',
      runtime: process.env.VERCEL ? 'Vercel' : 'Other',
      variables: envVars,
      allEnvKeys: Object.keys(process.env).length
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Error checking environment variables',
      message: error.message
    });
  }
} 