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
  LOG_ENV_VARS: true,
  INSPECT_REQUEST_BODY: true, // Enable detailed request body inspection
};

// Enhanced logging for debugging
function debugLog(...args) {
  try {
    if (DEBUG.ENABLE_LOGS) {
      console.log(`[Together API Debug ${new Date().toISOString()}]`, ...args);
    }
  } catch (e) {
    console.error('Debug log error:', e.message);
  }
}

// Handle OPTIONS requests for CORS preflight
function handleOptions(req, res) {
  res.status(204).set(corsHeaders).end();
}

// Helper function to validate request body
function validateRequest(body) {
  // First check if body exists at all
  if (!body) {
    return {
      valid: false,
      error: 'Missing request body'
    };
  }

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
  try {
    return messages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0);
  } catch (e) {
    console.error('Error counting message tokens:', e.message);
    return 0;
  }
}

// Safe stringify function to handle circular references
function safeStringify(obj, indent = 2) {
  try {
    if (obj === undefined) return 'undefined';
    if (obj === null) return 'null';
    
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
  } catch (e) {
    return `[Error stringifying: ${e.message}]`;
  }
}

// Inspect request body for debugging
function inspectRequestBody(body) {
  try {
    if (!body) return 'No request body';
    
    // Check specific fields
    const issues = [];
    
    // Check model field
    if (!body.model) {
      issues.push('Missing model field');
    } else if (typeof body.model !== 'string') {
      issues.push(`Model is not a string: ${typeof body.model}`);
    }
    
    // Check messages field
    if (!body.messages) {
      issues.push('Missing messages field');
    } else if (!Array.isArray(body.messages)) {
      issues.push(`Messages is not an array: ${typeof body.messages}`);
    } else if (body.messages.length === 0) {
      issues.push('Messages array is empty');
    } else {
      // Check each message
      body.messages.forEach((msg, index) => {
        if (!msg) {
          issues.push(`Message ${index} is null or undefined`);
        } else if (typeof msg !== 'object') {
          issues.push(`Message ${index} is not an object: ${typeof msg}`);
        } else {
          if (!msg.role) {
            issues.push(`Message ${index} is missing role`);
          }
          if (!msg.content) {
            issues.push(`Message ${index} is missing content`);
          }
        }
      });
    }
    
    // Return inspection result
    return {
      model: body.model,
      messages_count: body.messages?.length || 0,
      temperature: body.temperature,
      max_tokens: body.max_tokens,
      issues: issues.length > 0 ? issues : 'No issues detected',
      body_type: typeof body,
      full_body: DEBUG.ENABLE_REQUEST_DUMP ? safeStringify(body) : '[Request body logging disabled]'
    };
  } catch (e) {
    return `Error inspecting body: ${e.message}`;
  }
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
  // Initialize basic error handling
  process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err.message, err.stack);
  });
  
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
  let requestRecord;
  
  try {
    requestRecord = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      path: req.url,
      method: req.method,
      startTime: new Date().toISOString(),
      error: null,
      phases: {}
    };
    
    debugLog(`[${requestRecord.id}] Request received`);
    
    // Early body check - check if request body exists and is parseable
    if (req.method === 'POST' && !req.body) {
      console.error(`[${requestRecord.id}] Request body is missing or undefined`);
      return res.status(400).set(corsHeaders).json({
        error: 'Invalid request',
        message: 'Request body is missing or could not be parsed',
        requestId: requestRecord.id
      });
    }
    
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
    
    // Debug request body in detail
    if (DEBUG.INSPECT_REQUEST_BODY) {
      try {
        const bodyInspection = inspectRequestBody(req.body);
        debugLog(`[${requestRecord.id}] Request body inspection:`, bodyInspection);
      } catch (inspectError) {
        console.error(`[${requestRecord.id}] Error inspecting request body:`, inspectError.message);
      }
    }
    
    // Validation phase
    phases.validation = Date.now();
    requestRecord.phases.validation = phases.validation - phases.start;
    
    // Validate request body
    const validation = validateRequest(req.body);
    if (!validation.valid) {
      debugLog(`[${requestRecord.id}] Request validation failed: ${validation.error}`);
      return res.status(400).set(corsHeaders).json({
        error: 'Invalid request',
        message: validation.error,
        requestId: requestRecord.id
      });
    }
    
    // Quick validation and short-circuit for large requests
    let messageTokenCount;
    try {
      messageTokenCount = countMessageTokens(req.body?.messages);
    } catch (countError) {
      console.error(`[${requestRecord.id}] Error counting message tokens:`, countError.message);
      messageTokenCount = -1; // Mark as error
    }
    
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
    let apiKey; 
    try {
      apiKey = process.env.TOGETHER_API_KEY || 
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
      
      // Verify key format (basic check)
      if (apiKey.length < 20) {
        debugLog(`[${requestRecord.id}] API key appears invalid (too short)`);
        return res.status(500).set(corsHeaders).json({
          error: 'Invalid API key',
          message: 'API key appears to be invalid',
          requestId: requestRecord.id
        });
      }
      
      debugLog(`[${requestRecord.id}] API key found (starts with ${apiKey.substring(0, 3)}...)`);
    } catch (keyError) {
      console.error(`[${requestRecord.id}] Error accessing API key:`, keyError.message);
      return res.status(500).set(corsHeaders).json({
        error: 'API key error',
        message: 'Error while accessing API key',
        requestId: requestRecord.id,
        details: keyError.message
      });
    }
    
    // Prepare the request body safely
    let optimizedBody;
    try {
      optimizedBody = {
        ...req.body,
        temperature: req.body.temperature || 0.3,
        max_tokens: Math.min(req.body.max_tokens || 500, 800)
      };
      
      debugLog(`[${requestRecord.id}] Request body optimized:`, {
        model: optimizedBody.model,
        temperature: optimizedBody.temperature,
        max_tokens: optimizedBody.max_tokens
      });
    } catch (bodyError) {
      console.error(`[${requestRecord.id}] Error preparing request body:`, bodyError.message);
      return res.status(500).set(corsHeaders).json({
        error: 'Request preparation error',
        message: 'Failed to prepare request body',
        requestId: requestRecord.id,
        details: bodyError.message
      });
    }
    
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
    // Ensure requestRecord exists even if error occurred during initialization
    if (!requestRecord) {
      requestRecord = {
        id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        error: {
          message: error.message,
          phase: 'initialization'
        }
      };
      console.error(`Request initialization error: ${error.message}`);
    }
    
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
    try {
      Object.keys(corsHeaders).forEach(key => {
        res.setHeader(key, corsHeaders[key]);
      });
    } catch (headerError) {
      console.error(`Error setting response headers: ${headerError.message}`);
    }
    
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