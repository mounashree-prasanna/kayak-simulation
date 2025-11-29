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

const seedFlights = async () => {
  try {
    await Flight.deleteMany();
    
    // Get today's date and create dates for the next 30 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Helper function to add days to a date
    const addDays = (date, days) => {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result;
    };
    
    // Helper function to create datetime
    const createDateTime = (date, hours, minutes = 0) => {
      const dt = new Date(date);
      dt.setHours(hours, minutes, 0, 0);
      return dt;
    };
    
    // Airport to city mapping
    const airportToCity = {
      'JFK': 'New York',
      'LAX': 'Los Angeles',
      'SFO': 'San Francisco',
      'NYC': 'New York',
      'DEN': 'Denver',
      'SEA': 'Seattle',
      'BOS': 'Boston',
      'MIA': 'Miami'
    };

    const flights = [
      {
        flight_id: 'AA100',
        airline_name: 'American Airlines',
        departure_airport: 'JFK',
        departure_city: 'New York',
        arrival_airport: 'LAX',
        arrival_city: 'Los Angeles',
        departure_datetime: createDateTime(addDays(today, 1), 8),
        arrival_datetime: createDateTime(addDays(today, 1), 11, 30),
        duration_minutes: 330,
        flight_class: 'Economy',
        ticket_price: 350,
        total_available_seats: 50,
        rating: 4.5
      },
      {
        flight_id: 'AA101',
        airline_name: 'American Airlines',
        departure_airport: 'JFK',
        departure_city: 'New York',
        arrival_airport: 'LAX',
        arrival_city: 'Los Angeles',
        departure_datetime: createDateTime(addDays(today, 1), 14),
        arrival_datetime: createDateTime(addDays(today, 1), 17, 30),
        duration_minutes: 330,
        flight_class: 'Business',
        ticket_price: 1200,
        total_available_seats: 10,
        rating: 4.8
      },
      {
        flight_id: 'DL200',
        airline_name: 'Delta Airlines',
        departure_airport: 'LAX',
        departure_city: 'Los Angeles',
        arrival_airport: 'JFK',
        arrival_city: 'New York',
        departure_datetime: createDateTime(addDays(today, 2), 9),
        arrival_datetime: createDateTime(addDays(today, 2), 17, 30),
        duration_minutes: 510,
        flight_class: 'Economy',
        ticket_price: 380,
        total_available_seats: 45,
        rating: 4.6
      },
      {
        flight_id: 'UA300',
        airline_name: 'United Airlines',
        departure_airport: 'SFO',
        departure_city: 'San Francisco',
        arrival_airport: 'NYC',
        arrival_city: 'New York',
        departure_datetime: createDateTime(addDays(today, 3), 6),
        arrival_datetime: createDateTime(addDays(today, 3), 14, 30),
        duration_minutes: 510,
        flight_class: 'Economy',
        ticket_price: 420,
        total_available_seats: 60,
        rating: 4.4
      },
      {
        flight_id: 'SW400',
        airline_name: 'Southwest Airlines',
        departure_airport: 'DEN',
        departure_city: 'Denver',
        arrival_airport: 'SEA',
        arrival_city: 'Seattle',
        departure_datetime: createDateTime(addDays(today, 4), 10),
        arrival_datetime: createDateTime(addDays(today, 4), 12, 15),
        duration_minutes: 135,
        flight_class: 'Economy',
        ticket_price: 250,
        total_available_seats: 75,
        rating: 4.3
      },
      {
        flight_id: 'JB500',
        airline_name: 'JetBlue',
        departure_airport: 'BOS',
        departure_city: 'Boston',
        arrival_airport: 'MIA',
        arrival_city: 'Miami',
        departure_datetime: createDateTime(addDays(today, 5), 7, 30),
        arrival_datetime: createDateTime(addDays(today, 5), 10, 45),
        duration_minutes: 195,
        flight_class: 'Economy',
        ticket_price: 280,
        total_available_seats: 55,
        rating: 4.5
      },
      // Add more flights for different dates
      {
        flight_id: 'AA102',
        airline_name: 'American Airlines',
        departure_airport: 'JFK',
        departure_city: 'New York',
        arrival_airport: 'LAX',
        arrival_city: 'Los Angeles',
        departure_datetime: createDateTime(addDays(today, 7), 8),
        arrival_datetime: createDateTime(addDays(today, 7), 11, 30),
        duration_minutes: 330,
        flight_class: 'Economy',
        ticket_price: 360,
        total_available_seats: 48,
        rating: 4.5
      },
      {
        flight_id: 'DL201',
        airline_name: 'Delta Airlines',
        departure_airport: 'LAX',
        departure_city: 'Los Angeles',
        arrival_airport: 'JFK',
        arrival_city: 'New York',
        departure_datetime: createDateTime(addDays(today, 10), 9),
        arrival_datetime: createDateTime(addDays(today, 10), 17, 30),
        duration_minutes: 510,
        flight_class: 'Economy',
        ticket_price: 385,
        total_available_seats: 42,
        rating: 4.6
      },
      {
        flight_id: 'UA301',
        airline_name: 'United Airlines',
        departure_airport: 'SFO',
        departure_city: 'San Francisco',
        arrival_airport: 'NYC',
        arrival_city: 'New York',
        departure_datetime: createDateTime(addDays(today, 14), 6),
        arrival_datetime: createDateTime(addDays(today, 14), 14, 30),
        duration_minutes: 510,
        flight_class: 'Economy',
        ticket_price: 410,
        total_available_seats: 58,
        rating: 4.4
      },
      {
        flight_id: 'SW401',
        airline_name: 'Southwest Airlines',
        departure_airport: 'DEN',
        departure_city: 'Denver',
        arrival_airport: 'SEA',
        arrival_city: 'Seattle',
        departure_datetime: createDateTime(addDays(today, 20), 10),
        arrival_datetime: createDateTime(addDays(today, 20), 12, 15),
        duration_minutes: 135,
        flight_class: 'Economy',
        ticket_price: 255,
        total_available_seats: 72,
        rating: 4.3
      }
    ];

    await Flight.insertMany(flights);
    console.log(`✅ ${flights.length} flights seeded successfully`);
  } catch (error) {
    console.error('❌ Error seeding flights:', error);
    throw error;
  }
};

