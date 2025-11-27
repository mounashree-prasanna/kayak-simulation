# MongoDB Schema Summary

This document provides a quick reference for the MongoDB schema design used in the Kayak travel booking backend.

## Overview

The database consists of **7 main collections**:

1. **Users** - User accounts and profiles
2. **Flights** - Flight information and availability
3. **Hotels** - Hotel information and room availability
4. **CarRentals** - Car rental information and availability
5. **Bookings** - All user bookings (flights, hotels, car rentals)
6. **Reviews** - User reviews and ratings
7. **Payments** - Payment transactions

---

## Collection Details

### 1. Users Collection

**Purpose**: Store user authentication and profile data

**Key Fields**:
- `email` (unique, required) - User email address
- `password` (hashed, required) - User password (bcrypt hashed)
- `firstName`, `lastName` - User name
- `address` - User address object
- `preferences` - User preferences (currency, language, notifications)
- `bookingHistory` - Array of booking references
- `role` - User role (user/admin)

**Indexes**:
- `email` (unique)
- `createdAt`

**Relationships**:
- One-to-Many: User → Bookings
- One-to-Many: User → Reviews
- One-to-Many: User → Payments

---

### 2. Flights Collection

**Purpose**: Store flight schedules, pricing, and availability

**Key Fields**:
- `airline` - Airline name
- `flightNumber` - Flight number
- `departure` - Departure details (airport, city, dateTime, terminal, gate)
- `arrival` - Arrival details (airport, city, dateTime, terminal, gate)
- `duration` - Flight duration in minutes
- `stops` - Number of stops
- `class` - Pricing for economy, business, first class
  - Each class has: `available`, `price`, `seatsAvailable`
- `baggage` - Baggage allowance details
- `amenities` - Array of amenities (WiFi, Entertainment, etc.)

**Indexes**:
- `departure.airport`
- `arrival.airport`
- `departure.dateTime`
- `airline`
- Compound: `departure.airport + arrival.airport + departure.dateTime`

**Relationships**:
- One-to-Many: Flight → Bookings

---

### 3. Hotels Collection

**Purpose**: Store hotel information, rooms, and availability

**Key Fields**:
- `name` - Hotel name
- `address` - Hotel address with coordinates
- `starRating` - Star rating (1-5)
- `amenities` - Array of hotel amenities
- `roomTypes` - Array of room types
  - Each room type has: `type`, `pricing`, `availability`, `amenities`
- `policies` - Check-in/out times, cancellation policy
- `reviews` - Aggregated review data (averageRating, totalReviews)

**Indexes**:
- `address.city`
- `address.country`
- `starRating`
- `reviews.averageRating`
- Compound: `address.city + address.country + starRating`

**Relationships**:
- One-to-Many: Hotel → Bookings
- Many-to-Many: Hotel → Reviews (via itemId)

---

### 4. CarRentals Collection

**Purpose**: Store car rental information and availability

**Key Fields**:
- `company` - Rental company name
- `vehicle` - Vehicle details (make, model, type, features)
- `location` - Pickup and dropoff locations
- `availability` - Availability dates and units
- `pricing` - Pricing structure with fees
- `requirements` - Age, license, deposit requirements

**Indexes**:
- `location.pickup.city`
- `location.pickup.country`
- `vehicle.type`
- `company`
- `availability.pickupDate`
- Compound: `location.pickup.city + availability.pickupDate + availability.dropoffDate`

**Relationships**:
- One-to-Many: CarRental → Bookings

---

### 5. Bookings Collection

**Purpose**: Store all user bookings for flights, hotels, and car rentals

**Key Fields**:
- `userId` - Reference to User
- `type` - Booking type: "flight", "hotel", or "car-rental"
- `status` - Booking status: "pending", "confirmed", "cancelled", "completed"
- `flight` - Flight booking details (if type is "flight")
- `hotel` - Hotel booking details (if type is "hotel")
- `carRental` - Car rental booking details (if type is "car-rental")
- `payment` - Payment information
- `cancellationPolicy` - Cancellation rules
- `bookingReference` - Unique booking reference number

**Indexes**:
- `userId`
- `type`
- `status`
- `bookingReference` (unique)
- `bookingDate`
- Compound: `userId + status`

**Relationships**:
- Many-to-One: Booking → User
- Many-to-One: Booking → Flight/Hotel/CarRental (via polymorphic reference)
- One-to-One: Booking → Payment

---

### 6. Reviews Collection

**Purpose**: Store user reviews and ratings for flights and hotels

