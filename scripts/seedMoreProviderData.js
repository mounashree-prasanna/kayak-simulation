/**
 * Script to seed MORE provider analytics data with proper dates and provider linking
 * This ensures providers show up in the analytics
 * 
 * Usage: node scripts/seedMoreProviderData.js
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
const Flight = mongoose.model('Flight', new mongoose.Schema({}, { strict: false, collection: 'flights' }));
const Hotel = mongoose.model('Hotel', new mongoose.Schema({}, { strict: false, collection: 'hotels' }));
const Car = mongoose.model('Car', new mongoose.Schema({}, { strict: false, collection: 'cars' }));

async function seedMoreData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Test MySQL connection
    const [mysqlRows] = await mysqlPool.execute('SELECT 1');
    console.log('Connected to MySQL');

    // Get listings with provider_id
    console.log('\n=== Finding Listings with Provider IDs ===');
    const frontierFlights = await Flight.find({ provider_id: 'FRONTIER' }).limit(3).lean();
    const deltaFlights = await Flight.find({ provider_id: 'DELTA' }).limit(3).lean();
    const hertzCars = await Car.find({ provider_id: 'HERTZ' }).limit(3).lean();
    const avisCars = await Car.find({ provider_id: 'AVIS' }).limit(3).lean();
    const marriottHotels = await Hotel.find({ provider_id: 'MARRIOTT' }).limit(3).lean();
    const hiltonHotels = await Hotel.find({ provider_id: 'HILTON' }).limit(3).lean();

    console.log(`Found: ${frontierFlights.length} Frontier flights, ${deltaFlights.length} Delta flights`);
    console.log(`Found: ${hertzCars.length} Hertz cars, ${avisCars.length} Avis cars`);
    console.log(`Found: ${marriottHotels.length} Marriott hotels, ${hiltonHotels.length} Hilton hotels`);

    // Get test user IDs
    const testUserIds = ['296-92-6029', '328-17-9721', '123-45-6789', '987-65-4321'];

    // Create bookings and billings for December 2025 with proper provider linking
    console.log('\n=== Creating Bookings & Billings for December 2025 ===');
    
    let bookingCount = 0;
    let billingCount = 0;

    // Create bookings for each provider
    const bookings = [
      // Frontier Airlines flights
      ...frontierFlights.map(f => ({ type: 'Flight', id: f.flight_id, provider: 'FRONTIER', price: 250 + Math.random() * 150 })),
      // Delta Airlines flights
      ...deltaFlights.map(f => ({ type: 'Flight', id: f.flight_id, provider: 'DELTA', price: 300 + Math.random() * 200 })),
      // Hertz cars
      ...hertzCars.map(c => ({ type: 'Car', id: c.car_id, provider: 'HERTZ', price: 60 + Math.random() * 80 })),
      // Avis cars
      ...avisCars.map(c => ({ type: 'Car', id: c.car_id, provider: 'AVIS', price: 70 + Math.random() * 90 })),
      // Marriott hotels
      ...marriottHotels.map(h => ({ type: 'Hotel', id: h.hotel_id, provider: 'MARRIOTT', price: 120 + Math.random() * 100 })),
      // Hilton hotels
      ...hiltonHotels.map(h => ({ type: 'Hotel', id: h.hotel_id, provider: 'HILTON', price: 130 + Math.random() * 110 }))
    ];

    // Create bookings and billings for December 2025
    for (let i = 0; i < bookings.length; i++) {
      const booking = bookings[i];
      const user_id = testUserIds[Math.floor(Math.random() * testUserIds.length)];
      
      const booking_id = `BK${Date.now()}${i}${Math.random().toString(36).substr(2, 5)}`;
      const startDate = new Date('2025-12-01');
      startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 20)); // Random day in December
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 5) + 1);

      try {
        // Create booking
        await mysqlPool.execute(
          `INSERT INTO bookings (booking_id, user_id, booking_type, reference_id, start_date, end_date, booking_status, total_price, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, 'Confirmed', ?, NOW(), NOW())`,
          [booking_id, user_id, booking.type, booking.id, startDate, endDate, booking.price]
        );
        bookingCount++;

        // Create billing with transaction_date in December 2025
        const billing_id = `BILL${Date.now()}${i}${Math.random().toString(36).substr(2, 5)}`;
        const invoice_number = `INV${Date.now()}${i}`;
        const transactionDate = new Date('2025-12-01');
        transactionDate.setDate(transactionDate.getDate() + Math.floor(Math.random() * 20));
        transactionDate.setHours(10 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));

        await mysqlPool.execute(
          `INSERT INTO billings (billing_id, user_id, booking_type, booking_id, transaction_date, total_amount_paid, payment_method, transaction_status, invoice_number, invoice_details, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, 'Credit Card', 'Success', ?, ?, NOW(), NOW())`,
          [
            billing_id,
            user_id,
            booking.type,
            booking_id,
            transactionDate,
            booking.price,
            invoice_number,
            JSON.stringify({ 
              line_items: [{ 
                description: `${booking.type} Booking`, 
                quantity: 1, 
                unit_price: booking.price, 
                total: booking.price 
              }], 
              subtotal: booking.price, 
              tax: booking.price * 0.08, 
              total: booking.price * 1.08 
            })
          ]
        );
        billingCount++;

        console.log(`✅ Created ${booking.type} booking for ${booking.provider}: ${booking.id} - $${booking.price.toFixed(2)}`);
      } catch (error) {
        console.error(`Error creating booking/billing ${i}:`, error.message);
      }
    }

    console.log(`\n✅ Created ${bookingCount} bookings and ${billingCount} billings for December 2025`);
    console.log(`\nProviders with bookings:`);
    const providerCounts = {};
    bookings.forEach(b => {
      providerCounts[b.provider] = (providerCounts[b.provider] || 0) + 1;
    });
    Object.entries(providerCounts).forEach(([provider, count]) => {
      console.log(`  - ${provider}: ${count} bookings`);
    });

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await mongoose.disconnect();
    await mysqlPool.end();
    console.log('\nDisconnected from databases');
  }
}

// Run the script
seedMoreData();
