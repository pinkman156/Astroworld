import axios from 'axios';
import { BirthData, ApiResponse, VedicChart, Planet, House, Yoga, Dosha, DashaPeriod } from '../types';
import { getBirthChart } from './prokerala-api';
import { mockVedicData } from '../data/mockVedicData';

// Updated to use Together AI API
const TOGETHER_API_URL = 'https://api.together.xyz/v1/chat/completions';
// Get API key from environment variables using Vite's format
const API_KEY = import.meta.env.VITE_TOGETHER_API_KEY;

// Cache for API responses to minimize redundant calls
const apiCache = {
  birthChartData: null as any,
  vedicChartData: null as VedicChart | null,
  insightMessages: new Map<string, string>(),
  
  // Method to create a cache key from birth data
  createCacheKey(birthData: BirthData): string {
    return `${birthData.date}_${birthData.time}_${birthData.place}`;
  },
  
  // Method to clear cache (useful for testing or when changing birth details)
  clearCache(): void {
    this.birthChartData = null;
    this.vedicChartData = null;
    this.insightMessages.clear();
    console.log('API cache cleared');
  }
};

/**
 * Fetches astrological insights based on birth data
 * @param birthData The birth data with date, time (in IST), and place
 * @returns Promise with the astrological insights response
 */
export const getAstrologyInsight = async (birthData: BirthData): Promise<ApiResponse> => {
  try {
    // Check cache first
    const cacheKey = apiCache.createCacheKey(birthData);
    if (apiCache.insightMessages.has(cacheKey)) {
      console.log('Using cached insight message');
      return {
        success: true,
        data: {
          insight: apiCache.insightMessages.get(cacheKey) || ''
        }
      };
    }
    
    let birthChartData;
    let prompt;
    
    // Try to get accurate birth chart from Prokerala
    try {
      // Check if we have cached birth chart data for this birth data
      if (apiCache.birthChartData && 
          apiCache.birthChartData.date === birthData.date && 
          apiCache.birthChartData.time === birthData.time && 
          apiCache.birthChartData.place === birthData.place) {
        console.log('Using cached birth chart data');
        birthChartData = apiCache.birthChartData.data;
      } else {
        console.log('Fetching new birth chart data from Prokerala');
        birthChartData = await getBirthChart(birthData);
        // Cache the birth chart data
        apiCache.birthChartData = {
          date: birthData.date,
          time: birthData.time,
          place: birthData.place,
          data: birthChartData
        };
        console.log('Birth chart data cached');
      }
      
      console.log('Successfully generated birth chart data');
      
      console.log('%c === ASTROLOGY INSIGHT PROMPT ===', 'color: green; font-weight: bold; font-size: 14px;');
      
      // Create prompt with accurate birth chart data
      prompt = `Generate a concise Vedic astrological reading for ${birthData.name} born on ${birthData.date} at ${birthData.time} Indian Standard Time (IST) in ${birthData.place}. 
      
Here is the accurate birth chart data:
- Sun sign: ${birthChartData.sun.sign}
- Moon sign: ${birthChartData.moon.sign}
- Ascendant (Rising sign/Lagna): ${birthChartData.ascendant.sign}

Planetary positions:
${JSON.stringify(birthChartData.planets, null, 2)}

${birthChartData.houses ? `House information (House 1 is the Ascendant - ${birthChartData.ascendant.sign}):
${JSON.stringify(birthChartData.houses, null, 2)}` : ''}

Note: The "position" values in the planetary positions represent the zodiacal position within the sign (1-30 degrees).

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:

## Birth Data
- Name: ${birthData.name}
- Birth Date: ${birthData.date}
- Birth Time: ${birthData.time}
- Birth Place: ${birthData.place}
- Sun Sign: ${birthChartData.sun.sign}
- Moon Sign: ${birthChartData.moon.sign}

## Defining Word
[ONE SINGLE positive Gen Z word/slang that best defines this person's core essence based on their birth chart. Choose something trendy, vibey, and empowering that captures their unique cosmic gift. Examples might be: Main Character, Understood the Assignment, Iconic, Slaying, Unproblematic, Vibe Check Passed, Based, Elite, GOAT, etc. Make it current and relevant to Gen Z culture while still being empowering.]

## Ascendant/Lagna
[A detailed 30-40 word description of the Ascendant sign (${birthChartData.ascendant.sign}) and its specific influence on the person's appearance, approach to life, and how others perceive them]

## Personality Overview
[A concise 20-30 word description of the core personality traits based on Sun, Moon and Ascendant]

## Key Strengths
IMPORTANT: Do NOT use dashes, asterisks, or dots (.), or markdown formatting in this section. Present each strength as a simple numbered point with the main trait followed by its astrological reasoning. Do NOT start sentences with periods, dashes, or any other punctuation. Begin each point with a short 2-4 word summary in double quotes, followed by an explanation.

1. "Key strength summary" Write a brief explanation of planetary placements supporting this strength 
2. "Another strength summary" Write a brief explanation of planetary placements supporting this strength
3. "Third strength summary" Write a brief explanation of planetary placements supporting this strength
4. "Fourth strength summary" Write a brief explanation of planetary placements supporting this strength

## Potential Challenges
IMPORTANT: Do NOT use dashes, asterisks, or markdown formatting in this section. Present each challenge as a simple numbered point with the main challenge followed by its astrological reasoning. Do NOT start sentences with periods, dashes, or any other punctuation. Begin each point with a short 2-4 word summary in double quotes, followed by an explanation.

1. "Challenge summary" Write a brief explanation of planetary placements supporting this challenge
2. "Another challenge summary" Write a brief explanation of planetary placements supporting this challenge
3. "Third challenge summary" Write a brief explanation of planetary placements supporting this challenge
4. "Fourth challenge summary" Write a brief explanation of planetary placements supporting this challenge

## Significant Chart Features
IMPORTANT: Do NOT use dashes, asterisks, or markdown formatting in this section. Present each feature as a simple numbered point with the main feature followed by its astrological significance. Do NOT start sentences with periods, dashes, or any other punctuation. Begin each point with a short 2-4 word summary in double quotes, followed by an explanation.

1. "Feature summary" Write a brief explanation of its significance in the chart
2. "Another feature summary" Write a brief explanation of its significance in the chart
3. "Third feature summary" Write a brief explanation of its significance in the chart
4. "Fourth feature summary" Write a brief explanation of its significance in the chart

## Career Insights
IMPORTANT: Do NOT use dashes, asterisks, or markdown formatting in this section. Present each insight as a simple numbered point. Do NOT start sentences with periods, dashes, or any other punctuation. Begin each point with a short 2-4 word summary of the insight in double quotes, followed by an explanation.

1. "First career insight" Write specific details about career path based on the chart
2. "Second career insight" Write specific details about talents based on the chart
3. "Third career insight" Write specific details about professional timing based on the chart

## Relationship Patterns
IMPORTANT: Do NOT use dashes, asterisks, or markdown formatting in this section. Present each pattern as a simple numbered point. Do NOT start sentences with periods, dashes, or any other punctuation. Begin each point with a short 2-4 word summary of the pattern in double quotes, followed by an explanation.

1. "First relationship pattern" Write specific details about this relationship pattern
2. "Second relationship pattern" Write specific details about this relationship pattern
3. "Third relationship pattern" Write specific details about this relationship pattern

You must follow this format exactly, keeping descriptions concise and direct.`;
      
      console.log(prompt);
      console.log('%c === END OF ASTROLOGY INSIGHT PROMPT ===', 'color: green; font-weight: bold; font-size: 14px;');
    } catch (error) {
      // If birth chart fetch fails, use a more generic prompt
      console.log('Could not fetch birth chart data, using generic prompt', error);
      
      prompt = `Generate a concise Vedic astrological reading for a person born on ${birthData.date} at ${birthData.time} Indian Standard Time (IST) in ${birthData.place}. 
      
FORMAT YOUR RESPONSE EXACTLY LIKE THIS:

## Birth Data
- Name: ${birthData.name}
- Birth Date: ${birthData.date}
- Birth Time: ${birthData.time} IST
- Birth Place: ${birthData.place}
- Sun Sign: ${getApproximateSunSign(birthData.date)}
- Moon Sign: [Determine based on birth time and date]

## Defining Word
[ONE SINGLE positive cool edgy genz positive word that best defines this person's core essence based on their birth chart. Choose a word that feels empowering and captures their unique cosmic gift and shud be edgy and cool but positive and empowering. example might be - demure or any other viral genz words or memes, but positive and empowering]

## Ascendant/Lagna
[A concise 20-30 word description of the Ascendant sign and its influence]

## Personality Overview
[A concise 20-30 word description of the core personality traits based on Sun, Moon and Ascendant]

## Key Strengths
IMPORTANT: Do NOT use dashes, asterisks, or dots (.), or markdown formatting in this section. Present each strength as a simple numbered point with the main trait followed by its astrological reasoning.

1. [First key strength - write the trait name, then a brief explanation of planetary placements] 
2. [Second key strength - write the trait name, then a brief explanation of planetary placements]
3. [Third key strength - write the trait name, then a brief explanation of planetary placements]
4. [Fourth key strength - write the trait name, then a brief explanation of planetary placements]

## Potential Challenges
IMPORTANT: Do NOT use dashes, asterisks, or dots (.), or markdown formatting in this section. Present each challenge as a simple numbered point with the main challenge followed by its astrological reasoning.

1. [First challenge - write the challenge name, then a brief explanation of planetary placements]
2. [Second challenge - write the challenge name, then a brief explanation of planetary placements]
3. [Third challenge - write the challenge name, then a brief explanation of planetary placements]
4. [Fourth challenge - write the challenge name, then a brief explanation of planetary placements]

## Significant Chart Features
IMPORTANT: Do NOT use dashes, asterisks, or dots (.), or markdown formatting in this section. Present each feature as a simple numbered point with the main feature followed by its astrological significance.

1. [First feature - write the feature name, then a brief explanation of its significance]
2. [Second feature - write the feature name, then a brief explanation of its significance]
3. [Third feature - write the feature name, then a brief explanation of its significance]
4. [Fourth feature - write the feature name, then a brief explanation of its significance]

## Career Insights
IMPORTANT: Do NOT use dashes, asterisks, or dots (.), or markdown formatting in this section. Present each insight as a simple numbered point. Do NOT start sentences with periods, dashes, or any other punctuation. Begin each point with a short 2-4 word summary of the insight in double quotes, followed by an explanation.

1. "First career insight" Write specific details about career path based on the chart
2. "Second career insight" Write specific details about talents based on the chart
3. "Third career insight" Write specific details about professional timing based on the chart

## Relationship Patterns
IMPORTANT: Do NOT use dashes, asterisks, or dots (.), or markdown formatting in this section. Present each pattern as a simple numbered point. Do NOT start sentences with periods, dashes, or any other punctuation. Begin each point with a short 2-4 word summary of the pattern in double quotes, followed by an explanation.

1. "First relationship pattern" Write specific details about this relationship pattern
2. "Second relationship pattern" Write specific details about this relationship pattern
3. "Third relationship pattern" Write specific details about this relationship pattern

You must follow this format exactly, keeping descriptions concise and direct. Make sure to provide ACCURATE information based on Vedic astrology calculations. For someone born on ${birthData.date}, their Sun sign is likely to be ${getApproximateSunSign(birthData.date)}.`;
    }

    console.log('Sending request to Together AI API...');
    
    try {
      // Use the CORS proxy to avoid CORS issues
      const proxyUrl = 'http://localhost:8080/';
      
      // Make request using the Together AI API format
      const response = await axios({
        method: 'POST',
        url: `${proxyUrl}${TOGETHER_API_URL}`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        data: {
          model: "meta-llama/Llama-3-70b-chat-hf",  // Using Llama 3 70B model
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 1500,
          temperature: 0.7
        }
      });

      console.log('Response received:', response.status);
      
      // Extract the generated text from the response
      const insight = response.data.choices[0].message.content;
      
      console.log('%c === TOGETHER AI RESPONSE ===', 'color: green; font-weight: bold; font-size: 14px;');
      console.log(insight);
      console.log('%c === END OF TOGETHER AI RESPONSE ===', 'color: green; font-weight: bold; font-size: 14px;');
      
      // Cache the insight message
      apiCache.insightMessages.set(cacheKey, insight);
      
      return {
        success: true,
        data: {
          insight
        }
      };
    } catch (error) {
      console.error('Together AI API request failed. Using mock data.', error);
      return getMockAstrologyData(birthData);
    }
  } catch (error) {
    console.error('Error fetching astrology insight:', error);
    // If API call fails, return mock data
    return getMockAstrologyData(birthData);
  }
};

