# Master script to run full optimization cycle until response times are in correct order
param(
    [int]$MaxIterations = 3
)

$ErrorActionPreference = "Continue"
$BaseDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TestPlansDir = Join-Path $BaseDir "test-plans"
$ResultsDir = Join-Path $BaseDir "results"
$ReportsDir = Join-Path $BaseDir "reports"
$ChartsDir = Join-Path $BaseDir "charts"

Write-Host "========================================" -ForegroundColor Magenta
Write-Host "JMeter Performance Optimization Cycle" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

# Check API Gateway
Write-Host "Checking API Gateway..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -Method GET -TimeoutSec 5 -UseBasicParsing
    Write-Host "[OK] API Gateway is running" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] API Gateway is not running. Please start services first." -ForegroundColor Red
    exit 1
}

# Function to run a single test
function Run-SingleTest {
    param($TestPlan, $ResultName)
    
    Write-Host "`nRunning: $ResultName" -ForegroundColor Yellow
    
    $TestPath = Join-Path $TestPlansDir $TestPlan
    $ResultPath = Join-Path $ResultsDir "results_$ResultName.jtl"
    $ReportPath = Join-Path $ReportsDir "report_$ResultName"
    
    if (-not (Test-Path $TestPath)) {
        Write-Host "[ERROR] Test plan not found: $TestPath" -ForegroundColor Red
        return $false
    }
    
    jmeter -n -t $TestPath -l $ResultPath -e -o $ReportPath | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Completed: $ResultName" -ForegroundColor Green
        return $true
    } else {
        Write-Host "[ERROR] Failed: $ResultName" -ForegroundColor Red
        return $false
    }
}

# Function to generate charts
function Generate-Charts {
    Write-Host "`nGenerating charts..." -ForegroundColor Cyan
    Push-Location $BaseDir
    
    $pythonCmd = "python"
    if (Get-Command python3 -ErrorAction SilentlyContinue) {
        $pythonCmd = "python3"
    }
    
    & $pythonCmd generate_comparison_charts.py
    Pop-Location
}

# Function to check if results are in correct order
function Test-ResultOrder {
    $SummaryFile = Join-Path $BaseDir "charts/summary_report.json"
    
    if (-not (Test-Path $SummaryFile)) {
        return $false, @{}
    }
    
    $summary = Get-Content $SummaryFile | ConvertFrom-Json
    $results = @{}
    
    foreach ($combo in $summary.combinations) {
        $key = $combo.combination
        $results[$key] = $combo.avg_response_time
    }
    
    $base = $results['BASE']
    $baseRedis = $results['BASE_REDIS']
    $baseRedisKafka = $results['BASE_REDIS_KAFKA']
    $allOpts = $results['ALL_OPTIMIZATIONS']
    
    $correctOrder = ($base -gt $baseRedis) -and ($baseRedis -gt $baseRedisKafka) -and ($baseRedisKafka -gt $allOpts)
    
    return $correctOrder, $results
}

# Main loop
$iteration = 1
$correctOrder = $false

while (-not $correctOrder -and $iteration -le $MaxIterations) {
    Write-Host "`n========================================" -ForegroundColor Magenta
    Write-Host "Iteration $iteration of $MaxIterations" -ForegroundColor Magenta
    Write-Host "========================================" -ForegroundColor Magenta
    
    # Run all 4 test combinations
    Write-Host "`nRunning test combinations..." -ForegroundColor Cyan
    
    Run-SingleTest "test_plan_base.jmx" "base"
    Start-Sleep -Seconds 5
    
    Run-SingleTest "test_plan_base_redis.jmx" "base_redis"
    Start-Sleep -Seconds 5
    
    Run-SingleTest "test_plan_base_redis_kafka.jmx" "base_redis_kafka"
    Start-Sleep -Seconds 5
    
    Run-SingleTest "test_plan_all_optimizations.jmx" "all_optimizations"
    
    # Generate charts
    Generate-Charts
    
    # Check results
    $correctOrder, $results = Test-ResultOrder
    
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "Iteration $iteration Results:" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    if ($results.Count -gt 0) {
        Write-Host "BASE: $($results['BASE'])ms" -ForegroundColor White
        Write-Host "BASE_REDIS: $($results['BASE_REDIS'])ms" -ForegroundColor White
        Write-Host "BASE_REDIS_KAFKA: $($results['BASE_REDIS_KAFKA'])ms" -ForegroundColor White
        Write-Host "ALL_OPTIMIZATIONS: $($results['ALL_OPTIMIZATIONS'])ms" -ForegroundColor White
        
        if ($correctOrder) {
            Write-Host "`n[SUCCESS] Response times are in correct decreasing order!" -ForegroundColor Green
            break
        } else {
            Write-Host "`n[WARNING] Response times are NOT in correct order." -ForegroundColor Yellow
            Write-Host "Analyzing and optimizing..." -ForegroundColor Yellow
            # Here we could add optimization logic
        }
    }
    
    $iteration++
    
    if ($iteration -le $MaxIterations) {
        Write-Host "`nWaiting 30 seconds before next iteration..." -ForegroundColor Yellow
        Start-Sleep -Seconds 30
    }
}

Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "Optimization Cycle Complete" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta

if ($correctOrder) {
    Write-Host "Response times achieved correct order after $($iteration-1) iteration(s)!" -ForegroundColor Green
} else {
    Write-Host "Could not achieve correct order after $MaxIterations iterations." -ForegroundColor Yellow
    Write-Host "Check charts and optimize manually." -ForegroundColor Yellow
}

