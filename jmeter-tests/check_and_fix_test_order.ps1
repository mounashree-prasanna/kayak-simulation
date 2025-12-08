# Check test results and verify response times are in correct order
param(
    [string]$ResultsDir = "results",
    [string]$SummaryFile = "charts/summary_report.json"
)

Write-Host "`nChecking test results order..." -ForegroundColor Cyan

if (-not (Test-Path $SummaryFile)) {
    Write-Host "[ERROR] Summary file not found: $SummaryFile" -ForegroundColor Red
    Write-Host "Run generate_comparison_charts.py first to generate summary" -ForegroundColor Yellow
    exit 1
}

$summary = Get-Content $SummaryFile | ConvertFrom-Json

$results = @{}
foreach ($combo in $summary.combinations) {
    $key = $combo.combination
    $results[$key] = $combo.avg_response_time
}

Write-Host "`nCurrent Average Response Times:" -ForegroundColor Yellow
Write-Host "BASE: $($results['BASE'])ms" -ForegroundColor White
Write-Host "BASE_REDIS: $($results['BASE_REDIS'])ms" -ForegroundColor White  
Write-Host "BASE_REDIS_KAFKA: $($results['BASE_REDIS_KAFKA'])ms" -ForegroundColor White
Write-Host "ALL_OPTIMIZATIONS: $($results['ALL_OPTIMIZATIONS'])ms" -ForegroundColor White

# Check if order is correct: B > B+S > B+S+K > B+S+K+Y
$base = $results['BASE']
$baseRedis = $results['BASE_REDIS']
$baseRedisKafka = $results['BASE_REDIS_KAFKA']
$allOpts = $results['ALL_OPTIMIZATIONS']

$correctOrder = ($base -gt $baseRedis) -and ($baseRedis -gt $baseRedisKafka) -and ($baseRedisKafka -gt $allOpts)

Write-Host "`nOrder Check:" -ForegroundColor Cyan
Write-Host "B > B+S: $($base -gt $baseRedis) ($base > $baseRedis)" -ForegroundColor $(if ($base -gt $baseRedis) { "Green" } else { "Red" })
Write-Host "B+S > B+S+K: $($baseRedis -gt $baseRedisKafka) ($baseRedis > $baseRedisKafka)" -ForegroundColor $(if ($baseRedis -gt $baseRedisKafka) { "Green" } else { "Red" })
Write-Host "B+S+K > B+S+K+Y: $($baseRedisKafka -gt $allOpts) ($baseRedisKafka > $allOpts)" -ForegroundColor $(if ($baseRedisKafka -gt $allOpts) { "Green" } else { "Red" })

if ($correctOrder) {
    Write-Host "`n[SUCCESS] Response times are in correct decreasing order!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n[WARNING] Response times are NOT in correct order. Need to optimize." -ForegroundColor Yellow
    exit 1
}

