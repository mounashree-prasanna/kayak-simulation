# Graph Fix Summary

## Problem
Clicks are being saved to MongoDB but not showing in the Provider Analytics graph.

## Root Cause
The backend was only matching clicks by `hotel_id` field, but clicks might be saved with MongoDB `_id` (ObjectId). Additionally, the backend needs to handle both ID formats and ensure provider matching works correctly.

## Fixes Applied

### 1. Updated Backend to Handle Both ID Formats
**File:** `services/admin-analytics-service/src/controllers/analyticsController.js`

- Updated `getProviderListingIds()` to include both `hotel_id` and `_id` when querying hotels
- Updated for flights and cars too to be consistent
- Added duplicate removal and string conversion
- Added logging to debug ID matching

### 2. Enhanced Hotel Provider Matching
- When only `provider_name` is provided (no `provider_id`), now also searches hotels by name pattern
- Previously skipped hotels if no `provider_id` was provided

### 3. Added Debug Logging
- Logs listing IDs found for the provider
- Logs sample click logs in database
- Helps identify matching issues

## Next Steps

1. **Restart the admin-analytics-service:**
   ```bash
   docker-compose restart admin-analytics-service
   ```

2. **Check the logs:**
   ```bash
   docker logs kayak-admin-analytics-service --tail 50
   ```

3. **Test the graph:**
   - Go to Provider Analytics dashboard
   - Select your provider (e.g., "Hotel Chain")
   - Check "Graph for Property/Listing Clicks"
   - Should now show data!

## Troubleshooting

If still not showing:

1. **Check what IDs are in click logs:**
   - Go to MongoDB Atlas
   - Check `listing_click_logs` collection
   - See what `listing_id` values are saved

2. **Check what IDs backend is looking for:**
   - Check admin-analytics-service logs
   - Look for "Found X listing IDs" message
   - Compare with click log IDs

3. **Check provider matching:**
   - Verify hotels have correct `provider_id` or name matching provider
   - Check if provider name is exactly "Hotel Chain" (case-sensitive matching with regex)

## Files Changed
- `services/admin-analytics-service/src/controllers/analyticsController.js`


