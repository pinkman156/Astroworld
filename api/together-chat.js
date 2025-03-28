// Simplified serverless function for the Together AI API
import axios from 'axios';

export default async function handler(req, res) {
  // Track request timing
  const startTime = Date.now();
  
  // Set CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
    'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  };
  
  // Apply CORS headers to all responses
  Object.keys(corsHeaders).forEach(key => {
    res.setHeader(key, corsHeaders[key]);
  });

  try {
    // Handle OPTIONS requests (CORS preflight)
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    
    // Handle health check requests
    if (req.method === 'GET' && (req.url.includes('/health') || req.url.includes('/ping'))) {
      console.log('Health check requested');
      
      // Get API key status for health check
      const apiKey = process.env.TOGETHER_API_KEY || process.env.VITE_TOGETHER_API_KEY;
      
      // Return a health response
      return res.status(200).json({
        status: 'ok',
        message: 'Service is operational',
        api_key_available: !!apiKey,
        timestamp: new Date().toISOString()
      });
    }
    
    // Check for POST request
    if (req.method !== 'POST') {
      return res.status(405).json({
        error: 'Method not allowed',
        message: 'Only POST requests are supported for the chat endpoint'
      });
    }
    
    // Check for request body
    if (!req.body) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Request body is missing'
      });
    }
    
    // Validate required parameters
    if (!req.body.model) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'The "model" parameter is required'
      });
    }
    
    if (!req.body.messages || !Array.isArray(req.body.messages) || req.body.messages.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'The "messages" parameter must be a non-empty array'
      });
    }
    
    // Check test mode flag (for testing without making actual API calls)
    if (req.query.test_mode === 'true') {
      return res.status(200).json({
        status: 'success',
        message: 'Test mode - no API call made',
        request_received: {
          model: req.body.model,
          message_count: req.body.messages.length
        }
      });
    }
    
    // Get API key
    const apiKey = process.env.TOGETHER_API_KEY || process.env.VITE_TOGETHER_API_KEY;
    
    // Check if API key is available
    if (!apiKey) {
      console.error('Missing Together AI API key');
      return res.status(500).json({
        error: 'Configuration error',
        message: 'API key is not configured'
      });
    }
    
    // Prepare request data with safe defaults
    const requestData = {
      model: req.body.model,
      messages: req.body.messages,
      temperature: req.body.temperature || 0.7,
      max_tokens: Math.min(req.body.max_tokens || 200, 500), // Cap at 500 tokens
    };
    
    // Log request (without sensitive data)
    console.log(`API request: ${requestData.model}, ${requestData.messages.length} messages`);
    
    try {
      // Make request to Together AI with short timeout
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
      
      // Log success and timing
      const duration = Date.now() - startTime;
      console.log(`API request successful (${duration}ms)`);
      
      // Return the API response
      return res.status(200).json(response.data);
    } catch (apiError) {
      // Handle API-specific errors
      const duration = Date.now() - startTime;
      console.error(`API request failed (${duration}ms): ${apiError.message}`);
      
      // Handle timeouts
      if (apiError.code === 'ECONNABORTED' || apiError.message.includes('timeout')) {
        return res.status(504).json({
          error: 'Gateway timeout',
          message: 'The request to the AI service timed out',
          details: apiError.message
        });
      }
      
      // Handle API errors with response
      if (apiError.response) {
        const statusCode = apiError.response.status || 500;
        return res.status(statusCode).json({
          error: 'API error',
          message: apiError.response.data?.error?.message || apiError.message,
          status: statusCode
        });
      }
      
      // Re-throw other errors to be caught by outer handler
      throw apiError;
    }
  } catch (error) {
    // Final fallback error handler
    console.error('Error in handler:', error.message);
    
    return res.status(500).json({
      error: 'Server error',
      message: 'An unexpected error occurred while processing your request',
      details: error.message
    });
  }
} 