const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config();

// Import models
const Flight = require('./src/models/Flight');
const Hotel = require('./src/models/Hotel');
const Car = require('./src/models/Car');

// Connect to database
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://alishakartik_db_user:LSnNV7VtlqoeKZdT@cluster-236.njc5716.mongodb.net/kayak?appName=Cluster-236';

// Data pools for random generation
const AIRLINES = ['American Airlines', 'Delta Airlines', 'United Airlines', 'Southwest Airlines', 'JetBlue', 'Alaska Airlines', 'Spirit Airlines', 'Frontier Airlines'];
const FLIGHT_CLASSES = ['Economy', 'Business', 'First'];
const AIRPORTS = [
  { code: 'JFK', city: 'New York', state: 'NY' },
  { code: 'LAX', city: 'Los Angeles', state: 'CA' },
  { code: 'SFO', city: 'San Francisco', state: 'CA' },
  { code: 'DEN', city: 'Denver', state: 'CO' },
  { code: 'SEA', city: 'Seattle', state: 'WA' },
  { code: 'BOS', city: 'Boston', state: 'MA' },
  { code: 'MIA', city: 'Miami', state: 'FL' },
  { code: 'ORD', city: 'Chicago', state: 'IL' },
  { code: 'DFW', city: 'Dallas', state: 'TX' },
  { code: 'ATL', city: 'Atlanta', state: 'GA' },
  { code: 'LAS', city: 'Las Vegas', state: 'NV' },
  { code: 'PHX', city: 'Phoenix', state: 'AZ' },
  { code: 'IAH', city: 'Houston', state: 'TX' },
  { code: 'MSP', city: 'Minneapolis', state: 'MN' },
  { code: 'DTW', city: 'Detroit', state: 'MI' }
];

const HOTEL_NAMES = ['Grand', 'Plaza', 'Resort', 'Inn', 'Lodge', 'Hotel', 'Suites', 'Tower', 'Palace', 'Garden', 'Park', 'Beach', 'Mountain', 'Valley', 'Riverside'];
const HOTEL_TYPES = ['Hotel', 'Resort', 'Inn', 'Lodge', 'Suites', 'Tower'];
const ROOM_TYPES = ['Standard', 'Deluxe', 'Suite', 'Ocean View', 'City View', 'Executive', 'Presidential'];
const CAR_PROVIDERS = ['Hertz', 'Enterprise', 'Avis', 'Budget', 'National', 'Alamo', 'Thrifty', 'Dollar'];
const CAR_TYPES = ['Sedan', 'SUV', 'Compact', 'Luxury', 'Convertible', 'Minivan', 'Truck', 'Coupe'];
const CAR_MODELS = {
  'Sedan': ['Toyota Camry', 'Honda Accord', 'Nissan Altima', 'Chevrolet Malibu', 'Ford Fusion'],
  'SUV': ['Ford Explorer', 'Jeep Grand Cherokee', 'Toyota Highlander', 'Honda CR-V', 'Chevrolet Tahoe'],
  'Compact': ['Honda Civic', 'Toyota Corolla', 'Nissan Sentra', 'Hyundai Elantra', 'Mazda3'],
  'Luxury': ['BMW 5 Series', 'Mercedes-Benz E-Class', 'Audi A6', 'Lexus ES', 'Cadillac CTS'],
  'Convertible': ['Ford Mustang', 'Chevrolet Camaro', 'BMW 4 Series', 'Mercedes-Benz SLK', 'Audi A5'],
  'Minivan': ['Chrysler Pacifica', 'Honda Odyssey', 'Toyota Sienna', 'Kia Sedona', 'Dodge Grand Caravan'],
  'Truck': ['Ford F-150', 'Chevrolet Silverado', 'Ram 1500', 'Toyota Tundra', 'GMC Sierra'],
  'Coupe': ['Ford Mustang', 'Chevrolet Camaro', 'Dodge Challenger', 'BMW 2 Series', 'Audi TT']
};

// Helper functions
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));
const randomElement = (array) => array[Math.floor(Math.random() * array.length)];
const randomBoolean = () => Math.random() > 0.5;

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const createDateTime = (date, hours, minutes = 0) => {
  const dt = new Date(date);
  dt.setHours(hours, minutes, 0, 0);
  return dt;
};

