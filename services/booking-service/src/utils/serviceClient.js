const axios = require('axios');

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';
const LISTING_SERVICE_URL = process.env.LISTING_SERVICE_URL || 'http://localhost:3002';

const userServiceClient = axios.create({
  baseURL: USER_SERVICE_URL,
  timeout: 5000
});

const listingServiceClient = axios.create({
  baseURL: LISTING_SERVICE_URL,
  timeout: 5000
});

const validateUser = async (user_id) => {
  try {
    const response = await userServiceClient.get(`/users/${user_id}`);
    return response.data.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      throw new Error('User not found');
    }
    throw new Error('Failed to validate user');
  }
};

const validateListing = async (type, reference_id) => {
  try {
    let endpoint = '';
    if (type === 'Flight') {
      endpoint = `/flights/${reference_id}`;
    } else if (type === 'Hotel') {
      endpoint = `/hotels/${reference_id}`;
    } else if (type === 'Car') {
      endpoint = `/cars/${reference_id}`;
    } else {
      throw new Error('Invalid booking type');
    }

    const response = await listingServiceClient.get(endpoint);
    return response.data.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      throw new Error(`${type} not found`);
    }
    throw new Error(`Failed to validate ${type}`);
  }
};

module.exports = {
  validateUser,
  validateListing
};

