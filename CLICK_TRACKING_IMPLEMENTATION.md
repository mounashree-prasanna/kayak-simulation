# Click Tracking Implementation

## What Was Added

Real-world click tracking has been implemented for property/listing clicks. Now when users view listings, their interactions are automatically logged to MongoDB's `listing_click_logs` collection, and the data appears in the Provider Analytics dashboard.

## Files Modified

### New Files Created:
1. **`frontend/src/services/tracking.js`** - Tracking utility service
   - `logListingClick()` - Logs listing views/clicks
   - Fails silently to avoid breaking the app

### Files Modified (Added Tracking):
1. **`frontend/src/pages/HotelDetails.jsx`** - Tracks hotel views
2. **`frontend/src/pages/FlightDetails.jsx`** - Tracks flight views
3. **`frontend/src/pages/CarDetails.jsx`** - Tracks car views

## How It Works

### 1. User Views a Listing
When a user navigates to a listing detail page (hotel, flight, or car):
- The page loads and fetches listing data
- Once the listing data is successfully fetched, a tracking call is automatically made
- The click/view is logged to MongoDB `listing_click_logs` collection

### 2. Data Flow
```
User views listing → Detail page loads → Listing data fetched → 
Tracking call made → Backend logs to MongoDB → Analytics dashboard reads data
```

### 3. What Gets Logged
For each listing view:
- `user_id` - User ID if logged in (optional)
- `listing_type` - 'Hotel', 'Flight', or 'Car'
- `listing_id` - The ID of the listing
- `timestamp` - When the view occurred

### 4. Backend Processing
- The `/logging/listing-click` endpoint in `review-logging-service` receives the data
- Saves to MongoDB `listing_click_logs` collection
- Publishes event to Kafka (for future real-time analytics)

### 5. Analytics Display
- Admin Analytics dashboard queries `listing_click_logs` collection
- Groups clicks by listing and provider
- Displays in "Graph for Property/Listing Clicks"

## Implementation Details

### Tracking Service (`frontend/src/services/tracking.js`)
- **Non-intrusive**: Fails silently if tracking service is unavailable
- **No user impact**: Errors don't break the user experience
- **Optional user ID**: Tracks user if logged in, otherwise anonymous

### Detail Pages
- Tracking is added **after** listing data is successfully loaded
- Uses the correct listing ID (hotel_id, flight_id, or car_id)
- Automatically gets user ID from Redux store if available

## Testing

### To Test:
1. **Start your services:**
   ```bash
   docker-compose up --build
   ```

2. **Navigate to listings:**
   - View a hotel: `/hotels/{hotel_id}`
   - View a flight: `/flights/{flight_id}`
   - View a car: `/cars/{car_id}`

3. **Check MongoDB:**
   - Open MongoDB Atlas
   - Check `listing_click_logs` collection
   - You should see new documents with:
     - `listing_type`: 'Hotel', 'Flight', or 'Car'
     - `listing_id`: The listing ID
     - `timestamp`: Current date/time
     - `user_id`: User ID if logged in (optional)

4. **View Analytics:**
   - Go to Admin Analytics dashboard
   - Navigate to Provider Analytics page
   - The "Graph for Property/Listing Clicks" should show data

## Backend Endpoints Used

- **POST** `/api/logging/listing-click`
  - Body: `{ user_id?, listing_type, listing_id }`
  - Saves to MongoDB and publishes to Kafka

## What Was NOT Changed

- ✅ No existing functionality was modified
- ✅ No breaking changes
- ✅ All existing features continue to work
- ✅ Tracking fails silently if service is down

## Notes

- Tracking is **automatic** - no manual intervention needed
- Works for both **logged-in and anonymous** users
- **Anonymous users** are tracked without user_id
- **Logged-in users** are tracked with their user_id

## Future Enhancements (Not Implemented)

These could be added later if needed:
- Track clicks from search results (before navigating to detail page)
- Track time spent on listing page
- Track booking conversion from clicks
- Real-time analytics dashboard updates

## Troubleshooting

### No data showing in analytics?
1. Check if `review-logging-service` is running:
   ```bash
   docker ps | grep review-logging-service
   ```

2. Check MongoDB connection in review-logging-service logs

3. Verify tracking calls are being made:
   - Open browser DevTools → Network tab
   - Navigate to a listing detail page
   - Look for POST request to `/api/logging/listing-click`
   - Should return 201 status

4. Check MongoDB `listing_click_logs` collection has data

### Tracking not working?
- Check browser console for errors
- Verify API Gateway is routing `/logging/*` to review-logging-service
- Check review-logging-service logs for errors

