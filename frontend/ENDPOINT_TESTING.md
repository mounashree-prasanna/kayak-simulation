# API Endpoint Testing Guide

## Overview
This document provides a comprehensive guide for testing all API endpoints used by the frontend.

## Prerequisites
1. **Backend Services Running**:
   - API Gateway: `http://localhost:3000`
   - User Service: `http://localhost:3001`
   - Listing Service: `http://localhost:3002`
   - Booking Service: `http://localhost:3003`
   - Billing Service: `http://localhost:3004`
   - Review/Logging Service: `http://localhost:3005`
   - Admin/Analytics Service: `http://localhost:3006`
   - Agentic Recommendation Service: `http://localhost:8000`

2. **MongoDB**: Connected and accessible
3. **Kafka**: Running on `localhost:9092` (optional for basic testing)

## Testing Endpoints

### 1. Health Check
```bash
curl http://localhost:3000/health
```
**Expected**: 200 OK with service status

### 2. Flight Endpoints

#### Search Flights
```bash
curl "http://localhost:3000/api/flights/search?origin=JFK&destination=LAX&date=2024-02-01&flightClass=economy"
```
**Expected Parameters**:
- `origin` (required): Airport code (e.g., JFK)
- `destination` (required): Airport code (e.g., LAX)
- `date`: YYYY-MM-DD format
- `flightClass`: economy, business, first
- `minPrice`, `maxPrice`: Optional price filters

**Response Fields**:
- `flight_id` or `_id`
- `airline_name` or `airline`
- `departure_airport`
- `arrival_airport`
- `departure_datetime`
- `arrival_datetime`
- `ticket_price`
- `flight_class` or `class`
- `total_available_seats`

#### Get Flight Details
```bash
curl "http://localhost:3000/api/flights/FL001"
```
**Expected**: Flight object with all details

### 3. Hotel Endpoints

#### Search Hotels
```bash
curl "http://localhost:3000/api/hotels/search?city=New%20York&date=2024-02-01&stars=4"
```
**Expected Parameters**:
- `city` (required): City name
- `date`: YYYY-MM-DD format
- `stars`: Star rating (1-5)
- `price_min`, `price_max`: Price range
- `wifi`, `breakfast_included`, `parking`, `pet_friendly`, `near_transit`: true/false

**Response Fields**:
- `hotel_id` or `_id`
- `hotel_name`
- `address.city`, `address.state`, `address.country`
- `star_rating`
- `price_per_night`
- `amenities.wifi`, `amenities.breakfast_included`, etc.

#### Get Hotel Details
```bash
curl "http://localhost:3000/api/hotels/HOTEL001"
```

### 4. Car Rental Endpoints

#### Search Cars
```bash
curl "http://localhost:3000/api/cars/search?city=Los%20Angeles&date=2024-02-01"
```
**Expected Parameters**:
- `city` (required): City name
- `date`: YYYY-MM-DD format
- `price_min`, `price_max`: Price range
- `car_type`: Vehicle type

**Response Fields**:
- `car_id` or `_id`
- `vehicle_model` or `car_model`
- `car_type` or `vehicle_type`
- `company_name` or `rental_company`
- `pickup_city`, `pickup_state`
- `daily_rental_price` or `price_per_day`
- `availability_status`

#### Get Car Details
```bash
curl "http://localhost:3000/api/cars/CAR001"
```

### 5. Booking Endpoints

#### Create Booking (Flight)
```bash
curl -X POST "http://localhost:3000/api/bookings" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "flight",
    "flight_id": "FL001",
    "passengers": [{
      "firstName": "John",
      "lastName": "Doe",
      "dateOfBirth": "1990-01-01",
      "passportNumber": "ABC123456"
    }],
    "flight_class": "economy"
  }'
```

#### Create Booking (Hotel)
```bash
curl -X POST "http://localhost:3000/api/bookings" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "hotel",
    "hotel_id": "HOTEL001",
    "check_in": "2024-02-01",
    "check_out": "2024-02-05",
    "guests": [{
      "firstName": "John",
      "lastName": "Doe",
      "age": 30
    }],
    "room_type": "Standard"
  }'
```

