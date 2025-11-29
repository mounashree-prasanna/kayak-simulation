const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// Import Image model
const Image = require('./src/models/Image');

// Connect to database
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://alishakartik_db_user:LSnNV7VtlqoeKZdT@cluster-236.njc5716.mongodb.net/kayak?appName=Cluster-236';

// Flight IDs from seedData.js
const flightIds = ['AA100', 'AA101', 'AA102', 'DL200', 'DL201', 'UA300', 'UA301', 'SW400', 'SW401', 'JB500'];

// Hotel IDs from seedData.js
const hotelIds = ['HOTEL001', 'HOTEL002', 'HOTEL003', 'HOTEL004', 'HOTEL005', 'HOTEL006'];

// Car IDs from seedData.js
const carIds = ['CAR001', 'CAR002', 'CAR003', 'CAR004', 'CAR005', 'CAR006', 'CAR007', 'CAR008'];

const seedImages = async () => {
  try {
    await Image.deleteMany();
    
    const images = [];

    // Flight Images - using Unsplash images for airplanes
    const flightImageUrls = [
      'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&h=600&fit=crop&auto=format', // Aircraft interior
      'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=600&fit=crop&auto=format', // Aircraft exterior
      'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&h=600&fit=crop&auto=format', // Plane in sky
      'https://images.unsplash.com/photo-1529107386315-38a8dc3f5b63?w=800&h=600&fit=crop&auto=format', // Plane window view
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&h=600&fit=crop&auto=format'  // Aircraft cabin
    ];

    flightIds.forEach((flightId, index) => {
      // Primary flight image
      images.push({
        entity_type: 'Flight',
        entity_id: flightId,
        image_url: flightImageUrls[index % flightImageUrls.length],
        metadata: {
          title: 'Aircraft Interior',
          description: 'Modern aircraft cabin',
          is_primary: true
        }
      });
      
      // Add a second image for most flights
      if (index < 8) {
        images.push({
          entity_type: 'Flight',
          entity_id: flightId,
          image_url: flightImageUrls[(index + 1) % flightImageUrls.length],
          metadata: {
            title: 'Aircraft Exterior',
            description: 'Aircraft on runway',
            is_primary: false
          }
        });
      }
    });

    // Hotel Images - using Unsplash images for hotels
    const hotelImageUrls = [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop&auto=format', // Luxury hotel
      'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&h=600&fit=crop&auto=format', // Beach resort
      'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&h=600&fit=crop&auto=format', // Business hotel
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&h=600&fit=crop&auto=format', // Mountain lodge
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&h=600&fit=crop&auto=format', // Seaside inn
      'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&h=600&fit=crop&auto=format'  // Tropical resort
    ];

    hotelIds.forEach((hotelId, index) => {
      // Primary hotel image
      images.push({
        entity_type: 'Hotel',
        entity_id: hotelId,
        image_url: hotelImageUrls[index] || hotelImageUrls[0],
        metadata: {
          title: 'Hotel Exterior',
          description: 'Main hotel building',
          is_primary: true
        }
      });
      
      // Additional hotel images
      images.push({
        entity_type: 'Hotel',
        entity_id: hotelId,
        image_url: `https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&h=600&fit=crop&auto=format`,
        metadata: {
          title: 'Hotel Lobby',
          description: 'Elegant hotel lobby',
          is_primary: false
        }
      });
      
      images.push({
        entity_type: 'Hotel',
        entity_id: hotelId,
        image_url: `https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&h=600&fit=crop&auto=format`,
        metadata: {
          title: 'Hotel Room',
          description: 'Comfortable hotel room',
          is_primary: false
        }
      });
    });

    // Car Images - using Unsplash images for cars
    const carImageUrls = [
      'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&h=600&fit=crop&auto=format', // Sedan - Toyota Camry
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=600&fit=crop&auto=format', // SUV - Ford Explorer
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&h=600&fit=crop&auto=format', // Compact - Honda Civic
      'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&h=600&fit=crop&auto=format', // Luxury - BMW
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=600&fit=crop&auto=format', // SUV - Jeep
      'https://images.unsplash.com/photo-1552519507-88c2e36a8c9e?w=800&h=600&fit=crop&auto=format', // Convertible - Mustang
      'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&h=600&fit=crop&auto=format', // Sedan - Nissan
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=600&fit=crop&auto=format'  // Minivan - Pacifica
    ];

    carIds.forEach((carId, index) => {
      images.push({
        entity_type: 'Car',
        entity_id: carId,
        image_url: carImageUrls[index] || carImageUrls[0],
        metadata: {
          title: 'Car Exterior',
          description: 'Vehicle exterior view',
          is_primary: true
        }
      });
      
      // Add interior image for some cars
      if (index < 4) {
        images.push({
          entity_type: 'Car',
          entity_id: carId,
          image_url: `https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&h=600&fit=crop&auto=format`,
          metadata: {
            title: 'Car Interior',
            description: 'Vehicle interior',
            is_primary: false
          }
        });
      }
    });

    await Image.insertMany(images);
    console.log(`✅ ${images.length} images seeded successfully`);
    console.log(`   - ${flightIds.length * 2} flight images`);
    console.log(`   - ${hotelIds.length * 3} hotel images`);
    console.log(`   - ${carIds.length + 4} car images`);
  } catch (error) {
    console.error('❌ Error seeding images:', error);
    throw error;
  }
};

const seedAll = async () => {
  try {
    console.log('🌱 Starting image seeding...\n');
    
    await mongoose.connect(MONGODB_URI);
    console.log(`✅ Connected to MongoDB: ${MONGODB_URI}\n`);

    await seedImages();
    
    console.log('\n✅ All images seeded successfully!');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding images:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run seeder
seedAll();

