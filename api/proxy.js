// Simple proxy implementation using native fetch
// No need to import fetch - it's available in Node.js 18+

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
    let targetUrl = req.query.url;
    
    if (!targetUrl) {
      return res.status(400).json({ error: 'Missing URL parameter' });
    }
    
    // Special handling for OpenStreetMap - ALWAYS double encode
    if (targetUrl.includes('nominatim.openstreetmap.org')) {
      // For OpenStreetMap, we'll create a properly double-encoded URL
      try {
        // Parse the URL to extract the query parameters
        let baseUrl = 'https://nominatim.openstreetmap.org/search';
        let params = new URLSearchParams();
        
        // Extract query parameter (q=) from the URL
        let queryMatch = targetUrl.match(/[?&]q=([^&]+)/);
        if (queryMatch && queryMatch[1]) {
          // First decode in case it's already encoded
          let query = decodeURIComponent(queryMatch[1]);
          params.append('q', query);
        }
        
        // Always add format=json
        params.append('format', 'json');
        
        // Create a properly double-encoded URL
        let properUrl = `${baseUrl}?${params.toString()}`;
        
        // Now double-encode the entire URL for the proxy
        targetUrl = encodeURIComponent(properUrl);
        console.log('Double-encoded OpenStreetMap URL:', targetUrl);
      } catch (e) {
        console.error('Error creating double-encoded URL:', e.message);
        // If encoding fails, we'll continue with the original URL
      }
    }
    
    // Special handling for Prokerala token endpoint
    const isProkeralaTokenRequest = targetUrl.includes('api.prokerala.com/token');
    
    console.log(`Proxying ${req.method} request to: ${targetUrl}`);
    
    try {
      // Determine if this is an OpenStreetMap URL or Prokerala URL
      const isOpenStreetMap = targetUrl.includes('nominatim.openstreetmap.org');
      const isProkeralaAPI = targetUrl.includes('api.prokerala.com');
      const isTogetherApi = targetUrl.includes('api.together.xyz');
      
      // Extract headers from the original request
      const headers = {};
      
      // Copy important headers
      if (req.headers) {
        // User-Agent
        headers['User-Agent'] = 'AstroInsights/1.0';
        
        // Accept header
        headers['Accept'] = isOpenStreetMap ? 'application/json' : (req.headers.accept || '*/*');
        
        // Authorization header (if present)
        if (req.headers.authorization) {
          headers['Authorization'] = req.headers.authorization;
        }
        
        // Content-Type for POST requests
        if (req.method === 'POST') {
          headers['Content-Type'] = req.headers['content-type'] || 'application/json';
          
          // For Prokerala token requests, ensure content-type is correct
          if (isProkeralaTokenRequest) {
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
          }
        }
      }
      
      // Add Accept-Language for OpenStreetMap
      if (isOpenStreetMap) {
        headers['Accept-Language'] = 'en';
      }
      
      // For POST requests, prepare the body
      let requestBody = undefined;
      
      if (req.method === 'POST') {
        try {
          // Special handling for Prokerala token endpoint
          if (isProkeralaTokenRequest) {
            // Get client credentials from environment variables
            const clientId = process.env.VITE_PROKERALA_CLIENT_ID;
            const clientSecret = process.env.VITE_PROKERALA_CLIENT_SECRET;
            
            if (clientId && clientSecret) {
              console.log('Using Prokerala credentials from environment variables');
              
              // Create the form data
              const params = new URLSearchParams();
              params.append('grant_type', 'client_credentials');
              params.append('client_id', clientId);
              params.append('client_secret', clientSecret);
              
              requestBody = params.toString();
            } else {
              console.warn('Prokerala credentials not found in environment variables');
              
              // Try to use the body from the request if available
              if (req.body) {
                if (typeof req.body === 'string') {
                  requestBody = req.body;
                } else if (typeof req.body === 'object') {
                  // Try to extract credentials from the request body
                  const params = new URLSearchParams();
                  
                  if (req.body.grant_type) params.append('grant_type', req.body.grant_type);
                  if (req.body.client_id) params.append('client_id', req.body.client_id);
                  if (req.body.client_secret) params.append('client_secret', req.body.client_secret);
                  
                  requestBody = params.toString();
                }
              }
            }
          } else {
            // Handle other POST requests normally
            if (req.body) {
              if (typeof req.body === 'string') {
                requestBody = req.body;
              } else if (typeof req.body === 'object') {
                requestBody = JSON.stringify(req.body);
              }
            } else if (req.rawBody) {
              requestBody = req.rawBody;
            }
          }
          
          // For Together API, ensure content-type is application/json
          if (isTogetherApi && headers['Content-Type'] !== 'application/json') {
            headers['Content-Type'] = 'application/json';
          }
          
          console.log('Forwarding POST request with body type:', typeof requestBody);
        } catch (bodyError) {
          console.error('Error processing request body:', bodyError.message);
        }
      }
      
      // Create fetch options
      const fetchOptions = {
        method: req.method || 'GET',
        headers: headers
      };
      
      // Add body for POST requests
      if (req.method === 'POST' && requestBody) {
        fetchOptions.body = requestBody;
      }
      
      // Make the request
      const response = await fetch(decodeURIComponent(targetUrl), fetchOptions);
      
      console.log(`Received response with status: ${response.status}`);
      
      // Get content type to determine how to handle the response
      const contentType = response.headers.get('content-type') || '';
      console.log(`Response content type: ${contentType}`);
      
      // Set the same content type in the response
      res.setHeader('Content-Type', contentType);
      
      // Handle response based on content type
      if (contentType.includes('application/json')) {
        // Parse JSON response
        try {
          const data = await response.json();
          return res.status(response.status).json(data);
        } catch (jsonError) {
          console.error('Failed to parse JSON:', jsonError.message);
          // If JSON parsing fails, return text
          const text = await response.text();
          return res.status(response.status).send(text);
        }
      } else {
        // For non-JSON responses, return as text
        const text = await response.text();
        return res.status(response.status).send(text);
      }
    } catch (fetchError) {
      console.error('Fetch error:', fetchError.message);
      return res.status(500).json({ 
        error: 'Fetch error',
        message: fetchError.message,
        stack: fetchError.stack
      });
    }
  } catch (error) {
    console.error('General proxy error:', error.message);
    return res.status(500).json({ 
      error: 'Proxy error',
      message: error.message,
      stack: error.stack
    });
  }
}; 