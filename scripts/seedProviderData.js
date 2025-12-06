/**
 * Script to seed provider analytics data
 * Creates providers, links listings, creates bookings/billings, and generates click/review data
 * 
 * Usage: node scripts/seedProviderData.js
 */

const mongoose = require('mongoose');
const mysql = require('mysql2/promise');
require('dotenv').config();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://alishakartik_db_user:LSnNV7VtlqoeKZdT@cluster-236.njc5716.mongodb.net/kayak?appName=Cluster-236';

// MySQL connection
const mysqlPool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'Anvitha@2310',
  database: process.env.MYSQL_DATABASE || 'kayak_db'
});

// Models
const Provider = mongoose.model('Provider', new mongoose.Schema({}, { strict: false, collection: 'providers' }));
const Flight = mongoose.model('Flight', new mongoose.Schema({}, { strict: false, collection: 'flights' }));
const Hotel = mongoose.model('Hotel', new mongoose.Schema({}, { strict: false, collection: 'hotels' }));
const Car = mongoose.model('Car', new mongoose.Schema({}, { strict: false, collection: 'cars' }));
const PageClickLog = mongoose.model('PageClickLog', new mongoose.Schema({}, { strict: false, collection: 'page_click_logs' }));
const ListingClickLog = mongoose.model('ListingClickLog', new mongoose.Schema({}, { strict: false, collection: 'listing_click_logs' }));
const Review = mongoose.model('Review', new mongoose.Schema({}, { strict: false, collection: 'reviews' }));

