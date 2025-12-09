# 🛫 Kayak Travel Platform

A full-stack, microservices-based travel booking platform inspired by KAYAK, featuring AI-powered recommendations, real-time updates, and comprehensive analytics. Built with modern technologies including React, Node.js, Python, FastAPI, MongoDB, MySQL, Redis, Kafka, and Kubernetes.

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Technology Stack](#-technology-stack)
- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)
- [Configuration](#-configuration)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Performance Testing](#-performance-testing)
- [Development](#-development)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

### Core Functionality
- **Multi-Product Search** - Search and compare flights, hotels, and car rentals
- **Real-time Booking System** - Complete booking workflow with availability checks
- **User Management** - Registration, authentication, JWT-based sessions, and user profiles
- **Billing & Payments** - Integrated payment processing and invoice management
- **Reviews & Ratings** - User-generated reviews with image uploads
- **Admin Dashboard** - Comprehensive admin panel with analytics and management tools
- **Provider Analytics** - Detailed analytics for travel providers (hotels, airlines, car rentals)

### Advanced Features
- **AI-Powered Recommendations** - Agentic recommendation service with:
  - Natural language intent parsing
  - Personalized trip planning
  - Deal detection and tagging
  - Bundle recommendations
  - Watchlist management
  - Real-time WebSocket updates
- **Event-Driven Architecture** - Kafka-based event streaming for:
  - Booking events
  - User activity logging
  - Review submissions
  - Analytics aggregation
- **Caching Layer** - Redis caching for:
  - Search results
  - User sessions
  - Listing details
  - API responses
- **Performance Optimizations**:
  - Connection pooling
  - Database indexing
  - Pagination
  - Response caching
- **Real-time Updates** - WebSocket support for live notifications and recommendations

## 🏗️ Architecture

### Microservices Architecture

The platform is built using a microservices architecture with the following services:

#### Backend Services (Node.js/Express)
1. **User Service** (`3001`) - User management, authentication, JWT tokens, admin management
2. **Listing Service** (`3002`) - Flight, hotel, and car listings with availability management
3. **Booking Service** (`3003`) - Booking creation, management, and status tracking
4. **Billing Service** (`3004`) - Payment processing, invoices, and billing history
5. **Review/Logging Service** (`3005`) - Reviews, ratings, user activity logging, image uploads
6. **Admin/Analytics Service** (`3006`) - Analytics dashboards, admin operations, provider analytics
7. **API Gateway** (`3000`) - Single entry point routing requests to appropriate services

#### AI Service (Python/FastAPI)
8. **Agentic Recommendation Service** (`8001`) - AI-powered recommendations, intent parsing, deal detection, WebSocket support

#### Infrastructure Services
- **Redis** (`6380`) - Caching and session management
- **Kafka** (`9092`) - Event streaming and message queue
- **Zookeeper** (`2181`) - Kafka coordination
- **MongoDB Atlas** - Primary NoSQL database
- **MySQL** - Relational database for bookings and billing

### Frontend
- **React 18** with Vite
- **Redux Toolkit** for state management
- **React Router** for navigation
- **Framer Motion** for animations
- **React Hot Toast** for notifications

### Data Flow

```
Frontend (React)
    ↓
API Gateway
    ↓
Microservices (Node.js)
    ↓
Databases (MongoDB, MySQL)
    ↑
Redis Cache
    ↑
Kafka Events
    ↓
AI Recommendation Service (Python/FastAPI)
```

## 🛠️ Technology Stack

### Frontend
- **React 18.2.0** - UI framework
- **Vite 7.2.4** - Build tool and dev server
- **Redux Toolkit 2.0.1** - State management
- **React Router 6.20.0** - Routing
- **Framer Motion 10.16.16** - Animations
- **Axios 1.6.2** - HTTP client
- **React Hot Toast 2.4.1** - Notifications
- **Date-fns 2.30.0** - Date utilities

### Backend
- **Node.js 20+** - Runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database (Atlas)
- **MySQL 8.0** - Relational database
- **Mongoose** - MongoDB ODM
- **mysql2** - MySQL driver

### AI/ML Service
- **Python 3.7+**
- **FastAPI 0.109.0** - Web framework
- **Uvicorn** - ASGI server
- **OpenAI API** - LLM integration
- **Pandas 2.1.4** - Data processing
- **SQLAlchemy 2.0+** - ORM
- **SQLModel** - Database models

### Infrastructure
- **Redis 7** - Caching and sessions
- **Apache Kafka 7.5.0** - Event streaming
- **Zookeeper 7.5.0** - Kafka coordination
- **Docker & Docker Compose** - Containerization
- **Kubernetes** - Orchestration
- **Nginx** - Reverse proxy and ingress

### Testing
- **JMeter** - Performance and load testing

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Docker Desktop** (or Docker + Docker Compose) - For containerized deployment
- **Node.js 20+** - For local development
- **Python 3.7+** - For AI service development
- **kubectl** - For Kubernetes deployment (optional)
- **MongoDB Atlas Account** - Free tier works fine
- **MySQL** - Local installation or Docker container
- **OpenAI API Key** - For AI recommendations (optional, service works without it)

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended for Development)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd kayak-simulation
   ```

2. **Set up MongoDB Atlas**
   - Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a new cluster (free tier M0 works)
   - Create a database user
   - Whitelist your IP address (use `0.0.0.0/0` for development)
   - Get your connection string

3. **Configure environment variables**
   - Update `docker-compose.yml` with your MongoDB URI
   - Update MySQL password if using local MySQL
   - Set `OPENAI_API_KEY` environment variable (optional)

4. **Start all services**
   ```bash
   docker-compose up --build
   ```
   This will start:
   - Redis
   - Zookeeper
   - Kafka
   - All microservices
   - API Gateway
   - Agentic Recommendation Service

5. **Start the frontend** (in a new terminal)
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:5174
   - API Gateway: http://localhost:3000
   - Health check: http://localhost:3000/health

### Option 2: Kubernetes (Recommended for Production)

1. **Set up Kubernetes**
   - **Docker Desktop**: Enable Kubernetes in Settings → Kubernetes
   - **OR Minikube**: `minikube start`

2. **Install Nginx Ingress Controller**
   ```bash
   kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml
   ```

3. **Configure MongoDB and MySQL**
   - Update MongoDB URI in `k8s/*.yaml` files
   - Update MySQL connection details if needed

4. **Build and deploy**
   ```bash
   cd k8s
   chmod +x build-images.sh deploy.sh
   ./build-images.sh
   ./deploy.sh
   ```

5. **Configure local domain**
   ```bash
   # On macOS/Linux
   sudo nano /etc/hosts
   # Add: 127.0.0.1 kayak.local
   
   # On Windows
   # Edit C:\Windows\System32\drivers\etc\hosts
   # Add: 127.0.0.1 kayak.local
   ```

6. **Access the application**
   - http://kayak.local

## ⚙️ Configuration

### Environment Variables

Key environment variables to configure:

#### Backend Services
- `MONGODB_URI` - MongoDB Atlas connection string
- `MONGODB_DB_NAME` - Database name (default: `kayak`)
- `KAFKA_BROKER` - Kafka broker address (default: `kafka:9093`)
- `REDIS_HOST` - Redis host (default: `redis`)
- `REDIS_PORT` - Redis port (default: `6379`)
- `JWT_SECRET` - JWT secret key (**change in production!**)
- `ACCESS_TOKEN_SECRET` - Access token secret (**change in production!**)
- `REFRESH_TOKEN_SECRET` - Refresh token secret (**change in production!**)
- `ADMIN_API_KEY` - Admin API key (**change in production!**)

#### MySQL Configuration
- `MYSQL_HOST` - MySQL host (default: `host.docker.internal` for Docker)
- `MYSQL_PORT` - MySQL port (default: `3306`)
- `MYSQL_USER` - MySQL username (default: `root`)
- `MYSQL_PASSWORD` - MySQL password
- `MYSQL_DATABASE` - Database name (default: `kayak_db`)

#### AI Service
- `OPENAI_API_KEY` - OpenAI API key for AI features (optional)
- `SQLITE_DATABASE_URL` - SQLite database path for deals storage

#### Performance Flags
- `ENABLE_POOLING` - Enable connection pooling (default: `false`)
- `ENABLE_INDEXING` - Enable database indexing (default: `false`)
- `ENABLE_PAGINATION` - Enable pagination (default: `false`)

### MongoDB Atlas Setup

1. **Create Account**: https://www.mongodb.com/cloud/atlas
2. **Create Cluster**: Choose free tier M0
3. **Create Database User**: 
   - Username and password
   - Save credentials securely
4. **Whitelist IP**: 
   - For development: `0.0.0.0/0` (allows all IPs)
   - For production: Add specific IPs
5. **Get Connection String**:
   - Format: `mongodb+srv://<username>:<password>@cluster-xxx.mongodb.net/kayak?appName=Cluster-xxx`
   - Replace `<username>` and `<password>` with your credentials

### MySQL Setup

#### Option 1: Local MySQL
1. Install MySQL 8.0 locally
2. Create database: `CREATE DATABASE kayak_db;`
3. Run initialization script: `scripts/initMySQL.sql`
4. Update `docker-compose.yml` with your MySQL password

#### Option 2: Docker MySQL
Uncomment the MySQL service in `docker-compose.yml` and configure password.

## 📁 Project Structure

```
kayak-simulation/
├── frontend/                          # React frontend application
│   ├── src/
│   │   ├── components/                # Reusable React components
│   │   │   ├── Layout/                # Layout components
│   │   │   ├── NotificationCenter/   # Notification system
│   │   │   └── TravelAgent/          # AI travel agent UI
│   │   ├── pages/                     # Page components
│   │   │   ├── admin/                 # Admin dashboard pages
│   │   │   ├── Home.jsx               # Landing page
│   │   │   ├── FlightSearch.jsx       # Flight search
│   │   │   ├── HotelSearch.jsx       # Hotel search
│   │   │   ├── CarSearch.jsx         # Car rental search
│   │   │   ├── Booking.jsx            # Booking page
│   │   │   └── ...
│   │   ├── store/                     # Redux store and slices
│   │   ├── services/                  # API service clients
│   │   │   ├── api.js                 # Main API client
│   │   │   ├── websocket.js           # WebSocket client
│   │   │   └── kafkaConsumer.js       # Kafka consumer
│   │   ├── contexts/                  # React contexts
│   │   └── main.jsx                   # Entry point
│   ├── Dockerfile                     # Frontend Docker image
│   ├── package.json
│   └── vite.config.js
│
├── services/                          # Microservices
│   ├── user-service/                  # User management service
│   │   ├── src/
│   │   │   ├── controllers/           # Request handlers
│   │   │   ├── models/                # Database models
│   │   │   ├── routes/                # API routes
│   │   │   ├── middleware/            # Auth middleware
│   │   │   └── utils/                 # Utilities
│   │   └── Dockerfile
│   │
│   ├── listing-service/               # Listings service
│   ├── booking-service/               # Booking service
│   ├── billing-service/              # Billing service
│   ├── review-logging-service/        # Reviews and logging
│   ├── admin-analytics-service/       # Admin and analytics
│   ├── api-gateway/                   # API Gateway
│   │
│   └── agentic-recommendation-service/ # AI recommendation service
│       ├── src/
│       │   ├── services/
│       │   │   ├── concierge_agent/   # Trip planning agent
│       │   │   └── deals_agent/      # Deal detection agent
│       │   ├── routes/                # FastAPI routes
│       │   ├── models/                # Data models
│       │   ├── workers/               # Background workers
│       │   └── websocket_manager.py   # WebSocket manager
│       ├── data/                      # CSV data files
│       ├── requirements.txt
│       └── Dockerfile
│
├── k8s/                               # Kubernetes manifests
│   ├── namespace.yaml                 # Namespace definition
│   ├── *.yaml                         # Service deployments
│   ├── ingress.yaml                   # Ingress configuration
│   ├── build-images.sh                # Image build script
│   └── deploy.sh                      # Deployment script
│
├── scripts/                            # Utility scripts
│   ├── seedData.js                    # Seed database
│   ├── seedProviderData.js            # Seed providers
│   ├── seedListingClicks.js           # Seed click logs
│   ├── createProviders.js             # Create provider accounts
│   ├── initMySQL.sql                  # MySQL initialization
│   └── package.json
│
├── jmeter-tests/                      # Performance testing
│   ├── test-plans/                    # JMeter test plans
│   ├── results/                       # Test results (.jtl files)
│   ├── reports/                       # HTML reports
│   └── charts/                        # Performance charts
│
├── shared/                            # Shared utilities
│   └── redisClient.js                 # Redis client
│
├── docker-compose.yml                 # Docker Compose configuration
└── README.md                          # This file
```

## 📡 API Documentation

### Service Endpoints

#### Docker Compose (Local Development)
- **Frontend**: http://localhost:5174
- **API Gateway**: http://localhost:3000
- **User Service**: http://localhost:3001
- **Listing Service**: http://localhost:3002
- **Booking Service**: http://localhost:3003
- **Billing Service**: http://localhost:3004
- **Review Service**: http://localhost:3005
- **Analytics Service**: http://localhost:3006
- **Recommendation Service**: http://localhost:8001

#### Kubernetes (Production)
- **Frontend**: http://kayak.local
- **API**: http://kayak.local/api
- **WebSocket**: ws://kayak.local/ws

### API Routes

All API requests go through the API Gateway at `/api/*`:

#### User Service
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - User login
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

#### Listing Service
- `GET /api/listings/flights` - Search flights
- `GET /api/listings/hotels` - Search hotels
- `GET /api/listings/cars` - Search car rentals
- `GET /api/listings/flights/:id` - Get flight details
- `GET /api/listings/hotels/:id` - Get hotel details
- `GET /api/listings/cars/:id` - Get car details

#### Booking Service
- `POST /api/bookings` - Create booking
- `GET /api/bookings` - Get user bookings
- `GET /api/bookings/:id` - Get booking details
- `PUT /api/bookings/:id` - Update booking

#### Billing Service
- `POST /api/billing/payment` - Process payment
- `GET /api/billing/invoices` - Get invoices
- `GET /api/billing/invoices/:id` - Get invoice details

#### Review Service
- `POST /api/reviews` - Create review
- `GET /api/reviews/:listingId` - Get reviews for listing
- `POST /api/logging/click` - Log listing click

#### Admin Service
- `GET /api/admin/analytics` - Get analytics data
- `GET /api/admin/providers` - Get providers
- `GET /api/admin/providers/:id/analytics` - Get provider analytics

#### Recommendation Service
- `POST /api/recommendations/intent` - Parse user intent
- `GET /api/recommendations/bundles` - Get bundle recommendations
- `GET /api/recommendations/deals` - Get deals
- `WebSocket /ws` - Real-time recommendations

### Health Checks

All services expose a health endpoint:
```bash
curl http://localhost:3000/health
curl http://localhost:3001/health
# ... etc
```

## 🧪 Performance Testing

The project includes comprehensive JMeter performance tests comparing different optimization strategies.

### Test Scenarios

1. **BASE** - No optimizations
2. **BASE + REDIS** - With Redis caching
3. **BASE + REDIS + KAFKA** - With Redis and Kafka
4. **ALL OPTIMIZATIONS** - Full optimization stack

### Running Tests

```bash
cd jmeter-tests
# Run specific test plan
jmeter -n -t test-plans/test_base.jmx -l results/results_base.jtl

# Generate HTML report
jmeter -g results/results_base.jtl -o reports/report_base
```

### Performance Results

Based on testing with 100 concurrent users:

| Configuration | Success Rate | Avg Response Time | Throughput |
|--------------|-------------|-------------------|------------|
| BASE | 27.27% | 1778.07ms | 50.55 req/s |
| BASE + REDIS | 27.22% | 1946.10ms | 46.82 req/s |
| BASE + REDIS + KAFKA | 62.67% | 786.18ms | 103.38 req/s |
| ALL OPTIMIZATIONS | 62.67% | 395.07ms | 192.56 req/s |

**Key Improvements with All Optimizations:**
- ⚡ **4.5x faster** average response time (395ms vs 1778ms)
- 🚀 **3.8x higher** throughput (192.56 req/s vs 50.55 req/s)
- ✅ **2.3x better** success rate (62.67% vs 27.27%)

View detailed charts and reports in `jmeter-tests/charts/`.

## 💻 Development

### Running Services Locally

#### Backend Services
```bash
cd services/<service-name>
npm install
npm start
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

#### AI Service
```bash
cd services/agentic-recommendation-service
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8001
```

### Database Seeding

#### Seed Initial Data
```bash
cd scripts
npm install
node seedData.js
```

#### Seed Providers
```bash
node seedProviderData.js
```

#### Seed Listing Clicks (for analytics)
```bash
node seedListingClicks.js
# Or with custom provider
PROVIDER_NAME="Marriott" node seedListingClicks.js
```

### Making Changes

1. **Edit code** in respective service directories
2. **Rebuild Docker images**: `docker-compose up --build`
3. **Or restart Kubernetes deployments**: 
   ```bash
   kubectl rollout restart deployment/<service> -n kayak
   ```

### Code Structure

- **Controllers** - Handle HTTP requests and responses
- **Models** - Database schemas and models
- **Routes** - API route definitions
- **Middleware** - Authentication, validation, error handling
- **Services** - Business logic
- **Utils** - Helper functions and utilities

## 🚢 Deployment

### Docker Compose Deployment

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Kubernetes Deployment

```bash
cd k8s

# Build Docker images
./build-images.sh

# Deploy all services
./deploy.sh

# Check deployment status
kubectl get pods -n kayak

# View logs
kubectl logs -f <pod-name> -n kayak

# Delete deployment
kubectl delete namespace kayak
```

### Production Considerations

1. **Security**:
   - Change all default secrets and API keys
   - Use environment variables or secrets management
   - Enable HTTPS/TLS
   - Configure CORS properly

2. **Database**:
   - Use managed MongoDB Atlas (production tier)
   - Set up MySQL replication
   - Configure backups

3. **Caching**:
   - Use Redis Cluster for high availability
   - Configure appropriate TTL values

4. **Monitoring**:
   - Set up logging aggregation (ELK, Loki)
   - Configure metrics collection (Prometheus)
   - Set up alerting

5. **Scaling**:
   - Configure horizontal pod autoscaling in Kubernetes
   - Use load balancers
   - Scale services based on load

## 🐛 Troubleshooting

### Services Won't Start

**Check logs:**
```bash
# Docker Compose
docker-compose logs <service-name>

# Kubernetes
kubectl logs -f <pod-name> -n kayak
```

**Common issues:**
- Port conflicts - Check if ports are already in use
- MongoDB connection - Verify connection string and IP whitelist
- Kafka not ready - Wait for Zookeeper and Kafka to be healthy

### MongoDB Connection Issues

1. **Verify connection string** format
2. **Check IP whitelist** in MongoDB Atlas
3. **Test connection** with MongoDB Compass
4. **Verify credentials** are correct

### Frontend Not Loading

1. **Check if frontend dev server is running**
2. **Verify API Gateway is accessible**
3. **Check browser console** for errors
4. **Verify CORS** configuration

### Kafka Connection Issues

1. **Wait for Zookeeper** to be healthy first
2. **Check Kafka health**: `docker-compose logs kafka`
3. **Verify broker address** in environment variables
4. **Check network** connectivity between services

### MySQL Connection Issues

1. **Verify MySQL is running** (local or Docker)
2. **Check credentials** in environment variables
3. **Verify database exists**: `SHOW DATABASES;`
4. **Run initialization script**: `scripts/initMySQL.sql`

### Performance Issues

1. **Enable optimizations** in environment variables:
   - `ENABLE_POOLING=true`
   - `ENABLE_INDEXING=true`
   - `ENABLE_PAGINATION=true`
2. **Check Redis** is running and accessible
3. **Monitor Kafka** lag and throughput
4. **Review JMeter test results** for bottlenecks

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Commit your changes**
   ```bash
   git commit -m 'Add some amazing feature'
   ```
5. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
6. **Open a Pull Request**

### Development Guidelines

- Follow existing code style and patterns
- Write clear commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all services start without errors

## 📄 License

[Add your license information here]

## 👥 Authors

[Add author information here]

## 🙏 Acknowledgments

- Built for educational purposes
- Inspired by KAYAK travel platform
- Uses OpenAI API for AI-powered recommendations
- MongoDB Atlas for cloud database hosting

## 📚 Additional Documentation

- **[k8s/README.md](./k8s/README.md)** - Kubernetes deployment guide
- **[services/README.md](./services/README.md)** - Services overview
- **[jmeter-tests/charts/README.md](./jmeter-tests/charts/README.md)** - Performance test results
- **[scripts/SEED_LISTING_CLICKS_README.md](./scripts/SEED_LISTING_CLICKS_README.md)** - Database seeding guide

---

**Happy Traveling! ✈️🏨🚗**

For questions or issues, please open an issue on GitHub.
