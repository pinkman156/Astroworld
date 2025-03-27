import axios from 'axios';

// Consolidated API handler for all Prokerala endpoints
export default async function handler(req, res) {
  // Enhanced CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle OPTIONS requests for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Extract the specific endpoint from the path
  const path = req.url.split('?')[0];
  const endpoint = path.replace(/^\/api\//, '');
  
  // Ensure request body is properly parsed
  let parsedBody = req.body;
  if (req.body && typeof req.body === 'string' && req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
    try {
      // Parse URL encoded form data
      const params = new URLSearchParams(req.body);
      parsedBody = {};
      for (const [key, value] of params.entries()) {
        parsedBody[key] = value;
      }
      req.body = parsedBody;
    } catch (error) {
      console.error('Error parsing form data:', error);
    }
  }
  
  // Log incoming request for debugging
  console.log(`[Prokerala API] Processing ${req.method} request to ${endpoint}`, {
    contentType: req.headers['content-type'],
    bodyType: typeof req.body,
    parsedBodyKeys: req.body ? Object.keys(req.body) : []
  });
  
  // Get client credentials from environment variables
  const clientId = process.env.VITE_PROKERALA_CLIENT_ID;
  const clientSecret = process.env.VITE_PROKERALA_CLIENT_SECRET;
  
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
    // Try to get credentials from multiple sources
    // 1. Environment variables (multiple possible formats)
    // 2. Request body (client can provide credentials directly)
    let requestClientId = clientId;
    let requestClientSecret = clientSecret;
    
    // Check request body for credentials as fallback
    try {
      const body = req.body;
      if (body && body.client_id && body.client_secret) {
        requestClientId = body.client_id;
        requestClientSecret = body.client_secret;
        console.log('Using credentials from request body');
      } else if (typeof req.body === 'string') {
        // Try to parse URL encoded form data
        const params = new URLSearchParams(req.body);
        if (params.has('client_id') && params.has('client_secret')) {
          requestClientId = params.get('client_id');
          requestClientSecret = params.get('client_secret');
          console.log('Using credentials from URL encoded form data');
        }
      }
    } catch (e) {
      console.error('Error parsing request body:', e.message);
    }
    
    // Debug information (no sensitive data logged)
    console.log('Token request debug:', {
      clientIdFromEnv: !!clientId,
      clientIdFromRequest: !!requestClientId,
      clientIdIsUUID: requestClientId ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestClientId) : false,
      secretFromEnv: !!clientSecret,
      secretFromRequest: !!requestClientSecret,
      envVars: Object.keys(process.env).filter(k => k.includes('PROKERALA') || k.includes('VITE_')),
      method: req.method,
      contentType: req.headers['content-type'],
      bodyType: typeof req.body,
      hasBody: !!req.body
    });
    
    if (!requestClientId || !requestClientSecret) {
      return res.status(500).json({ 
        error: 'Missing API credentials',
        debug: {
          clientIdExists: !!requestClientId,
          secretExists: !!requestClientSecret,
          envVars: Object.keys(process.env).filter(k => k.includes('PROKERALA') || k.includes('VITE_')),
          help: "Make sure VITE_PROKERALA_CLIENT_ID and VITE_PROKERALA_CLIENT_SECRET are set in your Vercel environment variables"
        }
      });
    }
    
    // Check if client ID is a valid UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestClientId)) {
      return res.status(400).json({
        error: 'Invalid client ID format',
        message: 'The client ID must be a valid UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
        help: "Check your Prokerala API credentials - the client ID should be in UUID format"
      });
    }
    
    // Make the actual request to Prokerala API
    const response = await axios({
      method: 'POST',
      url: 'https://api.prokerala.com/token',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: new URLSearchParams({
        'grant_type': 'client_credentials',
        'client_id': requestClientId,
        'client_secret': requestClientSecret
      })
    });
    
    // Add debugging info to successful response
    return res.status(200).json({
      ...response.data,
      debug: {
        message: "Token successfully retrieved from Prokerala API",
        usingEnvVars: requestClientId === clientId
      }
    });
  } catch (error) {
    console.error('Prokerala token error:', error.message);
    
    // Enhanced error handling
    if (error.response) {
      // Forward Prokerala error with diagnostics
      const responseData = error.response.data;
      return res.status(error.response.status).json({
        ...responseData,
        debug: {
          message: "Error from Prokerala API",
          status: error.response.status,
          error: error.message,
          help: "This error came directly from the Prokerala API. Verify your client ID and secret."
        }
      });
    }
    
    // General error
    return res.status(500).json({ 
      error: 'Authentication error',
      message: error.message,
      help: "If this persists, try adding your Prokerala credentials directly in the request body."
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