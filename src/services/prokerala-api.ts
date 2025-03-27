import axios from 'axios';
import { BirthData } from '../types';

// Prokerala API credentials
const PROKERALA_CLIENT_ID = import.meta.env.VITE_PROKERALA_CLIENT_ID || '';
const PROKERALA_CLIENT_SECRET = import.meta.env.VITE_PROKERALA_CLIENT_SECRET || '';

// Always use the Vercel serverless API endpoints
const FORCE_API_PROXY = true;

// Use Vercel serverless functions via relative URLs
const API_SERVER_URL = '';  // Empty string for relative URLs within the same domain

// Logger utility to control logging based on environment
const logger = {
  debug: (message: string, ...args: any[]) => {
    if (import.meta.env.DEV) {
      console.debug(`[Astro-Debug] ${message}`, ...args);
    }
  },
  info: (message: string, ...args: any[]) => {
    if (import.meta.env.DEV) {
      console.info(`[Astro-Info] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[Astro-Warn] ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[Astro-Error] ${message}`, ...args);
  }
};

// Define types for Prokerala API responses
interface PlanetData {
  id: number;
  name: string;
  longitude: number;
  is_retrograde: boolean;
  position: number;
  degree: number;
  rasi: {
    id: number;
    name: string;
    lord: {
      id: number;
      name: string;
      vedic_name: string;
    }
  };
}

/**
 * Normalizes date format to YYYY-MM-DD regardless of input format
 * @param dateStr The date string in various possible formats (DD/MM/YYYY, MM/DD/YYYY, etc.)
 * @returns Normalized date string in YYYY-MM-DD format
 */
const normalizeDateFormat = (dateStr: string): string => {
  // Check if already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Handle DD/MM/YYYY format
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('/').map(Number);
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }
  
  // Handle MM/DD/YYYY format (US format)
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
    const parts = dateStr.split('/');
    // If first part is greater than 12, assume DD/MM/YYYY format
    if (parseInt(parts[0]) > 12) {
      const [day, month, year] = parts.map(Number);
      return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    } else {
      // Otherwise, assume MM/DD/YYYY format
      const [month, day, year] = parts.map(Number);
      return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }
  }
  
  // Handle DD-MM-YYYY format
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('-').map(Number);
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }
  
  // Try generic Date parsing as a fallback
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (error) {
    logger.error('Error parsing date:', error);
  }
  
  // If all else fails, return the original string and let the caller handle the error
  logger.error('Could not normalize date format:', dateStr);
  return dateStr;
};

/**
 * Normalizes time format to 24-hour format (HH:MM)
 * @param timeStr The time string in various possible formats
 * @returns Normalized time string in HH:MM format
 */
