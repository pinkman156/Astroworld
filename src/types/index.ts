/**
 * Represents birth data for astrological calculations
 */
export interface BirthData {
  /**
   * Birth date in YYYY-MM-DD format (in IST - Indian Standard Time)
   */
  date: string;
  
  /**
   * Birth time in 24-hour format HH:MM (in IST - Indian Standard Time)
   */
  time: string;
  
  /**
   * Birth place name (e.g., "Mumbai, India")
   */
  place: string;
  
  /**
   * Birth name
   */
  name: string;
}

/**
 * Represents the astrological insight state
 */
export interface AstrologyInsight {
  /**
   * The formatted astrological reading
   */
  message: string;
  
  /**
   * Whether the insight is currently being generated
   */
  loading: boolean;
  
  /**
   * Error message if the insight generation failed
   */
  error: string | null;
}

/**
 * API response format for astrological insights
 */
export interface ApiResponse {
  /**
   * Whether the API call was successful
   */
  success: boolean;
  
  /**
   * The insight data if successful
   */
  data?: {
    /**
     * The formatted astrological reading
     */
    insight: string;
  };
  
  /**
   * Error message if the API call failed
   */
  error?: string;
}

// Vedic Astrology Types
export interface Planet {
  id: string;
  name: string;
  sign: number;
  house: number;
  degree: number;
  nakshatra: string;
  isRetrograde: boolean;
  color: string;
}

export interface House {
  number: number;
  sign: number;
  signName: string;
  lord: string;
  planets: string[];
  strength: 'weak' | 'moderate' | 'strong';
  aspects: string[];
}

export interface Yoga {
  name: string;
  strength: 'weak' | 'moderate' | 'strong' | 'very strong';
  description: string;
  planets: string[];
  houses: number[];
}

export interface Dosha {
  name: string;
  severity: 'mild' | 'moderate' | 'severe';
  description: string;
  remedies: string[];
  affectedAreas: string[];
}

export interface DashaPeriod {
  planet: string;
  startDate: string;
  endDate: string;
  subPeriods?: DashaPeriod[];
}

export interface VedicChart {
  birthChart: {
    ascendant: number;
    planets: Planet[];
    houses: House[];
  };
  dashas: {
    currentMahadasha: DashaPeriod;
    currentAntardasha: DashaPeriod;
    sequence: DashaPeriod[];
  };
  yogas: Yoga[];
  doshas: Dosha[];
} 