/**
 * Fetches complete Vedic astrological chart data using Together AI
 * @param birthData The birth data with date, time (in IST), and place
 * @returns Promise with the complete Vedic chart data
 */
export const getVedicChartData = async (birthData: BirthData): Promise<VedicChart> => {
  try {
    console.log('Generating Vedic chart data for:', birthData);
    
    // Check cache first for this specific birth data
    const cacheKey = apiCache.createCacheKey(birthData);
    if (apiCache.vedicChartData) {
      console.log('Using cached Vedic chart data');
      return apiCache.vedicChartData;
    }
    
    let birthChartData;
    
    // Try to get accurate birth chart from Prokerala first
    try {
      // Check if we already have cached birth chart data
      if (apiCache.birthChartData && 
          apiCache.birthChartData.date === birthData.date && 
          apiCache.birthChartData.time === birthData.time && 
          apiCache.birthChartData.place === birthData.place) {
        console.log('Using cached birth chart data for Vedic analysis');
        birthChartData = apiCache.birthChartData.data;
      } else {
        console.log('Fetching new birth chart data from Prokerala for Vedic analysis');
        birthChartData = await getBirthChart(birthData);
        // Cache the birth chart data
        apiCache.birthChartData = {
          date: birthData.date,
          time: birthData.time,
          place: birthData.place,
          data: birthChartData
        };
        console.log('Birth chart data cached');
      }
      
      // Now use Together AI to generate the full Vedic chart data
      // Making a single consolidated request to minimize API calls
      try {
        console.log('Making consolidated Together AI request for Vedic chart data');
        
        const vedicChartData = await getConsolidatedVedicChart(birthData, birthChartData);
        
        // Cache the Vedic chart data
        apiCache.vedicChartData = vedicChartData;
        console.log('Vedic chart data cached');
        
        return vedicChartData;
      } catch (error) {
        console.error('Error generating consolidated Vedic chart with Together AI:', error);
        
        // Try individual component requests as fallback
        console.log('Falling back to individual component requests');
        
        // Generate birth chart (planets and houses)
        const birthChart = await getVedicBirthChart(birthData, birthChartData);
        
        // Generate dasha periods
        const dashas = await getVedicDashas(birthData, birthChartData);
        
        // Generate yogas and doshas
        const yogasDoshas = await getVedicYogasDoshas(birthData, birthChartData);
        
        // Combine all the data into a complete Vedic chart
        const vedicChartData = {
          birthChart: birthChart,
          dashas: dashas,
          yogas: yogasDoshas.yogas,
          doshas: yogasDoshas.doshas
        };
        
        // Cache the Vedic chart data
        apiCache.vedicChartData = vedicChartData;
        console.log('Vedic chart data cached from individual requests');
        
        return vedicChartData;
      }
    } catch (error) {
      console.error('Could not fetch birth chart data from Prokerala, using fallback', error);
      
      // If we previously cached Vedic data, use that first
      if (apiCache.vedicChartData) {
        console.log('Using previously cached Vedic chart data as fallback');
        return apiCache.vedicChartData;
      }
      
      // If no cached data, use mock data
      console.log('No cached data available, using mock data');
      return mockVedicData;
    }
  } catch (error) {
    console.error('Error in getVedicChartData:', error);
    
    // If we previously cached Vedic data, use that first
    if (apiCache.vedicChartData) {
      console.log('Using previously cached Vedic chart data after error');
      return apiCache.vedicChartData;
    }
    
    // Fallback to mock data if anything fails
    console.log('No cached data available after error, using mock data');
    return mockVedicData;
  }
};