const normalizeTimeFormat = (timeStr: string): string => {
  // Check if already in HH:MM format
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  
  // Handle HH:MM AM/PM format
  if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(timeStr)) {
    const [timePart, ampm] = timeStr.split(/\s+/);
    let [hours, minutes] = timePart.split(':').map(Number);
    
    // Convert 12-hour format to 24-hour format
    if (ampm.toUpperCase() === 'PM' && hours < 12) {
      hours += 12;
    } else if (ampm.toUpperCase() === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  
  // Try to extract hours and minutes from various formats
  const timeMatch = timeStr.match(/(\d{1,2})[^\d]*(\d{2})/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    
    if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }
  
  // If all else fails, return the original string and let the caller handle the error
  logger.error('Could not normalize time format:', timeStr);
  return timeStr;
};

/**
 * Gets location coordinates from place name
 * @param place The place name
 * @returns Promise with latitude and longitude as a string for Prokerala API v2
 */
export const getCoordinates = async (place: string): Promise<string> => {
  try {
    // Call our backend geocoding endpoint
    const response = await axios({
      method: 'GET',
      url: '/api/geocode',
      params: {
        q: place
      }
    });
    
    if (response.data && response.data.lat && response.data.lon) {
      // Format as required by Prokerala API v2: "lat,lng"
      return `${response.data.lat},${response.data.lon}`;
    } else if (response.data && response.data.data && response.data.data.length > 0) {
      // Format from another possible response format
      const location = response.data.data[0];
      return `${location.lat},${location.lon}`;
    }
    
    throw new Error(`Location "${place}" not found in geocoding service`);
  } catch (error: any) {
    logger.error('Error getting coordinates:', error);
    if (error.response) {
      throw new Error(`Geocoding service error: ${error.response.status} - ${error.response.statusText}`);
    } else if (error.request) {
      throw new Error('Cannot connect to geocoding service. Please check your network connection.');
    }
    throw error;
  }
};

/**
 * Gets an OAuth token for Prokerala API
 * @returns Promise with the access token
 */
export const getProkeralaToken = async (): Promise<string> => {
  try {
    logger.debug('Requesting new OAuth token...');
    
    // Make the request to the proxy endpoint for token
    const response = await axios({
      method: 'POST',
      url: `${API_SERVER_URL}/api/proxy/token`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    if (response.data && response.data.access_token) {
      logger.debug('Successfully obtained OAuth token');
      return response.data.access_token;
    }
    
    throw new Error('Failed to get access token from response');
  } catch (error: any) {
    logger.error('Error getting Prokerala token:', error);
    
    // Enhanced error handling with more details
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      // Check for specific error types
      if (status === 401) {
        throw new Error(`Authentication failed: Please verify your Prokerala API credentials. ${data?.errors?.[0]?.detail || ''}`);
      } else if (status === 500) {
        throw new Error('Server error: The API server encountered an internal error');
      }
      
      throw new Error(`API error: ${status} - ${data?.errors?.[0]?.detail || error.response.statusText}`);
    } else if (error.request) {
      throw new Error('Cannot connect to authentication service. Please check your network connection or try again later.');
    }
    
    throw error;
  }
};

/**
 * Interface for the processed birth chart data
 */
export interface BirthChartData {
  sun: {
    sign: string;
    position: number;
  };
  moon: {
    sign: string;
    position: number;
  };
  ascendant: {
    sign: string;
    position: number;
  };
  planets: Array<{
    name: string;
    sign: string;
    position: number;
    isRetrograde: boolean;
    house?: number | null;
  }>;
  houses?: Array<{
    number: number;
    sign: string;
    lord: string;
    planets: string[];
  }>;
  chart?: any; // Add chart property to the interface
}

/**
 * Fetches mock birth chart data based on birth date
 * Used as a fallback when API calls fail
 */
export const getMockBirthChart = (birthData: BirthData): BirthChartData => {
  // Determine approximate sun sign based on date
  const date = new Date(birthData.date);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  let sunSign = "Unknown";
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) sunSign = "Mesha"; // Aries
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) sunSign = "Vrishabha"; // Taurus
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) sunSign = "Mithuna"; // Gemini
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) sunSign = "Karka"; // Cancer
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) sunSign = "Simha"; // Leo
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) sunSign = "Kanya"; // Virgo
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) sunSign = "Tula"; // Libra
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) sunSign = "Vrishchika"; // Scorpio
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) sunSign = "Dhanu"; // Sagittarius
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) sunSign = "Makara"; // Capricorn
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) sunSign = "Kumbha"; // Aquarius
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) sunSign = "Meena"; // Pisces
  
  // Use specific data for the 2000-06-15 birth chart if requested
  if (birthData.date === '2000-06-15' && 
      birthData.time === '10:15' && 
      birthData.place.toLowerCase().includes('morena')) {
    
    // Create houses based on Leo ascendant
    const houses = [
      { number: 1, sign: 'Simha', lord: 'Sun', planets: ['Ketu'] },
      { number: 2, sign: 'Kanya', lord: 'Mercury', planets: [] },
      { number: 3, sign: 'Tula', lord: 'Venus', planets: [] },
      { number: 4, sign: 'Vrischika', lord: 'Mars', planets: ['Moon'] },
      { number: 5, sign: 'Dhanu', lord: 'Jupiter', planets: [] },
      { number: 6, sign: 'Makara', lord: 'Saturn', planets: ['Ketu'] },
      { number: 7, sign: 'Kumbha', lord: 'Saturn', planets: [] },
      { number: 8, sign: 'Meena', lord: 'Jupiter', planets: [] },
      { number: 9, sign: 'Mesha', lord: 'Mars', planets: [] },
      { number: 10, sign: 'Vrishabha', lord: 'Venus', planets: ['Jupiter', 'Saturn'] },
      { number: 11, sign: 'Mithuna', lord: 'Mercury', planets: ['Sun', 'Mercury', 'Venus', 'Mars'] },
      { number: 12, sign: 'Karka', lord: 'Moon', planets: ['Rahu'] }
    ];
    
    return {
      sun: { sign: 'Mithuna', position: 3 },
      moon: { sign: 'Vrischika', position: 8 },
      ascendant: { sign: 'Simha', position: 5 },
      planets: [
        { name: 'Sun', sign: 'Mithuna', position: 3, isRetrograde: false, house: 11 },
        { name: 'Moon', sign: 'Vrischika', position: 8, isRetrograde: false, house: 4 },
        { name: 'Mercury', sign: 'Mithuna', position: 3, isRetrograde: false, house: 11 },
        { name: 'Venus', sign: 'Mithuna', position: 3, isRetrograde: false, house: 11 },
        { name: 'Mars', sign: 'Mithuna', position: 3, isRetrograde: false, house: 11 },
        { name: 'Jupiter', sign: 'Vrishabha', position: 2, isRetrograde: false, house: 10 },
        { name: 'Saturn', sign: 'Vrishabha', position: 2, isRetrograde: false, house: 10 },
        { name: 'Rahu', sign: 'Karka', position: 4, isRetrograde: true, house: 12 },
        { name: 'Ketu', sign: 'Makara', position: 10, isRetrograde: true, house: 6 }
      ],
      houses
    };
  }
  
  // Create generic mock data for other birth charts
  return {
    sun: {
      sign: sunSign,
      position: Math.random() * 30 // Random degree
    },
    moon: {
      sign: "Vrishabha", // Taurus
      position: Math.random() * 30
    },
    ascendant: {
      sign: "Simha", // Leo
      position: Math.random() * 30
    },
    planets: [
      {
        name: "Mercury",
        sign: "Mithuna", // Gemini
        position: Math.random() * 30,
        isRetrograde: false,
        house: 11
      },
      {
        name: "Venus",
        sign: "Karka", // Cancer
        position: Math.random() * 30,
        isRetrograde: false,
        house: 12
      },
      {
        name: "Mars",
        sign: "Mesha", // Aries
        position: Math.random() * 30,
        isRetrograde: false,
        house: 9
      },
      {
        name: "Jupiter",
        sign: "Dhanu", // Sagittarius
        position: Math.random() * 30,
        isRetrograde: false,
        house: 5
      },
      {
        name: "Saturn",
        sign: "Makara", // Capricorn
        position: Math.random() * 30,
        isRetrograde: false,
        house: 6
      },
      {
        name: "Rahu",
        sign: "Kumbha", // Aquarius
        position: Math.random() * 30,
        isRetrograde: true,
        house: 7
      },
      {
        name: "Ketu",
        sign: "Simha", // Leo
        position: Math.random() * 30,
        isRetrograde: true,
        house: 1
      }
    ]
  };
};

