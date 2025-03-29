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
    
    // Detect complex astrological reading requests and optimize the prompt format
    const isAstrologyRequest = requestData.messages.some(msg => 
      msg.role === 'user' && 
      (
        msg.content.includes('astrological reading') || 
        msg.content.includes('birth chart') || 
        (msg.content.includes('Nakshatra') && msg.content.includes('birth'))
      )
    );
    
    if (isAstrologyRequest) {
      console.log('Astrological reading request detected. Optimizing prompt format.');
      
      // Extract user message and parse for birth details
      const userMessage = requestData.messages.find(msg => msg.role === 'user')?.content || '';
      
      // Extract key information using regex
      const nameMatch = userMessage.match(/for\s+([^(,\n]+)/i);
      const birthDetailsMatch = userMessage.match(/born\s+(?:on\s+)?([^,]+)(?:,|\s+at\s+)([^,]+)(?:,|\s+in\s+)([^.\n]+)/i) || 
                               userMessage.match(/(?:Date|DOB|Birth)[\s:]+([^,\n]+)(?:,|\s+|Time[\s:]+)([^,\n]+)(?:,|\s+|Place[\s:]+)([^.\n]+)/i);
      
      // Prepare variables for birth details
      const name = nameMatch ? nameMatch[1].trim() : 'the person';
      const birthDate = birthDetailsMatch ? birthDetailsMatch[1].trim() : '';
      const birthTime = birthDetailsMatch ? birthDetailsMatch[2].trim() : '';
      const birthPlace = birthDetailsMatch ? birthDetailsMatch[3].trim() : '';
      
      // Initialize chart info
      let chartInfo = '';
      
      // Check if we need to fetch planet position data
      if (birthDate && birthTime) {
        try {
          // Format date and time for API request
          // Convert to proper format: YYYY-MM-DD+HH:MM:SS
          const formattedDateTime = formatDateTimeForAPI(birthDate, birthTime);
          
          // Default coordinates if specific location can't be geocoded
          // These are approximate coordinates that can be used as fallback
          const defaultCoordinates = "26.4973401,77.9973401";
          
          // In a production app, you would geocode the birthPlace to get coordinates
          // For simplicity, we're using default coordinates here
          const coordinates = defaultCoordinates;
          
          // Make request to planet position API
          console.log('Fetching planet position data for chart details');
          const planetPositionResponse = await axios({
            method: 'GET',
            url: `https://astroworld-delta.vercel.app/api/prokerala-proxy/planet-position?datetime=${formattedDateTime}&coordinates=${coordinates}&ayanamsa=1`,
            timeout: 5000 // 5 second timeout for this request
          });
          
          // Check if we got a valid response
          if (planetPositionResponse.data && planetPositionResponse.data.planets) {
            // Extract planet positions from the response
            const planets = planetPositionResponse.data.planets;
            
            // Format the planet positions for the chartInfo
            chartInfo = formatPlanetPositions(planets);
            console.log('Successfully retrieved and formatted planet position data');
          } else {
            console.warn('Planet position API returned invalid data structure');
            // Fall back to alternative method for chart details
            chartInfo = extractChartInfoFromText(userMessage);
          }
        } catch (error) {
          console.error('Error fetching planet position data:', error.message);
          // Fall back to alternative method for chart details
          chartInfo = extractChartInfoFromText(userMessage);
        }
      } else {
        // If we don't have birth date/time, fall back to original methods
        chartInfo = extractChartInfoFromText(userMessage);
      }
      
      // Prepare a clean, optimized prompt for the astrological reading
      const optimizedPrompt = `Generate a comprehensive astrological reading for ${name} (born ${birthDate}, ${birthTime} IST, ${birthPlace}). ${chartInfo ? `\n\nBirth chart details:\n${chartInfo}` : ''}

When describing the birth chart, be sure to explicitly mention the Sun sign, Moon sign, and Ascendant/Lagna (e.g., "Sun in Gemini", "Moon in Scorpio", and "Ascendant/Lagna in Virgo") in the Birth Chart Overview section. Always clearly indicate the Rising sign or Ascendant.

Cover birth details, personality traits, career options (3), relationship patterns (3), key strengths (5), and challenges (5).`;
      
      const systemPrompt = "You are an expert Vedic astrologer providing concise readings.";
      
      // Update the request data with optimized prompts
      requestData.messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: optimizedPrompt
        }
      ];
      
      // Reduce max tokens for more reliable response
      requestData.max_tokens = 2000;
      
      console.log('Optimized astrological reading prompt created.');
    }
    
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
            timeout: 55000 // 55 second timeout to stay within Vercel's 60s function limit
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

        // Check if this is a complex astrology reading with multiple sections
        const isComplexAstrologyReading = requestData.messages.some(msg => 
          msg.role === 'user' && 
          msg.content.includes('astrological reading') && 
          msg.content.includes('section headers') &&
          msg.content.includes('##')
        );
        
        if (isComplexAstrologyReading) {
          console.log('Complex astrology reading detected with truncated response. Applying special handling.');
          
          // Extract basic birth details from the request
          const userMessage = requestData.messages.find(msg => msg.role === 'user')?.content || '';
          
          // Extract name and birth details using regex if possible
          const detailsMatch = userMessage.match(/for\s+([^.]+)\s+born\s+on\s+([^.]+)\s+at\s+([^.]+)\s+in\s+([^.]+)/);
          let modifiedPrompt = '';
          
          if (detailsMatch) {
            // If we can extract structured information
            const [_, name, date, time, place] = detailsMatch;
            
            // Create a more direct prompt focused on essential information
            modifiedPrompt = `Generate a concise birth chart reading for ${name} (born on ${date} at ${time} in ${place}). Include ONLY these sections with ## prefix:
              
## Birth Details
## Birth Chart Overview (brief overview of key planetary positions including Sun, Moon, and Ascendant/Lagna)
## Personality Overview (key traits)
## Key Strengths (list 3 strengths)
## Potential Challenges (list 3 challenges)

Keep each section under 75 words. Make sure to clearly mention the Ascendant/Rising sign in the Birth Chart Overview.`;
            
            // Extract chart data if available
            const chartDataMatch = userMessage.match(/birth chart data:\s*(\{.*\})/);
            if (chartDataMatch && chartDataMatch[1]) {
              modifiedPrompt += ` Chart data: ${chartDataMatch[1]}`;
            }
          } else {
            // Fallback to a simpler transformation
            modifiedPrompt = userMessage.replace(/comprehensive/g, 'concise')
                                      .replace(/following EXACT section headers.+?FORMATTING INSTRUCTIONS:/s, 'these key sections only: ## Birth Details, ## Birth Chart Overview, ## Personality Overview, ## Key Strengths (3 only), ## Potential Challenges (3 only).');
          }
          
          // Create modified request with simplified system prompt
          const modifiedRequest = {
            ...requestData,
            messages: [
              {
                role: 'system',
                content: 'You are an expert Vedic astrologer. Provide concise, insightful birth chart readings. Focus on delivering essential insights within a limited space. Use ## for section headers and be direct and to the point.'
              },
              {
                role: 'user',
                content: modifiedPrompt
              }
            ],
            max_tokens: 2000 // Use a smaller token limit for more reliability
          };
          
          try {
            console.log('Retrying with simplified astrology reading request');
            
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
                  timeout: 30000 // 30 second timeout for retry
                });
              },
              1, // Max 1 retry to stay within time limits
              2000, // Start with 2 second delay
              2 // Double the delay each time
            );
            
            console.log('Simplified astrology reading request successful');
            
            // Return the retry response
            return res.status(200).json(retryResponse.data);
          } catch (specialRetryError) {
            console.error('Simplified astrology retry failed:', specialRetryError.message);
            // Continue to normal response or fall through to other retry mechanisms
          }
        }
        
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
                  timeout: 30000 // 30 second timeout for retry
                });
              },
              1, // Max 1 retry to stay within time limits
              2000, // Start with 2 second delay
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
                timeout: 30000 // 30 second timeout for retry
              });
            },
            1, // Max 1 retry to stay within time limits
            2000, // Start with 2 second delay
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

