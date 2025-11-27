const express = require('express');
const router = express.Router();
const {
  chargeBooking,
  getBilling,
  searchBilling,
  getBillingByMonth
} = require('../controllers/billingController');

router.post('/charge', chargeBooking);
router.get('/:billing_id', getBilling);
router.get('/search', searchBilling);
router.get('/by-month', getBillingByMonth);

module.exports = router;

