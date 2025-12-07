const PageClickLog = require('../models/PageClickLog');
const ListingClickLog = require('../models/ListingClickLog');
const UserTrace = require('../models/UserTrace');
const { publishTrackingEvent } = require('../config/kafka');

const logClick = async (req, res) => {
  try {
    const { user_id, page, element_id } = req.body;

    const log = new PageClickLog({
      user_id: user_id || undefined,
      page,
      element_id,
      timestamp: new Date()
    });

    await log.save();

    // Publish to Kafka
    await publishTrackingEvent('page_click', log.toObject());

    res.status(201).json({
      success: true,
      message: 'Click logged successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to log click'
    });
  }
};

const logListingClick = async (req, res) => {
  try {
    const { user_id, listing_type, listing_id } = req.body;

    const log = new ListingClickLog({
      user_id: user_id || undefined,
      listing_type,
      listing_id,
      timestamp: new Date()
    });

    await log.save();

    // Publish to Kafka
    await publishTrackingEvent('listing_click', log.toObject());

    res.status(201).json({
      success: true,
      message: 'Listing click logged successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to log listing click'
    });
  }
};

const logTrace = async (req, res) => {
  try {
    const { user_id, cohort_key, event_type, event_data } = req.body;

    // Find or create user trace
    let trace = await UserTrace.findOne({
      $or: [
        { user_id: user_id || null },
        { cohort_key: cohort_key || null }
      ]
    });

    if (!trace) {
      trace = new UserTrace({
        user_id: user_id || undefined,
        cohort_key: cohort_key || undefined,
        events: [],
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    // Add new event
    trace.events.push({
      type: event_type,
      data: event_data || {},
      timestamp: new Date()
    });

    trace.updated_at = new Date();
    await trace.save();

    res.status(201).json({
      success: true,
      message: 'Trace logged successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to log trace'
    });
  }
};

module.exports = {
  logClick,
  logListingClick,
  logTrace
};

