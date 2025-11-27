const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Flight = require('../models/Flight');
const Hotel = require('../models/Hotel');
const CarRental = require('../models/CarRental');

// Load env vars
dotenv.config();

// Connect to database
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kayak_db');

const seedFlights = async () => {
  try {
    await Flight.deleteMany();
    
    const flights = [
      {
        airline: 'American Airlines',
        flightNumber: 'AA100',
        departure: {
          airport: 'JFK',
          airportName: 'John F. Kennedy International Airport',
          city: 'New York',
          country: 'USA',
          dateTime: new Date('2024-02-01T08:00:00Z')
        },
        arrival: {
          airport: 'LAX',
          airportName: 'Los Angeles International Airport',
          city: 'Los Angeles',
          country: 'USA',
          dateTime: new Date('2024-02-01T11:30:00Z')
        },
        aircraft: {
          type: 'Boeing 737',
          model: '737-800'
        },
        duration: 330, // 5.5 hours
        stops: 0,
        class: {
          economy: {
            available: true,
            price: 350,
            seatsAvailable: 50
          },
          business: {
            available: true,
            price: 1200,
            seatsAvailable: 10
          },
          first: {
            available: true,
            price: 2500,
            seatsAvailable: 4
          }
        },
        baggage: {
          carryOn: {
            included: true,
            maxWeight: 7,
            maxDimensions: '55x40x20cm'
          },
          checked: {
            included: false,
            maxWeight: 23,
            maxPieces: 1
          }
        },
        amenities: ['WiFi', 'Entertainment', 'Meals'],
        available: true
      },
      {
        airline: 'Delta Airlines',
        flightNumber: 'DL200',
        departure: {
          airport: 'LAX',
          airportName: 'Los Angeles International Airport',
          city: 'Los Angeles',
          country: 'USA',
          dateTime: new Date('2024-02-01T14:00:00Z')
        },
        arrival: {
          airport: 'JFK',
          airportName: 'John F. Kennedy International Airport',
          city: 'New York',
          country: 'USA',
          dateTime: new Date('2024-02-01T22:30:00Z')
        },
        aircraft: {
          type: 'Airbus A320',
          model: 'A320neo'
        },
        duration: 330,
        stops: 0,
        class: {
          economy: {
            available: true,
            price: 380,
            seatsAvailable: 45
          },
          business: {
            available: true,
            price: 1350,
            seatsAvailable: 8
          },
          first: {
            available: false,
            price: 0,
            seatsAvailable: 0
          }
        },
        baggage: {
          carryOn: {
            included: true,
            maxWeight: 7,
            maxDimensions: '55x40x20cm'
          },
          checked: {
            included: true,
            maxWeight: 23,
            maxPieces: 1
          }
        },
        amenities: ['WiFi', 'Entertainment', 'Snacks'],
        available: true
      }
    ];

    await Flight.insertMany(flights);
    console.log('✅ Flights seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding flights:', error);
  }
};

const seedHotels = async () => {
  try {
    await Hotel.deleteMany();
    
    const hotels = [
      {
        name: 'Grand Plaza Hotel',
        description: 'Luxurious hotel in the heart of New York City',
        address: {
          street: '123 Broadway',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA',
          coordinates: {
            latitude: 40.7128,
            longitude: -74.0060
          }
        },
        starRating: 5,
        amenities: ['WiFi', 'Pool', 'Gym', 'Spa', 'Restaurant', 'Parking'],
        roomTypes: [
          {
            type: 'Standard',
            description: 'Comfortable standard room with city view',
            maxOccupancy: 2,
            beds: {
              type: '1 Queen',
              count: 1
            },
            amenities: ['WiFi', 'TV', 'AC', 'Mini Bar'],
            pricing: {
              basePrice: 150,
              currency: 'USD',
              pricePerNight: true
            },
            availability: {
              available: true,
              roomsAvailable: 10,
              checkIn: new Date('2024-02-01'),
              checkOut: new Date('2024-02-05')
            },
            images: []
          },
          {
            type: 'Deluxe',
            description: 'Spacious deluxe room with premium amenities',
            maxOccupancy: 3,
            beds: {
              type: '1 King',
              count: 1
            },
            amenities: ['WiFi', 'TV', 'AC', 'Mini Bar', 'Balcony'],
            pricing: {
              basePrice: 220,
              currency: 'USD',
              pricePerNight: true
            },
            availability: {
              available: true,
              roomsAvailable: 5,
              checkIn: new Date('2024-02-01'),
              checkOut: new Date('2024-02-05')
            },
            images: []
          }
        ],
        policies: {
          checkIn: '3:00 PM',
          checkOut: '11:00 AM',
          cancellation: 'Free cancellation until 24 hours before check-in',
          petFriendly: false,
          smokingAllowed: false
        },
        images: [],
        reviews: {
          averageRating: 4.5,
          totalReviews: 125
        },
        contact: {
          phone: '+1-212-555-0100',
          email: 'info@grandplaza.com',
          website: 'www.grandplaza.com'
        }
      },
      {
        name: 'Sunset Beach Resort',
        description: 'Beachfront resort in Los Angeles',
        address: {
          street: '456 Ocean Drive',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90210',
          country: 'USA',
          coordinates: {
            latitude: 34.0522,
            longitude: -118.2437
          }
        },
        starRating: 4,
        amenities: ['WiFi', 'Pool', 'Gym', 'Beach Access', 'Restaurant', 'Bar'],
        roomTypes: [
          {
            type: 'Ocean View',
            description: 'Beautiful room with ocean view',
            maxOccupancy: 2,
            beds: {
              type: '2 Double',
              count: 2
            },
            amenities: ['WiFi', 'TV', 'AC', 'Balcony'],
            pricing: {
              basePrice: 180,
              currency: 'USD',
              pricePerNight: true
            },
            availability: {
              available: true,
              roomsAvailable: 8,
              checkIn: new Date('2024-02-01'),
              checkOut: new Date('2024-02-05')
            },
            images: []
          }
        ],
        policies: {
          checkIn: '4:00 PM',
          checkOut: '11:00 AM',
          cancellation: 'Free cancellation until 48 hours before check-in',
          petFriendly: true,
          smokingAllowed: false
        },
        images: [],
        reviews: {
          averageRating: 4.2,
          totalReviews: 89
        },
        contact: {
          phone: '+1-310-555-0200',
          email: 'info@sunsetbeach.com',
          website: 'www.sunsetbeach.com'
        }
      }
    ];

    await Hotel.insertMany(hotels);
    console.log('✅ Hotels seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding hotels:', error);
  }
};

