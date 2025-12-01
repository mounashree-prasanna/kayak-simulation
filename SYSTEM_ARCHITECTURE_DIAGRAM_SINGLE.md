# Kayak Travel Platform - Complete System Architecture Design Diagram

## Single Comprehensive Architecture Diagram

This is the complete System Architecture Design Diagram for the entire Kayak Travel Platform project.

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Browser]
        MOBILE[Mobile App]
    end

    subgraph "Frontend Layer"
        REACT[React Frontend<br/>Port: 5174<br/>Vite + Redux + React Router]
    end

    subgraph "API Gateway Layer"
        GATEWAY[API Gateway<br/>Port: 3000<br/>Express.js<br/>Request Routing & Load Balancing]
    end

    subgraph "Microservices Layer"
        USER[User Service<br/>Port: 3001<br/>Node.js + Express<br/>Auth & User Management]
        LISTING[Listing Service<br/>Port: 3002<br/>Node.js + Express<br/>Flights, Hotels, Cars]
        BOOKING[Booking Service<br/>Port: 3003<br/>Node.js + Express<br/>Booking Management]
        BILLING[Billing Service<br/>Port: 3004<br/>Node.js + Express<br/>Payment Processing]
        REVIEW[Review/Logging Service<br/>Port: 3005<br/>Node.js + Express<br/>Reviews & Activity Logging]
        ADMIN[Admin/Analytics Service<br/>Port: 3006<br/>Node.js + Express<br/>Analytics & Reporting]
        RECOMMEND[Agentic Recommendation Service<br/>Port: 8000<br/>Python + FastAPI<br/>AI Recommendations]
    end

    subgraph "Message Queue & Event Streaming"
        KAFKA[Apache Kafka<br/>Port: 9092/9093<br/>Event Streaming Platform]
        ZOOKEEPER[Zookeeper<br/>Port: 2181<br/>Coordination Service]
        KAFKA --> ZOOKEEPER
    end

    subgraph "Data Layer"
        MONGODB[(MongoDB Atlas<br/>Cloud Database<br/>Users, Listings, Reviews, Logs)]
        MYSQL[(MySQL 8.0<br/>Port: 3306<br/>ACID Transactions<br/>Bookings & Billings)]
        REDIS[(Redis Cache<br/>Port: 6379<br/>TTL-based Caching)]
    end

    %% Client to Frontend
    WEB --> REACT
    MOBILE --> REACT

    %% Frontend to Gateway and WebSocket
    REACT -->|HTTP/HTTPS| GATEWAY
    REACT -.->|WebSocket| RECOMMEND

    %% API Gateway to Services
    GATEWAY -->|/api/users| USER
    GATEWAY -->|/api/flights/hotels/cars| LISTING
    GATEWAY -->|/api/bookings| BOOKING
    GATEWAY -->|/api/billing| BILLING
    GATEWAY -->|/api/reviews/logs/images| REVIEW
    GATEWAY -->|/api/analytics/admins| ADMIN
    GATEWAY -->|/api/bundles/deals| RECOMMEND

    %% Service to Service Communication
    BOOKING -->|Validate User| USER
    BOOKING -->|Validate Listing| LISTING
    BILLING -->|Fetch Booking| BOOKING
    ADMIN -->|Read Data| USER
    ADMIN -->|Read Data| LISTING
    RECOMMEND -->|Read Listings| LISTING

    %% Services to Databases
    USER --> MONGODB
    LISTING --> MONGODB
    BOOKING --> MYSQL
    BOOKING --> MONGODB
    BOOKING --> REDIS
    BILLING --> MYSQL
    BILLING --> MONGODB
    BILLING --> REDIS
    REVIEW --> MONGODB
    ADMIN --> MONGODB
    RECOMMEND --> MONGODB

    %% Kafka Event Producers
    USER -.->|user.events| KAFKA
    BOOKING -.->|booking.events| KAFKA
    BOOKING -.->|billing.events| KAFKA
    BILLING -.->|billing.events| KAFKA
    REVIEW -.->|tracking.events| KAFKA
    RECOMMEND -.->|deal.events| KAFKA

    %% Kafka Event Consumers
    KAFKA -.->|events| LISTING
    KAFKA -.->|events| BOOKING
    KAFKA -.->|events| RECOMMEND

    %% Styling
    style REACT fill:#61dafb,stroke:#333,stroke-width:2px
    style GATEWAY fill:#90EE90,stroke:#333,stroke-width:2px
    style USER fill:#FFE4B5,stroke:#333,stroke-width:2px
    style LISTING fill:#FFE4B5,stroke:#333,stroke-width:2px
    style BOOKING fill:#FFE4B5,stroke:#333,stroke-width:2px
    style BILLING fill:#FFE4B5,stroke:#333,stroke-width:2px
    style REVIEW fill:#FFE4B5,stroke:#333,stroke-width:2px
    style ADMIN fill:#FFE4B5,stroke:#333,stroke-width:2px
    style RECOMMEND fill:#FFB6C1,stroke:#333,stroke-width:2px
    style MONGODB fill:#4EC9B0,stroke:#333,stroke-width:2px
    style MYSQL fill:#4479A1,stroke:#333,stroke-width:2px
    style REDIS fill:#DC382D,stroke:#333,stroke-width:2px,color:#fff
    style KAFKA fill:#231F20,stroke:#333,stroke-width:2px,color:#fff
    style ZOOKEEPER fill:#231F20,stroke:#333,stroke-width:2px,color:#fff