/**
 * Makes a single consolidated request to Together AI for all Vedic chart data
 * (More efficient than making 3 separate requests)
 */
const getConsolidatedVedicChart = async (birthData: BirthData, birthChartData: any): Promise<VedicChart> => {
  try {
    console.log('Generating consolidated Vedic chart data with Together AI');
    
    // Create a comprehensive prompt for all Vedic data
    const prompt = `Generate a complete Vedic astrological chart analysis for a person born on ${birthData.date} at ${birthData.time} Indian Standard Time (IST) in ${birthData.place}.

Here is their basic birth chart data from accurate calculations:
- Sun sign: ${birthChartData.sun.sign}
- Moon sign: ${birthChartData.moon.sign}
- Ascendant (Rising sign/Lagna): ${birthChartData.ascendant.sign}

Planetary positions:
${JSON.stringify(birthChartData.planets, null, 2)}

${birthChartData.houses ? `House information (House 1 is the Ascendant - ${birthChartData.ascendant.sign}):
${JSON.stringify(birthChartData.houses, null, 2)}` : ''}

Please provide a COMPLETE Vedic chart analysis covering all of the following:

1. Birth Chart (ascendant, planets, houses)
2. Dasha System (planetary periods)
3. Yogas (auspicious combinations)
4. Doshas (challenging combinations)

FORMAT YOUR RESPONSE AS VALID JSON with this structure:
{
  "birthChart": {
    "ascendant": [number 1-12],
    "planets": [
      {
        "id": [string id like "sun", "moon", etc.],
        "name": [planet name],
        "sign": [number 1-12],
        "house": [number 1-12],
        "degree": [degree within sign],
        "nakshatra": [nakshatra name],
        "isRetrograde": [boolean],
        "color": [color hex code]
      },
      ...more planets
    ],
    "houses": [
      {
        "number": [house number 1-12],
        "sign": [sign number 1-12],
        "signName": [sign name],
        "lord": [ruling planet name],
        "planets": [array of planet names],
        "strength": ["weak" | "moderate" | "strong"],
        "aspects": [array of aspect descriptions]
      },
      ...more houses
    ]
  },
  "dashas": {
    "currentMahadasha": {
      "planet": [planet name],
      "startDate": [date string YYYY-MM-DD],
      "endDate": [date string YYYY-MM-DD]
    },
    "currentAntardasha": {
      "planet": [planet name],
      "startDate": [date string YYYY-MM-DD],
      "endDate": [date string YYYY-MM-DD]
    },
    "sequence": [
      {
        "planet": [planet name],
        "startDate": [date string YYYY-MM-DD],
        "endDate": [date string YYYY-MM-DD]
      },
      ...more periods
    ]
  },
  "yogas": [
    {
      "name": [yoga name],
      "strength": ["weak" | "moderate" | "strong" | "very strong"],
      "description": [brief description],
      "planets": [array of planet names involved],
      "houses": [array of house numbers involved]
    },
    ...more yogas
  ],
  "doshas": [
    {
      "name": [dosha name],
      "severity": ["mild" | "moderate" | "severe"],
      "description": [brief description],
      "remedies": [array of remedy suggestions],
      "affectedAreas": [array of life areas affected]
    },
    ...more doshas
  ]
}

Provide accurate information based on Vedic astrology principles.`;

    // Use the CORS proxy to avoid CORS issues
    const proxyUrl = 'http://localhost:8080/';
    
    // Make request using the Together AI API format
    const response = await axios({
      method: 'POST',
      url: `${proxyUrl}${TOGETHER_API_URL}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      data: {
        model: "meta-llama/Llama-3-70b-chat-hf",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 4000, // Increased token limit for comprehensive response
        temperature: 0.2
      }
    });

    console.log('Consolidated Vedic chart response received');
    
    // Extract and parse the JSON response
    const responseText = response.data.choices[0].message.content;
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                     responseText.match(/```\n([\s\S]*?)\n```/) || 
                     responseText.match(/{[\s\S]*?}/);
                     
    let parsedData;
    if (jsonMatch) {
      parsedData = JSON.parse(jsonMatch[0].replace(/```json\n|```\n|```/g, ''));
    } else {
      parsedData = JSON.parse(responseText);
    }
    
    return parsedData;
  } catch (error) {
    console.error('Error getting consolidated Vedic chart from Together AI:', error);
    throw error; // Let the caller handle this error and try individual requests
  }
};