const seedHotels = async () => {
  try {
    await Hotel.deleteMany();
    
    const hotels = [
      {
        hotel_id: 'HOTEL001',
        name: 'Grand Plaza Hotel',
        address: {
          street: '123 Broadway',
          city: 'New York',
          state: 'NY',
          zip: '10001'
        },
        star_rating: 5,
        number_of_rooms: 150,
        default_room_type: 'Deluxe',
        price_per_night: 250,
        amenities: {
          wifi: true,
          breakfast_included: true,
          parking: true,
          pet_friendly: false,
          near_transit: true,
          pool: true,
          gym: true
        },
        hotel_rating: 4.5
      },
      {
        hotel_id: 'HOTEL002',
        name: 'Sunset Beach Resort',
        address: {
          street: '456 Ocean Drive',
          city: 'Los Angeles',
          state: 'CA',
          zip: '90210'
        },
        star_rating: 4,
        number_of_rooms: 100,
        default_room_type: 'Ocean View',
        price_per_night: 180,
        amenities: {
          wifi: true,
          breakfast_included: false,
          parking: true,
          pet_friendly: true,
          near_transit: false,
          pool: true,
          gym: true
        },
        hotel_rating: 4.2
      },
      {
        hotel_id: 'HOTEL003',
        name: 'Downtown Business Hotel',
        address: {
          street: '789 Market Street',
          city: 'San Francisco',
          state: 'CA',
          zip: '94102'
        },
        star_rating: 4,
        number_of_rooms: 200,
        default_room_type: 'Standard',
        price_per_night: 220,
        amenities: {
          wifi: true,
          breakfast_included: true,
          parking: false,
          pet_friendly: false,
          near_transit: true,
          pool: false,
          gym: true
        },
        hotel_rating: 4.3
      },
      {
        hotel_id: 'HOTEL004',
        name: 'Mountain View Lodge',
        address: {
          street: '321 Alpine Road',
          city: 'Denver',
          state: 'CO',
          zip: '80202'
        },
        star_rating: 3,
        number_of_rooms: 80,
        default_room_type: 'Standard',
        price_per_night: 120,
        amenities: {
          wifi: true,
          breakfast_included: true,
          parking: true,
          pet_friendly: true,
          near_transit: false,
          pool: false,
          gym: false
        },
        hotel_rating: 4.0
      },
      {
        hotel_id: 'HOTEL005',
        name: 'Seaside Inn',
        address: {
          street: '555 Harbor Way',
          city: 'Seattle',
          state: 'WA',
          zip: '98101'
        },
        star_rating: 3,
        number_of_rooms: 60,
        default_room_type: 'Standard',
        price_per_night: 150,
        amenities: {
          wifi: true,
          breakfast_included: false,
          parking: true,
          pet_friendly: false,
          near_transit: true,
          pool: false,
          gym: false
        },
        hotel_rating: 3.8
      },
      {
        hotel_id: 'HOTEL006',
        name: 'Tropical Paradise Resort',
        address: {
          street: '888 Beach Boulevard',
          city: 'Miami',
          state: 'FL',
          zip: '33139'
        },
        star_rating: 5,
        number_of_rooms: 120,
        default_room_type: 'Suite',
        price_per_night: 320,
        amenities: {
          wifi: true,
          breakfast_included: true,
          parking: true,
          pet_friendly: true,
          near_transit: false,
          pool: true,
          gym: true
        },
        hotel_rating: 4.7
      }
    ];

    await Hotel.insertMany(hotels);
    console.log(`✅ ${hotels.length} hotels seeded successfully`);
  } catch (error) {
    console.error('❌ Error seeding hotels:', error);
    throw error;
  }
};

