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
    
    // Pre-process any request containing planet positions with coordinates
    console.log('Checking for planet positions in the request...');
    const userMsg = requestData.messages.find(msg => msg.role === 'user')?.content || '';

    // More flexible patterns to match various formats of planet positions with coordinates
    const degreePattern = /(?:Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Rahu|Ketu|Ascendant)[\s:]+[A-Za-z]+[\s:]*at[\s:]*\d+\.\d+°/i;
    const longitudePattern = /(?:Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Rahu|Ketu|Ascendant)[\s:]+[A-Za-z]+[\s:]*(?:longitude|degree|at)[\s:]*\d+/i;

    // Check first 500 chars of message for debugging
    console.log('Message excerpt:', userMsg.substring(0, 500));

    // Enhanced debugging: Check for newlines and escape sequences
    const hasNewlines = userMsg.includes('\n');
    const hasEscapedNewlines = userMsg.includes('\\n');
    console.log(`Message format check: Contains raw newlines: ${hasNewlines}, Contains escaped newlines: ${hasEscapedNewlines}`);
    
    if (hasNewlines) {
      console.log('Sample lines from message:');
      const firstFewLines = userMsg.split('\n').slice(0, 3);
      firstFewLines.forEach((line, i) => console.log(`Line ${i+1}: ${line.substring(0, 100)}`));
    }

    // Test patterns on the message content
    const degreeMatch = userMsg.match(degreePattern);
    const longitudeMatch = userMsg.match(longitudePattern);

    // Log matches for debugging
    if (degreeMatch) console.log('Degree pattern match:', degreeMatch[0]);
    if (longitudeMatch) console.log('Longitude pattern match:', longitudeMatch[0]);

    const hasPlanetPositions = requestData.messages.some(msg => 
      msg.role === 'user' && 
      (
        // Check for common indicators
        (msg.content.includes('Planet Positions:') && 
         (msg.content.includes('Sun:') || msg.content.includes('Moon:') || msg.content.includes('Ascendant:'))) ||
        
        // Check for coordinates in various formats
        msg.content.match(/(?:Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Rahu|Ketu|Ascendant)[\s:]+[A-Za-z]+[\s:]*at[\s:]*\d+\.\d+[°\s]/i) ||
        
        // Check for longitude mentions
        msg.content.match(/(?:Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Rahu|Ketu|Ascendant)[\s:]+[A-Za-z]+[\s:]*(?:longitude|degree)[:\s]*\d+/i) ||
        
        // Additional pattern for degrees without "at" keyword
        msg.content.match(/(?:Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Rahu|Ketu|Ascendant)[\s:]+[A-Za-z]+[\s:]*\d+\.\d+[°\s]/i)
      )
    );

    if (hasPlanetPositions) {
      console.log('✅ Detected pre-formatted planet positions with coordinates. Cleaning request format...');
      
      // Clean up each message
      requestData.messages = requestData.messages.map(msg => {
        if (msg.role === 'user') {
          console.log('💫 Starting to clean astrological request...');
          
          // Step 1: Replace all escaped newlines with spaces, but keep actual newlines
          // This preserves the structure of the original message
          let cleanedContent = msg.content.replace(/\\n/g, '\n');
          console.log(`Escaped newline replacement: Replaced ${(msg.content.match(/\\n/g) || []).length} escaped newlines`);
          
          // Step 2: Remove coordinates using regex patterns - keep the original structure
          // Pattern for "at X.Y°" format
          const atDegreePattern = /\s+at\s+\d+\.\d+°/g;
          // Pattern for "at X.Y" format without degree symbol
          const atDecimalPattern = /\s+at\s+\d+\.\d+(?!\w)/g;
          // Pattern for standalone coordinates
          const standaloneCoordinatePattern = /\s+\d+\.\d+°(?!\w)/g;
          // Pattern for degrees in parentheses
          const parenthesesPattern = /\s*\(\s*\d+\.\d+[°\s]*\)/g;
          // Pattern for retrograde in parentheses with coordinates
          const retrogradeCoordPattern = /\s*\(\s*\d+\.\d+[°\s]*,?\s*Retrograde\s*\)/gi;
          
          // Count matches for logging
          const atDegreeMatches = (cleanedContent.match(atDegreePattern) || []).length;
          const atDecimalMatches = (cleanedContent.match(atDecimalPattern) || []).length;
          const standaloneMatches = (cleanedContent.match(standaloneCoordinatePattern) || []).length;
          const parenthesesMatches = (cleanedContent.match(parenthesesPattern) || []).length;
          
          console.log(`Found coordinate patterns: ${atDegreeMatches} 'at X.Y°', ${atDecimalMatches} 'at X.Y', ${standaloneMatches} standalone coordinates, ${parenthesesMatches} in parentheses`);
          
          // Replace retrograde coordinates while preserving retrograde status
          cleanedContent = cleanedContent.replace(retrogradeCoordPattern, ' (Retrograde)');
          
          // Remove all other coordinates
          cleanedContent = cleanedContent
            .replace(atDegreePattern, '')
            .replace(atDecimalPattern, '')
            .replace(standaloneCoordinatePattern, '')
            .replace(parenthesesPattern, '')
            // Clean general degree pattern (planet/sign followed by degrees)
            .replace(/([A-Za-z]+)\s+\d+\.\d+°/g, '$1')
            // Clean any decimal followed by degree symbol
            .replace(/\d+\.\d+°/g, '');
            
          console.log('✨ Cleaned prompt - coordinates removed while preserving structure');
          console.log(`🔄 Original length: ${msg.content.length} chars → Cleaned length: ${cleanedContent.length} chars`);
          
          // Final check for any remaining coordinates that might have been missed
          const remainingCoords = cleanedContent.match(/\d+\.\d+°/g);
          if (remainingCoords) {
            console.log(`⚠️ Warning: Found ${remainingCoords.length} remaining coordinates after cleaning. Will remove these.`);
            cleanedContent = cleanedContent.replace(/\d+\.\d+°/g, '');
            console.log(`Final cleanup: Removed ${remainingCoords.length} additional coordinates`);
          }
          
          // Sample the cleaned content for verification
          console.log('Sample of cleaned content:');
          const sampleLines = cleanedContent.split('\n').slice(0, 5);
          sampleLines.forEach((line, i) => console.log(`Line ${i+1}: ${line.substring(0, 100)}`));
          
          return {
            ...msg,
            content: cleanedContent
          };
        }
        return msg;
      });
      
      console.log('🎉 Successfully cleaned pre-formatted astrological request.');
    }
    
    // Detect complex astrological reading requests and optimize the prompt format
    const isAstrologyRequest = requestData.messages.some(msg => 
      msg.role === 'user' && 
      (
        msg.content.includes('astrological reading') || 
        msg.content.includes('birth chart') || 
        (msg.content.includes('Nakshatra') && msg.content.includes('birth'))
      )
    ) && !hasPlanetPositions; // Skip if we already processed planet positions
    
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
      let coordinates = "26.4973401,77.9973401"; // Default coordinates
      
      // Log extracted birth details for debugging
      console.log(`Extracted birth details - Name: ${name}, Date: ${birthDate}, Time: ${birthTime}, Place: ${birthPlace}`);
      
      // Step 1: Get coordinates from geocoding if we have a birth place
      if (birthPlace) {
        try {
          console.log(`Geocoding birth place: ${birthPlace}`);
          const geocodeResponse = await axios({
            method: 'GET',
            url: `https://astroworld-delta.vercel.app/api/prokerala-proxy/geocode?q=${encodeURIComponent(birthPlace)}`,
            timeout: 5000
          });
          
          if (geocodeResponse.data && geocodeResponse.data.latitude && geocodeResponse.data.longitude) {
            coordinates = `${geocodeResponse.data.latitude},${geocodeResponse.data.longitude}`;
            console.log(`Successfully geocoded to coordinates: ${coordinates}`);
          } else {
            console.log(`Geocoding failed or returned invalid data, using default coordinates`);
          }
        } catch (error) {
          console.error(`Error geocoding birth place: ${error.message}`);
          // Continue with default coordinates
        }
      }
      
      // Step 2: Get planet position data directly
      if (birthDate && birthTime) {
        try {
          // Format date and time for API request
          const formattedDateTime = formatDateTimeForAPI(birthDate, birthTime);
          console.log(`Formatted date/time for API: ${formattedDateTime}`);
          
          // Make request to planet position API
          console.log('Fetching planet position data for chart details');
          const planetPositionResponse = await axios({
            method: 'GET',
            url: `https://astroworld-delta.vercel.app/api/prokerala-proxy/planet-position?datetime=${formattedDateTime}&coordinates=${coordinates}&ayanamsa=1`,
            timeout: 5000
          });
          
          // Check if we got a valid response
          if (planetPositionResponse.data && planetPositionResponse.data.planets) {
            const planets = planetPositionResponse.data.planets;
            console.log(`Retrieved planet position data with ${planets.length} planets`);
            
            // Format the planet positions for the chartInfo
            chartInfo = formatPlanetPositions(planets);
            console.log('Successfully formatted planet position data');
          } else {
            console.warn('Planet position API returned invalid data structure');
            // Try to extract chart info from text as fallback
            chartInfo = extractChartInfoFromText(userMessage);
          }
        } catch (error) {
          console.error(`Error fetching planet position data: ${error.message}`);
          // Try to extract chart info from text as fallback
          chartInfo = extractChartInfoFromText(userMessage);
        }
      } else {
        console.log('Missing birth date/time, extracting chart info from text');
        // Try to extract chart info from text if we don't have birth date/time
        chartInfo = extractChartInfoFromText(userMessage);
      }
      
      // Prepare a clean, optimized prompt for the astrological reading
      const prePrompt = `Generate a comprehensive astrological reading for ${name} born on ${birthDate} at ${birthTime} IST in ${birthPlace}.   ${chartInfo ? `Planet Positions:   ${chartInfo}` : ''}   Include the following sections:   Birth Details: Date, Time, Place, Name   Birth Chart Overview: Brief overview with Sun, Moon, and Ascendant/Lagna signs   Ascendant/Lagna: Rising sign qualities and influence   Personality Overview: Analysis of personality traits   Career Insights: 3 specific insights about career   Relationship Patterns: 3 insights about relationships   Key Strengths: 5 primary strengths   Potential Challenges: 5 potential difficulties   Significant Chart Features: 5 notable configurations   For lists, use numbered format (1., 2., 3.). Keep points concise but meaningful.`;
      
      const optimizedPrompt = prePrompt.replace(/\d+\.\d+°/g, '')
        .replace(/(\d+\.\d+)\s*degrees/gi, '')
        .replace(/(\w+)\s+is\s+in\s+(\w+)\s+at\s+\d+\.\d+°/gi, '$1 is in $2')
        .replace(/(\w+):\s+(\w+)\s+at\s+\d+\.\d+°/gi, '$1: $2')
        .replace(/\n+/g, ' ')
        .replace(/<[^>]*>/g, '')
        .trim();

      console.log('Optimized prompt:', optimizedPrompt);
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

    // Log request with additional details to debug formatting issues
    console.log(`API request: ${requestData.model}, ${requestData.messages.length} messages`);
    console.log(`Max tokens: ${requestData.max_tokens}, Temperature: ${requestData.temperature}`);

    // Log actual content format (first 500 chars) of user messages for debugging
    requestData.messages.forEach((msg, idx) => {
      if (msg.role === 'user') {
        const excerpt = msg.content.substring(0, 500) + (msg.content.length > 500 ? '...' : '');
        console.log(`Message ${idx} (${msg.role}) first 500 chars: ${excerpt}`);
        
        // Check for common format issues
        const hasCoordinates = msg.content.match(/\d+\.\d+°/g);
        if (hasCoordinates) {
          console.log(`⚠️ Found ${hasCoordinates.length} coordinates with degree symbols that should be cleaned`);
        }
        
        const hasPlanetSigns = msg.content.match(/(?:Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Rahu|Ketu|Ascendant)[\s:]+[A-Za-z]+/ig);
        if (hasPlanetSigns) {
          console.log(`Found ${hasPlanetSigns.length} planet-sign pairs, first few: ${hasPlanetSigns.slice(0, 3).join(', ')}`);
        }
      }
    });
    
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
          
          // Parse planet positions if present
          let cleanedPlanets = '';
          if (userMessage.includes('Planet Positions:')) {
            const planetLines = userMessage.split('\n').filter(line => 
              line.match(/^\s*(Rising Sign|Ascendant|Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Rahu|Ketu)/)
            );
            
            console.log(`Found ${planetLines.length} planet lines in complex astrology retry`);
            
            // Format planet positions without coordinates - using improved patterns
            cleanedPlanets = planetLines.map(line => {
              // Improved regex to handle multiple formats
              const match = line.match(/^\s*(Rising Sign\/Ascendant|Ascendant|Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Rahu|Ketu)[\s:]+([A-Za-z]+)(?:[\s:]*(?:at|longitude|degree)[\s:]*\d+(?:\.\d+)?[°\s]*)?(\s+\(Retrograde\))?/i);
              
              if (match) {
                const planetName = match[1].trim();
                const signName = match[2].trim();
                const retrograde = match[3] ? ' (Retrograde)' : '';
                
                return `${planetName}: ${signName}${retrograde}`;
              }
              
              // If the regex didn't match, try a more aggressive cleanup
              return line
                .replace(/\s+at\s+\d+\.\d+[°\s]*/g, '') // Remove "at" format coordinates
                .replace(/[\s:]*(?:longitude|degree)[\s:]*\d+(?:\.\d+)?[°\s]*/g, '') // Remove longitude/degree mentions
                .replace(/\s+\d+\.\d+[°\s]*/g, '') // Remove any remaining decimal numbers with degree symbols
                .replace(/:\s+/, ': ') // Standardize spacing after colon
                .trim();
            }).join('   ');
          }
          
          // Extract name and birth details using regex if possible
          const nameMatch = userMessage.match(/for\s+([^(,\n]+)/i);
          const birthDetailsMatch = userMessage.match(/born\s+(?:on\s+)?([^,]+)(?:,|\s+at\s+)([^,]+)(?:,|\s+in\s+)([^.\n]+)/i);
          
          let name = nameMatch ? nameMatch[1].trim() : 'the person';
          let date = birthDetailsMatch ? birthDetailsMatch[1].trim() : '';
          let time = birthDetailsMatch ? birthDetailsMatch[2].trim() : '';
          let place = birthDetailsMatch ? birthDetailsMatch[3].trim() : '';
          
          // Create a simplified, clean prompt
          let modifiedPrompt = `Generate a concise birth chart reading for ${name} born on ${date} at ${time} in ${place}.`;
          
          // Add planet positions if we extracted them
          if (cleanedPlanets) {
            modifiedPrompt += `   Planet Positions:   ${cleanedPlanets}`;
          }
          
          // Add simplified section headers
          modifiedPrompt += `   Include only these sections:   Birth Details: Date, Time, Place, Name   Birth Chart Overview: Key planetary positions including Sun, Moon, and Ascendant/Lagna   Personality Overview: Key traits   Key Strengths: 3 strengths   Potential Challenges: 3 challenges   Make sure to clearly mention the Sun sign, Moon sign, and Ascendant/Rising sign. Keep each section brief.`;
          
          // Extract chart data if available (for more complex cases)
          const chartDataMatch = userMessage.match(/birth chart data:\s*(\{.*\})/);
          if (chartDataMatch && chartDataMatch[1]) {
            modifiedPrompt += ` Chart data: ${chartDataMatch[1]}`;
          }
          
          console.log('Simplified prompt for retry:', modifiedPrompt.substring(0, 100) + '...');
          
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
          
          // Parse planet positions if present
          let cleanedPlanets = '';
          if (userMessage.includes('Planet Positions:')) {
            const planetLines = userMessage.split('\n').filter(line => 
              line.match(/^\s*(Rising Sign|Ascendant|Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Rahu|Ketu)/)
            );
            
            console.log(`Found ${planetLines.length} planet lines in career query retry`);
            
            // Format planet positions without coordinates - using improved patterns
            cleanedPlanets = planetLines.map(line => {
              // Improved regex to handle multiple formats
              const match = line.match(/^\s*(Rising Sign\/Ascendant|Ascendant|Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Rahu|Ketu)[\s:]+([A-Za-z]+)(?:[\s:]*(?:at|longitude|degree)[\s:]*\d+(?:\.\d+)?[°\s]*)?(\s+\(Retrograde\))?/i);
              
              if (match) {
                const planetName = match[1].trim();
                const signName = match[2].trim();
                const retrograde = match[3] ? ' (Retrograde)' : '';
                
                return `${planetName}: ${signName}${retrograde}`;
              }
              
              // If the regex didn't match, try a more aggressive cleanup
              return line
                .replace(/\s+at\s+\d+\.\d+[°\s]*/g, '') // Remove "at" format coordinates
                .replace(/[\s:]*(?:longitude|degree)[\s:]*\d+(?:\.\d+)?[°\s]*/g, '') // Remove longitude/degree mentions
                .replace(/\s+\d+\.\d+[°\s]*/g, '') // Remove any remaining decimal numbers with degree symbols
                .replace(/:\s+/, ': ') // Standardize spacing after colon
                .trim();
            }).join('   ');
          }
          
          // Extract name and birth details using regex if possible
          const nameMatch = userMessage.match(/for\s+([^(,\n]+)/i);
          const birthDetailsMatch = userMessage.match(/born\s+(?:on\s+)?([^,]+)(?:,|\s+at\s+)([^,]+)(?:,|\s+in\s+)([^.\n]+)/i);
          
          let name = nameMatch ? nameMatch[1].trim() : 'the person';
          let date = birthDetailsMatch ? birthDetailsMatch[1].trim() : '';
          let time = birthDetailsMatch ? birthDetailsMatch[2].trim() : '';
          let place = birthDetailsMatch ? birthDetailsMatch[3].trim() : '';
          
          // Create a more direct prompt focused on listing career options
          let modifiedPrompt = `Based on the natal chart for ${name} born on ${date} at ${time} in ${place}`;
          
          // Add planet positions if we extracted them
          if (cleanedPlanets) {
            modifiedPrompt += ` with   Planet Positions:   ${cleanedPlanets}`;
          }
          
          // Add specific career focus
          modifiedPrompt += `,   list exactly 5 suitable career fields based on astrological influences.   For each career option, give a brief reason why it's suitable.   Then provide 3 professional strengths indicated by the chart.   Use numbered format (1., 2., 3.) for clarity.   Be specific and focus on concrete career paths.`;
          
          // Extract chart data if available (for more complex cases)
          const chartDataMatch = userMessage.match(/birth chart data:\s*(\{.*\})/);
          if (chartDataMatch && chartDataMatch[1]) {
            modifiedPrompt += ` Chart data: ${chartDataMatch[1]}`;
          }
          
          console.log('Simplified career prompt for retry:', modifiedPrompt.substring(0, 100) + '...');
          
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
      console.error('Invalid planets data structure');
      return '';
    }
    
    console.log(`Formatting ${planets.length} planets`);
    
    // Create an array to hold formatted planet positions
    const positions = [];
    
    // Important planets to highlight first (in order of importance for astrology)
    const keyPlanets = ['Sun', 'Moon', 'Ascendant', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Rahu', 'Ketu'];
    
    // Track what signs have planets to determine rising sign/ascendant
    const planetSigns = {};
    let ascendantSign = '';
    
    // First pass to find Ascendant/Lagna
    planets.forEach(planet => {
      if (planet.name === 'Ascendant' || planet.name === 'Lagna') {
        ascendantSign = planet.zodiac || planet.sign || '';
        console.log(`Found Ascendant/Lagna in ${ascendantSign}`);
      }
      planetSigns[planet.name] = planet.zodiac || planet.sign || '';
    });
    
    // Add rising sign/ascendant first if found
    if (ascendantSign) {
      positions.push(`Rising Sign/Ascendant: ${ascendantSign}`);
    }
    
    // Add key planets in specific order
    keyPlanets.forEach(planetName => {
      const planet = planets.find(p => p.name === planetName);
      if (planet) {
        const sign = planet.zodiac || planet.sign || '';
        const retrograde = planet.is_retrograde ? ' (Retrograde)' : '';
        
        // Only add if we have sign information
        if (sign) {
          positions.push(`${planetName}: ${sign}${retrograde}`);
        }
      }
    });
    
    // Add nakshatra information if available
    planets.forEach(planet => {
      if ((planet.name === 'Moon' || planet.name === 'Sun') && planet.nakshatra) {
        positions.push(`${planet.name} Nakshatra: ${planet.nakshatra}`);
      }
    });
    
    // Join with triple spaces for better formatting
    const formattedText = positions.join('   ');
    
    // Log the formatted text for debugging
    console.log(`Formatted planet positions: ${formattedText.substring(0, 100)}...`);
    
    return formattedText;
  } catch (error) {
    console.error(`Error formatting planet positions: ${error.message}`);
    return ''; // Return empty string on error
  }
}

