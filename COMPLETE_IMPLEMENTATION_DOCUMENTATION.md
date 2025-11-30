# KAYAK Travel Platform - Complete Implementation Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [System Architecture](#system-architecture)
3. [Microservices Detailed Implementation](#microservices-detailed-implementation)
4. [Frontend Implementation](#frontend-implementation)
5. [Data Flow & Integration Patterns](#data-flow--integration-patterns)
6. [Database Architecture](#database-architecture)
7. [API Endpoints Reference](#api-endpoints-reference)
8. [Caching Strategy](#caching-strategy)
9. [Event-Driven Architecture](#event-driven-architecture)
10. [Security Implementation](#security-implementation)
11. [Error Handling & Resilience](#error-handling--resilience)
12. [Deployment Configuration](#deployment-configuration)

---

## Architecture Overview

### System Type
**Microservices-based Travel Booking Platform** - A full-stack distributed system similar to KAYAK, designed for scalability, reliability, and real-time updates.

### Core Technologies
- **Backend**: Node.js with Express.js
- **AI Service**: Python with FastAPI
- **Frontend**: React 18 with Vite
- **Databases**: MongoDB Atlas (listings, users) + MySQL (bookings, billing)
- **Message Queue**: Apache Kafka
- **Cache**: Redis
- **Real-time**: WebSocket
- **Containerization**: Docker
- **Orchestration**: Kubernetes

### Key Architectural Patterns
1. **Microservices Architecture**: 7 backend services + 1 AI service
2. **API Gateway Pattern**: Single entry point for all requests
3. **Event-Driven Architecture**: Kafka for asynchronous communication
4. **Saga Pattern**: Distributed transaction management for booking-billing flow
5. **CQRS**: Read/write separation (MongoDB for reads, MySQL for writes)
6. **Hybrid Database**: MongoDB for flexible schema, MySQL for ACID compliance

---

## System Architecture

### Service Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│                    Port: 5174 (Development)                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (Express)                     │
│                         Port: 3000                           │
│  Routes: /api/users, /api/flights, /api/bookings, etc.      │
└──────┬──────┬──────┬──────┬──────┬──────┬──────┬────────────┘
       │      │      │      │      │      │      │
       ▼      ▼      ▼      ▼      ▼      ▼      ▼
    ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐
    │User│ │List│ │Book│ │Bill│ │Rev │ │Adm │ │Rec │
    │    │ │    │ │    │ │    │ │    │ │    │ │    │
    │3001│ │3002│ │3003│ │3004│ │3005│ │3006│ │8000│
    └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘
       │      │      │      │      │      │      │
       └──────┴──────┴──────┴──────┴──────┴──────┘
                    │
                    ▼
         ┌──────────────────────┐
         │   Apache Kafka       │
         │   Event Streaming    │
         └──────────────────────┘
                    │
       ┌────────────┼────────────┐
       ▼            ▼            ▼
  ┌────────┐  ┌────────┐  ┌────────┐
  │MongoDB │  │ MySQL  │  │ Redis  │
  │ Atlas  │  │  8.0   │  │  7.0   │
  └────────┘  └────────┘  └────────┘
```

### Infrastructure Components

1. **MySQL Database** (Port 3306)
   - ACID-compliant transactions
   - Stores: bookings, billings
   - Initialization script: `scripts/initMySQLWithUser.sql`

2. **Redis Cache** (Port 6379)
   - Caching layer for bookings and billings
   - TTL-based expiration
   - Graceful degradation on failure

3. **Apache Kafka** (Port 9092)
   - Event streaming platform
   - Topics: user.events, booking.events, billing.events, deal.events, tracking.events
   - Zookeeper for coordination (Port 2181)

4. **MongoDB Atlas**
   - Cloud-hosted MongoDB
   - Stores: users, admins, flights, hotels, cars, reviews, availability_blocks

---

## Microservices Detailed Implementation

### 1. API Gateway Service

**Location**: `services/api-gateway/`  
**Port**: 3000  
**Technology**: Express.js with http-proxy-middleware

#### Purpose
Single entry point that routes all API requests to appropriate microservices, providing:
- Request routing and load balancing
- Request logging
- Error handling
- Health monitoring

#### Implementation Details

**Main Entry Point** (`src/index.js`):
- Express server with CORS enabled
- Request logging middleware
- Health check endpoint at `/health`
- Proxy middleware for each service

**Routing Configuration**:
```javascript
/api/users          → User Service (3001)
/api/flights        → Listing Service (3002)
/api/hotels         → Listing Service (3002)
/api/cars           → Listing Service (3002)
/api/bookings       → Booking Service (3003)
/api/billing        → Billing Service (3004)
/api/reviews        → Review-Logging Service (3005)
/api/logs           → Review-Logging Service (3005)
/api/images         → Review-Logging Service (3005)
/api/analytics      → Admin Analytics Service (3006)
/api/admins         → Admin Analytics Service (3006)
```

**Features**:
- Automatic path rewriting (removes `/api` prefix)
- Error handling with fallback responses
- Request/response logging
- 30-second timeout for proxy requests
- Service health status in health check response

**Kafka Integration**:
- Initializes Kafka connection (for future event publishing)
- Currently used for service coordination

---

### 2. User Service

**Location**: `services/user-service/`  
**Port**: 3001  
**Database**: MongoDB (users, admins collections)  
**Technology**: Express.js, Mongoose

#### Purpose
Complete user management system including:
- User registration and authentication
- Admin authentication
- JWT token management
- User profile management

#### Detailed Functionality

##### A. User Registration (`POST /users/`)

**Validation Rules**:
1. **SSN Format**: Must match pattern `###-##-####`
   - Validated using regex: `/^\d{3}-\d{2}-\d{4}$/`
   - Stored as unique identifier

2. **Email Validation**:
   - Standard email format validation
   - Case-insensitive storage
   - Unique constraint

3. **Password Requirements**:
   - Minimum 8 characters
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one special character
   - Hashed using bcrypt (10 rounds)

4. **Address Validation**:
   - State: Valid US state abbreviation or full name
   - ZIP Code: Format `#####` or `#####-####`

**Process Flow**:
1. Validate all input fields
2. Check for duplicate SSN or email
3. Hash password with bcrypt
4. Create user document in MongoDB
5. Publish `user_created` event to Kafka
6. Return user object (password excluded)

**Response Format**:
```json
{
  "success": true,
  "data": {
    "user_id": "123-45-6789",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "address": {...},
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

##### B. User Login (`POST /users/login`)

**Dual Authentication System**:
- Supports both regular users and admins
- Checks admin collection first, then user collection
- Returns appropriate role in response

**Process Flow**:
1. Check if email exists in admin collection
2. If admin: validate password, generate admin JWT tokens
3. If not admin: check user collection
4. Validate password using bcrypt comparison
5. Generate JWT access token (15 min expiry)
6. Generate JWT refresh token (7 days expiry)
7. Store refresh token in database
8. Return tokens and user/admin object

**Token Structure**:
- **Access Token**: Contains user_id/admin_id, email, type (user/admin), role (for admin)
- **Refresh Token**: Same structure, longer expiry
- **JWT Secret**: Configurable via `JWT_SECRET` environment variable

**Response Format**:
```json
{
  "success": true,
  "data": {
    "user": {...}, // or "admin": {...}
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "role": "user" // or "admin"
  }
}
```

##### C. Token Management

**Refresh Token** (`POST /users/refresh`):
- Validates refresh token signature
- Checks if token exists in database
- Generates new access token
- Returns updated tokens

**Logout** (`POST /users/logout`):
- Clears refresh token from database
- Supports both user and admin logout
- Idempotent (safe to call multiple times)

##### D. User CRUD Operations

**Get User** (`GET /users/:user_id`):
- Finds user by SSN (user_id)
- Returns complete user profile
- Excludes sensitive data (password, refresh_token)

**Update User** (`PUT /users/:user_id`):
- Validates all updated fields
- Prevents SSN modification
- Updates `updated_at` timestamp
- Publishes `user_updated` event to Kafka

**Delete User** (`DELETE /users/:user_id`):
- Removes user from database
- Publishes `user_deleted` event to Kafka
- Returns success message

##### E. Admin Support

**Admin Model**:
- Separate collection in MongoDB
- Additional fields: `role`, `admin_id`
- Same authentication flow as users
- Role-based access control

**Kafka Events Published**:
- `user_created`: On registration
- `user_updated`: On profile update
- `user_deleted`: On account deletion

---

### 3. Listing Service

**Location**: `services/listing-service/`  
**Port**: 3002  
**Database**: MongoDB (flights, hotels, carrentals, availability_blocks)  
**Technology**: Express.js, Mongoose

#### Purpose
Comprehensive listing management for:
- Flight search and management
- Hotel search and management
- Car rental search and management
- Real-time availability synchronization

#### Detailed Functionality

##### A. Flight Search (`GET /flights/search`)

**Search Parameters**:
- `origin`: Airport code (e.g., "JFK") or city name
- `destination`: Airport code or city name
- `date`: Departure date (YYYY-MM-DD)
- `minPrice`, `maxPrice`: Price range filtering
- `flightClass`: Economy, Business, or First

**Search Logic**:
1. **Origin/Destination Detection**:
   - If 3-4 uppercase letters → Treated as airport code
   - Otherwise → Treated as city name (case-insensitive regex)

2. **Date Filtering**:
   - Converts date to Date object
   - Queries flights within 24-hour window
   - Uses MongoDB date range query

3. **Price Filtering**:
   - Numeric range query on `ticket_price` field
   - Supports both min and max independently

4. **Availability Filtering**:
   - Checks MongoDB `availability_blocks` collection
   - Falls back to Booking Service API if cache unavailable
   - Filters out fully booked flights
   - Respects seat capacity

5. **Sorting**:
   - Primary: Departure datetime (ascending)
   - Secondary: Ticket price (ascending)
   - Limits to 100 results

**Response Format**:
```json
{
  "success": true,
  "count": 25,
  "data": [
    {
      "flight_id": "FL001",
      "airline": "American Airlines",
      "flight_number": "AA123",
      "departure_airport": "JFK",
      "arrival_airport": "LAX",
      "departure_datetime": "2024-01-15T10:00:00Z",
      "arrival_datetime": "2024-01-15T13:30:00Z",
      "ticket_price": 299.99,
      "total_available_seats": 150,
      "flight_class": "economy"
    }
  ]
}
```

##### B. Hotel Search (`GET /hotels/search`)

**Search Parameters**:
- `city`: City name (case-insensitive)
- `checkIn`, `checkOut`: Date range (YYYY-MM-DD)
- `price_min`, `price_max`: Price per night range
- `stars`: Star rating (1-5)
- `wifi`, `breakfast_included`, `parking`, `pet_friendly`, `near_transit`: Boolean filters

**Search Logic**:
1. City matching using regex (case-insensitive)
2. Price range filtering on `price_per_night`
3. Star rating exact match
4. Amenity filtering (boolean fields)
5. Availability filtering for check-in/check-out dates
6. Sorting by hotel rating (descending), then price (ascending)

**Availability Check**:
- Queries `availability_blocks` for date conflicts
- Checks room capacity via Booking Service
- Filters out fully booked hotels

##### C. Car Rental Search (`GET /cars/search`)

**Search Parameters**:
- `city`, `country`: Location filters
- `pickupDate`, `dropoffDate`: Rental period
- `vehicleType`: Economy, SUV, Luxury, etc.
- `company`: Rental company name

**Search Logic**:
1. Location-based filtering
2. Date range availability check
3. Vehicle type filtering
4. Company filtering
5. Exclusive booking check (one car can only be booked by one user at a time)

##### D. Availability System

**MongoDB Availability Blocks**:
- Collection: `availability_blocks`
- Stores blocked date ranges for listings
- Real-time synchronization via Kafka consumer

**Structure**:
```javascript
{
  booking_type: "Flight" | "Hotel" | "Car",
  reference_id: "FL001",
  start_date: Date,
  end_date: Date,
  booking_id: "BK123456",
  status: "active" | "cancelled"
}
```

**Synchronization Flow**:
1. Booking Service publishes `booking_created` event
2. Listing Service Kafka consumer receives event
3. Creates availability block in MongoDB
4. Updates on booking cancellation/confirmation

**Availability Checker Utility** (`src/utils/availabilityChecker.js`):
- Fast MongoDB cache lookup
- Falls back to Booking Service API
- Capacity checks for flights/hotels
- Exclusive booking validation for cars

##### E. CRUD Operations

**Get Listing** (`GET /flights/:flight_id`, `/hotels/:hotel_id`, `/cars/:car_id`):
- Supports both MongoDB ObjectId and custom ID
- Returns complete listing details

**Create/Update/Delete** (Admin Only):
- Full CRUD operations for listings
- Validation on all fields
- Timestamp management (created_at, updated_at)

---

### 4. Booking Service

**Location**: `services/booking-service/`  
**Port**: 3003  
**Databases**: 
- MySQL: bookings table (ACID compliance)
- MongoDB: User/listing references
- Redis: Caching layer

**Technology**: Express.js, mysql2, Mongoose, Redis

#### Purpose
Central booking management with:
- ACID-compliant transaction processing
- Availability conflict detection
- Capacity management
- Saga pattern integration for billing

#### Detailed Functionality

##### A. Create Booking (`POST /bookings`)

**Request Body**:
```json
{
  "user_id": "123-45-6789",
  "booking_type": "Flight" | "Hotel" | "Car",
  "reference_id": "FL001",
  "start_date": "2024-01-15T10:00:00Z",
  "end_date": "2024-01-15T13:30:00Z",
  "total_price": 299.99
}
```

**Process Flow** (All within MySQL Transaction):

1. **User Validation**:
   - Calls User Service API to verify user exists
   - Retrieves user MongoDB ObjectId for reference

2. **Listing Validation**:
   - Calls Listing Service API to verify listing exists
   - Retrieves listing details and capacity information

3. **Availability Check**:
   - Queries MySQL for date conflicts
   - For Flights: Checks if booked seats < available seats
   - For Hotels: Checks if booked rooms < total rooms
   - For Cars: Checks for any existing booking in date range

4. **Booking Creation**:
   - Generates unique booking ID (format: `BK` + timestamp + random)
   - Creates booking record in MySQL with status "Pending"
   - Stores references to user and listing (MongoDB ObjectIds)

5. **Post-Transaction**:
   - Publishes `booking_created` event to Kafka
   - Invalidates Redis cache
   - Returns booking object

**MySQL Schema**:
```sql
CREATE TABLE bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id VARCHAR(255) UNIQUE NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    user_ref VARCHAR(255),
    booking_type ENUM('Flight', 'Hotel', 'Car') NOT NULL,
    reference_id VARCHAR(255) NOT NULL,
    reference_ref VARCHAR(255),
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    booking_status ENUM('Pending', 'Confirmed', 'Cancelled', 'PaymentFailed') DEFAULT 'Pending',
    total_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_booking (user_id, booking_type, booking_status),
    INDEX idx_booking_type_ref (booking_type, reference_id)
);
```

**Booking Status Flow**:
```
Pending → Confirmed (after payment success)
Pending → PaymentFailed (after payment failure)
Pending → Cancelled (user cancellation)
```

##### B. Get Booking (`GET /bookings/:booking_id`)

**Caching Strategy**:
1. Check Redis cache first (key: `booking:{booking_id}`)
2. If cache hit: Return immediately (60s TTL)
3. If cache miss: Query MySQL
4. Cache result for 60 seconds
5. Transform data for frontend compatibility

**Data Transformation**:
- Maps `booking_type` → `type` (lowercase)
- Maps `booking_status` → `status` (lowercase)
- Maps `booking_id` → `booking_reference`
- Adds `check_in`, `check_out` for hotels
- Adds `pickup_date`, `dropoff_date` for cars

##### C. Get User Bookings (`GET /bookings/users/:user_id/bookings`)

**Query Parameters**:
- `type`: Filter by booking type (Flight/Hotel/Car)
- `status`: Filter by status (pending/confirmed/cancelled)

**Caching**:
- Cache key includes filters: `booking:user:{user_id}:{type}_{status}`
- 60-second TTL
- Cache invalidation on booking updates

##### D. Cancel Booking (`PUT /bookings/:booking_id/cancel`)

**Process**:
1. Validates booking exists
2. Updates status to "Cancelled" in MySQL transaction
3. Publishes `booking_cancelled` event to Kafka
4. Invalidates all related caches
5. Listing Service receives event and removes availability block

##### E. Confirm Booking (`PUT /bookings/:booking_id/confirm`)

**Process**:
1. Updates status to "Confirmed" in MySQL transaction
2. Publishes `booking_confirmed` event to Kafka
3. Invalidates caches

##### F. Check Availability (`GET /bookings/availability`)

**Query Parameters**:
- `booking_type`: Flight/Hotel/Car
- `reference_id`: Listing ID
- `start_date`, `end_date`: Date range

**Response**:
```json
{
  "success": true,
  "data": {
    "available": true,
    "booking_count": 5,
    "has_conflict": false
  }
}
```

##### G. Saga Pattern Integration

**Billing Event Handler** (`src/utils/billingEventHandler.js`):

**Consumes Kafka Topics**:
- `billing.events` (billing_success, billing_failed)

**Event Processing**:

1. **billing_success Event**:
   - Updates booking status to "Confirmed" (idempotent)
   - Publishes `booking_confirmed` event
   - Invalidates caches

2. **billing_failed Event**:
   - Updates booking status to "PaymentFailed"
   - Publishes `booking_failed` event
   - Listing Service removes availability block

**Idempotency**:
- Safe to process same event multiple times
- Status updates are idempotent operations

---

### 5. Billing Service

**Location**: `services/billing-service/`  
**Port**: 3004  
**Databases**:
- MySQL: billings table (ACID compliance)
- MongoDB: User references
- Redis: Caching layer

**Technology**: Express.js, mysql2, Mongoose, Redis

#### Purpose
Payment processing and billing management with:
- ACID-compliant transaction processing
- Invoice generation
- Payment method support
- Comprehensive caching

#### Detailed Functionality

##### A. Charge Booking (`POST /billing/charge`)

**Request Body**:
```json
{
  "user_id": "123-45-6789",
  "booking_id": "BK123456",
  "payment_method": "credit_card" | "debit_card" | "paypal",
  "amount": 299.99
}
```

**Process Flow** (All within MySQL Transaction):

1. **Booking Fetch**:
   - Primary: Calls Booking Service API
   - Fallback: Direct MySQL query if API unavailable
   - Validates booking exists and status is "Pending"

2. **Price Validation**:
   - Uses booking's `total_price` (ignores request amount)
   - Allows 1% tolerance for rounding differences
   - Logs warning if mismatch detected

3. **Payment Processing**:
   - Mock payment processor (simulates payment gateway)
   - Returns success/failure based on payment method
   - In production, would integrate with Stripe/PayPal/etc.

4. **Billing Record Creation**:
   - Generates unique billing ID (format: `BILL` + timestamp + random)
   - Generates invoice number (format: `INV` + timestamp + random)
   - Creates billing record with:
     - Transaction details
     - Invoice details (line items, subtotal, tax 8%, total)
     - Payment method
     - Transaction status

5. **Booking Status Update** (Within Same Transaction):
   - If payment success: Updates booking status to "Confirmed"
   - If payment failure: Updates booking status to "PaymentFailed"
   - Ensures ACID compliance (both succeed or both fail)

6. **Post-Transaction**:
   - Publishes `billing_success` or `billing_failed` event to Kafka
   - Invalidates Redis caches
   - Returns billing record

**MySQL Schema**:
```sql
CREATE TABLE billings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    billing_id VARCHAR(255) UNIQUE NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    user_ref VARCHAR(255),
    booking_type VARCHAR(50) NOT NULL,
    booking_id VARCHAR(255) NOT NULL,
    booking_ref VARCHAR(255),
    transaction_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_amount_paid DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(100) NOT NULL,
    transaction_status ENUM('Success', 'Failed', 'Refunded', 'Pending') DEFAULT 'Pending',
    invoice_number VARCHAR(255) UNIQUE NOT NULL,
    invoice_details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
    INDEX idx_transaction_date (transaction_date),
    INDEX idx_user_id (user_id),
    INDEX idx_transaction_status (transaction_status)
);
```

**Invoice Details Structure**:
```json
{
  "line_items": [
    {
      "description": "Flight Booking",
      "quantity": 1,
      "unit_price": 299.99,
      "total": 299.99
    }
  ],
  "subtotal": 299.99,
  "tax": 23.99,
  "total": 323.98
}
```

##### B. Get Billing (`GET /billing/:billing_id`)

**Caching**:
- Redis cache key: `billing:{billing_id}`
- TTL: 1 hour
- Graceful fallback to MySQL on cache miss

##### C. Search Billing (`GET /billing/search`)

**Query Parameters**:
- `from`: Start date (YYYY-MM-DD)
- `to`: End date (YYYY-MM-DD)
- `user_id`: Optional user filter
- `status`: Optional status filter (Success/Failed/Refunded/Pending)

**Implementation**:
- Uses SQL `BETWEEN` clause for date ranges
- Supports admin queries (no user_id required)
- Returns all matching billing records

##### D. Get User Billings (`GET /billing/user/:user_id`)

**Query Parameters**:
- `status`: Optional status filter

**Caching**:
- Cache key: `billing:user:{user_id}` or `billing:user:{user_id}_{status}`
- TTL: 30 minutes
- Returns all billings for user

##### E. Monthly Stats (`GET /billing/user/:user_id/stats`)

**Query Parameters**:
- `year`: Year (YYYY)
- `month`: Month (MM)

**Response**:
```json
{
  "success": true,
  "data": {
    "total_transactions": 10,
    "successful_transactions": 8,
    "failed_transactions": 2,
    "total_amount": 2999.90,
    "average_amount": 299.99
  }
}
```

**Caching**:
- Cache key: `billing:user:{user_id}:{YYYY-MM}`
- TTL: 1 hour
- Aggregated statistics for the month

##### F. Get Billing by Month (`GET /billing/by-month`)

**Query Parameters**:
- `year`: Year (YYYY)
- `month`: Month (MM)
- `user_id`: Optional user filter

**Returns**: All billing records for the specified month

---

### 6. Review & Logging Service

**Location**: `services/review-logging-service/`  
**Port**: 3005  
**Database**: MongoDB  
**Technology**: Express.js, Mongoose

#### Purpose
- User reviews and ratings
- Activity logging
- Image management

#### Functionality

##### A. Reviews

**Create Review** (`POST /reviews`):
- Rating (1-5 stars)
- Title and review text
- Pros and cons arrays
- Images (URLs)
- Verified booking flag

**Get Reviews** (`GET /reviews`):
- Filter by type (flight/hotel)
- Filter by itemId
- Filter by rating
- Filter by verified status

**Aggregate Ratings** (`GET /reviews/aggregate/ratings`):
- Average ratings per listing
- Total review counts

##### B. Logging

**User Activity Tracking**:
- Click tracking
- Page view logging
- User behavior analytics

##### C. Image Management

**Image Routes** (`/images`):
- Image upload
- Image retrieval
- Image storage

---

### 7. Admin Analytics Service

**Location**: `services/admin-analytics-service/`  
**Port**: 3006  
**Database**: MongoDB  
**Technology**: Express.js, Mongoose

#### Purpose
Analytics and reporting for administrators

#### Authentication
- JWT token required
- Admin role verification
- API key validation (optional)

#### Analytics Endpoints

**Top Properties** (`GET /analytics/top-properties`):
- Most booked listings
- Highest revenue generators
- Ranking by bookings/revenue

**City Revenue** (`GET /analytics/city-revenue`):
- Revenue breakdown by city
- Geographic analytics

**Top Providers** (`GET /analytics/top-providers`):
- Top airlines
- Top hotel chains
- Top car rental companies

**Bills** (`GET /analytics/bills`):
- Billing records overview
- Transaction statistics

**Clicks Per Page** (`GET /analytics/clicks-per-page`):
- Page view analytics
- User engagement metrics

**Listing Clicks** (`GET /analytics/listing-clicks`):
- Most viewed listings
- Click-through rates

**Least Seen Sections** (`GET /analytics/least-seen-sections`):
- Underutilized features
- Areas for improvement

**User Trace** (`GET /analytics/user-trace`):
- Individual user activity
- Behavior tracking

---

### 8. Agentic Recommendation Service

**Location**: `services/agentic-recommendation-service/`  
**Port**: 8000  
**Technology**: Python, FastAPI, Uvicorn

#### Purpose
AI-powered recommendations and real-time event broadcasting

#### Functionality

##### A. Bundles (`/bundles`)
- Flight + Hotel + Car packages
- AI-generated recommendations
- Dynamic pricing

##### B. Deals (`/deals`)
- Special offers
- Promotional deals
- Time-limited discounts

##### C. WebSocket Support (`/events`)

**Connection Flow**:
1. Client connects via WebSocket
2. Subscribes to Kafka topics
3. Receives real-time events
4. Broadcasts to all connected clients

**Kafka Bridge**:
- Consumes events from Kafka topics
- Broadcasts to WebSocket clients
- Topics: deal.events, booking.events, billing.events, user.events

**WebSocket Manager**:
- Manages client connections
- Topic-based subscriptions
- Automatic reconnection handling

---

## Frontend Implementation

**Location**: `frontend/`  
**Technology**: React 18, Vite, Redux Toolkit, React Router

### Architecture

#### State Management (Redux Toolkit)

**Slices**:

1. **authSlice** (`store/slices/authSlice.js`):
   - User authentication state
   - Token management
   - User profile
   - Login/logout actions

2. **bookingSlice** (`store/slices/bookingSlice.js`):
   - Booking state
   - Booking history
   - Current booking flow

3. **dealsSlice** (`store/slices/dealsSlice.js`):
   - Deals and recommendations
   - Bundle offers
   - Real-time deal updates

4. **notificationSlice** (`store/slices/notificationSlice.js`):
   - Notification queue
   - Notification types (success, error, info)
   - Notification display

5. **searchSlice** (`store/slices/searchSlice.js`):
   - Search state
   - Search results
   - Search filters

### Pages

1. **Home** (`pages/Home.jsx`):
   - Landing page
   - Search interface
   - Featured deals

2. **Search Pages**:
   - `FlightSearch.jsx`: Flight search interface
   - `HotelSearch.jsx`: Hotel search interface
   - `CarSearch.jsx`: Car rental search interface

3. **Details Pages**:
   - `FlightDetails.jsx`: Flight information
   - `HotelDetails.jsx`: Hotel information
   - `CarDetails.jsx`: Car rental information

4. **Booking Pages**:
   - `Booking.jsx`: Booking form
   - `MyBookings.jsx`: User's booking history
   - `BookingDetails.jsx`: Individual booking details

5. **Authentication**:
   - `Login.jsx`: User login
   - `Register.jsx`: User registration

6. **Dashboard** (`pages/Dashboard.jsx`):
   - User dashboard
   - Quick actions
   - Recent bookings

7. **Admin Pages**:
   - `AdminDashboard.jsx`: Admin overview
   - `AdminListingManagement.jsx`: Manage listings
   - `AdminUserManagement.jsx`: Manage users
   - `AdminBilling.jsx`: Billing overview
   - `AdminAnalytics.jsx`: Analytics dashboard

### Services

#### API Service (`services/api.js`)

**Features**:
- Axios instance with base URL configuration
- Request interceptor: Adds JWT token to headers
- Response interceptor: Handles token refresh
- Automatic token refresh on 401 errors
- Network error handling
- Timeout configuration (15 seconds)

**Token Refresh Flow**:
1. Request fails with 401
2. Interceptor catches error
3. Calls refresh token endpoint
4. Updates tokens in localStorage
5. Retries original request
6. If refresh fails: Logs out user

#### WebSocket Service (`services/websocket.js`)

**Features**:
- Connects to Recommendation Service WebSocket
- Subscribes to Kafka topics
- Receives real-time events
- Updates Redux store
- Automatic reconnection

#### Kafka Consumer Service (`services/kafkaConsumer.js`)

**Features**:
- Subscribes to Kafka topics via WebSocket
- Handles different event types:
  - `user.events`: User lifecycle events
  - `booking.events`: Booking updates
  - `billing.events`: Payment events
  - `deal.events`: Deal updates
  - `tracking.events`: Activity tracking
- Dispatches actions to Redux store
- Shows notifications for important events

### Components

#### Layout (`components/Layout/Layout.jsx`)
- Main application layout
- Navigation bar
- Footer
- Responsive design

#### Notification Center (`components/NotificationCenter/NotificationCenter.jsx`)
- Real-time notifications
- Toast notifications
- Notification queue management
- Auto-dismiss after timeout

### Routing

**Routes** (`App.jsx`):
```javascript
/                    → Home
/flights            → Flight Search
/hotels             → Hotel Search
/cars               → Car Search
/flights/:id        → Flight Details
/hotels/:id         → Hotel Details
/cars/:id           → Car Details
/booking/:type/:id  → Booking Form
/login              → Login
/register           → Register
/dashboard          → User Dashboard
/my-bookings        → My Bookings
/booking-details/:id → Booking Details
/admin/dashboard     → Admin Dashboard
/admin/listings     → Admin Listings
/admin/users        → Admin Users
/admin/billing      → Admin Billing
/admin/analytics    → Admin Analytics
```

---

## Data Flow & Integration Patterns

### Booking-Billing Saga Pattern

#### Complete Flow

1. **User Creates Booking**:
   ```
   Frontend → API Gateway → Booking Service
   ```
   - Validates user and listing
   - Checks availability
   - Creates booking (status: "Pending")
   - Publishes `booking_created` event

2. **Payment Processing**:
   ```
   Frontend → API Gateway → Billing Service
   ```
   - Fetches booking
   - Processes payment
   - Creates billing record
   - Updates booking status (same transaction)
   - Publishes `billing_success` or `billing_failed` event

3. **Event Processing**:
   ```
   Kafka → Booking Service Consumer
   ```
   - Consumes billing events
   - Updates booking status (idempotent)
   - Publishes `booking_confirmed` or `booking_failed` event

4. **Availability Sync**:
   ```
   Kafka → Listing Service Consumer
   ```
   - Consumes booking events
   - Updates availability blocks in MongoDB
   - Real-time availability synchronization

5. **Frontend Updates**:
   ```
   Kafka → Recommendation Service → WebSocket → Frontend
   ```
   - Events broadcast via WebSocket
   - Frontend updates Redux store
   - Shows notifications to user

### Event Flow Diagram

```
User Action
    │
    ▼
Booking Service
    │
    ├─→ MySQL (Transaction)
    │
    └─→ Kafka (booking_created)
            │
            ├─→ Listing Service (Availability Update)
            │
            └─→ Recommendation Service (WebSocket Broadcast)
                    │
                    └─→ Frontend (Real-time Update)
                            │
                            ▼
                    User Sees Notification

Payment Processing
    │
    ▼
Billing Service
    │
    ├─→ MySQL (Transaction)
    │   ├─→ Create Billing
    │   └─→ Update Booking Status
    │
    └─→ Kafka (billing_success/failed)
            │
            ├─→ Booking Service (Status Update)
            │   └─→ Kafka (booking_confirmed/failed)
            │
            └─→ Recommendation Service (WebSocket)
                    └─→ Frontend (Real-time Update)
```

### Kafka Topics

1. **user.events**:
   - `user_created`
   - `user_updated`
   - `user_deleted`

2. **booking.events**:
   - `booking_created`
   - `booking_confirmed`
   - `booking_cancelled`
   - `booking_failed`

3. **billing.events**:
   - `billing_success`
   - `billing_failed`

4. **deal.events**:
   - `deal_created`
   - `deal_updated`
   - `deal_expired`

5. **tracking.events**:
   - `page_view`
   - `click`
   - `search`

---

## Database Architecture

### MongoDB Collections

#### Users Collection
```javascript
{
  _id: ObjectId,
  user_id: String (SSN format, unique),
  email: String (unique, lowercase),
  password: String (hashed),
  first_name: String,
  last_name: String,
  address: {
    street: String,
    city: String,
    state: String,
    zip: String,
    country: String
  },
  phone_number: String,
  profile_image_url: String,
  payment_details: Object,
  refresh_token: String,
  created_at: Date,
  updated_at: Date
}
```

**Indexes**:
- `user_id` (unique)
- `email` (unique)
- `created_at`

#### Admins Collection
```javascript
{
  _id: ObjectId,
  admin_id: String (unique),
  email: String (unique, lowercase),
  password: String (hashed),
  role: String,
  refresh_token: String,
  created_at: Date,
  updated_at: Date
}
```

#### Flights Collection
```javascript
{
  _id: ObjectId,
  flight_id: String (unique),
  airline: String,
  flight_number: String,
  departure_airport: String,
  departure_city: String,
  departure_datetime: Date,
  arrival_airport: String,
  arrival_city: String,
  arrival_datetime: Date,
  ticket_price: Number,
  flight_class: String,
  total_available_seats: Number,
  created_at: Date,
  updated_at: Date
}
```

**Indexes**:
- `departure_airport`
- `arrival_airport`
- `departure_datetime`
- `flight_id` (unique)

#### Hotels Collection
```javascript
{
  _id: ObjectId,
  hotel_id: String (unique),
  name: String,
  address: {
    street: String,
    city: String,
    state: String,
    zip: String,
    country: String,
    coordinates: { latitude: Number, longitude: Number }
  },
  star_rating: Number (1-5),
  price_per_night: Number,
  amenities: {
    wifi: Boolean,
    breakfast_included: Boolean,
    parking: Boolean,
    pet_friendly: Boolean,
    near_transit: Boolean
  },
  number_of_rooms: Number,
  hotel_rating: Number,
  images: [String],
  created_at: Date,
  updated_at: Date
}
```

**Indexes**:
- `address.city`
- `star_rating`
- `hotel_id` (unique)

#### Car Rentals Collection
```javascript
{
  _id: ObjectId,
  car_id: String (unique),
  company: String,
  vehicle: {
    make: String,
    model: String,
    type: String,
    year: Number
  },
  location: {
    pickup: { address, city, country, coordinates },
    dropoff: { address, city, country, coordinates }
  },
  price_per_day: Number,
  availability: {
    available: Boolean,
    pickup_date: Date,
    dropoff_date: Date
  },
  images: [String],
  created_at: Date,
  updated_at: Date
}
```

#### Availability Blocks Collection
```javascript
{
  _id: ObjectId,
  booking_type: String ("Flight" | "Hotel" | "Car"),
  reference_id: String,
  start_date: Date,
  end_date: Date,
  booking_id: String,
  status: String ("active" | "cancelled"),
  created_at: Date
}
```

**Indexes**:
- Compound: `booking_type`, `reference_id`, `start_date`, `end_date`
- `booking_id`

### MySQL Tables

#### Bookings Table
```sql
CREATE TABLE bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id VARCHAR(255) UNIQUE NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    user_ref VARCHAR(255),
    booking_type ENUM('Flight', 'Hotel', 'Car') NOT NULL,
    reference_id VARCHAR(255) NOT NULL,
    reference_ref VARCHAR(255),
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    booking_status ENUM('Pending', 'Confirmed', 'Cancelled', 'PaymentFailed') 
        NOT NULL DEFAULT 'Pending',
    total_price DECIMAL(10, 2) NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_user_booking (user_id, booking_type, booking_status),
    INDEX idx_booking_type_ref (booking_type, reference_id),
    INDEX idx_booking_status (booking_status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Billings Table
```sql
CREATE TABLE billings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    billing_id VARCHAR(255) UNIQUE NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    user_ref VARCHAR(255),
    booking_type VARCHAR(50) NOT NULL,
    booking_id VARCHAR(255) NOT NULL,
    booking_ref VARCHAR(255),
    transaction_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_amount_paid DECIMAL(10, 2) NOT NULL CHECK (total_amount_paid >= 0),
    payment_method VARCHAR(100) NOT NULL,
    transaction_status ENUM('Success', 'Failed', 'Refunded', 'Pending') 
        NOT NULL DEFAULT 'Pending',
    invoice_number VARCHAR(255) UNIQUE NOT NULL,
    invoice_details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
    INDEX idx_transaction_date (transaction_date),
    INDEX idx_user_id (user_id),
    INDEX idx_transaction_status (transaction_status),
    INDEX idx_booking_billing (booking_id, booking_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## API Endpoints Reference

### User Service (Port 3001)

#### Authentication
- `POST /users/login` - User/Admin login
- `POST /users/refresh` - Refresh access token
- `POST /users/logout` - Logout user/admin

#### User Management
- `POST /users` - Register new user
- `GET /users/:user_id` - Get user by ID
- `PUT /users/:user_id` - Update user
- `DELETE /users/:user_id` - Delete user

### Listing Service (Port 3002)

#### Flights
- `GET /flights/search` - Search flights
- `GET /flights/:flight_id` - Get flight details
- `POST /flights` - Create flight (admin)
- `PUT /flights/:flight_id` - Update flight (admin)
- `DELETE /flights/:flight_id` - Delete flight (admin)

#### Hotels
- `GET /hotels/search` - Search hotels
- `GET /hotels/:hotel_id` - Get hotel details
- `POST /hotels` - Create hotel (admin)
- `PUT /hotels/:hotel_id` - Update hotel (admin)
- `DELETE /hotels/:hotel_id` - Delete hotel (admin)

#### Cars
- `GET /cars/search` - Search car rentals
- `GET /cars/:car_id` - Get car details
- `POST /cars` - Create car rental (admin)
- `PUT /cars/:car_id` - Update car rental (admin)
- `DELETE /cars/:car_id` - Delete car rental (admin)

### Booking Service (Port 3003)

- `POST /bookings` - Create booking
- `GET /bookings/:booking_id` - Get booking details
- `GET /bookings/users/:user_id/bookings` - Get user bookings
- `GET /bookings/availability` - Check availability
- `PUT /bookings/:booking_id/cancel` - Cancel booking
- `PUT /bookings/:booking_id/confirm` - Confirm booking

### Billing Service (Port 3004)

- `POST /billing/charge` - Charge booking
- `GET /billing/:billing_id` - Get billing details
- `GET /billing/search` - Search billings
- `GET /billing/user/:user_id` - Get user billings
- `GET /billing/user/:user_id/stats` - Get monthly stats
- `GET /billing/by-month` - Get billings by month

### Review Service (Port 3005)

- `POST /reviews` - Create review
- `GET /reviews` - Get reviews
- `GET /reviews/aggregate/ratings` - Get aggregate ratings
- `POST /logs` - Log user activity
- `GET /images/:id` - Get image

### Admin Analytics Service (Port 3006)

- `GET /analytics/top-properties` - Top properties
- `GET /analytics/city-revenue` - City revenue
- `GET /analytics/top-providers` - Top providers
- `GET /analytics/bills` - Billing overview
- `GET /analytics/clicks-per-page` - Page analytics
- `GET /analytics/listing-clicks` - Listing clicks
- `GET /analytics/least-seen-sections` - Underutilized features
- `GET /analytics/user-trace` - User activity trace

### Recommendation Service (Port 8000)

- `GET /bundles` - Get bundles
- `GET /deals` - Get deals
- `WebSocket /events` - Real-time events

---

## Caching Strategy

### Redis Caching Implementation

#### Booking Service Caching

**Cache Keys**:
- `booking:{booking_id}` - Individual booking (60s TTL)
- `booking:user:{user_id}:all` - All user bookings (60s TTL)
- `booking:user:{user_id}:{type}_` - Filtered by type (60s TTL)
- `booking:user:{user_id}:_{status}` - Filtered by status (60s TTL)

**Cache Invalidation**:
- On booking creation
- On booking status update
- On booking cancellation
- Pattern-based invalidation for user bookings

#### Billing Service Caching

**Cache Keys**:
- `billing:{billing_id}` - Individual billing (1 hour TTL)
- `billing:user:{user_id}` - User billings (30 min TTL)
- `billing:user:{user_id}_{status}` - Filtered by status (30 min TTL)
- `billing:user:{user_id}:{YYYY-MM}` - Monthly stats (1 hour TTL)

**Cache Invalidation**:
- On billing creation
- On payment status change
- Monthly stats invalidation on new transactions

### Graceful Degradation

**Strategy**:
- All cache operations wrapped in try-catch
- On Redis failure: Continue with database query
- Log warnings but don't fail requests
- Service remains functional without cache

**Benefits**:
- Improved performance when cache available
- System resilience when cache unavailable
- No single point of failure

---

## Event-Driven Architecture

### Kafka Integration

#### Producer Configuration

Each service initializes Kafka producer:
```javascript
const kafka = new Kafka({
  clientId: 'service-name',
  brokers: [KAFKA_BROKER]
});

const producer = kafka.producer();
await producer.connect();
```

#### Consumer Configuration

Services that need to consume events:
```javascript
const consumer = kafka.consumer({ 
  groupId: 'service-name-group' 
});

await consumer.connect();
await consumer.subscribe({ topics: ['topic.name'] });

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    // Process message
  }
});
```

### Event Types

#### User Events (`user.events`)
- **user_created**: New user registration
- **user_updated**: Profile update
- **user_deleted**: Account deletion

#### Booking Events (`booking.events`)
- **booking_created**: New booking created
- **booking_confirmed**: Booking confirmed after payment
- **booking_cancelled**: User cancelled booking
- **booking_failed**: Payment failed

#### Billing Events (`billing.events`)
- **billing_success**: Payment successful
- **billing_failed**: Payment failed

#### Deal Events (`deal.events`)
- **deal_created**: New deal available
- **deal_updated**: Deal updated
- **deal_expired**: Deal expired

### Event Payload Structure

```javascript
{
  event_type: "booking_created",
  timestamp: "2024-01-15T10:00:00Z",
  data: {
    booking_id: "BK123456",
    user_id: "123-45-6789",
    booking_type: "Flight",
    reference_id: "FL001",
    status: "Pending",
    // ... other fields
  }
}
```

---

## Security Implementation

### Authentication

#### JWT Tokens

**Access Token**:
- Expiry: 15 minutes
- Contains: user_id/admin_id, email, type, role
- Used for: API authentication

**Refresh Token**:
- Expiry: 7 days
- Stored in: Database
- Used for: Token refresh

**Token Generation**:
```javascript
const accessToken = jwt.sign(
  { user_id, email, type: 'user' },
  JWT_SECRET,
  { expiresIn: '15m' }
);
```

### Password Security

**Hashing**:
- Algorithm: bcrypt
- Rounds: 10
- Salt: Auto-generated

**Validation**:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one special character

### Input Validation

**SSN Validation**:
- Format: `###-##-####`
- Regex: `/^\d{3}-\d{2}-\d{4}$/`

**Email Validation**:
- Standard email format
- Case-insensitive storage

**State Validation**:
- Valid US state abbreviation or full name
- Comprehensive state list validation

**ZIP Code Validation**:
- Format: `#####` or `#####-####`
- Regex: `/^\d{5}(-\d{4})?$/`

### Authorization

**Admin Routes**:
- JWT token required
- Admin role verification
- API key validation (optional)

**User Routes**:
- JWT token required
- User ownership verification
- Resource-level authorization

---

## Error Handling & Resilience

### Error Handling Strategy

#### Service-Level Errors

**Validation Errors** (400):
- Input validation failures
- Missing required fields
- Invalid data formats

**Authentication Errors** (401):
- Invalid credentials
- Expired tokens
- Missing tokens

**Authorization Errors** (403):
- Insufficient permissions
- Resource access denied

**Not Found Errors** (404):
- Resource doesn't exist
- Invalid IDs

**Conflict Errors** (409):
- Duplicate resources
- Concurrent modification conflicts

**Server Errors** (500):
- Database connection failures
- Unexpected exceptions
- Service unavailability

### Resilience Patterns

#### Circuit Breaker Pattern
- Service call failures tracked
- Circuit opens after threshold
- Automatic recovery attempts

#### Retry Logic
- Exponential backoff
- Maximum retry attempts
- Idempotent operations

#### Fallback Mechanisms

**Redis Fallback**:
- Cache miss → Database query
- Cache failure → Continue without cache

**Service Fallback**:
- API call failure → Direct database query
- Service unavailable → Graceful degradation

#### Transaction Management

**MySQL Transactions**:
- ACID compliance
- Automatic rollback on error
- Deadlock detection

**Distributed Transactions**:
- Saga pattern for cross-service
- Compensation on failure
- Idempotent operations

### Logging

**Structured Logging**:
- Service name prefix
- Request ID tracking
- Error stack traces
- Performance metrics

**Log Levels**:
- ERROR: Critical failures
- WARN: Recoverable issues
- INFO: Important events
- DEBUG: Detailed debugging

---

## Deployment Configuration

### Docker Compose

**Services**:
- MySQL 8.0
- Redis 7.0
- Zookeeper 7.5.0
- Kafka 7.5.0
- All microservices
- API Gateway
- Recommendation Service

**Networking**:
- Bridge network: `kayak-network`
- Service discovery via service names
- Port mapping for external access

**Volumes**:
- MySQL data persistence
- Redis data persistence

**Health Checks**:
- MySQL: `mysqladmin ping`
- Redis: `redis-cli ping`
- Kafka: `kafka-topics --list`

### Kubernetes Deployment

**Manifests** (`k8s/`):
- Deployment files for each service
- Service definitions
- Ingress configuration
- Namespace isolation

**Build Scripts**:
- `build-images.sh`: Build Docker images
- `deploy.sh`: Deploy to Kubernetes

**Configuration**:
- Environment variables
- Secrets management
- ConfigMaps

### Environment Variables

**Common Variables**:
- `PORT`: Service port
- `NODE_ENV`: Environment (production/development)
- `MONGODB_URI`: MongoDB connection string
- `KAFKA_BROKER`: Kafka broker address
- `JWT_SECRET`: JWT signing secret
- `REDIS_HOST`: Redis host
- `REDIS_PORT`: Redis port

**Service-Specific**:
- `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`
- `USER_SERVICE_URL`, `LISTING_SERVICE_URL`, `BOOKING_SERVICE_URL`, etc.
- `ADMIN_API_KEY`: Admin API key

### Health Checks

**Endpoints**:
- All services: `GET /health`
- Returns: Service status, timestamp, dependencies

**Response Format**:
```json
{
  "success": true,
  "message": "Service is running",
  "timestamp": "2024-01-15T10:00:00Z"
}
```

---

## Summary

This KAYAK Travel Platform is a **production-ready, enterprise-grade microservices application** with:

✅ **7 Backend Microservices** + 1 AI Service  
✅ **Event-Driven Architecture** with Kafka  
✅ **Hybrid Database** (MongoDB + MySQL)  
✅ **Redis Caching** for performance  
✅ **Real-time Updates** via WebSocket  
✅ **ACID-Compliant Transactions** for bookings/billing  
✅ **Saga Pattern** for distributed transactions  
✅ **Comprehensive Security** (JWT, bcrypt, validation)  
✅ **Resilient Error Handling** with fallbacks  
✅ **Docker & Kubernetes** deployment ready  
✅ **Full Frontend** with React and Redux  
✅ **Admin Dashboard** with analytics  
✅ **Complete API Documentation**  

The system is designed for **scalability, reliability, and maintainability**, following industry best practices and architectural patterns.

