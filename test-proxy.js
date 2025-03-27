/**
 * Test script to verify the Prokerala API proxy works
 * This script makes a request to our proxy endpoint to get a token
 */
import axios from 'axios';

// Check if we're running locally or against the deployed URL
const baseUrl = process.argv[2] === 'prod' 
  ? 'https://astroworld-nine.vercel.app'
  : 'http://localhost:5174';

console.log(`Testing proxy against: ${baseUrl}`);

// Test function that makes requests to our proxy endpoints
async function testProxy() {
  try {
    console.log('1. Testing token endpoint...');
    const tokenResponse = await axios({
      method: 'POST',
      url: `${baseUrl}/api/proxy/token`
    });
    
    if (tokenResponse.data && tokenResponse.data.access_token) {
      console.log('✅ Successfully obtained token');
      const token = tokenResponse.data.access_token;
      
      // Test planet position endpoint
      console.log('2. Testing planet-position endpoint...');
      const planetResponse = await axios({
        method: 'GET',
        url: `${baseUrl}/api/proxy/planet-position`,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          datetime: '2000-01-01T12:00:00+05:30',
          coordinates: '28.6139,77.2090', // New Delhi
          ayanamsa: 1
        }
      });
      
      if (planetResponse.data && !planetResponse.data.error) {
        console.log('✅ Successfully retrieved planet positions');
        console.log('🎉 All tests passed! The proxy is working correctly.');
      } else {
        console.error('❌ Failed to get planet positions:', planetResponse.data.error || 'Unknown error');
      }
    } else {
      console.error('❌ Failed to get token:', tokenResponse.data);
    }
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    
    // Show more detailed error information
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received. Is the server running?');
    }
  }
}

// Run the test
testProxy();

console.log('\nTo test against production, run: node test-proxy.js prod');
console.log('To test locally, run: node test-proxy.js'); 