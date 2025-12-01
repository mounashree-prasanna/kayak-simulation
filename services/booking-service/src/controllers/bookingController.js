const BookingRepository = require('../repositories/bookingRepository');
const { executeTransaction } = require('../config/mysql');
const { validateUser, validateListing } = require('../utils/serviceClient');
const { publishBookingEvent } = require('../config/kafka');
const { generateBookingId } = require('../utils/bookingIdGenerator');
const { get: redisGet, set: redisSet, del: redisDel } = require('../../shared/redisClient');

const createBooking = async (req, res) => {
  try {
    const { user_id, booking_type, reference_id, start_date, end_date, total_price } = req.body;

    // Validate input
    if (!['Flight', 'Hotel', 'Car'].includes(booking_type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid booking_type. Must be Flight, Hotel, or Car'
      });
    }

    // Use transaction for ACID compliance
    const result = await executeTransaction(async (connection) => {
      // Validate user exists (from MongoDB via user-service)
      const user = await validateUser(user_id);
      if (!user) {
        throw new Error('User not found');
      }

      // Validate listing exists (from MongoDB via listing-service)
      const listing = await validateListing(booking_type, reference_id);
      if (!listing) {
        throw new Error(`${booking_type} not found`);
      }

      // Check availability for the requested dates
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      
      // Check availability based on booking type
      if (booking_type === 'Car') {
        // For cars: only one booking per car per date range (no overlapping dates)
        const hasConflict = await BookingRepository.hasDateConflict(
          booking_type,
          reference_id,
          startDate,
          endDate,
          null,
          connection
        );
        
        if (hasConflict) {
          throw new Error(`This car is already booked for the selected dates`);
        }
      }
      else if (booking_type === 'Hotel') {
        // For hotels: check if rooms are available (allow multiple bookings up to room limit)
        const bookingCount = await BookingRepository.getBookingCount(
          booking_type,
          reference_id,
          startDate,
          endDate,
          connection
        );
        
        const totalRooms = listing.number_of_rooms || listing.total_rooms || 0;
        if (totalRooms > 0 && bookingCount >= totalRooms) {
          throw new Error(`This hotel is fully booked for the selected dates. All ${totalRooms} room(s) are already reserved.`);
        }
      }
      else if (booking_type === 'Flight') {
        // For flights: check if seats are available
        const bookingCount = await BookingRepository.getBookingCount(
          booking_type,
          reference_id,
          startDate,
          endDate,
          connection
        );
        
        const availableSeats = listing.total_available_seats || 0;
        if (availableSeats > 0 && bookingCount >= availableSeats) {
          throw new Error(`Flight ${reference_id} is fully booked for the selected dates`);
        }
      }

      // Generate booking ID
      const booking_id = generateBookingId();

      // Create booking with Pending status
      const bookingData = {
        booking_id,
        user_id,
        user_ref: user._id ? user._id.toString() : null,
        booking_type,
        reference_id,
        reference_ref: listing._id ? listing._id.toString() : null,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
        booking_status: 'Pending',
        total_price
      };

      const savedBooking = await BookingRepository.create(bookingData, connection);
      
      return savedBooking;
    });

    // Publish Kafka event (after transaction commits)
    await publishBookingEvent('booking_created', result);

    // Invalidate user bookings cache
    try {
      await redisDel(`booking:user:${result.user_id}:all`);
      await redisDel(`booking:user:${result.user_id}:${result.booking_type}_`);
      await redisDel(`booking:user:${result.user_id}:_${result.booking_status}`);
    } catch (redisError) {
      console.warn('[Booking Service] Failed to invalidate cache:', redisError.message);
    }

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Booking Service] Create booking error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create booking'
    });
  }
};

