// Simplified serverless function for the Together AI API
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
      max_tokens: Math.min(req.body.max_tokens || 10000, 10000), // Cap at 10000 tokens to respect model context limits
    };
    
    // Log request (without sensitive data)
    console.log(`API request: ${requestData.model}, ${requestData.messages.length} messages`);
    
    try {
      // Make request to Together AI with exponential backoff
      const response = await retryWithExponentialBackoff(
        async () => {
          return await axios({
            method: 'POST',
            url: 'https://api.together.xyz/v1/chat/completions',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            data: requestData,
            timeout: 150000 // 150 second timeout to stay within Vercel's function limits
          });
        },
        2, // Max 2 retries
        2000, // Start with 2 second delay
        2 // Double the delay each time
      );
      
      // Check for potential truncated responses
      const responseContent = response.data.choices[0]?.message?.content || '';
      const tokenCount = response.data.usage?.completion_tokens || 0;
      
      // If response seems truncated (tiny response with "stop" reason)
      if (tokenCount < 50 && responseContent.length < 200 && response.data.choices[0].finish_reason === 'stop') {
        console.warn(`Possible truncated response detected: ${tokenCount} tokens, finish_reason: ${response.data.choices[0].finish_reason}`);
        
        // Check if this is a career-related query
        const isCareerQuery = requestData.messages.some(msg => 
          msg.role === 'user' && 
          (msg.content.includes('career') || 
           msg.content.includes('profession') || 
           msg.content.includes('job') ||
           msg.content.includes('occupation'))
        );
        
        if (isCareerQuery) {
          console.log('Career query detected with truncated response. Applying special handling.');
          
          // Create a modified version of the query
          const userMessage = requestData.messages.find(msg => msg.role === 'user')?.content || '';
          
          // Extract name and birth details using regex if possible
          const detailsMatch = userMessage.match(/for\s+([^.]+)\s+born\s+on\s+([^.]+)\s+at\s+([^.]+)\s+in\s+([^.]+)/);
          let modifiedPrompt = '';
          
          if (detailsMatch) {
            // If we can extract structured information
            const [_, name, date, time, place] = detailsMatch;
            
            // Create a more direct prompt focused on listing career options
            modifiedPrompt = `Based on the natal chart for ${name} (DOB: ${date}, Time: ${time}, Location: ${place}), please list exactly 5 suitable career fields and 3 professional strengths. Format as bullet points.`;
            
            // Extract chart data if available
            const chartDataMatch = userMessage.match(/birth chart data:\s*(\{.*\})/);
            if (chartDataMatch && chartDataMatch[1]) {
              modifiedPrompt += ` Chart data: ${chartDataMatch[1]}`;
            }
          } else {
            // Fallback to a simpler transformation
            modifiedPrompt = userMessage.replace(/Generate a career reading/i, 'List exactly 5 suitable career options as bullet points. Keep it simple and direct.')
                                    .replace(/Focus ONLY on.+?\./, 'Focus only on listing career options.');
          }
          
          // Create modified request with specialized system prompt
          const modifiedRequest = {
            ...requestData,
            messages: [
              {
                role: 'system',
                content: 'You are an expert astrologer who specializes in career guidance. Keep responses direct and structured, always using bullet points. '
              },
              {
                role: 'user',
                content: modifiedPrompt
              }
            ],
            max_tokens: 10000 // Use a smaller token limit for more reliability
          };
          
          try {
            console.log('Retrying with modified career query');
            
            // Make the modified request with exponential backoff
            const retryResponse = await retryWithExponentialBackoff(
              async () => {
                return await axios({
                  method: 'POST',
                  url: 'https://api.together.xyz/v1/chat/completions',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                  },
                  data: modifiedRequest,
                  timeout: 10000 // Shorter timeout for retry
                });
              },
              2, // Max 2 retries
              3000, // Start with 3 second delay
              2 // Double the delay each time
            );
            
            console.log('Modified career query successful');
            
            // Return the retry response
            return res.status(200).json(retryResponse.data);
          } catch (specialRetryError) {
            console.error('Special career retry also failed:', specialRetryError.message);
            // Continue to normal response or fall through to other retry mechanisms
          }
        }
      }
      
      // Log success and timing
      const duration = Date.now() - startTime;
      console.log(`API request successful (${duration}ms)`);
      
      // Return the API response
      return res.status(200).json(response.data);
    } catch (apiError) {
      // Handle API-specific errors
      const duration = Date.now() - startTime;
      console.error(`API request failed (${duration}ms): ${apiError.message}`);
      
      // Handle timeouts by retrying with a simplified request
      if (apiError.code === 'ECONNABORTED' || apiError.message.includes('timeout')) {
        console.log('Request timed out. Attempting retry with simplified prompt...');
        
        try {
          // Create a simplified version of the original request data
          const simplifiedMessages = requestData.messages.map(msg => {
            if (msg.role === 'user') {
              // Simplify user message by taking first sentence and adding brevity instruction
              const content = msg.content.split('.')[0] ;
              return { ...msg, content };
            }
            return msg;
          });
          
          // Create simplified request with lower token limit
          const simplifiedRequest = {
            ...requestData,
            messages: simplifiedMessages,
            max_tokens:10000// Use smaller token limit for retry
          };
          
          // Log the retry attempt
          console.log('Retrying with simplified request');
          
          // Make simplified request with exponential backoff
          const retryResponse = await retryWithExponentialBackoff(
            async () => {
              return await axios({
                method: 'POST',
                url: 'https://api.together.xyz/v1/chat/completions',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${apiKey}`
                },
                data: simplifiedRequest,
                timeout: 10000 // Shorter timeout for retry
              });
            },
            2, // Max 2 retries
            3000, // Start with 3 second delay
            2 // Double the delay each time
          );
          
          // Log success of retry
          const retryDuration = Date.now() - startTime;
          console.log(`Retry request successful (${retryDuration}ms)`);
          
          // Return the retry response
          return res.status(200).json(retryResponse.data);
        } catch (retryError) {
          // If retry also fails, continue to standard error handling
          console.error('Retry also failed:', retryError.message);
          return res.status(504).json({
            error: 'Gateway timeout',
            message: 'The request to the AI service timed out even after retry',
            details: 'Try breaking your query into smaller parts or simplifying your request'
          });
        }
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