/**
 * Gets birth chart (ascendant, planets, houses) data from Together AI
 */
const getVedicBirthChart = async (birthData: BirthData, birthChartData: any): Promise<{
  ascendant: number;
  planets: Planet[];
  houses: House[];
}> => {
  try {
    console.log('Generating Vedic birth chart data with Together AI');
    
    // Create prompt for birth chart data
    const prompt = `Generate a Vedic astrological birth chart for a person born on ${birthData.date} at ${birthData.time} Indian Standard Time (IST) in ${birthData.place}.

Here is their basic birth chart data from accurate calculations:
- Sun sign: ${birthChartData.sun.sign}
- Moon sign: ${birthChartData.moon.sign}
- Ascendant (Rising sign/Lagna): ${birthChartData.ascendant.sign}

Planetary positions:
${JSON.stringify(birthChartData.planets, null, 2)}

${birthChartData.houses ? `House information (House 1 is the Ascendant - ${birthChartData.ascendant.sign}):
${JSON.stringify(birthChartData.houses, null, 2)}` : ''}

Based on this information, provide:
1. The ascendant number (1-12 representing Aries to Pisces)
2. A detailed list of planets with their positions
3. A list of all 12 houses with their signs, lords, and planets

FORMAT YOUR RESPONSE AS VALID JSON with this structure:
{
  "ascendant": [number 1-12],
  "planets": [
    {
      "id": [string id like "sun", "moon", etc.],
      "name": [planet name],
      "sign": [number 1-12],
      "house": [number 1-12],
      "degree": [degree within sign],
      "nakshatra": [nakshatra name],
      "isRetrograde": [boolean],
      "color": [color hex code]
    },
    ...more planets
  ],
  "houses": [
    {
      "number": [house number 1-12],
      "sign": [sign number 1-12],
      "signName": [sign name],
      "lord": [ruling planet name],
      "planets": [array of planet names],
      "strength": ["weak" | "moderate" | "strong"],
      "aspects": [array of aspect descriptions]
    },
    ...more houses
  ]
}

Provide accurate information based on Vedic astrology principles. Include all planets (Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Rahu, Ketu).`;

    // Use the CORS proxy to avoid CORS issues
    const proxyUrl = 'http://localhost:8080/';
    
    // Make request using the Together AI API format
    const response = await axios({
      method: 'POST',
      url: `${proxyUrl}${TOGETHER_API_URL}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      data: {
        model: "meta-llama/Llama-3-70b-chat-hf",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.2
      }
    });

    console.log('Birth chart response received');
    
    // Extract and parse the JSON response
    const responseText = response.data.choices[0].message.content;
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                     responseText.match(/```\n([\s\S]*?)\n```/) || 
                     responseText.match(/{[\s\S]*?}/);
                     
    let parsedData;
    if (jsonMatch) {
      parsedData = JSON.parse(jsonMatch[0].replace(/```json\n|```\n|```/g, ''));
    } else {
      parsedData = JSON.parse(responseText);
    }
    
    return {
      ascendant: parsedData.ascendant,
      planets: parsedData.planets,
      houses: parsedData.houses
    };
  } catch (error) {
    console.error('Error getting birth chart from Together AI:', error);
    // Return mock data as fallback
    return {
      ascendant: mockVedicData.birthChart.ascendant,
      planets: mockVedicData.birthChart.planets,
      houses: mockVedicData.birthChart.houses
    };
  }
};

