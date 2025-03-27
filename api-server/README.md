# Astro Insights API Server

This is the backend API server for the Astro Insights application. It handles proxying requests to external APIs and manages authentication for various services.

## Deployment Instructions

### Deploying to Vercel

1. Install Vercel CLI:
   ```
   npm install -g vercel
   ```

2. Login to Vercel:
   ```
   vercel login
   ```

3. Deploy the server:
   ```
   vercel
   ```

4. Set up environment variables in the Vercel dashboard:
   - `VITE_PROKERALA_CLIENT_ID`
   - `VITE_PROKERALA_CLIENT_SECRET`
   - `VITE_TOGETHER_API_KEY`
   - `CORS_ORIGIN` (set to your frontend URL, e.g., https://astroworld-nine.vercel.app)

5. Deploy to production:
   ```
   vercel --prod
   ```

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /api/geocode` - OpenStreetMap geocoding
- `POST /api/prokerala/token` - Get Prokerala API OAuth token
- `GET /api/prokerala/planet-position` - Get planet positions
- `GET /api/prokerala/kundli` - Get Kundli data
- `GET /api/prokerala/chart` - Get chart data
- `POST /api/together/chat` - Together AI chat completions

## Development

To run the server locally:

```
npm install
npm start
```

The server will be available at `http://localhost:3000`. 