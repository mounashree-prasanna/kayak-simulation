# Script to update JMeter test plans with real IDs
param(
    [string]$UserId = "376-11-8477",
    [string]$FlightId = "DE1553",
    [string]$HotelId = "HOTEL002786",
    [string]$CarId = "CAR001729"
)

$testPlans = @(
    "test-plans/test_plan_base.jmx",
    "test-plans/test_plan_base_redis.jmx",
    "test-plans/test_plan_base_redis_kafka.jmx",
    "test-plans/test_plan_all_optimizations.jmx"
)

# Calculate dates (use future dates for bookings)
$startDate = (Get-Date).AddDays(30).ToString("yyyy-MM-ddTHH:mm:ssZ")
$endDate = (Get-Date).AddDays(31).ToString("yyyy-MM-ddTHH:mm:ssZ")

Write-Host "Updating test plans with real IDs..." -ForegroundColor Cyan
Write-Host "User ID: $UserId" -ForegroundColor Yellow
Write-Host "Flight ID: $FlightId" -ForegroundColor Yellow
Write-Host "Hotel ID: $HotelId" -ForegroundColor Yellow
Write-Host "Car ID: $CarId" -ForegroundColor Yellow

foreach ($testPlan in $testPlans) {
    $filePath = Join-Path $PSScriptRoot $testPlan
    if (Test-Path $filePath) {
        Write-Host "`nUpdating $testPlan..." -ForegroundColor Green
        $content = Get-Content $filePath -Raw -Encoding UTF8
        
        # Update user IDs
        $content = $content -replace '376-11-8477', $UserId
        $content = $content -replace '123-45-6789', $UserId
        $content = $content -replace '999-99-9999', $UserId
        
        # Update flight IDs
        $content = $content -replace 'SP0001', $FlightId
        $content = $content -replace 'FL001', $FlightId
        
        # Update hotel IDs  
        $content = $content -replace 'HOTEL000001', $HotelId
        
        # Update car IDs
        $content = $content -replace 'CAR000001', $CarId
        
        # Update booking IDs
        $content = $content -replace 'BK000001', "BK$(Get-Random -Minimum 100000 -Maximum 999999)"
        
        # Update dates to future dates
        $oldDatePattern = '2024-12-25T08:00:00Z'
        if ($content -match $oldDatePattern) {
            $content = $content -replace $oldDatePattern, $startDate
        }
        
        $oldEndDatePattern = '2024-12-25T11:30:00Z'
        if ($content -match $oldEndDatePattern) {
            $content = $content -replace $oldEndDatePattern, $endDate
        }
        
        # Save updated content
        Set-Content -Path $filePath -Value $content -Encoding UTF8 -NoNewline
        Write-Host "  Updated successfully" -ForegroundColor Green
    } else {
        Write-Host "  File not found: $filePath" -ForegroundColor Red
    }
}

Write-Host "`nAll test plans updated!" -ForegroundColor Cyan

