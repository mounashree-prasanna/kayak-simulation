# Full test cycle: Run all JMeter tests and generate charts
$ErrorActionPreference = "Continue"

$BaseDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TestPlansDir = Join-Path $BaseDir "test-plans"
$ResultsDir = Join-Path $BaseDir "results"
$ReportsDir = Join-Path $BaseDir "reports"
$ChartsDir = Join-Path $BaseDir "charts"

# Create directories
New-Item -ItemType Directory -Force -Path $ResultsDir | Out-Null
New-Item -ItemType Directory -Force -Path $ReportsDir | Out-Null
New-Item -ItemType Directory -Force -Path $ChartsDir | Out-Null

# Check API Gateway
Write-Host "`nChecking API Gateway..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -Method GET -TimeoutSec 5 -UseBasicParsing
    Write-Host "[OK] API Gateway is running" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] API Gateway is not running. Please start services first." -ForegroundColor Red
    exit 1
}

# Function to run test
function Run-Test {
    param($TestPlan, $ResultName)
    
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "Running: $ResultName" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    $TestPath = Join-Path $TestPlansDir $TestPlan
    $ResultPath = Join-Path $ResultsDir "results_$ResultName.jtl"
    $ReportPath = Join-Path $ReportsDir "report_$ResultName"
    
    if (-not (Test-Path $TestPath)) {
        Write-Host "[ERROR] Test plan not found: $TestPath" -ForegroundColor Red
        return $false
    }
    
    Write-Host "Test Plan: $TestPlan" -ForegroundColor Yellow
    Write-Host "Results: $ResultPath" -ForegroundColor Yellow
    Write-Host "Report: $ReportPath" -ForegroundColor Yellow
    Write-Host ""
    
    jmeter -n -t $TestPath -l $ResultPath -e -o $ReportPath
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Completed: $ResultName" -ForegroundColor Green
        return $true
    } else {
        Write-Host "[ERROR] Failed: $ResultName (Exit Code: $LASTEXITCODE)" -ForegroundColor Red
        return $false
    }
}

# Run all combinations
Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "Starting all 4 test combinations..." -ForegroundColor Magenta
Write-Host "This will take several minutes..." -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

$allSuccess = $true

# Combination 1: BASE
Write-Host "Combination 1: BASE (No Optimizations)" -ForegroundColor Yellow
$allSuccess = $allSuccess -and (Run-Test "test_plan_base.jmx" "base")
Start-Sleep -Seconds 5

# Combination 2: BASE + REDIS
Write-Host "`nCombination 2: BASE + REDIS (SQL Caching)" -ForegroundColor Yellow
$allSuccess = $allSuccess -and (Run-Test "test_plan_base_redis.jmx" "base_redis")
Start-Sleep -Seconds 5

# Combination 3: BASE + REDIS + KAFKA
Write-Host "`nCombination 3: BASE + REDIS + KAFKA (Caching + Messaging)" -ForegroundColor Yellow
$allSuccess = $allSuccess -and (Run-Test "test_plan_base_redis_kafka.jmx" "base_redis_kafka")
Start-Sleep -Seconds 5

# Combination 4: ALL OPTIMIZATIONS
Write-Host "`nCombination 4: ALL OPTIMIZATIONS" -ForegroundColor Yellow
$allSuccess = $allSuccess -and (Run-Test "test_plan_all_optimizations.jmx" "all_optimizations")

# Generate charts
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Generating comparison charts..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($allSuccess) {
    Write-Host "[OK] All tests completed successfully!" -ForegroundColor Green
    Write-Host "`nGenerating charts..." -ForegroundColor Yellow
    
    # Check if Python is available
    $pythonCmd = "python"
    if (Get-Command python3 -ErrorAction SilentlyContinue) {
        $pythonCmd = "python3"
    }
    
    Push-Location $BaseDir
    & $pythonCmd generate_comparison_charts.py
    Pop-Location
    
    Write-Host "`nCharts generated in: $ChartsDir" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Some tests failed. Check output above." -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Test Cycle Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

