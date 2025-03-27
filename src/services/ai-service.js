import axios from 'axios';
import { getFullApiUrl } from './api-server';

/**
 * Service for AI-related API calls
 */
const aiService = {
  /**
   * Generate astrological insights based on birth data
   * @param {Object} birthData - The birth data to generate insights for
   * @param {string} prompt - Optional custom prompt to use
   * @returns {Promise<Object>} - Promise with the generated insights
   */
  generateInsights: async (birthData, prompt) => {
    try {
      console.log('Generating AI insights for birth data:', birthData.name);
      
      // Create a default prompt if none provided
      const defaultPrompt = `
You are an expert astrologer with deep knowledge of both Western and Vedic astrology.
Based on the following birth details, provide an insightful horoscope reading:

Name: ${birthData.name || 'Anonymous'}
Date of Birth: ${birthData.date}
Time of Birth: ${birthData.time}
Place of Birth: ${birthData.place}

Focus on the following aspects:
1. Sun, Moon, and Ascendant signs and their significance
2. Major planetary influences
3. Current transits and their effects
4. Key strengths and potential challenges
5. Career insights and potential paths
6. Relationship patterns and compatibility
7. Health considerations from an astrological perspective

Provide a comprehensive yet concise reading that offers genuine insights and practical guidance.
`.trim();
      
      // Make the API request
      const response = await axios({
        method: 'POST',
        url: `/api/ai/generate`,
        data: {
          prompt: prompt || defaultPrompt,
          birthData
        }
      });
      
      if (response.data && response.data.success) {
        return {
          success: true,
          data: response.data.data
        };
      }
      
      throw new Error('Failed to generate insights');
    } catch (error) {
      console.error('Error generating AI insights:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to generate insights'
      };
    }
  }
};

export default aiService; 