// Generate random flight duration based on route
const getFlightDuration = (origin, destination) => {
  // Estimate flight times (in minutes)
  const shortFlights = 60; // 1 hour
  const mediumFlights = 180; // 3 hours
  const longFlights = 360; // 6 hours
  const crossCountry = 300; // 5 hours
  
  // Simple logic: if same region, shorter flight
  const westCoast = ['LAX', 'SFO', 'SEA'];
  const eastCoast = ['JFK', 'BOS', 'MIA'];
  const central = ['DEN', 'ORD', 'DFW', 'ATL'];
  
  if ((westCoast.includes(origin) && westCoast.includes(destination)) ||
      (eastCoast.includes(origin) && eastCoast.includes(destination))) {
    return randomInt(shortFlights, mediumFlights);
  } else if ((westCoast.includes(origin) && eastCoast.includes(destination)) ||
             (eastCoast.includes(origin) && westCoast.includes(destination))) {
    return randomInt(crossCountry, crossCountry + 60);
  } else {
    return randomInt(mediumFlights, longFlights);
  }
};

// Generate flight price based on class and duration
const getFlightPrice = (flightClass, duration) => {
  const basePrice = duration * 0.8; // Base price per minute
  const classMultiplier = {
    'Economy': 1,
    'Business': 2.5,
    'First': 4
  };
  return Math.round(basePrice * classMultiplier[flightClass] + randomInt(-50, 200));
};

// Seed Flights - Generate 4,000 flights
const seedFlights = async () => {
  try {
    console.log('🌱 Seeding flights...');
    await Flight.deleteMany();
    
    const flights = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 4000; i++) {
      // Get random origin and destination (different)
      let origin, destination;
      do {
        origin = randomElement(AIRPORTS);
        destination = randomElement(AIRPORTS);
      } while (origin.code === destination.code);
      
      // Random date in next 90 days
      const daysFromNow = randomInt(1, 90);
      const flightDate = addDays(today, daysFromNow);
      
      // Random departure time (6 AM to 10 PM)
      const departureHour = randomInt(6, 22);
      const departureMin = randomInt(0, 59);
      const departureTime = createDateTime(flightDate, departureHour, departureMin);
      
      // Calculate duration and arrival
      const duration = getFlightDuration(origin.code, destination.code);
      const arrivalTime = new Date(departureTime.getTime() + duration * 60000);
      
      // Random flight class
      const flightClass = randomElement(FLIGHT_CLASSES);
      
      // Generate unique flight ID
      const airlineCode = randomElement(AIRLINES).substring(0, 2).toUpperCase();
      const flightNumber = String(i + 1).padStart(4, '0');
      const flightId = `${airlineCode}${flightNumber}`;
      
      flights.push({
        flight_id: flightId,
        airline_name: randomElement(AIRLINES),
        departure_airport: origin.code,
        departure_city: origin.city,
        arrival_airport: destination.code,
        arrival_city: destination.city,
        departure_datetime: departureTime,
        arrival_datetime: arrivalTime,
        duration_minutes: duration,
        flight_class: flightClass,
        ticket_price: getFlightPrice(flightClass, duration),
        total_available_seats: randomInt(20, 200),
        rating: randomFloat(3.5, 5.0)
      });
    }
    
    // Insert in batches of 500 for better performance
    const batchSize = 500;
    for (let i = 0; i < flights.length; i += batchSize) {
      const batch = flights.slice(i, i + batchSize);
      await Flight.insertMany(batch);
      console.log(`  ✓ Inserted ${Math.min(i + batchSize, flights.length)} / ${flights.length} flights`);
    }
    
    console.log(`✅ ${flights.length} flights seeded successfully\n`);
  } catch (error) {
    console.error('❌ Error seeding flights:', error);
    throw error;
  }
};

