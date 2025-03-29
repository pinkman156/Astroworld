import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { BirthData, ApiResponse, VedicChart } from '../../types';

// API Configuration based on environment
const API_CONFIG = {
  development: {
    baseURL: '',  // Empty base URL - always use relative URLs
    timeout: 30000,
  },
  production: {
    // Use relative URL in production to avoid CORS issues
    baseURL: '',
    timeout: 30000,
    fallbackURL: 'https://astroworld-delta.vercel.app' // Production deployment URL
  },
};

// Cache for API responses
const cache = new Map<string, any>();

/**
 * Converts 12-hour time format (HH:MM AM/PM) to 24-hour format (HH:MM)
 * @param time12h - Time in 12-hour format
 * @returns Time in 24-hour format
 */
function convertTo24HourFormat(time12h: string): string {
  // If the time is already in 24-hour format (no AM/PM), return it
  if (!time12h.includes('AM') && !time12h.includes('PM') && !time12h.includes('am') && !time12h.includes('pm')) {
    return time12h;
  }
  
  // Parse the 12-hour time
  const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)/i;
  const match = time12h.match(timeRegex);
  
  if (!match) {
    // If the format doesn't match, return as is
    console.warn('Invalid time format:', time12h);
    return time12h;
  }
  
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = match[3].toUpperCase();
  
  // Convert hours to 24-hour format
  if (period === 'PM' && hours < 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }
  
  // Format with leading zeros
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
}

/**
 * API Service class for handling all API requests
 */
class ApiService {
  private client: AxiosInstance;
  private prokeralaToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor() {
    // Determine environment
    const environment = import.meta.env.MODE || 'development';
    
    // Always use relative URLs to avoid CORS issues
    const config = environment === 'production' ? API_CONFIG.production : API_CONFIG.development;
    
    console.log(`API Service initialized in ${environment} mode with relative URLs`);

    // Create API client
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => this.handleApiError(error)
    );
    