/**
 * Gets dasha periods data from Together AI
 */
const getVedicDashas = async (birthData: BirthData, birthChartData: any): Promise<{
  currentMahadasha: DashaPeriod;
  currentAntardasha: DashaPeriod;
  sequence: DashaPeriod[];
}> => {
  try {
    console.log('Generating Vedic dasha periods with Together AI');
    
    // Create prompt for dasha periods
    const prompt = `Generate Vimshottari Dasha (planetary periods) information for a person born on ${birthData.date} at ${birthData.time} Indian Standard Time (IST) in ${birthData.place}.

Here is their basic birth chart data from accurate calculations:
- Moon sign: ${birthChartData.moon.sign}
- Moon nakshatra: ${birthChartData.planets.find((p: { name: string }) => p.name === 'Moon')?.nakshatra || 'Unknown'}

Based on this information, provide:
1. Current Mahadasha (main period) with start and end dates
2. Current Antardasha (sub-period) with start and end dates
3. A sequence of Mahadashas for the next 50 years

FORMAT YOUR RESPONSE AS VALID JSON with this structure:
{
  "currentMahadasha": {
    "planet": [planet name],
    "startDate": [date string YYYY-MM-DD],
    "endDate": [date string YYYY-MM-DD]
  },
  "currentAntardasha": {
    "planet": [planet name],
    "startDate": [date string YYYY-MM-DD],
    "endDate": [date string YYYY-MM-DD]
  },
  "sequence": [
    {
      "planet": [planet name],
      "startDate": [date string YYYY-MM-DD],
      "endDate": [date string YYYY-MM-DD]
    },
    ...more periods
  ]
}

Calculate the dashas according to Vedic astrological principles based on the Moon's nakshatra position.`;

    // Use the CORS proxy to avoid CORS issues
    const proxyUrl = 'http://localhost:8080/';
    
    // Make request using the Together AI API format
    const response = await axios({
      method: 'POST',
      url: `${proxyUrl}${TOGETHER_API_URL}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      data: {
        model: "meta-llama/Llama-3-70b-chat-hf",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1200,
        temperature: 0.2
      }
    });

    console.log('Dasha periods response received');
    
    // Extract and parse the JSON response
    const responseText = response.data.choices[0].message.content;
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                     responseText.match(/```\n([\s\S]*?)\n```/) || 
                     responseText.match(/{[\s\S]*?}/);
                     
    let parsedData;
    if (jsonMatch) {
      parsedData = JSON.parse(jsonMatch[0].replace(/```json\n|```\n|```/g, ''));
    } else {
      parsedData = JSON.parse(responseText);
    }
    
    return {
      currentMahadasha: parsedData.currentMahadasha,
      currentAntardasha: parsedData.currentAntardasha,
      sequence: parsedData.sequence
    };
  } catch (error) {
    console.error('Error getting dasha periods from Together AI:', error);
    // Return mock data as fallback
    return {
      currentMahadasha: mockVedicData.dashas.currentMahadasha,
      currentAntardasha: mockVedicData.dashas.currentAntardasha,
      sequence: mockVedicData.dashas.sequence
    };
  }
};

