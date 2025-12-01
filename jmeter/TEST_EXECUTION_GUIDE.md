# JMeter Test Execution Guide

This guide will help you execute all 4 test combinations and generate summary reports.

## Prerequisites

1. **JMeter Installed**: ✅ Already installed at `/opt/homebrew/bin/jmeter`
2. **Services Running**: All microservices must be running via Docker Compose
3. **API Gateway**: Must be accessible at `http://localhost:3000`

## Step-by-Step Execution

### Step 1: Configure Services for Combination 1 (BASE)

Before running the first test, configure services to disable all optimizations:

```bash
# Edit docker-compose.yml and set for all services:
ENABLE_POOLING=false
ENABLE_INDEXING=false
ENABLE_PAGINATION=false
REDIS_HOST=disabled
KAFKA_BROKER=disabled

# Stop Redis and Kafka
docker compose stop redis kafka zookeeper

# Restart all services
docker compose restart
```

**Verify Configuration:**
```bash
# Check logs - should NOT see Redis/Kafka connections
docker compose logs user-service | grep -i "redis\|kafka"
docker compose logs booking-service | grep -i "redis\|kafka"
```

### Step 2: Run Test for Combination 1

```bash
cd /Users/harshitasayala/kayak-simulation
./jmeter/run_all_tests.sh
```

Or run individually:
```bash
jmeter -n -t jmeter/test_plan_base.jmx \
  -l jmeter/results/results_base.jtl \
  -e -o jmeter/reports/report_base/
```

**Expected Duration**: ~5-10 minutes

### Step 3: Configure Services for Combination 2 (BASE + REDIS)

```bash
# Edit docker-compose.yml and set:
REDIS_HOST=redis
REDIS_PORT=6379
# Keep other optimizations disabled

# Start Redis
docker compose up -d redis

# Rebuild and restart affected services
docker compose build user-service listing-service booking-service billing-service admin-analytics-service
docker compose up -d
```

**Verify Configuration:**
```bash
# Check Redis connection
docker exec kayak-redis redis-cli PING
# Should return: PONG

# Check service logs
docker compose logs user-service | grep -i "redis connected"
```

### Step 4: Run Test for Combination 2

```bash
jmeter -n -t jmeter/test_plan_redis.jmx \
  -l jmeter/results/results_redis.jtl \
  -e -o jmeter/reports/report_redis/
```

### Step 5: Configure Services for Combination 3 (BASE + REDIS + KAFKA)

```bash
# Edit docker-compose.yml and set:
KAFKA_BROKER=kafka:9093
# Keep Redis enabled

# Start Kafka and Zookeeper
docker compose up -d zookeeper kafka
# Wait 10-15 seconds for Kafka to be ready

# Rebuild and restart all services
docker compose build
docker compose up -d
```

**Verify Configuration:**
```bash
# Check Kafka topics
docker exec kayak-kafka kafka-topics --bootstrap-server localhost:9092 --list
# Should show: booking.events, billing.events, user.events, etc.
```

### Step 6: Run Test for Combination 3

```bash
jmeter -n -t jmeter/test_plan_kafka.jmx \
  -l jmeter/results/results_kafka.jtl \
  -e -o jmeter/reports/report_kafka/
```

### Step 7: Configure Services for Combination 4 (ALL OPTIMIZATIONS)

```bash
# Edit docker-compose.yml and set for all services:
ENABLE_POOLING=true
ENABLE_INDEXING=true
ENABLE_PAGINATION=true
REDIS_HOST=redis
REDIS_PORT=6379
KAFKA_BROKER=kafka:9093

# Apply MySQL indexes
cd scripts
MYSQL_PASSWORD=Anvitha@2310 node runMySQLInit.js
cd ..

# Rebuild and restart all services
docker compose build
docker compose up -d
```

**Verify Configuration:**
```bash
# Check connection pooling
docker compose logs user-service | grep -i "pooling"
# Should show: "Connection pooling enabled"

# Check Redis
docker exec kayak-redis redis-cli PING

# Check Kafka
docker exec kayak-kafka kafka-topics --bootstrap-server localhost:9092 --list

# Check MySQL indexes
mysql -h localhost -u root -pAnvitha@2310 kayak_db -e "SHOW INDEXES FROM bookings;"
```

### Step 8: Run Test for Combination 4

```bash
jmeter -n -t jmeter/test_plan_all.jmx \
  -l jmeter/results/results_all.jtl \
  -e -o jmeter/reports/report_all/
```

### Step 9: Generate Summary Report

After all tests complete:

```bash
./jmeter/generate_summary_report.sh
```

This will create: `jmeter/PERFORMANCE_TEST_SUMMARY.md`

## Quick Run (All Tests)

If you want to run all tests sequentially (you'll need to reconfigure services between tests):

```bash
# 1. Configure for BASE and run
# ... (configure and run test 1)

# 2. Configure for REDIS and run
# ... (configure and run test 2)

# 3. Configure for KAFKA and run
# ... (configure and run test 3)

# 4. Configure for ALL and run
# ... (configure and run test 4)

# 5. Generate summary
./jmeter/generate_summary_report.sh
```

## Viewing Results

### HTML Reports
Open in browser:
- `jmeter/reports/report_base/index.html`
- `jmeter/reports/report_redis/index.html`
- `jmeter/reports/report_kafka/index.html`
- `jmeter/reports/report_all/index.html`

### Summary Report
- `jmeter/PERFORMANCE_TEST_SUMMARY.md`

## Key Metrics to Compare

1. **Average Response Time**: Lower is better
2. **95th Percentile Response Time**: Shows worst-case performance
3. **Throughput (req/s)**: Higher is better
4. **Error Rate**: Lower is better (should be 0% or very low)
5. **Cache Hit Rate** (for combinations 2-4): Check response for `"cached": true`

## Troubleshooting

### Services Not Running
```bash
docker compose ps
docker compose up -d
```

### API Gateway Not Responding
```bash
curl http://localhost:3000/health
# Check if API Gateway container is running
docker compose logs api-gateway
```

### JMeter Test Fails
- Check if services are running: `docker compose ps`
- Verify API Gateway: `curl http://localhost:3000/health`
- Check service logs: `docker compose logs [service-name]`

### Redis Not Connecting
```bash
docker compose logs user-service | grep -i redis
docker exec kayak-redis redis-cli PING
```

### Kafka Not Working
```bash
docker compose logs kafka
docker exec kayak-kafka kafka-topics --bootstrap-server localhost:9092 --list
```

## Expected Results

- **Combination 1 (BASE)**: Baseline performance (slowest)
- **Combination 2 (REDIS)**: 50-80% faster on cache hits
- **Combination 3 (KAFKA)**: Same as 2 + async event processing
- **Combination 4 (ALL)**: 60-90% faster overall, better concurrent performance

## Next Steps

After completing all tests:
1. Review HTML reports for detailed metrics
2. Compare metrics across combinations
3. Generate summary report
4. Create bar charts for presentation (use data from summary report)

