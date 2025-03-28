#!/bin/bash

# Script to test the Claude API implementation

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API URL - change if testing against a deployed version
API_URL="http://localhost:5176"

# Print header
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}       Claude API Test Script           ${NC}"
echo -e "${BLUE}========================================${NC}"

# Check if environment variables are set
if [ -z "$VITE_CLAUDE_API_KEY" ]; then
  echo -e "${RED}VITE_CLAUDE_API_KEY is not set. Please set it before running this script.${NC}"
  exit 1
fi

# Test Claude API endpoint with a simple astrological query
echo -e "\n${BLUE}Testing Claude API with an astrological query...${NC}"

response=$(curl -s -X POST "$API_URL/api/claude/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "messages": [
      {
        "role": "system",
        "content": "You are an expert Vedic astrologer."
      },
      {
        "role": "user",
        "content": "What does it mean to have Sun in Leo and Moon in Pisces?"
      }
    ],
    "temperature": 0.7,
    "max_tokens": 1000
  }')

# Check if response is valid JSON
if jq -e . >/dev/null 2>&1 <<< "$response"; then
  echo -e "${GREEN}Response is valid JSON${NC}"
  
  # Extract and display content
  content=$(echo "$response" | jq -r '.choices[0].message.content')
  
  echo -e "\n${BLUE}Response excerpt:${NC}"
  echo -e "${GREEN}$(echo "$content" | head -n 5)...${NC}"
  echo -e "\n${BLUE}Full content length:${NC} $(echo "$content" | wc -c) characters"
  
  # Check for API keys in the response (security check)
  if echo "$response" | grep -i "sk-ant-api"; then
    echo -e "${RED}WARNING: API key might be exposed in the response!${NC}"
  else
    echo -e "${GREEN}No API key exposure detected${NC}"
  fi
  
  # Check usage stats
  echo -e "\n${BLUE}Token usage:${NC}"
  echo "$response" | jq '.usage'
else
  echo -e "${RED}Invalid JSON response:${NC}"
  echo "$response"
fi

# Test health endpoint
echo -e "\n${BLUE}Testing health endpoint...${NC}"
health_response=$(curl -s "$API_URL/api/claude/health")

# Check if health response is valid JSON
if jq -e . >/dev/null 2>&1 <<< "$health_response"; then
  echo -e "${GREEN}Health endpoint response is valid JSON${NC}"
  echo "$health_response" | jq .
else
  echo -e "${RED}Invalid health endpoint response:${NC}"
  echo "$health_response"
fi

echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}       Test Script Completed           ${NC}"
echo -e "${BLUE}========================================${NC}" 