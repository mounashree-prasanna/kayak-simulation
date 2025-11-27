# API Documentation

Base URL: `http://localhost:3000/api`

## Authentication

All protected routes require a Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Auth Endpoints

### Register User
- **POST** `/auth/register`
- **Access**: Public
- **Body**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```
- **Response**:
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

### Login
- **POST** `/auth/login`
- **Access**: Public
- **Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
- **Response**: Same as register

### Get Current User
- **GET** `/auth/me`
- **Access**: Private
- **Response**:
```json
{
  "success": true,
  "data": {
    "_id": "user_id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "bookingHistory": [],
    "preferences": {...}
  }
}
```

---

## Flight Endpoints

### Search Flights
- **GET** `/flights/search`
- **Access**: Public
- **Query Parameters**:
  - `departureAirport` (required): Airport code (e.g., "JFK")
  - `arrivalAirport` (required): Airport code (e.g., "LAX")
  - `departureDate`: Date in YYYY-MM-DD format
  - `returnDate`: Date in YYYY-MM-DD format
  - `passengers`: Number of passengers
  - `class`: "economy", "business", or "first"
- **Example**: `/flights/search?departureAirport=JFK&arrivalAirport=LAX&departureDate=2024-01-15&passengers=2&class=economy`
- **Response**:
```json
{
  "success": true,
  "count": 10,
  "data": [...]
}
```

### Get Flight Details
- **GET** `/flights/:id`
- **Access**: Public
- **Response**:
```json
{
  "success": true,
  "data": {
    "_id": "flight_id",
    "airline": "American Airlines",
    "flightNumber": "AA123",
    "departure": {...},
    "arrival": {...},
    "class": {...}
  }
}
```

### Book Flight
- **POST** `/flights/book`
- **Access**: Private
- **Body**:
```json
{
  "flightId": "flight_id",
  "passengers": [
    {
      "firstName": "John",
      "lastName": "Doe",
      "dateOfBirth": "1990-01-01",
      "passportNumber": "ABC123456",
      "class": "economy"
    }
  ],
  "class": "economy"
}
```
- **Response**:
```json
{
  "success": true,
  "data": {
    "_id": "booking_id",
    "bookingReference": "BK123456",
    "type": "flight",
    "status": "pending",
    "flight": {...}
  }
}
```

---

## Hotel Endpoints

### Search Hotels
- **GET** `/hotels/search`
- **Access**: Public
- **Query Parameters**:
  - `city`: City name
  - `country`: Country name
  - `checkIn`: Date in YYYY-MM-DD format
  - `checkOut`: Date in YYYY-MM-DD format
  - `guests`: Number of guests
  - `minRating`: Minimum star rating (1-5)
  - `maxPrice`: Maximum price per night
  - `amenities`: Comma-separated list of amenities
- **Example**: `/hotels/search?city=New York&checkIn=2024-01-15&checkOut=2024-01-18&guests=2&minRating=4`
- **Response**: Same format as flight search

### Get Hotel Details
- **GET** `/hotels/:id`
- **Access**: Public
- **Response**: Hotel object with all details

### Book Hotel
- **POST** `/hotels/book`
- **Access**: Private
- **Body**:
```json
{
  "hotelId": "hotel_id",
  "roomType": "Standard",
  "checkIn": "2024-01-15",
  "checkOut": "2024-01-18",
  "guests": [
    {
      "firstName": "John",
      "lastName": "Doe",
      "age": 30
    }
  ]
}
```
- **Response**: Booking object

---

## Car Rental Endpoints

### Search Car Rentals
- **GET** `/car-rentals/search`
- **Access**: Public
- **Query Parameters**:
  - `city`: City name
  - `country`: Country name
  - `pickupDate`: Date in YYYY-MM-DD format
  - `dropoffDate`: Date in YYYY-MM-DD format
  - `vehicleType`: "Economy", "SUV", "Luxury", etc.
  - `company`: Company name
- **Example**: `/car-rentals/search?city=Los Angeles&pickupDate=2024-01-15&dropoffDate=2024-01-20&vehicleType=SUV`
- **Response**: Same format as flight search

### Get Car Rental Details
- **GET** `/car-rentals/:id`
- **Access**: Public
- **Response**: Car rental object with all details

### Book Car Rental
- **POST** `/car-rentals/book`
- **Access**: Private
- **Body**:
```json
{
  "carRentalId": "car_rental_id",
  "driver": {
    "firstName": "John",
    "lastName": "Doe",
    "licenseNumber": "DL123456",
    "dateOfBirth": "1990-01-01"
  },
  "pickupDate": "2024-01-15",
  "dropoffDate": "2024-01-20"
}
```
- **Response**: Booking object

---

## Booking Endpoints

### Get User Bookings
- **GET** `/bookings`
- **Access**: Private
- **Query Parameters**:
  - `status`: Filter by status (pending, confirmed, cancelled, completed)
  - `type`: Filter by type (flight, hotel, car-rental)
- **Example**: `/bookings?status=confirmed&type=flight`
- **Response**:
```json
{
  "success": true,
  "count": 5,
  "data": [...]
}
```

### Get Booking Details
- **GET** `/bookings/:id`
- **Access**: Private (owner only)
- **Response**: Complete booking object with populated references

### Cancel Booking
- **PUT** `/bookings/:id/cancel`
- **Access**: Private (owner only)
- **Response**:
```json
{
  "success": true,
  "data": {...},
  "message": "Booking cancelled successfully",
  "refund": {
    "amount": 800,
    "cancellationFee": 100
  }
}
```

---

## Review Endpoints

### Get Reviews
- **GET** `/reviews`
- **Access**: Public
- **Query Parameters**:
  - `type`: "flight" or "hotel"
  - `itemId`: ID of the flight or hotel
  - `rating`: Filter by rating (1-5)
  - `verified`: "true" to show only verified reviews
- **Example**: `/reviews?type=hotel&itemId=hotel_id&rating=5&verified=true`
- **Response**:
```json
{
  "success": true,
  "count": 25,
  "data": [...]
}
```

### Create Review
- **POST** `/reviews`
- **Access**: Private
- **Body**:
```json
{
  "type": "hotel",
  "itemId": "hotel_id",
  "rating": 5,
  "title": "Great stay!",
  "review": "Had an amazing experience...",
  "pros": ["Clean rooms", "Great location"],
  "cons": ["Slow WiFi"],
  "images": ["url1", "url2"]
}
```
- **Response**: Created review object

### Update Review
- **PUT** `/reviews/:id`
- **Access**: Private (owner only)
- **Body**: Same as create (all fields optional)
- **Response**: Updated review object

---

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "message": "Error message here"
}
```

Common HTTP Status Codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Server Error

---

## Health Check

### Check Server Status
- **GET** `/health`
- **Access**: Public
- **Response**:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

