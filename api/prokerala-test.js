import axios from 'axios';

export default async function handler(req, res) {
  try {
    // Try multiple possible environment variable formats
    const clientId = 
      process.env.VITE_PROKERALA_CLIENT_ID || 
      process.env.PROKERALA_CLIENT_ID || 
      process.env.NEXT_PUBLIC_PROKERALA_CLIENT_ID;
    
    const clientSecret = 
      process.env.VITE_PROKERALA_CLIENT_SECRET || 
      process.env.PROKERALA_CLIENT_SECRET || 
      process.env.NEXT_PUBLIC_PROKERALA_CLIENT_SECRET;
    
    // Log for debugging - these values will appear in Vercel logs
    console.log('Prokerala test endpoint:', { 
      clientIdExists: !!clientId,
      clientIdLength: clientId ? clientId.length : 0,
      clientSecretExists: !!clientSecret,
      clientSecretLength: clientSecret ? clientSecret.length : 0
    });
    
    // Perform validation
    if (!clientId || !clientSecret) {
      return res.status(500).json({
        error: 'Missing credentials',
        clientIdExists: !!clientId,
        clientSecretExists: !!clientSecret,
        tip: 'Make sure to set VITE_PROKERALA_CLIENT_ID and VITE_PROKERALA_CLIENT_SECRET in Vercel environment variables',
        env: Object.keys(process.env).filter(key => key.includes('PROKERALA') || key.includes('VITE_'))
      });
    }
    
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId)) {
      return res.status(400).json({
        error: 'Invalid client ID format',
        message: 'The client ID must be a valid UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
        clientIdLength: clientId.length,
        clientIdPrefix: clientId.substring(0, 4) + '...'
      });
    }
    
    // Make direct request to Prokerala API
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
    
    // Success! Return basic info about the token
    return res.status(200).json({
      success: true,
      tokenType: response.data.token_type,
      expiresIn: response.data.expires_in,
      createdAt: response.data.created_at,
      message: 'Successfully authenticated with Prokerala API'
    });
    
  } catch (error) {
    console.error('Prokerala API test error:', error.message);
    
    // Return helpful response
    return res.status(500).json({
      error: 'Prokerala API error',
      message: error.message,
      response: error.response ? {
        status: error.response.status,
        data: error.response.data
      } : null,
      suggestion: 'Check if your Prokerala API credentials are correct and in UUID format'
    });
  }
} 