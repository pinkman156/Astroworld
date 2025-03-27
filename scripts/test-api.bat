@echo off
:: Astroworld API Test Script for Windows
:: This script tests all API endpoints and reports any issues

:: Configuration
set API_URL=http://localhost:5176

echo =====================================
echo Astroworld API Endpoint Test Script
echo =====================================

:: Test 1: Geocoding API
echo.
echo Testing: Geocoding API
curl -s -X GET "%API_URL%/api/geocode?q=New%%20York"
echo.
echo -------------------------

:: Test 2: Prokerala Token API
echo.
echo Testing: Prokerala Token API
curl -s -X POST "%API_URL%/api/prokerala-proxy/token" -H "Content-Type: application/json" -d "{}"
echo.
echo -------------------------

:: Get token for authenticated requests (this is more complex in batch, basic implementation)
echo.
echo Getting token for authenticated requests...
for /f "delims=" %%i in ('curl -s -X POST "%API_URL%/api/prokerala-proxy/token"') do set TOKEN_RESPONSE=%%i
echo Token response: %TOKEN_RESPONSE%
echo.
echo -------------------------

:: Test 3: Together AI Chat API
echo.
echo Testing: Together AI Chat API
curl -s -X POST "%API_URL%/api/together/chat" -H "Content-Type: application/json" -d "{\"model\":\"mistralai/Mixtral-8x7B-Instruct-v0.1\",\"messages\":[{\"role\":\"system\",\"content\":\"You are an expert Vedic astrologer.\"},{\"role\":\"user\",\"content\":\"Generate a brief astrological reading for someone born on January 1, 1990.\"}],\"temperature\":0.7,\"max_tokens\":100}"
echo.
echo -------------------------

echo.
echo =====================================
echo Test Summary
echo =====================================
echo All tests completed. Check the results above for any failures.
echo If any tests failed, check the API server logs for more information.

pause 