/**
 * Fetches accurate birth chart data from Prokerala API via our proxy
 * @param {Object} birthData The birth data with date, time, and place
 * @returns {Promise<Object>} Promise with the birth chart data
 */
export const getBirthChart = async (birthData: BirthData): Promise<BirthChartData> => {
  try {
    logger.debug('Getting birth chart for:', birthData);
      
      try {
        // Get coordinates for the birth place
        const coordinates = await getCoordinates(birthData.place);
        logger.debug('Coordinates:', coordinates);
        
        // Normalize and parse the birth date and time
        const normalizedDate = normalizeDateFormat(birthData.date);
        const normalizedTime = normalizeTimeFormat(birthData.time);
        logger.debug('Normalized date and time:', normalizedDate, normalizedTime);
        
      // Format datetime for API
      const formattedDateTime = `${normalizedDate}T${normalizedTime}:00+05:30`;
      logger.debug('Formatted datetime:', formattedDateTime);
      
      // Get OAuth token
      const token = await getProkeralaToken();
      
      // Get planet positions
        const planetResponse = await axios({
          method: 'GET',
        url: `${API_SERVER_URL}/api/proxy/planet-position`,
          headers: {
          'Authorization': `Bearer ${token}`
          },
          params: {
          datetime: formattedDateTime,
          coordinates,
          ayanamsa: 1
        }
      });
      
      // Get kundli data
        const kundliResponse = await axios({
          method: 'GET',
        url: `${API_SERVER_URL}/api/proxy/kundli`,
          headers: {
          'Authorization': `Bearer ${token}`
          },
          params: {
          datetime: formattedDateTime,
          coordinates,
          ayanamsa: 1
        }
      });
      
      // Get chart data
        const chartResponse = await axios({
          method: 'GET',
        url: `${API_SERVER_URL}/api/proxy/chart`,
          headers: {
          'Authorization': `Bearer ${token}`
          },
          params: {
          datetime: formattedDateTime,
          coordinates,
          ayanamsa: 1,
          chart_type: "rasi",
          chart_style: "north-indian"
          }
        }).catch(error => {
          logger.error('Error fetching chart data:', error);
          // Continue as we might still use planet positions
          return { data: null };
        });
        
        logger.debug('Received data from Prokerala API');
        
      // Process planet data
      const planets = planetResponse.data.data.planets.map((planet: PlanetData) => ({
                name: planet.name,
                sign: planet.rasi.name,
                position: planet.position,
        isRetrograde: planet.is_retrograde
      }));
      
      // Extract sun, moon, and ascendant data
      const sun = planets.find((p: {name: string}) => p.name === 'Sun') || { sign: 'Unknown', position: 0 };
      const moon = planets.find((p: {name: string}) => p.name === 'Moon') || { sign: 'Unknown', position: 0 };
      
      // Extract ascendant (lagna) data from kundli response
      const ascendant = {
        sign: kundliResponse.data.data.ascendant.rasi.name,
        position: kundliResponse.data.data.ascendant.position
      };
      
      // Return processed chart data
      return {
        sun,
        moon,
        ascendant,
        planets,
        chart: chartResponse.data?.data
      };
    } catch (error: any) {
      logger.error('Error processing birth chart:', error);
      throw error;
    }
  } catch (error: any) {
    logger.error('Failed to get birth chart:', error.message);
    throw error;
  }
}; 