// Seed Hotels - Generate 3,500 hotels
const seedHotels = async () => {
  try {
    console.log('🌱 Seeding hotels...');
    await Hotel.deleteMany();
    
    const hotels = [];
    const cities = [...new Set(AIRPORTS.map(a => a.city))];
    const states = {
      'New York': 'NY', 'Los Angeles': 'CA', 'San Francisco': 'CA', 'Denver': 'CO',
      'Seattle': 'WA', 'Boston': 'MA', 'Miami': 'FL', 'Chicago': 'IL', 'Dallas': 'TX',
      'Atlanta': 'GA', 'Las Vegas': 'NV', 'Phoenix': 'AZ', 'Houston': 'TX',
      'Minneapolis': 'MN', 'Detroit': 'MI'
    };
    
    for (let i = 0; i < 3500; i++) {
      const city = randomElement(cities);
      const state = states[city] || 'CA';
      const zip = randomInt(10000, 99999).toString();
      
      const hotelName = `${randomElement(HOTEL_NAMES)} ${randomElement(HOTEL_NAMES)} ${randomElement(HOTEL_TYPES)}`;
      const starRating = randomInt(2, 5);
      const roomType = randomElement(ROOM_TYPES);
      
      // Price based on star rating and city
      const basePrice = starRating * 50;
      const cityMultiplier = ['New York', 'San Francisco', 'Los Angeles'].includes(city) ? 1.5 : 1;
      const pricePerNight = Math.round(basePrice * cityMultiplier + randomInt(-20, 100));
      
      hotels.push({
        hotel_id: `HOTEL${String(i + 1).padStart(6, '0')}`,
        name: hotelName,
        address: {
          street: `${randomInt(100, 9999)} ${randomElement(['Main St', 'Broadway', 'Park Ave', 'Oak St', 'Elm St', 'First Ave', 'Second St'])}`,
          city: city,
          state: state,
          zip: zip
        },
        star_rating: starRating,
        number_of_rooms: randomInt(20, 300),
        default_room_type: roomType,
        price_per_night: pricePerNight,
        amenities: {
          wifi: randomBoolean(),
          breakfast_included: randomBoolean(),
          parking: randomBoolean(),
          pet_friendly: randomBoolean(),
          near_transit: randomBoolean(),
          pool: starRating >= 3 ? randomBoolean() : false,
          gym: starRating >= 3 ? randomBoolean() : false
        },
        hotel_rating: randomFloat(3.0, 5.0)
      });
    }
    
    // Insert in batches
    const batchSize = 500;
    for (let i = 0; i < hotels.length; i += batchSize) {
      const batch = hotels.slice(i, i + batchSize);
      await Hotel.insertMany(batch);
      console.log(`  ✓ Inserted ${Math.min(i + batchSize, hotels.length)} / ${hotels.length} hotels`);
    }
    
    console.log(`✅ ${hotels.length} hotels seeded successfully\n`);
  } catch (error) {
    console.error('❌ Error seeding hotels:', error);
    throw error;
  }
};

// Seed Cars - Generate 2,500 cars
const seedCars = async () => {
  try {
    console.log('🌱 Seeding cars...');
    await Car.deleteMany();
    
    const cars = [];
    const cities = [...new Set(AIRPORTS.map(a => a.city))];
    
    for (let i = 0; i < 2500; i++) {
      const carType = randomElement(CAR_TYPES);
      const models = CAR_MODELS[carType] || CAR_MODELS['Sedan'];
      const model = randomElement(models);
      const city = randomElement(cities);
      
      // Price based on car type
      const priceRanges = {
        'Compact': [25, 45],
        'Sedan': [35, 60],
        'SUV': [55, 95],
        'Luxury': [100, 200],
        'Convertible': [75, 150],
        'Minivan': [60, 100],
        'Truck': [70, 120],
        'Coupe': [65, 130]
      };
      const [minPrice, maxPrice] = priceRanges[carType] || [40, 80];
      
      // Seats based on type
      const seatsMap = {
        'Compact': [4, 5],
        'Sedan': [5, 5],
        'SUV': [5, 8],
        'Luxury': [4, 5],
        'Convertible': [2, 4],
        'Minivan': [7, 8],
        'Truck': [2, 5],
        'Coupe': [2, 4]
      };
      const [minSeats, maxSeats] = seatsMap[carType] || [4, 5];
      
      cars.push({
        car_id: `CAR${String(i + 1).padStart(6, '0')}`,
        car_type: carType,
        provider_name: randomElement(CAR_PROVIDERS),
        model: model,
        year: randomInt(2020, 2024),
        transmission_type: randomElement(['Automatic', 'Manual']),
        number_of_seats: randomInt(minSeats, maxSeats),
        daily_rental_price: randomInt(minPrice, maxPrice),
        car_rating: randomFloat(3.5, 5.0),
        availability_status: randomElement(['Available', 'Available', 'Available', 'Booked', 'Available']), // 80% available
        pickup_city: city
      });
    }
    
    // Insert in batches
    const batchSize = 500;
    for (let i = 0; i < cars.length; i += batchSize) {
      const batch = cars.slice(i, i + batchSize);
      await Car.insertMany(batch);
      console.log(`  ✓ Inserted ${Math.min(i + batchSize, cars.length)} / ${cars.length} cars`);
    }
    
    console.log(`✅ ${cars.length} cars seeded successfully\n`);
  } catch (error) {
    console.error('❌ Error seeding cars:', error);
    throw error;
  }
};

// Main seeding function
const seedAll = async () => {
  try {
    console.log('🌱 Starting bulk data seeding (10,000 records)...\n');
    
    await mongoose.connect(MONGODB_URI);
    console.log(`✅ Connected to MongoDB\n`);

    await seedFlights();
    await seedHotels();
    await seedCars();
    
    const totalRecords = 4000 + 3500 + 2500;
    console.log(`\n✅ All data seeded successfully!`);
    console.log(`📊 Total records created: ${totalRecords}`);
    console.log(`   - Flights: 4,000`);
    console.log(`   - Hotels: 3,500`);
    console.log(`   - Cars: 2,500`);
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run seeder
seedAll();

