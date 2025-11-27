# Architecture Documentation

## Overview

This is a distributed microservices backend for a Kayak-like travel booking system, built with:

- **Node.js + TypeScript** for core services
- **Python + FastAPI** for the Recommendation Service
- **MongoDB** as the sole database (no SQL databases)
- **Apache Kafka** for event-driven messaging
- **Docker** for containerization

## Service Architecture

### 1. API Gateway (Port 3000)
- Single entry point for all REST endpoints
- Routes requests to appropriate microservices
- Handles CORS and request/response proxying

### 2. User Service (Port 3001)
- User management with SSN format user_id validation
- Address validation (state, zip code)
- Email uniqueness enforcement
- Publishes Kafka events: `user_created`, `user_updated`, `user_deleted`

**MongoDB Collection:** `users`

### 3. Listing Service (Port 3002)
- Manages Flights, Hotels, and Cars listings
- Search endpoints with filtering
- Admin-only CRUD operations
- Separate collections: `flights`, `hotels`, `cars`

**MongoDB Collections:** `flights`, `hotels`, `cars`

### 4. Booking Service (Port 3003)
- Creates bookings for flights/hotels/cars
- Validates users and listings via service calls
- Uses MongoDB transactions for consistency
- Publishes Kafka events: `booking_created`, `booking_confirmed`, `booking_cancelled`

**MongoDB Collection:** `bookings`

### 5. Billing Service (Port 3004)
- Payment processing (mock implementation)
- Creates billing records
- Updates booking status based on payment result
- Publishes Kafka events: `billing_success`, `billing_failed`

**MongoDB Collection:** `billings`

### 6. Review & Logging Service (Port 3005)
- Reviews and ratings management
- Click/tracking log ingestion
- Review aggregation endpoints
- Publishes Kafka events to `tracking.events`

**MongoDB Collections:** `reviews`, `page_click_logs`, `listing_click_logs`, `user_traces`, `images`

### 7. Admin/Analytics Service (Port 3006)
- Analytics endpoints using MongoDB aggregations
- Admin authentication via API key
- Top properties, city revenue, provider analytics
- Click/tracking analytics

**MongoDB Collections:** Reads from all collections for analytics

### 8. Agentic Recommendation Service (Port 8000)
- **Deals Agent**: Ingests and scores deals, stores in MongoDB
- **Concierge Agent**: Composes flight+hotel bundles
- WebSocket endpoint for real-time deal updates
- Fit score calculation based on price, amenities, constraints

**MongoDB Collection:** `deals`

## MongoDB Schema Design

All collections follow the specifications provided:

1. **users** - User accounts with SSN format user_id
2. **flights** - Flight listings with search indexes
3. **hotels** - Hotel listings with amenity filtering
4. **cars** - Car rental listings
5. **bookings** - All booking types (Flight/Hotel/Car)
6. **billings** - Transaction records
7. **reviews** - User reviews and ratings
8. **images** - Images for hotels/rooms/cars
9. **page_click_logs** - Page click tracking
10. **listing_click_logs** - Listing click tracking
11. **user_traces** - User journey tracking
12. **deals** - Deal aggregations (Recommendation Service)

All collections have appropriate indexes as specified.

## Kafka Topics

- `user.events` - User lifecycle events
- `booking.events` - Booking events
- `billing.events` - Billing events
- `deal.events` - Deal updates from Recommendation Service
- `tracking.events` - Click/tracking events

## Message Flow

### Booking Flow:
1. Client → API Gateway → Booking Service
2. Booking Service validates user (User Service) and listing (Listing Service)
3. Booking created with "Pending" status
4. Kafka event: `booking_created`
5. Client → Billing Service processes payment
6. Billing Service updates booking status
7. Kafka events: `billing_success` or `billing_failed`

### Analytics Flow:
1. Admin → Admin/Analytics Service (with API key)
2. Service queries MongoDB collections
3. MongoDB aggregations compute metrics
4. Returns analytics data

### Recommendation Flow:
1. Client → Recommendation Service `/bundles` endpoint
2. Concierge Agent queries `deals` collection
3. Composes 2-3 flight+hotel bundles
4. Calculates fit scores
5. Returns bundle recommendations
6. WebSocket endpoint allows real-time updates

## Scalability Considerations

- Services are stateless and can scale horizontally
- MongoDB indexes support efficient queries for large datasets
- Kafka partitions enable parallel processing
- Connection pooling for MongoDB drivers
- Designed for 10K+ listings, 10K+ users, 100K+ bookings

## Data Consistency

- MongoDB multi-document transactions for booking+billing flows
- Status-based state management (Pending → Confirmed/Cancelled)
- Idempotent operations where possible
- Event-driven updates via Kafka

## Testing

The test harness (`scripts/testHarness.js`) creates:
- 10,000 users
- 10,000 listings (3,334 flights, 3,333 hotels, 3,333 cars)
- Can be extended to create 100,000 bookings/billing records

## Deployment

All services are containerized with Docker. Use `docker-compose up` to start the entire system.

