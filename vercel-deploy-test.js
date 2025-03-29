// Test script for Vercel deployment of Claude API
import axios from 'axios';

const BASE_URL = 'https://astroworld-delta.vercel.app';
const CLAUDE_API_KEY = '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';

async function testClaudeAPI() {
  console.log('Testing Claude API integration on Vercel deployment');
  console.log('------------------------------------------------');
  
  try {
    // Test health endpoint
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/api/claude/health`);
    console.log('Health status:', healthResponse.data);
    
    // Test diagnostic endpoint
    console.log('\n2. Testing diagnostic endpoint...');
    const diagnosticResponse = await axios.get(`${BASE_URL}/api/diagnostic`);
    console.log('API Key availability:');
    console.log('- Claude API key present:', diagnosticResponse.data.environment.claude_api_key === 'present');
    console.log('- VITE_Claude API key present:', diagnosticResponse.data.environment.vite_claude_api_key === 'present');
    
    // Test API with simple request
    console.log('\n3. Testing Claude API endpoint with simple request...');
    const apiResponse = await axios.post(
      `${BASE_URL}/api/claude/chat`,
      {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          {
            role: 'system',
            content: 'You are an expert astrologer.'
          },
          {
            role: 'user',
            content: 'What does it mean if my sun sign is Aries and my moon sign is Cancer?'
          }
        ],
        temperature: 0.7,
        max_tokens: 300
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Claude-API-Key': CLAUDE_API_KEY
        }
      }
    );
    
    console.log('API response received successfully!');
    console.log('Response model:', apiResponse.data.model);
    console.log('Response excerpt:');
    
    const content = apiResponse.data.choices[0].message.content;
    console.log(content.substring(0, 150) + '...');
    console.log('\nToken usage:', apiResponse.data.usage);
    
    // Test Together endpoint with Claude backend
    console.log('\n4. Testing /api/together/chat endpoint (with Claude backend)...');
    const togetherResponse = await axios.post(
      `${BASE_URL}/api/together/chat`,
      {
        model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
        messages: [
          {
            role: 'system',
            content: 'You are an expert astrologer.'
          },
          {
            role: 'user',
            content: 'What does it mean if my sun sign is Libra and my moon sign is Gemini?'
          }
        ],
        temperature: 0.7,
        max_tokens: 300
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Claude-API-Key': CLAUDE_API_KEY
        }
      }
    );
    
    console.log('Together-to-Claude response received successfully!');
    console.log('Response model:', togetherResponse.data.model);
    console.log('Response excerpt:');
    
    const togetherContent = togetherResponse.data.choices[0].message.content;
    console.log(togetherContent.substring(0, 150) + '...');
    console.log('\nToken usage:', togetherResponse.data.usage);
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.log('\n❌ Test failed:');
    console.error('Error:', error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the tests
testClaudeAPI(); 