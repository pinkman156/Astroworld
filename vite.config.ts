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
      'process.env.VITE_TOGETHER_API_KEY': JSON.stringify(env.VITE_TOGETHER_API_KEY || '')
    }
  }
})