// Helper function to format date and time for API request
function formatDateTimeForAPI(birthDate, birthTime) {
  try {
    // Try to parse various date formats and standardize to YYYY-MM-DD
    let formattedDate = birthDate;
    
    // Check if birthDate is in format like "June 15, 2000" or "15 June 2000"
    if (birthDate.match(/[a-zA-Z]/)) {
      const dateObj = new Date(birthDate);
      if (!isNaN(dateObj.getTime())) {
        formattedDate = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
      }
    }
    
    // If date is in DD-MM-YYYY or DD/MM/YYYY format
    if (birthDate.match(/^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$/)) {
      const parts = birthDate.split(/[-\/]/);
      formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    
    // Format time (assuming format like "10:15 AM" or "10:15")
    let formattedTime = birthTime;
    
    // Convert 12-hour format to 24-hour if needed
    if (birthTime.match(/am|pm/i)) {
      const timeObj = new Date(`2000-01-01 ${birthTime}`);
      if (!isNaN(timeObj.getTime())) {
        formattedTime = timeObj.toTimeString().split(' ')[0]; // HH:MM:SS
      }
    }
    
    // Ensure time has seconds
    if (!formattedTime.match(/:/g) || formattedTime.match(/:/g).length < 2) {
      formattedTime = formattedTime.includes(':') ? `${formattedTime}:00` : `${formattedTime}:00:00`;
    }
    
    // Combine date and time in required format
    return `${formattedDate}+${formattedTime}`;
  } catch (error) {
    console.error('Error formatting date/time:', error);
    // Return a fallback format if parsing fails
    return `${birthDate}+${birthTime}`;
  }
}

// Function to format planet positions data from API response
function formatPlanetPositions(planets) {
  try {
    if (!planets || !Array.isArray(planets)) {
      return '';
    }
    
    // Start building the formatted text
    let formattedText = '';
    
    // Important planets to highlight first (in order of importance for astrology)
    const keyPlanets = ['Sun', 'Moon', 'Ascendant', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Rahu', 'Ketu'];
    
    // Track what signs have planets to determine rising sign/ascendant
    const planetSigns = {};
    let ascendantSign = '';
    
    // First pass to find Ascendant/Lagna
    planets.forEach(planet => {
      if (planet.name === 'Ascendant' || planet.name === 'Lagna') {
        ascendantSign = planet.zodiac || planet.sign || '';
      }
      planetSigns[planet.name] = planet.zodiac || planet.sign || '';
    });
    
    // Add rising sign/ascendant first if found
    if (ascendantSign) {
      formattedText += `Rising Sign/Ascendant: ${ascendantSign}\n`;
    }
    
    // Add key planets in specific order
    keyPlanets.forEach(planetName => {
      const planet = planets.find(p => p.name === planetName);
      if (planet) {
        const sign = planet.zodiac || planet.sign || '';
        const degree = planet.longitude || planet.degree || '';
        const retrograde = planet.is_retrograde ? ' (Retrograde)' : '';
        
        // Only add if we have sign information
        if (sign) {
          formattedText += `${planetName}: ${sign}${degree ? ` at ${degree}°` : ''}${retrograde}\n`;
        }
      }
    });
    
    // Add nakshatra information if available
    planets.forEach(planet => {
      if ((planet.name === 'Moon' || planet.name === 'Sun') && planet.nakshatra) {
        formattedText += `${planet.name} Nakshatra: ${planet.nakshatra}\n`;
      }
    });
    
    // Add any special combinations or yogas if available in the API response
    if (planets.yogas && planets.yogas.length > 0) {
      formattedText += `\nKey Yogas: ${planets.yogas.join(', ')}\n`;
    }
    
    // Add Mangal Dosha if available
    if (planets.mangal_dosha !== undefined) {
      formattedText += `Mangal Dosha: ${planets.mangal_dosha ? 'Yes' : 'No'}\n`;
    }
    
    return formattedText.trim();
  } catch (error) {
    console.error('Error formatting planet positions:', error);
    return ''; // Return empty string on error
  }
}

// Function to extract chart info from text (fallback to original method)
function extractChartInfoFromText(userMessage) {
  // Extract chart details if available in JSON format
  const chartDataStr = userMessage.includes('birth chart data') ? 
                      userMessage.match(/birth chart data:?\s*(\{.*\})/s)?.[1] : null;
  
  // Parse JSON if available and extract key details
  let chartInfo = '';
  if (chartDataStr) {
    try {
      const chartData = JSON.parse(chartDataStr);
      const nakshatra = chartData?.kundli?.data?.nakshatra_details?.nakshatra?.name || '';
      const moonSign = chartData?.kundli?.data?.nakshatra_details?.chandra_rasi?.name || '';
      const sunSign = chartData?.kundli?.data?.nakshatra_details?.soorya_rasi?.name || '';
      const additionalInfo = chartData?.kundli?.data?.nakshatra_details?.additional_info || {};
      const yogas = chartData?.kundli?.data?.yoga_details || [];
      const mangalDosha = chartData?.kundli?.data?.mangal_dosha?.has_dosha === false ? 'No Mangal Dosha' : 'Has Mangal Dosha';
      
      chartInfo = `
Nakshatra: ${nakshatra}
Moon Sign: ${moonSign}
Sun Sign: ${sunSign}
Deity: ${additionalInfo.deity || ''}
Birth Stone: ${additionalInfo.birth_stone || ''}
Best Direction: ${additionalInfo.best_direction || ''}
Yogas: ${yogas.map(y => y.name + ' - ' + y.description).join(', ').substring(0, 100)}
${mangalDosha}`.trim();
    } catch (e) {
      console.error('Error parsing chart data JSON:', e.message);
    }
  } else {
    // Try to extract chart info from text
    const nakshatraMatch = userMessage.match(/Nakshatra[:\s-]+([^,.\n]+)/i);
    const moonSignMatch = userMessage.match(/Moon(?:\s+Sign)?[:\s-]+([^,.\n]+)/i);
    const sunSignMatch = userMessage.match(/Sun(?:\s+Sign)?[:\s-]+([^,.\n]+)/i);
    const ascendantMatch = userMessage.match(/(?:Ascendant|Lagna)[:\s-]+([^,.\n]+)/i);
    const yogasMatch = userMessage.match(/(?:yoga|yogas)[:\s-]+([^,.\n]+)/i);
    const mangalMatch = userMessage.match(/Mangal[:\s-]+([^,.\n]+)/i);
    
    if (nakshatraMatch || moonSignMatch || sunSignMatch || ascendantMatch) {
      chartInfo = `
${nakshatraMatch ? `Nakshatra: ${nakshatraMatch[1].trim()}` : ''}
${moonSignMatch ? `Moon Sign: ${moonSignMatch[1].trim()}` : ''}
${sunSignMatch ? `Sun Sign: ${sunSignMatch[1].trim()}` : ''}
${ascendantMatch ? `Ascendant: ${ascendantMatch[1].trim()}` : ''}
${yogasMatch ? `Yogas: ${yogasMatch[1].trim()}` : ''}
${mangalMatch ? `Mangal Dosha: ${mangalMatch[1].trim()}` : ''}`.trim();
    }
  }
  
  return chartInfo;
} 