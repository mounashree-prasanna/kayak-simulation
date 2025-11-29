const Review = require('../models/Review');
const mongoose = require('mongoose');

const createReview = async (req, res) => {
  try {
    const { user_id, user_ref, entity_type, entity_id, rating, title, comment } = req.body;

    const review = new Review({
      user_id,
      user_ref,
      entity_type,
      entity_id,
      rating,
      title,
      comment,
      created_at: new Date()
    });

    const savedReview = await review.save();

    res.status(201).json({
      success: true,
      data: savedReview
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create review'
    });
  }
};

const getReviews = async (req, res) => {
  try {
    const { entity_type, entity_id, user_id } = req.query;

    const query = {};
    if (entity_type) query.entity_type = entity_type;
    if (entity_id) query.entity_id = entity_id;
    if (user_id) query.user_id = user_id;

    const reviews = await Review.find(query)
      .sort({ created_at: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch reviews'
    });
  }
};

const getAggregateRatings = async (req, res) => {
  try {
    const { entity_type, entity_id } = req.query;

    if (!entity_type || !entity_id) {
      res.status(400).json({
        success: false,
        error: 'entity_type and entity_id are required'
      });
      return;
    }

    const result = await Review.aggregate([
      {
        $match: {
          entity_type: entity_type,
          entity_id: entity_id
        }
      },
      {
        $group: {
          _id: null,
          average_rating: { $avg: '$rating' },
          total_reviews: { $sum: 1 },
          ratings_breakdown: {
            $push: '$rating'
          }
        }
      },
      {
        $project: {
          _id: 0,
          average_rating: { $round: ['$average_rating', 2] },
          total_reviews: 1,
          rating_distribution: {
            '5': { $size: { $filter: { input: '$ratings_breakdown', as: 'r', cond: { $eq: ['$$r', 5] } } } },
            '4': { $size: { $filter: { input: '$ratings_breakdown', as: 'r', cond: { $eq: ['$$r', 4] } } } },
            '3': { $size: { $filter: { input: '$ratings_breakdown', as: 'r', cond: { $eq: ['$$r', 3] } } } },
            '2': { $size: { $filter: { input: '$ratings_breakdown', as: 'r', cond: { $eq: ['$$r', 2] } } } },
            '1': { $size: { $filter: { input: '$ratings_breakdown', as: 'r', cond: { $eq: ['$$r', 1] } } } }
          }
        }
      }
    ]);

    if (result.length === 0) {
      res.status(200).json({
        success: true,
        data: {
          average_rating: 0,
          total_reviews: 0,
          rating_distribution: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 }
        }
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to aggregate ratings'
    });
  }
};

module.exports = {
  createReview,
  getReviews,
  getAggregateRatings
};

