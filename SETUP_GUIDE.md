# Kayak Travel Platform - Setup Guide

Complete setup guide for running the Kayak travel platform on your local machine.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Deployment Options](#deployment-options)
  - [Option 1: Docker Compose (Recommended for Development)](#option-1-docker-compose-recommended-for-development)
  - [Option 2: Kubernetes (Recommended for Production)](#option-2-kubernetes-recommended-for-production)
- [Configuration](#configuration)
- [Accessing the Application](#accessing-the-application)
- [Troubleshooting](#troubleshooting)
- [Development](#development)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Docker Desktop** (includes Docker and Docker Compose) OR **Docker** + **Docker Compose** separately
  - Download: https://www.docker.com/products/docker-desktop
- **Node.js** 20.x or later (for local frontend development)
  - Download: https://nodejs.org/
- **kubectl** (for Kubernetes deployment)
  - Install: `brew install kubectl` (Mac) or follow [official guide](https://kubernetes.io/docs/tasks/tools/)
- **Git** (to clone the repository)
- **At least 8GB RAM** available for containers
- **MongoDB Atlas Account** (or local MongoDB)
  - Sign up: https://www.mongodb.com/cloud/atlas

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd kayak-simulation
```

### 2. Choose Your Deployment Method

- **Docker Compose** (Easier, faster setup) → See [Option 1](#option-1-docker-compose-recommended-for-development)
- **Kubernetes** (Production-ready) → See [Option 2](#option-2-kubernetes-recommended-for-production)

## Architecture

The application consists of:

- **8 Microservices** (Node.js)
  - User Service (port 3001)
  - Listing Service (port 3002)
  - Booking Service (port 3003)
  - Billing Service (port 3004)
  - Review/Logging Service (port 3005)
  - Admin/Analytics Service (port 3006)
  - API Gateway (port 3000)
  - Agentic Recommendation Service (port 8000) - Python/FastAPI

- **Frontend** (React + Vite)
  - Port 5174 (development)
  - Port 80 (production/Kubernetes)

- **Infrastructure**
  - MongoDB Atlas (database)
  - Kafka + Zookeeper (event streaming)

## Deployment Options

### Option 1: Docker Compose (Recommended for Development)

#### Step 1: Configure MongoDB Atlas

1. Create a MongoDB Atlas account at https://www.mongodb.com/cloud/atlas
2. Create a cluster (free tier works)
3. Create a database user
4. Whitelist your IP (or use `0.0.0.0/0` for development)
5. Get your connection string

#### Step 2: Update docker-compose.yml

Edit `docker-compose.yml` and update the MongoDB connection string in all services:

```yaml
MONGODB_URI: mongodb+srv://<username>:<password>@<cluster-url>/kayak?appName=Cluster-236
```

Replace:
- `<username>` with your MongoDB username
- `<password>` with your MongoDB password
- `<cluster-url>` with your cluster URL

#### Step 3: Start All Services

```bash
# Start all services
docker-compose up --build

# Or start in background
docker-compose up --build -d
```

Wait 2-3 minutes for all services to start.

#### Step 4: Start Frontend (Development)

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at: **http://localhost:5174**

#### Step 5: Verify Services

```bash
# Check all containers
docker-compose ps

# Test API Gateway
curl http://localhost:3000/health

# View logs
docker-compose logs -f
```

#### Stop Services

```bash
docker-compose down
```

### Option 2: Kubernetes (Recommended for Production)

#### Step 1: Setup Kubernetes

**For Docker Desktop:**
1. Open Docker Desktop
2. Go to Settings → Kubernetes
3. Enable Kubernetes
4. Click "Apply & Restart"

**For Minikube:**
```bash
brew install minikube
minikube start --memory=8192 --cpus=4
minikube addons enable ingress
```

#### Step 2: Install Nginx Ingress Controller

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml

# Wait for it to be ready
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=90s
```

#### Step 3: Configure MongoDB Atlas

1. Create a MongoDB Atlas account
2. Get your connection string
3. Update Kubernetes manifests in `k8s/` directory:

Edit each service YAML file in `k8s/` and update:
```yaml
env:
  - name: MONGODB_URI
    value: "mongodb+srv://<username>:<password>@<cluster-url>/kayak?appName=Cluster-236"
```

#### Step 4: Build Docker Images

```bash
cd k8s
chmod +x build-images.sh
./build-images.sh
```

**For Minikube**, build images inside Minikube's Docker:
```bash
eval $(minikube docker-env)
./build-images.sh
eval $(minikube docker-env -u)
```

#### Step 5: Configure kayak.local Domain

Edit `/etc/hosts`:

```bash
sudo nano /etc/hosts
```

Add:
```
127.0.0.1 kayak.local
```

**For Minikube**, use Minikube IP:
```bash
minikube ip  # Get the IP
# Then use that IP in /etc/hosts instead of 127.0.0.1
```

#### Step 6: Deploy to Kubernetes

```bash
cd k8s
chmod +x deploy.sh
./deploy.sh
```

Wait 2-3 minutes for all pods to start.

#### Step 7: Verify Deployment

```bash
# Check all pods
kubectl get pods -n kayak

# Check services
kubectl get svc -n kayak

# Check ingress
kubectl get ingress -n kayak

# View logs
kubectl logs -f <pod-name> -n kayak
```

#### Step 8: Access Application

Open browser: **http://kayak.local**

#### Cleanup

```bash
kubectl delete namespace kayak
```

## Configuration

### Environment Variables

Key environment variables to configure:

- **MONGODB_URI**: MongoDB Atlas connection string
- **KAFKA_BROKER**: Kafka broker address (default: `kafka:9093` for Docker, `kafka-service:9093` for K8s)
- **JWT_SECRET**: Secret key for JWT tokens (change in production!)
- **ADMIN_API_KEY**: API key for admin endpoints (change in production!)

### MongoDB Atlas Setup

1. **Create Account**: https://www.mongodb.com/cloud/atlas
2. **Create Cluster**: Choose free tier (M0)
3. **Create Database User**:
   - Username: `your-username`
   - Password: `your-password`
4. **Network Access**: Add IP address `0.0.0.0/0` (for development) or your specific IP
5. **Get Connection String**:
   ```
   mongodb+srv://<username>:<password>@<cluster-url>/kayak?appName=Cluster-236
   ```

### Port Configuration

**Docker Compose:**
- API Gateway: `3000`
- User Service: `3001`
- Listing Service: `3002`
- Booking Service: `3003`
- Billing Service: `3004`
- Review Service: `3005`
- Analytics Service: `3006`
- Recommendation Service: `8000`
- Frontend (dev): `5174`
- Kafka: `9092`, `9093`
- Zookeeper: `2181`

**Kubernetes:**
- All services accessible via `kayak.local`
- Frontend: `http://kayak.local`
- API: `http://kayak.local/api`

## Accessing the Application

### Docker Compose
- **Frontend**: http://localhost:5174
- **API Gateway**: http://localhost:3000
- **API Health**: http://localhost:3000/health

### Kubernetes
- **Frontend**: http://kayak.local
- **API Gateway**: http://kayak.local/api
- **API Health**: http://kayak.local/api/health

## Troubleshooting

### Services Won't Start

**Docker Compose:**
```bash
# Check logs
docker-compose logs

# Check specific service
docker-compose logs <service-name>

# Restart services
docker-compose restart
```

**Kubernetes:**
```bash
# Check pod status
kubectl get pods -n kayak

# Check pod logs
kubectl logs <pod-name> -n kayak

# Describe pod for events
kubectl describe pod <pod-name> -n kayak
```

### MongoDB Connection Issues

1. **Verify Connection String**: Check MongoDB URI in environment variables
2. **Check Network Access**: Ensure your IP is whitelisted in MongoDB Atlas
3. **Test Connection**: Use MongoDB Compass or `mongosh` to test connection
4. **Check Logs**: Look for MongoDB connection errors in service logs

### Port Already in Use

```bash
# Find what's using the port
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Kafka Connection Errors

**Docker Compose:**
```bash
# Check Kafka logs
docker-compose logs kafka

# Ensure Zookeeper is running first
docker-compose ps zookeeper
```

**Kubernetes:**
```bash
# Check Kafka pod
kubectl logs -f kafka-<pod-id> -n kayak

# Check Zookeeper
kubectl logs -f zookeeper-<pod-id> -n kayak
```

### Frontend Not Loading

1. **Check if frontend is running**: `npm run dev` (for Docker Compose)
2. **Check browser console**: Look for errors
3. **Verify API connection**: Check if `http://localhost:3000/health` works
4. **Check CORS**: Ensure API Gateway has CORS enabled

### Kubernetes Ingress Not Working

```bash
# Check ingress controller
kubectl get pods -n ingress-nginx

# Check ingress resource
kubectl describe ingress kayak-ingress -n kayak

# Check /etc/hosts
cat /etc/hosts | grep kayak.local

# Get ingress IP (Docker Desktop)
kubectl get svc -n ingress-nginx ingress-nginx-controller
```

### Image Pull Errors (Kubernetes)

If using Minikube, ensure images are built in Minikube's Docker:

```bash
eval $(minikube docker-env)
cd k8s
./build-images.sh
eval $(minikube docker-env -u)
```

## Development

### Running Frontend Locally

```bash
cd frontend
npm install
npm run dev
```

Frontend will run on `http://localhost:5174`

### Running Services Locally

Each service can be run individually:

```bash
cd services/<service-name>
npm install
npm start
```

### Making Changes

1. **Code Changes**: Edit files in respective service directories
2. **Docker Compose**: Rebuild with `docker-compose up --build`
3. **Kubernetes**: Rebuild image and restart deployment:
   ```bash
   docker build -t kayak-<service>:latest ./services/<service>
   kubectl rollout restart deployment/<service> -n kayak
   ```

### Testing

```bash
# Test API Gateway
curl http://localhost:3000/health

# Test User Service
curl http://localhost:3001/health

# Test Listing Service
curl http://localhost:3002/health
```

## Project Structure

```
kayak-simulation/
├── frontend/              # React frontend application
├── services/              # Microservices
│   ├── user-service/
│   ├── listing-service/
│   ├── booking-service/
│   ├── billing-service/
│   ├── review-logging-service/
│   ├── admin-analytics-service/
│   ├── api-gateway/
│   └── agentic-recommendation-service/
├── k8s/                   # Kubernetes manifests
├── scripts/               # Utility scripts
├── docker-compose.yml     # Docker Compose configuration
└── README.md              # This file
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review service logs
3. Check GitHub issues
4. Contact the development team

## License

[Add your license information here]

---

**Happy Coding! 🚀**

