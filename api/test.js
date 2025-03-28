// Test script for Prokerala API proxy
// Run this script with Node.js to test the token endpoint locally
import axios from 'axios';
import prokeralaProxy from './prokerala-proxy.js';

// Mock request and response objects for testing
const mockRequest = {
  url: '/api/prokerala-proxy/token',
  method: 'POST',
  headers: {},
  query: {}
};

const mockResponse = {
  status: function(statusCode) {
    this.statusCode = statusCode;
    console.log('Response status:', statusCode);
    return this;
  },
  setHeader: function(key, value) {
    if (!this.headers) this.headers = {};
    this.headers[key] = value;
    return this;
  },
  json: function(body) {
    this.body = body;
    console.log('Response body:', JSON.stringify(body, null, 2));
    return this;
  }
};

async function runTest() {
  console.log('Testing Prokerala API proxy locally...');
  
  // Set environment variables for testing - replace with your actual values
  process.env.PROKERALA_CLIENT_ID = '169_6kggk7ouf0w4wccs4skg80kgkws0kc';
  process.env.PROKERALA_CLIENT_SECRET = '1ukzhrd7u1c0sgkksgwo0ss84coc0wk8oows80gwkw8gc08kgs';
  
  console.log('Environment variables:');
  console.log('- PROKERALA_CLIENT_ID:', process.env.PROKERALA_CLIENT_ID ? 'Set' : 'Not set');
  console.log('- PROKERALA_CLIENT_SECRET:', process.env.PROKERALA_CLIENT_SECRET ? 'Set' : 'Not set');
  
  // Call the handler function
  console.log('Calling prokerala-proxy.js handler...');
  await prokeralaProxy(mockRequest, mockResponse);
  
  console.log('Test completed.');
  
  // If we got a token, test a real API endpoint
  if (mockResponse.body && mockResponse.body.access_token) {
    console.log('Testing a real API endpoint with the token...');
    try {
      const token = mockResponse.body.access_token;
      const response = await axios({
        method: 'GET',
        url: 'https://api.prokerala.com/v2/astrology/planet-position',
        params: {
          datetime: '2023-01-01 12:00:00',
          coordinates: '10.214747,78.097626',
          ayanamsa: 1
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('API endpoint test successful!');
      console.log('Response status:', response.status);
      console.log('Response data:', JSON.stringify(response.data, null, 2).substring(0, 200) + '...');
    } catch (error) {
      console.error('API endpoint test failed:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
    }
  }
}

runTest().catch(error => {
  console.error('Test error:', error);
});

// Simple diagnostic test script for API endpoints

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
  'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
};

// Main handler function with basic diagnostics
export default async function handler(req, res) {
  try {
    // Return diagnostic information
    return res.status(200).set(corsHeaders).json({
      status: 'ok',
      message: 'Diagnostic endpoint is operational',
      request: {
        method: req.method,
        url: req.url,
        path: req.path,
        query: req.query,
        headers: req.headers,
        body: req.method === 'POST' ? req.body : undefined
      },
      environment: {
        node_env: process.env.NODE_ENV,
        vercel_env: process.env.VERCEL_ENV,
        together_api_key_available: !!process.env.TOGETHER_API_KEY,
        vite_together_api_key_available: !!process.env.VITE_TOGETHER_API_KEY
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Diagnostic error:', error);
    return res.status(500).set(corsHeaders).json({
      status: 'error',
      message: error.message,
      stack: error.stack
    });
  }
}
