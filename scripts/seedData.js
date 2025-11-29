const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models from listing-service
const Flight = require('../services/listing-service/src/models/Flight');
const Hotel = require('../services/listing-service/src/models/Hotel');
const Car = require('../services/listing-service/src/models/Car');

// Connect to database
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kayak_db';

const seedFlights = async () => {
  try {
    await Flight.deleteMany();
    
    const flights = [
      {
        flight_id: 'AA100',
        airline_name: 'American Airlines',
        departure_airport: 'JFK',
        arrival_airport: 'LAX',
        departure_datetime: new Date('2024-12-20T08:00:00Z'),
        arrival_datetime: new Date('2024-12-20T11:30:00Z'),
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
        arrival_airport: 'LAX',
        departure_datetime: new Date('2024-12-20T14:00:00Z'),
        arrival_datetime: new Date('2024-12-20T17:30:00Z'),
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
        arrival_airport: 'JFK',
        departure_datetime: new Date('2024-12-20T09:00:00Z'),
        arrival_datetime: new Date('2024-12-20T17:30:00Z'),
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
        arrival_airport: 'NYC',
        departure_datetime: new Date('2024-12-21T06:00:00Z'),
        arrival_datetime: new Date('2024-12-21T14:30:00Z'),
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
        arrival_airport: 'SEA',
        departure_datetime: new Date('2024-12-22T10:00:00Z'),
        arrival_datetime: new Date('2024-12-22T12:15:00Z'),
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
        arrival_airport: 'MIA',
        departure_datetime: new Date('2024-12-23T07:30:00Z'),
        arrival_datetime: new Date('2024-12-23T10:45:00Z'),
        duration_minutes: 195,
        flight_class: 'Economy',
        ticket_price: 280,
        total_available_seats: 55,
        rating: 4.5
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
