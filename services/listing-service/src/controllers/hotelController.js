const mongoose = require('mongoose');
const Hotel = require('../models/Hotel');
const { filterByAvailability } = require('../utils/availabilityChecker');

const searchHotels = async (req, res) => {
  try {
    const { city, checkIn, checkOut, date, price_min, price_max, stars, wifi, breakfast_included, parking, pet_friendly, near_transit } = req.query;

    const query = {};

    if (city) {
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
      .limit(100);

    // Filter by booking availability if check-in/check-out dates are provided
    const startDate = checkIn || date;
    const endDate = checkOut;
    if (startDate && endDate) {
      hotels = await filterByAvailability(hotels, 'Hotel', new Date(startDate), new Date(endDate));
    }

    res.status(200).json({
      success: true,
      count: hotels.length,
      data: hotels
    });
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
    let hotel;
    
    if (mongoose.Types.ObjectId.isValid(hotel_id)) {
      hotel = await Hotel.findById(hotel_id);
    }
    
    if (!hotel) {
      hotel = await Hotel.findOne({ hotel_id });
    }

    if (!hotel) {
      res.status(404).json({
        success: false,
        error: 'Hotel not found'
      });
      return;
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
    const hotel = new Hotel(req.body);
    const savedHotel = await hotel.save();

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
      res.status(404).json({
        success: false,
        error: 'Hotel not found'
      });
      return;
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
      res.status(404).json({
        success: false,
        error: 'Hotel not found'
      });
      return;
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

