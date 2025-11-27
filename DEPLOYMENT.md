# Deployment Guide

## Prerequisites

- Docker & Docker Compose
- At least 8GB RAM available for all containers
- Ports 3000-3006, 8000, 27017, 9092, 9093, 2181 available

## Quick Start

1. **Clone the repository** (if not already done)

2. **Start all services:**
   ```bash
   docker-compose up --build
   ```

   This will start:
   - MongoDB on port 27017
   - Kafka + Zookeeper on ports 9092, 9093, 2181
   - All microservices
   - API Gateway on port 3000
   - Recommendation Service on port 8000

3. **Wait for services to be healthy:**
   - Check logs: `docker-compose logs -f`
   - Wait for all services to show "connected" messages

4. **Seed test data:**
   ```bash
   cd scripts
   npm install
   node testHarness.js
   ```

## Service URLs

Once running, access services at:

- **API Gateway:** http://localhost:3000
- **User Service:** http://localhost:3001
- **Listing Service:** http://localhost:3002
- **Booking Service:** http://localhost:3003
- **Billing Service:** http://localhost:3004
- **Review & Logging Service:** http://localhost:3005
- **Admin/Analytics Service:** http://localhost:3006
- **Recommendation Service:** http://localhost:8000

## Health Checks

Check service health:
```bash
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
# etc.
```

## API Examples

### Create User
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "123-45-6789",
    "first_name": "John",
    "last_name": "Doe",
    "address": {
      "street": "123 Main St",
      "city": "San Francisco",
      "state": "CA",
      "zip": "94102"
    },
    "phone_number": "415-555-1234",
    "email": "john.doe@example.com"
  }'
```

### Search Flights
```bash
curl "http://localhost:3000/api/flights/search?origin=JFK&destination=LAX&date=2024-06-01"
```

### Create Booking
```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "123-45-6789",
    "booking_type": "Flight",
    "reference_id": "AA123",
    "start_date": "2024-06-01T10:00:00Z",
    "end_date": "2024-06-01T14:00:00Z",
    "total_price": 500
  }'
```

### Get Bundle Recommendations
```bash
curl -X POST http://localhost:8000/bundles \
  -H "Content-Type: application/json" \
  -d '{
    "origin": "JFK",
    "destination": "LAX",
    "checkin": "2024-06-01T00:00:00Z",
    "checkout": "2024-06-05T00:00:00Z",
    "budget": 1500,
    "constraints": {
      "pet_friendly": true,
      "breakfast": true
    }
  }'
```

### Admin Analytics (requires API key)
```bash
curl "http://localhost:3000/api/analytics/top-properties?year=2024" \
  -H "X-API-Key: admin-super-secret-key-change-in-production"
```

## Stopping Services

```bash
docker-compose down
```

To remove volumes (clears MongoDB data):
```bash
docker-compose down -v
```

## Troubleshooting

1. **Services won't start:**
   - Check if ports are already in use
   - Check Docker logs: `docker-compose logs [service-name]`
   - Ensure MongoDB and Kafka are healthy first

2. **MongoDB connection errors:**
   - Wait for MongoDB to fully start (check logs)
   - Verify MONGODB_URI in docker-compose.yml

3. **Kafka connection errors:**
   - Ensure Zookeeper starts before Kafka
   - Check Kafka logs for startup issues

4. **Service communication errors:**
   - Verify service URLs in docker-compose.yml
   - Check if services are on the same Docker network

## Production Considerations

1. **Security:**
   - Change all default passwords and API keys
   - Use environment variables for sensitive data
   - Enable MongoDB authentication properly
   - Implement proper JWT authentication

2. **Scaling:**
   - Use Docker Swarm or Kubernetes for orchestration
   - Configure MongoDB replica set
   - Scale Kafka brokers as needed
   - Use load balancer for API Gateway

3. **Monitoring:**
   - Add health check endpoints to all services
   - Implement logging aggregation (ELK stack)
   - Monitor Kafka lag
   - Monitor MongoDB performance

4. **Database:**
   - Configure MongoDB replica set for high availability
   - Set up regular backups
   - Monitor index usage and optimize queries

