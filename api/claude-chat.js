// Simplified serverless function for the Anthropic Claude AI API
import axios from 'axios';

// Helper function for delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function for exponential backoff retry
async function retryWithExponentialBackoff(fn, retries = 2, baseDelay = 1000, factor = 2) {
  let attempt = 0;
  let lastError;

  while (attempt < retries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      attempt++;
      
      if (attempt >= retries) break;
      
      // Calculate exponential backoff delay
      const backoffDelay = baseDelay * Math.pow(factor, attempt - 1);
      const jitter = Math.random() * 500; // Add some randomness (up to 500ms)
      const totalDelay = backoffDelay + jitter;
      
      console.log(`API request failed. Retrying in ${Math.round(totalDelay / 1000)} seconds (attempt ${attempt}/${retries})`);
      
      // Wait for the calculated delay
      await delay(totalDelay);
    }
  }
  
  throw lastError;
}

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
      const apiKey = process.env.CLAUDE_API_KEY || process.env.VITE_CLAUDE_API_KEY;
      
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
    
    // Validate required parameters (model is still kept for compatibility)
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
    const apiKey = process.env.CLAUDE_API_KEY || process.env.VITE_CLAUDE_API_KEY;
    
    // Check if API key is available
    if (!apiKey) {
      console.error('Missing Claude API key');
      return res.status(500).json({
        error: 'Configuration error',
        message: 'API key is not configured'
      });
    }
    
    // Verify API key format (basic validation)
    if (!apiKey.startsWith('sk-ant-')) {
      console.error('Claude API key has invalid format');
      return res.status(500).json({
        error: 'Configuration error',
        message: 'API key is invalid. Claude API keys should start with "sk-ant-"'
      });
    }
    
    // Fallback to Together API if requested
    if (req.headers['x-use-together-fallback'] === 'true') {
      // For backward compatibility, provide a mock response if Claude API is not available
      console.log('Using mock response due to fallback request');
      
      const mockResponse = {
        id: `mock-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(new Date().getTime() / 1000),
        model: "mock-model",
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: "I apologize, but I'm unable to process this astrological request at the moment. The service is temporarily using a fallback mode with limited capabilities. Please try again later when full functionality is restored."
            },
            finish_reason: "stop"
          }
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150
        }
      };
      
      return res.status(200).json(mockResponse);
    }
    
    // Map the model (this is for compatibility with the existing API)
    // We'll use Claude 3.5 Sonnet by default
    const claudeModel = "claude-3-5-sonnet-20241022";
    
    // Convert the Together AI messages format to Claude format
    // (Claude format is the same as OpenAI format, which is what Together uses)
    const messages = req.body.messages;
    
    // Prepare request data with safe defaults
    const requestData = {
      model: claudeModel,
      messages: messages,
      max_tokens: Math.min(req.body.max_tokens || 4096, 4096), // Cap at 4096 tokens
      temperature: req.body.temperature || 0.7,
    };
    
    // Log request (without sensitive data)
    console.log(`Claude API request: ${claudeModel}, ${messages.length} messages`);
    
    try {
      // Make request to Claude API with exponential backoff
      const response = await retryWithExponentialBackoff(
        async () => {
          // Log headers for debugging (without the API key value)
          console.log('Request headers:', {
            'Content-Type': 'application/json',
            'x-api-key': apiKey ? `${apiKey.substring(0, 8)}...` : 'not set',
            'anthropic-version': '2023-06-01'
          });
          
          return await axios({
            method: 'POST',
            url: 'https://api.anthropic.com/v1/messages',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01'
            },
            data: requestData,
            timeout: 15000 // 15 second timeout to stay within Vercel's function limits
          });
        },
        2, // Max 2 retries
        2000, // Start with 2 second delay
        2 // Double the delay each time
      );
      
      // Transform Claude response to look like Together AI response format for compatibility
      const transformedResponse = {
        id: response.data.id,
        object: 'chat.completion',
        created: Math.floor(new Date().getTime() / 1000),
        model: claudeModel,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: response.data.content[0].text
            },
            finish_reason: response.data.stop_reason
          }
        ],
        usage: {
          prompt_tokens: response.data.usage.input_tokens,
          completion_tokens: response.data.usage.output_tokens,
          total_tokens: response.data.usage.input_tokens + response.data.usage.output_tokens
        }
      };
      
      // Calculate request duration
      const requestDuration = Date.now() - startTime;
      console.log(`Claude API request completed in ${requestDuration}ms`);
      
      // Return the transformed response
      return res.status(200).json(transformedResponse);
      
    } catch (error) {
      console.error('Error calling Claude API:', error.message);
      
      // Try to extract more detailed error information
      let errorMessage = 'Unknown error occurred';
      let errorStatus = 500;
      
      if (error.response) {
        errorStatus = error.response.status;
        errorMessage = error.response.data.error?.message || error.message;
        console.error('Claude API error details:', JSON.stringify(error.response.data, null, 2));
      } else if (error.request) {
        errorMessage = 'No response received from Claude API. The request timed out or failed to reach the server.';
      }
      
      // Check if we should attempt a fallback to the original Together API
      const togetherApiKey = process.env.TOGETHER_API_KEY || process.env.VITE_TOGETHER_API_KEY;
      
      if (togetherApiKey && !req.headers['x-no-fallback']) {
        console.log('Attempting fallback to Together AI API due to Claude API failure');
        
        try {
          // Prepare the Together API request using the original request data
          const togetherRequestData = {
            model: req.body.model || "mistralai/Mixtral-8x7B-Instruct-v0.1",
            messages: req.body.messages,
            temperature: req.body.temperature || 0.7,
            max_tokens: Math.min(req.body.max_tokens || 10000, 10000),
          };
          
          // Make request to Together AI
          const togetherResponse = await axios({
            method: 'POST',
            url: 'https://api.together.xyz/v1/chat/completions',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${togetherApiKey}`
            },
            data: togetherRequestData,
            timeout: 15000
          });
          
          console.log('Successfully fell back to Together AI API');
          
          // Return the Together AI response directly
          return res.status(200).json(togetherResponse.data);
        } catch (fallbackError) {
          console.error('Fallback to Together AI also failed:', fallbackError.message);
          // Continue to return the original Claude API error
        }
      }
      
      return res.status(errorStatus).json({
        error: 'Claude API error',
        message: errorMessage,
        status: errorStatus
      });
    }
  } catch (error) {
    console.error('Unexpected error in Claude API handler:', error);
    
    const errorResponse = {
      error: 'Server error',
      message: error.message || 'An unexpected error occurred',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
    
    return res.status(500).json(errorResponse);
  }
} 