// Simple diagnostic endpoint for debugging API issues
export default async function handler(req, res) {
  // Set CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
    'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  };
  
  // Apply CORS headers to all responses
  Object.keys(corsHeaders).forEach(key => {
    res.setHeader(key, corsHeaders[key]);
  });

  try {
    // Optional: Handle OPTIONS requests (CORS preflight)
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    
    // Return diagnostic information
    return res.status(200).json({
      status: 'ok',
      message: 'Dedicated diagnostic endpoint is operational',
      request: {
        method: req.method,
        url: req.url || 'not available',
        query: req.query || {},
        headers: req.headers || {}
      },
      environment: {
        node_env: process.env.NODE_ENV || 'not set',
        vercel_env: process.env.VERCEL_ENV || 'not set',
        vercel_region: process.env.VERCEL_REGION || 'not set',
        together_api_key: process.env.TOGETHER_API_KEY ? 'present' : 'missing',
        vite_together_api_key: process.env.VITE_TOGETHER_API_KEY ? 'present' : 'missing',
        claude_api_key: process.env.CLAUDE_API_KEY ? 'present' : 'missing',
        vite_claude_api_key: process.env.VITE_CLAUDE_API_KEY ? 'present' : 'missing'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Diagnostic endpoint error:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'An error occurred in the diagnostic endpoint',
      error: error.message
    });
  }
} 