// Function to extract chart info from text as a fallback method
function extractChartInfoFromText(userMessage) {
  console.log('Attempting to extract chart info from text as fallback');
  
  // Try to extract chart info directly from text without JSON parsing
  const nakshatraMatch = userMessage.match(/Nakshatra[:\s-]+([^,.\n]+)/i);
  const moonSignMatch = userMessage.match(/Moon(?:\s+Sign)?[:\s-]+([^,.\n]+)/i);
  const sunSignMatch = userMessage.match(/Sun(?:\s+Sign)?[:\s-]+([^,.\n]+)/i);
  const ascendantMatch = userMessage.match(/(?:Ascendant|Lagna|Rising)[:\s-]+([^,.\n]+)/i);
  const yogasMatch = userMessage.match(/(?:yoga|yogas)[:\s-]+([^,.\n]+)/i);
  const mangalMatch = userMessage.match(/Mangal[:\s-]+([^,.\n]+)/i);
  
  if (nakshatraMatch || moonSignMatch || sunSignMatch || ascendantMatch) {
    // Create a clean array of planet positions
    const positions = [];
    
    if (ascendantMatch) positions.push(`Rising Sign/Ascendant: ${ascendantMatch[1].trim()}`);
    if (sunSignMatch) positions.push(`Sun: ${sunSignMatch[1].trim()}`);
    if (moonSignMatch) positions.push(`Moon: ${moonSignMatch[1].trim()}`);
    if (nakshatraMatch) positions.push(`Moon Nakshatra: ${nakshatraMatch[1].trim()}`);
    if (yogasMatch) positions.push(`Yogas: ${yogasMatch[1].trim()}`);
    if (mangalMatch) positions.push(`Mangal Dosha: ${mangalMatch[1].trim()}`);
    
    // Join with double spaces for better formatting
    const chartInfo = positions.join('   ');
    
    console.log(`Successfully extracted chart info from text: ${chartInfo.substring(0, 100)}...`);
    return chartInfo;
  }
  
  // If no chart info found in text, check for JSON
  if (userMessage.includes('birth chart data')) {
    try {
      console.log('Found birth chart data in JSON format, extracting and converting to planet positions format');
      const chartDataMatch = userMessage.match(/birth chart data:?\s*(\{.*\})/s);
      if (chartDataMatch && chartDataMatch[1]) {
        const chartData = JSON.parse(chartDataMatch[1]);
        if (chartData?.kundli?.data) {
          const data = chartData.kundli.data;
          
          // Convert kundli data format to planet positions format
          const positions = [];
          
          // Add rising sign/ascendant if available
          if (data.ascendant?.sign) {
            positions.push(`Rising Sign/Ascendant: ${data.ascendant.sign}`);
          }
          
          // Add planets
          if (data.planets && Array.isArray(data.planets)) {
            // Important planets to include first
            const keyPlanets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Rahu', 'Ketu'];
            
            keyPlanets.forEach(planetName => {
              const planet = data.planets.find(p => p.name === planetName);
              if (planet) {
                positions.push(`${planetName}: ${planet.sign}${planet.retrograde ? ' (Retrograde)' : ''}`);
              }
            });
          } else {
            // Alternative way to extract planet info if planets array not available
            if (data.nakshatra_details?.soorya_rasi?.name) {
              positions.push(`Sun: ${data.nakshatra_details.soorya_rasi.name}`);
            }
            if (data.nakshatra_details?.chandra_rasi?.name) {
              positions.push(`Moon: ${data.nakshatra_details.chandra_rasi.name}`);
            }
            if (data.nakshatra_details?.nakshatra?.name) {
              positions.push(`Moon Nakshatra: ${data.nakshatra_details.nakshatra.name}`);
            }
          }
          
          // Add Yogas if available
          if (data.yoga_details && Array.isArray(data.yoga_details) && data.yoga_details.length > 0) {
            positions.push(`Yogas: ${data.yoga_details.map(y => y.name).join(', ')}`);
          }
          
          // Add Mangal Dosha if available
          if (data.mangal_dosha) {
            positions.push(`Mangal Dosha: ${data.mangal_dosha.has_dosha ? 'Yes' : 'No'}`);
          }
          
          // Join with double spaces for better formatting
          const chartInfo = positions.join('   ');
          
          console.log(`Successfully converted kundli data to planet positions format: ${chartInfo.substring(0, 100)}...`);
          return chartInfo;
        }
      }
    } catch (error) {
      console.error(`Error parsing JSON chart data: ${error.message}`);
    }
  }
  
  // Return empty string if nothing found
  console.log('No chart info found in text or JSON');
  return '';
} 