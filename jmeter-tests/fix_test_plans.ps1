# Fix all test plans to achieve 100% success rate
$ErrorActionPreference = "Continue"

$testPlansDir = "test-plans"
$testPlans = @(
    "test_plan_base.jmx",
    "test_plan_base_redis.jmx",
    "test_plan_base_redis_kafka.jmx",
    "test_plan_all_optimizations.jmx"
)

Write-Host "Fixing test plans to achieve 100% success rate..." -ForegroundColor Cyan

foreach ($testPlan in $testPlans) {
    $filePath = Join-Path $testPlansDir $testPlan
    if (-not (Test-Path $filePath)) {
        Write-Host "[SKIP] File not found: $filePath" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "`nFixing: $testPlan" -ForegroundColor Yellow
    $content = Get-Content $filePath -Raw -Encoding UTF8
    
    # 1. Add date parameter to Flight Search
    if ($content -match 'Flight Search.*destination.*BOS.*</elementProp>') {
        $content = $content -replace '(?s)(<elementProp name="destination".*?</elementProp>)', "`$1`n              <elementProp name=`"date`" elementType=`"HTTPArgument`">`n                <boolProp name=`"HTTPArgument.always_encode`">false</boolProp>`n                <stringProp name=`"Argument.value`">2025-12-08</stringProp>`n                <stringProp name=`"Argument.metadata`">=</stringProp>`n              </elementProp>"
        Write-Host "  ✓ Added date parameter to Flight Search" -ForegroundColor Green
    }
    
    # 2. Use different booking IDs that don't conflict
    # Generate random booking IDs in the test plan itself using JMeter variables
    # This will be handled by using JSON extractor to get booking_id from create response
    
    # 3. Make Get Booking use extracted booking_id from Create Booking
    # This requires JSON Extractor - we'll add it after Create Booking
    
    # Save
    Set-Content -Path $filePath -Value $content -Encoding UTF8 -NoNewline
    Write-Host "  ✓ Updated" -ForegroundColor Green
}

Write-Host "`nTest plans updated!" -ForegroundColor Cyan

