# Kafka/Zookeeper Cleanup Guide

## Problem
Kafka fails to start with error:
```
ERROR Error while creating ephemeral at /brokers/ids/1, node already exists
org.apache.zookeeper.KeeperException$NodeExistsException
```

This happens when Kafka wasn't shut down cleanly, leaving a stale ephemeral node in Zookeeper.

## Solutions

### Quick Fix (Recommended)
1. Stop all services:
   ```bash
   docker-compose down
   ```

2. Clean up Zookeeper data (if using volumes):
   ```bash
   docker volume rm $(docker volume ls -q | findstr zookeeper)
   ```
   Note: This project doesn't use Zookeeper volumes, so this may not be needed.

3. Restart services:
   ```bash
   docker-compose up --build
   ```

### Manual Zookeeper Cleanup (If Quick Fix Doesn't Work)

1. Start only Zookeeper:
   ```bash
   docker-compose up -d zookeeper
   ```

2. Wait for Zookeeper to be ready (about 10 seconds)

3. Connect to Zookeeper and delete stale node:
   ```bash
   docker exec -it kayak-zookeeper bash
   cd /usr/bin
   ./zkCli.sh
   ```
   
   Then in Zookeeper CLI:
   ```
   deleteall /brokers/ids/1
   quit
   ```

4. Exit container and start all services:
   ```bash
   exit
   docker-compose up --build
   ```

### Nuclear Option (Clean Everything)
If problems persist, completely clean Docker:

```bash
# Stop all services
docker-compose down

# Remove all containers, networks, and volumes
docker-compose down -v

# Remove any orphaned volumes
docker volume prune -f

# Restart
docker-compose up --build
```

**Warning:** This will delete all Redis data and any other volumes!

## Prevention

Always use `docker-compose down` to stop services gracefully. Avoid using `docker-compose stop` or `Ctrl+C` as it may not clean up Zookeeper ephemeral nodes properly.

