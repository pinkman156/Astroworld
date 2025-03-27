// Serverless function for the Together AI API
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

// Helper function to validate request body
function validateRequest(body) {
  if (!body.model) {
    return {
      valid: false,
      error: 'Missing required parameter: model'
    };
  }
  
  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return {
      valid: false,
      error: 'Missing or invalid parameter: messages'
    };
  }
  
  return { valid: true };
}

// Together AI Chat API handler
module.exports = async (req, res) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleOptions(req, res);
  }
  
  // Check if request method is POST
  if (req.method !== 'POST') {
    return res.status(405).set(corsHeaders).json({
      error: 'Method not allowed',
      message: 'Only POST requests are supported'
    });
  }
  
  try {
    // Get API key from environment variables
    const apiKey = process.env.VITE_TOGETHER_API_KEY;
    
    if (!apiKey) {
      return res.status(500).set(corsHeaders).json({
        error: 'Missing API key',
        message: 'Together AI API key is not configured'
      });
    }
    
    // Validate request body
    const validation = validateRequest(req.body);
    if (!validation.valid) {
      return res.status(400).set(corsHeaders).json({
        error: validation.error
      });
    }
    
    // Forward request to Together AI API
    const response = await axios({
      method: 'POST',
      url: 'https://api.together.xyz/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      data: req.body
    });
    
    // Set CORS headers
    Object.keys(corsHeaders).forEach(key => {
      res.setHeader(key, corsHeaders[key]);
    });
    
    // Return the Together AI response
    return res.status(200).json(response.data);
  } catch (error) {
    console.error('Together AI error:', error.message);
    
    // Set CORS headers
    Object.keys(corsHeaders).forEach(key => {
      res.setHeader(key, corsHeaders[key]);
    });
    
    // Forward the error response from Together AI
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    return res.status(500).json({ 
      error: 'API error',
      message: error.message
    });
  }
}; 