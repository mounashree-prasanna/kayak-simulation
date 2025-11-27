const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/auth');
const {
  getTopProperties,
  getCityRevenue,
  getTopProviders,
  getBills,
  getClicksPerPage,
  getListingClicks,
  getLeastSeenSections,
  getUserTrace
} = require('../controllers/analyticsController');

// All routes require admin authentication
router.use(adminAuth);

router.get('/top-properties', getTopProperties);
router.get('/city-revenue', getCityRevenue);
router.get('/top-providers', getTopProviders);
router.get('/bills', getBills);
router.get('/clicks-per-page', getClicksPerPage);
router.get('/listing-clicks', getListingClicks);
router.get('/least-seen-sections', getLeastSeenSections);
router.get('/user-trace', getUserTrace);

module.exports = router;

