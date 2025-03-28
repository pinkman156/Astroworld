# Astroworld API Integration Guide

This document provides comprehensive information on integrating with the Astroworld API services, setting up the environment, deploying the application, and troubleshooting common issues.

## Table of Contents

1. [API Overview](#api-overview)
2. [Environment Setup](#environment-setup)
3. [API Integration Guide](#api-integration-guide)
4. [Deployment Process](#deployment-process)
5. [Testing Procedures](#testing-procedures)
6. [Troubleshooting Guide](#troubleshooting-guide)

## API Overview

The Astroworld API provides astrological insights and birth chart analysis through a combination of third-party services including Prokerala and Together AI. The API handles authentication, data processing, and response formatting.

### Key API Endpoints

- **GET /api/geocode**: Geocoding service for location data
- **POST /api/prokerala-proxy/token**: Authentication endpoint for Prokerala API
- **GET /api/prokerala-proxy/planet-position**: Retrieves planetary positions
- **GET /api/prokerala-proxy/kundli**: Generates Vedic astrology birth chart
- **GET /api/prokerala-proxy/chart**: Retrieves comprehensive chart data
- **POST /api/together/chat**: AI-powered astrological insight generation

## Environment Setup

### Required Environment Variables

The following environment variables are required for the application to function properly:

```
# API Base URL
VITE_API_BASE_URL=http://localhost:5176  # For local development

# Prokerala API Credentials
VITE_PROKERALA_CLIENT_ID=your_client_id
VITE_PROKERALA_CLIENT_SECRET=your_client_secret

# Together AI API Key
VITE_TOGETHER_API_KEY=your_api_key
```

### Local Development Setup

1. Clone the repository
2. Copy `.env.example` to `.env.local` and fill in your API credentials
3. Install dependencies with `npm install`
4. Start the development server:
   - Frontend: `npm run dev`
   - API Server: `node server.js`

## API Integration Guide

### Making API Requests

The application uses an API service class located at `src/services/api/index.ts` to handle all API requests. The service provides methods for:

- Getting astrological insights
- Preloading birth chart data
- Managing API authentication
- Handling errors

### Optimizing Together AI Requests

When making requests to the Together AI API for complex astrological analysis, follow these best practices:

#### Token Limit Optimization
- The default `max_tokens` limit is set to 10,000 to prevent errors with the model's context length limits
- You can specify a lower limit for simpler queries if needed
- Example: `{ max_tokens: 500 }` for basic zodiac descriptions
- Note: The Mixtral-8x7B-Instruct-v0.1 model has a maximum context length of 32,768 tokens total (including both input and output)

#### Timeout Handling
- The API server has a 30-second timeout for complex queries (note: Together AI's servers still have an 8-second timeout)
- Client-side requests should include appropriate timeout handling

#### Breaking Down Complex Queries
For comprehensive astrological analyses, break down complex queries into smaller, focused requests:
1. Request personality traits and characteristics in one call
2. Request career insights in a separate call
3. Request relationship compatibility in another call

Example of breaking down complex queries:
```typescript
// Instead of one complex query
const complexResponse = await api.getAIInsight(
  "Provide a comprehensive analysis of Sun in Gemini, Moon in Scorpio including personality, career, and relationships"
);

// Break it down into separate queries
const personalityResponse = await api.getAIInsight(
  "Describe the personality traits of someone with Sun in Gemini, Moon in Scorpio"
);

const careerResponse = await api.getAIInsight(
  "What are the career insights for someone with Sun in Gemini, Moon in Scorpio?"
);

const relationshipResponse = await api.getAIInsight(
  "Describe relationship compatibility for someone with Sun in Gemini, Moon in Scorpio"
);
```

This approach provides more reliable responses and avoids timeout issues with complex queries.

### Example Usage

```typescript
import api from './services/api';

// Get astrological insight
const birthData = {
  date: '1990-01-01',
  time: '12:00',
  place: 'New York, USA',
  name: 'John Doe'
};

const response = await api.getAstrologyInsight(birthData);

if (response.success && response.data) {
  console.log(response.data.insight);
} else {
  console.error(response.error);
}
```

### Error Handling

The API service includes robust error handling that categorizes errors by type and provides meaningful error messages. All API requests are wrapped in try/catch blocks to prevent unhandled exceptions.

## Deployment Process

### Deploying to Vercel

1. Push your code to a GitHub repository
2. Connect the repository to your Vercel account
3. Configure environment variables in the Vercel dashboard
4. Deploy the application

### Vercel Configuration

The project includes a `vercel.json` file that configures:

- Build settings for static files and the server
- API route handling
- CORS headers for API requests
- Environment variables

## Testing Procedures

### API Endpoint Tests

#### Testing Geocoding

```bash
curl -X GET "http://localhost:5176/api/geocode?q=New%20York"
```

#### Testing Prokerala Token

```bash
curl -X POST "http://localhost:5176/api/prokerala-proxy/token"
```

#### Testing Planet Positions

```bash
# First get a token from the token endpoint
TOKEN="your_token_here"
curl -X GET "http://localhost:5176/api/prokerala-proxy/planet-position?datetime=2023-01-01%2012:00:00&coordinates=40.7128,-74.0060&ayanamsa=1" \
  -H "Authorization: Bearer $TOKEN"
```

### Test Script

A comprehensive test script is available at `scripts/test-api.sh` which tests all API endpoints and reports any issues.

## Troubleshooting Guide

### Common Issues and Solutions

#### CORS Errors

If you encounter CORS errors when making API requests, ensure:

1. The `headers` section in `vercel.json` is properly configured
2. Your API server is running and accessible
3. The proxy settings in `vite.config.ts` are correct

#### API Authentication Failures

If Prokerala API authentication fails:

1. Verify your client ID and secret are correct
2. Check that the token endpoint is accessible
3. Ensure the authentication flow in `api/index.ts` is working correctly

#### Deployment Failures

If deployment to Vercel fails:

1. Check the build logs for specific errors
2. Ensure all required environment variables are set
3. Verify the `vercel.json` configuration is valid

### Logging and Debugging

The API service includes logging for all API requests and errors. To enable more detailed logging, set `DEBUG=true` in your environment variables.

---

For additional help or to report issues, please create an issue in the GitHub repository or contact the development team. 