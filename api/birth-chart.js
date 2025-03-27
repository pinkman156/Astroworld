import axios from 'axios';

/**
 * API handler for birth chart calculations
 * This endpoint accepts POST requests with birth data and returns the calculated birth chart
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle OPTIONS requests for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST method for this endpoint
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'This endpoint only accepts POST requests',
      allowedMethods: ['POST']
    });
  }

  try {
    // Extract birth data from request body
    const { date, time, place, name } = req.body;
    
    // Validate required birth data
    if (!date || !time || !place) {
      return res.status(400).json({
        error: 'Missing parameters',
        message: 'Birth date, time, and place are required',
        required: ['date', 'time', 'place'],
        received: Object.keys(req.body)
      });
    }
    
    // Get client credentials from environment variables
    const clientId = process.env.VITE_PROKERALA_CLIENT_ID;
    const clientSecret = process.env.VITE_PROKERALA_CLIENT_SECRET;
    
    // Check if credentials are available
    if (!clientId || !clientSecret) {
      console.warn('API credentials missing, using mock data');
      
      // Send mock data
      return res.status(200).json({
        success: true,
        data: getMockBirthChart({ date, time, place, name }),
        source: 'mock'
      });
    }
    
    // Process the birth data
    try {
      // Get coordinates
      const coordinates = await getCoordinates(place);
      
      // Get OAuth token
      const token = await getProkeralaToken();
      
      // Normalize date and time
      const normalizedDate = normalizeDateFormat(date);
      const normalizedTime = normalizeTimeFormat(time);
      
      // Format datetime for API
      const formattedDateTime = `${normalizedDate}T${normalizedTime}:00+05:30`;
      
      // Make parallel requests to get all necessary data
      const [planetResponse, kundliResponse, chartResponse] = await Promise.all([
        // Get planet positions
        axios({
          method: 'GET',
          url: '/api/proxy/planet-position',
          headers: { 'Authorization': `Bearer ${token}` },
          params: {
            datetime: formattedDateTime,
            coordinates,
            ayanamsa: 1 // Lahiri Ayanamsa
          }
        }),
        
        // Get Kundli data
        axios({
          method: 'GET',
          url: '/api/proxy/kundli',
          headers: { 'Authorization': `Bearer ${token}` },
          params: {
            datetime: formattedDateTime,
            coordinates,
            ayanamsa: 1
          }
        }),
        
        // Get chart data
        axios({
          method: 'GET',
          url: '/api/proxy/chart',
          headers: { 'Authorization': `Bearer ${token}` },
          params: {
            datetime: formattedDateTime,
            coordinates,
            ayanamsa: 1,
            chart_type: "rasi",
            chart_style: "north-indian"
          }
        })
      ]).catch(error => {
        console.error('Prokerala API request error:', error);
        throw new Error(`Failed to fetch data from Prokerala API: ${error.message}`);
      });
      
      // Process the data to create a birth chart
      const birthChart = processProkeralaData(
        planetResponse.data, 
        kundliResponse.data, 
        chartResponse.data,
        { date, time, place, name }
      );
      
      // Return the birth chart data
      return res.status(200).json({
        success: true,
        data: birthChart,
        source: 'prokerala'
      });
      
    } catch (error) {
      console.error('Error processing birth chart:', error);
      
      // Fall back to mock data
      return res.status(200).json({
        success: true,
        data: getMockBirthChart({ date, time, place, name }),
        source: 'mock',
        fallbackReason: error.message
      });
    }
  } catch (error) {
    console.error('Error in birth chart API:', error);
    
    return res.status(500).json({
      error: 'Server Error',
      message: error.message
    });
  }
}

/**
 * Get coordinates from place name
 */
async function getCoordinates(place) {
  try {
    const response = await axios({
      method: 'GET',
      url: '/api/geocode',
      params: { q: place }
    });
    
    if (response.data && response.data.length > 0) {
      // Get the first result
      const location = response.data[0];
      
      // Format as required by Prokerala API v2: "lat,lng"
      return `${location.lat},${location.lon}`;
    }
    
    throw new Error('No location found for: ' + place);
  } catch (error) {
    console.error('Error getting coordinates:', error);
    throw new Error('Geocoding service error: ' + (error.message || error));
  }
}

