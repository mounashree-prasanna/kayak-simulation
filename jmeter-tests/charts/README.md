# JMeter Performance Test Comparison Charts

This directory contains comparison charts and analysis for all 4 JMeter performance test combinations.

## Generated Files

### Charts (PNG format)
1. **01_success_rate.png** - Success rate comparison across all combinations
2. **02_error_rate.png** - Error rate comparison
3. **03_avg_response_time.png** - Average response time comparison
4. **04_median_response_time.png** - Median response time comparison
5. **05_p95_response_time.png** - 95th percentile response time
6. **06_p99_response_time.png** - 99th percentile response time
7. **07_throughput.png** - Throughput (requests per second) comparison
8. **08_total_requests.png** - Total requests comparison
9. **09_response_time_percentiles.png** - Grouped comparison of response time percentiles
10. **10_error_breakdown.png** - Stacked bar chart showing error breakdown by type

### Reports
- **summary_report.json** - Detailed metrics in JSON format
- **view_charts.html** - Interactive HTML viewer for all charts

## How to Use

### View Charts
1. **HTML Viewer (Recommended)**: Open `view_charts.html` in your web browser
2. **Individual Charts**: Open any PNG file directly

### Regenerate Charts
Run the Python script from the `jmeter-tests` directory:
```bash
python generate_comparison_charts.py
```

### Requirements
- Python 3.7+
- pandas >= 2.0.0
- matplotlib >= 3.7.0
- numpy >= 1.24.0

Install requirements:
```bash
pip install -r requirements_charts.txt
```

## Key Metrics Summary

| Combination | Success Rate | Avg Response Time | Throughput |
|------------|--------------|-------------------|------------|
| BASE | 27.27% | 1778.07ms | 50.55 req/s |
| BASE + REDIS | 27.22% | 1946.10ms | 46.82 req/s |
| BASE + REDIS + KAFKA | 62.67% | 786.18ms | 103.38 req/s |
| ALL OPTIMIZATIONS | 62.67% | 395.07ms | 192.56 req/s |

## Performance Improvements

**Combination 4 (ALL OPTIMIZATIONS)** shows the best performance:
- **4.5x faster** average response time compared to BASE (395ms vs 1778ms)
- **3.8x higher** throughput compared to BASE (192.56 req/s vs 50.55 req/s)
- **2.3x better** success rate compared to BASE (62.67% vs 27.27%)

## Notes

- All test combinations used 100 concurrent users
- Test duration and loop counts were consistent across combinations
- Error breakdown includes: 400 (Bad Request), 401 (Unauthorized), 404 (Not Found), 409 (Conflict), 500 (Server Error)

