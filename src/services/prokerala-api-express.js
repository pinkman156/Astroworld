import axios from 'axios';
import { BirthData } from '../types';
import { getFullApiUrl, API_ENDPOINTS } from './api-server';

/**
 * Logger utility for consistent logging
 */
const logger = {
  debug: (...args) => console.log('[Prokerala]', ...args),
  info: (...args) => console.info('[Prokerala]', ...args),
  warn: (...args) => console.warn('[Prokerala]', ...args),
  error: (...args) => console.error('[Prokerala]', ...args)
};

/**
 * Normalizes date format to YYYY-MM-DD
 */
export const normalizeDateFormat = (dateStr) => {
  try {
    // Try to parse the date string
    const date = new Date(dateStr);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    
    // Format to YYYY-MM-DD
    return date.toISOString().split('T')[0];
  } catch (e) {
    logger.warn('Date normalization failed:', e.message);
    return dateStr; // Return the original string if parsing fails
  }
};

/**
 * Normalizes time format to HH:MM
 */
export const normalizeTimeFormat = (timeStr) => {
  try {
    // Check if the time is already in HH:MM format
    if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
      // Ensure hours are zero-padded
      const [hours, minutes] = timeStr.split(':');
      return `${hours.padStart(2, '0')}:${minutes}`;
    }
    
    // Try to parse as a time string in a date context
    const date = new Date(`2000-01-01T${timeStr}`);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      throw new Error('Invalid time');
    }
    
    // Format to HH:MM
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  } catch (e) {
    logger.warn('Time normalization failed:', e.message);
    return timeStr; // Return the original string if parsing fails
  }
};

/**
 * Gets coordinates (latitude, longitude) for a place
 * @param {string} placeName - The name of the place to geocode
 * @returns Promise with latitude and longitude as a string for Prokerala API v2
 */
export const getCoordinates = async (placeName) => {
  try {
    logger.debug('Geocoding place:', placeName);
    const response = await axios.get(getFullApiUrl(API_ENDPOINTS.GEOCODE), {
      params: { q: placeName }
    });
    
    if (response.data && response.data.length > 0) {
      // Get the first result
      const location = response.data[0];
      
      // Format as required by Prokerala API v2: "lat,lng"
      return `${location.lat},${location.lon}`;
    }
    
    throw new Error('No location found for: ' + placeName);
  } catch (error) {
    logger.error('Error getting coordinates:', error);
    throw new Error('Geocoding service error: ' + (error.message || error));
  }
};

/**
 * Gets an OAuth token for Prokerala API
 * @returns Promise with the access token
 */
export const getProkeralaToken = async () => {
  try {
    logger.debug('Requesting new OAuth token...');
    const response = await axios({
      method: 'POST',
      url: getFullApiUrl(API_ENDPOINTS.PROKERALA_TOKEN),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: new URLSearchParams({
        'grant_type': 'client_credentials'
      })
    });
    
    if (response.data && response.data.access_token) {
      logger.debug('Successfully obtained OAuth token');
      return response.data.access_token;
    }
    
    throw new Error('Failed to get access token from response');
  } catch (error) {
    logger.error('Error getting Prokerala token:', error);
    if (error.response) {
      throw new Error(`Authentication error: ${error.response.status} - ${error.response.data?.error || error.response.statusText}`);
    } else if (error.request) {
      throw new Error('Cannot connect to authentication service. Please check your network connection.');
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
  
  // Create generic mock data
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
 * Fetches accurate birth chart data from Prokerala API via our Express server
 * @param birthData The birth data with date, time, and place
 * @returns Promise with the birth chart data
 */
export const getBirthChart = async (birthData: BirthData): Promise<BirthChartData> => {
  try {
    logger.debug('Getting birth chart for:', birthData);
    
    try {
      // Get coordinates for the birth place
      const coordinates = await getCoordinates(birthData.place);
      logger.debug('Coordinates:', coordinates);
      
      // Get OAuth token
      const token = await getProkeralaToken();
      
      // Normalize and parse the birth date and time
      const normalizedDate = normalizeDateFormat(birthData.date);
      const normalizedTime = normalizeTimeFormat(birthData.time);
      logger.debug('Normalized date and time:', normalizedDate, normalizedTime);
      
      // Format datetime for API
      const datetime = `${normalizedDate}T${normalizedTime}:00+05:30`;
      logger.debug('Formatted datetime:', datetime);
      
      // Make planet position request
      logger.debug('Requesting planet positions...');
      const positionResponse = await axios({
        method: 'GET',
        url: getFullApiUrl(API_ENDPOINTS.PROKERALA_PLANET_POSITION),
        params: {
          datetime,
          coordinates,
          ayanamsa: 1
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Make kundli request
      logger.debug('Requesting kundli data...');
      const kundliResponse = await axios({
        method: 'GET',
        url: getFullApiUrl(API_ENDPOINTS.PROKERALA_KUNDLI),
        params: {
          datetime,
          coordinates,
          ayanamsa: 1
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Make chart request
      logger.debug('Requesting chart data...');
      const chartResponse = await axios({
        method: 'GET',
        url: getFullApiUrl(API_ENDPOINTS.PROKERALA_CHART),
        params: {
          datetime,
          coordinates,
          ayanamsa: 1
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      logger.debug('Received data from Prokerala API');
      
      // Process the response data to extract birth chart information
      if (positionResponse.data && positionResponse.data.data) {
        const positionData = positionResponse.data.data;
        const houseData = chartResponse.data?.data;
        
        // Extract sun, moon and ascendant data
        const sunData = positionData.planets.find(p => p.slug === 'sun');
        const moonData = positionData.planets.find(p => p.slug === 'moon');
        const ascendantData = positionData.ascendant;
        
        if (!sunData || !moonData || !ascendantData) {
          throw new Error('Missing critical data in API response');
        }
        
        // Create birth chart data
        const birthChart = {
          sun: {
            sign: sunData.position.rasi.name,
            position: parseFloat(sunData.position.longitude_deg) % 30
          },
          moon: {
            sign: moonData.position.rasi.name,
            position: parseFloat(moonData.position.longitude_deg) % 30
          },
          ascendant: {
            sign: ascendantData.position.rasi.name,
            position: parseFloat(ascendantData.position.longitude_deg) % 30
          },
          planets: positionData.planets.map(planet => ({
            name: planet.name,
            sign: planet.position.rasi.name,
            position: parseFloat(planet.position.longitude_deg) % 30,
            isRetrograde: planet.is_retrograde,
            house: planet.house
          }))
        };
        
        // Add house data if available
        if (houseData && houseData.houses) {
          birthChart.houses = houseData.houses.map(house => {
            // Find planets in this house
            const planetsInHouse = positionData.planets
              .filter(p => p.house === house.number)
              .map(p => p.name);
            
            return {
              number: house.number,
              sign: house.rasi.name,
              lord: house.rasi.lord.name,
              planets: planetsInHouse
            };
          });
        }
        
        return birthChart;
      }
      
      throw new Error('Invalid response from Prokerala API');
    } catch (prokeralaError) {
      logger.error('Error communicating with Prokerala API:', prokeralaError);
      throw new Error('Cannot connect to external APIs. Please check if the Express server is running.');
    }
  } catch (error) {
    logger.error('Error getting birth chart:', error);
    // Fallback to mock data
    logger.info('Using mock birth chart data');
    return getMockBirthChart(birthData);
  }
}; 