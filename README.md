# 🛫 Kayak Travel Platform

A full-stack microservices-based travel booking platform similar to KAYAK, built with React, Node.js, Python, MongoDB, Kafka, and Kubernetes.

## ✨ Features

- **Flight, Hotel, and Car Rental Search** - Comprehensive search functionality
- **Real-time Booking System** - Book flights, hotels, and cars
- **User Management** - User registration, authentication, and profiles
- **Billing & Payments** - Integrated billing service
- **Reviews & Ratings** - User reviews and ratings system
- **Admin Analytics** - Analytics dashboard for administrators
- **Agentic Recommendations** - AI-powered travel recommendations
- **Event Streaming** - Kafka-based event-driven architecture
- **WebSocket Support** - Real-time updates via WebSockets
- **Kubernetes Ready** - Production-ready Kubernetes deployment

## 🏗️ Architecture

### Microservices

- **User Service** - User management and authentication
- **Listing Service** - Flight, hotel, and car listings
- **Booking Service** - Booking management
- **Billing Service** - Payment processing
- **Review/Logging Service** - Reviews and user activity logging
- **Admin/Analytics Service** - Analytics and admin operations
- **API Gateway** - Single entry point for all API requests
- **Agentic Recommendation Service** - AI-powered recommendations (Python/FastAPI)

### Technology Stack

- **Frontend**: React 18, Vite, Redux Toolkit, React Router, Framer Motion
- **Backend**: Node.js, Express.js
- **AI Service**: Python, FastAPI, Uvicorn
- **Database**: MongoDB Atlas
- **Message Queue**: Apache Kafka
- **Containerization**: Docker
- **Orchestration**: Kubernetes
- **Ingress**: Nginx Ingress Controller

## 🚀 Quick Start

### Prerequisites

- Docker Desktop (or Docker + Docker Compose)
- Node.js 20+ (for local development)
- kubectl (for Kubernetes deployment)
- MongoDB Atlas account

### Option 1: Docker Compose (Recommended for Development)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd kayak-simulation
   ```

2. **Configure MongoDB Atlas**
   - Create account at https://www.mongodb.com/cloud/atlas
   - Get connection string
   - Update `docker-compose.yml` with your MongoDB URI

3. **Start all services**
   ```bash
   docker-compose up --build
   ```

4. **Start frontend (in new terminal)**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:5174
   - API Gateway: http://localhost:3000

### Option 2: Kubernetes (Recommended for Production)

1. **Setup Kubernetes**
   - Docker Desktop: Enable Kubernetes in Settings
   - OR Minikube: `minikube start`

2. **Install Nginx Ingress**
   ```bash
   kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml
   ```

3. **Configure MongoDB Atlas**
   - Update MongoDB URI in `k8s/*.yaml` files

4. **Build and deploy**
   ```bash
   cd k8s
   ./build-images.sh
   ./deploy.sh
   ```

5. **Configure domain**
   ```bash
   sudo nano /etc/hosts
   # Add: 127.0.0.1 kayak.local
   ```

6. **Access the application**
   - http://kayak.local

## 📚 Documentation

- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Complete setup instructions
- **[NEXT_STEPS.md](./NEXT_STEPS.md)** - Step-by-step deployment guide
- **[k8s/README.md](./k8s/README.md)** - Kubernetes deployment details
- **[docs/API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md)** - API endpoints documentation

## 🗂️ Project Structure

```
kayak-simulation/
├── frontend/                    # React frontend
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── pages/               # Page components
│   │   ├── store/               # Redux store
│   │   └── services/            # API services
│   └── Dockerfile
├── services/                     # Microservices
│   ├── user-service/
│   ├── listing-service/
│   ├── booking-service/
│   ├── billing-service/
│   ├── review-logging-service/
│   ├── admin-analytics-service/
│   ├── api-gateway/
│   └── agentic-recommendation-service/
├── k8s/                         # Kubernetes manifests
│   ├── *.yaml                   # Service deployments
│   ├── build-images.sh          # Build script
│   └── deploy.sh                # Deployment script
├── scripts/                     # Utility scripts
├── docker-compose.yml           # Docker Compose config
└── README.md                    # This file
```

## 🔧 Configuration

### Environment Variables

Key variables to configure:

- `MONGODB_URI` - MongoDB Atlas connection string
- `KAFKA_BROKER` - Kafka broker address
- `JWT_SECRET` - JWT secret key (change in production!)
- `ADMIN_API_KEY` - Admin API key (change in production!)

### MongoDB Atlas Setup

1. Create account: https://www.mongodb.com/cloud/atlas
2. Create cluster (free tier works)
3. Create database user
4. Whitelist IP address (use `0.0.0.0/0` for development)
5. Get connection string and update in configuration files

## 🧪 Testing

```bash
# Test API Gateway
curl http://localhost:3000/health

# Test individual services
curl http://localhost:3001/health  # User Service
curl http://localhost:3002/health  # Listing Service
```

## 🐛 Troubleshooting

### Services Won't Start
- Check logs: `docker-compose logs` or `kubectl logs -n kayak`
- Verify MongoDB connection
- Ensure ports are not in use

### MongoDB Connection Issues
- Verify connection string
- Check IP whitelist in MongoDB Atlas
- Test connection with MongoDB Compass

### Frontend Not Loading
- Check if frontend dev server is running
- Verify API Gateway is accessible
- Check browser console for errors

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed troubleshooting.

## 📝 Development

### Running Services Locally

```bash
cd services/<service-name>
npm install
npm start
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

### Making Changes

1. Edit code in respective service directories
2. Rebuild Docker images: `docker-compose up --build`
3. Or restart Kubernetes deployments: `kubectl rollout restart deployment/<service> -n kayak`

## 🚢 Deployment

### Docker Compose
```bash
docker-compose up --build -d
```

### Kubernetes
```bash
cd k8s
./build-images.sh
./deploy.sh
```

## 📊 Service Endpoints

### Docker Compose
- Frontend: http://localhost:5174
- API Gateway: http://localhost:3000
- User Service: http://localhost:3001
- Listing Service: http://localhost:3002
- Booking Service: http://localhost:3003
- Billing Service: http://localhost:3004
- Review Service: http://localhost:3005
- Analytics Service: http://localhost:3006
- Recommendation Service: http://localhost:8000

### Kubernetes
- Frontend: http://kayak.local
- API: http://kayak.local/api
- WebSocket: ws://kayak.local/ws

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

[Add your license information here]

## 👥 Authors

[Add author information here]

## 🙏 Acknowledgments

- Built for educational purposes
- Inspired by KAYAK travel platform

---

**For detailed setup instructions, see [SETUP_GUIDE.md](./SETUP_GUIDE.md)**

**Happy Traveling! ✈️🏨🚗**
