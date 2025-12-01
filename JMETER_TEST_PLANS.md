# JMeter Test Plans - Quick Setup Guide

## Overview
This document provides JMeter test plan configurations for all 4 combinations. Use these configurations to create test plans in JMeter GUI or use the provided XML templates.

## Quick Start

### 1. Install JMeter
```bash
# Download from: https://jmeter.apache.org/download_jmeter.cgi
# Or use package manager:
brew install jmeter  # macOS
sudo apt-get install jmeter  # Ubuntu
```

### 2. Start JMeter
```bash
jmeter  # Opens GUI
# Or headless:
jmeter -n -t test_plan.jmx -l results.jtl -e -o report/
```

---

## Test Plan 1: BASE (No Optimizations)

### Thread Group Configuration
- **Name:** BASE Test - 50 Users
- **Number of Threads:** 50
- **Ramp-up Period:** 10 seconds
- **Loop Count:** 10

### HTTP Request Defaults
- **Server Name:** localhost
- **Port Number:** 3000
- **Protocol:** http

### HTTP Requests to Add:

#### 1. Flight Search
- **Method:** GET
- **Path:** /api/flights/search
- **Parameters:**
  - origin: NYC
  - destination: LAX

#### 2. Flight Details
- **Method:** GET
- **Path:** /api/flights/FL001

#### 3. Hotel Search
- **Method:** GET
- **Path:** /api/hotels/search
- **Parameters:**
  - city: New York

#### 4. Hotel Details
- **Method:** GET
- **Path:** /api/hotels/HOTEL001

#### 5. Car Search
- **Method:** GET
- **Path:** /api/cars/search
- **Parameters:**
  - city: Los Angeles

#### 6. Car Details
- **Method:** GET
- **Path:** /api/cars/CAR001

#### 7. Get User
- **Method:** GET
- **Path:** /api/users/123-45-6789

#### 8. Get Booking
- **Method:** GET
- **Path:** /api/bookings/BK123456

#### 9. Get User Bookings
- **Method:** GET
- **Path:** /api/bookings/users/USER123/bookings

#### 10. Create Booking
- **Method:** POST
- **Path:** /api/bookings
- **Body Data (JSON):**
```json
{
  "user_id": "123-45-6789",
  "booking_type": "Flight",
  "reference_id": "FL001",
  "start_date": "2024-12-25T08:00:00Z",
  "end_date": "2024-12-25T11:30:00Z",
  "total_price": 350
}
```

#### 11. Top Properties Analytics
- **Method:** GET
- **Path:** /api/analytics/top-properties
- **Parameters:**
  - year: 2024

### Listeners to Add:
- View Results Tree
- Summary Report
- Aggregate Report
- Response Times Over Time

---

## Test Plan 2: BASE + REDIS

### Additional Configuration:
- **Name:** BASE + REDIS Test - Cache Performance
- Use same thread group as Combination 1

### Additional Test: Cache Hit Test
Create a separate Thread Group:
- **Name:** Cache Hit Test
- **Number of Threads:** 1
- **Ramp-up Period:** 1 second
- **Loop Count:** 20

Add the same requests as Combination 1, but run them 20 times to measure cache hit performance.

### Assertions to Add:
- **Response Assertion:** Check for "cached": true in response
- **Duration Assertion:** Response time < 100ms (for cache hits)

### Expected Results:
- First request: Cache MISS (slower)
- Subsequent requests: Cache HIT (faster, "cached": true)

---

## Test Plan 3: BASE + REDIS + KAFKA

### Additional Requests for Kafka Testing:

#### 12. Create Booking (Kafka Event)
- **Method:** POST
- **Path:** /api/bookings
- **Body:** Same as Combination 1
- **Expected:** Triggers booking.events

#### 13. Process Payment (Saga Pattern)
- **Method:** POST
- **Path:** /api/billings/process-payment
- **Body Data (JSON):**
```json
{
  "booking_id": "${booking_id}",
  "payment_method": "credit_card",
  "total_amount": 350
}
```
- **Expected:** Triggers billing.events, which updates booking status

#### 14. Create User (Kafka Event)
- **Method:** POST
- **Path:** /api/users
- **Body Data (JSON):**
```json
{
  "user_id": "999-99-9999",
  "first_name": "Test",
  "last_name": "User",
  "email": "test@example.com",
  "password": "Test123!@#",
  "address": {
    "street": "123 Test St",
    "city": "Test City",
    "state": "CA",
    "zip": "12345"
  }
}
```
- **Expected:** Triggers user.events

### Thread Group for Kafka Events:
- **Name:** Kafka Event Flow Test
- **Number of Threads:** 10
- **Ramp-up Period:** 5 seconds
- **Loop Count:** 5

This tests the Saga pattern: Create Booking → Process Payment → Verify Booking Status

---

## Test Plan 4: ALL OPTIMIZATIONS

### Additional Configuration:
- **Name:** All Optimizations Test - High Load
- **Number of Threads:** 100
- **Ramp-up Period:** 20 seconds
- **Loop Count:** 5

### Updated Requests with Pagination:

#### Flight Search (with Pagination)
- **Method:** GET
- **Path:** /api/flights/search
- **Parameters:**
  - origin: NYC
  - destination: LAX
  - page: 1
  - limit: 20

#### Hotel Search (with Pagination)
- **Method:** GET
- **Path:** /api/hotels/search
- **Parameters:**
  - city: New York
  - page: 1
  - limit: 20

