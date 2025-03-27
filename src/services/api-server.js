/**
 * API Server configuration
 * Use this to connect to your dedicated Express API server
 */

// Set the base URL for your API server
// In production, this will be served from the same domain via Vercel serverless functions
export const API_SERVER_URL = ''; // Use relative URLs in production

// API endpoints for different services
export const API_ENDPOINTS = {
  // OpenStreetMap geocoding
  GEOCODE: '/api/geocode',
  
  // Prokerala API endpoints
  PROKERALA_TOKEN: '/api/prokerala-token',
  PROKERALA_PLANET_POSITION: '/api/prokerala-planet-position',
  PROKERALA_KUNDLI: '/api/prokerala-kundli',
  PROKERALA_CHART: '/api/prokerala-chart',
  
  // Together AI endpoints
  TOGETHER_CHAT: '/api/together-chat',
  
  // Health check
  HEALTH: '/api/health'
};

/**
 * Get the full URL for an API endpoint
 * @param {string} endpoint - The API endpoint path
 * @returns {string} The full URL
 */
export const getApiUrl = (endpoint) => `${API_SERVER_URL}${endpoint}`;

// For local development, remove other proxy configurations
// Always use Vercel's built-in API routes
export const isLocalDevelopment = false;
export const LOCAL_API_SERVER_URL = '';

/**
 * Get the appropriate API server URL based on environment
 * Always returns empty string for relative URLs to use Vercel's API routes
 * @returns {string} The API server URL
 */
export const getApiServerUrl = () => {
  return API_SERVER_URL;
};

/**
 * Get the full URL for an API endpoint, respecting environment
 * @param {string} endpoint - The API endpoint path
 * @returns {string} The full URL
 */
export const getFullApiUrl = (endpoint) => `${getApiServerUrl()}${endpoint}`; 