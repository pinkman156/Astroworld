import axios from 'axios';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Try multiple possible environment variable formats
    // Vercel sometimes handles environment variables differently
    const clientId = 
      process.env.VITE_PROKERALA_CLIENT_ID || 
      process.env.PROKERALA_CLIENT_ID || 
      process.env.NEXT_PUBLIC_PROKERALA_CLIENT_ID;
    
    const clientSecret = 
      process.env.VITE_PROKERALA_CLIENT_SECRET || 
      process.env.PROKERALA_CLIENT_SECRET || 
      process.env.NEXT_PUBLIC_PROKERALA_CLIENT_SECRET;
    
    // Log environment variables for debugging (redacted for security)
    console.log('Environment variables:', {
      clientIdExists: !!clientId,
      clientIdLength: clientId ? clientId.length : 0,
      clientIdPrefix: clientId ? clientId.substring(0, 4) + '...' : 'null',
      clientSecretExists: !!clientSecret,
      env: Object.keys(process.env).filter(key => key.includes('PROKERALA') || key.includes('VITE_')),
      nodeEnv: process.env.NODE_ENV,
      allKeys: Object.keys(process.env).length
    });
    
    if (!clientId || !clientSecret) {
      return res.status(500).json({ 
        error: 'Missing API credentials',
        details: {
          clientIdExists: !!clientId,
          clientSecretExists: !!clientSecret,
          availableEnvVars: Object.keys(process.env).filter(k => k.includes('PROKERALA') || k.includes('VITE_'))
        }
      });
    }
    
    const response = await axios({
      method: 'POST',
      url: 'https://api.prokerala.com/token',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: new URLSearchParams({
        'grant_type': 'client_credentials',
        'client_id': clientId,
        'client_secret': clientSecret
      })
    });
    
    return res.status(200).json(response.data);
  } catch (error) {
    console.error('Prokerala token error:', error.message);
    
    // Forward the error response from Prokerala
    if (error.response) {
      const responseData = error.response.data;
      console.error('Prokerala API response:', responseData);
      return res.status(error.response.status).json({
        ...responseData,
        debug: {
          message: "This error came from the Prokerala API. Make sure your Prokerala credentials are valid UUID format (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)."
        }
      });
    }
    
    return res.status(500).json({ 
      error: 'Authentication error',
      message: error.message,
      suggestion: "Make sure your Prokerala API credentials are set correctly in Vercel environment variables. Check if the client ID is in valid UUID format."
    });
  }
} 