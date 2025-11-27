const Car = require('../models/Car');

const searchCars = async (req, res) => {
  try {
    const { city, date, price_min, price_max, car_type } = req.query;

    const query = {
      availability_status: 'Available'
    };

    if (city) {
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

    const cars = await Car.find(query)
      .sort({ car_rating: -1, daily_rental_price: 1 })
      .limit(100);

    res.status(200).json({
      success: true,
      count: cars.length,
      data: cars
    });
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

    const car = await Car.findOne({ car_id });

    if (!car) {
      res.status(404).json({
        success: false,
        error: 'Car not found'
      });
      return;
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
    // TODO: Add admin authentication middleware
    const car = new Car(req.body);
    const savedCar = await car.save();

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
    // TODO: Add admin authentication middleware
    const { car_id } = req.params;

    req.body.updated_at = new Date();

    const car = await Car.findOneAndUpdate(
      { car_id },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!car) {
      res.status(404).json({
        success: false,
        error: 'Car not found'
      });
      return;
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
    // TODO: Add admin authentication middleware
    const { car_id } = req.params;

    const car = await Car.findOneAndDelete({ car_id });

    if (!car) {
      res.status(404).json({
        success: false,
        error: 'Car not found'
      });
      return;
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

