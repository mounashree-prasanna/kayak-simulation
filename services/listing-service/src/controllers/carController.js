const mongoose = require('mongoose');
const crypto = require('crypto');
const Car = require('../models/Car');
const { filterByAvailability } = require('../utils/availabilityChecker');
const { get: redisGet, set: redisSet, del: redisDel, delPattern: redisDelPattern } = require('../config/redis');

// Redis TTL configuration
const REDIS_TTL_SEARCH = parseInt(process.env.REDIS_TTL_SEARCH || '600'); // 10 minutes default for search results
const REDIS_TTL_DETAILS = parseInt(process.env.REDIS_TTL_DETAILS || '1800'); // 30 minutes default for listing details

/**
 * Generate cache key for search queries
 */
const generateSearchCacheKey = (type, params) => {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
  const hash = crypto.createHash('md5').update(sortedParams).digest('hex');
  return `${type}:search:${hash}`;
};

const searchCars = async (req, res) => {
  try {
    // Feature flag for pagination
    const ENABLE_PAGINATION = process.env.ENABLE_PAGINATION !== 'false'; // Default: enabled
    
    const { city, pickupDate, dropoffDate, price_min, price_max, car_type, page, limit, name } = req.query;
    
    // Pagination parameters
    const pageNum = ENABLE_PAGINATION ? parseInt(page) || 1 : 1;
    const pageSize = ENABLE_PAGINATION ? parseInt(limit) || 20 : 100; // Default 20 when enabled, 100 when disabled
    const skip = (pageNum - 1) * pageSize;

    // If limit is high (like 1000), assume it's an admin request to fetch all cars
    const isAdminFetch = limit && parseInt(limit) >= 1000;

    const query = {};

    // Only filter by availability_status for regular users, not admin
    if (!isAdminFetch) {
      query.availability_status = 'Available';
    }

    // Name search (for admin - search in model field)
    if (name && name.trim()) {
      query.model = new RegExp(name.trim(), 'i');
    }

    if (city && city.trim()) {
      query.pickup_city = new RegExp(city, 'i');
    }

    if (price_min || price_max) {
      query.daily_rental_price = {};
      if (price_min) query.daily_rental_price.$gte = Number(price_min);
      if (price_max) query.daily_rental_price.$lte = Number(price_max);
    }

    if (car_type) {
      query.car_type = new RegExp(car_type, 'i');
    }

    let cars = await Car.find(query)
      .sort({ car_rating: -1, daily_rental_price: 1 })
      .skip(skip)
      .limit(pageSize);

    // Filter by booking availability if pickup/dropoff dates are provided
    if (pickupDate && dropoffDate) {
      cars = await filterByAvailability(cars, 'Car', new Date(pickupDate), new Date(dropoffDate));
    }

    // Build cache key for search results
    const searchParams = {
      city: city || '',
      pickupDate: pickupDate || '',
      dropoffDate: dropoffDate || '',
      price_min: price_min || '',
      price_max: price_max || '',
      car_type: car_type || '',
      page: pageNum,
      limit: pageSize
    };
    const cacheKey = generateSearchCacheKey('cars', searchParams);

    // Check Redis cache first (cache-aside pattern)
    try {
      const cached = await redisGet(cacheKey);
      if (cached) {
        const cachedResult = JSON.parse(cached);
        console.log(`[Car Controller] Cache HIT for search: ${cacheKey}`);
        return res.status(200).json({
          ...cachedResult,
          cached: true
        });
      }
      console.log(`[Car Controller] Cache MISS for search: ${cacheKey}`);
    } catch (redisError) {
      console.warn('[Car Controller] Redis cache miss or error, falling back to MongoDB:', redisError.message);
    }

    // Get total count for pagination metadata (only if pagination is enabled)
    let totalCount = cars.length;
    let totalPages = 1;
    if (ENABLE_PAGINATION) {
      totalCount = await Car.countDocuments(query);
      totalPages = Math.ceil(totalCount / pageSize);
    }

    const response = {
      success: true,
      count: cars.length,
      ...(ENABLE_PAGINATION && {
        pagination: {
          page: pageNum,
          limit: pageSize,
          total: totalCount,
          totalPages: totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      }),
      data: cars
    };

    // Cache the result in Redis with TTL
    try {
      await redisSet(cacheKey, JSON.stringify(response), REDIS_TTL_SEARCH);
      console.log(`[Car Controller] Cached search results: ${cacheKey}`);
    } catch (redisError) {
      console.warn('[Car Controller] Failed to cache search results:', redisError.message);
    }

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search cars'
    });
  }
};

