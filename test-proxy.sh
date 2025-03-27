#!/bin/bash

# Test script for the Prokerala API proxy
# Usage: ./test-proxy.sh [prod|local]

# Determine if we're testing against production or local
if [ "$1" = "prod" ]; then
  BASE_URL="https://astroworld-rm6trlptb-pinkman156s-projects.vercel.app"
else
  BASE_URL="http://localhost:5174"
fi

echo "Testing proxy against: $BASE_URL"

# Test the token endpoint
echo "1. Testing token endpoint..."
TOKEN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/proxy/token")

# Check if we got a token
if echo "$TOKEN_RESPONSE" | grep -q "access_token"; then
  echo "✅ Successfully obtained token"
  
  # Extract the token
  TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
  
  # Test planet position endpoint
  echo "2. Testing planet-position endpoint..."
  PLANET_RESPONSE=$(curl -s -X GET "$BASE_URL/api/proxy/planet-position" \
    -H "Authorization: Bearer $TOKEN" \
    --data-urlencode "datetime=2000-01-01T12:00:00+05:30" \
    --data-urlencode "coordinates=28.6139,77.2090" \
    --data-urlencode "ayanamsa=1")
  
  # Check if we got planet data
  if echo "$PLANET_RESPONSE" | grep -q "planets"; then
    echo "✅ Successfully retrieved planet positions"
    
    # Test birth chart endpoint
    echo "3. Testing birth-chart endpoint..."
    BIRTH_CHART_RESPONSE=$(curl -s -X POST "$BASE_URL/api/chart/birth" \
      -H "Content-Type: application/json" \
      -d '{
        "date": "2000-01-01",
        "time": "12:00",
        "place": "New Delhi",
        "name": "Test User"
      }')
    
    if echo "$BIRTH_CHART_RESPONSE" | grep -q "success"; then
      echo "✅ Successfully retrieved birth chart"
      echo "🎉 All tests passed! The proxy is working correctly."
    else
      echo "❌ Failed to get birth chart:"
      echo "$BIRTH_CHART_RESPONSE"
    fi
  else
    echo "❌ Failed to get planet positions:"
    echo "$PLANET_RESPONSE"
  fi
else
  echo "❌ Failed to get token:"
  echo "$TOKEN_RESPONSE"
fi 