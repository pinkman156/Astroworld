# Test script for the Prokerala API proxy
# Usage: .\test-proxy.ps1 [prod]

# Determine if we're testing against production or local
if ($args[0] -eq "prod") {
    $BASE_URL = "https://astroworld-rm6trlptb-pinkman156s-projects.vercel.app"
} else {
    $BASE_URL = "http://localhost:5174"
}

Write-Host "Testing proxy against: $BASE_URL"

# Test the token endpoint
Write-Host "1. Testing token endpoint..."
try {
    $tokenResponse = Invoke-RestMethod -Uri "$BASE_URL/api/proxy/token" -Method Post -ErrorAction Stop
    
    if ($tokenResponse.access_token) {
        Write-Host "✅ Successfully obtained token"
        $token = $tokenResponse.access_token
        
        # Test planet position endpoint
        Write-Host "2. Testing planet-position endpoint..."
        try {
            $planetResponse = Invoke-RestMethod -Uri "$BASE_URL/api/proxy/planet-position" `
                -Method Get `
                -Headers @{ Authorization = "Bearer $token" } `
                -Body @{
                    datetime = "2000-01-01T12:00:00+05:30"
                    coordinates = "28.6139,77.2090"
                    ayanamsa = 1
                } `
                -ErrorAction Stop
            
            if ($planetResponse.data) {
                Write-Host "✅ Successfully retrieved planet positions"
                
                # Test birth chart endpoint
                Write-Host "3. Testing birth-chart endpoint..."
                try {
                    $birthChartResponse = Invoke-RestMethod -Uri "$BASE_URL/api/chart/birth" `
                        -Method Post `
                        -ContentType "application/json" `
                        -Body @{
                            date = "2000-01-01"
                            time = "12:00"
                            place = "New Delhi"
                            name = "Test User"
                        } | ConvertTo-Json `
                        -ErrorAction Stop
                    
                    if ($birthChartResponse.success) {
                        Write-Host "✅ Successfully retrieved birth chart"
                        Write-Host "🎉 All tests passed! The proxy is working correctly."
                    } else {
                        Write-Host "❌ Failed to get birth chart" -ForegroundColor Red
                        $birthChartResponse | ConvertTo-Json -Depth 3
                    }
                } catch {
                    Write-Host "❌ Error testing birth chart endpoint: $_" -ForegroundColor Red
                    Write-Host $_.Exception.Response
                }
            } else {
                Write-Host "❌ Failed to get planet data" -ForegroundColor Red
                $planetResponse | ConvertTo-Json -Depth 3
            }
        } catch {
            Write-Host "❌ Error testing planet position endpoint: $_" -ForegroundColor Red
            Write-Host $_.Exception.Response
        }
    } else {
        Write-Host "❌ No access token in response" -ForegroundColor Red
        $tokenResponse | ConvertTo-Json
    }
} catch {
    Write-Host "❌ Error testing token endpoint: $_" -ForegroundColor Red
    Write-Host $_.Exception.Response
} 