/**
 * Test Harness for Kayak Travel System
 * Creates test data for all services
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

// Helper functions
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max) => Math.random() * (max - min) + min;

// Generate SSN
const generateSSN = () => {
  const part1 = String(randomInt(100, 999));
  const part2 = String(randomInt(10, 99));
  const part3 = String(randomInt(1000, 9999));
  return `${part1}-${part2}-${part3}`;
};

// Generate email
const generateEmail = (firstName, lastName) => {
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomInt(1, 999)}@example.com`;
};

// US States
const US_STATES = ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'];

// Create users
const createUsers = async (count = 10000) => {
  console.log(`Creating ${count} users...`);
  const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Emily', 'Chris', 'Lisa'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
  
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < count; i++) {
    try {
      const firstName = randomChoice(firstNames);
      const lastName = randomChoice(lastNames);
      const user_id = generateSSN();
      const email = generateEmail(firstName, lastName);

      const user = {
        user_id,
        first_name: firstName,
        last_name: lastName,
        address: {
          street: `${randomInt(1, 9999)} Main St`,
          city: `City${randomInt(1, 100)}`,
          state: randomChoice(US_STATES),
          zip: `${randomInt(10000, 99999)}`
        },
        phone_number: `${randomInt(100, 999)}-${randomInt(100, 999)}-${randomInt(1000, 9999)}`,
        email
      };

      await axios.post(`${API_BASE_URL}/users`, user);
      successCount++;
      
      if ((i + 1) % 100 === 0) {
        console.log(`  Created ${i + 1} users (${successCount} success, ${failCount} failed)`);
      }
    } catch (error) {
      failCount++;
      if (error.response?.status !== 409) {
        console.error(`  Error creating user ${i + 1}:`, error.response?.data || error.message);
      }
    }
  }

  console.log(`✅ Users created: ${successCount} success, ${failCount} failed`);
};

// Create flights
const createFlights = async (count = 3334) => {
  console.log(`Creating ${count} flights...`);
  const airlines = ['AA', 'UA', 'DL', 'SW', 'B6', 'AS', 'NK'];
  const airports = ['JFK', 'LAX', 'ORD', 'DFW', 'DEN', 'SFO', 'LAS', 'SEA', 'MIA', 'BOS'];
  
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < count; i++) {
    try {
      const flight_id = `${randomChoice(airlines)}${randomInt(100, 999)}`;
      const departure = randomChoice(airports);
      let arrival = randomChoice(airports);
      while (arrival === departure) {
        arrival = randomChoice(airports);
      }

      const departureDate = new Date();
      departureDate.setDate(departureDate.getDate() + randomInt(1, 365));

      const flight = {
        flight_id,
        airline_name: `${randomChoice(airlines)} Airlines`,
        departure_airport: departure,
        arrival_airport: arrival,
        departure_datetime: departureDate.toISOString(),
        arrival_datetime: new Date(departureDate.getTime() + randomInt(2, 8) * 60 * 60 * 1000).toISOString(),
        duration_minutes: randomInt(120, 480),
        flight_class: randomChoice(['Economy', 'Business', 'First']),
        ticket_price: randomFloat(200, 1500),
        total_available_seats: randomInt(50, 300),
        rating: randomFloat(3.0, 5.0)
      };

      await axios.post(`${API_BASE_URL}/flights`, flight);
      successCount++;
      
      if ((i + 1) % 100 === 0) {
        console.log(`  Created ${i + 1} flights (${successCount} success, ${failCount} failed)`);
      }
    } catch (error) {
      failCount++;
      if (error.response?.status !== 409) {
        console.error(`  Error creating flight ${i + 1}:`, error.response?.data || error.message);
      }
    }
  }

  console.log(`✅ Flights created: ${successCount} success, ${failCount} failed`);
};

// Create hotels
const createHotels = async (count = 3333) => {
  console.log(`Creating ${count} hotels...`);
  const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego'];
  
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < count; i++) {
    try {
      const hotel_id = `HTL${String(i + 1).padStart(6, '0')}`;
      const city = randomChoice(cities);

      const hotel = {
        hotel_id,
        name: `${randomChoice(['Grand', 'Royal', 'Plaza', 'Park', 'Garden'])} ${randomChoice(['Hotel', 'Inn', 'Resort', 'Lodge'])}`,
        address: {
          street: `${randomInt(1, 9999)} Hotel Blvd`,
          city,
          state: randomChoice(US_STATES),
          zip: `${randomInt(10000, 99999)}`
        },
        star_rating: randomInt(1, 5),
        number_of_rooms: randomInt(50, 500),
        default_room_type: randomChoice(['Standard', 'Deluxe', 'Suite', 'Executive']),
        price_per_night: randomFloat(80, 500),
        amenities: {
          wifi: Math.random() > 0.2,
          breakfast_included: Math.random() > 0.5,
          parking: Math.random() > 0.3,
          pet_friendly: Math.random() > 0.6,
          near_transit: Math.random() > 0.4,
          pool: Math.random() > 0.5,
          gym: Math.random() > 0.5
        },
        hotel_rating: randomFloat(3.0, 5.0)
      };

      await axios.post(`${API_BASE_URL}/hotels`, hotel);
      successCount++;
      
      if ((i + 1) % 100 === 0) {
        console.log(`  Created ${i + 1} hotels (${successCount} success, ${failCount} failed)`);
      }
    } catch (error) {
      failCount++;
      if (error.response?.status !== 409) {
        console.error(`  Error creating hotel ${i + 1}:`, error.response?.data || error.message);
      }
    }
  }

  console.log(`✅ Hotels created: ${successCount} success, ${failCount} failed`);
};

// Create cars
const createCars = async (count = 3333) => {
  console.log(`Creating ${count} cars...`);
  const carTypes = ['SUV', 'Sedan', 'Compact', 'Luxury', 'Convertible'];
  const providers = ['Hertz', 'Avis', 'Enterprise', 'Budget', 'National'];
  const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia'];
  
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < count; i++) {
    try {
      const car_id = `CAR${String(i + 1).padStart(6, '0')}`;

      const car = {
        car_id,
        car_type: randomChoice(carTypes),
        provider_name: randomChoice(providers),
        model: `${randomChoice(['Toyota', 'Honda', 'Ford', 'Chevrolet', 'BMW', 'Mercedes'])} ${randomChoice(['Camry', 'Accord', 'Fusion', 'Impala', '3 Series', 'C-Class'])}`,
        year: randomInt(2019, 2024),
        transmission_type: randomChoice(['Automatic', 'Manual']),
        number_of_seats: randomInt(4, 8),
        daily_rental_price: randomFloat(30, 200),
        car_rating: randomFloat(3.5, 5.0),
        availability_status: randomChoice(['Available', 'Available', 'Available', 'Booked']),
        pickup_city: randomChoice(cities)
      };

      await axios.post(`${API_BASE_URL}/cars`, car);
      successCount++;
      
      if ((i + 1) % 100 === 0) {
        console.log(`  Created ${i + 1} cars (${successCount} success, ${failCount} failed)`);
      }
    } catch (error) {
      failCount++;
      if (error.response?.status !== 409) {
        console.error(`  Error creating car ${i + 1}:`, error.response?.data || error.message);
      }
    }
  }

  console.log(`✅ Cars created: ${successCount} success, ${failCount} failed`);
};

// Main execution
const main = async () => {
  console.log('🚀 Starting test harness...\n');
  console.log(`API Base URL: ${API_BASE_URL}\n`);

  try {
    await createFlights(3334);
    await createHotels(3333);
    await createCars(3333);
    await createUsers(10000);
    
    console.log('\n✅ Test harness completed!');
    console.log('\nNote: For 100K bookings/billing records, consider using direct MongoDB inserts for performance');
  } catch (error) {
    console.error('❌ Test harness failed:', error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  main();
}

module.exports = { createUsers, createFlights, createHotels, createCars };