const seedCars = async () => {
  try {
    await Car.deleteMany();
    
    const cars = [
      {
        car_id: 'CAR001',
        car_type: 'Sedan',
        provider_name: 'Hertz',
        model: 'Toyota Camry',
        year: 2023,
        transmission_type: 'Automatic',
        number_of_seats: 5,
        daily_rental_price: 45,
        car_rating: 4.5,
        availability_status: 'Available',
        pickup_city: 'Los Angeles'
      },
      {
        car_id: 'CAR002',
        car_type: 'SUV',
        provider_name: 'Enterprise',
        model: 'Ford Explorer',
        year: 2023,
        transmission_type: 'Automatic',
        number_of_seats: 7,
        daily_rental_price: 75,
        car_rating: 4.6,
        availability_status: 'Available',
        pickup_city: 'New York'
      },
      {
        car_id: 'CAR003',
        car_type: 'Compact',
        provider_name: 'Avis',
        model: 'Honda Civic',
        year: 2024,
        transmission_type: 'Automatic',
        number_of_seats: 5,
        daily_rental_price: 35,
        car_rating: 4.4,
        availability_status: 'Available',
        pickup_city: 'San Francisco'
      },
      {
        car_id: 'CAR004',
        car_type: 'Luxury',
        provider_name: 'Budget',
        model: 'BMW 5 Series',
        year: 2023,
        transmission_type: 'Automatic',
        number_of_seats: 5,
        daily_rental_price: 120,
        car_rating: 4.8,
        availability_status: 'Available',
        pickup_city: 'Los Angeles'
      },
      {
        car_id: 'CAR005',
        car_type: 'SUV',
        provider_name: 'National',
        model: 'Jeep Grand Cherokee',
        year: 2023,
        transmission_type: 'Automatic',
        number_of_seats: 5,
        daily_rental_price: 65,
        car_rating: 4.5,
        availability_status: 'Available',
        pickup_city: 'Denver'
      },
      {
        car_id: 'CAR006',
        car_type: 'Convertible',
        provider_name: 'Alamo',
        model: 'Ford Mustang',
        year: 2024,
        transmission_type: 'Automatic',
        number_of_seats: 4,
        daily_rental_price: 85,
        car_rating: 4.7,
        availability_status: 'Available',
        pickup_city: 'Miami'
      },
      {
        car_id: 'CAR007',
        car_type: 'Sedan',
        provider_name: 'Thrifty',
        model: 'Nissan Altima',
        year: 2023,
        transmission_type: 'Automatic',
        number_of_seats: 5,
        daily_rental_price: 40,
        car_rating: 4.3,
        availability_status: 'Available',
        pickup_city: 'Seattle'
      },
      {
        car_id: 'CAR008',
        car_type: 'Minivan',
        provider_name: 'Dollar',
        model: 'Chrysler Pacifica',
        year: 2023,
        transmission_type: 'Automatic',
        number_of_seats: 7,
        daily_rental_price: 70,
        car_rating: 4.4,
        availability_status: 'Available',
        pickup_city: 'Boston'
      }
    ];

    await Car.insertMany(cars);
    console.log(`✅ ${cars.length} cars seeded successfully`);
  } catch (error) {
    console.error('❌ Error seeding cars:', error);
    throw error;
  }
};

const seedAll = async () => {
  try {
    console.log('🌱 Starting data seeding...\n');
    
    await mongoose.connect(MONGODB_URI);
    console.log(`✅ Connected to MongoDB: ${MONGODB_URI}\n`);

    await seedFlights();
    await seedHotels();
    await seedCars();
    
    console.log('\n✅ All data seeded successfully!');
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