    // Add request interceptor to try fallback URL for 404 errors in production
    if (environment === 'production') {
      this.client.interceptors.response.use(
        (response) => response,
        async (error: AxiosError) => {
          const originalRequest = error.config;
          if (error.response?.status === 404 && originalRequest && !originalRequest.headers['X-Retry-With-Fallback']) {
            console.log('API endpoint not found, trying fallback URL:', API_CONFIG.production.fallbackURL);
            // Set flag to prevent infinite loop
            originalRequest.headers['X-Retry-With-Fallback'] = 'true';
            // Retry with fallback URL
            originalRequest.url = `${API_CONFIG.production.fallbackURL}${originalRequest.url}`;
            return this.client(originalRequest);
          }
          return Promise.reject(error);
        }
      );
    }
  }

  /**
   * Clear the API cache
   */
  clearCache(): void {
    cache.clear();
  }

  /**
   * Handle API errors in a consistent way
   */
  private handleApiError(error: AxiosError): Promise<never> {
    console.error('API Error:', error);
    
    let errorMessage = 'An unknown error occurred';
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const data = error.response.data as any;
      errorMessage = data.error || data.message || `Error ${error.response.status}: ${error.response.statusText}`;
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage = 'No response received from server. Please check your connection.';
    } else {
      // Something happened in setting up the request that triggered an Error
      errorMessage = error.message || 'Error setting up request';
    }
    
    return Promise.reject({
      success: false,
      error: errorMessage
    });
  }

  /**
   * Get the Prokerala API token
   */
  private async getProkeralaToken(): Promise<string> {
    // If we have a valid token, return it
    const now = Date.now();
    if (this.prokeralaToken && this.tokenExpiry && now < this.tokenExpiry) {
      return this.prokeralaToken;
    }

    try {
      console.log('Requesting new Prokerala API token...');
      
      // Define multiple possible token endpoints to try
      const tokenEndpoints = [
        '/api/prokerala-proxy/token',                               // Standard endpoint
        'api/prokerala-proxy/token',                                // Without leading slash
        '/prokerala-proxy/token',                                   // Alternative path
        'https://astroworld-delta.vercel.app/api/prokerala-proxy/token' // Full URL
      ];
      
      let response = null;
      let lastError = null;
      
      // Try each endpoint until one works
      for (const endpoint of tokenEndpoints) {
        try {
          console.log(`Trying token endpoint: ${endpoint}`);
          
          if (endpoint.startsWith('http')) {
            // Use direct axios call for full URLs
            response = await axios.post(endpoint, {}, {
              headers: {
                'Content-Type': 'application/json',
              },
              timeout: 150000
            });
          } else {
            // Use the configured client for relative URLs
            response = await this.client.post(endpoint, {});
          }
          
          // If we got a successful response, break the loop
          if (response?.data?.access_token) {
            console.log(`Successfully retrieved token from ${endpoint}`);
            break;
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`Error with token endpoint ${endpoint}:`, err.message);
          // Continue to next endpoint
        }
      }
      
      // If we still don't have a response, try one more direct endpoint
      if (!response?.data?.access_token) {
        console.log('All standard endpoints failed, trying backup URL');
        try {
          response = await axios({
            method: 'POST',
            url: 'https://astroworld-delta.vercel.app/api/prokerala-proxy',
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 20000
          });
        } catch (finalErr: any) {
          console.error('Backup token endpoint also failed:', finalErr.message);
          throw new Error('All API token endpoints failed');
        }
      }
      
      if (!response?.data?.access_token) {
        console.error('Invalid token response:', response?.data);
        throw new Error('Invalid token response from API');
      }
      
      this.prokeralaToken = response.data.access_token;
      // Set expiry time with a 10-minute buffer
      this.tokenExpiry = now + (response.data.expires_in - 600) * 1000;
      console.log('Successfully retrieved Prokerala API token');
      
      // Ensure null token is never returned
      if (!this.prokeralaToken) {
        throw new Error('Failed to get a valid token');
      }
      
      return this.prokeralaToken;
    } catch (error) {
      console.error('Failed to get Prokerala token:', error);
      throw error;
    }
  }

  /**
   * Helper function to delay execution
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Helper function for exponential backoff retry
   * @param fn Function to retry
   * @param retries Maximum number of retries
   * @param baseDelay Base delay in milliseconds
   * @param factor Exponential factor
   */
  private async retryWithExponentialBackoff<T>(
    fn: () => Promise<T>,
    retries = 3,
    baseDelay = 1000,
    factor = 2
  ): Promise<T> {
    let attempt = 0;
    let lastError: any;

    while (attempt < retries) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        attempt++;
        
        if (attempt >= retries) break;
        
        // Calculate exponential backoff delay
        const delay = baseDelay * Math.pow(factor, attempt - 1);
        const jitter = Math.random() * 1000; // Add some randomness
        const totalDelay = delay + jitter;
        
        console.log(`API request failed. Retrying in ${Math.round(totalDelay / 1000)} seconds (attempt ${attempt}/${retries})`);
        
        // Wait for the calculated delay
        await this.delay(totalDelay);
      }
    }
    
    throw lastError;
  }

  /**
   * Helper to make authenticated Prokerala API requests with retries
   */
  private async makeProkeralaRequest(endpoint: string, params: Record<string, any>, retryCount = 0): Promise<any> {
    const maxRetries = 1; // Only retry once
    
    try {
      // Get a fresh token
      const token = await this.getProkeralaToken();
      
      // IMPORTANT: Fix for Prokerala API format issues
      if (endpoint === 'chart') {
        // Handle chart_type parameter - Must be properly formatted JSON string
        if (params.chart_type) {
          // If it's already a string but looks like JSON with a name property,
          // extract the name value and use it as a simple string
          if (typeof params.chart_type === 'string') {
            try {
              // Check if it's a JSON string with name property
              const parsed = JSON.parse(params.chart_type);
              if (parsed && parsed.name) {
                // Extract just the name value and convert to lowercase
                params.chart_type = parsed.name.toLowerCase();
              } else {
                // Use as is, just ensure lowercase
                params.chart_type = params.chart_type.toLowerCase();
              }
            } catch (e) {
              // If not valid JSON, just use as is with lowercase
              params.chart_type = params.chart_type.toLowerCase();
            }
          } else if (typeof params.chart_type === 'object' && params.chart_type.name) {
            // If it's an object with name property, extract the name
            params.chart_type = params.chart_type.name.toLowerCase();
          } else {
            // Default fallback
            params.chart_type = 'rasi';
          }
        } else {
          // Set default if missing
          params.chart_type = 'rasi';
        }
        
        // Ensure chart_style is set
        if (!params.chart_style) {
          params.chart_style = 'north-indian';
        }
        
        // This is the crucial fix: Don't add timezone information at all!
        // The API will handle it with default timezone
        if (params.datetime) {
          // Make sure any spaces are converted to 'T'
          if (params.datetime.includes(' ')) {
            params.datetime = params.datetime.replace(' ', 'T');
          }
          
          // Important: Remove any timezone information to avoid the double timezone issue
          params.datetime = params.datetime.replace(/[+-]\d{2}:\d{2}$/, '');
          
          console.log('Fixed datetime for chart API:', params.datetime);
        }
      }
      
      console.log('Final params for API request:', params);
      
      // Make the API request with properly formatted parameters
      const response = await this.client.get(`/api/prokerala-proxy/${endpoint}`, {
        params,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      return response;
    } catch (error: any) {
      // If it's an authentication error and we haven't exceeded retries
      if (error?.response?.status === 401 && retryCount < maxRetries) {
        console.log('Authentication error, refreshing token and retrying...');
        // Reset token and retry
        this.prokeralaToken = null;
        this.tokenExpiry = null;
        return this.makeProkeralaRequest(endpoint, params, retryCount + 1);
      }
      
      // Otherwise propagate the error
      throw error;
    }
  }

  /**
   * Clean coordinate data from astrological prompts to improve AI processing
   * @param prompt The original prompt with coordinates
   * @returns A cleaned prompt without numerical coordinates
   */
  cleanAstrologyPrompt(prompt: string): string {
    console.log('Cleaning astrological prompt coordinates...');
    
    // Replace escaped newlines with real newlines for better processing
    let cleanedPrompt = prompt.replace(/\\n/g, '\n');
    
    // Various patterns to match coordinates in different formats
    const atDegreePattern = /\s+at\s+\d+\.\d+°/g;
    const atDecimalPattern = /\s+at\s+\d+\.\d+(?!\w)/g;
    const standaloneCoordinatePattern = /\s+\d+\.\d+°(?!\w)/g;
    const parenthesesPattern = /\s*\(\s*\d+\.\d+[°\s]*\)/g;
    const retrogradeCoordPattern = /\s*\(\s*\d+\.\d+[°\s]*,?\s*Retrograde\s*\)/gi;

    // Count matches for debugging
    const atDegreeMatches = (cleanedPrompt.match(atDegreePattern) || []).length;
    const atDecimalMatches = (cleanedPrompt.match(atDecimalPattern) || []).length;
    const standaloneMatches = (cleanedPrompt.match(standaloneCoordinatePattern) || []).length;
    const parenthesesMatches = (cleanedPrompt.match(parenthesesPattern) || []).length;
    
    if (atDegreeMatches + atDecimalMatches + standaloneMatches + parenthesesMatches > 0) {
      console.log(`Found coordinate patterns: ${atDegreeMatches} 'at X.Y°', ${atDecimalMatches} 'at X.Y', ${standaloneMatches} standalone coordinates, ${parenthesesMatches} in parentheses`);
    }
    
    // Replace retrograde coordinates while preserving retrograde status
    cleanedPrompt = cleanedPrompt.replace(retrogradeCoordPattern, ' (Retrograde)');
    
    // Remove all other coordinates
    cleanedPrompt = cleanedPrompt
      // Remove newline characters and HTML tags
      .replace(/\n+/g, ' ')
      .replace(/\\(.)/g, '$1')
      .replace(/<[^>]*>/g, '')
      .replace(atDegreePattern, '')
      .replace(atDecimalPattern, '')
      .replace(standaloneCoordinatePattern, '')
      .replace(parenthesesPattern, '')
      // Clean general degree pattern (planet/sign followed by degrees)
      .replace(/([A-Za-z]+)\s+\d+\.\d+°/g, '$1')
      // Clean any decimal followed by degree symbol
      .replace(/\d+\.\d+°/g, '');

    
    // Check for any remaining coordinates
    const remainingCoords = cleanedPrompt.match(/\d+\.\d+°/g);
    if (remainingCoords) {
      console.log(`Found ${remainingCoords.length} remaining coordinates after cleaning. Removing these.`);
      cleanedPrompt = cleanedPrompt.replace(/\d+\.\d+°/g, '');
    }
    
    console.log('Astrological prompt coordinates cleaned successfully');
    console.log('Cleaned prompt:', cleanedPrompt);
    return cleanedPrompt;
  }

  /**
   * Get AI-generated insight with a specific prompt
   */
  async getAIInsight(prompt: string, systemPrompt: string = "You are an expert Vedic astrologer. IMPORTANT INSTRUCTION: Always provide a complete response without truncation. Cover all requested sections thoroughly. Start with the most important information. Format each section with ## headers and numbered lists (1., 2., 3.) for clarity. Never end a response mid-sentence or before completing all requested sections.", insightType: string = "general"): Promise<string> {
    try {
      // First, check if we have a cached response for this prompt
      const cacheKey = `insight_${insightType}_${prompt.substring(0, 50).replace(/\s+/g, '_').toLowerCase()}`;
      const cachedResponse = cache.get(cacheKey);
      if (cachedResponse) {
        console.log(`Using cached ${insightType} insight`);
        return cachedResponse.data.insight;
      }
      
      // Start with high token count to avoid truncation
      let maxTokens = 16000;
      let attempt = 0;
      const maxAttempts = 3;
      let responseContent = "";
      
      // Check if this is an astrological request and clean coordinates if needed
      const isAstrologyRequest = prompt.includes('astrological reading') && 
        (prompt.includes('Planet Positions:') || prompt.match(/Sun:|Moon:|Ascendant:/));
      
      // Check if this is a simple non-astrological request (e.g., health check)
      const isSimpleQuery = prompt.length < 30 || 
                         insightType.includes('health') || 
                         prompt.includes('health') || 
                         (systemPrompt && systemPrompt.includes('Do NOT provide astrological readings'));
      
      // Clean coordinates from astrological prompts
      const cleanedPrompt = isAstrologyRequest ? this.cleanAstrologyPrompt(prompt) : prompt;
      
      if (isAstrologyRequest) {
        console.log('Cleaned astrological prompt for better AI processing');
        
        // For astrological readings, enhance the system prompt to ensure complete responses
        systemPrompt += " Provide complete responses covering all requested sections. Do not truncate your response. Be direct and concise while ensuring all sections are addressed properly. Each section should have substantive content.";
      } else if (isSimpleQuery) {
        // For simple queries, ensure we get a direct response not related to astrology
        systemPrompt = "You are a helpful assistant. Provide direct, concise answers. Do NOT provide astrological information unless explicitly requested.";
      }
      
      // Set appropriate token limits based on request type
      if (isSimpleQuery) {
        maxTokens = 100; // Very limited tokens for simple queries
      }
      
      while (attempt < maxAttempts) {
        try {
          console.log(`Making Together AI request for ${insightType} with ${maxTokens} max_tokens (attempt ${attempt + 1}/${maxAttempts})`);
          
          // Make the API request with current token limit
          const insightResponse = await axios.post('/api/together/chat', {
            model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
            messages: [
              {
                role: "system",
                content: systemPrompt + " IMPORTANT: Always provide a complete response without truncation. Cover every requested section fully. Do not end your response abruptly. Format each section with ## headers and numbered lists (1., 2., 3.) for clarity."
              },
              {
                role: "user",
                content: cleanedPrompt
              }
            ],
            temperature: 0.7,
            max_tokens: maxTokens
          }, {
            timeout: 55000,  // Increased timeout to allow for more complete responses
            headers: {
              'Content-Type': 'application/json',
              'X-Request-Type': isSimpleQuery ? 'simple-chat' : 'astrological-insight',
              'X-Insight-Type': insightType,
              'X-Simple-Query': isSimpleQuery ? 'true' : 'false'
            }
          });
          
          // Extract content and check if it appears truncated
          responseContent = insightResponse.data.choices[0].message.content;
          const tokenCount = insightResponse.data.usage?.completion_tokens || 0;
          
          // Check for truncation with enhanced detection
          if (
            (tokenCount < 300 && responseContent.length < 1000) || 
            responseContent.includes("Let me continue") || 
            responseContent.includes("I'll continue") ||
            (responseContent.match(/##\s*[^#]+$/) && responseContent.length < 2000) || // Ends with header + little content
            (responseContent.includes('## Birth Details') && !responseContent.includes('## Birth Chart Overview')) ||
            (responseContent.includes('## Key Strengths') && !responseContent.includes('## Potential Challenges')) ||
            insightResponse.data.choices[0].finish_reason === 'length'
          ) {
            console.log(`Response appears truncated (${tokenCount} tokens, ${responseContent.length} chars). Retrying with improved prompt.`);
            
            // For astrological readings, restructure the prompt
            if (isAstrologyRequest) {
              // Extract key information
              const nameMatch = cleanedPrompt.match(/for\s+([^(,\n]+)/i);
              const birthDetailsMatch = cleanedPrompt.match(/born\s+(?:on\s+)?([^,]+)(?:,|\s+at\s+)([^,]+)(?:,|\s+in\s+)([^.\n]+)/i);
              
              let name = nameMatch ? nameMatch[1].trim() : 'the person';
              let date = birthDetailsMatch ? birthDetailsMatch[1].trim() : '';
              let time = birthDetailsMatch ? birthDetailsMatch[2].trim() : '';
              let place = birthDetailsMatch ? birthDetailsMatch[3].trim() : '';
              
              // Extract planet positions if present
              let planetPositions = '';
              if (cleanedPrompt.includes('Planet Positions:')) {
                const planetPositionsMatch = cleanedPrompt.match(/Planet Positions:([\s\S]*?)(?:Include|Section|##|$)/i);
                if (planetPositionsMatch) {
                  planetPositions = planetPositionsMatch[1].trim();
                }
              }
              
              // Create a structured prompt that ensures we get all sections
              const restructuredPrompt = `Generate a complete astrological reading for ${name} born on ${date} at ${time} in ${place}.`;
              
              if (planetPositions) {
                planetPositions = planetPositions.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
                const cleanedPrompt = `${restructuredPrompt}

Planet Positions:
${planetPositions}

Include ALL of these sections, each with substantive content:
1. Birth Details (name, date, time, place)
2. Birth Chart Overview (clearly state Sun sign, Moon sign, and Ascendant/Lagna)
3. Ascendant/Lagna analysis
4. Personality Overview
5. Career Insights (3 specific insights)
6. Relationship Patterns (3 insights)
7. Key Strengths (5 strengths)
8. Potential Challenges (5 challenges)
9. Significant Chart Features (5 features)

Use section headers with ## and keep points concise but complete. Format lists with numbered format (1., 2., 3.). Make sure to include ALL sections.`;
                
                // Try again with the restructured prompt
                const retryResponse = await axios.post('/api/together/chat', {
                  model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
                  messages: [
                    {
                      role: "system",
                      content: "You are an expert Vedic astrologer providing complete readings. IMPORTANT: Respond with ALL requested sections in full without truncation. Use ## for section headers. Make every section substantive."
                    },
                    {
                      role: "user",
                      content: cleanedPrompt
                    }
                  ],
                  temperature: 0.7,
                  max_tokens: 16000
                }, {
                  timeout: 55000
                });
                
                responseContent = retryResponse.data.choices[0].message.content;
                break;
              }
            }
            
            // If we get here and haven't succeeded with restructuring, increment and try again
            attempt++;
            continue;
          }
          
          // If we get here, the response is complete enough
          break;
          
        } catch (error: any) {
          console.error(`Error on attempt ${attempt + 1} for ${insightType}:`, error?.message || error);
          
          // If we've reached max attempts, throw the error
          if (attempt >= maxAttempts - 1) {
            throw error;
          }
          
          // Otherwise increment attempt and retry
          attempt++;
          await this.delay(2000);
        }
      }
      
      // If we still don't have a valid response after all attempts, throw error
      if (!responseContent || responseContent.length < 50) {
        throw new Error(`Failed to generate ${insightType} insight after multiple attempts`);
      }
      
      // Cache successful response
      cache.set(cacheKey, {
        success: true,
        data: {
          insight: responseContent
        }
      });
      
      return responseContent;
    } catch (error: any) {
      console.error('Error generating AI insight:', error);
      
      // If it times out or fails, retry with a simpler prompt
      if (error.message && (error.message.includes('timeout') || error.response?.status === 504 || error.message.includes('FUNCTION_INVOCATION_TIMEOUT'))) {
        console.log('Request timed out. Retrying with simpler prompt...');
        
        // Create a better version of the prompt for astrological readings
        let restructuredPrompt = prompt;
        
        // If prompt is a complex astrological reading, create a more structured prompt
        if (prompt.includes('astrological reading') || prompt.includes('birth chart') || prompt.includes('Planet Positions:')) {
          // Extract key information
          const nameMatch = prompt.match(/for\s+([^(,\n]+)/i);
          const birthDetailsMatch = prompt.match(/born\s+(?:on\s+)?([^,]+)(?:,|\s+at\s+)([^,]+)(?:,|\s+in\s+)([^.\n]+)/i);
          
          let name = nameMatch ? nameMatch[1].trim() : 'the person';
          let date = birthDetailsMatch ? birthDetailsMatch[1].trim() : '';
          let time = birthDetailsMatch ? birthDetailsMatch[2].trim() : '';
          let place = birthDetailsMatch ? birthDetailsMatch[3].trim() : '';
          
          // Extract planet positions if present
          let planetPositions = '';
          if (prompt.includes('Planet Positions:')) {
            const planetPositionsMatch = prompt.match(/Planet Positions:([\s\S]*?)(?:Include|Section|##|$)/i);
            if (planetPositionsMatch) {
              planetPositions = planetPositionsMatch[1].trim();
            }
          }
          
          // Create clear, direct prompt
          restructuredPrompt = `Generate a complete astrological reading for ${name} born on ${date} at ${time} in ${place}.`;
          
          if (planetPositions) {
            planetPositions = planetPositions.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
            restructuredPrompt += `\n\nPlanet Positions:\n${planetPositions}`;
          }
          
          restructuredPrompt += `\n\nInclude ALL of these sections, each with substantive content:
1. Birth Details (name, date, time, place)
2. Birth Chart Overview (clearly state Sun sign, Moon sign, and Ascendant/Lagna)
3. Ascendant/Lagna analysis
4. Personality Overview
5. Career Insights (3 specific insights)
6. Relationship Patterns (3 insights)
7. Key Strengths (5 strengths)
8. Potential Challenges (5 challenges)
9. Significant Chart Features (5 features)

Use section headers with ## and keep points concise but complete. Format lists with numbered format (1., 2., 3.). Make sure to include ALL sections.`;
        } else {
          // For non-astrological queries, simplify but keep core request
          restructuredPrompt = prompt.split('.').slice(0, 3).join('.') + '.';
          if (restructuredPrompt.length < 50) {
            restructuredPrompt = prompt; // Use original if simplified version is too short
          }
        }
        
        // Clean the restructured prompt if needed
        const isAstrologyRetry = restructuredPrompt.includes('astrological reading') ||
                              restructuredPrompt.includes('birth chart') ||
                              restructuredPrompt.includes('Planet Positions:');
        const cleanedPrompt = isAstrologyRetry ? this.cleanAstrologyPrompt(restructuredPrompt) : restructuredPrompt;
        
        try {
          const retryResponse = await axios.post('/api/together/chat', {
            model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
            messages: [
              {
                role: "system",
                content: isAstrologyRetry ? 
                  "You are an expert Vedic astrologer. Provide complete responses covering all requested sections. Do not truncate your response. Be direct and concise while ensuring all sections are addressed properly. Each section should have substantive content. Always use ## prefix for section headers." :
                  "You are a helpful assistant. Provide direct, concise answers. Do NOT provide astrological information unless explicitly requested."
              },
              {
                role: "user",
                content: cleanedPrompt
              }
            ],
            temperature: 0.7,
            max_tokens: isAstrologyRetry ? 16000 : 500  // Adjust token limit based on query type
          }, {
            timeout: isAstrologyRetry ? 55000 : 20000,  // Shorter timeout for simple queries
            headers: {
              'Content-Type': 'application/json',
              'X-Request-Type': isAstrologyRetry ? 'simplified-insight' : 'simple-chat',
              'X-Insight-Type': insightType,
              'X-Simple-Query': isAstrologyRetry ? 'false' : 'true'
            }
          });
          
          const retryContent = retryResponse.data.choices[0].message.content;
          
          // Ensure proper formatting for the UI
          const processedRetryContent = retryContent
            .replace(/\*\*([^*]+)\*\*/g, '## $1')  // Replace **Header** with ## Header
            .replace(/^(Personality Overview|Career Insights|Relationship Patterns|Key Strengths|Potential Challenges)$/gm, '## $1'); // Add ## to any headers without them
          
          // Cache the retry response
          const retryCacheKey = `insight_${insightType}_simplified_${new Date().getTime()}`;
          cache.set(retryCacheKey, {
            success: true,
            data: {
              insight: processedRetryContent
            }
          });
          
          return processedRetryContent;
        } catch (retryError: any) {
          throw new Error(`Failed to generate insight: ${retryError.message}`);
        }
      }
      
      throw error;
    }
  }

  /**
   * Get astrological insight for the provided birth data
   */
  async getAstrologyInsight(birthData: BirthData): Promise<ApiResponse> {
    const cacheKey = `insight_${JSON.stringify(birthData)}`;
    
    // Check if insight is cached
    const cachedResponse = cache.get(cacheKey);
    if (cachedResponse) {
      console.log('Returning cached insight');
      return cachedResponse;
    }
    
    try {
      // Get geocoding data for the place
      console.log(`Attempting to geocode: ${birthData.place}`);
      
      let coordinates;
      
      try {
        const geocodeResponse = await this.client.get('/api/geocode', {
          params: { q: birthData.place }
        });
        
        if (!geocodeResponse.data || geocodeResponse.data.length === 0) {
          console.warn(`Location not found: ${birthData.place}`);
          throw new Error('Location not found');
        }
        
        const location = geocodeResponse.data[0];
        coordinates = `${location.lat},${location.lon}`;
        console.log(`Geocoded ${birthData.place} to coordinates ${coordinates}`);
      } catch (geocodeError: any) {
        console.error(`Geocoding error for ${birthData.place}:`, geocodeError);
        return {
          success: false,
          error: `Unable to find "${birthData.place}". The geocoding service may be unavailable. Please try a different location or try again later.`
        };
      }
      
      // Format date and time for API request
      let formattedDateTime;
      if (birthData.date.includes('/')) {
        // Convert from DD/MM/YYYY to YYYY-MM-DD format
        const [day, month, year] = birthData.date.split('/');
        
        // Convert time from 12-hour to 24-hour format if needed
        let formattedTime = convertTo24HourFormat(birthData.time);
        
        formattedDateTime = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${formattedTime}:00`;
      } else {
        // Already in YYYY-MM-DD format
        const [year, month, day] = birthData.date.split('-');
        
        // Convert time from 12-hour to 24-hour format if needed
        let formattedTime = convertTo24HourFormat(birthData.time);
        
        formattedDateTime = `${year}-${month}-${day} ${formattedTime}:00`;
      }
      
      console.log('Formatted datetime for API:', formattedDateTime);
      
      // For chart API, directly use ISO 8601 format
      const isoDateTime = formattedDateTime.replace(' ', 'T') + '+05:30';
      
      // Get the birth chart data using our helper method with explicit chart parameters
      const chartResponse = await this.makeProkeralaRequest('chart', {
        datetime: isoDateTime,
        coordinates,
        ayanamsa: 1, // Lahiri ayanamsa
        chart_type: "rasi", // Use a simple string instead of JSON object
        chart_style: 'north-indian'
      });
      
      // Add a small delay before next request to prevent overloading
      await this.delay(500);
      
      // Get planet position data for more accurate chart details
      console.log('Fetching planet position data for chart details');
      const planetPositionResponse = await this.makeProkeralaRequest('planet-position', {
        datetime: formattedDateTime,
        coordinates,
        ayanamsa: 1
      });
      
      // Log the structure of the planet position response for debugging
      console.log('Planet position API response structure:', 
        planetPositionResponse.data ? 
          `data: ${typeof planetPositionResponse.data}, ` + 
          `data.data: ${planetPositionResponse.data.data ? 'exists' : 'missing'}, ` +
          `planet_position: ${planetPositionResponse.data.data?.planet_position ? 
            `array with ${planetPositionResponse.data.data.planet_position.length} items` : 
            'missing'}`
        : 'no data'
      );
      
      // Add a small delay before next request to prevent overloading
      await this.delay(500);
      
      // Get kundli data as fallback if needed
      const kundliResponse = await this.makeProkeralaRequest('kundli', {
        datetime: formattedDateTime,
        coordinates,
        ayanamsa: 1
      });
      
      // Create the chart data summary for AI
      const chartData = {
        chart: chartResponse.data,
        planets: planetPositionResponse.data?.data?.planet_position || [],
        kundli: kundliResponse.data
      };
      
      // Helper function to reduce data size and format planet positions
      const summarizeChartData = (data: any): any => {
        // Create a summarized version of the chart data to reduce payload size
        const summary: any = {};
        
        // Extract planet positions and format them for the AI
        if (data.planets && Array.isArray(data.planets)) {
          // Format planet positions in a readable format
          let planetPositionsText = '';
          
          // Important planets to highlight first (in order of importance for astrology)
          const keyPlanets = ['Sun', 'Moon', 'Ascendant', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Rahu', 'Ketu'];
          
          // Add rising sign/ascendant first if found
          const ascendant = data.planets.find((p: any) => p.name === 'Ascendant' || p.name === 'Lagna');
          if (ascendant) {
            const sign = ascendant.rasi?.name || ascendant.zodiac || ascendant.sign || '';
            if (sign) {
              planetPositionsText += `Rising Sign/Ascendant: ${sign}\n`;
            }
          }
          
          // Add key planets in specific order
          keyPlanets.forEach(planetName => {
            const planet = data.planets.find((p: any) => p.name === planetName);
            if (planet) {
              const sign = planet.rasi?.name || planet.zodiac || planet.sign || '';
              const degree = planet.longitude || planet.degree || '';
              const retrograde = planet.is_retrograde ? ' (Retrograde)' : '';
              
              // Only add if we have sign information
              if (sign) {
                planetPositionsText += `${planetName}: ${sign}${degree ? ` at ${degree}°` : ''}${retrograde}\n`;
              }
            }
          });
          
          // Add nakshatra information if available
          data.planets.forEach((planet: any) => {
            if ((planet.name === 'Moon' || planet.name === 'Sun') && planet.nakshatra) {
              planetPositionsText += `${planet.name} Nakshatra: ${planet.nakshatra}\n`;
            }
          });
          
          // Store the formatted planet positions
          summary.planetPositions = planetPositionsText;
          console.log('Formatted planet positions for AI:', planetPositionsText);
        } else {
          console.warn('No planet position data available for AI prompt');
        }
        
        // Extract only essential information from chart data
        if (data.chart && data.chart.data) {
          const chartSummary: any = {};
          if (data.chart.data.chart_type) chartSummary.chart_type = data.chart.data.chart_type;
          if (data.chart.data.planet_positions) chartSummary.planet_positions = data.chart.data.planet_positions;
          // Don't include SVG or other heavy content
          summary.chart = { data: chartSummary };
        }
        
        // Extract only essential information from kundli data (as fallback)
        if (data.kundli && data.kundli.data) {
          const kundliSummary: any = {};
          if (data.kundli.data.nakshatra_details) kundliSummary.nakshatra_details = data.kundli.data.nakshatra_details;
          if (data.kundli.data.yoga_details) kundliSummary.yoga_details = data.kundli.data.yoga_details;
          if (data.kundli.data.mangal_dosha) kundliSummary.mangal_dosha = data.kundli.data.mangal_dosha;
          summary.kundli = { data: kundliSummary };
        }
        
        return summary;
      };
      
      // Use the summarized version for AI requests
      const summarizedChartData = summarizeChartData(chartData);
      
      // Make a single comprehensive request instead of multiple segments
      try {
        console.log('Making a single comprehensive astrological analysis request');
        
        // Create a prompt that requests all the information needed in a structured format
        const comprehensivePrePrompt = `Generate a comprehensive astrological reading for ${birthData.name} born on ${birthData.date} at ${birthData.time} IST in ${birthData.place}.

${summarizedChartData.planetPositions ? 'Planet Positions:\n' + summarizedChartData.planetPositions : 'Birth chart details:\n' + JSON.stringify(summarizedChartData)}

IMPORTANT: Start with the most crucial information and format your response as follows:

## Birth Details
- Date: ${birthData.date}
- Time: ${birthData.time}
- Place: ${birthData.place}
- Name: ${birthData.name}

## Birth Chart Overview
Provide a brief overview including the Sun sign, Moon sign, and Ascendant/Lagna sign - be explicit about these three positions.

## Ascendant/Lagna
Describe the rising sign qualities and influence.

## Personality Overview
Analyze the personality traits and character.

## Career Insights
1. (First career insight)
2. (Second career insight)
3. (Third career insight)

## Relationship Patterns
1. (First relationship insight)
2. (Second relationship insight)
3. (Third relationship insight)

## Key Strengths
1. (First strength)
2. (Second strength)
3. (Third strength)
4. (Fourth strength)
5. (Fifth strength)

## Potential Challenges
1. (First challenge)
2. (Second challenge)
3. (Third challenge)
4. (Fourth challenge)
5. (Fifth challenge)

## Significant Chart Features
1. (First feature)
2. (Second feature)
3. (Third feature)
4. (Fourth feature)
5. (Fifth feature)

Keep points concise but substantive. Focus on concrete insights rather than general statements.`;

        const comprehensivePrompt = this.cleanAstrologyPrompt(comprehensivePrePrompt);
        console.log('Comprehensive prompt:', comprehensivePrompt);

        // Make single request with appropriate system prompt
        const comprehensiveInsight = await this.retryWithExponentialBackoff(
          async () => {
            // Starting with 10000 tokens and will increase if response is truncated
            let maxTokens = 10000;
            let attempt = 0;
            const maxAttempts = 3;
            let response;
            
            while (attempt < maxAttempts) {
              try {
                console.log(`Making Together API request with ${maxTokens} max_tokens (attempt ${attempt + 1}/${maxAttempts})`);
                
                response = await this.client.post('/api/together/chat', {
                  model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
                  messages: [
                    {
                      role: "system",
                      content: "You are an expert Vedic astrologer providing concise readings. IMPORTANT INSTRUCTION: Always provide a complete response without truncation. Cover all requested sections thoroughly. Start with the most important information. Format each section with ## headers and numbered lists (1., 2., 3.) for clarity. Never end a response mid-sentence or before completing all requested sections."
                    },
                    {
                      role: "user",
                      content: comprehensivePrompt
                    }
                  ],
                  temperature: 0.7,
                  max_tokens: maxTokens
                });
                
                // Check if response seems truncated (fewer than 100 tokens or stops in the middle of Birth Details)
                const content = response.data.choices[0].message.content;
                const tokenCount = response.data.usage?.completion_tokens || 0;
                
                if (tokenCount < 100 || 
                    (content.includes('## Birth Details') && !content.includes('## Birth Chart Overview')) || 
                    content.match(/Date: .{1,10}$/) || 
                    content.match(/Time: .{1,10}$/)) {
                  
                  console.log(`Response appears truncated (${tokenCount} tokens). Retrying with increased token limit.`);
                  maxTokens = Math.min(maxTokens * 2, 10000); // Double the token limit but cap at 10000
                  attempt++;
                  await this.delay(1000); // Wait a bit before retrying
                  continue;
                }
                
                // If we get here, the response is complete enough
                break;
              } catch (error) {
                console.error(`Error on attempt ${attempt + 1}:`, error);
                if (attempt >= maxAttempts - 1) throw error;
                attempt++;
                maxTokens = Math.min(maxTokens * 2, 10000); // Double the token limit but cap at 10000
                await this.delay(1000); // Wait a bit before retrying
              }
            }
            
            return response;
          },
          2, // Max 2 retries for the overall function
          1000, // Start with 1 second delay
          3 // Triple the delay each time
        );
        
        // Extract the insight from the response
        const fullInsight = comprehensiveInsight?.data?.choices?.[0]?.message?.content || "";
        
        // If we still got an empty or extremely short response after all retries, throw an error
        if (!fullInsight || fullInsight.length < 50) {
          throw new Error("Failed to generate a complete astrological reading after multiple attempts");
        }
        
        // Process the insight to ensure correct formatting for the UI components
        // Replace any bold headers with ## headers if needed
        const processedInsight = fullInsight
          .replace(/\*\*([^*]+)\*\*/g, '## $1')  // Replace **Header** with ## Header
          .replace(/^(Birth Details|Birth Chart Overview|Ascendant\/Lagna|Personality Overview|Career Insights|Relationship Patterns|Key Strengths|Potential Challenges|Significant Chart Features)$/gm, '## $1'); // Add ## to any headers without them
        
        // Create the response
        const response: ApiResponse = {
          success: true,
          data: {
            insight: processedInsight
          }
        };
        
        // Cache the response
        cache.set(cacheKey, response);
        
        return response;
        
      } catch (error: any) {
        console.error('Error with comprehensive request:', error);
        
        // Provide a simplified fallback with just the essential sections
        try {
          console.log('Attempting simplified fallback request');
          const fallbackPrompt = `Generate a brief astrological reading for ${birthData.name} born on ${birthData.date} at ${birthData.time} in ${birthData.place}.

Birth chart information: ${JSON.stringify(summarizedChartData)}

Include these sections:
Birth Details: Date, Time, Place, Name
Birth Chart Overview: Brief chart overview (2-3 sentences) - be sure to explicitly mention the Sun sign and Moon sign (e.g., "The Sun is in Gemini and the Moon is in Scorpio")
Personality Overview: Key personality traits (3-4 sentences)
Career Insights: 3 concise career points
Relationship Patterns: 3 concise relationship insights
Key Strengths: 5 primary strengths
Potential Challenges: 5 potential challenges
Significant Chart Features: 5 notable elements

Keep all points concise (10-15 words each) and use numbered format for lists (1., 2., 3.).`;

          // Try with progressive token increase for the fallback
          const fallbackInsight = await this.getAIInsight(
            fallbackPrompt, 
            "You are an expert Vedic astrologer providing concise readings. IMPORTANT INSTRUCTION: Always provide a complete response without truncation. Cover all requested sections thoroughly. Start with the most important information. Format each section with ## headers and numbered lists (1., 2., 3.) for clarity. Never end a response mid-sentence or before completing all requested sections.", 
            "comprehensive_fallback"
          );
          
          // Process the fallback insight to ensure proper formatting
          const processedFallbackInsight = fallbackInsight
            .replace(/\*\*([^*]+)\*\*/g, '## $1')  // Replace **Header** with ## Header
            .replace(/^(Birth Details|Birth Chart Overview|Ascendant\/Lagna|Personality Overview|Career Insights|Relationship Patterns|Key Strengths|Potential Challenges|Significant Chart Features)$/gm, '## $1'); // Add ## to any headers without them
          
          // Create the response
          const response: ApiResponse = {
            success: true,
            data: {
              insight: processedFallbackInsight
            }
          };
          
          // Cache the response
          cache.set(cacheKey, response);
          
          return response;
        } catch (fallbackError: any) {
          console.error('Fallback request also failed:', fallbackError);
          throw error; // Throw the original error
        }
      }
      
    } catch (error: any) {
      console.error('Error generating astrological insight:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to generate astrological insight.';
      
      if (error.error) {
        errorMessage = error.error;
      } else if (error.message) {
        if (error.message.includes('timeout')) {
          errorMessage = 'The request timed out. Please try again later.';
        } else if (error.message.includes('Network Error')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Preload birth chart data for faster access
   */
  async preloadBirthChartData(birthData: BirthData): Promise<void> {
    try {
      // Get geocoding data for the place
      const geocodeResponse = await this.client.get('/api/geocode', {
        params: { q: birthData.place }
      });
      
      if (!geocodeResponse.data || geocodeResponse.data.length === 0) {
        throw new Error('Location not found');
      }
      
      const location = geocodeResponse.data[0];
      const coordinates = `${location.lat},${location.lon}`;
      
      // Format date and time for API request
      let formattedDateTime;
      if (birthData.date.includes('/')) {
        // Convert from DD/MM/YYYY to YYYY-MM-DD format
        const [day, month, year] = birthData.date.split('/');
        
        // Convert time from 12-hour to 24-hour format if needed
        let formattedTime = convertTo24HourFormat(birthData.time);
        
        formattedDateTime = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${formattedTime}:00`;
      } else {
        // Already in YYYY-MM-DD format
        const [year, month, day] = birthData.date.split('-');
        
        // Convert time from 12-hour to 24-hour format if needed
        let formattedTime = convertTo24HourFormat(birthData.time);
        
        formattedDateTime = `${year}-${month}-${day} ${formattedTime}:00`;
      }
      
      console.log('Formatted datetime for API (preload):', formattedDateTime);
      
      // For chart API, directly use ISO 8601 format
      const isoDateTime = formattedDateTime.replace(' ', 'T') + '+05:30';
      
      // Preload various astrological data in parallel
      await Promise.all([
        // Get planet positions - most important for the chart details
        this.makeProkeralaRequest('planet-position', {
          datetime: formattedDateTime, // Standard format for this endpoint
          coordinates: coordinates,
          ayanamsa: 1
        }).catch(error => {
          console.error('Error fetching planet positions:', error);
          return null; // Allow other requests to continue if this one fails
        }),
        
        // Get birth chart 
        this.makeProkeralaRequest('chart', {
          datetime: isoDateTime, // ISO format for chart endpoint
          coordinates: coordinates,
          ayanamsa: 1,
          chart_type: "rasi", // Use a simple string instead of JSON object
          chart_style: 'north-indian'
        }).catch(error => {
          console.error('Error fetching chart:', error);
          return null;
        }),
        
        // Get kundli (used as fallback if planet positions fail)
        this.makeProkeralaRequest('kundli', {
          datetime: formattedDateTime, // Standard format for this endpoint
          coordinates: coordinates,
          ayanamsa: 1
        }).catch(error => {
          console.error('Error fetching kundli:', error);
          return null;
        })
      ]);
      
      console.log('Successfully preloaded birth chart data');
    } catch (error: any) {
      console.error('Error preloading birth chart data:', error);
      throw error;
    }
  }

  /**
   * Check the health of API endpoints
   * This can be called when the app initializes to verify if all API endpoints are working
   */
  async checkApiHealth(): Promise<{
    geocode: boolean;
    prokerala: boolean;
    ai: boolean;
    errors: string[];
  }> {
    const result = {
      geocode: false,
      prokerala: false,
      ai: false,
      errors: [] as string[]
    };
    
    // Check geocode API
    try {
      const response = await this.client.get('/api/geocode', {
        params: { q: 'New York' }
      });
      result.geocode = response.status === 200 && response.data && response.data.length > 0;
      if (!result.geocode) {
        result.errors.push('Geocode API response is invalid');
      }
    } catch (error: any) {
      result.errors.push(`Geocode API error: ${error.message}`);
    }
    
    // Check Prokerala token API
    try {
      await this.getProkeralaToken();
      result.prokerala = true;
    } catch (error: any) {
      result.errors.push(`Prokerala API error: ${error.message}`);
    }
    
    // Check AI API
    try {
      const response = await this.client.post('/api/together/chat', {
        model: "mistralai/Mixtral-8x7B-Instruct-v0.1", 
        messages: [
          { role: "system", content: "You are a helpful assistant. You respond with short, direct answers - ideally just a few words. Do NOT provide astrological readings." },
          { role: "user", content: "Please respond with just the word 'healthy' to confirm you're working properly." }
        ],
        temperature: 0.7,
        max_tokens: 10
      });
      result.ai = response.status === 200 && response.data?.choices?.[0]?.message?.content;
      if (!result.ai) {
        result.errors.push('AI API response is invalid');
      }
    } catch (error: any) {
      result.errors.push(`AI API error: ${error.message}`);
    }
    
    // Log health check results
    console.log('API Health Check:', result);
    
    return result;
  }
  
  /**
   * Get current deployment domain
   * This helps debugging API issues
   */
  getCurrentDeploymentDomain(): string {
    return window.location.origin;
  }
}

// Create and export a singleton instance
const api = new ApiService();
export default api; 