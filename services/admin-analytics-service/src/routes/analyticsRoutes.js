const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const {
  getTopProperties,
  getCityRevenue,
  getTopProviders,
  getBills,
  getClicksPerPage,
  getListingClicks,
  getLeastSeenSections,
  getUserTrace,
  getProviderClicksPerPage,
  getProviderListingClicks,
  getProviderLeastSeenSections,
  getProviderReviews,
  getProviderUserTraces
} = require('../controllers/analyticsController');

// All routes require admin authentication
router.use(authenticate);
router.use(requireAdmin);

router.get('/top-properties', getTopProperties);
router.get('/city-revenue', getCityRevenue);
router.get('/top-providers', getTopProviders);
router.get('/bills', getBills);
router.get('/clicks-per-page', getClicksPerPage);
router.get('/listing-clicks', getListingClicks);
router.get('/least-seen-sections', getLeastSeenSections);
router.get('/user-trace', getUserTrace);

// Provider-specific analytics routes
router.get('/providers/:provider_id/clicks-per-page', getProviderClicksPerPage);
router.get('/providers/:provider_id/listing-clicks', getProviderListingClicks);
router.get('/providers/:provider_id/least-seen-sections', getProviderLeastSeenSections);
router.get('/providers/:provider_id/reviews', getProviderReviews);
router.get('/providers/:provider_id/user-traces', getProviderUserTraces);

module.exports = router;

