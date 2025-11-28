#!/bin/bash

set -e

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "🚀 Deploying Kayak application to Kubernetes..."
echo "Using manifests from: $SCRIPT_DIR"

# Create namespace
echo "📦 Creating namespace..."
kubectl apply -f "$SCRIPT_DIR/namespace.yaml"

# Deploy infrastructure
echo "🔧 Deploying infrastructure (Zookeeper, Kafka)..."
kubectl apply -f "$SCRIPT_DIR/zookeeper.yaml"
kubectl apply -f "$SCRIPT_DIR/kafka.yaml"

echo "⏳ Waiting for Kafka to be ready..."
kubectl wait --for=condition=ready pod -l app=kafka -n kayak --timeout=120s || true

# Deploy all services
echo "🚢 Deploying microservices..."
kubectl apply -f "$SCRIPT_DIR/user-service.yaml"
kubectl apply -f "$SCRIPT_DIR/listing-service.yaml"
kubectl apply -f "$SCRIPT_DIR/booking-service.yaml"
kubectl apply -f "$SCRIPT_DIR/billing-service.yaml"
kubectl apply -f "$SCRIPT_DIR/review-logging-service.yaml"
kubectl apply -f "$SCRIPT_DIR/admin-analytics-service.yaml"
kubectl apply -f "$SCRIPT_DIR/api-gateway.yaml"
kubectl apply -f "$SCRIPT_DIR/agentic-recommendation-service.yaml"

# Wait a bit for services to start
echo "⏳ Waiting for services to initialize..."
sleep 10

# Deploy frontend
echo "🌐 Deploying frontend..."
kubectl apply -f "$SCRIPT_DIR/frontend.yaml"

# Deploy ingress
echo "🔗 Deploying ingress..."
kubectl apply -f "$SCRIPT_DIR/ingress.yaml"

echo "✅ Deployment complete!"
echo ""
echo "📊 Checking deployment status..."
kubectl get pods -n kayak
echo ""
echo "📱 Access the application at: http://kayak.local"
echo ""
echo "To check logs: kubectl logs -f <pod-name> -n kayak"
echo "To check services: kubectl get svc -n kayak"
echo "To check ingress: kubectl get ingress -n kayak"

