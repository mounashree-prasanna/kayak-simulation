const express = require('express');
const router = express.Router();
const {
  searchFlights,
  getFlight,
  createFlight,
  updateFlight,
  deleteFlight
} = require('../controllers/flightController');

router.get('/search', searchFlights);
router.get('/:flight_id', getFlight);
router.post('/', createFlight); // Admin only
router.put('/:flight_id', updateFlight); // Admin only
router.delete('/:flight_id', deleteFlight); // Admin only

module.exports = router;

