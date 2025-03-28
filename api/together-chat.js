// Serverless function for the Together AI API
import axios from 'axios';

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
export default async function handler(req, res) {
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
    // Get API key from environment variables - try multiple sources
    const apiKey = process.env.TOGETHER_API_KEY || 
                   process.env.VITE_TOGETHER_API_KEY || 
                   process.env.NEXT_PUBLIC_TOGETHER_API_KEY;
    
    if (!apiKey) {
      console.error('Missing Together AI API key. Environment variables available:', 
        Object.keys(process.env).filter(key => key.includes('TOGETHER') || key.includes('API')));
      return res.status(500).set(corsHeaders).json({
        error: 'Missing API key',
        message: 'Together AI API key is not configured'
      });
    }
    
    console.log('Calling Together AI API with key:', apiKey.substring(0, 5) + '...');
    
    // Validate request body
    const validation = validateRequest(req.body);
    if (!validation.valid) {
      return res.status(400).set(corsHeaders).json({
        error: validation.error
      });
    }
    
    // Configure shorter timeout to prevent Vercel 504 errors
    // Most serverless functions have 10 second timeouts
    const TIMEOUT_MS = 8000; // 8 seconds timeout
    
    // Forward request to Together AI API with timeout
    const response = await axios({
      method: 'POST',
      url: 'https://api.together.xyz/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      data: {
        ...req.body,
        // Add temperature if not provided to make responses faster
        temperature: req.body.temperature || 0.3,
        // Limit max_tokens if not provided to prevent timeouts
        max_tokens: req.body.max_tokens || 500
      },
      timeout: TIMEOUT_MS // Set request timeout
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
    
    // Specific error for timeout
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return res.status(504).json({ 
        error: 'Request timeout',
        message: 'The request to Together AI API timed out. Try reducing the complexity of your query or max_tokens.',
        code: '504'
      });
    }
    
    // Forward the error response from Together AI
    if (error.response) {
      return res.status(error.response.status || 500).json({
        error: 'API response error',
        message: error.response.data?.error?.message || error.message,
        details: error.response.data,
        code: error.response.status.toString()
      });
    }
    
    return res.status(500).json({ 
      error: 'API error',
      message: error.message,
      code: '500'
    });
  }
} 