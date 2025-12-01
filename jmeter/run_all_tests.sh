#!/bin/bash

# JMeter Performance Testing Script
# Runs all 4 test combinations and generates reports

BASE_DIR=$(pwd)
JMETER_DIR="${BASE_DIR}/jmeter"
RESULTS_DIR="${JMETER_DIR}/results"
REPORTS_DIR="${JMETER_DIR}/reports"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}JMeter Performance Testing Suite${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if JMeter is installed
if ! command -v jmeter &> /dev/null; then
    echo -e "${RED}Error: JMeter is not installed or not in PATH${NC}"
    echo "Please install JMeter: brew install jmeter"
    exit 1
fi

# Check if API Gateway is running
echo -e "${YELLOW}Checking if services are running...${NC}"
if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${RED}Warning: API Gateway is not responding on port 3000${NC}"
    echo "Please ensure all services are running: docker compose up -d"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Create directories
mkdir -p "${RESULTS_DIR}"
mkdir -p "${REPORTS_DIR}"

# Function to run a test
run_test() {
    local combination=$1
    local test_plan=$2
    local result_file=$3
    local report_dir=$4
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Testing Combination ${combination}${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo "Test Plan: ${test_plan}"
    echo "Results: ${result_file}"
    echo "Report: ${report_dir}"
    echo ""
    
    if [ ! -f "${JMETER_DIR}/${test_plan}" ]; then
        echo -e "${RED}Error: Test plan ${test_plan} not found!${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}Starting JMeter test...${NC}"
    jmeter -n -t "${JMETER_DIR}/${test_plan}" \
        -l "${RESULTS_DIR}/${result_file}" \
        -e -o "${REPORTS_DIR}/${report_dir}" \
        -Jjmeter.save.saveservice.output_format=xml \
        -Jjmeter.save.saveservice.response_data=false \
        -Jjmeter.save.saveservice.samplerData=false
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Test completed successfully${NC}"
        echo "Results saved to: ${RESULTS_DIR}/${result_file}"
        echo "HTML report: ${REPORTS_DIR}/${report_dir}/index.html"
        return 0
    else
        echo -e "${RED}✗ Test failed${NC}"
        return 1
    fi
}

# Run all tests
echo -e "${YELLOW}Starting performance tests...${NC}"
echo ""

# Test 1: BASE
run_test "1" "test_plan_base.jmx" "results_base.jtl" "report_base"

# Test 2: BASE + REDIS
run_test "2" "test_plan_redis.jmx" "results_redis.jtl" "report_redis"

# Test 3: BASE + REDIS + KAFKA
run_test "3" "test_plan_kafka.jmx" "results_kafka.jtl" "report_kafka"

# Test 4: ALL OPTIMIZATIONS
run_test "4" "test_plan_all.jmx" "results_all.jtl" "report_all"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}All Tests Completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Results are available in:"
echo "  - Results: ${RESULTS_DIR}/"
echo "  - Reports: ${REPORTS_DIR}/"
echo ""
echo "To view reports, open:"
echo "  - Combination 1: ${REPORTS_DIR}/report_base/index.html"
echo "  - Combination 2: ${REPORTS_DIR}/report_redis/index.html"
echo "  - Combination 3: ${REPORTS_DIR}/report_kafka/index.html"
echo "  - Combination 4: ${REPORTS_DIR}/report_all/index.html"
echo ""

