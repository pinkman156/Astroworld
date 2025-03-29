import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables based on mode (development, production, etc.)
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    define: {
      // Make environment variables available via process.env 
      'process.env.VITE_PROKERALA_CLIENT_ID': JSON.stringify(env.VITE_PROKERALA_CLIENT_ID || ''),
      'process.env.VITE_PROKERALA_CLIENT_SECRET': JSON.stringify(env.VITE_PROKERALA_CLIENT_SECRET || ''),
      'process.env.VITE_TOGETHER_API_KEY': JSON.stringify(env.VITE_TOGETHER_API_KEY || ''),
      'process.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL || '')
    },
    server: {
      // Configure proxy for development server - using direct connections instead of local proxy
      proxy: {
        '/api/geocode': {
          target: 'https://nominatim.openstreetmap.org',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/geocode/, '/search'),
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('Geocoding proxy error:', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              // Set required headers for Nominatim
              proxyReq.setHeader('User-Agent', 'AstroInsights/1.0');
              proxyReq.setHeader('Referer', 'https://astroworld-delta.vercel.app/');
              console.log('Proxying geocode:', req.method, req.url);
            });
          },
        },
        '/api/prokerala-proxy': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/api/together/chat': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/api/claude/chat': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/claude/, '/api/together')
        }
      }
    }
  }
})
