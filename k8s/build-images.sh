#!/bin/bash

set -e

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Get the project root (parent of k8s directory)
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🔨 Building Docker images for Kayak services..."
echo "Project root: $PROJECT_ROOT"

# Build all service images
echo "Building user-service..."
docker build -t kayak-user-service:latest "$PROJECT_ROOT/services/user-service"

echo "Building listing-service..."
docker build -t kayak-listing-service:latest "$PROJECT_ROOT/services/listing-service"

echo "Building booking-service..."
docker build -t kayak-booking-service:latest "$PROJECT_ROOT/services/booking-service"

echo "Building billing-service..."
docker build -t kayak-billing-service:latest "$PROJECT_ROOT/services/billing-service"

echo "Building review-logging-service..."
docker build -t kayak-review-logging-service:latest "$PROJECT_ROOT/services/review-logging-service"

echo "Building admin-analytics-service..."
docker build -t kayak-admin-analytics-service:latest "$PROJECT_ROOT/services/admin-analytics-service"

echo "Building api-gateway..."
docker build -t kayak-api-gateway:latest "$PROJECT_ROOT/services/api-gateway"

echo "Building agentic-recommendation-service..."
docker build -t kayak-agentic-recommendation-service:latest "$PROJECT_ROOT/services/agentic-recommendation-service"

echo "Building frontend..."
docker build -t kayak-frontend:latest "$PROJECT_ROOT/frontend"

echo "✅ All images built successfully!"
docker images | grep kayak

