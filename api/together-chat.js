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

// Together AI Chat API handler
export default async function handler(req, res) {
  // Start timing for performance debugging
  const startTime = Date.now();
  let apiCallStartTime = 0;
  let apiCallEndTime = 0;
  
  // Log request details for debugging
  debugLog('Request received:', {
    method: req.method,
    url: req.url,
    headers: Object.keys(req.headers),
    body: DEBUG.ENABLE_REQUEST_DUMP ? 
      (req.body ? {
        model: req.body.model,
        message_count: req.body.messages?.length || 0,
        max_tokens: req.body.max_tokens || 'not specified',
        temperature: req.body.temperature || 'not specified',
      } : 'No body') : 'Body logging disabled'
  });
  
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
    
    debugLog('API key available:', apiKey.substring(0, 5) + '...');
    
    // Validate request body
    const validation = validateRequest(req.body);
    if (!validation.valid) {
      return res.status(400).set(corsHeaders).json({
        error: validation.error
      });
    }
    
    // Configure shorter timeout to prevent Vercel 504 errors
    // Most serverless functions have 10 second timeouts
    const TIMEOUT_MS = 15000; // 15 seconds timeout
    
    // Check if request is likely to timeout
    let warningFlags = [];
    if (req.body.messages && req.body.messages.length > 0) {
      // Get total message length to estimate if likely to timeout
      const totalTokens = req.body.messages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0);
      debugLog('Estimated input token count:', totalTokens);
      
      if (totalTokens > 8000) {
        warningFlags.push('HIGH_TOKEN_COUNT');
      }
      
      // Check if max_tokens is too high
      if (req.body.max_tokens && req.body.max_tokens > 1000) {
        warningFlags.push('HIGH_MAX_TOKENS');
      }
    }
    
    if (warningFlags.length > 0) {
      debugLog('Warning flags detected:', warningFlags);
    }
    
    // Prepare optimized request parameters
    const requestData = {
      ...req.body,
      // Add temperature if not provided to make responses faster
      temperature: req.body.temperature || 0.3,
      // Limit max_tokens if not provided to prevent timeouts
      max_tokens: Math.min(req.body.max_tokens || 500, 800) // Cap at 800 to prevent timeouts
    };
    
    debugLog('Making request to Together API with params:', {
      model: requestData.model,
      message_count: requestData.messages?.length || 0,
      max_tokens: requestData.max_tokens,
      temperature: requestData.temperature
    });
    
    // Forward request to Together API with timeout
    apiCallStartTime = Date.now();
    const response = await axios({
      method: 'POST',
      url: 'https://api.together.xyz/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      data: requestData,
      timeout: TIMEOUT_MS // Set request timeout
    });
    apiCallEndTime = Date.now();
    
    const apiCallDuration = apiCallEndTime - apiCallStartTime;
    debugLog(`API call completed in ${apiCallDuration}ms`);
    
    // Set CORS headers
    Object.keys(corsHeaders).forEach(key => {
      res.setHeader(key, corsHeaders[key]);
    });
    
    // Return the Together AI response with timing info
    const totalDuration = Date.now() - startTime;
    return res.status(200).json({
      ...response.data,
      _debug: DEBUG.ENABLE_TIMING ? {
        total_duration_ms: totalDuration,
        api_call_duration_ms: apiCallDuration,
        processing_duration_ms: totalDuration - apiCallDuration
      } : undefined
    });
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error('Together AI error:', error.message);
    debugLog('Error details:', {
      message: error.message,
      code: error.code,
      timeout: error.code === 'ECONNABORTED' || error.message.includes('timeout'),
      request_duration_ms: totalDuration,
      api_duration_ms: apiCallEndTime ? (apiCallEndTime - apiCallStartTime) : 'N/A'
    });
    
    if (error.response) {
      debugLog('API response error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    
    // Set CORS headers
    Object.keys(corsHeaders).forEach(key => {
      res.setHeader(key, corsHeaders[key]);
    });
    
    // Specific error for timeout
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return res.status(504).json({ 
        error: "Request timeout",
        message: "The request to Together AI API timed out. Try reducing the complexity of your query or max_tokens.",
        code: "504",
        debug: {
          request_duration_ms: totalDuration,
          input_token_estimate: req.body.messages ? 
            req.body.messages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0) : 'unknown',
          max_tokens_requested: req.body.max_tokens || 'default',
          temperature: req.body.temperature || 'default',
          error_code: error.code,
          error_message: error.message,
          timestamp: new Date().toISOString(),
          warning_flags: warningFlags || []
        }
      });
    }
    
    // Forward the error response from Together AI
    if (error.response) {
      return res.status(error.response.status || 500).json({
        error: 'API response error',
        message: error.response.data?.error?.message || error.message,
        details: error.response.data,
        code: error.response.status.toString(),
        debug: {
          request_duration_ms: totalDuration,
          api_status_code: error.response.status,
          api_status_text: error.response.statusText,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    return res.status(500).json({ 
      error: 'API error',
      message: error.message,
      code: '500',
      debug: {
        error_type: error.name,
        error_message: error.message,
        error_code: error.code,
        request_duration_ms: totalDuration,
        timestamp: new Date().toISOString()
      }
    });
  }
} 