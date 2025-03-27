export default function handler(req, res) {
  res.status(200).json({
    name: 'Astro Insights API',
    version: '1.0.0',
    endpoints: [
      { path: '/api/health', method: 'GET', description: 'Health check endpoint' },
      { path: '/api/geocode', method: 'GET', description: 'OpenStreetMap geocoding' },
      { path: '/api/prokerala-token', method: 'POST', description: 'Get Prokerala API OAuth token' },
      { path: '/api/prokerala-planet-position', method: 'GET', description: 'Get planet positions' },
      { path: '/api/prokerala-kundli', method: 'GET', description: 'Get Kundli data' },
      { path: '/api/prokerala-chart', method: 'GET', description: 'Get chart data' },
      { path: '/api/together-chat', method: 'POST', description: 'Together AI chat completions' }
    ]
  });
} 