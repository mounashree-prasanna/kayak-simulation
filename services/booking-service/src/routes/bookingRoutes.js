const express = require('express');
const router = express.Router();
const {
  createBooking,
  getBooking,
  getUserBookings,
  cancelBooking,
  confirmBooking
} = require('../controllers/bookingController');

router.post('/', createBooking);
// More specific routes must come before generic parameter routes
router.get('/users/:user_id/bookings', getUserBookings);
router.get('/:booking_id', getBooking);
router.put('/:booking_id/cancel', cancelBooking);
router.put('/:booking_id/confirm', confirmBooking);

module.exports = router;

