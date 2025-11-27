const express = require('express');
const router = express.Router();
const { logClick, logListingClick, logTrace } = require('../controllers/loggingController');

router.post('/click', logClick);
router.post('/listing-click', logListingClick);
router.post('/trace', logTrace);

module.exports = router;

