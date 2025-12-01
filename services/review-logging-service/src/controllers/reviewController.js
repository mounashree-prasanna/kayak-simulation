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
    // Feature flag for pagination
    const ENABLE_PAGINATION = process.env.ENABLE_PAGINATION !== 'false'; // Default: enabled
    
    const { entity_type, entity_id, user_id, page, limit } = req.query;

    const query = {};
    if (entity_type) query.entity_type = entity_type;
    if (entity_id) query.entity_id = entity_id;
    if (user_id) query.user_id = user_id;

    // Pagination parameters
    const pageNum = ENABLE_PAGINATION ? parseInt(page) || 1 : 1;
    const pageSize = ENABLE_PAGINATION ? parseInt(limit) || 20 : 100; // Default 20 when enabled, 100 when disabled
    const skip = (pageNum - 1) * pageSize;

    const reviews = await Review.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(pageSize);

    // Get total count for pagination metadata (only if pagination is enabled)
    let totalCount = reviews.length;
    let totalPages = 1;
    if (ENABLE_PAGINATION) {
      totalCount = await Review.countDocuments(query);
      totalPages = Math.ceil(totalCount / pageSize);
    }

    res.status(200).json({
      success: true,
      count: reviews.length,
      ...(ENABLE_PAGINATION && {
        pagination: {
          page: pageNum,
          limit: pageSize,
          total: totalCount,
          totalPages: totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      }),
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

