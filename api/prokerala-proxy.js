import axios from 'axios';

/**
 * Generic proxy handler for all Prokerala API endpoints
 * This serverless function acts as a middleware between frontend and the Prokerala API
 * to avoid CORS issues and securely handle API credentials
 */
export default async function handler(req, res) {
  // Always set CORS headers to allow requests from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Extract endpoint path and API version from query parameters
    const { endpoint, version = 'v2' } = req.query;
    
    if (!endpoint) {
      return res.status(400).json({
        error: 'Missing required parameter: endpoint',
        message: 'Please specify which Prokerala API endpoint you want to access'
      });
    }
    
    // Get authorization from request headers or get a new token
    let token = req.headers.authorization?.split(' ')[1];
    
    // If no token is provided, generate a new one
    if (!token && endpoint !== 'token') {
      token = await getProkeralaToken();
    }

    // Construct Prokerala API URL
    const apiUrl = endpoint === 'token' 
      ? 'https://api.prokerala.com/token'
      : `https://api.prokerala.com/${version}/astrology/${endpoint}`;

    // Handle different request methods
    let response;
    if (req.method === 'POST') {
      // For token requests and other POST endpoints
      response = await axios({
        method: 'POST',
        url: apiUrl,
        headers: {
          'Content-Type': endpoint === 'token' ? 'application/x-www-form-urlencoded' : 'application/json',
          ...(token && endpoint !== 'token' ? { 'Authorization': `Bearer ${token}` } : {})
        },
        data: endpoint === 'token' 
          ? new URLSearchParams({
              'grant_type': 'client_credentials',
              'client_id': process.env.VITE_PROKERALA_CLIENT_ID,
              'client_secret': process.env.VITE_PROKERALA_CLIENT_SECRET
            }) 
          : req.body
      });
    } else {
      // For GET requests
      response = await axios({
        method: 'GET',
        url: apiUrl,
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        params: req.query
      });
    }

    // Return the response from Prokerala API
    return res.status(response.status || 200).json(response.data);
  } catch (error) {
    console.error(`[Prokerala Proxy] Error:`, error.message);
    
    // Forward error from Prokerala API if available
    if (error.response) {
      return res.status(error.response.status || 500).json({
        ...error.response.data,
        proxy_message: 'Error from Prokerala API'
      });
    }
    
    // Generic error handling
    return res.status(500).json({
      error: 'Proxy Error',
      message: error.message,
      help: 'Check server logs for more details'
    });
  }
}

/**
 * Gets a token from Prokerala API
 * @returns {Promise<string>} Access token
 */
async function getProkeralaToken() {
  try {
    const response = await axios({
      method: 'POST',
      url: 'https://api.prokerala.com/token',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: new URLSearchParams({
        'grant_type': 'client_credentials',
        'client_id': process.env.VITE_PROKERALA_CLIENT_ID,
        'client_secret': process.env.VITE_PROKERALA_CLIENT_SECRET
      })
    });
    
    if (response.data && response.data.access_token) {
      return response.data.access_token;
    }
    
    throw new Error('Failed to get access token from Prokerala API');
  } catch (error) {
    console.error('Error getting Prokerala token:', error.message);
    throw error;
  }
} 