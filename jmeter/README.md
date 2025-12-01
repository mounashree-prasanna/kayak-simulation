# JMeter Performance Testing

This directory contains all JMeter test plans and scripts for performance testing the Kayak Travel Platform.

## Files

- **test_plan_base.jmx** - Combination 1: BASE (no optimizations)
- **test_plan_redis.jmx** - Combination 2: BASE + REDIS
- **test_plan_kafka.jmx** - Combination 3: BASE + REDIS + KAFKA
- **test_plan_all.jmx** - Combination 4: ALL OPTIMIZATIONS
- **run_all_tests.sh** - Script to run all tests sequentially
- **generate_summary_report.sh** - Script to generate summary report from results
- **TEST_EXECUTION_GUIDE.md** - Detailed step-by-step execution guide

## Quick Start

1. **Ensure services are running:**
   ```bash
   docker compose up -d
   ```

2. **Configure services for Combination 1 (BASE):**
   - Edit `docker-compose.yml`
   - Set `REDIS_HOST=disabled`, `KAFKA_BROKER=disabled`
   - Stop Redis/Kafka: `docker compose stop redis kafka zookeeper`
   - Restart services: `docker compose restart`

3. **Run test:**
   ```bash
   jmeter -n -t jmeter/test_plan_base.jmx \
     -l jmeter/results/results_base.jtl \
     -e -o jmeter/reports/report_base/
   ```

4. **Repeat for other combinations** (see TEST_EXECUTION_GUIDE.md)

5. **Generate summary:**
   ```bash
   ./jmeter/generate_summary_report.sh
   ```

## Test Configuration

| Combination | Threads | Ramp-up | Loops | Features |
|-------------|---------|---------|-------|----------|
| BASE | 50 | 10s | 10 | None |
| BASE + REDIS | 50 | 10s | 10 | Redis caching |
| BASE + REDIS + KAFKA | 50 | 10s | 10 | Redis + Kafka |
| ALL OPTIMIZATIONS | 100 | 20s | 5 | All features |

## Results

Results will be saved to:
- **JTL files**: `jmeter/results/results_*.jtl`
- **HTML reports**: `jmeter/reports/report_*/index.html`
- **Summary**: `jmeter/PERFORMANCE_TEST_SUMMARY.md` (after running generate_summary_report.sh)

## For Detailed Instructions

See: **TEST_EXECUTION_GUIDE.md**