const getBooking = async (req, res) => {
  try {
    const { booking_id } = req.params;

    // Check Redis cache first (SQL caching layer)
    const cacheKey = `booking:${booking_id}`;
    try {
      const cached = await redisGet(cacheKey);
      if (cached) {
        const cachedBooking = JSON.parse(cached);
        return res.status(200).json({
          success: true,
          data: cachedBooking,
          cached: true
        });
      }
    } catch (redisError) {
      // If Redis fails, continue to MySQL query (graceful degradation)
      console.warn('[Booking Service] Redis cache miss or error, falling back to MySQL:', redisError.message);
    }

    // Cache miss - query MySQL
    const booking = await BookingRepository.findByBookingId(booking_id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Transform booking data to match frontend expectations
    const transformedBooking = {
      ...booking,
      type: booking.booking_type?.toLowerCase() || booking.booking_type,
      status: booking.booking_status?.toLowerCase() || booking.booking_status,
      booking_reference: booking.booking_id,
      // Map dates for frontend
      check_in: booking.start_date,
      check_out: booking.end_date,
      pickup_date: booking.start_date,
      dropoff_date: booking.end_date,
      // Keep original fields for compatibility
      booking_type: booking.booking_type,
      booking_status: booking.booking_status,
      booking_id: booking.booking_id
    };

    // Cache the result in Redis with 60s TTL
    try {
      await redisSet(cacheKey, JSON.stringify(transformedBooking), 60);
    } catch (redisError) {
      // Log but don't fail the request if caching fails
      console.warn('[Booking Service] Failed to cache booking:', redisError.message);
    }

    res.status(200).json({
      success: true,
      data: transformedBooking
    });
  } catch (error) {
    console.error('[Booking Service] Get booking error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch booking'
    });
  }
};

const getUserBookings = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { type, status } = req.query;

    // Build cache key including filters for proper cache isolation
    const filterKey = type || status ? `${type || ''}_${status || ''}` : 'all';
    const cacheKey = `booking:user:${user_id}:${filterKey}`;

    // Check Redis cache first (SQL caching layer)
    try {
      const cached = await redisGet(cacheKey);
      if (cached) {
        const cachedBookings = JSON.parse(cached);
        return res.status(200).json({
          success: true,
          count: cachedBookings.length,
          data: cachedBookings,
          cached: true
        });
      }
    } catch (redisError) {
      // If Redis fails, continue to MySQL query (graceful degradation)
      console.warn('[Booking Service] Redis cache miss or error, falling back to MySQL:', redisError.message);
    }

    // Cache miss - query MySQL
    const filters = {};
    if (type) filters.type = type;
    if (status) filters.status = status;

    const bookings = await BookingRepository.findByUserId(user_id, filters);

    // Transform booking data to match frontend expectations
    const transformedBookings = bookings.map(booking => ({
      ...booking,
      // Map backend fields to frontend expectations
      type: booking.booking_type?.toLowerCase() || booking.booking_type,
      status: booking.booking_status?.toLowerCase() || booking.booking_status,
      booking_reference: booking.booking_id,
      // Keep original fields for compatibility
      booking_type: booking.booking_type,
      booking_status: booking.booking_status,
      booking_id: booking.booking_id
    }));

    // Cache the result in Redis with 60s TTL
    try {
      await redisSet(cacheKey, JSON.stringify(transformedBookings), 60);
    } catch (redisError) {
      // Log but don't fail the request if caching fails
      console.warn('[Booking Service] Failed to cache user bookings:', redisError.message);
    }

    res.status(200).json({
      success: true,
      count: transformedBookings.length,
      data: transformedBookings
    });
  } catch (error) {
    console.error('[Booking Service] Get user bookings error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch bookings'
    });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const { booking_id } = req.params;

    // Use transaction for ACID compliance
    const result = await executeTransaction(async (connection) => {
      // Check if booking exists
      const booking = await BookingRepository.findByBookingId(booking_id, connection);
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Update status to Cancelled
      const updated = await BookingRepository.updateStatus(booking_id, 'Cancelled', connection);
      if (!updated) {
        throw new Error('Failed to cancel booking');
      }

      // Fetch updated booking
      return await BookingRepository.findByBookingId(booking_id, connection);
    });

    // Publish Kafka event (after transaction commits)
    await publishBookingEvent('booking_cancelled', result);

    // Invalidate caches
    try {
      await redisDel(`booking:${result.booking_id}`);
      await redisDel(`booking:user:${result.user_id}:all`);
      await redisDel(`booking:user:${result.user_id}:${result.booking_type}_`);
      await redisDel(`booking:user:${result.user_id}:_${result.booking_status}`);
      await redisDel(`booking:user:${result.user_id}:_Cancelled`);
    } catch (redisError) {
      console.warn('[Booking Service] Failed to invalidate cache:', redisError.message);
    }

    res.status(200).json({
      success: true,
      data: result,
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    console.error('[Booking Service] Cancel booking error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to cancel booking'
    });
  }
};