```

---

## Architecture Components

### Frontend Layer
- **React Frontend** (Port 5174): Single-page application built with React 18, Vite, Redux Toolkit, and React Router
- **WebSocket Connection**: Real-time event updates via WebSocket to Recommendation Service

### API Gateway Layer
- **API Gateway** (Port 3000): Single entry point routing all requests to appropriate microservices
- Routes requests based on path prefixes (`/api/users`, `/api/flights`, etc.)

### Microservices Layer
1. **User Service** (3001): Authentication, user registration, JWT token management
2. **Listing Service** (3002): Flight, hotel, and car listings with search and availability
3. **Booking Service** (3003): ACID-compliant booking management with MySQL
4. **Billing Service** (3004): Payment processing and invoice generation
5. **Review/Logging Service** (3005): User reviews, ratings, and activity logging
6. **Admin/Analytics Service** (3006): Analytics, reporting, and admin operations
7. **Agentic Recommendation Service** (8000): AI-powered recommendations and WebSocket broadcasting

### Message Queue & Event Streaming
- **Apache Kafka** (9092/9093): Event streaming platform for asynchronous communication
- **Zookeeper** (2181): Coordination service for Kafka
- **Event Topics**: `user.events`, `booking.events`, `billing.events`, `deal.events`, `tracking.events`

### Data Layer
- **MongoDB Atlas**: Cloud database for users, listings, reviews, logs (flexible schema)
- **MySQL 8.0**: Relational database for bookings and billings (ACID compliance)
- **Redis Cache**: In-memory cache for performance optimization (TTL-based expiration)

### Communication Patterns
- **HTTP/HTTPS**: Synchronous request/response via API Gateway
- **WebSocket**: Real-time bidirectional communication for live updates
- **Kafka Events**: Asynchronous event-driven communication between services
- **Service-to-Service**: Direct HTTP calls for validation and data fetching

---

## How to Use This Diagram

1. **Copy the Mermaid code** above (everything between the ```mermaid markers)
2. **Go to [Mermaid Live Editor](https://mermaid.live)**
3. **Paste the code** into the editor
4. **Export as PNG or SVG** using the download button
5. **Use in your documentation**

The diagram shows:
- ✅ All 8 microservices with ports and technologies
- ✅ Complete data flow (HTTP, WebSocket, Kafka events)
- ✅ All databases and their purposes
- ✅ Message queue architecture
- ✅ Service-to-service communication
- ✅ Color-coded components for easy identification

---

**This is the complete System Architecture Design Diagram for the entire Kayak Travel Platform.**