**Key Fields**:
- `userId` - Reference to User
- `type` - Review type: "flight" or "hotel"
- `itemId` - Reference to Flight or Hotel (polymorphic)
- `rating` - Rating (1-5)
- `title` - Review title
- `review` - Review text
- `pros` - Array of pros
- `cons` - Array of cons
- `verifiedBooking` - Whether user has verified booking
- `helpful` - Helpful votes count and users

**Indexes**:
- `userId`
- `type`
- `itemId`
- `rating`
- `verifiedBooking`
- Compound: `type + itemId + rating`

**Relationships**:
- Many-to-One: Review → User
- Many-to-One: Review → Flight/Hotel (polymorphic)

---

### 7. Payments Collection

**Purpose**: Store payment transactions

**Key Fields**:
- `userId` - Reference to User
- `bookingId` - Reference to Booking
- `amount` - Payment amount
- `currency` - Payment currency
- `method` - Payment method (credit_card, paypal, etc.)
- `status` - Payment status
- `paymentDetails` - Payment method specific details
- `transactionId` - Unique transaction ID
- `refundDetails` - Refund information if applicable

**Indexes**:
- `userId`
- `bookingId`
- `transactionId` (unique)
- `status`
- `createdAt`

**Relationships**:
- Many-to-One: Payment → User
- One-to-One: Payment → Booking

---

## Schema Design Principles

### 1. **Embedded vs Referenced Data**
- **Embedded**: Small, frequently accessed data (address, preferences)
- **Referenced**: Large collections with relationships (bookings, reviews)

### 2. **Indexing Strategy**
- Indexes on frequently queried fields
- Compound indexes for multi-field queries
- Unique indexes for fields that must be unique

### 3. **Data Validation**
- Required fields enforced at schema level
- Data type validation
- Enum validation for status fields
- Custom validators for business rules

### 4. **Performance Optimization**
- Strategic indexing for search queries
- Pagination support for large result sets
- Efficient query patterns
- Aggregation pipelines for complex operations

### 5. **Data Integrity**
- Referential integrity via ObjectId references
- Cascading updates where appropriate
- Validation at multiple levels (schema, application)

---

## Common Query Patterns

### Search Flights
```javascript
Flight.find({
  'departure.airport': 'JFK',
  'arrival.airport': 'LAX',
  'departure.dateTime': { $gte: startDate, $lte: endDate },
  'class.economy.available': true,
  'class.economy.seatsAvailable': { $gte: passengers }
})
```

### Search Hotels
```javascript
Hotel.find({
  'address.city': /New York/i,
  'address.country': 'USA',
  'roomTypes.availability.available': true,
  'roomTypes.pricing.basePrice': { $lte: maxPrice },
  starRating: { $gte: minRating }
})
```

### Get User Bookings
```javascript
Booking.find({
  userId: userId,
  status: { $in: ['confirmed', 'pending'] }
})
.populate('flight.flightId')
.populate('hotel.hotelId')
```

---

## Migration Considerations

When creating these collections in MongoDB:

1. **Create collections first** - MongoDB creates collections automatically, but you can create them explicitly
2. **Add indexes after data insertion** - For better performance during initial data load
3. **Validate data types** - Ensure all data matches the schema
4. **Set up relationships** - Use MongoDB references (ObjectId) for relationships

---

## Sample MongoDB Commands

### Create User
```javascript
db.users.insertOne({
  email: "user@example.com",
  password: "$2a$10$hashedPassword",
  firstName: "John",
  lastName: "Doe",
  preferences: {
    currency: "USD",
    language: "en"
  }
})
```

### Create Flight
```javascript
db.flights.insertOne({
  airline: "American Airlines",
  flightNumber: "AA100",
  departure: {
    airport: "JFK",
    city: "New York",
    dateTime: ISODate("2024-02-01T08:00:00Z")
  },
  arrival: {
    airport: "LAX",
    city: "Los Angeles",
    dateTime: ISODate("2024-02-01T11:30:00Z")
  },
  class: {
    economy: {
      available: true,
      price: 350,
      seatsAvailable: 50
    }
  }
})
```

---

## Next Steps

1. **Set up MongoDB** - Install MongoDB locally or use MongoDB Atlas
2. **Create database** - Create a database named `kayak_db` (or your preferred name)
3. **Run seeder script** - Use `scripts/seedData.js` to populate sample data
4. **Create indexes** - Indexes are created automatically by Mongoose, but you can verify them
5. **Test queries** - Use the API endpoints to test data retrieval

---

For detailed schema documentation, see `docs/MONGODB_SCHEMA.md`

