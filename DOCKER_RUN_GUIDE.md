# 🚀 Complete Docker Run Guide - Kayak Travel Platform

This guide provides detailed step-by-step instructions for running the Kayak Travel Platform application using Docker.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Setup Configuration](#pre-setup-configuration)
3. [Database Setup](#database-setup)
4. [Starting Services with Docker](#starting-services-with-docker)
5. [Frontend Setup](#frontend-setup)
6. [Verification & Testing](#verification--testing)
7. [Accessing the Application](#accessing-the-application)
8. [Common Commands](#common-commands)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have the following installed:

### Required Software

1. **Docker Desktop** (includes Docker and Docker Compose)
   - Download: https://www.docker.com/products/docker-desktop
   - Verify installation:
     ```bash
     docker --version
     docker-compose --version
     ```
   - **Windows**: Make sure WSL 2 is enabled (Docker Desktop will prompt you)

2. **Node.js 20.x or later** (for frontend development)
   - Download: https://nodejs.org/
   - Verify installation:
     ```bash
     node --version
     npm --version
     ```

3. **MySQL 8.0 or later** (for bookings and billing data)
   - **Windows**: Download MySQL Installer from https://dev.mysql.com/downloads/installer/
   - **Mac**: `brew install mysql` or download from MySQL website
   - **Linux**: `sudo apt-get install mysql-server` (Ubuntu/Debian)
   - Verify installation:
     ```bash
     mysql --version
     ```

4. **MongoDB Atlas Account** (cloud database - free tier available)
   - Sign up: https://www.mongodb.com/cloud/atlas
   - Free tier (M0) is sufficient for development

5. **Git** (to clone the repository if needed)
   - Verify installation:
     ```bash
     git --version
     ```

### System Requirements

- **RAM**: At least 8GB available (Docker containers will use significant memory)
- **Disk Space**: At least 10GB free
- **Network**: Internet connection for MongoDB Atlas and Docker image pulls

---

## Pre-Setup Configuration

### Step 1: Clone/Verify Repository

If you haven't already cloned the repository:

```bash
git clone <repository-url>
cd kayak-simulation
```

If you already have the repository, navigate to it:

```bash
cd kayak-simulation
```

### Step 2: Configure MongoDB Atlas

1. **Create MongoDB Atlas Account** (if you don't have one):
   - Go to https://www.mongodb.com/cloud/atlas
   - Sign up for a free account

2. **Create a Cluster**:
   - Choose the free tier (M0)
   - Select a cloud provider and region
   - Wait for cluster creation (takes 3-5 minutes)

3. **Create Database User**:
   - Go to "Database Access" → "Add New Database User"
   - Choose "Password" authentication
   - Username: `your-username`
   - Password: `your-password` (save this!)
   - Set privileges to "Atlas admin" or "Read and write to any database"

4. **Configure Network Access**:
   - Go to "Network Access" → "Add IP Address"
   - For development: Click "Allow Access from Anywhere" (adds `0.0.0.0/0`)
   - For production: Add your specific IP addresses

5. **Get Connection String**:
   - Go to "Database" → "Connect" → "Connect your application"
   - Copy the connection string
   - Format: `mongodb+srv://<username>:<password>@<cluster-url>/kayak?appName=Cluster-236`
   - Replace `<username>` and `<password>` with your credentials

### Step 3: Update docker-compose.yml

Open `docker-compose.yml` and update the MongoDB connection string in **ALL services**:

**Services that need MongoDB URI:**
- `user-service` (line 98)
- `listing-service` (line 129)
- `booking-service` (line 159)
- `billing-service` (line 195)
- `review-logging-service` (line 230)
- `admin-analytics-service` (line 250)
- `agentic-recommendation-service` (line 322)

**Example update:**
```yaml
MONGODB_URI: mongodb+srv://your-username:your-password@cluster-236.njc5716.mongodb.net/kayak?appName=Cluster-236
```

**Important**: Replace `your-username` and `your-password` with your actual MongoDB Atlas credentials.

### Step 4: Configure MySQL Connection

The application uses MySQL for bookings and billing data. You need to update MySQL credentials in `docker-compose.yml`:

**Services that need MySQL:**
- `booking-service` (lines 164-168)
- `billing-service` (lines 199-203)
- `admin-analytics-service` (lines 256-260)

**Update these values:**
```yaml
MYSQL_HOST: host.docker.internal  # Keep this if MySQL is on your local machine
MYSQL_PORT: 3306                  # Default MySQL port
MYSQL_USER: root                  # Your MySQL username
MYSQL_PASSWORD: your_mysql_password  # ⚠️ CHANGE THIS to your MySQL root password
MYSQL_DATABASE: kayak_db         # Database name (will be created)
```

**Important Notes:**
- If MySQL is running locally (not in Docker), use `host.docker.internal` as the host
- If you want to run MySQL in Docker, uncomment the MySQL service in `docker-compose.yml` (lines 9-29) and use `mysql` as the host
- Update `MYSQL_PASSWORD` to match your actual MySQL root password

---

## Database Setup

### Step 1: Start MySQL Service

**Windows:**
- MySQL should start automatically after installation
- If not, open "Services" → Find "MySQL80" → Right-click → Start

**Mac:**
```bash
brew services start mysql
# Or
sudo systemctl start mysql
```

**Linux:**
```bash
sudo systemctl start mysql
# Or
sudo service mysql start
```

**Verify MySQL is running:**
```bash
mysql -u root -p
# Enter your password when prompted
# Type EXIT; to exit
```

### Step 2: Initialize MySQL Database

The application needs a MySQL database with specific tables. Initialize it using the provided script:

```bash
# Navigate to scripts directory
cd scripts

# Install dependencies (if not already installed)
npm install

# Run the initialization script
# Replace 'your_mysql_password' with your actual MySQL root password
MYSQL_HOST=localhost MYSQL_PORT=3306 MYSQL_USER=root MYSQL_PASSWORD=your_mysql_password MYSQL_DATABASE=kayak_db node runMySQLInit.js
```

**Windows PowerShell:**
```powershell
$env:MYSQL_HOST="localhost"
$env:MYSQL_PORT="3306"
$env:MYSQL_USER="root"
$env:MYSQL_PASSWORD="your_mysql_password"
$env:MYSQL_DATABASE="kayak_db"
node runMySQLInit.js
```

**Expected Output:**
```
==================================================
MySQL Database Initialization Script
==================================================

🔍 Connecting to MySQL server...
   Host: localhost
   Port: 3306
   User: root

✅ Connected to MySQL server successfully!

📖 Reading SQL script: C:\...\scripts\initMySQL.sql
✅ SQL script loaded

🚀 Executing SQL script...

✅ Database and tables created successfully!

📊 Created tables:
   ✓ bookings
   ✓ billings

✅ MySQL initialization completed successfully!
```

**Verify Database Created:**
```bash
mysql -u root -p -e "USE kayak_db; SHOW TABLES;"
```

You should see:
```
+------------------+
| Tables_in_kayak_db |
+------------------+
| bookings         |
| billings         |
+------------------+
```

---

## Starting Services with Docker

### Step 1: Verify Docker is Running

```bash
# Check Docker status
docker ps

# If you get an error, start Docker Desktop
```

### Step 2: Build and Start All Services

**Option A: Build and Start in Foreground (see logs):**
```bash
# From project root directory
docker-compose up --build
```

**Option B: Build and Start in Background (detached mode):**
```bash
docker-compose up --build -d
```

**What this does:**
- Builds Docker images for all services
- Creates a Docker network (`kayak-network`)
- Starts all containers:
  - Redis (port 6380)
  - Zookeeper (port 2181)
  - Kafka (ports 9092, 9093)
  - User Service (port 3001)
  - Listing Service (port 3002)
  - Booking Service (port 3003)
  - Billing Service (port 3004)
  - Review/Logging Service (port 3005)
  - Admin/Analytics Service (port 3006)
  - API Gateway (port 3000)
  - Agentic Recommendation Service (port 8001)

**Expected Output:**
```
[+] Building 15.2s (15/15) FINISHED
[+] Running 12/12
 ✔ Container kayak-redis              Started
 ✔ Container kayak-zookeeper          Started
 ✔ Container kayak-kafka              Started
 ✔ Container kayak-user-service       Started
 ✔ Container kayak-listing-service   Started
 ✔ Container kayak-booking-service    Started
 ✔ Container kayak-billing-service    Started
 ✔ Container kayak-review-logging-service Started
 ✔ Container kayak-admin-analytics-service Started
 ✔ Container kayak-agentic-recommendation-service Started
 ✔ Container kayak-api-gateway        Started
```

**Wait Time:** Services take 2-3 minutes to fully start. Kafka and Zookeeper need time to initialize.

### Step 3: Check Service Status

```bash
# Check all containers
docker-compose ps

# Expected output shows all services as "Up"
```

**Check Logs:**
```bash
# View all logs
docker-compose logs

# View logs for specific service
docker-compose logs user-service
docker-compose logs api-gateway
docker-compose logs kafka

# Follow logs in real-time
docker-compose logs -f

# Follow logs for specific service
docker-compose logs -f api-gateway
```

### Step 4: Verify Services are Healthy

**Test API Gateway:**
```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Test Individual Services:**
```bash
# User Service
curl http://localhost:3001/health

# Listing Service
curl http://localhost:3002/health

# Booking Service
curl http://localhost:3003/health

# Billing Service
curl http://localhost:3004/health

# Review Service
curl http://localhost:3005/health

# Analytics Service
curl http://localhost:3006/health

# Recommendation Service
curl http://localhost:8001/health
```

**If services are not responding:**
- Check logs: `docker-compose logs <service-name>`
- Wait a bit longer (some services take time to connect to databases)
- Verify MongoDB connection string is correct
- Verify MySQL is running and accessible

---

## Frontend Setup

The frontend runs separately from Docker containers (for development). You can also run it in Docker if needed.

### Option 1: Run Frontend Locally (Recommended for Development)

**Step 1: Navigate to Frontend Directory**
```bash
cd frontend
```

**Step 2: Install Dependencies**
```bash
npm install
```

**Step 3: Start Development Server**
```bash
npm run dev
```

**Expected Output:**
```
  VITE v7.2.4  ready in 500 ms

  ➜  Local:   http://localhost:5174/
  ➜  Network: use --host to expose
```

**Frontend will be available at:** http://localhost:5174

**Note:** The frontend is configured to proxy API requests to `http://localhost:3000/api` automatically.

### Option 2: Run Frontend in Docker (Production-like)

If you want to run the frontend in Docker:

**Step 1: Build Frontend Image**
```bash
cd frontend
docker build -t kayak-frontend .
```

**Step 2: Run Frontend Container**
```bash
docker run -d -p 80:80 --name kayak-frontend --network kayak-simulation_kayak-network kayak-frontend
```

**Note:** For Docker Compose, you would need to add the frontend service to `docker-compose.yml`.

---

## Verification & Testing

### Step 1: Verify All Services are Running

```bash
# Check container status
docker-compose ps

# All services should show "Up" status
```

### Step 2: Test API Endpoints

**Test API Gateway Health:**
```bash
curl http://localhost:3000/health
```

**Test User Registration (example):**
```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

**Test Listing Search:**
```bash
curl http://localhost:3000/api/listings/search?type=Flight&origin=NYC&destination=LAX
```

### Step 3: Check Database Connections

**Verify MongoDB Connection:**
- Check service logs for MongoDB connection messages
- Look for "Connected to MongoDB" or similar messages
- If errors, verify connection string in `docker-compose.yml`

**Verify MySQL Connection:**
- Check booking-service and billing-service logs
- Look for "MySQL connected" or similar messages
- If errors, verify MySQL credentials and that MySQL is running

### Step 4: Test Kafka

```bash
# Check Kafka container logs
docker-compose logs kafka

# Should see messages about topics being created
```

---

## Accessing the Application

### Web Application

1. **Open Browser**
2. **Navigate to:** http://localhost:5174
3. **You should see:** The Kayak travel platform homepage

### API Endpoints

- **API Gateway:** http://localhost:3000
- **API Health Check:** http://localhost:3000/health
- **API Base URL:** http://localhost:3000/api

### Service Endpoints (Direct Access)

- **User Service:** http://localhost:3001
- **Listing Service:** http://localhost:3002
- **Booking Service:** http://localhost:3003
- **Billing Service:** http://localhost:3004
- **Review Service:** http://localhost:3005
- **Analytics Service:** http://localhost:3006
- **Recommendation Service:** http://localhost:8001

**Note:** In production, you should access services through the API Gateway, not directly.

---

## Common Commands

### Docker Compose Commands

```bash
# Start all services
docker-compose up

# Start in background (detached)
docker-compose up -d

# Build and start
docker-compose up --build

# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v

# View logs
docker-compose logs

# View logs for specific service
docker-compose logs <service-name>

# Follow logs (real-time)
docker-compose logs -f

# Restart specific service
docker-compose restart <service-name>

# Rebuild specific service
docker-compose up --build <service-name>

# Check service status
docker-compose ps

# Execute command in running container
docker-compose exec <service-name> <command>

# Example: Access shell in user-service
docker-compose exec user-service sh
```

### Docker Commands

```bash
# List running containers
docker ps

# List all containers (including stopped)
docker ps -a

# View container logs
docker logs <container-name>

# Follow container logs
docker logs -f <container-name>

# Stop container
docker stop <container-name>

# Start container
docker start <container-name>

# Remove container
docker rm <container-name>

# List images
docker images

# Remove image
docker rmi <image-name>

# Clean up unused resources
docker system prune
```

### MySQL Commands

```bash
# Connect to MySQL
mysql -u root -p

# Show databases
SHOW DATABASES;

# Use kayak_db
USE kayak_db;

# Show tables
SHOW TABLES;

# View bookings table structure
DESCRIBE bookings;

# View billings table structure
DESCRIBE billings;

# Count records
SELECT COUNT(*) FROM bookings;
SELECT COUNT(*) FROM billings;
```

---

## Troubleshooting

### Services Won't Start

**Problem:** Containers fail to start or exit immediately

**Solutions:**
1. **Check logs:**
   ```bash
   docker-compose logs <service-name>
   ```

2. **Verify Docker is running:**
   ```bash
   docker ps
   ```

3. **Check port conflicts:**
   ```bash
   # Windows PowerShell
   netstat -ano | findstr :3000
   
   # Mac/Linux
   lsof -i :3000
   ```

4. **Restart Docker Desktop** (Windows/Mac)

5. **Check available resources:**
   - Ensure you have enough RAM (8GB+ recommended)
   - Check disk space

### MongoDB Connection Errors

**Problem:** Services can't connect to MongoDB Atlas

**Solutions:**
1. **Verify connection string:**
   - Check `docker-compose.yml` for correct MongoDB URI
   - Ensure username and password are correct
   - Format: `mongodb+srv://username:password@cluster-url/kayak?appName=Cluster-236`

2. **Check network access:**
   - Go to MongoDB Atlas → Network Access
   - Ensure your IP is whitelisted (or `0.0.0.0/0` for development)

3. **Test connection:**
   ```bash
   # Install MongoDB shell (mongosh)
   # Then test:
   mongosh "mongodb+srv://username:password@cluster-url/kayak"
   ```

4. **Check service logs:**
   ```bash
   docker-compose logs user-service | grep -i mongo
   ```

### MySQL Connection Errors

**Problem:** Booking/Billing services can't connect to MySQL

**Solutions:**
1. **Verify MySQL is running:**
   ```bash
   # Windows: Check Services
   # Mac/Linux:
   sudo systemctl status mysql
   ```

2. **Test MySQL connection:**
   ```bash
   mysql -u root -p -h localhost -P 3306
   ```

3. **Check docker-compose.yml:**
   - Verify `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`
   - If MySQL is local, use `host.docker.internal`
   - If MySQL is in Docker, use service name (e.g., `mysql`)

4. **Verify database exists:**
   ```bash
   mysql -u root -p -e "SHOW DATABASES LIKE 'kayak_db';"
   ```

5. **Reinitialize database:**
   ```bash
   cd scripts
   MYSQL_HOST=localhost MYSQL_PORT=3306 MYSQL_USER=root MYSQL_PASSWORD=your_password MYSQL_DATABASE=kayak_db node runMySQLInit.js
   ```

6. **Check service logs:**
   ```bash
   docker-compose logs booking-service | grep -i mysql
   docker-compose logs billing-service | grep -i mysql
   ```

### Kafka Connection Errors

**Problem:** Services can't connect to Kafka

**Solutions:**
1. **Check Zookeeper is running first:**
   ```bash
   docker-compose ps zookeeper
   docker-compose logs zookeeper
   ```

2. **Check Kafka logs:**
   ```bash
   docker-compose logs kafka
   ```

3. **Restart Kafka and Zookeeper:**
   ```bash
   docker-compose restart zookeeper kafka
   ```

4. **Wait for Kafka to be ready:**
   - Kafka takes 30-60 seconds to fully start
   - Check logs for "started" message

### Port Already in Use

**Problem:** Error: "port is already allocated"

**Solutions:**
1. **Find process using port:**
   ```bash
   # Windows PowerShell
   netstat -ano | findstr :3000
   
   # Mac/Linux
   lsof -i :3000
   ```

2. **Kill the process:**
   ```bash
   # Windows
   taskkill /PID <PID> /F
   
   # Mac/Linux
   kill -9 <PID>
   ```

3. **Or change port in docker-compose.yml:**
   ```yaml
   ports:
     - "3001:3001"  # Change first number to available port
   ```

### Frontend Not Loading

**Problem:** Frontend shows errors or can't connect to API

**Solutions:**
1. **Verify frontend is running:**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Check API Gateway is accessible:**
   ```bash
   curl http://localhost:3000/health
   ```

3. **Check browser console:**
   - Open browser DevTools (F12)
   - Check Console tab for errors
   - Check Network tab for failed requests

4. **Verify API URL:**
   - Frontend should connect to `http://localhost:3000/api`
   - Check `frontend/src/services/api.js` for base URL

5. **Check CORS:**
   - API Gateway should have CORS enabled
   - Check API Gateway logs for CORS errors

### Container Keeps Restarting

**Problem:** Container status shows "Restarting"

**Solutions:**
1. **Check logs:**
   ```bash
   docker-compose logs <service-name>
   ```

2. **Check resource limits:**
   - Increase Docker Desktop memory allocation
   - Check if system has enough resources

3. **Check dependencies:**
   - Ensure dependent services (Redis, Kafka, MySQL) are running
   - Check health checks in docker-compose.yml

### Database Initialization Fails

**Problem:** MySQL initialization script fails

**Solutions:**
1. **Verify MySQL is running:**
   ```bash
   mysql --version
   mysql -u root -p
   ```

2. **Check credentials:**
   - Ensure password is correct
   - Try connecting manually with same credentials

3. **Check file path:**
   - Ensure `scripts/initMySQL.sql` exists
   - Check file permissions

4. **Run script manually:**
   ```bash
   mysql -u root -p < scripts/initMySQL.sql
   ```

### Services Start but Return Errors

**Problem:** Services start but API calls fail

**Solutions:**
1. **Check service logs for errors:**
   ```bash
   docker-compose logs -f
   ```

2. **Verify database connections:**
   - Check MongoDB connection
   - Check MySQL connection
   - Verify database schemas are initialized

3. **Check environment variables:**
   - Verify all required env vars are set in docker-compose.yml
   - Check for typos in variable names

4. **Test individual services:**
   ```bash
   curl http://localhost:3001/health
   curl http://localhost:3002/health
   # etc.
   ```

---

## Quick Reference: Complete Startup Sequence

Here's the complete sequence to start the application from scratch:

```bash
# 1. Navigate to project directory
cd kayak-simulation

# 2. Update docker-compose.yml with MongoDB URI and MySQL password

# 3. Start MySQL (if not already running)
# Windows: Check Services
# Mac: brew services start mysql
# Linux: sudo systemctl start mysql

# 4. Initialize MySQL database
cd scripts
npm install
MYSQL_HOST=localhost MYSQL_PORT=3306 MYSQL_USER=root MYSQL_PASSWORD=your_password MYSQL_DATABASE=kayak_db node runMySQLInit.js
cd ..

# 5. Start all Docker services
docker-compose up --build -d

# 6. Wait 2-3 minutes for services to start

# 7. Verify services
docker-compose ps
curl http://localhost:3000/health

# 8. Start frontend (in new terminal)
cd frontend
npm install
npm run dev

# 9. Open browser
# Navigate to: http://localhost:5174
```

---

## Additional Resources

- **MongoDB Atlas Documentation:** https://docs.atlas.mongodb.com/
- **Docker Documentation:** https://docs.docker.com/
- **Docker Compose Documentation:** https://docs.docker.com/compose/
- **MySQL Documentation:** https://dev.mysql.com/doc/

---

## Support

If you encounter issues not covered in this guide:

1. Check service logs: `docker-compose logs <service-name>`
2. Verify all prerequisites are installed
3. Check that ports are not in use
4. Verify database connections
5. Review the troubleshooting section above

---

**Happy Traveling! ✈️🏨🚗**

