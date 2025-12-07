/**
 * Seed Listing Click Logs for Provider Analytics
 * 
 * This script populates the listing_click_logs collection with test data
 * so that the Property/Listing Clicks graph can display data.
 * 
 * Usage:
 *   node seedListingClicks.js
 * 
 * Environment Variables (optional):
 *   MONGODB_URI - MongoDB connection string (defaults to docker-compose value)
 *   PROVIDER_NAME - Provider name to generate clicks for (default: "Hotel Chain")
 *   NUM_CLICKS - Number of clicks to generate per listing (default: 50)
 */

const mongoose = require('mongoose');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://alishakartik_db_user:LSnNV7VtlqoeKZdT@cluster-236.njc5716.mongodb.net/kayak?appName=Cluster-236';
const DB_NAME = 'kayak';
const PROVIDER_NAME = process.env.PROVIDER_NAME || 'Hotel Chain';
const NUM_CLICKS_PER_LISTING = parseInt(process.env.NUM_CLICKS || '50');

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
}

// Schema definitions (matching the actual models)
const ListingClickLogSchema = new mongoose.Schema({
  user_id: { type: String, required: true, trim: true },
  listing_type: { type: String, required: true, enum: ['Flight', 'Hotel', 'Car'] },
  listing_id: { type: String, required: true, trim: true },
  timestamp: { type: Date, default: Date.now }
}, {
  collection: 'listing_click_logs',
  timestamps: false
});

const ListingClickLog = mongoose.model('ListingClickLog', ListingClickLogSchema);

// Get all listings for a provider
async function getProviderListings(providerName) {
  const db = mongoose.connection.db;
  
  const listings = {
    hotels: [],
    flights: [],
    cars: []
  };

  try {
    // Get hotels - match by name containing provider name or by provider_id if exists
    const hotelsCollection = db.collection('hotels');
    const hotelQuery = {
      $or: [
        { name: { $regex: new RegExp(providerName, 'i') } },
        { provider_name: { $regex: new RegExp(providerName, 'i') } },
        { provider_id: providerName }
      ]
    };
    const hotels = await hotelsCollection.find(hotelQuery).limit(20).toArray();
    listings.hotels = hotels.map(h => ({
      listing_id: h.hotel_id || h._id?.toString(),
      listing_type: 'Hotel',
      name: h.name
    })).filter(h => h.listing_id);
    console.log(`📊 Found ${listings.hotels.length} hotels for provider "${providerName}"`);

    // Get flights - match by airline_name
    const flightsCollection = db.collection('flights');
    const flightQuery = {
      $or: [
        { airline_name: { $regex: new RegExp(providerName, 'i') } },
        { provider_name: { $regex: new RegExp(providerName, 'i') } },
        { provider_id: providerName }
      ]
    };
    const flights = await flightsCollection.find(flightQuery).limit(20).toArray();
    listings.flights = flights.map(f => ({
      listing_id: f.flight_id || f._id?.toString(),
      listing_type: 'Flight',
      name: f.airline_name || 'Flight'
    })).filter(f => f.listing_id);
    console.log(`📊 Found ${listings.flights.length} flights for provider "${providerName}"`);

    // Get cars - match by provider_name
    const carsCollection = db.collection('cars');
    const carQuery = {
      $or: [
        { provider_name: { $regex: new RegExp(providerName, 'i') } },
        { provider_id: providerName }
      ]
    };
    const cars = await carsCollection.find(carQuery).limit(20).toArray();
    listings.cars = cars.map(c => ({
      listing_id: c.car_id || c._id?.toString(),
      listing_type: 'Car',
      name: c.provider_name || 'Car'
    })).filter(c => c.listing_id);
    console.log(`📊 Found ${listings.cars.length} cars for provider "${providerName}"`);

  } catch (error) {
    console.error('❌ Error fetching listings:', error.message);
  }

  return [...listings.hotels, ...listings.flights, ...listings.cars];
}

