#!/bin/bash

# Generate Summary Report from JMeter Results
# Extracts key metrics from all 4 test combinations

BASE_DIR=$(pwd)
RESULTS_DIR="${BASE_DIR}/jmeter/results"
REPORTS_DIR="${BASE_DIR}/jmeter/reports"
SUMMARY_FILE="${BASE_DIR}/jmeter/PERFORMANCE_TEST_SUMMARY.md"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Generating Performance Test Summary Report...${NC}"
echo ""

# Function to extract metrics from JTL file
extract_metrics() {
    local jtl_file=$1
    local combination_name=$2
    
    if [ ! -f "$jtl_file" ]; then
        echo "| $combination_name | N/A | N/A | N/A | N/A | N/A | N/A |" >> "$SUMMARY_FILE"
        return
    fi
    
    # Use JMeter to generate CSV summary
    local csv_file="${jtl_file%.jtl}.csv"
    
    # Extract using awk (basic parsing)
    local total_samples=$(grep -c "^[0-9]" "$jtl_file" 2>/dev/null || echo "0")
    local errors=$(grep -c ",false," "$jtl_file" 2>/dev/null || echo "0")
    local error_rate="0"
    
    if [ "$total_samples" -gt 0 ]; then
        error_rate=$(echo "scale=2; $errors * 100 / $total_samples" | bc)
    fi
    
    # Try to get average response time from JMeter HTML report if available
    local avg_time="N/A"
    local throughput="N/A"
    local p95_time="N/A"
    
    # Check if HTML report exists and extract from there
    local report_dir=""
    case "$combination_name" in
        "BASE")
            report_dir="${REPORTS_DIR}/report_base"
            ;;
        "BASE + REDIS")
            report_dir="${REPORTS_DIR}/report_redis"
            ;;
        "BASE + REDIS + KAFKA")
            report_dir="${REPORTS_DIR}/report_kafka"
            ;;
        "ALL OPTIMIZATIONS")
            report_dir="${REPORTS_DIR}/report_all"
            ;;
    esac
    
    if [ -f "${report_dir}/statistics.json" ]; then
        # Extract from statistics.json if available
        avg_time=$(jq -r '.Total.statistics.mean' "${report_dir}/statistics.json" 2>/dev/null | head -1 || echo "N/A")
        throughput=$(jq -r '.Total.statistics.throughput' "${report_dir}/statistics.json" 2>/dev/null | head -1 || echo "N/A")
        p95_time=$(jq -r '.Total.statistics.pct1.ResMean' "${report_dir}/statistics.json" 2>/dev/null | head -1 || echo "N/A")
    fi
    
    echo "| $combination_name | $total_samples | $avg_time | $p95_time | $throughput | $error_rate% | $errors |" >> "$SUMMARY_FILE"
}

# Create summary report
cat > "$SUMMARY_FILE" << 'EOF'
# Performance Test Summary Report

## Test Combinations

1. **BASE**: No optimizations (baseline)
2. **BASE + REDIS**: Redis caching enabled
3. **BASE + REDIS + KAFKA**: Redis + Kafka events enabled
4. **ALL OPTIMIZATIONS**: Redis + Kafka + Indexing + Pagination + Connection Pooling

## Test Configuration

- **Threads**: 50 (100 for Combination 4)
- **Ramp-up**: 10 seconds (20 seconds for Combination 4)
- **Loops**: 10 (5 for Combination 4)
- **Total Requests**: ~500 per combination (~500 for Combination 4)

## Results Summary

| Combination | Total Samples | Avg Response Time (ms) | 95th Percentile (ms) | Throughput (req/s) | Error Rate | Errors |
|-------------|---------------|------------------------|----------------------|-------------------|------------|--------|
EOF

# Extract metrics for each combination
extract_metrics "${RESULTS_DIR}/results_base.jtl" "BASE"
extract_metrics "${RESULTS_DIR}/results_redis.jtl" "BASE + REDIS"
extract_metrics "${RESULTS_DIR}/results_kafka.jtl" "BASE + REDIS + KAFKA"
extract_metrics "${RESULTS_DIR}/results_all.jtl" "ALL OPTIMIZATIONS"

cat >> "$SUMMARY_FILE" << 'EOF'

## Detailed Reports

For detailed reports, open the HTML files:
- **Combination 1 (BASE)**: `jmeter/reports/report_base/index.html`
- **Combination 2 (BASE + REDIS)**: `jmeter/reports/report_redis/index.html`
- **Combination 3 (BASE + REDIS + KAFKA)**: `jmeter/reports/report_kafka/index.html`
- **Combination 4 (ALL OPTIMIZATIONS)**: `jmeter/reports/report_all/index.html`

## Performance Improvements

Compare the metrics above to see the impact of each optimization:
- **Redis Caching**: Should show 50-80% improvement on cache hits
- **Kafka Events**: Should show async processing benefits
- **All Optimizations**: Should show 60-90% overall improvement

## Notes

- Response times are in milliseconds
- Throughput is requests per second
- Error rate is percentage of failed requests
- 95th percentile shows the response time below which 95% of requests completed

---
*Report generated on: $(date)*
EOF

echo -e "${GREEN}✓ Summary report generated: ${SUMMARY_FILE}${NC}"
echo ""
echo "To view detailed metrics, check the HTML reports in: ${REPORTS_DIR}/"

