# MongoDB Schema Documentation

This document describes the complete MongoDB schema design for the Kayak travel booking application.

## Collections Overview

### 1. Users Collection

**Purpose**: Store user accounts and profile information

```javascript
{
  _id: ObjectId,
  email: String (unique, required),
  password: String (hashed, required),
  firstName: String,
  lastName: String,
  phone: String,
  dateOfBirth: Date,
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  preferences: {
    currency: String (default: "USD"),
    language: String (default: "en"),
    notifications: {
      email: Boolean,
      sms: Boolean,
      push: Boolean
    }
  },
  bookingHistory: [ObjectId], // References to Bookings
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `email` (unique)
- `createdAt`

---

### 2. Flights Collection

**Purpose**: Store flight information and availability

```javascript
{
  _id: ObjectId,
  airline: String (required),
  flightNumber: String (required),
  departure: {
    airport: String (required), // Airport code (e.g., "JFK", "LAX")
    airportName: String,
    city: String,
    country: String,
    dateTime: Date (required),
    terminal: String,
    gate: String
  },
  arrival: {
    airport: String (required),
    airportName: String,
    city: String,
    country: String,
    dateTime: Date (required),
    terminal: String,
    gate: String
  },
  aircraft: {
    type: String,
    model: String
  },
  duration: Number, // in minutes
  stops: Number (default: 0),
  stopDetails: [{
    airport: String,
    duration: Number // layover time in minutes
  }],
  class: {
    economy: {
      available: Boolean,
      price: Number,
      seatsAvailable: Number
    },
    business: {
      available: Boolean,
      price: Number,
      seatsAvailable: Number
    },
    first: {
      available: Boolean,
      price: Number,
      seatsAvailable: Number
    }
  },
  baggage: {
    carryOn: {
      included: Boolean,
      maxWeight: Number, // in kg
      maxDimensions: String // e.g., "55x40x20cm"
    },
    checked: {
      included: Boolean,
      maxWeight: Number,
      maxPieces: Number
    }
  },
  amenities: [String], // e.g., ["WiFi", "Entertainment", "Meals"]
  available: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `departure.airport`
- `arrival.airport`
- `departure.dateTime`
- `airline`
- Compound: `departure.airport + arrival.airport + departure.dateTime`

---

### 3. Hotels Collection

**Purpose**: Store hotel information and availability

```javascript
{
  _id: ObjectId,
  name: String (required),
  description: String,
  address: {
    street: String,
    city: String (required),
    state: String,
    zipCode: String,
    country: String (required),
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  starRating: Number (1-5),
  amenities: [String], // e.g., ["WiFi", "Pool", "Gym", "Spa"]
  roomTypes: [{
    type: String (required), // e.g., "Standard", "Deluxe", "Suite"
    description: String,
    maxOccupancy: Number,
    beds: {
      type: String, // e.g., "1 King", "2 Double"
      count: Number
    },
    amenities: [String],
    pricing: {
      basePrice: Number (required),
      currency: String (default: "USD"),
      pricePerNight: Boolean (default: true)
    },
    availability: {
      available: Boolean,
      roomsAvailable: Number,
      checkIn: Date,
      checkOut: Date
    },
    images: [String] // URLs
  }],
  policies: {
    checkIn: String, // e.g., "3:00 PM",
    checkOut: String, // e.g., "11:00 AM",
    cancellation: String,
    petFriendly: Boolean,
    smokingAllowed: Boolean
  },
  images: [String], // Hotel images URLs
  reviews: {
    averageRating: Number (0-5),
    totalReviews: Number
  },
  contact: {
    phone: String,
    email: String,
    website: String
  },
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `address.city`
- `address.country`
- `starRating`
- `reviews.averageRating`
- Compound: `address.city + address.country + starRating`

---

### 4. CarRentals Collection

**Purpose**: Store car rental information and availability

```javascript
{
  _id: ObjectId,
  company: String (required), // e.g., "Hertz", "Enterprise"
  vehicle: {
    make: String (required), // e.g., "Toyota"
    model: String (required), // e.g., "Camry"
    year: Number,
    type: String (required), // e.g., "Economy", "SUV", "Luxury"
    category: String, // e.g., "Compact", "Full Size", "Premium"
    seats: Number,
    doors: Number,
    transmission: String, // "Automatic" or "Manual"
    fuelType: String, // "Gasoline", "Electric", "Hybrid"
    mileage: String, // e.g., "Unlimited"
    features: [String] // e.g., ["GPS", "Bluetooth", "USB"]
  },
  location: {
    pickup: {
      address: String (required),
      city: String (required),
      state: String,
      country: String (required),
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },
    dropoff: {
      address: String,
      city: String,
      state: String,
      country: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },
    sameLocation: Boolean (default: true)
  },
  availability: {
    available: Boolean,
    pickupDate: Date (required),
    dropoffDate: Date (required),
    unitsAvailable: Number
  },
  pricing: {
    basePrice: Number (required),
    currency: String (default: "USD"),
    pricePerDay: Number,
    totalDays: Number,
    taxes: Number,
    fees: {
      insurance: Number,
      additionalDriver: Number,
      youngDriver: Number, // if applicable
      airportFee: Number
    },
    totalPrice: Number
  },
  requirements: {
    minAge: Number (default: 21),
    drivingLicense: Boolean (required),
    creditCard: Boolean (required),
    deposit: Number
  },
  images: [String], // Vehicle images URLs
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `location.pickup.city`
- `location.pickup.country`
- `vehicle.type`
- `company`
- `availability.pickupDate`
- Compound: `location.pickup.city + availability.pickupDate + availability.dropoffDate`

---

### 5. Bookings Collection

**Purpose**: Store all user bookings (flights, hotels, car rentals)

```javascript
{
  _id: ObjectId,
  userId: ObjectId (required, ref: "User"),
  type: String (required), // "flight", "hotel", "car-rental"
  status: String (required), // "pending", "confirmed", "cancelled", "completed"
  
  // Flight booking details
  flight: {
    flightId: ObjectId (ref: "Flight"),
    passengers: [{
      firstName: String,
      lastName: String,
      dateOfBirth: Date,
      passportNumber: String,
      seatNumber: String,
      class: String // "economy", "business", "first"
    }],
    totalPrice: Number,
    currency: String
  },
  
  // Hotel booking details
  hotel: {
    hotelId: ObjectId (ref: "Hotel"),
    roomType: String,
    checkIn: Date,
    checkOut: Date,
    guests: [{
      firstName: String,
      lastName: String,
      age: Number
    }],
    totalNights: Number,
    totalPrice: Number,
    currency: String
  },
  
  // Car rental booking details
  carRental: {
    carRentalId: ObjectId (ref: "CarRental"),
    pickupDate: Date,
    dropoffDate: Date,
    driver: {
      firstName: String,
      lastName: String,
      licenseNumber: String,
      dateOfBirth: Date
    },
    totalDays: Number,
    totalPrice: Number,
    currency: String
  },
  
  payment: {
    paymentId: ObjectId (ref: "Payment"),
    status: String, // "pending", "completed", "failed", "refunded"
    amount: Number,
    currency: String,
    method: String // "credit_card", "paypal", "bank_transfer"
  },
  
  cancellationPolicy: {
    canCancel: Boolean,
    cancellationDeadline: Date,
    refundPercentage: Number, // 0-100
    cancellationFee: Number
  },
  
  bookingReference: String (unique, required),
  bookingDate: Date (required),
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `userId`
- `type`
- `status`
- `bookingReference` (unique)
- `bookingDate`
- Compound: `userId + status`

---

### 6. Reviews Collection

**Purpose**: Store user reviews and ratings

```javascript
{
  _id: ObjectId,
  userId: ObjectId (required, ref: "User"),
  type: String (required), // "flight", "hotel"
  itemId: ObjectId (required), // Flight or Hotel ID
  rating: Number (required, min: 1, max: 5),
  title: String,
  review: String,
  pros: [String],
  cons: [String],
  verifiedBooking: Boolean, // User has actually booked this
  helpful: {
    count: Number (default: 0),
    users: [ObjectId] // Users who found this helpful
  },
  images: [String], // Review images URLs
  status: String (default: "published"), // "published", "pending", "rejected"
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `userId`
- `type`
- `itemId`
- `rating`
- `verifiedBooking`
- Compound: `type + itemId + rating`

---

### 7. Payments Collection

**Purpose**: Store payment transactions

```javascript
{
  _id: ObjectId,
  userId: ObjectId (required, ref: "User"),
  bookingId: ObjectId (required, ref: "Booking"),
  amount: Number (required),
  currency: String (required, default: "USD"),
  method: String (required), // "credit_card", "debit_card", "paypal", "bank_transfer"
  status: String (required), // "pending", "processing", "completed", "failed", "refunded"
  paymentDetails: {
    // Credit/Debit Card
    cardType: String, // "Visa", "Mastercard", "Amex"
    last4: String, // Last 4 digits
    cardholderName: String,
    expiryMonth: Number,
    expiryYear: Number,
    
    // PayPal
    paypalEmail: String,
    paypalTransactionId: String,
    
    // Bank Transfer
    bankName: String,
    accountNumber: String,
    transactionReference: String
  },
  transactionId: String (unique),
  refundDetails: {
    refunded: Boolean,
    refundAmount: Number,
    refundDate: Date,
    refundReason: String
  },
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `userId`
- `bookingId`
- `transactionId` (unique)
- `status`
- `createdAt`

---

## Schema Relationships

### One-to-Many Relationships:
- **User → Bookings**: One user can have many bookings
- **User → Reviews**: One user can write many reviews
- **User → Payments**: One user can make many payments
- **Flight → Bookings**: One flight can be booked multiple times
- **Hotel → Bookings**: One hotel can have many bookings
- **CarRental → Bookings**: One car rental can be booked multiple times
- **Booking → Payment**: One booking has one payment

### Many-to-Many Relationships:
- **Hotels → Reviews**: Many hotels can have many reviews

---

## Data Validation

All collections include:
- Required field validation
- Data type validation
- Enum validation for status fields
- Date validation for dates
- Email validation for email fields
- Reference validation for ObjectId references

---

## Performance Considerations

1. **Indexes**: Strategic indexes on frequently queried fields
2. **Aggregation**: Use aggregation pipelines for complex queries
3. **Pagination**: Implement pagination for large result sets
4. **Caching**: Consider caching for frequently accessed data
5. **Sharding**: For large-scale deployments, consider sharding on user geographic data

---

## Security Considerations

1. **Password Hashing**: All passwords are hashed using bcrypt
2. **JWT Tokens**: Authentication uses secure JWT tokens
3. **Input Validation**: All inputs are validated and sanitized
4. **Data Encryption**: Sensitive data (payment info) should be encrypted at rest
5. **Access Control**: Role-based access control for admin operations

