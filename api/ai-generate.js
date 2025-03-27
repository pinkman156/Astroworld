import axios from 'axios';

export default async function handler(req, res) {
  // Handle OPTIONS requests for CORS preflight
  if (req.method === 'OPTIONS') {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract data from request body
    const { prompt, birthData } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        message: 'The prompt parameter is required'
      });
    }
    
    // Get Together AI API key from environment variables
    const apiKey = process.env.VITE_TOGETHER_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'Missing API credentials',
        message: 'API key is not configured'
      });
    }
    
    // Log for debugging
    console.log('Making AI generation request with prompt:', prompt.substring(0, 100) + '...');
    
    // Make request to Together AI API
    const response = await axios({
      method: 'POST',
      url: 'https://api.together.xyz/v1/completions',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      data: {
        model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
        prompt: prompt,
        max_tokens: 1000,
        temperature: 0.7,
        top_p: 0.9,
        repetition_penalty: 1.1
      }
    });
    
    // Return the AI-generated response
    return res.status(200).json({
      success: true,
      data: response.data.choices[0].text,
      model: response.data.model || 'mistralai/Mixtral-8x7B-Instruct-v0.1'
    });
    
  } catch (error) {
    console.error('AI generation error:', error.message);
    
    // Return helpful error response
    return res.status(500).json({
      error: 'AI generation failed',
      message: error.message,
      details: error.response?.data || 'No additional details available'
    });
  }
} 