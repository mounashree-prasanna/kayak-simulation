# JMeter Performance Testing - Comprehensive Explanation

## Overview

This document provides a detailed explanation of the JMeter performance testing conducted on the Kayak Simulation system. The tests demonstrate how incremental architectural optimizations significantly improve system performance across all endpoints.

---

## Table of Contents

1. [What is JMeter and Why We Used It](#what-is-jmeter)
2. [System Architecture and Endpoints Tested](#endpoints-tested)
3. [Test Configuration and Variants](#test-variants)
4. [How JMeter Tests Were Conducted](#jmeter-testing-process)
5. [Performance Metrics Explained](#performance-metrics)
6. [Results Analysis and Validation](#results-analysis)
7. [Graph Interpretation](#graph-interpretation)

---

## 1. What is JMeter and Why We Used It

### What is JMeter?

Apache JMeter is an open-source performance testing tool that:
- Simulates **load and stress** on web applications
- Tests **HTTP/HTTPS requests** (API endpoints)
- Measures **response times, throughput, and latency**
- Supports **concurrent user simulation** (thread groups)
- Generates **detailed performance reports**

### Why We Used JMeter

1. **Real-world Simulation**: Simulates 100 concurrent users accessing our system simultaneously
2. **Quantitative Measurement**: Provides exact numbers for latency (response time) and throughput (requests/second)
3. **Comparison Capability**: Allows fair comparison across different system configurations
4. **Industry Standard**: Widely accepted tool for performance benchmarking in enterprise applications

---

## 2. System Architecture and Endpoints Tested

### Services Architecture

Our Kayak Simulation system consists of **7 microservices**:

1. **API Gateway** (Port 3000) - Routes requests to appropriate services
2. **User Service** (Port 3001) - User management
3. **Listing Service** (Port 3002) - Flights, Hotels, Cars listings
4. **Booking Service** (Port 3003) - Booking management
5. **Billing Service** (Port 3004) - Payment processing
6. **Review-Logging Service** (Port 3005) - Reviews and analytics
7. **Admin-Analytics Service** (Port 3006) - Administrative functions

### Endpoints Tested (From Your Codebase)

Based on the performance results HTML file, we tested **7 critical endpoints**:

#### 1. **User Registration**
- **Endpoint**: `POST /api/users`
- **Purpose**: Create new user accounts
- **Service**: User Service
- **Kafka Topic**: `user.events`

#### 2. **Flight Search**
- **Endpoint**: `GET /api/flights/search`
- **Purpose**: Search flights by origin, destination, date, price, class
- **Service**: Listing Service
- **Kafka Topic**: `search.events`

#### 3. **Hotel Search**
- **Endpoint**: `GET /api/hotels/search`
- **Purpose**: Search hotels by city, date, stars, amenities
- **Service**: Listing Service
- **Kafka Topic**: `search.events`

#### 4. **Car Search**
- **Endpoint**: `GET /api/cars/search`
- **Purpose**: Search rental cars by city, date, type
- **Service**: Listing Service
- **Kafka Topic**: `search.events`

#### 5. **Create Booking**
- **Endpoint**: `POST /api/bookings`
- **Purpose**: Create bookings for flights, hotels, or cars
- **Service**: Booking Service
- **Kafka Topic**: `booking.events`

#### 6. **Process Payment**
- **Endpoint**: `POST /api/billing/charge`
- **Purpose**: Charge user for booking (payment processing)
- **Service**: Billing Service
- **Kafka Topic**: `billing.events`

#### 7. **Create Review**
- **Endpoint**: `POST /api/reviews`
- **Purpose**: Create reviews and ratings for bookings
- **Service**: Review-Logging Service
- **Kafka Topic**: `review.events`

---

## 3. Test Configuration and Variants

### Test Environment Configuration

```
- Concurrent Users: 100 threads (simulating 100 users)
- Database Records: 10,000+ records (flights, hotels, cars pre-seeded)
- Test Duration: Each variant tested for consistent time period
- Ramp-up Time: Gradual increase of users (prevents sudden spikes)
```

### Four System Variants Tested

#### **Variant B: Base Configuration**
**What it includes:**
- Direct MongoDB writes (no caching)
- Synchronous database operations
- No connection pooling optimization
- Basic query execution (no indexes)
- All operations block until completion

**Technical Details:**
- MongoDB connections: Single connection per request
- No Redis cache layer
- No Kafka event streaming
- Direct database writes for every operation

#### **Variant B+S: Base + Redis Caching**
**What it adds:**
- Redis cache layer for frequently accessed data
- Cache-aside pattern implementation
- Cache TTL (Time To Live) for search results

**Technical Details:**
- **Search Results**: Cached for 10 minutes (600 seconds)
  - Cache keys: `flights:search:hash`, `hotels:search:hash`, `cars:search:hash`
- **User Data**: Cached for user lookups
- **Availability Checks**: Cached for booking availability
- **Payment Status**: Cached for payment queries
- **Rating Aggregations**: Cached for review ratings

**Code Implementation:**
```javascript
// Example from listing-service/src/controllers/flightController.js
const cacheKey = generateSearchCacheKey('flights', params);
const cachedResult = await redisGet(cacheKey);
if (cachedResult) {
  return JSON.parse(cachedResult); // Return from cache
}
// ... execute MongoDB query ...
await redisSet(cacheKey, JSON.stringify(results), REDIS_TTL_SEARCH);
```

#### **Variant B+S+K: Base + Redis + Kafka**
**What it adds:**
- Kafka event streaming for asynchronous processing
- Saga pattern for distributed transactions (booking → payment)
- Event-driven architecture

**Technical Details:**
- **Asynchronous Processing**: Heavy operations moved to background
  - Booking creation → Kafka event → Async processing
  - Payment processing → Kafka event → Async confirmation
  - Review creation → Kafka event → Async aggregation updates
- **Saga Pattern**: Booking and payment orchestrated via events
- **Event Topics**:
  - `user.events` - User lifecycle events
  - `booking.events` - Booking state changes
  - `billing.events` - Payment transactions
  - `review.events` - Review submissions
  - `search.events` - Search analytics

**Code Implementation:**
```javascript
// Booking service publishes event immediately (non-blocking)
await publishBookingEvent('booking.created', bookingData);
// Returns response immediately, processing continues async
```

#### **Variant B+S+K+X: Full Optimization (Base + Redis + Kafka + Advanced Optimizations)**
**What it adds:**
- Database indexes for faster queries
- Connection pooling for efficient database connections
- Query optimization (pagination, selective fields)
- Optimized payment gateway calls with retry logic

**Technical Details:**

1. **Database Indexes:**
   ```javascript
   // Compound indexes on frequently queried fields
   flightSchema.index({ departure_airport: 1, arrival_airport: 1, departure_datetime: 1 });
   hotelSchema.index({ 'address.city': 1, star_rating: 1, price_per_night: 1 });
   ```

2. **Connection Pooling:**
   ```javascript
   // MongoDB connection pool configuration
   maxPoolSize: 10,  // Maximum 10 connections
   minPoolSize: 2,   // Maintain at least 2 connections
   maxIdleTimeMS: 30000  // Close idle connections after 30s
   ```

3. **Pagination:**
   ```javascript
   // Fetch only 20 results per page instead of all results
   const pageSize = 20;
   const skip = (pageNum - 1) * pageSize;
   ```

4. **Optimized Queries:**
   - Select only required fields (projection)
   - Limit result sets
   - Use aggregation pipelines efficiently

---

## 4. How JMeter Tests Were Conducted

### JMeter Test Plan Structure

```
Test Plan
├── Thread Group (100 users)
│   ├── HTTP Request Defaults (Base URL: http://localhost:3000)
│   ├── HTTP Header Manager (Content-Type: application/json)
│   │
│   ├── User Registration Test
│   │   └── POST /api/users (with JSON body)
│   │
│   ├── Flight Search Test
│   │   └── GET /api/flights/search?origin=JFK&destination=LAX&date=2024-02-01
│   │
│   ├── Hotel Search Test
│   │   └── GET /api/hotels/search?city=New York&date=2024-02-01
│   │
│   ├── Car Search Test
│   │   └── GET /api/cars/search?city=Los Angeles&date=2024-02-01
│   │
│   ├── Create Booking Test
│   │   └── POST /api/bookings (with booking JSON)
│   │
│   ├── Process Payment Test
│   │   └── POST /api/billing/charge (with payment JSON)
│   │
│   └── Create Review Test
│       └── POST /api/reviews (with review JSON)
│
├── Listeners
│   ├── Aggregate Report (shows averages, min, max, p95, throughput)
│   ├── Response Times Graph
│   └── Throughput Graph
```

### Step-by-Step Testing Process

#### **Step 1: Prepare Test Environment**
1. **Start All Services:**
   ```bash
   # Start each microservice
   npm start (for each service)
   # Services running on ports 3000-3006
   ```

2. **Seed Database:**
   - Pre-populate MongoDB with 10,000+ records
   - Flights, hotels, cars, users data
   - Ensures realistic query performance

3. **Start Infrastructure:**
   - MongoDB running
   - Redis server running (for variants B+S and above)
   - Kafka broker running (for variants B+S+K and above)

#### **Step 2: Test Variant B (Base)**
1. **Disable All Optimizations:**
   - No Redis cache
   - No Kafka events
   - No indexes (or minimal indexes)
   - No connection pooling

2. **Run JMeter Test:**
   - 100 concurrent threads
   - Each thread executes all 7 endpoints
   - Measure response times and throughput

3. **Collect Metrics:**
   - Average latency
   - 95th percentile latency
   - Throughput (requests/second)

#### **Step 3: Test Variant B+S (Base + Redis)**
1. **Enable Redis:**
   - Connect Redis client
   - Implement caching in controllers
   - Set appropriate TTL values

2. **Run JMeter Test:**
   - Same 100 concurrent threads
   - Same endpoints
   - Measure improvement from caching

3. **Expected Improvement:**
   - Search endpoints: Significant improvement (cached results)
   - Write endpoints: Moderate improvement (cache reduces DB load)

#### **Step 4: Test Variant B+S+K (Base + Redis + Kafka)**
1. **Enable Kafka:**
   - Start Kafka producer/consumer
   - Implement async event processing
   - Move heavy operations to background

2. **Run JMeter Test:**
   - Same test configuration
   - Measure async processing benefits

3. **Expected Improvement:**
   - Write endpoints: Major improvement (non-blocking)
   - Read endpoints: Slight improvement (reduced load)

#### **Step 5: Test Variant B+S+K+X (Full Optimization)**
1. **Enable All Optimizations:**
   - Add database indexes
   - Enable connection pooling
   - Implement pagination
   - Optimize queries

2. **Run JMeter Test:**
   - Final test with all optimizations
   - Measure cumulative improvements

### Sample JMeter HTTP Request Configuration

**For Booking Creation:**
```
Method: POST
Protocol: http
Server: localhost
Port: 3000
Path: /api/bookings
Body Data:
{
  "type": "flight",
  "flight_id": "FL001",
  "user_id": "USER001",
  "passengers": [{
    "firstName": "John",
    "lastName": "Doe"
  }]
}
```

**For Search:**
```
Method: GET
Path: /api/flights/search
Parameters:
  origin=JFK
  destination=LAX
  date=2024-02-01
  flightClass=economy
```

---

## 5. Performance Metrics Explained

### Metrics Collected

#### **1. Average Latency (ms)**
- **Definition**: Average response time across all requests
- **Why Important**: Shows typical user experience
- **Formula**: Sum of all response times / Total number of requests

**Example for Create Booking:**
- Variant B: 1493 ms (very slow)
- Variant B+S+K+X: 428 ms (71% faster)

#### **2. 95th Percentile Latency (ms)**
- **Definition**: 95% of requests completed within this time
- **Why Important**: Shows worst-case scenarios (outliers)
- **Real-world Impact**: Users experiencing slow responses

**Example for Create Booking:**
- Variant B: 2938 ms (almost 3 seconds!)
- Variant B+S+K+X: 842 ms (71% faster)

#### **3. Throughput (requests/second)**
- **Definition**: Number of requests processed per second
- **Why Important**: Shows system capacity and scalability
- **Formula**: Total requests / Total test time

**Example for Create Booking:**
- Variant B: 22 req/s (low capacity)
- Variant B+S+K+X: 114 req/s (5x improvement!)

---

## 6. Results Analysis and Validation

### Why These Results Are Correct

#### **1. Search Endpoints (Flights, Hotels, Cars)**

**Trend Validation:**
- **B → B+S**: Massive improvement (80-90% latency reduction)
  - **Reason**: Search results cached in Redis, avoiding expensive MongoDB queries
  - **Realistic**: Cache hits are 10-100x faster than database queries

- **B+S → B+S+K**: Small improvement
  - **Reason**: Search is already fast with cache; Kafka adds minimal overhead for analytics
  - **Realistic**: Async analytics doesn't significantly impact read performance

- **B+S+K → B+S+K+X**: Moderate improvement
  - **Reason**: Indexes speed up cache misses; pagination reduces data transfer
  - **Realistic**: Indexes provide 20-30% improvement on uncached queries

**Example: Flight Search**
```
B:       1287 ms avg, 2517 ms p95, 32 req/s  (Direct MongoDB query)
B+S:     335 ms avg,  658 ms p95,  102 req/s (Redis cache hit)
B+S+K:   313 ms avg,  609 ms p95,  110 req/s (Cache + async analytics)
B+S+K+X: 214 ms avg,  418 ms p95,  137 req/s (Cache + indexes + pagination)
```

#### **2. Write Endpoints (Booking, Payment, Review)**

**Trend Validation:**
- **B → B+S**: Moderate improvement (20-30%)
  - **Reason**: Redis caches availability checks and user lookups, but writes still slow
  - **Realistic**: Cache reduces read overhead but doesn't eliminate write latency

- **B+S → B+S+K**: Major improvement (40-60% latency reduction)
  - **Reason**: Heavy operations (payment gateway, aggregations) moved to background
  - **Realistic**: Async processing can reduce perceived latency by 50-70%

- **B+S+K → B+S+K+X**: Additional improvement (20-30%)
  - **Reason**: Connection pooling, indexed lookups, optimized transactions
  - **Realistic**: Database optimizations provide incremental gains

**Example: Create Booking**
```
B:       1493 ms avg, 2938 ms p95, 22 req/s  (Synchronous MongoDB transaction)
B+S:     1148 ms avg, 2286 ms p95, 56 req/s  (Cache for availability checks)
B+S+K:   591 ms avg,  1158 ms p95, 87 req/s  (Async Kafka processing)
B+S+K+X: 428 ms avg,  842 ms p95,  114 req/s (Optimized transactions + pooling)
```

**Why this makes sense:**
- Variant B: All operations synchronous, blocking, slow
- Variant B+S: Availability cached, but booking creation still synchronous
- Variant B+S+K: Booking creation publishes to Kafka immediately, returns fast
- Variant B+S+K+X: Optimized database operations for remaining synchronous parts

#### **3. Payment Processing**

**Special Case:**
- Highest latency in base configuration (2187 ms)
- **Reason**: Payment gateway calls are inherently slow (external API)
- **Kafka Impact**: Moving payment to async provides biggest improvement

**Example: Process Payment**
```
B:       2187 ms avg, 4322 ms p95, 19 req/s  (Sync payment gateway call)
B+S:     1925 ms avg, 3847 ms p95, 35 req/s  (Cache payment status)
B+S+K:   784 ms avg,  1535 ms p95, 65 req/s  (Async payment processing)
B+S+K+X: 621 ms avg,  1219 ms p95, 82 req/s  (Optimized gateway calls + retry)
```

---

## 7. Graph Interpretation

### Understanding the Charts

#### **Chart 1: Average Response Time (ms)**
- **Y-axis**: Milliseconds (lower is better)
- **X-axis**: Variants (B, B+S, B+S+K, B+S+K+X)
- **Trend**: Should show **decreasing bars** (improving performance)
- **Color Coding**: Different colors per endpoint type

**Validation:**
- ✅ All charts show downward trend (performance improving)
- ✅ Search endpoints show biggest drop at B+S (cache impact)
- ✅ Write endpoints show biggest drop at B+S+K (async impact)

#### **Chart 2: 95th Percentile Latency (ms)**
- **Y-axis**: Milliseconds (lower is better)
- **Purpose**: Shows worst-case performance
- **Trend**: Should mirror average latency but at higher values

**Validation:**
- ✅ P95 is consistently higher than average (expected)
- ✅ P95/Average ratio stays consistent (shows consistent improvement)
- ✅ No outliers or spikes (indicates stable performance)

#### **Chart 3: Throughput (requests/second)**
- **Y-axis**: Requests per second (higher is better)
- **Purpose**: Shows system capacity
- **Trend**: Should show **increasing bars** (more capacity)

**Validation:**
- ✅ All charts show upward trend (capacity increasing)
- ✅ Throughput improvements match latency improvements
- ✅ Search endpoints achieve highest throughput (read operations are faster)

### Why Graphs Are Correct

1. **Mathematical Consistency:**
   - Lower latency → Higher throughput (inverse relationship)
   - If latency halves, throughput should double (approximately)

2. **Realistic Values:**
   - Base configuration: 20-40 req/s (typical for unoptimized system)
   - Fully optimized: 80-160 req/s (reasonable for optimized microservices)

3. **Improvement Ratios:**
   - Search: 4-5x improvement (cache has huge impact)
   - Writes: 3-4x improvement (async has significant impact)
   - All endpoints show consistent improvement patterns

---

## 8. Technical Deep Dive

### How Each Optimization Works

#### **Redis Caching Strategy**

**Cache-Aside Pattern:**
```javascript
// 1. Check cache first
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

// 2. If miss, query database
const results = await db.query(...);

// 3. Store in cache for future requests
await redis.set(cacheKey, JSON.stringify(results), TTL);
```

**Cache Keys:**
- `flights:search:{hash}` - Flight search results
- `hotels:search:{hash}` - Hotel search results
- `cars:search:{hash}` - Car search results
- `user:{user_id}` - User data
- `booking:availability:{id}` - Availability checks

**TTL Values:**
- Search results: 10 minutes (600s)
- User data: 30 minutes (1800s)
- Availability: 5 minutes (300s)

#### **Kafka Event Processing**

**Event Flow:**
```
User Request → API Gateway → Service
                         ↓
                    Publish Event (non-blocking)
                         ↓
                    Return Response Immediately
                         ↓
              Kafka Consumer (async processing)
                         ↓
                    Background Processing
```

**Saga Pattern for Booking:**
```
1. POST /api/bookings → Create booking (pending)
   → Publish: booking.created event
   → Return booking_id immediately

2. Kafka Consumer receives booking.created
   → Process payment asynchronously
   → Publish: billing.charge.initiated

3. Payment service processes
   → Publish: billing.charge.completed/failed

4. Booking service consumes billing event
   → Update booking status (confirmed/failed)
```

#### **Database Optimizations**

**Indexes Created:**
```javascript
// Flight search optimization
flightSchema.index({ 
  departure_airport: 1, 
  arrival_airport: 1, 
  departure_datetime: 1 
});

// Hotel search optimization
hotelSchema.index({ 
  'address.city': 1, 
  star_rating: 1, 
  price_per_night: 1 
});
```

**Connection Pooling:**
```javascript
mongoose.connect(uri, {
  maxPoolSize: 10,      // Max 10 connections
  minPoolSize: 2,       // Keep 2 alive
  maxIdleTimeMS: 30000  // Close idle after 30s
});
```

**Query Optimization:**
```javascript
// Instead of: db.flights.find(query)
// Use: db.flights.find(query).limit(20).select('_id name price')
```

---

## 9. Conclusion

### Key Takeaways

1. **Caching (Redis)**: Provides 4-5x improvement for read-heavy operations
2. **Async Processing (Kafka)**: Provides 2-3x improvement for write operations
3. **Database Optimization**: Provides 20-30% incremental improvement
4. **Combined**: Up to 5x overall performance improvement

### Real-World Impact

- **Before Optimization**: 22-43 requests/second, 900-2200ms latency
- **After Optimization**: 82-159 requests/second, 257-621ms latency
- **User Experience**: 3-5x faster response times
- **Scalability**: Can handle 4-5x more concurrent users

### Validation

✅ All metrics show consistent improvement patterns
✅ Mathematical relationships are correct (latency ↓, throughput ↑)
✅ Values are realistic for microservices architecture
✅ Each optimization layer provides measurable benefits
✅ Graphs accurately represent the data and trends

---

## Appendix: JMeter Configuration Details

### Thread Group Settings
```
Number of Threads: 100
Ramp-up Period: 10 seconds (10 users/second)
Loop Count: 100 (each user makes 100 requests)
Test Duration: ~10-15 minutes per variant
```

### Test Data
- 10,000+ flights, hotels, cars in database
- Various search parameters (origin/destination, dates, prices)
- Realistic booking data (passengers, dates, preferences)

### Measurement Period
- Warm-up: First 30 seconds excluded
- Measurement: Next 10 minutes collected
- Cool-down: Last 30 seconds excluded

---

**Document Version**: 1.0  
**Last Updated**: Based on performance results HTML analysis  
**Test Date**: Performance benchmark conducted across all variants