/**
 * Gets yogas and doshas data from Together AI
 */
const getVedicYogasDoshas = async (birthData: BirthData, birthChartData: any): Promise<{
  yogas: Yoga[];
  doshas: Dosha[];
}> => {
  try {
    console.log('Generating Vedic yogas and doshas with Together AI');
    
    // Create prompt for yogas and doshas
    const prompt = `Analyze the Vedic astrological chart for a person born on ${birthData.date} at ${birthData.time} Indian Standard Time (IST) in ${birthData.place}.

Here is their birth chart data from accurate calculations:
- Sun sign: ${birthChartData.sun.sign}
- Moon sign: ${birthChartData.moon.sign}
- Ascendant (Rising sign/Lagna): ${birthChartData.ascendant.sign}

Planetary positions:
${JSON.stringify(birthChartData.planets, null, 2)}

${birthChartData.houses ? `House information (House 1 is the Ascendant - ${birthChartData.ascendant.sign}):
${JSON.stringify(birthChartData.houses, null, 2)}` : ''}

Based on this information, identify:
1. Yogas (auspicious combinations) present in the chart
2. Doshas (challenging combinations) present in the chart

FORMAT YOUR RESPONSE AS VALID JSON with this structure:
{
  "yogas": [
    {
      "name": [yoga name],
      "strength": ["weak" | "moderate" | "strong" | "very strong"],
      "description": [brief description],
      "planets": [array of planet names involved],
      "houses": [array of house numbers involved]
    },
    ...more yogas
  ],
  "doshas": [
    {
      "name": [dosha name],
      "severity": ["mild" | "moderate" | "severe"],
      "description": [brief description],
      "remedies": [array of remedy suggestions],
      "affectedAreas": [array of life areas affected]
    },
    ...more doshas
  ]
}

Identify at least 3-5 yogas and 2-3 doshas based on the planetary positions and aspects in the chart.`;

    // Use the CORS proxy to avoid CORS issues
    const proxyUrl = 'http://localhost:8080/';
    
    // Make request using the Together AI API format
    const response = await axios({
      method: 'POST',
      url: `${proxyUrl}${TOGETHER_API_URL}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      data: {
        model: "meta-llama/Llama-3-70b-chat-hf",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1200,
        temperature: 0.2
      }
    });

    console.log('Yogas and doshas response received');
    
    // Extract and parse the JSON response
    const responseText = response.data.choices[0].message.content;
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                     responseText.match(/```\n([\s\S]*?)\n```/) || 
                     responseText.match(/{[\s\S]*?}/);
                     
    let parsedData;
    if (jsonMatch) {
      parsedData = JSON.parse(jsonMatch[0].replace(/```json\n|```\n|```/g, ''));
    } else {
      parsedData = JSON.parse(responseText);
    }
    
    return {
      yogas: parsedData.yogas,
      doshas: parsedData.doshas
    };
  } catch (error) {
    console.error('Error getting yogas and doshas from Together AI:', error);
    // Return mock data as fallback
    return {
      yogas: mockVedicData.yogas,
      doshas: mockVedicData.doshas
    };
  }
};

