import axios from 'axios';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.VITE_TOGETHER_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing API key' });
    }
    
    const response = await axios({
      method: 'POST',
      url: 'https://api.together.xyz/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      data: req.body
    });
    
    return res.status(200).json(response.data);
  } catch (error) {
    console.error('Together AI error:', error.message);
    
    // Forward the error response
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    return res.status(500).json({ 
      error: 'API error',
      message: error.message
    });
  }
} 