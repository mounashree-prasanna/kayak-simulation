# PowerShell script to get test data from API
Write-Host "Fetching test data from API..." -ForegroundColor Cyan

# Get a user
Write-Host "`nFetching users..." -ForegroundColor Yellow
$usersResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/users" -Method GET -ErrorAction SilentlyContinue

if ($usersResponse -and $usersResponse.data -and $usersResponse.data.Count -gt 0) {
    $user = $usersResponse.data[0]
    $userId = $user.user_id
    Write-Host "Found User ID: $userId" -ForegroundColor Green
} else {
    # Try to get a specific user
    try {
        $userResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/users/376-11-8477" -Method GET
        $userId = $userResponse.data.user_id
        Write-Host "Found User ID: $userId" -ForegroundColor Green
    } catch {
        $userId = "376-11-8477"
        Write-Host "Using default User ID: $userId" -ForegroundColor Yellow
    }
}

# Get a flight
Write-Host "`nFetching flights..." -ForegroundColor Yellow
try {
    $flightResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/flights/search?origin=JFK&destination=BOS&page=1&limit=1" -Method GET
    if ($flightResponse -and $flightResponse.data -and $flightResponse.data.Count -gt 0) {
        $flightId = $flightResponse.data[0].flight_id
        Write-Host "Found Flight ID: $flightId" -ForegroundColor Green
    } else {
        $flightId = "SP0001"
        Write-Host "Using default Flight ID: $flightId" -ForegroundColor Yellow
    }
} catch {
    $flightId = "SP0001"
    Write-Host "Using default Flight ID: $flightId" -ForegroundColor Yellow
}

# Get a hotel
Write-Host "`nFetching hotels..." -ForegroundColor Yellow
try {
    $hotelResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/hotels/search?city=New York&page=1&limit=1" -Method GET
    if ($hotelResponse -and $hotelResponse.data -and $hotelResponse.data.Count -gt 0) {
        $hotelId = $hotelResponse.data[0].hotel_id
        Write-Host "Found Hotel ID: $hotelId" -ForegroundColor Green
    } else {
        $hotelId = "HOTEL000001"
        Write-Host "Using default Hotel ID: $hotelId" -ForegroundColor Yellow
    }
} catch {
    $hotelId = "HOTEL000001"
    Write-Host "Using default Hotel ID: $hotelId" -ForegroundColor Yellow
}

# Get a car
Write-Host "`nFetching cars..." -ForegroundColor Yellow
try {
    $carResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/cars/search?city=Los Angeles&page=1&limit=1" -Method GET
    if ($carResponse -and $carResponse.data -and $carResponse.data.Count -gt 0) {
        $carId = $carResponse.data[0].car_id
        Write-Host "Found Car ID: $carId" -ForegroundColor Green
    } else {
        $carId = "CAR000001"
        Write-Host "Using default Car ID: $carId" -ForegroundColor Yellow
    }
} catch {
    $carId = "CAR000001"
    Write-Host "Using default Car ID: $carId" -ForegroundColor Yellow
}

# Output JSON
$testData = @{
    user_id = $userId
    flight_id = $flightId
    hotel_id = $hotelId
    car_id = $carId
} | ConvertTo-Json

Write-Host "`n=== Test Data ===" -ForegroundColor Cyan
Write-Host $testData

# Save to file
$testData | Out-File -FilePath "test_data.json" -Encoding utf8
Write-Host "`nSaved to test_data.json" -ForegroundColor Green

return $testData

