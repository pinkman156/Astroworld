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
  ENABLE_TIMING: true,
  LOG_ENV_VARS: true
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

// Safe stringify function to handle circular references
function safeStringify(obj, indent = 2) {
  const cache = new Set();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) {
        return '[Circular Reference]';
      }
      cache.add(value);
    }
    // Truncate large string values
    if (typeof value === 'string' && value.length > 500) {
      return value.substring(0, 500) + '... [truncated]';
    }
    return value;
  }, indent);
}

// Health check handler
async function handleHealthCheck(req, res) {
  try {
    debugLog('Health check started');
    // Get API key
    const apiKey = process.env.TOGETHER_API_KEY || 
                   process.env.VITE_TOGETHER_API_KEY;
                   
    if (!apiKey) {
      return res.status(200).set(corsHeaders).json({
        status: 'error',
        error: 'No API key configured'
      });
    }
    
    // Check if API key has proper format (basic validation)
    if (apiKey.length < 20) {
      return res.status(200).set(corsHeaders).json({
        status: 'error',
        error: 'API key appears invalid (too short)'
      });
    }
    
    // Log environment info (only useful parts)
    if (DEBUG.LOG_ENV_VARS) {
      const envInfo = {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
        VERCEL_REGION: process.env.VERCEL_REGION,
        API_KEYS_AVAILABLE: {
          TOGETHER_API_KEY: !!process.env.TOGETHER_API_KEY,
          VITE_TOGETHER_API_KEY: !!process.env.VITE_TOGETHER_API_KEY
        }
      };
      debugLog('Environment info:', envInfo);
    }
    
    return res.status(200).set(corsHeaders).json({
      status: 'ok',
      message: 'Together AI API endpoint is operational',
      keyStatus: 'available',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    debugLog('Health check error:', error.message);
    return res.status(500).set(corsHeaders).json({
      status: 'error',
      error: error.message
    });
  }
}

// Together AI Chat API handler
export default async function handler(req, res) {
  // Start timing for performance debugging
  const startTime = Date.now();
  let apiCallStartTime = 0;
  
  // Track execution phases
  const phases = {
    start: startTime,
    validation: 0,
    preRequest: 0,
    apiRequest: 0,
    postRequest: 0,
    error: 0,
    end: 0
  };
  
  // Debug tracking object for request
  const requestRecord = {
    id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    path: req.url,
    method: req.method,
    startTime: new Date().toISOString(),
    error: null,
    phases: {}
  };
  
  debugLog(`[${requestRecord.id}] Request received`);
  
  try {
    // Check for health check endpoint
    if (req.url.includes('/health') || req.url.includes('/ping')) {
      return handleHealthCheck(req, res);
    }
    
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      debugLog(`[${requestRecord.id}] Handling OPTIONS request`);
      return handleOptions(req, res);
    }
    
    // Check if request method is POST
    if (req.method !== 'POST') {
      debugLog(`[${requestRecord.id}] Invalid method: ${req.method}`);
      return res.status(405).set(corsHeaders).json({
        error: 'Method not allowed',
        message: 'Only POST requests are supported'
      });
    }
    
    // Validation phase
    phases.validation = Date.now();
    requestRecord.phases.validation = phases.validation - phases.start;
    
    // Quick validation and short-circuit for large requests
    const messageTokenCount = countMessageTokens(req.body?.messages);
    const isLargeRequest = messageTokenCount > 10000 || (req.body?.max_tokens || 0) > 1000;
    
    debugLog(`[${requestRecord.id}] Request validation complete:`, {
      message_count: req.body?.messages?.length,
      message_token_estimate: messageTokenCount,
      isLargeRequest,
      model: req.body?.model
    });
    
    // Short-circuit for very large requests that would likely timeout
    if (isLargeRequest) {
      debugLog(`[${requestRecord.id}] Request too large, returning early`);
      return res.status(413).set(corsHeaders).json({
        error: 'Request too large',
        message: 'The request is too large and would likely timeout. Please reduce the size of your messages or max_tokens.',
        code: '413',
        debug: {
          message_token_estimate: messageTokenCount,
          max_tokens_requested: req.body?.max_tokens || 'default'
        }
      });
    }
    
    // Pre-request phase
    phases.preRequest = Date.now();
    requestRecord.phases.preRequest = phases.preRequest - phases.validation;
    
    // Get API key
    const apiKey = process.env.TOGETHER_API_KEY || 
                   process.env.VITE_TOGETHER_API_KEY;
    
    if (!apiKey) {
      debugLog(`[${requestRecord.id}] Missing API key`);
      console.error('Missing Together AI API key. Available env vars:', Object.keys(process.env).filter(k => !k.includes('npm_')).join(', '));
      
      return res.status(500).set(corsHeaders).json({
        error: 'Missing API key',
        message: 'Together AI API key is not configured',
        requestId: requestRecord.id
      });
    }
    
    debugLog(`[${requestRecord.id}] API key found (starts with ${apiKey.substring(0, 3)}...)`);
    
    // Optimize parameters to ensure fast response
    const optimizedBody = {
      ...req.body,
      temperature: req.body.temperature || 0.3,
      max_tokens: Math.min(req.body.max_tokens || 500, 800)
    };
    
    debugLog(`[${requestRecord.id}] Request body optimized:`, {
      model: optimizedBody.model,
      temperature: optimizedBody.temperature,
      max_tokens: optimizedBody.max_tokens
    });
    
    // Set strict timeout for the request
    const TIMEOUT_MS = 8000; // 8 seconds, well below Vercel's 10s limit
    
    // API request phase
    phases.apiRequest = Date.now();
    requestRecord.phases.apiRequestPrep = phases.apiRequest - phases.preRequest;
    
    // Make request to Together AI
    debugLog(`[${requestRecord.id}] Making request to Together AI API`);
    apiCallStartTime = Date.now();
    
    try {
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
      
      // Post-request phase
      phases.postRequest = Date.now();
      const apiCallDuration = phases.postRequest - apiCallStartTime;
      requestRecord.phases.apiCall = apiCallDuration;
      
      debugLog(`[${requestRecord.id}] API call completed in ${apiCallDuration}ms`);
      
      if (response.status !== 200) {
        debugLog(`[${requestRecord.id}] API returned non-200 status: ${response.status}`);
      }
      
      // Set CORS headers and return successful response
      debugLog(`[${requestRecord.id}] Returning successful response`);
      
      phases.end = Date.now();
      requestRecord.phases.total = phases.end - phases.start;
      
      const responseData = {
        ...response.data,
        _debug: {
          requestId: requestRecord.id,
          processing_time_ms: requestRecord.phases
        }
      };
      
      return res.status(200).set(corsHeaders).json(responseData);
    } catch (apiError) {
      // API call failed
      phases.error = Date.now();
      
      // Track specific error
      const apiDuration = phases.error - apiCallStartTime;
      requestRecord.error = {
        message: apiError.message,
        code: apiError.code,
        phase: 'api_call',
        duration_ms: apiDuration
      };
      
      debugLog(`[${requestRecord.id}] API call failed after ${apiDuration}ms:`, apiError.message);
      console.error(`Together API call error (${apiDuration}ms):`, apiError.message, apiError.code);
      
      // Check if it's a network error
      if (!apiError.response) {
        debugLog(`[${requestRecord.id}] Network error (no response)`);
        console.error('Network error details:', {
          code: apiError.code,
          message: apiError.message,
          isTimeout: apiError.code === 'ECONNABORTED' || apiError.message.includes('timeout')
        });
      } else {
        // Log API error response
        debugLog(`[${requestRecord.id}] API error response:`, {
          status: apiError.response.status,
          statusText: apiError.response.statusText,
          data: safeStringify(apiError.response.data)
        });
      }
      
      // Re-throw to outer catch
      throw apiError;
    }
  } catch (error) {
    // Final error handling
    const totalDuration = Date.now() - startTime;
    const apiCallDuration = apiCallStartTime ? (Date.now() - apiCallStartTime) : 0;
    
    // Update error details if not already set
    if (!requestRecord.error) {
      requestRecord.error = {
        message: error.message,
        code: error.code,
        phase: 'unknown',
        duration_ms: totalDuration
      };
    }
    
    phases.end = Date.now();
    requestRecord.phases.total = phases.end - phases.start;
    
    // Log the full error
    debugLog(`[${requestRecord.id}] Error occurred:`, {
      message: error.message,
      code: error.code,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    });
    
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
        requestId: requestRecord.id,
        errorDetails: {
          message: error.message,
          code: error.code,
          duration_ms: totalDuration,
          phases: requestRecord.phases
        }
      });
    }
    
    // Return appropriate error response
    if (error.response) {
      // Forward error from Together API
      const statusCode = error.response.status || 500;
      
      return res.status(statusCode).set(corsHeaders).json({
        error: error.response.data?.error || 'API response error',
        message: error.response.data?.error?.message || error.message,
        code: statusCode.toString(),
        source: "together_api",
        requestId: requestRecord.id,
        errorDetails: {
          api_status: statusCode,
          api_message: error.response.statusText,
          duration_ms: totalDuration,
          phases: requestRecord.phases
        }
      });
    }
    
    // Generic error with maximum debug info
    return res.status(500).set(corsHeaders).json({ 
      error: 'API error',
      message: error.message || 'Unknown error occurred',
      code: '500',
      source: "together_api_handler",
      requestId: requestRecord.id,
      errorDetails: {
        error_type: error.name,
        error_message: error.message,
        error_code: error.code,
        stack: process.env.NODE_ENV !== 'production' ? error.stack?.split('\n').slice(0, 3) : undefined,
        duration_ms: totalDuration,
        phases: requestRecord.phases
      }
    });
  }
} 