const mongoose = require('mongoose');
const Flight = require('../models/Flight');

const searchFlights = async (req, res) => {
  try {
    const { origin, destination, date, minPrice, maxPrice, flightClass } = req.query;

    const query = {};

    if (origin) {
      const originTrimmed = origin.trim();
      const originUpper = originTrimmed.toUpperCase();
      // Check if it's an airport code (3-4 letters, all uppercase when converted)
      // Airport codes are typically 3-4 characters
      if (/^[A-Z]{3,4}$/.test(originUpper) && originTrimmed.length <= 4) {
        // It's an airport code - search by airport
        query.departure_airport = originUpper;
      } else {
        // It's a city name - search by city (case-insensitive)
        query.departure_city = { $regex: originTrimmed, $options: 'i' };
      }
    }

    if (destination) {
      const destTrimmed = destination.trim();
      const destUpper = destTrimmed.toUpperCase();
      // Check if it's an airport code (3-4 letters, all uppercase when converted)
      if (/^[A-Z]{3,4}$/.test(destUpper) && destTrimmed.length <= 4) {
        // It's an airport code - search by airport
        query.arrival_airport = destUpper;
      } else {
        // It's a city name - search by city (case-insensitive)
        query.arrival_city = { $regex: destTrimmed, $options: 'i' };
      }
    }

    if (date) {
      const searchDate = new Date(date);
      const nextDay = new Date(searchDate);
      nextDay.setDate(nextDay.getDate() + 1);
      query.departure_datetime = {
        $gte: searchDate,
        $lt: nextDay
      };
    }

    if (minPrice || maxPrice) {
      query.ticket_price = {};
      if (minPrice) query.ticket_price.$gte = Number(minPrice);
      if (maxPrice) query.ticket_price.$lte = Number(maxPrice);
    }

    if (flightClass) {
      query.flight_class = flightClass;
    }

    // Only show flights with available seats
    query.total_available_seats = { $gt: 0 };

    const flights = await Flight.find(query)
      .sort({ departure_datetime: 1, ticket_price: 1 })
      .limit(100);

    res.status(200).json({
      success: true,
      count: flights.length,
      data: flights
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search flights'
    });
  }
};

const getFlight = async (req, res) => {
  try {
    const { flight_id } = req.params;

    // Try to find by _id (MongoDB ObjectId) first, then by flight_id field
    let flight;
    if (mongoose.Types.ObjectId.isValid(flight_id)) {
      flight = await Flight.findById(flight_id);
    }
    
    if (!flight) {
      flight = await Flight.findOne({ flight_id });
    }

    if (!flight) {
      res.status(404).json({
        success: false,
        error: 'Flight not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: flight
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch flight'
    });
  }
};

const createFlight = async (req, res) => {
  try {
    const flight = new Flight(req.body);
    const savedFlight = await flight.save();

    res.status(201).json({
      success: true,
      data: savedFlight
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        error: 'Flight with this flight_id already exists'
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create flight'
    });
  }
};

const updateFlight = async (req, res) => {
  try {
    const { flight_id } = req.params;

    req.body.updated_at = new Date();

    const flight = await Flight.findOneAndUpdate(
      { flight_id },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!flight) {
      res.status(404).json({
        success: false,
        error: 'Flight not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: flight
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update flight'
    });
  }
};

const deleteFlight = async (req, res) => {
  try {
    const { flight_id } = req.params;

    const flight = await Flight.findOneAndDelete({ flight_id });

    if (!flight) {
      res.status(404).json({
        success: false,
        error: 'Flight not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Flight deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete flight'
    });
  }
};

module.exports = {
  searchFlights,
  getFlight,
  createFlight,
  updateFlight,
  deleteFlight
};

