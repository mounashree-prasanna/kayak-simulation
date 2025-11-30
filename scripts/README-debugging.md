# Quick Start: Debugging MySQL Save Issues

## Fastest Way to Check

### Option 1: Run the Debugging Script (Recommended)
```bash
cd scripts
npm install  # Only needed once, installs mysql2
node debug-mysql-saves.js
```

### Option 2: Run SQL Check Script
```bash
# From host machine
mysql -h localhost -P 3307 -u root -pMeera@2632 < scripts/check-mysql-data.sql

# OR from Docker
docker exec -i kayak-mysql mysql -uroot -pMeera@2632 kayak_db < scripts/check-mysql-data.sql
```

### Option 3: Check Service Logs
```bash
# Check booking service logs
docker logs kayak-booking-service --tail 50

# Check billing service logs  
docker logs kayak-billing-service --tail 50

# Follow logs in real-time
docker logs -f kayak-booking-service
```

## Quick Checklist

- [ ] MySQL container is running: `docker ps | grep mysql`
- [ ] Tables exist: Run `check-mysql-data.sql` or `debug-mysql-saves.js`
- [ ] Services can connect: Check logs for "MySQL Connected" messages
- [ ] Data is being inserted: Check logs for "Created booking/billing record" messages
- [ ] Transactions are committing: Check logs for errors that might cause rollbacks

## Common Fixes

### Tables Don't Exist
```bash
docker exec -i kayak-mysql mysql -uroot -pMeera@2632 < scripts/initMySQLWithUser.sql
```

### Services Can't Connect
1. Verify environment variables in `docker-compose.yml`
2. Ensure services are on `kayak-network`
3. Check MySQL is healthy: `docker logs kayak-mysql`

### Data Not Persisting
1. Check for errors in transaction callbacks (any error = rollback)
2. Verify foreign key constraints (billing requires booking)
3. Check enum values match exactly

## Files

- `debug-mysql-saves.md` - Comprehensive debugging guide
- `debug-mysql-saves.js` - Automated debugging script
- `check-mysql-data.sql` - SQL queries to check data
- `initMySQLWithUser.sql` - Initialize database and tables

## Need More Help?

See `debug-mysql-saves.md` for detailed step-by-step instructions and troubleshooting.

