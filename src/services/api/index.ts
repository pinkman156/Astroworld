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
  },
};

// Cache for API responses
const cache = new Map<string, any>();

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
      const response = await this.client.post('/api/prokerala-proxy/token', {});
      this.prokeralaToken = response.data.access_token;
      // Set expiry time with a 10-minute buffer
      this.tokenExpiry = now + (response.data.expires_in - 600) * 1000;
      return this.prokeralaToken as string;
    } catch (error) {
      console.error('Failed to get Prokerala token:', error);
      throw error;
    }
  }

  /**
   * Get astrological insight for the provided birth data
   */
  async getAstrologyInsight(birthData: BirthData): Promise<ApiResponse> {
    const cacheKey = `insight_${JSON.stringify(birthData)}`;
    
    // Check cache first
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }
    
    try {
      // Get geocoding data for the place
      console.log(`Attempting to geocode: ${birthData.place}`);
      let location;
      let coordinates;
      
      try {
        const geocodeResponse = await this.client.get('/api/geocode', {
          params: { q: birthData.place }
        });
        
        if (!geocodeResponse.data || geocodeResponse.data.length === 0) {
          console.warn(`Location not found: ${birthData.place}`);
          return {
            success: false,
            error: 'Location not found. Please enter a valid city or place.'
          };
        }
        
        location = geocodeResponse.data[0];
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
      const [year, month, day] = birthData.date.split('-');
      const formattedDateTime = `${year}-${month}-${day} ${birthData.time}:00`;
      
      // Get astrological data from Together AI
      const token = await this.getProkeralaToken();
      
      // Get the birth chart data
      const chartResponse = await this.client.get('/api/prokerala-proxy/chart', {
        params: {
          datetime: formattedDateTime,
          coordinates,
          ayanamsa: 1 // Lahiri ayanamsa
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
      const [year, month, day] = birthData.date.split('-');
      const formattedDateTime = `${year}-${month}-${day} ${birthData.time}:00`;
      
      // Get Prokerala token
      const token = await this.getProkeralaToken();
      
      // Preload various astrological data in parallel
      await Promise.all([
        // Get planet positions
        this.client.get('/api/prokerala-proxy/planet-position', {
          params: {
            datetime: formattedDateTime,
            coordinates: coordinates,
            ayanamsa: 1
          },
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }),
        
        // Get birth chart
        this.client.get('/api/prokerala-proxy/chart', {
          params: {
            datetime: formattedDateTime,
            coordinates: coordinates,
            ayanamsa: 1
          },
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }),
        
        // Get kundli
        this.client.get('/api/prokerala-proxy/kundli', {
          params: {
            datetime: formattedDateTime,
            coordinates: coordinates,
            ayanamsa: 1
          },
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      ]);
      
      console.log('Successfully preloaded birth chart data');
    } catch (error: any) {
      console.error('Error preloading birth chart data:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const api = new ApiService();
export default api; 