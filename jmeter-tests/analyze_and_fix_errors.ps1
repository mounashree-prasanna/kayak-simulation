# Analyze errors and provide fix recommendations
$ErrorActionPreference = "Continue"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Error Analysis Report" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$summaryFile = "charts/summary_report.json"
if (-not (Test-Path $summaryFile)) {
    Write-Host "[ERROR] Summary file not found. Run tests first." -ForegroundColor Red
    exit 1
}

$summary = Get-Content $summaryFile | ConvertFrom-Json

Write-Host "`nCurrent Results:" -ForegroundColor Yellow
foreach ($combo in $summary.combinations) {
    Write-Host "`n$($combo.combination):" -ForegroundColor Cyan
    Write-Host "  Avg Response Time: $([math]::Round($combo.avg_response_time, 2))ms" -ForegroundColor White
    Write-Host "  Success Rate: $([math]::Round($combo.success_rate, 2))%" -ForegroundColor White
    Write-Host "  Error Rate: $([math]::Round($combo.error_rate, 2))%" -ForegroundColor $(if ($combo.error_rate -gt 30) { "Red" } else { "Green" })
    Write-Host "  Error Breakdown:" -ForegroundColor White
    Write-Host "    - 400 Bad Request: $($combo.error_400)" -ForegroundColor Yellow
    Write-Host "    - 401 Unauthorized: $($combo.error_401)" -ForegroundColor Yellow
    Write-Host "    - 404 Not Found: $($combo.error_404)" -ForegroundColor Yellow
    Write-Host "    - 409 Conflict: $($combo.error_409)" -ForegroundColor Yellow
    Write-Host "    - 500 Server Error: $($combo.error_500)" -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Key Issues:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`n1. High error rates are skewing average response times" -ForegroundColor Yellow
Write-Host "   - Failed requests (400/404) return quickly, making averages misleading" -ForegroundColor White
Write-Host "   - Solution: Calculate metrics on successful requests only" -ForegroundColor Green

Write-Host "`n2. Response Time Order Check:" -ForegroundColor Yellow
$base = ($summary.combinations | Where-Object { $_.combination -eq "BASE" }).avg_response_time
$baseRedis = ($summary.combinations | Where-Object { $_.combination -eq "BASE_REDIS" }).avg_response_time
$baseRedisKafka = ($summary.combinations | Where-Object { $_.combination -eq "BASE_REDIS_KAFKA" }).avg_response_time
$allOpts = ($summary.combinations | Where-Object { $_.combination -eq "ALL_OPTIMIZATIONS" }).avg_response_time

Write-Host "   Current: B=$([math]::Round($base, 2))ms, B+S=$([math]::Round($baseRedis, 2))ms, B+S+K=$([math]::Round($baseRedisKafka, 2))ms, B+S+K+Y=$([math]::Round($allOpts, 2))ms" -ForegroundColor White
Write-Host "   Expected: B > B+S > B+S+K > B+S+K+Y (decreasing)" -ForegroundColor White

$orderCorrect = ($base -gt $baseRedis) -and ($baseRedis -gt $baseRedisKafka) -and ($baseRedisKafka -gt $allOpts)

if ($orderCorrect) {
    Write-Host "   Status: CORRECT ORDER ✓" -ForegroundColor Green
} else {
    Write-Host "   Status: INCORRECT ORDER ✗" -ForegroundColor Red
    Write-Host "   Action: Need to fix errors and optimize" -ForegroundColor Yellow
}

