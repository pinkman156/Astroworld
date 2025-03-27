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
              timeout: 15000
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
   * Helper to make authenticated Prokerala API requests with retries
   */
  private async makeProkeralaRequest(endpoint: string, params: Record<string, any>, retryCount = 0): Promise<any> {
    const maxRetries = 1; // Only retry once
    
    try {
      // Get a fresh token
      const token = await this.getProkeralaToken();
      
      // IMPORTANT: Fix for double encoding issue
      // Do NOT manually encode spaces in datetime - let axios handle the encoding properly
      if (params.datetime) {
        // Make sure any manually encoded spaces are decoded first to prevent double-encoding
        params.datetime = decodeURIComponent(params.datetime);
        console.log('Decoded datetime for API request:', params.datetime);
      }
      
      // Make the API request
      const response = await this.client.get(`/api/prokerala-proxy/${endpoint}`, {
        params,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        paramsSerializer: {
          encode: (value) => {
            // Use simple encoding to avoid double encoding issues
            if (typeof value === 'string') {
              // Use encodeURIComponent but replace spaces with %20 instead of +
              return encodeURIComponent(value).replace(/%20/g, '%20');
            }
            return String(value);
          }
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
      
      // Get the birth chart data using our helper method
      const chartResponse = await this.makeProkeralaRequest('chart', {
        datetime: formattedDateTime,
        coordinates,
        ayanamsa: 1 // Lahiri ayanamsa
      });
      
      // Create the insight using Together AI
      const insightResponse = await this.client.post('/api/together/chat', {
        model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
        messages: [
          {
            role: "system",
            content: "You are an expert Vedic astrologer. Analyze the birth chart data and provide a comprehensive astrological reading."
          },
          {
            role: "user",
            content: `Generate an astrological reading for ${birthData.name} born on ${birthData.date} at ${birthData.time} in ${birthData.place}. Here is the birth chart data: ${JSON.stringify(chartResponse.data)}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });
      
      // Extract the insight from the response
      const insight = insightResponse.data.choices[0].message.content;
      
      // Create the response
      const response: ApiResponse = {
        success: true,
        data: {
          insight
        }
      };
      
      // Cache the response
      cache.set(cacheKey, response);
      
      return response;
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
      
      // Get Prokerala token
      const token = await this.getProkeralaToken();
      
      // Preload various astrological data in parallel
      await Promise.all([
        // Get planet positions
        this.makeProkeralaRequest('planet-position', {
          datetime: formattedDateTime,
          coordinates: coordinates,
          ayanamsa: 1
        }),
        
        // Get birth chart
        this.makeProkeralaRequest('chart', {
          datetime: formattedDateTime,
          coordinates: coordinates,
          ayanamsa: 1
        }),
        
        // Get kundli
        this.makeProkeralaRequest('kundli', {
          datetime: formattedDateTime,
          coordinates: coordinates,
          ayanamsa: 1
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
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Hello" }
        ],
        temperature: 0.7,
        max_tokens: 50
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