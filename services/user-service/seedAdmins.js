const mongoose = require('mongoose');
const Admin = require('./src/models/Admin'); // Keep Admin model in user-service for login only
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://alishakartik_db_user:LSnNV7VtlqoeKZdT@cluster-236.njc5716.mongodb.net/kayak?appName=Cluster-236';

const seedAdmins = async () => {
  try {
    console.log('🌱 Starting admin seeding...');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing admins (optional - comment out if you want to keep existing)
    // await Admin.deleteMany({});
    
    const admins = [
      {
        admin_id: 'ADMIN001',
        first_name: 'Super',
        last_name: 'Admin',
        address: {
          street: '123 Admin Street',
          city: 'San Francisco',
          state: 'CA',
          zip: '94102'
        },
        phone_number: '555-000-0001',
        email: 'superadmin@kayak.com',
        password: 'SuperAdmin123!',
        role: 'Super Admin',
        reports_and_analytics_managed: ['All Reports', 'Revenue Analytics', 'User Analytics']
      },
      {
        admin_id: 'ADMIN002',
        first_name: 'Listing',
        last_name: 'Manager',
        address: {
          street: '456 Listing Ave',
          city: 'New York',
          state: 'NY',
          zip: '10001'
        },
        phone_number: '555-000-0002',
        email: 'listingadmin@kayak.com',
        password: 'ListingAdmin123!',
        role: 'Listing Admin',
        reports_and_analytics_managed: ['Listing Performance']
      },
      {
        admin_id: 'ADMIN003',
        first_name: 'User',
        last_name: 'Manager',
        address: {
          street: '789 User Blvd',
          city: 'Los Angeles',
          state: 'CA',
          zip: '90001'
        },
        phone_number: '555-000-0003',
        email: 'useradmin@kayak.com',
        password: 'UserAdmin123!',
        role: 'User Admin',
        reports_and_analytics_managed: ['User Analytics']
      },
      {
        admin_id: 'ADMIN004',
        first_name: 'Billing',
        last_name: 'Manager',
        address: {
          street: '321 Billing St',
          city: 'Chicago',
          state: 'IL',
          zip: '60601'
        },
        phone_number: '555-000-0004',
        email: 'billingadmin@kayak.com',
        password: 'BillingAdmin123!',
        role: 'Billing Admin',
        reports_and_analytics_managed: ['Billing Reports', 'Revenue Reports']
      },
      {
        admin_id: 'ADMIN005',
        first_name: 'Analytics',
        last_name: 'Manager',
        address: {
          street: '654 Analytics Way',
          city: 'Seattle',
          state: 'WA',
          zip: '98101'
        },
        phone_number: '555-000-0005',
        email: 'analyticsadmin@kayak.com',
        password: 'AnalyticsAdmin123!',
        role: 'Analytics Admin',
        reports_and_analytics_managed: ['All Analytics', 'Charts', 'Reports']
      }
    ];

    for (const adminData of admins) {
      const existingAdmin = await Admin.findOne({ 
        $or: [
          { admin_id: adminData.admin_id },
          { email: adminData.email }
        ]
      });

      if (existingAdmin) {
        console.log(`⏭️  Admin ${adminData.admin_id} already exists, skipping...`);
        continue;
      }

      const admin = new Admin(adminData);
      await admin.save();
      console.log(`✅ Admin ${adminData.admin_id} (${adminData.role}) created: ${adminData.email}`);
    }

    console.log('✅ All admins seeded successfully!');
    console.log('\n📋 Admin Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    admins.forEach(admin => {
      console.log(`\n${admin.role}:`);
      console.log(`  Email: ${admin.email}`);
      console.log(`  Password: ${admin.password}`);
    });
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admins:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedAdmins();

