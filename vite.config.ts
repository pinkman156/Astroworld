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
      // Configure proxy for development server
      proxy: {
        // Proxy API requests to our serverless API handler
        '/api/prokerala-proxy': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (_proxyReq, req, _res) => {
              console.log('Proxying:', req.method, req.url);
            });
          },
        },
        '/api/geocode': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/api/together/chat': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        }
      }
    }
  }
})
