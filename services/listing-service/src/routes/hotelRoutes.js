const express = require('express');
const router = express.Router();
const {
  searchHotels,
  getHotel,
  createHotel,
  updateHotel,
  deleteHotel
} = require('../controllers/hotelController');

router.get('/search', searchHotels);
router.get('/:hotel_id', getHotel);
router.post('/', createHotel); // Admin only
router.put('/:hotel_id', updateHotel); // Admin only
router.delete('/:hotel_id', deleteHotel); // Admin only

module.exports = router;

