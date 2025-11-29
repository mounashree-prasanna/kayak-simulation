const BookingRepository = require('../repositories/bookingRepository');
const { executeTransaction } = require('../config/mysql');
const { validateUser, validateListing } = require('../utils/serviceClient');
const { publishBookingEvent } = require('../config/kafka');
const { generateBookingId } = require('../utils/bookingIdGenerator');

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

const updateBookingStatus = async (booking_id, status) => {
  try {
    await executeTransaction(async (connection) => {
      await BookingRepository.updateStatus(booking_id, status, connection);
    });
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
  updateBookingStatus
};
