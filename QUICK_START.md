# ⚡ Quick Start Guide - Kayak Travel Platform

This is a condensed version of the setup guide. For detailed instructions, see [DOCKER_RUN_GUIDE.md](./DOCKER_RUN_GUIDE.md).

## 🚀 5-Minute Setup

### Prerequisites Checklist
- [ ] Docker Desktop installed and running
- [ ] Node.js 20+ installed
- [ ] MySQL 8.0+ installed and running
- [ ] MongoDB Atlas account created

### Step 1: Configure MongoDB Atlas (2 minutes)

1. Create account at https://www.mongodb.com/cloud/atlas
2. Create free cluster (M0)
3. Create database user (username + password)
4. Whitelist IP: `0.0.0.0/0` (for development)
5. Get connection string: `mongodb+srv://username:password@cluster-url/kayak`

### Step 2: Update Configuration (1 minute)

Edit `docker-compose.yml`:

1. **Replace MongoDB URI** in all services (search for `MONGODB_URI`):
   ```yaml
   MONGODB_URI: mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER/kayak
   ```

2. **Update MySQL password** in these services:
   - `booking-service` (line 167)
   - `billing-service` (line 202)
   - `admin-analytics-service` (line 259)
   ```yaml
   MYSQL_PASSWORD: YOUR_MYSQL_PASSWORD
   ```

### Step 3: Initialize MySQL Database (1 minute)

```bash
cd scripts
npm install
MYSQL_HOST=localhost MYSQL_PORT=3306 MYSQL_USER=root MYSQL_PASSWORD=YOUR_MYSQL_PASSWORD MYSQL_DATABASE=kayak_db node runMySQLInit.js
cd ..
```

**Windows PowerShell:**
```powershell
cd scripts
npm install
$env:MYSQL_HOST="localhost"
$env:MYSQL_PORT="3306"
$env:MYSQL_USER="root"
$env:MYSQL_PASSWORD="YOUR_MYSQL_PASSWORD"
$env:MYSQL_DATABASE="kayak_db"
node runMySQLInit.js
cd ..
```

### Step 4: Start Docker Services (2 minutes)

```bash
# From project root
docker-compose up --build -d

# Wait 2-3 minutes for services to start
# Check status:
docker-compose ps

# Verify API Gateway:
curl http://localhost:3000/health
```

### Step 5: Start Frontend (1 minute)

```bash
cd frontend
npm install
npm run dev
```

### Step 6: Access Application

- **Frontend:** http://localhost:5174
- **API Gateway:** http://localhost:3000
- **Health Check:** http://localhost:3000/health

---

## 📋 Service Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend | 5174 | http://localhost:5174 |
| API Gateway | 3000 | http://localhost:3000 |
| User Service | 3001 | http://localhost:3001 |
| Listing Service | 3002 | http://localhost:3002 |
| Booking Service | 3003 | http://localhost:3003 |
| Billing Service | 3004 | http://localhost:3004 |
| Review Service | 3005 | http://localhost:3005 |
| Analytics Service | 3006 | http://localhost:3006 |
| Recommendation Service | 8001 | http://localhost:8001 |
| Redis | 6380 | - |
| Kafka | 9092, 9093 | - |

---

## 🔧 Common Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Restart specific service
docker-compose restart <service-name>

# Check service status
docker-compose ps

# Rebuild and restart
docker-compose up --build -d
```

---

## 🐛 Quick Troubleshooting

**Services won't start?**
```bash
docker-compose logs <service-name>
```

**MongoDB connection error?**
- Check connection string in docker-compose.yml
- Verify IP is whitelisted in MongoDB Atlas

**MySQL connection error?**
- Verify MySQL is running: `mysql -u root -p`
- Check password in docker-compose.yml
- Reinitialize: `cd scripts && node runMySQLInit.js`

**Port already in use?**
- Find process: `lsof -i :3000` (Mac/Linux) or `netstat -ano | findstr :3000` (Windows)
- Kill process or change port in docker-compose.yml

---

## 📚 Full Documentation

For detailed instructions, troubleshooting, and advanced configuration, see:
- **[DOCKER_RUN_GUIDE.md](./DOCKER_RUN_GUIDE.md)** - Complete setup guide
- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Original setup guide
- **[README.md](./README.md)** - Project overview

---

**That's it! You're ready to go! 🎉**

