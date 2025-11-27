const express = require('express');
const router = express.Router();
const {
  searchCars,
  getCar,
  createCar,
  updateCar,
  deleteCar
} = require('../controllers/carController');

router.get('/search', searchCars);
router.get('/:car_id', getCar);
router.post('/', createCar); // Admin only
router.put('/:car_id', updateCar); // Admin only
router.delete('/:car_id', deleteCar); // Admin only

module.exports = router;

