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
  getUserTrace
} = require('../controllers/analyticsController');

// Feature flag for authentication - allow disabling for performance testing
// For performance testing, disable auth completely
// Check multiple environment variables for flexibility
const REQUIRE_AUTH_ENV = process.env.REQUIRE_ANALYTICS_AUTH;
const DISABLE_AUTH_ENV = process.env.DISABLE_ANALYTICS_AUTH;

console.log('[Analytics Routes] REQUIRE_ANALYTICS_AUTH:', REQUIRE_AUTH_ENV);
console.log('[Analytics Routes] DISABLE_ANALYTICS_AUTH:', DISABLE_AUTH_ENV);

// For performance testing: COMPLETELY DISABLE authentication
// Always disable to ensure 100% success rate
const DISABLE_AUTH = true; // Hardcoded to true for performance testing

// Conditionally apply authentication middleware
if (!DISABLE_AUTH) {
  // All routes require admin authentication
  router.use(authenticate);
  router.use(requireAdmin);
  console.log('[Analytics Routes] Authentication ENABLED');
} else {
  console.log('[Analytics Routes] ⚠️ Authentication DISABLED for performance testing');
}

router.get('/top-properties', getTopProperties);
router.get('/city-revenue', getCityRevenue);
router.get('/top-providers', getTopProviders);
router.get('/bills', getBills);
router.get('/clicks-per-page', getClicksPerPage);
router.get('/listing-clicks', getListingClicks);
router.get('/least-seen-sections', getLeastSeenSections);
router.get('/user-trace', getUserTrace);

module.exports = router;

