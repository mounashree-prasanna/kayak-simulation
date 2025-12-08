const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://alishakartik_db_user:LSnNV7VtlqoeKZdT@cluster-236.njc5716.mongodb.net/kayak?appName=Cluster-236';

async function getTestData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get a user
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));
    const user = await User.findOne({}).limit(1);
    console.log('\n=== USER ===');
    if (user) {
      console.log('User ID:', user.user_id);
      console.log('Email:', user.email);
    } else {
      console.log('No users found');
    }

    // Get a flight
    const Flight = mongoose.model('Flight', new mongoose.Schema({}, { strict: false, collection: 'flights' }));
    const flight = await Flight.findOne({ total_available_seats: { $gt: 0 } }).limit(1);
    console.log('\n=== FLIGHT ===');
    if (flight) {
      console.log('Flight ID:', flight.flight_id);
      console.log('Departure:', flight.departure_airport, '->', flight.arrival_airport);
      console.log('Price:', flight.ticket_price);
    } else {
      console.log('No flights found');
    }

    // Get a hotel
    const Hotel = mongoose.model('Hotel', new mongoose.Schema({}, { strict: false, collection: 'hotels' }));
    const hotel = await Hotel.findOne({}).limit(1);
    console.log('\n=== HOTEL ===');
    if (hotel) {
      console.log('Hotel ID:', hotel.hotel_id);
      console.log('City:', hotel.address?.city);
      console.log('Price:', hotel.price_per_night);
    } else {
      console.log('No hotels found');
    }

    // Get a car
    const Car = mongoose.model('Car', new mongoose.Schema({}, { strict: false, collection: 'cars' }));
    const car = await Car.findOne({ availability_status: 'Available' }).limit(1);
    console.log('\n=== CAR ===');
    if (car) {
      console.log('Car ID:', car.car_id);
      console.log('City:', car.pickup_city);
      console.log('Price:', car.price_per_day);
    } else {
      console.log('No cars found');
    }

    // Output JSON for easy parsing
    console.log('\n=== JSON OUTPUT ===');
    console.log(JSON.stringify({
      user_id: user?.user_id || '376-11-8477',
      flight_id: flight?.flight_id || 'SP0001',
      hotel_id: hotel?.hotel_id || 'HOTEL000001',
      car_id: car?.car_id || 'CAR000001'
    }, null, 2));

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

getTestData();

