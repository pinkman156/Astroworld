# Astroworld Vercel Deployment Configuration

This guide provides the correct environment variables and settings for deploying Astroworld to Vercel.

## 1. Environment Variables

In your Vercel project settings, add these environment variables:

```
# API credentials 
PROKERALA_CLIENT_ID=ebc3a614-d4f3-465d-b7bf-e4ae3ea3667e
PROKERALA_CLIENT_SECRET=Hx7OuIF7ckiXixP2uVlrquB64Zfg73kVn115qowY
TOGETHER_API_KEY=fa8c8812d0201d189bba52553de37dec1951010b1e1478ab4380bf2dc7df41a9

# Also set these for frontend access during build
VITE_PROKERALA_CLIENT_ID=ebc3a614-d4f3-465d-b7bf-e4ae3ea3667e
VITE_PROKERALA_CLIENT_SECRET=Hx7OuIF7ckiXixP2uVlrquB64Zfg73kVn115qowY
VITE_TOGETHER_API_KEY=fa8c8812d0201d189bba52553de37dec1951010b1e1478ab4380bf2dc7df41a9
```

## 2. Prokerala API Configuration

Update your Prokerala API settings in the Prokerala developer dashboard:

### Authorized JavaScript Origins
Add these URLs:
```
http://localhost:5176,https://astroworld-nine.vercel.app
```

## 3. Deployment Settings

Configure Vercel with these settings:

- **Framework Preset**: Vite
- **Build Command**: `npm run vercel-build` 
- **Output Directory**: `dist`
- **Install Command**: `npm install`

## 4. Testing After Deployment

Once deployed, test your API endpoints:

```bash
# Test Prokerala token endpoint
curl -X POST "https://astroworld-nine.vercel.app/api/prokerala-proxy/token"

# Test geocoding
curl -X GET "https://astroworld-nine.vercel.app/api/geocode?q=New%20York"

# Test Together AI endpoint (substitute with appropriate values)
curl -X POST "https://astroworld-nine.vercel.app/api/together/chat" \
  -H "Content-Type: application/json" \
  -d '{"model":"mistralai/Mixtral-8x7B-Instruct-v0.1","messages":[{"role":"system","content":"You are an astrologer."},{"role":"user","content":"Quick reading for someone born Jan 1, 1990"}],"temperature":0.7,"max_tokens":100}'
```

## 5. Troubleshooting

If you encounter issues:

1. **API Errors**: Check Vercel function logs for detailed error messages
2. **CORS Issues**: Make sure your frontend is using relative URLs for API requests
3. **Token Errors**: Verify Prokerala API credentials and authorized origins
4. **Environment Variables**: Ensure all variables are set correctly in Vercel dashboard 