// Generate user IDs (simulate different users)
function generateUserId(index) {
  const userIds = [
    'user001', 'user002', 'user003', 'user004', 'user005',
    'user006', 'user007', 'user008', 'user009', 'user010',
    'user011', 'user012', 'user013', 'user014', 'user015'
  ];
  return userIds[index % userIds.length];
}

// Generate click logs for listings
async function generateClickLogs(listings) {
  if (listings.length === 0) {
    console.log('⚠️  No listings found. Cannot generate click logs.');
    return;
  }

  const clickLogs = [];
  const now = new Date();
  
  console.log(`\n🔄 Generating ${NUM_CLICKS_PER_LISTING} clicks per listing...`);

  for (const listing of listings) {
    // Generate multiple clicks for this listing from different users
    for (let i = 0; i < NUM_CLICKS_PER_LISTING; i++) {
      const daysAgo = Math.floor(Math.random() * 30); // Random day in last 30 days
      const hoursAgo = Math.floor(Math.random() * 24); // Random hour
      const minutesAgo = Math.floor(Math.random() * 60); // Random minute
      
      const timestamp = new Date(now);
      timestamp.setDate(timestamp.getDate() - daysAgo);
      timestamp.setHours(timestamp.getHours() - hoursAgo);
      timestamp.setMinutes(timestamp.getMinutes() - minutesAgo);

      clickLogs.push({
        user_id: generateUserId(i),
        listing_type: listing.listing_type,
        listing_id: listing.listing_id,
        timestamp: timestamp
      });
    }
  }

  console.log(`✅ Generated ${clickLogs.length} click logs`);

  // Insert into database in batches
  console.log(`\n💾 Inserting click logs into database...`);
  
  try {
    // Delete existing logs for these listings (optional - comment out if you want to keep existing)
    const listingIds = listings.map(l => l.listing_id);
    const deleteResult = await ListingClickLog.deleteMany({
      listing_id: { $in: listingIds }
    });
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} existing click logs for these listings`);

    // Insert new logs in batches of 100
    const batchSize = 100;
    let inserted = 0;
    
    for (let i = 0; i < clickLogs.length; i += batchSize) {
      const batch = clickLogs.slice(i, i + batchSize);
      await ListingClickLog.insertMany(batch, { ordered: false });
      inserted += batch.length;
      process.stdout.write(`\r   Inserted ${inserted}/${clickLogs.length} click logs...`);
    }
    
    console.log(`\n✅ Successfully inserted ${inserted} click logs!`);
    
  } catch (error) {
    console.error('\n❌ Error inserting click logs:', error.message);
    throw error;
  }
}

// Main function
async function main() {
  console.log('🚀 Starting Listing Click Log Seeding...\n');
  console.log(`📋 Configuration:`);
  console.log(`   Provider: ${PROVIDER_NAME}`);
  console.log(`   Clicks per listing: ${NUM_CLICKS_PER_LISTING}\n`);

  try {
    await connectDB();
    
    // Get listings for the provider
    const listings = await getProviderListings(PROVIDER_NAME);
    
    if (listings.length === 0) {
      console.log(`\n⚠️  No listings found for provider "${PROVIDER_NAME}"`);
      console.log(`\n💡 Tips:`);
      console.log(`   - Check if the provider name matches existing listings`);
      console.log(`   - Try a different provider name: PROVIDER_NAME="Marriott" node seedListingClicks.js`);
      console.log(`   - Or check your MongoDB collections to see available providers`);
    } else {
      // Generate and insert click logs
      await generateClickLogs(listings);
      
      console.log(`\n🎉 Done! The Property/Listing Clicks graph should now show data.`);
      console.log(`\n📊 Summary:`);
      console.log(`   - Provider: ${PROVIDER_NAME}`);
      console.log(`   - Listings: ${listings.length}`);
      console.log(`   - Total clicks: ${listings.length * NUM_CLICKS_PER_LISTING}`);
      console.log(`\n💡 Refresh your Provider Analytics dashboard to see the graph!`);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main };

