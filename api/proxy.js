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
    
    // Check if the URL is already properly decoded
    try {
      // Try to decode once to see if it's double-encoded
      const decodedOnce = decodeURIComponent(targetUrl);
      
      // If the decoded URL contains %20 or other encoded characters, it might be double-encoded
      if (decodedOnce.includes('%')) {
        try {
          // Try to decode again to handle double encoding
          targetUrl = decodeURIComponent(decodedOnce);
        } catch (e) {
          // If second decode fails, use the first decode result
          targetUrl = decodedOnce;
        }
      } else {
        // Use the decoded URL
        targetUrl = decodedOnce;
      }
    } catch (e) {
      // If initial decode fails, the URL might not be encoded or is invalid
      console.error('URL decoding error:', e.message);
      // Continue with the original URL
    }
    
    // Special handling for OpenStreetMap - always double encode the URL if it's not already encoded
    if (targetUrl.includes('nominatim.openstreetmap.org') && !targetUrl.includes('%')) {
      // Encode the URL to ensure it works with OpenStreetMap
      targetUrl = encodeURI(targetUrl);
      console.log('Encoded OpenStreetMap URL:', targetUrl);
    }
    
    console.log(`Proxying ${req.method} request to: ${targetUrl}`);
    
    try {
      // Determine if this is an OpenStreetMap URL
      const isOpenStreetMap = targetUrl.includes('nominatim.openstreetmap.org');
      const isTogetherApi = targetUrl.includes('api.together.xyz');
      
      // Set up headers for the request
      const headers = {
        'User-Agent': 'AstroInsights/1.0',
        'Accept': isOpenStreetMap ? 'application/json' : '*/*',
      };
      
      // Add Accept-Language only for OpenStreetMap
      if (isOpenStreetMap) {
        headers['Accept-Language'] = 'en';
      }
      
      // Add Content-Type header for POST requests
      if (req.method === 'POST') {
        headers['Content-Type'] = req.headers['content-type'] || 'application/json';
      }
      
      // For POST requests, we need to read the request body
      let body = undefined;
      if (req.method === 'POST') {
        // Parse the request body if available
        if (req.body) {
          if (typeof req.body === 'string') {
            body = req.body;
          } else {
            // If it's an object, stringify it
            body = JSON.stringify(req.body);
          }
        } else if (req.rawBody) {
          // Some serverless platforms provide rawBody
          body = req.rawBody;
        }
        
        console.log('Forwarding POST request with body:', body);
      }
      
      // Use native fetch to make the request
      const response = await fetch(targetUrl, {
        method: req.method || 'GET',
        headers,
        // For POST requests, include the request body
        body: body,
      });
      
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
        
        // Handle the case where the response is HTML but we expect JSON (like OpenStreetMap)
        if (isOpenStreetMap && contentType.includes('text/html')) {
          try {
            // Try direct request to OpenStreetMap with double encoding
            const doubleEncodedUrl = 'https%3A%2F%2Fnominatim.openstreetmap.org%2Fsearch%3Fq%3D' + 
              encodeURIComponent(targetUrl.split('q=')[1].split('&')[0]) + '%26format%3Djson';
            
            console.log(`Retrying with double-encoded URL: ${doubleEncodedUrl}`);
            
            // Make a recursive call to the proxy with the double-encoded URL
            return await fetch(`https://astroworld-nine.vercel.app/api/proxy?url=${doubleEncodedUrl}`)
              .then(retryRes => retryRes.json())
              .then(data => res.status(200).json(data))
              .catch(e => {
                console.error('Double-encoding retry failed:', e.message);
                // Fall back to the original response
                return res.status(response.status).send(text);
              });
          } catch (retryError) {
            console.error('OpenStreetMap retry failed:', retryError.message);
            // Fall back to the original response
            return res.status(response.status).send(text);
          }
        }
        
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