/**
 * Service Worker to proxy Prokerala API requests
 * This helps avoid CORS issues when making direct requests from the browser
 */

// List of Prokerala API endpoints to intercept
const PROKERALA_API_PATTERNS = [
  '/v2/astrology/planet-position',
  '/v2/astrology/kundli',
  '/v2/astrology/chart'
];

// Service worker install event
self.addEventListener('install', (event) => {
  console.log('Prokerala API Proxy Service Worker installed');
  self.skipWaiting();
});

// Service worker activate event
self.addEventListener('activate', (event) => {
  console.log('Prokerala API Proxy Service Worker activated');
  return self.clients.claim();
});

// Intercept fetch requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Check if this is a Prokerala API request
  if (url.hostname === 'api.prokerala.com') {
    // Check if the path matches one of our patterns
    const isProkeralaEndpoint = PROKERALA_API_PATTERNS.some(pattern => 
      url.pathname.includes(pattern)
    );
    
    if (isProkeralaEndpoint) {
      console.log('Proxying Prokerala API request:', url.pathname);
      
      // Extract the endpoint from the URL path
      const endpoint = url.pathname.replace('/v2/astrology/', '');
      
      // Create the new URL to our backend API
      const apiEndpoint = `/api/prokerala-${endpoint}${url.search}`;
      
      // Forward the request to our backend API
      const proxyRequest = new Request(apiEndpoint, {
        method: event.request.method,
        headers: event.request.headers,
        body: event.request.body,
        mode: 'cors',
        credentials: 'include'
      });
      
      event.respondWith(
        fetch(proxyRequest)
          .then(response => {
            console.log('Proxied request successful:', apiEndpoint);
            return response;
          })
          .catch(error => {
            console.error('Proxy error:', error);
            return new Response(
              JSON.stringify({
                error: 'Proxy Error',
                message: error.message,
                originalUrl: url.toString(),
                proxyUrl: apiEndpoint
              }),
              { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          })
      );
    }
  }
}); 