/**
 * Gets an OAuth token for Prokerala API
 */
async function getProkeralaToken() {
  try {
    const response = await axios({
      method: 'POST',
      url: '/api/proxy/token'
    });
    
    if (response.data && response.data.access_token) {
      return response.data.access_token;
    }
    
    throw new Error('Failed to get access token from response');
  } catch (error) {
    console.error('Error getting Prokerala token:', error);
    throw error;
  }
}

/**
 * Process Prokerala API data to create a birth chart
 */
function processProkeralaData(planetData, kundliData, chartData, birthData) {
  // Extract planets and ascendant
  const planets = planetData?.data?.planet_position?.filter(p => p.name !== 'Ascendant') || [];
  const ascendantData = planetData?.data?.planet_position?.find(p => p.name === 'Ascendant');
  
  // Get ascendant sign and position
  let ascendantSign = ascendantData?.rasi?.name || 'Simha';
  const ascendantPosition = ascendantData?.position || 0;
  
  // Create the zodiac sign mapping
  const zodiacSigns = ['Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 
                       'Kanya', 'Tula', 'Vrischika', 'Dhanu', 'Makara', 
                       'Kumbha', 'Meena'];
  
  const zodiacLords = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 
                       'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 
                       'Saturn', 'Jupiter'];
  
  // Create houses based on ascendant
  const houses = [];
  const ascendantIndex = zodiacSigns.indexOf(ascendantSign);
  
  if (ascendantIndex !== -1) {
    for (let i = 0; i < 12; i++) {
      const houseNumber = i + 1;
      const signIndex = (ascendantIndex + i) % 12;
      const sign = zodiacSigns[signIndex];
      const lord = zodiacLords[signIndex];
      
      // Find planets in this house/sign
      const planetsInHouse = planets
        .filter(p => p.rasi.name === sign)
        .map(p => p.name);
      
      houses.push({
        number: houseNumber,
        sign: sign,
        lord: lord,
        planets: planetsInHouse
      });
    }
  }
  
  // Create the processed birth chart data
  return {
    sun: {
      sign: planets.find(p => p.name === 'Sun')?.rasi.name || 'Unknown',
      position: planets.find(p => p.name === 'Sun')?.position || 0
    },
    moon: {
      sign: planets.find(p => p.name === 'Moon')?.rasi.name || 'Unknown',
      position: planets.find(p => p.name === 'Moon')?.position || 0
    },
    ascendant: {
      sign: ascendantSign,
      position: ascendantPosition
    },
    planets: planets.map(planet => {
      // Find house number for this planet based on its sign
      let houseNumber = null;
      if (houses.length === 12) {
        const houseWithSign = houses.find(h => h.sign === planet.rasi.name);
        if (houseWithSign) {
          houseNumber = houseWithSign.number;
        }
      }
      
      return {
        name: planet.name,
        sign: planet.rasi.name,
        position: planet.position,
        isRetrograde: planet.is_retrograde,
        house: houseNumber
      };
    }),
    houses: houses.length > 0 ? houses : undefined
  };
}

/**
 * Normalizes date format to YYYY-MM-DD
 */
function normalizeDateFormat(dateStr) {
  try {
    // Check if already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Try to parse the date string
    const date = new Date(dateStr);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    
    // Format to YYYY-MM-DD
    return date.toISOString().split('T')[0];
  } catch (e) {
    console.warn('Date normalization failed:', e.message);
    return dateStr; // Return the original string if parsing fails
  }
}

/**
 * Normalizes time format to HH:MM
 */
function normalizeTimeFormat(timeStr) {
  try {
    // Check if already in HH:MM format
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
    console.warn('Time normalization failed:', e.message);
    return timeStr; // Return the original string if parsing fails
  }
}

/**
 * Returns mock birth chart data based on birth date
 */
function getMockBirthChart(birthData) {
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
}
