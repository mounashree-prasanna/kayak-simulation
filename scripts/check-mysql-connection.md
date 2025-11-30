# MySQL Connection Guide: Docker vs Local

## The Problem

Your services are saving data to **Docker MySQL** (port 3307), but you're checking **Local MySQL** (port 3306).

## Connection Details

### Docker MySQL (Where your data is saved)
- **Host:** `localhost` (from your Windows machine)
- **Port:** `3307` (mapped from Docker container's port 3306)
- **Username:** `root`
- **Password:** `Meera@2632`
- **Database:** `kayak_db`
- **Container name:** `kayak-mysql`

### Local MySQL (Different instance)
- **Host:** `localhost`
- **Port:** `3306` (default MySQL port)
- This is a **different MySQL instance** running on your Windows machine

## How to Connect to the CORRECT MySQL (Docker)

### Option 1: Command Line
```bash
mysql -h localhost -P 3307 -u root -pMeera@2632 kayak_db
```

### Option 2: From inside Docker container
```bash
docker exec -it kayak-mysql mysql -uroot -pMeera@2632 kayak_db
```

### Option 3: MySQL Workbench / DBeaver / Other GUI Tools
- **Host:** `localhost`
- **Port:** `3307` ⚠️ (NOT 3306!)
- **Username:** `root`
- **Password:** `Meera@2632`
- **Database:** `kayak_db`

### Option 4: Run the debugging script
```bash
cd scripts
npm run debug-mysql
```
This automatically connects to port 3307 (Docker MySQL).

## Verify You're Connected to the Right MySQL

Once connected, check:
```sql
-- Check which port MySQL is listening on
SHOW VARIABLES LIKE 'port';

-- Check if tables exist
USE kayak_db;
SHOW TABLES;

-- Check for your data
SELECT COUNT(*) FROM bookings;
SELECT COUNT(*) FROM billings;
```

## Quick Check Commands

```bash
# Check if Docker MySQL container is running
docker ps | grep mysql

# Connect to Docker MySQL directly
docker exec -it kayak-mysql mysql -uroot -pMeera@2632 -e "USE kayak_db; SELECT COUNT(*) FROM bookings;"

# Run the SQL check script against Docker MySQL
docker exec -i kayak-mysql mysql -uroot -pMeera@2632 kayak_db < scripts/check-mysql-data.sql
```

## Summary

✅ **Correct MySQL (Docker):** `localhost:3307`  
❌ **Wrong MySQL (Local):** `localhost:3306`

Make sure you're connecting to port **3307**, not 3306!

