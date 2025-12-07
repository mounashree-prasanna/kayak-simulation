# Seed Listing Click Logs - Quick Guide

This script populates the `listing_click_logs` collection with test data so the **Property/Listing Clicks** graph shows data in the Provider Analytics dashboard.

## Quick Start

1. **Make sure your services are running** (or MongoDB is accessible)

2. **Navigate to scripts folder:**
   ```bash
   cd scripts
   ```

3. **Install dependencies** (if not already installed):
   ```bash
   npm install
   ```

4. **Run the script:**
   ```bash
   node seedListingClicks.js
   ```

That's it! The script will:
- Connect to your MongoDB database
- Find listings for "Hotel Chain" provider (or customize)
- Generate click logs for those listings
- Insert them into the database

## Customization

### Change Provider Name

If you want to generate clicks for a different provider:

```bash
PROVIDER_NAME="Marriott" node seedListingClicks.js
```

Or for an airline:
```bash
PROVIDER_NAME="United Airlines" node seedListingClicks.js
```

### Change Number of Clicks

Generate more or fewer clicks per listing:

```bash
NUM_CLICKS=100 node seedListingClicks.js
```

### Custom MongoDB URI

If your MongoDB connection is different:

```bash
MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/kayak" node seedListingClicks.js
```

## What It Does

1. **Connects to MongoDB** using the connection string from docker-compose.yml
2. **Finds listings** that match the provider name (hotels, flights, cars)
3. **Generates click logs** with:
   - Random user IDs (15 different users)
   - Random timestamps (last 30 days)
   - Links to the provider's listings
4. **Deletes existing logs** for those listings (to avoid duplicates)
5. **Inserts new logs** into `listing_click_logs` collection

## Expected Output

```
🚀 Starting Listing Click Log Seeding...

📋 Configuration:
   Provider: Hotel Chain
   Clicks per listing: 50

✅ Connected to MongoDB
📊 Found 10 hotels for provider "Hotel Chain"
📊 Found 0 flights for provider "Hotel Chain"
📊 Found 0 cars for provider "Hotel Chain"

🔄 Generating 50 clicks per listing...
✅ Generated 500 click logs

💾 Inserting click logs into database...
🗑️  Deleted 0 existing click logs for these listings
   Inserted 500/500 click logs...
✅ Successfully inserted 500 click logs!

🎉 Done! The Property/Listing Clicks graph should now show data.

📊 Summary:
   - Provider: Hotel Chain
   - Listings: 10
   - Total clicks: 500

💡 Refresh your Provider Analytics dashboard to see the graph!

👋 Disconnected from MongoDB
```

## Troubleshooting

### "No listings found"

This means the provider name doesn't match any listings. Try:

1. **Check what providers you have:**
   - Look in your MongoDB `providers` collection
   - Check hotel/flight/car names in those collections

2. **Try a different name:**
   ```bash
   # Try partial matches
   PROVIDER_NAME="Marriott" node seedListingClicks.js
   PROVIDER_NAME="Hilton" node seedListingClicks.js
   ```

3. **Use provider_id instead:**
   - Check your providers collection for actual provider_id values
   - The script will also match by provider_id if it exists

### Connection Error

If you get a MongoDB connection error:

1. **Check if MongoDB is accessible:**
   - Make sure MongoDB Atlas is running
   - Check your IP is whitelisted in MongoDB Atlas
   - Verify the connection string is correct

2. **Use a custom connection string:**
   ```bash
   MONGODB_URI="your-connection-string" node seedListingClicks.js
   ```

## After Running

1. **Refresh your Provider Analytics dashboard** in the browser
2. **Navigate to the provider's analytics page** (e.g., `/admin/providers/Hotel Chain`)
3. **You should now see data** in the "Graph for Property/Listing Clicks" section!

## Notes

- This script **only modifies** the `listing_click_logs` collection
- It **doesn't change** any other code or data
- Existing click logs for the same listings will be **deleted and replaced**
- The script is **safe to run multiple times**

