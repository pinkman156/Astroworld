#!/bin/bash

# Astroworld API Test Script
# This script tests all API endpoints and reports any issues

# Configuration
API_URL="http://localhost:5176"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to display test status
function display_status() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}PASS${NC}: $2"
  else
    echo -e "${RED}FAIL${NC}: $2 (Status code: $1)"
  fi
}

# Function to make API request and handle response
function test_endpoint() {
  local method=$1
  local endpoint=$2
  local data=$3
  local auth_header=$4
  local description=$5

  echo -e "\n${YELLOW}Testing: ${description}${NC}"
  
  if [ "$method" = "GET" ]; then
    if [ -n "$auth_header" ]; then
      response=$(curl -s -w "%{http_code}" -X $method "$API_URL$endpoint" -H "$auth_header")
    else
      response=$(curl -s -w "%{http_code}" -X $method "$API_URL$endpoint")
    fi
  elif [ "$method" = "POST" ]; then
    if [ -n "$auth_header" ]; then
      response=$(curl -s -w "%{http_code}" -X $method "$API_URL$endpoint" -H "Content-Type: application/json" -H "$auth_header" -d "$data")
    else
      response=$(curl -s -w "%{http_code}" -X $method "$API_URL$endpoint" -H "Content-Type: application/json" -d "$data")
    fi
  fi
  
  status_code=${response: -3}
  if [[ $status_code =~ ^[0-9]+$ ]]; then
    response_body=${response:0:${#response}-3}
  else
    status_code="000"
    response_body=$response
  fi
  
  if [ "$status_code" -ge 200 ] && [ "$status_code" -lt 300 ]; then
    display_status 0 "$description"
  else
    display_status $status_code "$description"
  fi
  
  echo "Response body (truncated):"
  echo "${response_body:0:200}..."
  echo "-------------------------"
}

echo -e "${YELLOW}=====================================${NC}"
echo -e "${YELLOW}Astroworld API Endpoint Test Script${NC}"
echo -e "${YELLOW}=====================================${NC}"

# Test 1: Geocoding API
test_endpoint "GET" "/api/geocode?q=New%20York" "" "" "Geocoding API"

# Test 2: Prokerala Token API
test_endpoint "POST" "/api/prokerala-proxy/token" "{}" "" "Prokerala Token API"

# Get token for authenticated requests
token_response=$(curl -s -X POST "$API_URL/api/prokerala-proxy/token")
token=$(echo $token_response | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -n "$token" ]; then
  echo -e "\n${GREEN}Successfully obtained token for authenticated requests${NC}"
  auth_header="Authorization: Bearer $token"
  
  # Test 3: Planet Position API
  test_endpoint "GET" "/api/prokerala-proxy/planet-position?datetime=2023-01-01%2012:00:00&coordinates=40.7128,-74.0060&ayanamsa=1" "" "$auth_header" "Planet Position API"
  
  # Test 4: Kundli API
  test_endpoint "GET" "/api/prokerala-proxy/kundli?datetime=2023-01-01%2012:00:00&coordinates=40.7128,-74.0060&ayanamsa=1" "" "$auth_header" "Kundli API"
  
  # Test 5: Chart API
  test_endpoint "GET" "/api/prokerala-proxy/chart?datetime=2023-01-01%2012:00:00&coordinates=40.7128,-74.0060&ayanamsa=1" "" "$auth_header" "Chart API"
else
  echo -e "\n${RED}Failed to obtain token for authenticated requests${NC}"
fi

# Test 6: Together AI Chat API
together_ai_request='{
  "model": "mistralai/Mixtral-8x7B-Instruct-v0.1",
  "messages": [
    {
      "role": "system",
      "content": "You are an expert Vedic astrologer."
    },
    {
      "role": "user",
      "content": "Generate a brief astrological reading for someone born on January 1, 1990."
    }
  ],
  "temperature": 0.7,
  "max_tokens": 100
}'

test_endpoint "POST" "/api/together/chat" "$together_ai_request" "" "Together AI Chat API"

echo -e "\n${YELLOW}=====================================${NC}"
echo -e "${YELLOW}Test Summary${NC}"
echo -e "${YELLOW}=====================================${NC}"
echo -e "All tests completed. Check the results above for any failures."
echo -e "If any tests failed, check the API server logs for more information." 