#### Car Search (with Pagination)
- **Method:** GET
- **Path:** /api/cars/search
- **Parameters:**
  - city: Los Angeles
  - page: 1
  - limit: 20

#### Top Properties (with Pagination)
- **Method:** GET
- **Path:** /api/analytics/top-properties
- **Parameters:**
  - year: 2024
  - page: 1
  - limit: 20

### Concurrent Load Test:
Create additional Thread Group:
- **Name:** Concurrent Load Test
- **Number of Threads:** 200
- **Ramp-up Period:** 30 seconds
- **Loop Count:** 3

This tests connection pooling under high concurrent load.

---

## JMeter Command Line Execution

### Run All Test Plans:
```bash
#!/bin/bash
# run_all_tests.sh

BASE_DIR=$(pwd)

echo "Testing Combination 1: BASE"
jmeter -n -t ${BASE_DIR}/test_plan_base.jmx \
  -l ${BASE_DIR}/results/results_base.jtl \
  -e -o ${BASE_DIR}/reports/report_base/

echo "Testing Combination 2: BASE + REDIS"
jmeter -n -t ${BASE_DIR}/test_plan_redis.jmx \
  -l ${BASE_DIR}/results/results_redis.jtl \
  -e -o ${BASE_DIR}/reports/report_redis/

echo "Testing Combination 3: BASE + REDIS + KAFKA"
jmeter -n -t ${BASE_DIR}/test_plan_kafka.jmx \
  -l ${BASE_DIR}/results/results_kafka.jtl \
  -e -o ${BASE_DIR}/reports/report_kafka/

echo "Testing Combination 4: ALL OPTIMIZATIONS"
jmeter -n -t ${BASE_DIR}/test_plan_all.jmx \
  -l ${BASE_DIR}/results/results_all.jtl \
  -e -o ${BASE_DIR}/reports/report_all/

echo "All tests completed!"
```

### Generate Comparison Report:
```bash
# Compare results
jmeter -g results/results_base.jtl -o reports/comparison_base/
jmeter -g results/results_all.jtl -o reports/comparison_all/
```

---

## Key Metrics to Extract

### From Summary Report:
- **Samples:** Total requests
- **Average:** Average response time (ms)
- **Min/Max:** Min and max response times
- **Error %:** Percentage of failed requests
- **Throughput:** Requests per second

### From Aggregate Report:
- **90th Percentile:** 90% of requests completed within this time
- **95th Percentile:** 95% of requests completed within this time
- **99th Percentile:** 99% of requests completed within this time

### Custom Metrics (for Redis):
- **Cache Hit Rate:** Count responses with "cached": true
- **Cache Miss Rate:** Count responses without "cached": true
- **Cache Performance Gain:** (Miss time - Hit time) / Miss time * 100

---

## Sample JMeter Test Plan XML Structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan version="1.2">
  <hashTree>
    <TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="Kayak Performance Test">
      <stringProp name="TestPlan.comments"></stringProp>
      <boolProp name="TestPlan.functional_mode">false</boolProp>
      <boolProp name="TestPlan.serialize_threadgroups">false</boolProp>
      <elementProp name="TestPlan.arguments" elementType="Arguments" guiclass="ArgumentsPanel">
        <collectionProp name="Arguments.arguments"/>
      </elementProp>
      <stringProp name="TestPlan.user_define_classpath"></stringProp>
    </TestPlan>
    <hashTree>
      <ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="Test Thread Group">
        <stringProp name="ThreadGroup.on_sample_error">continue</stringProp>
        <elementProp name="ThreadGroup.main_controller" elementType="LoopController" guiclass="LoopControllerGui" testclass="LoopController">
          <boolProp name="LoopController.continue_forever">false</boolProp>
          <stringProp name="LoopController.loops">10</stringProp>
        </elementProp>
        <stringProp name="ThreadGroup.num_threads">50</stringProp>
        <stringProp name="ThreadGroup.ramp_time">10</stringProp>
        <boolProp name="ThreadGroup.scheduler">false</boolProp>
        <stringProp name="ThreadGroup.duration"></stringProp>
        <stringProp name="ThreadGroup.delay"></stringProp>
      </ThreadGroup>
      <!-- Add HTTP Request Defaults and HTTP Requests here -->
    </hashTree>
  </hashTree>
</jmeterTestPlan>
```

---

## Tips for JMeter Testing

1. **Start Small:** Begin with 10 threads, then scale up
2. **Monitor Resources:** Watch CPU, memory, and network during tests
3. **Use Assertions:** Verify response correctness, not just speed
4. **Save Test Plans:** Export as .jmx files for reuse
5. **Compare Results:** Use Aggregate Report to compare combinations
6. **Cache Testing:** Make same request multiple times to test cache
7. **Kafka Testing:** Check service logs for event publishing/consumption

---

## Expected Performance Improvements

| Combination | Expected Improvement | Key Metric |
|------------|---------------------|------------|
| BASE | Baseline | 100% (baseline) |
| BASE + REDIS | 50-80% faster (cache hits) | Response time reduction |
| BASE + REDIS + KAFKA | Same as Redis + async events | Event processing time |
| ALL OPTIMIZATIONS | 60-90% faster overall | Throughput increase |

---

For detailed HTML guide with all endpoints and configurations, see: **PERFORMANCE_TESTING_GUIDE.html**

