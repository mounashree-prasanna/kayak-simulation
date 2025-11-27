const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const { validateUser, validateListing } = require('../utils/serviceClient');
const { publishBookingEvent } = require('../config/kafka');
const { generateBookingId } = require('../utils/bookingIdGenerator');

const createBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { user_id, booking_type, reference_id, start_date, end_date, total_price } = req.body;

    // Validate input
    if (!['Flight', 'Hotel', 'Car'].includes(booking_type)) {
      throw new Error('Invalid booking_type. Must be Flight, Hotel, or Car');
    }

    // Validate user exists
    const user = await validateUser(user_id);
    if (!user) {
      throw new Error('User not found');
    }

    // Validate listing exists
    const listing = await validateListing(booking_type, reference_id);
    if (!listing) {
      throw new Error(`${booking_type} not found`);
    }

    // Generate booking ID
    const booking_id = generateBookingId();

    // Create booking with Pending status
    const booking = new Booking({
      booking_id,
      user_id,
      user_ref: user._id,
      booking_type,
      reference_id,
      start_date: new Date(start_date),
      end_date: new Date(end_date),
      booking_status: 'Pending',
      total_price,
      created_at: new Date(),
      updated_at: new Date()
    });

    const savedBooking = await booking.save({ session });

    await session.commitTransaction();

    // Publish Kafka event
    await publishBookingEvent('booking_created', savedBooking.toObject());

    res.status(201).json({
      success: true,
      data: savedBooking
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create booking'
    });
  } finally {
    session.endSession();
  }
};

const getBooking = async (req, res) => {
  try {
    const { booking_id } = req.params;

    const booking = await Booking.findOne({ booking_id });

    if (!booking) {
      res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
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

    const query = { user_id };

    if (type) {
      query.booking_type = type;
    }

    if (status) {
      query.booking_status = status;
    }

    const bookings = await Booking.find(query)
      .sort({ created_at: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch bookings'
    });
  }
};

const cancelBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { booking_id } = req.params;

    const booking = await Booking.findOneAndUpdate(
      { booking_id },
      { 
        $set: { 
          booking_status: 'Cancelled',
          updated_at: new Date()
        }
      },
      { new: true, session }
    );

    if (!booking) {
      throw new Error('Booking not found');
    }

    await session.commitTransaction();

    // Publish Kafka event
    await publishBookingEvent('booking_cancelled', booking.toObject());

    res.status(200).json({
      success: true,
      data: booking,
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to cancel booking'
    });
  } finally {
    session.endSession();
  }
};

const confirmBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { booking_id } = req.params;

    const booking = await Booking.findOneAndUpdate(
      { booking_id },
      { 
        $set: { 
          booking_status: 'Confirmed',
          updated_at: new Date()
        }
      },
      { new: true, session }
    );

    if (!booking) {
      throw new Error('Booking not found');
    }

    await session.commitTransaction();

    // Publish Kafka event
    await publishBookingEvent('booking_confirmed', booking.toObject());

    res.status(200).json({
      success: true,
      data: booking,
      message: 'Booking confirmed successfully'
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to confirm booking'
    });
  } finally {
    session.endSession();
  }
};

const updateBookingStatus = async (booking_id, status) => {
  await Booking.findOneAndUpdate(
    { booking_id },
    { 
      $set: { 
        booking_status: status,
        updated_at: new Date()
      }
    }
  );
};

module.exports = {
  createBooking,
  getBooking,
  getUserBookings,
  cancelBooking,
  confirmBooking,
  updateBookingStatus
};