const seedCarRentals = async () => {
  try {
    await CarRental.deleteMany();
    
    const carRentals = [
      {
        company: 'Hertz',
        vehicle: {
          make: 'Toyota',
          model: 'Camry',
          year: 2023,
          type: 'Mid-Size',
          category: 'Standard',
          seats: 5,
          doors: 4,
          transmission: 'Automatic',
          fuelType: 'Gasoline',
          mileage: 'Unlimited',
          features: ['GPS', 'Bluetooth', 'USB', 'Backup Camera']
        },
        location: {
          pickup: {
            address: '123 Airport Blvd',
            city: 'Los Angeles',
            state: 'CA',
            country: 'USA',
            coordinates: {
              latitude: 34.0522,
              longitude: -118.2437
            }
          },
          dropoff: {
            address: '123 Airport Blvd',
            city: 'Los Angeles',
            state: 'CA',
            country: 'USA'
          },
          sameLocation: true
        },
        availability: {
          available: true,
          pickupDate: new Date('2024-02-01'),
          dropoffDate: new Date('2024-02-05'),
          unitsAvailable: 5
        },
        pricing: {
          basePrice: 45,
          currency: 'USD',
          pricePerDay: 45,
          totalDays: 4,
          taxes: 18,
          fees: {
            insurance: 15,
            additionalDriver: 0,
            youngDriver: 0,
            airportFee: 10
          },
          totalPrice: 208
        },
        requirements: {
          minAge: 21,
          drivingLicense: true,
          creditCard: true,
          deposit: 200
        },
        images: []
      },
      {
        company: 'Enterprise',
        vehicle: {
          make: 'Ford',
          model: 'Explorer',
          year: 2023,
          type: 'SUV',
          category: 'Premium',
          seats: 7,
          doors: 5,
          transmission: 'Automatic',
          fuelType: 'Gasoline',
          mileage: 'Unlimited',
          features: ['GPS', 'Bluetooth', 'USB', 'Third Row Seating', 'AWD']
        },
        location: {
          pickup: {
            address: '456 Rental Way',
            city: 'New York',
            state: 'NY',
            country: 'USA',
            coordinates: {
              latitude: 40.7128,
              longitude: -74.0060
            }
          },
          dropoff: {
            address: '456 Rental Way',
            city: 'New York',
            state: 'NY',
            country: 'USA'
          },
          sameLocation: true
        },
        availability: {
          available: true,
          pickupDate: new Date('2024-02-01'),
          dropoffDate: new Date('2024-02-05'),
          unitsAvailable: 3
        },
        pricing: {
          basePrice: 75,
          currency: 'USD',
          pricePerDay: 75,
          totalDays: 4,
          taxes: 30,
          fees: {
            insurance: 20,
            additionalDriver: 0,
            youngDriver: 0,
            airportFee: 0
          },
          totalPrice: 350
        },
        requirements: {
          minAge: 25,
          drivingLicense: true,
          creditCard: true,
          deposit: 300
        },
        images: []
      }
    ];

    await CarRental.insertMany(carRentals);
    console.log('✅ Car rentals seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding car rentals:', error);
  }
};

const seedAll = async () => {
  try {
    await seedFlights();
    await seedHotels();
    await seedCarRentals();
    console.log('\n✅ All data seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
};

// Run seeder
seedAll();

