const mongoose = require('mongoose');
const crypto = require('crypto');
const Hotel = require('../models/Hotel');
const { filterByAvailability } = require('../utils/availabilityChecker');
const AvailabilityService = require('../utils/availabilityService');
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

const searchHotels = async (req, res) => {
  try {
    // Feature flag for pagination
    const ENABLE_PAGINATION = process.env.ENABLE_PAGINATION !== 'false'; // Default: enabled
    
    const { city, checkIn, checkOut, date, price_min, price_max, stars, wifi, breakfast_included, parking, pet_friendly, near_transit, page, limit, name } = req.query;
    
    // Pagination parameters
    const pageNum = ENABLE_PAGINATION ? parseInt(page) || 1 : 1;
    const pageSize = ENABLE_PAGINATION ? parseInt(limit) || 20 : 100; // Default 20 when enabled, 100 when disabled
    const skip = (pageNum - 1) * pageSize;

    // If limit is high (like 1000), assume it's an admin request to fetch all hotels
    const isAdminFetch = limit && parseInt(limit) >= 1000;

    const query = {};

    // Name search (for admin)
    if (name && name.trim()) {
      query.name = new RegExp(name.trim(), 'i');
    }

    // City filter - skip for admin fetch if no city provided
    if (city && city.trim()) {
      query['address.city'] = new RegExp(city, 'i');
    }

    if (price_min || price_max) {
      query.price_per_night = {};
      if (price_min) query.price_per_night.$gte = Number(price_min);
      if (price_max) query.price_per_night.$lte = Number(price_max);
    }

    if (stars) {
      query.star_rating = Number(stars);
    }

    // Amenity filters
    if (wifi === 'true') query['amenities.wifi'] = true;
    if (breakfast_included === 'true') query['amenities.breakfast_included'] = true;
    if (parking === 'true') query['amenities.parking'] = true;
    if (pet_friendly === 'true') query['amenities.pet_friendly'] = true;
    if (near_transit === 'true') query['amenities.near_transit'] = true;

    let hotels = await Hotel.find(query)
      .sort({ hotel_rating: -1, price_per_night: 1 })
      .skip(skip)
      .limit(pageSize);

    // Filter by booking availability if check-in/check-out dates are provided
    const startDate = checkIn || date;
    const endDate = checkOut;
    let searchStartDate = null;
    let searchEndDate = null;
    
    if (startDate && endDate) {
      // Parse YYYY-MM-DD format as UTC date-only range to avoid timezone issues
      // Similar to flight date handling
      if (typeof startDate === 'string' && startDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // YYYY-MM-DD format - interpret as UTC date-only
        const [year, month, day] = startDate.split('-').map(Number);
        searchStartDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      } else {
        searchStartDate = new Date(startDate);
      }
      
      if (typeof endDate === 'string' && endDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // YYYY-MM-DD format - interpret as UTC date-only (end of day)
        const [year, month, day] = endDate.split('-').map(Number);
        searchEndDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
      } else {
        searchEndDate = new Date(endDate);
      }
      
      hotels = await filterByAvailability(hotels, 'Hotel', searchStartDate, searchEndDate);
    }

    // Calculate and update actual available rooms for each hotel
    // This shows the real-time availability after accounting for bookings
    if (hotels.length > 0) {
      try {
        // Use search dates if provided
        let calcStartDate = searchStartDate;
        let calcEndDate = searchEndDate;
        
        console.log(`[Hotel Controller] Calculating actual available rooms for ${hotels.length} hotels...`);
        if (calcStartDate && calcEndDate) {
          console.log(`[Hotel Controller] Using search date range: ${calcStartDate.toISOString()} to ${calcEndDate.toISOString()}`);
        } else {
          console.log(`[Hotel Controller] No search dates provided - cannot calculate available rooms (dates required for hotels)`);
        }
        
        // Only calculate if dates are provided (hotels require check-in/check-out dates)
        if (calcStartDate && calcEndDate) {
          for (const hotel of hotels) {
            const reference_id = hotel.hotel_id || hotel._id?.toString();
            const alternate_id = hotel.hotel_id && hotel._id ? hotel._id.toString() : null;
            if (reference_id) {
              const originalRooms = hotel.number_of_rooms || 0;
              // Check both hotel_id and _id since bookings might use either
              const bookingCount = await AvailabilityService.getBookingCount('Hotel', reference_id, calcStartDate, calcEndDate, alternate_id);
              const actualAvailableRooms = Math.max(0, originalRooms - bookingCount);
              
              console.log(`[Hotel Controller] Hotel ${reference_id}: total=${originalRooms}, booked=${bookingCount}, available=${actualAvailableRooms}`);
              
              // Update the hotel object with actual available rooms
              hotel.number_of_rooms = actualAvailableRooms;
              hotel.actual_available_rooms = actualAvailableRooms; // Also add as separate field for clarity
              hotel.booked_rooms = bookingCount; // Add booked rooms for reference
            }
          }
          console.log(`[Hotel Controller] Updated available rooms for all hotels`);
        }
      } catch (error) {
        console.error('[Hotel Controller] Error calculating available rooms:', error.message);
        // Continue with original number_of_rooms if calculation fails
      }
    }

    // Build cache key for search results
    const searchParams = {
      city: city || '',
      checkIn: checkIn || '',
      checkOut: checkOut || '',
      date: date || '',
      price_min: price_min || '',
      price_max: price_max || '',
      stars: stars || '',
      wifi: wifi || '',
      breakfast_included: breakfast_included || '',
      parking: parking || '',
      pet_friendly: pet_friendly || '',
      near_transit: near_transit || '',
      page: pageNum,
      limit: pageSize
    };
    const cacheKey = generateSearchCacheKey('hotels', searchParams);

    // Check Redis cache first (cache-aside pattern)
    try {
      const cached = await redisGet(cacheKey);
      if (cached) {
        const cachedResult = JSON.parse(cached);
        console.log(`[Hotel Controller] Cache HIT for search: ${cacheKey}`);
        return res.status(200).json({
          ...cachedResult,
          cached: true
        });
      }
      console.log(`[Hotel Controller] Cache MISS for search: ${cacheKey}`);
    } catch (redisError) {
      console.warn('[Hotel Controller] Redis cache miss or error, falling back to MongoDB:', redisError.message);
    }

    // Get total count for pagination metadata (only if pagination is enabled)
    let totalCount = hotels.length;
    let totalPages = 1;
    if (ENABLE_PAGINATION) {
      // Count before availability filtering for accurate pagination
      totalCount = await Hotel.countDocuments(query);
      totalPages = Math.ceil(totalCount / pageSize);
    }

    const response = {
      success: true,
      count: hotels.length,
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
      data: hotels
    };

    // Cache the result in Redis with TTL
    try {
      await redisSet(cacheKey, JSON.stringify(response), REDIS_TTL_SEARCH);
      console.log(`[Hotel Controller] Cached search results: ${cacheKey}`);
    } catch (redisError) {
      console.warn('[Hotel Controller] Failed to cache search results:', redisError.message);
    }

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search hotels'
    });
  }
};