#### Create Booking (Car)
```bash
curl -X POST "http://localhost:3000/api/bookings" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "car",
    "car_id": "CAR001",
    "pickup_date": "2024-02-01",
    "dropoff_date": "2024-02-05",
    "driver": {
      "firstName": "John",
      "lastName": "Doe",
      "licenseNumber": "DL123456",
      "dateOfBirth": "1990-01-01"
    }
  }'
```

#### Get User Bookings
```bash
curl "http://localhost:3000/api/bookings/users/123-45-6789/bookings" \
  -H "Authorization: Bearer <token>"
```

#### Get Booking Details
```bash
curl "http://localhost:3000/api/bookings/BOOKING001" \
  -H "Authorization: Bearer <token>"
```

#### Cancel Booking
```bash
curl -X PUT "http://localhost:3000/api/bookings/BOOKING001/cancel" \
  -H "Authorization: Bearer <token>"
```

### 6. User Endpoints

#### Create User
```bash
curl -X POST "http://localhost:3000/api/users" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "123-45-6789",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone_number": "555-1234",
    "address": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zip": "10001",
      "country": "USA"
    }
  }'
```

#### Get User
```bash
curl "http://localhost:3000/api/users/123-45-6789"
```

## Common Issues & Solutions

### Issue: ERR_CONNECTION_REFUSED
**Solution**: Ensure backend services are running
```bash
# Check if services are running
curl http://localhost:3000/health
```

### Issue: 404 Not Found
**Solution**: Check API Gateway routing
- Verify endpoint path matches gateway configuration
- Check service URLs in API Gateway

### Issue: 500 Internal Server Error
**Solution**: 
- Check MongoDB connection
- Verify data format matches schema
- Check service logs

### Issue: WebSocket Connection Failed
**Solution**: 
- Ensure Recommendation Service is running on port 8000
- Check CORS configuration
- WebSocket errors are now handled gracefully (won't break the app)

## Field Name Variations

The backend may return fields with different names. The frontend handles:

**Flights**:
- `airline` or `airline_name`
- `departure_airport` or `departure.airportCode`
- `departure_datetime` or `departure.dateTime`
- `ticket_price` or `price`
- `flight_class` or `class`

**Hotels**:
- `hotel_name` or `name`
- `price_per_night` or `price`
- `star_rating` or `stars`

**Cars**:
- `vehicle_model` or `car_model`
- `car_type` or `vehicle_type`
- `company_name` or `rental_company`
- `daily_rental_price` or `price_per_day`
- `pickup_city` or `location.city`

## Testing Checklist

- [ ] Health check endpoint works
- [ ] Flight search returns results
- [ ] Hotel search returns results
- [ ] Car search returns results
- [ ] Flight details page loads
- [ ] Hotel details page loads
- [ ] Car details page loads
- [ ] User registration works
- [ ] User login works
- [ ] Booking creation works (all types)
- [ ] Booking retrieval works
- [ ] Booking cancellation works
- [ ] Error handling works when backend is down
- [ ] WebSocket connects (if service running)
- [ ] Network errors show user-friendly messages

## Automated Testing Script

```bash
#!/bin/bash
# test-endpoints.sh

BASE_URL="http://localhost:3000/api"

echo "Testing Health Check..."
curl -s "$BASE_URL/../health" | jq .

echo -e "\nTesting Flight Search..."
curl -s "$BASE_URL/flights/search?origin=JFK&destination=LAX" | jq '.count'

echo -e "\nTesting Hotel Search..."
curl -s "$BASE_URL/hotels/search?city=New%20York" | jq '.count'

echo -e "\nTesting Car Search..."
curl -s "$BASE_URL/cars/search?city=Los%20Angeles" | jq '.count'

echo -e "\nAll tests completed!"
```

