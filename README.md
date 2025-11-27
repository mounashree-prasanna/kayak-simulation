# Kayak-Style Travel System - Microservices Backend

A complete distributed, service-oriented, microservices backend for a Kayak-like travel booking application.

## Architecture

This project uses a **3-tier microservices architecture**:

- **Client Tier**: Not implemented (assumes web/mobile clients)
- **Middleware Tier**: REST-based microservices + Kafka messaging
- **Data Tier**: MongoDB only (no SQL databases)

## Services

1. **API Gateway** (Port 3000) - Single entry point for all REST endpoints
2. **User Service** (Port 3001) - User management and authentication
3. **Listing Service** (Port 3002) - Flights, Hotels, Cars listings
4. **Booking Service** (Port 3003) - Booking management
5. **Billing Service** (Port 3004) - Payment processing and billing
6. **Review & Logging Service** (Port 3005) - Reviews and click/tracking logs
7. **Admin/Analytics Service** (Port 3006) - Analytics and reporting
8. **Agentic Recommendation Service** (Port 8000) - FastAPI service with AI recommendations and WebSockets

## Tech Stack

- **Node.js + TypeScript** for core services (Express)
- **Python + FastAPI** for Recommendation Service
- **MongoDB** (only database, no SQL)
- **Apache Kafka** for event-driven messaging
- **Docker** for containerization

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for recommendation service local dev)

### Start All Services

```bash
docker-compose up --build
```

This will start:
- MongoDB on port 27017
- Kafka + Zookeeper on ports 9092, 9093, 2181
- All microservices on their respective ports
- API Gateway on port 3000

### Access Services

- API Gateway: http://localhost:3000
- User Service: http://localhost:3001
- Listing Service: http://localhost:3002
- Booking Service: http://localhost:3003
- Billing Service: http://localhost:3004
- Review & Logging Service: http://localhost:3005
- Admin/Analytics Service: http://localhost:3006
- Recommendation Service: http://localhost:8000

### Seed Data

After services are up, run the seed script:

```bash
# From root directory
node scripts/seedData.js
```

Or use the test harness:

```bash
node scripts/testHarness.js
```

## MongoDB Collections

The system uses the following MongoDB collections:

1. `users` - User accounts with SSN format user_id
2. `flights` - Flight listings
3. `hotels` - Hotel listings
4. `cars` - Car rental listings
5. `bookings` - All bookings (Flight/Hotel/Car)
6. `billings` - Billing/transaction records
7. `reviews` - User reviews and ratings
8. `images` - Images for hotels/rooms/cars
9. `page_click_logs` - Page click tracking
10. `listing_click_logs` - Listing click tracking
11. `user_traces` - User journey tracking
12. `deals` - Deal aggregations (Recommendation Service)

## Kafka Topics

- `user.events` - User lifecycle events
- `booking.events` - Booking events (created, confirmed, cancelled)
- `billing.events` - Billing events (success, failed)
- `deal.events` - Deal updates from Recommendation Service
- `tracking.events` - Click/tracking events

## Development

### Local Development (Individual Services)

Each service has its own directory with:
- `package.json` with dependencies
- `tsconfig.json` for TypeScript
- `src/` directory with source code
- `Dockerfile` for containerization

To run a service locally:

```bash
cd user-service
npm install
npm run dev
```

### Environment Variables

Each service uses environment variables. See individual service `.env.example` files or the docker-compose.yml for configuration.

## Testing

Run the test harness to:
- Create 10,000 listings (mix of flights, hotels, cars)
- Create 10,000 users
- Create 100,000 bookings and billing records

```bash
node scripts/testHarness.js
```

## API Documentation

See `/docs/API_DOCUMENTATION.md` for detailed API endpoint documentation.

## License

ISC
