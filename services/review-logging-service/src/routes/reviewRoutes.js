const express = require('express');
const router = express.Router();
const { createReview, getReviews, getAggregateRatings } = require('../controllers/reviewController');

router.post('/', createReview);
router.get('/', getReviews);
router.get('/aggregate/ratings', getAggregateRatings);

module.exports = router;