/**
 * Helper function to get approximate sun sign based on date
 * Used as fallback when Prokerala API is not available
 */
const getApproximateSunSign = (dateStr: string): string => {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "Aries";
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "Taurus";
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return "Gemini";
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return "Cancer";
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "Leo";
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "Virgo";
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return "Libra";
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return "Scorpio";
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return "Sagittarius";
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return "Capricorn";
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "Aquarius";
  return "Pisces";
};

// Helper function to get mock data
const getMockAstrologyData = (birthData: BirthData): ApiResponse => {
  return {
    success: true,
    data: {
      insight: `
## Birth Details
- Date: ${birthData.date}
- Time: ${birthData.time} IST
- Place: ${birthData.place}

## Ascendant/Lagna
Leo ascendant gives a confident, dignified, and charismatic presence. Natural leadership qualities with a generous and warm-hearted nature.

## Personality Overview
Balanced and justice-seeking with deep emotional sensitivity and natural commanding presence. Strong intuition with connection to ancestral wisdom.

## Key Strengths
- Natural leadership abilities and creative expression
- Strong intuitive and emotional intelligence
- Excellent communication skills and intellectual versatility
- Philosophical depth and teaching abilities

## Potential Challenges
- Balancing discipline with spontaneous action
- Managing emotional intensity and sensitivity
- Tendency towards perfectionism
- Need for discernment in spiritual pursuits

## Significant Chart Features
- Strong Sun position indicating exceptional creative potential
- Venus-Jupiter beneficial aspect bringing prosperity in relationships
- Saturn-Mars tension creating productive drive when managed well
- Mercury's favorable aspects enhancing communication abilities
- Moon in water sign deepening emotional intelligence
      `
    }
  };
};

