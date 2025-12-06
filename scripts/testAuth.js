/**
 * Test script to verify authentication is working
 * Run: node scripts/testAuth.js <accessToken>
 */

const axios = require('axios');

const ACCESS_TOKEN = process.argv[2];
const BASE_URL = 'http://localhost:3000/api';

if (!ACCESS_TOKEN) {
  console.error('Usage: node testAuth.js <accessToken>');
  console.error('Get accessToken from browser localStorage after logging in');
  process.exit(1);
}

async function testEndpoints() {
  const headers = {
    'Authorization': `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  };

  const endpoints = [
    '/analytics/top-properties?year=2025',
    '/analytics/top-providers?month=12&year=2025',
    '/analytics/bills',
    '/admins/users/all?page=1&limit=20',
    '/admins'
  ];

  console.log('Testing admin endpoints with token...\n');

  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`${BASE_URL}${endpoint}`, { headers });
      console.log(`✅ ${endpoint}: ${response.status} - Success`);
      if (response.data.count !== undefined) {
        console.log(`   Data count: ${response.data.count}`);
      }
    } catch (error) {
      console.error(`❌ ${endpoint}: ${error.response?.status || 'ERROR'}`);
      console.error(`   Error: ${error.response?.data?.error || error.message}`);
      if (error.response?.data?.details) {
        console.error(`   Details: ${error.response.data.details}`);
      }
    }
    console.log('');
  }
}

testEndpoints();
