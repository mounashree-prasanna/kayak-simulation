# Kubernetes Deployment Guide

This directory contains all Kubernetes manifests for deploying the Kayak application.

## Structure

- `namespace.yaml` - Creates the `kayak` namespace
- `zookeeper.yaml` - Zookeeper deployment and service
- `kafka.yaml` - Kafka deployment and service
- `user-service.yaml` - User service deployment and ClusterIP service
- `listing-service.yaml` - Listing service deployment and ClusterIP service
- `booking-service.yaml` - Booking service deployment and ClusterIP service
- `billing-service.yaml` - Billing service deployment and ClusterIP service
- `review-logging-service.yaml` - Review/Logging service deployment and ClusterIP service
- `admin-analytics-service.yaml` - Admin/Analytics service deployment and ClusterIP service
- `api-gateway.yaml` - API Gateway deployment and ClusterIP service
- `agentic-recommendation-service.yaml` - Recommendation service deployment and ClusterIP service
- `frontend.yaml` - Frontend deployment and ClusterIP service
- `ingress.yaml` - Nginx Ingress configuration for kayak.local
- `build-images.sh` - Script to build all Docker images
- `deploy.sh` - Script to deploy all services

## Quick Start

### 1. Build Images

```bash
chmod +x build-images.sh
./build-images.sh
```

### 2. Deploy

```bash
chmod +x deploy.sh
./deploy.sh
```

### 3. Configure /etc/hosts

```bash
sudo nano /etc/hosts
```

Add:
```
127.0.0.1 kayak.local
```

### 4. Access

Open browser: http://kayak.local

## Service Architecture

All services use **ClusterIP** type, meaning they're only accessible within the Kubernetes cluster. External access is provided through:

- **Nginx Ingress** - Routes traffic to services based on path
- **Frontend Service** - Serves the React app and proxies API requests
- **API Gateway** - Routes `/api/*` requests to appropriate microservices

## Ingress Routing

- `http://kayak.local/` → Frontend (React app)
- `http://kayak.local/api/*` → API Gateway → Microservices
- `http://kayak.local/ws/*` → Recommendation Service (WebSocket)

## Service Communication

Services communicate using Kubernetes DNS:
- `user-service:3001`
- `listing-service:3002`
- `api-gateway-service:3000`
- etc.

## MongoDB Atlas

All services connect to MongoDB Atlas using the connection string in environment variables.

## Kafka

Kafka is deployed as a single broker for development. Services connect via `kafka-service:9093`.

## Troubleshooting

See `KUBERNETES_SETUP_MAC.md` in the root directory for detailed troubleshooting steps.

## Cleanup

```bash
kubectl delete namespace kayak
```

