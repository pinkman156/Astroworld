// Simple proxy implementation using node-fetch
import fetch from 'node-fetch';

export default async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get the target URL from the query parameter
    const targetUrl = req.query.url;
    
    if (!targetUrl) {
      return res.status(400).json({ error: 'Missing URL parameter' });
    }
    
    console.log('Proxying request to:', targetUrl);
    
    // Use node-fetch to make the request
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        // Remove headers that might cause issues
        'User-Agent': 'AstroInsights/1.0',
      },
    });
    
    // Get content type to determine how to handle the response
    const contentType = response.headers.get('content-type') || '';
    
    // Set the same content type in the response
    res.setHeader('Content-Type', contentType);
    
    // Handle response based on content type
    if (contentType.includes('application/json')) {
      // Parse JSON response
      try {
        const data = await response.json();
        return res.status(response.status).json(data);
      } catch (error) {
        // If JSON parsing fails, return text
        const text = await response.text();
        return res.status(response.status).send(text);
      }
    } else {
      // For non-JSON responses, return as text
      const text = await response.text();
      return res.status(response.status).send(text);
    }
  } catch (error) {
    console.error('Proxy error:', error.message);
    return res.status(500).json({ 
      error: 'Proxy error',
      message: error.message 
    });
  }
}; 