const confirmBooking = async (req, res) => {
  try {
    const { booking_id } = req.params;

    // Use transaction for ACID compliance
    const result = await executeTransaction(async (connection) => {
      // Check if booking exists
      const booking = await BookingRepository.findByBookingId(booking_id, connection);
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Update status to Confirmed
      const updated = await BookingRepository.updateStatus(booking_id, 'Confirmed', connection);
      if (!updated) {
        throw new Error('Failed to confirm booking');
      }

      // Fetch updated booking
      return await BookingRepository.findByBookingId(booking_id, connection);
    });

    // Publish Kafka event (after transaction commits)
    await publishBookingEvent('booking_confirmed', result);

    // Invalidate caches
    try {
      await redisDel(`booking:${result.booking_id}`);
      await redisDel(`booking:user:${result.user_id}:all`);
      await redisDel(`booking:user:${result.user_id}:${result.booking_type}_`);
      await redisDel(`booking:user:${result.user_id}:_${result.booking_status}`);
      await redisDel(`booking:user:${result.user_id}:_Confirmed`);
    } catch (redisError) {
      console.warn('[Booking Service] Failed to invalidate cache:', redisError.message);
    }

    res.status(200).json({
      success: true,
      data: result,
      message: 'Booking confirmed successfully'
    });
  } catch (error) {
    console.error('[Booking Service] Confirm booking error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to confirm booking'
    });
  }
};

const checkAvailability = async (req, res) => {
  try {
    const { booking_type, reference_id, start_date, end_date } = req.query;

    if (!booking_type || !reference_id || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: booking_type, reference_id, start_date, end_date'
      });
    }

    if (!['Flight', 'Hotel', 'Car'].includes(booking_type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid booking_type. Must be Flight, Hotel, or Car'
      });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    // Check for date conflicts
    const hasConflict = await BookingRepository.hasDateConflict(
      booking_type,
      reference_id,
      startDate,
      endDate
    );

    const bookingCount = await BookingRepository.getBookingCount(
      booking_type,
      reference_id,
      startDate,
      endDate
    );

    res.status(200).json({
      success: true,
      data: {
        available: !hasConflict,
        booking_count: bookingCount,
        has_conflict: hasConflict
      }
    });
  } catch (error) {
    console.error('[Booking Service] Check availability error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check availability'
    });
  }
};

const updateBookingStatus = async (booking_id, status) => {
  try {
    let booking = null;
    await executeTransaction(async (connection) => {
      await BookingRepository.updateStatus(booking_id, status, connection);
      // Fetch booking to get user_id for cache invalidation
      booking = await BookingRepository.findByBookingId(booking_id, connection);
    });

    // Invalidate caches after status update
    if (booking) {
      try {
        await redisDel(`booking:${booking_id}`);
        await redisDel(`booking:user:${booking.user_id}:all`);
        await redisDel(`booking:user:${booking.user_id}:${booking.booking_type}_`);
        await redisDel(`booking:user:${booking.user_id}:_${booking.booking_status}`);
        await redisDel(`booking:user:${booking.user_id}:_${status}`);
      } catch (redisError) {
        console.warn('[Booking Service] Failed to invalidate cache:', redisError.message);
      }
    }
  } catch (error) {
    console.error('[Booking Service] Update booking status error:', error);
    throw error;
  }
};

module.exports = {
  createBooking,
  getBooking,
  getUserBookings,
  cancelBooking,
  confirmBooking,
  checkAvailability,
  updateBookingStatus
};
