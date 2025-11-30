const express = require('express');
const router = express.Router();
const {
  chargeBooking,
  getBilling,
  searchBilling,
  getBillingByMonth,
  getUserBillings,
  getMonthlyStats
} = require('../controllers/billingController');

// POST routes
router.post('/charge', chargeBooking);

// GET routes - specific routes must come before parameterized routes
router.get('/search', searchBilling);
router.get('/by-month', getBillingByMonth);
router.get('/user/:user_id/stats', getMonthlyStats);
router.get('/user/:user_id', getUserBillings);
router.get('/:billing_id', getBilling);

module.exports = router;

