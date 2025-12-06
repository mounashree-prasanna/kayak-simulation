/**
 * Script to create Provider records from existing listing data
 * Run this after adding provider_id fields to models
 * 
 * Usage: node scripts/createProviders.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://alishakartik_db_user:LSnNV7VtlqoeKZdT@cluster-236.njc5716.mongodb.net/kayak?appName=Cluster-236';

// Provider Schema
const providerSchema = new mongoose.Schema({
  provider_id: { type: String, required: true, unique: true, trim: true, uppercase: true },
  provider_name: { type: String, required: true, trim: true },
  provider_type: { type: String, required: true, enum: ['flight', 'hotel', 'car'], lowercase: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { collection: 'providers', timestamps: false });

const Provider = mongoose.model('Provider', providerSchema);

// Listing models (dynamic schemas)
const Flight = mongoose.model('Flight', new mongoose.Schema({}, { strict: false, collection: 'flights' }));
const Hotel = mongoose.model('Hotel', new mongoose.Schema({}, { strict: false, collection: 'hotels' }));
const Car = mongoose.model('Car', new mongoose.Schema({}, { strict: false, collection: 'cars' }));

async function createProviders() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const providers = new Map();

    // Extract providers from flights (airlines)
    console.log('Extracting providers from flights...');
    const flights = await Flight.find({}).select('airline_name').lean();
    flights.forEach(flight => {
      if (flight.airline_name) {
        const providerId = flight.airline_name.toUpperCase().replace(/\s+/g, '_').substring(0, 20);
        if (!providers.has(providerId)) {
          providers.set(providerId, {
            provider_id: providerId,
            provider_name: flight.airline_name,
            provider_type: 'flight'
          });
        }
      }
    });
    console.log(`Found ${providers.size} unique flight providers`);

    // Extract providers from cars
    console.log('Extracting providers from cars...');
    const cars = await Car.find({}).select('provider_name').lean();
    const carProviderCount = providers.size;
    cars.forEach(car => {
      if (car.provider_name) {
        const providerId = car.provider_name.toUpperCase().replace(/\s+/g, '_').substring(0, 20);
        if (!providers.has(providerId)) {
          providers.set(providerId, {
            provider_id: providerId,
            provider_name: car.provider_name,
            provider_type: 'car'
          });
        }
      }
    });
    console.log(`Found ${providers.size - carProviderCount} unique car providers`);

    // For hotels, we'll create a generic provider or use hotel chain names
    // For now, create a default hotel provider
    const hotelProviderId = 'HOTEL_CHAIN';
    if (!providers.has(hotelProviderId)) {
      providers.set(hotelProviderId, {
        provider_id: hotelProviderId,
        provider_name: 'Hotel Chain',
        provider_type: 'hotel'
      });
    }

    // Create providers in database
    console.log(`\nCreating ${providers.size} providers in database...`);
    let created = 0;
    let skipped = 0;

    for (const [providerId, providerData] of providers) {
      try {
        const existing = await Provider.findOne({ provider_id: providerId });
        if (existing) {
          console.log(`Provider ${providerId} already exists, skipping...`);
          skipped++;
        } else {
          await Provider.create(providerData);
          console.log(`Created provider: ${providerData.provider_name} (${providerId})`);
          created++;
        }
      } catch (error) {
        if (error.code === 11000) {
          console.log(`Provider ${providerId} already exists (duplicate key), skipping...`);
          skipped++;
        } else {
          console.error(`Error creating provider ${providerId}:`, error.message);
        }
      }
    }

    console.log(`\n✅ Created ${created} providers, skipped ${skipped} existing providers`);

    // Now link listings to providers
    console.log('\nLinking listings to providers...');

    // Link flights
    console.log('Linking flights to providers...');
    let flightsUpdated = 0;
    for (const [providerId, providerData] of providers) {
      if (providerData.provider_type === 'flight') {
        const result = await Flight.updateMany(
          { airline_name: providerData.provider_name, provider_id: { $exists: false } },
          { $set: { provider_id: providerId } }
        );
        flightsUpdated += result.modifiedCount;
      }
    }
    console.log(`Updated ${flightsUpdated} flights with provider_id`);

    // Link cars
    console.log('Linking cars to providers...');
    let carsUpdated = 0;
    for (const [providerId, providerData] of providers) {
      if (providerData.provider_type === 'car') {
        const result = await Car.updateMany(
          { provider_name: providerData.provider_name, provider_id: { $exists: false } },
          { $set: { provider_id: providerId } }
        );
        carsUpdated += result.modifiedCount;
      }
    }
    console.log(`Updated ${carsUpdated} cars with provider_id`);

    // Link hotels (assign to default hotel provider for now)
    console.log('Linking hotels to providers...');
    const hotelResult = await Hotel.updateMany(
      { provider_id: { $exists: false } },
      { $set: { provider_id: hotelProviderId } }
    );
    console.log(`Updated ${hotelResult.modifiedCount} hotels with provider_id`);

    console.log('\n✅ Provider creation and linking completed!');
    console.log(`\nSummary:`);
    console.log(`- Providers created: ${created}`);
    console.log(`- Flights linked: ${flightsUpdated}`);
    console.log(`- Cars linked: ${carsUpdated}`);
    console.log(`- Hotels linked: ${hotelResult.modifiedCount}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the script
createProviders();
