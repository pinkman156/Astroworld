// Serverless function for the Together AI API
import axios from 'axios';

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
  'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
};

// Define debugging options
const DEBUG = {
  ENABLE_LOGS: true,
  ENABLE_REQUEST_DUMP: true,
  ENABLE_TIMING: true
};

// Enhanced logging for debugging
function debugLog(...args) {
  if (DEBUG.ENABLE_LOGS) {
    console.log(`[Together API Debug ${new Date().toISOString()}]`, ...args);
  }
}

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

// Helper to create stream for request data
function countMessageTokens(messages) {
  if (!messages || !Array.isArray(messages)) return 0;
  return messages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0);
}

// Together AI Chat API handler
export default async function handler(req, res) {
  // Start timing for performance debugging
  const startTime = Date.now();
  let apiCallStartTime = 0;
  
  try {
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
    
    // Quick validation and short-circuit for large requests
    const messageTokenCount = countMessageTokens(req.body?.messages);
    const isLargeRequest = messageTokenCount > 10000 || (req.body?.max_tokens || 0) > 1000;
    
    debugLog('Request received:', {
      method: req.method,
      url: req.url,
      message_token_estimate: messageTokenCount,
      isLargeRequest
    });
    
    // Short-circuit for very large requests that would likely timeout
    if (isLargeRequest) {
      debugLog('Request too large, returning early to avoid timeout');
      return res.status(413).json({
        error: 'Request too large',
        message: 'The request is too large and would likely timeout. Please reduce the size of your messages or max_tokens.',
        code: '413',
        debug: {
          message_token_estimate: messageTokenCount,
          max_tokens_requested: req.body?.max_tokens || 'default'
        }
      });
    }
    
    // Get API key
    const apiKey = process.env.TOGETHER_API_KEY || 
                   process.env.VITE_TOGETHER_API_KEY;
    
    if (!apiKey) {
      return res.status(500).set(corsHeaders).json({
        error: 'Missing API key',
        message: 'Together AI API key is not configured'
      });
    }
    
    // Optimize parameters to ensure fast response
    const optimizedBody = {
      ...req.body,
      temperature: req.body.temperature || 0.3,
      max_tokens: Math.min(req.body.max_tokens || 500, 800)
    };
    
    // Set strict timeout for the request
    const TIMEOUT_MS = 8000; // 8 seconds, well below Vercel's 10s limit
    
    // Make request to Together AI
    apiCallStartTime = Date.now();
    const response = await axios({
      method: 'POST',
      url: 'https://api.together.xyz/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      data: optimizedBody,
      timeout: TIMEOUT_MS
    });
    
    const apiCallDuration = Date.now() - apiCallStartTime;
    debugLog(`API call completed in ${apiCallDuration}ms`);
    
    // Set CORS headers and return successful response
    return res.status(200).set(corsHeaders).json(response.data);
    
  } catch (error) {
    // Calculate timing and log error details
    const totalDuration = Date.now() - startTime;
    const apiCallDuration = apiCallStartTime ? (Date.now() - apiCallStartTime) : 0;
    
    console.error(`Together API error (${totalDuration}ms):`, error.message, error.code);
    
    // Set CORS headers
    Object.keys(corsHeaders).forEach(key => {
      res.setHeader(key, corsHeaders[key]);
    });
    
    // Handle standard timeout errors
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return res.status(504).set(corsHeaders).json({ 
        error: "Request timeout",
        message: "The request to Together AI API timed out. Try reducing the message size or max_tokens.",
        code: "504",
        source: "together_api_handler",
        errorDetails: {
          message: error.message,
          code: error.code,
          totalDuration
        }
      });
    }
    
    // Return appropriate error response
    if (error.response) {
      // Forward error from Together API
      return res.status(error.response.status || 500).set(corsHeaders).json({
        error: error.response.data?.error || 'API response error',
        message: error.response.data?.error?.message || error.message,
        code: error.response.status.toString(),
        source: "together_api"
      });
    }
    
    // Generic error
    return res.status(500).set(corsHeaders).json({ 
      error: 'API error',
      message: error.message,
      code: '500',
      source: "together_api_handler"
    });
  }
} 