async function seedData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Test MySQL connection
    const [mysqlRows] = await mysqlPool.execute('SELECT 1');
    console.log('Connected to MySQL');

    // 1. Create Providers
    console.log('\n=== Creating Providers ===');
    const providers = [
      { provider_id: 'FRONTIER', provider_name: 'Frontier Airlines', provider_type: 'flight' },
      { provider_id: 'DELTA', provider_name: 'Delta Air Lines', provider_type: 'flight' },
      { provider_id: 'HERTZ', provider_name: 'Hertz', provider_type: 'car' },
      { provider_id: 'AVIS', provider_name: 'Avis', provider_type: 'car' },
      { provider_id: 'MARRIOTT', provider_name: 'Marriott Hotels', provider_type: 'hotel' },
      { provider_id: 'HILTON', provider_name: 'Hilton Hotels', provider_type: 'hotel' }
    ];

    for (const providerData of providers) {
      try {
        const existing = await Provider.findOne({ provider_id: providerData.provider_id });
        if (existing) {
          console.log(`Provider ${providerData.provider_id} already exists, skipping...`);
        } else {
          await Provider.create({
            ...providerData,
            created_at: new Date(),
            updated_at: new Date()
          });
          console.log(`✅ Created provider: ${providerData.provider_name} (${providerData.provider_id})`);
        }
      } catch (error) {
        if (error.code === 11000) {
          console.log(`Provider ${providerData.provider_id} already exists (duplicate key), skipping...`);
        } else {
          console.error(`Error creating provider ${providerData.provider_id}:`, error.message);
        }
      }
    }

    // 2. Link existing listings to providers
    console.log('\n=== Linking Listings to Providers ===');
    
    // Link flights
    const frontierFlights = await Flight.find({ airline_name: /frontier/i }).limit(5);
    for (const flight of frontierFlights) {
      await Flight.updateOne({ _id: flight._id }, { $set: { provider_id: 'FRONTIER' } });
    }
    console.log(`✅ Linked ${frontierFlights.length} flights to Frontier Airlines`);

    const deltaFlights = await Flight.find({ airline_name: /delta/i }).limit(5);
    for (const flight of deltaFlights) {
      await Flight.updateOne({ _id: flight._id }, { $set: { provider_id: 'DELTA' } });
    }
    console.log(`✅ Linked ${deltaFlights.length} flights to Delta Air Lines`);

    // Link cars
    const hertzCars = await Car.find({ provider_name: /hertz/i }).limit(5);
    for (const car of hertzCars) {
      await Car.updateOne({ _id: car._id }, { $set: { provider_id: 'HERTZ' } });
    }
    console.log(`✅ Linked ${hertzCars.length} cars to Hertz`);

    const avisCars = await Car.find({ provider_name: /avis/i }).limit(5);
    for (const car of avisCars) {
      await Car.updateOne({ _id: car._id }, { $set: { provider_id: 'AVIS' } });
    }
    console.log(`✅ Linked ${avisCars.length} cars to Avis`);

    // Link hotels (assign to providers)
    const hotels = await Hotel.find({}).limit(10);
    let marriottCount = 0, hiltonCount = 0;
    for (let i = 0; i < hotels.length; i++) {
      const providerId = i % 2 === 0 ? 'MARRIOTT' : 'HILTON';
      await Hotel.updateOne({ _id: hotels[i]._id }, { $set: { provider_id: providerId } });
      if (providerId === 'MARRIOTT') marriottCount++;
      else hiltonCount++;
    }
    console.log(`✅ Linked ${marriottCount} hotels to Marriott, ${hiltonCount} to Hilton`);

    // 3. Get linked listing IDs for creating logs
    const frontierFlightIds = await Flight.find({ provider_id: 'FRONTIER' }).select('flight_id').limit(3).lean();
    const deltaFlightIds = await Flight.find({ provider_id: 'DELTA' }).select('flight_id').limit(3).lean();
    const hertzCarIds = await Car.find({ provider_id: 'HERTZ' }).select('car_id').limit(3).lean();
    const marriottHotelIds = await Hotel.find({ provider_id: 'MARRIOTT' }).select('hotel_id').limit(3).lean();

    // 4. Create Page Click Logs
    console.log('\n=== Creating Page Click Logs ===');
    const pages = ['/flights', '/hotels', '/cars', '/search', '/results'];
    const providersForPages = ['FRONTIER', 'DELTA', 'HERTZ', 'MARRIOTT'];
    
    for (let i = 0; i < 20; i++) {
      const page = pages[Math.floor(Math.random() * pages.length)];
      const providerId = providersForPages[Math.floor(Math.random() * providersForPages.length)];
      
      await PageClickLog.create({
        user_id: `user-${Math.floor(Math.random() * 1000)}`,
        page: page,
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Last 30 days
        session_id: `session-${i}`,
        provider_id: providerId,
        metadata: { source: 'seed-script' }
      });
    }
    console.log('✅ Created 20 page click logs');

    // 5. Create Listing Click Logs
    console.log('\n=== Creating Listing Click Logs ===');
    const allListingIds = [
      ...frontierFlightIds.map(f => ({ id: f.flight_id, type: 'flight', provider: 'FRONTIER' })),
      ...deltaFlightIds.map(f => ({ id: f.flight_id, type: 'flight', provider: 'DELTA' })),
      ...hertzCarIds.map(c => ({ id: c.car_id, type: 'car', provider: 'HERTZ' })),
      ...marriottHotelIds.map(h => ({ id: h.hotel_id, type: 'hotel', provider: 'MARRIOTT' }))
    ];

    for (let i = 0; i < 30; i++) {
      const listing = allListingIds[Math.floor(Math.random() * allListingIds.length)];
      
      await ListingClickLog.create({
        user_id: `user-${Math.floor(Math.random() * 1000)}`,
        listing_id: listing.id,
        listing_type: listing.type,
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        session_id: `session-${i}`,
        provider_id: listing.provider,
        section: ['overview', 'pricing', 'amenities', 'reviews'][Math.floor(Math.random() * 4)],
        metadata: { source: 'seed-script' }
      });
    }
    console.log('✅ Created 30 listing click logs');

    // 6. Create Reviews
    console.log('\n=== Creating Reviews ===');
    for (let i = 0; i < 15; i++) {
      const listing = allListingIds[Math.floor(Math.random() * allListingIds.length)];
      
      await Review.create({
        review_id: `REV${Date.now()}${i}`,
        user_id: `user-${Math.floor(Math.random() * 1000)}`,
        listing_id: listing.id,
        listing_type: listing.type,
        rating: Math.floor(Math.random() * 3) + 3, // 3-5 stars
        comment: `Great ${listing.type}! Highly recommend.`,
        created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        provider_id: listing.provider,
        metadata: { source: 'seed-script' }
      });
    }
    console.log('✅ Created 15 reviews');

    // 7. Create additional bookings and billings for December 2025
    console.log('\n=== Creating Additional Bookings & Billings ===');
    
    // Get some user IDs (create test users if needed)
    const testUserIds = ['296-92-6029', '328-17-9721', '123-45-6789', '987-65-4321'];
    
    // Get listing IDs that are linked to providers
    const linkedFlights = await Flight.find({ provider_id: { $exists: true, $ne: null } }).limit(5).lean();
    const linkedCars = await Car.find({ provider_id: { $exists: true, $ne: null } }).limit(5).lean();
    const linkedHotels = await Hotel.find({ provider_id: { $exists: true, $ne: null } }).limit(5).lean();

    let bookingCount = 0;
    let billingCount = 0;

    // Create bookings and billings for December 2025
    for (let i = 0; i < 10; i++) {
      const user_id = testUserIds[Math.floor(Math.random() * testUserIds.length)];
      let booking_type, reference_id, provider_id, price;

      if (i % 3 === 0 && linkedFlights.length > 0) {
        const flight = linkedFlights[Math.floor(Math.random() * linkedFlights.length)];
        booking_type = 'Flight';
        reference_id = flight.flight_id;
        provider_id = flight.provider_id;
        price = 200 + Math.random() * 300;
      } else if (i % 3 === 1 && linkedCars.length > 0) {
        const car = linkedCars[Math.floor(Math.random() * linkedCars.length)];
        booking_type = 'Car';
        reference_id = car.car_id;
        provider_id = car.provider_id;
        price = 50 + Math.random() * 100;
      } else if (linkedHotels.length > 0) {
        const hotel = linkedHotels[Math.floor(Math.random() * linkedHotels.length)];
        booking_type = 'Hotel';
        reference_id = hotel.hotel_id;
        provider_id = hotel.provider_id;
        price = 100 + Math.random() * 200;
      } else {
        continue;
      }

      // Create booking in MySQL
      const booking_id = `BK${Date.now()}${i}`;
      const startDate = new Date('2025-12-01');
      const endDate = new Date('2025-12-05');
      
      try {
        await mysqlPool.execute(
          `INSERT INTO bookings (booking_id, user_id, booking_type, reference_id, start_date, end_date, booking_status, total_price, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, 'Confirmed', ?, NOW(), NOW())`,
          [booking_id, user_id, booking_type, reference_id, startDate, endDate, price]
        );
        bookingCount++;

        // Create billing in MySQL
        const billing_id = `BILL${Date.now()}${i}`;
        const invoice_number = `INV${Date.now()}${i}`;
        const transactionDate = new Date('2025-12-01');
        transactionDate.setHours(3 + Math.floor(Math.random() * 20), Math.floor(Math.random() * 60));

        await mysqlPool.execute(
          `INSERT INTO billings (billing_id, user_id, booking_type, booking_id, transaction_date, total_amount_paid, payment_method, transaction_status, invoice_number, invoice_details, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, 'Credit Card', 'Success', ?, ?, NOW(), NOW())`,
          [
            billing_id,
            user_id,
            booking_type,
            booking_id,
            transactionDate,
            price,
            invoice_number,
            JSON.stringify({ line_items: [{ description: `${booking_type} Booking`, quantity: 1, unit_price: price, total: price }], subtotal: price, tax: price * 0.08, total: price * 1.08 })
          ]
        );
        billingCount++;
      } catch (error) {
        console.error(`Error creating booking/billing ${i}:`, error.message);
      }
    }

    console.log(`✅ Created ${bookingCount} bookings and ${billingCount} billings for December 2025`);

    // 8. Create User Traces
    console.log('\n=== Creating User Traces ===');
    for (let i = 0; i < 10; i++) {
      const providerId = providersForPages[Math.floor(Math.random() * providersForPages.length)];
      const trace = {
        user_id: `user-${Math.floor(Math.random() * 1000)}`,
        session_id: `session-trace-${i}`,
        provider_id: providerId,
        events: [
          { page: '/flights', timestamp: new Date(Date.now() - 600000), action: 'view' },
          { page: '/search', timestamp: new Date(Date.now() - 300000), action: 'search' },
          { page: '/results', timestamp: new Date(Date.now() - 180000), action: 'view' },
          { page: '/booking', timestamp: new Date(Date.now() - 60000), action: 'click' }
        ],
        created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Last 7 days
      };
      
      await mongoose.connection.db.collection('user_traces').insertOne(trace);
    }
    console.log('✅ Created 10 user traces');

    console.log('\n✅ Data seeding completed!');
    console.log('\nSummary:');
    console.log(`- Providers: ${providers.length}`);
    console.log(`- Listings linked: ${frontierFlights.length + deltaFlights.length + hertzCars.length + avisCars.length + hotels.length}`);
    console.log(`- Page clicks: 20`);
    console.log(`- Listing clicks: 30`);
    console.log(`- Reviews: 15`);
    console.log(`- Bookings: ${bookingCount}`);
    console.log(`- Billings: ${billingCount}`);
    console.log(`- User traces: 10`);

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await mongoose.disconnect();
    await mysqlPool.end();
    console.log('\nDisconnected from databases');
  }
}

// Run the script
seedData();