const getHotel = async (req, res) => {
  try {
    const { hotel_id } = req.params;
    const { checkIn, checkOut } = req.query; // Optional date parameters to calculate available rooms

    // Check Redis cache first (cache-aside pattern) - only if no date params
    const cacheKey = `hotel:${hotel_id}`;
    if (!checkIn && !checkOut) {
      try {
        const cached = await redisGet(cacheKey);
        if (cached) {
          const cachedHotel = JSON.parse(cached);
          console.log(`[Hotel Controller] Cache HIT for hotel: ${hotel_id}`);
          return res.status(200).json({
            success: true,
            data: cachedHotel,
            cached: true
          });
        }
        console.log(`[Hotel Controller] Cache MISS for hotel: ${hotel_id}`);
      } catch (redisError) {
        console.warn('[Hotel Controller] Redis cache miss or error, falling back to MongoDB:', redisError.message);
      }
    }
    
    let hotel;
    
    if (mongoose.Types.ObjectId.isValid(hotel_id)) {
      hotel = await Hotel.findById(hotel_id);
    }
    
    if (!hotel) {
      hotel = await Hotel.findOne({ hotel_id });
    }

    if (!hotel) {
      return res.status(404).json({
        success: false,
        error: 'Hotel not found'
      });
    }

    // Calculate actual available rooms - use check-in/check-out dates if provided
    try {
      let calcStartDate = null;
      let calcEndDate = null;
      
      if (checkIn && checkOut) {
        // Parse YYYY-MM-DD format as UTC date-only range to avoid timezone issues
        if (typeof checkIn === 'string' && checkIn.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // YYYY-MM-DD format - interpret as UTC date-only
          const [year, month, day] = checkIn.split('-').map(Number);
          calcStartDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        } else {
          calcStartDate = new Date(checkIn);
        }
        
        if (typeof checkOut === 'string' && checkOut.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // YYYY-MM-DD format - interpret as UTC date-only (end of day)
          const [year, month, day] = checkOut.split('-').map(Number);
          calcEndDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
        } else {
          calcEndDate = new Date(checkOut);
        }
        
        if (!isNaN(calcStartDate.getTime()) && !isNaN(calcEndDate.getTime())) {
          const reference_id = hotel.hotel_id || hotel._id?.toString();
          const alternate_id = hotel.hotel_id && hotel._id ? hotel._id.toString() : null;
          if (reference_id) {
            // Check both hotel_id and _id since bookings might use either
            const bookingCount = await AvailabilityService.getBookingCount('Hotel', reference_id, calcStartDate, calcEndDate, alternate_id);
            const totalRooms = hotel.number_of_rooms || 0;
            const actualAvailableRooms = Math.max(0, totalRooms - bookingCount);
            
            console.log(`[Hotel Controller] Single hotel ${reference_id}: total=${totalRooms}, booked=${bookingCount}, available=${actualAvailableRooms} (dates: ${calcStartDate.toISOString()} to ${calcEndDate.toISOString()})`);
            
            // Update the hotel object with actual available rooms
            hotel.number_of_rooms = actualAvailableRooms;
            hotel.actual_available_rooms = actualAvailableRooms;
            hotel.booked_rooms = bookingCount;
          }
        }
      } else {
        console.log(`[Hotel Controller] No check-in/check-out dates provided - showing total rooms only`);
      }
    } catch (error) {
      console.error('[Hotel Controller] Error calculating available rooms for single hotel:', error.message);
      // Continue with original number_of_rooms if calculation fails
    }

    // Cache the result in Redis with TTL (only if no date params, as dates affect availability)
    if (!checkIn && !checkOut) {
      try {
        await redisSet(cacheKey, JSON.stringify(hotel.toObject()), REDIS_TTL_DETAILS);
        console.log(`[Hotel Controller] Cached hotel details: ${hotel_id}`);
      } catch (redisError) {
        console.warn('[Hotel Controller] Failed to cache hotel details:', redisError.message);
      }
    }

    res.status(200).json({
      success: true,
      data: hotel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch hotel'
    });
  }
};

