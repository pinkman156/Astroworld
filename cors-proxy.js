// CORS Proxy Server
import corsAnywhere from 'cors-anywhere';

// Listen on a specific host via the HOST environment variable
const host = process.env.HOST || '0.0.0.0';
// Listen on a specific port via the PORT environment variable
const port = process.env.PORT || 8080;

console.log(`Starting CORS Anywhere proxy server on ${host}:${port}`);
console.log('Use this proxy by making requests to:');
console.log(`http://localhost:${port}/https://api.prokerala.com/...`);

corsAnywhere.createServer({
  originWhitelist: [], // Allow all origins
  requireHeader: [], // Don't require any headers - easier for testing
  removeHeaders: ['cookie', 'cookie2']
}).listen(port, host, () => {
  console.log('CORS Anywhere proxy server running');
}); 