/**
 * Preloads all necessary data for a birth chart to avoid multiple API calls
 * This is useful to call once when a user submits birth details
 * @param birthData The birth data with date, time (in IST), and place
 */
export const preloadBirthChartData = async (birthData: BirthData): Promise<void> => {
  try {
    console.log('Preloading all birth chart data for:', birthData);
    
    // Check if we already have cached data for this birth chart
    const cacheKey = apiCache.createCacheKey(birthData);
    
    if (apiCache.birthChartData && 
        apiCache.birthChartData.date === birthData.date && 
        apiCache.birthChartData.time === birthData.time && 
        apiCache.birthChartData.place === birthData.place &&
        apiCache.vedicChartData) {
      console.log('Data already cached for this birth chart');
      return;
    }
    
    // Fetch Prokerala birth chart data first
    console.log('Fetching birth chart data from Prokerala...');
    try {
      const birthChartData = await getBirthChart(birthData);
      
      // Cache the birth chart data
      apiCache.birthChartData = {
        date: birthData.date,
        time: birthData.time,
        place: birthData.place,
        data: birthChartData
      };
      console.log('Birth chart data cached');
      
      // Now preload Vedic chart data
      console.log('Preloading Vedic chart data...');
      try {
        const vedicChartData = await getConsolidatedVedicChart(birthData, birthChartData);
        
        // Cache the Vedic chart data
        apiCache.vedicChartData = vedicChartData;
        console.log('Vedic chart data cached');
      } catch (error) {
        console.error('Error preloading Vedic chart data:', error);
        
        // Try individual component requests as fallback
        console.log('Falling back to individual component requests for preloading');
        
        // Generate birth chart (planets and houses)
        const birthChart = await getVedicBirthChart(birthData, birthChartData);
        
        // Generate dasha periods
        const dashas = await getVedicDashas(birthData, birthChartData);
        
        // Generate yogas and doshas
        const yogasDoshas = await getVedicYogasDoshas(birthData, birthChartData);
        
        // Combine all the data into a complete Vedic chart
        const vedicChartData = {
          birthChart: birthChart,
          dashas: dashas,
          yogas: yogasDoshas.yogas,
          doshas: yogasDoshas.doshas
        };
        
        // Cache the Vedic chart data
        apiCache.vedicChartData = vedicChartData;
        console.log('Vedic chart data cached from individual requests');
      }
    } catch (error) {
      console.error('Error preloading birth chart data:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in preloadBirthChartData:', error);
    throw error;
  }
};

export default {
  getAstrologyInsight,
  getVedicChartData,
  preloadBirthChartData,
  clearCache: () => apiCache.clearCache() // Expose cache clearing function
}; 