const createHotel = async (req, res) => {
  try {
    // Generate hotel_id automatically if not provided
    if (!req.body.hotel_id) {
      req.body.hotel_id = new mongoose.Types.ObjectId().toString();
    }
    
    const hotel = new Hotel(req.body);
    const savedHotel = await hotel.save();

    // Invalidate search cache and hotel detail cache
    try {
      await redisDelPattern('hotels:search:*');
      if (savedHotel.hotel_id) {
        await redisDel(`hotel:${savedHotel.hotel_id}`);
      }
      console.log('[Hotel Controller] Cache invalidated after hotel creation');
    } catch (redisError) {
      console.warn('[Hotel Controller] Failed to invalidate cache on create:', redisError.message);
    }

    res.status(201).json({
      success: true,
      data: savedHotel
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        error: 'Hotel with this hotel_id already exists'
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create hotel'
    });
  }
};

const updateHotel = async (req, res) => {
  try {
    const { hotel_id } = req.params;

    req.body.updated_at = new Date();

    const hotel = await Hotel.findOneAndUpdate(
      { hotel_id },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!hotel) {
      return res.status(404).json({
        success: false,
        error: 'Hotel not found'
      });
    }

    // Invalidate cache on update
    try {
      await redisDelPattern('hotels:search:*');
      await redisDel(`hotel:${hotel_id}`);
      console.log(`[Hotel Controller] Cache invalidated after hotel update: ${hotel_id}`);
    } catch (redisError) {
      console.warn('[Hotel Controller] Failed to invalidate cache on update:', redisError.message);
    }

    res.status(200).json({
      success: true,
      data: hotel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update hotel'
    });
  }
};

const deleteHotel = async (req, res) => {
  try {
    const { hotel_id } = req.params;

    const hotel = await Hotel.findOneAndDelete({ hotel_id });

    if (!hotel) {
      return res.status(404).json({
        success: false,
        error: 'Hotel not found'
      });
    }

    // Invalidate cache on delete
    try {
      await redisDelPattern('hotels:search:*');
      await redisDel(`hotel:${hotel_id}`);
      console.log(`[Hotel Controller] Cache invalidated after hotel delete: ${hotel_id}`);
    } catch (redisError) {
      console.warn('[Hotel Controller] Failed to invalidate cache on delete:', redisError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Hotel deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete hotel'
    });
  }
};

module.exports = {
  searchHotels,
  getHotel,
  createHotel,
  updateHotel,
  deleteHotel
};

