// Serverless function for the Together AI API
import axios from 'axios';

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
  'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
};

// Simple debug log function
function log(message, data = {}) {
  console.log(`[Together API] ${message}`, data);
}

// Handle OPTIONS requests for CORS preflight
function handleOptions(req, res) {
  return res.status(204).set(corsHeaders).end();
}

// Simple health check
function handleHealthCheck(req, res) {
  try {
    const apiKey = process.env.TOGETHER_API_KEY || process.env.VITE_TOGETHER_API_KEY;
    
    return res.status(200).set(corsHeaders).json({
      status: apiKey ? 'ok' : 'error',
      message: apiKey ? 'API is operational' : 'Missing API key',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).set(corsHeaders).json({
      status: 'error',
      message: error.message
    });
  }
}

// Main handler function - kept as simple as possible
export default async function handler(req, res) {
  // Handle OPTIONS requests (CORS preflight)
  if (req.method === 'OPTIONS') {
    return handleOptions(req, res);
  }
  
  // Handle health check - check path in multiple ways for reliability
  if (req.url.includes('/health') || 
      req.url.includes('/ping') || 
      (req.url.includes('/together') && req.url.includes('/health')) ||
      req.query.health === 'true') {
    log('Health check requested');
    return handleHealthCheck(req, res);
  }
  
  // Only accept POST requests for the main endpoint
  if (req.method !== 'POST') {
    return res.status(405).set(corsHeaders).json({
      error: 'Method not allowed',
      message: 'Only POST requests are supported for this endpoint'
    });
  }
  
  // Track request ID for logs
  const requestId = Date.now().toString(36);
  log(`[${requestId}] Request received`);
  
  try {
    // Validate basic request
    if (!req.body) {
      log(`[${requestId}] Missing request body`);
      return res.status(400).set(corsHeaders).json({
        error: 'Invalid request',
        message: 'Request body is missing'
      });
    }
    
    // Validate required parameters
    if (!req.body.model) {
      log(`[${requestId}] Missing model parameter`);
      return res.status(400).set(corsHeaders).json({
        error: 'Invalid request',
        message: 'The "model" parameter is required'
      });
    }
    
    if (!req.body.messages || !Array.isArray(req.body.messages) || req.body.messages.length === 0) {
      log(`[${requestId}] Invalid or missing messages parameter`);
      return res.status(400).set(corsHeaders).json({
        error: 'Invalid request',
        message: 'The "messages" parameter must be a non-empty array'
      });
    }
    
    // Get API key
    const apiKey = process.env.TOGETHER_API_KEY || process.env.VITE_TOGETHER_API_KEY;
    
    if (!apiKey) {
      log(`[${requestId}] Missing API key`);
      return res.status(500).set(corsHeaders).json({
        error: 'Configuration error',
        message: 'API key is not configured'
      });
    }
    
    // Prepare optimized request parameters
    const requestData = {
      model: req.body.model,
      messages: req.body.messages,
      temperature: req.body.temperature || 0.7,
      max_tokens: Math.min(req.body.max_tokens || 200, 500), // Cap at 500 tokens
    };
    
    // Log request (without sensitive data)
    log(`[${requestId}] Making Together API request`, {
      model: requestData.model,
      messages_count: requestData.messages.length
    });
    
    // Make request to Together AI
    const response = await axios({
      method: 'POST',
      url: 'https://api.together.xyz/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      data: requestData,
      timeout: 8000 // 8 second timeout
    });
    
    // Log success
    log(`[${requestId}] API request successful`);
    
    // Return the API response
    return res.status(200).set(corsHeaders).json(response.data);
    
  } catch (error) {
    log(`[${requestId}] Error occurred: ${error.message}`);
    
    // Handle timeout errors
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return res.status(504).set(corsHeaders).json({
        error: 'Gateway timeout',
        message: 'The request to the AI service timed out'
      });
    }
    
    // Handle API errors
    if (error.response) {
      const statusCode = error.response.status || 500;
      const errorMessage = error.response?.data?.error?.message || error.message;
      
      return res.status(statusCode).set(corsHeaders).json({
        error: 'API error',
        message: errorMessage
      });
    }
    
    // Generic error handling
    return res.status(500).set(corsHeaders).json({
      error: 'Server error',
      message: 'An unexpected error occurred while processing your request'
    });
  }
} 