const getCar = async (req, res) => {
  try {
    const { car_id } = req.params;

    // Check Redis cache first (cache-aside pattern)
    const cacheKey = `car:${car_id}`;
    try {
      const cached = await redisGet(cacheKey);
      if (cached) {
        const cachedCar = JSON.parse(cached);
        console.log(`[Car Controller] Cache HIT for car: ${car_id}`);
        return res.status(200).json({
          success: true,
          data: cachedCar,
          cached: true
        });
      }
      console.log(`[Car Controller] Cache MISS for car: ${car_id}`);
    } catch (redisError) {
      console.warn('[Car Controller] Redis cache miss or error, falling back to MongoDB:', redisError.message);
    }

    let car;
    
    if (mongoose.Types.ObjectId.isValid(car_id)) {
      car = await Car.findById(car_id);
    }
    
    if (!car) {
      car = await Car.findOne({ car_id });
    }

    if (!car) {
      return res.status(404).json({
        success: false,
        error: 'Car not found'
      });
    }

    // Cache the result in Redis with TTL
    try {
      await redisSet(cacheKey, JSON.stringify(car.toObject()), REDIS_TTL_DETAILS);
      console.log(`[Car Controller] Cached car details: ${car_id}`);
    } catch (redisError) {
      console.warn('[Car Controller] Failed to cache car details:', redisError.message);
    }

    res.status(200).json({
      success: true,
      data: car
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch car'
    });
  }
};

const createCar = async (req, res) => {
  try {
    // Generate car_id automatically if not provided
    if (!req.body.car_id) {
      req.body.car_id = new mongoose.Types.ObjectId().toString();
    }
    
    const car = new Car(req.body);
    const savedCar = await car.save();

    // Invalidate search cache and car detail cache
    try {
      await redisDelPattern('cars:search:*');
      if (savedCar.car_id) {
        await redisDel(`car:${savedCar.car_id}`);
      }
      console.log('[Car Controller] Cache invalidated after car creation');
    } catch (redisError) {
      console.warn('[Car Controller] Failed to invalidate cache on create:', redisError.message);
    }

    res.status(201).json({
      success: true,
      data: savedCar
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        error: 'Car with this car_id already exists'
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create car'
    });
  }
};

const updateCar = async (req, res) => {
  try {
    const { car_id } = req.params;

    req.body.updated_at = new Date();

    const car = await Car.findOneAndUpdate(
      { car_id },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!car) {
      return res.status(404).json({
        success: false,
        error: 'Car not found'
      });
    }

    // Invalidate cache on update
    try {
      await redisDelPattern('cars:search:*');
      await redisDel(`car:${car_id}`);
      console.log(`[Car Controller] Cache invalidated after car update: ${car_id}`);
    } catch (redisError) {
      console.warn('[Car Controller] Failed to invalidate cache on update:', redisError.message);
    }

    res.status(200).json({
      success: true,
      data: car
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update car'
    });
  }
};

const deleteCar = async (req, res) => {
  try {
    const { car_id } = req.params;

    const car = await Car.findOneAndDelete({ car_id });

    if (!car) {
      return res.status(404).json({
        success: false,
        error: 'Car not found'
      });
    }

    // Invalidate cache on delete
    try {
      await redisDelPattern('cars:search:*');
      await redisDel(`car:${car_id}`);
      console.log(`[Car Controller] Cache invalidated after car delete: ${car_id}`);
    } catch (redisError) {
      console.warn('[Car Controller] Failed to invalidate cache on delete:', redisError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Car deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete car'
    });
  }
};

module.exports = {
  searchCars,
  getCar,
  createCar,
  updateCar,
  deleteCar
};

