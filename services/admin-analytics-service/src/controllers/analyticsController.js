const mongoose = require('mongoose');

const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false, collection: 'bookings' }));
const Billing = mongoose.model('Billing', new mongoose.Schema({}, { strict: false, collection: 'billings' }));
const Flight = mongoose.model('Flight', new mongoose.Schema({}, { strict: false, collection: 'flights' }));
const Hotel = mongoose.model('Hotel', new mongoose.Schema({}, { strict: false, collection: 'hotels' }));
const Car = mongoose.model('Car', new mongoose.Schema({}, { strict: false, collection: 'cars' }));
const PageClickLog = mongoose.model('PageClickLog', new mongoose.Schema({}, { strict: false, collection: 'page_click_logs' }));
const ListingClickLog = mongoose.model('ListingClickLog', new mongoose.Schema({}, { strict: false, collection: 'listing_click_logs' }));
const UserTrace = mongoose.model('UserTrace', new mongoose.Schema({}, { strict: false, collection: 'user_traces' }));

const getTopProperties = async (req, res) => {
  try {
    const { year } = req.query;
    const yearNum = year ? Number(year) : new Date().getFullYear();

    const startDate = new Date(yearNum, 0, 1);
    const endDate = new Date(yearNum + 1, 0, 1);

    // Aggregate revenue by property (booking + billing)
    const result = await Billing.aggregate([
      {
        $match: {
          transaction_date: { $gte: startDate, $lt: endDate },
          transaction_status: 'Success'
        }
      },
      {
        $lookup: {
          from: 'bookings',
          localField: 'booking_id',
          foreignField: 'booking_id',
          as: 'booking'
        }
      },
      { $unwind: '$booking' },
      {
        $group: {
          _id: {
            type: '$booking.booking_type',
            reference_id: '$booking.reference_id'
          },
          total_revenue: { $sum: '$total_amount_paid' },
          booking_count: { $sum: 1 }
        }
      },
      { $sort: { total_revenue: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          property_type: '$_id.type',
          property_id: '$_id.reference_id',
          total_revenue: 1,
          booking_count: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      year: yearNum,
      count: result.length,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch top properties'
    });
  }
};

const getCityRevenue = async (req, res) => {
  try {
    const { year } = req.query;
    const yearNum = year ? Number(year) : new Date().getFullYear();

    const startDate = new Date(yearNum, 0, 1);
    const endDate = new Date(yearNum + 1, 0, 1);

    const result = await Billing.aggregate([
      {
        $match: {
          transaction_date: { $gte: startDate, $lt: endDate },
          transaction_status: 'Success'
        }
      },
      {
        $lookup: {
          from: 'bookings',
          localField: 'booking_id',
          foreignField: 'booking_id',
          as: 'booking'
        }
      },
      { $unwind: '$booking' },
      {
        $lookup: {
          from: 'hotels',
          localField: 'booking.reference_id',
          foreignField: 'hotel_id',
          as: 'hotel'
        }
      },
      {
        $lookup: {
          from: 'cars',
          localField: 'booking.reference_id',
          foreignField: 'car_id',
          as: 'car'
        }
      },
      {
        $project: {
          total_amount_paid: 1,
          city: {
            $cond: {
              if: { $gt: [{ $size: '$hotel' }, 0] },
              then: { $arrayElemAt: ['$hotel.address.city', 0] },
              else: {
                $cond: {
                  if: { $gt: [{ $size: '$car' }, 0] },
                  then: { $arrayElemAt: ['$car.pickup_city', 0] },
                  else: null
                }
              }
            }
          }
        }
      },
      { $match: { city: { $ne: null } } },
      {
        $group: {
          _id: '$city',
          total_revenue: { $sum: '$total_amount_paid' },
          transaction_count: { $sum: 1 }
        }
      },
      { $sort: { total_revenue: -1 } },
      {
        $project: {
          _id: 0,
          city: '$_id',
          total_revenue: 1,
          transaction_count: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      year: yearNum,
      count: result.length,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch city revenue'
    });
  }
};

const getTopProviders = async (req, res) => {
  try {
    const { month, year } = req.query;
    const monthNum = month ? Number(month) : new Date().getMonth() + 1;
    const yearNum = year ? Number(year) : new Date().getFullYear();

    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 1);

    const result = await Billing.aggregate([
      {
        $match: {
          transaction_date: { $gte: startDate, $lt: endDate },
          transaction_status: 'Success'
        }
      },
      {
        $lookup: {
          from: 'bookings',
          localField: 'booking_id',
          foreignField: 'booking_id',
          as: 'booking'
        }
      },
      { $unwind: '$booking' },
      {
        $lookup: {
          from: 'flights',
          localField: 'booking.reference_id',
          foreignField: 'flight_id',
          as: 'flight'
        }
      },
      {
        $lookup: {
          from: 'cars',
          localField: 'booking.reference_id',
          foreignField: 'car_id',
          as: 'car'
        }
      },
      {
        $project: {
          total_amount_paid: 1,
          provider: {
            $cond: {
              if: { $gt: [{ $size: '$flight' }, 0] },
              then: { $arrayElemAt: ['$flight.airline_name', 0] },
              else: {
                $cond: {
                  if: { $gt: [{ $size: '$car' }, 0] },
                  then: { $arrayElemAt: ['$car.provider_name', 0] },
                  else: null
                }
              }
            }
          }
        }
      },
      { $match: { provider: { $ne: null } } },
      {
        $group: {
          _id: '$provider',
          total_revenue: { $sum: '$total_amount_paid' },
          properties_sold: { $sum: 1 }
        }
      },
      { $sort: { total_revenue: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          provider_name: '$_id',
          total_revenue: 1,
          properties_sold: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      month: monthNum,
      year: yearNum,
      count: result.length,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch top providers'
    });
  }
};

const getBills = async (req, res) => {
  try {
    const { date, month, year } = req.query;

    const query = {};

    if (date) {
      const searchDate = new Date(date);
      const nextDay = new Date(searchDate);
      nextDay.setDate(nextDay.getDate() + 1);
      query.transaction_date = { $gte: searchDate, $lt: nextDay };
    } else if (month && year) {
      const startDate = new Date(Number(year), Number(month) - 1, 1);
      const endDate = new Date(Number(year), Number(month), 1);
      query.transaction_date = { $gte: startDate, $lt: endDate };
    }

    const bills = await Billing.find(query).sort({ transaction_date: -1 }).limit(1000);

    res.status(200).json({
      success: true,
      count: bills.length,
      data: bills
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch bills'
    });
  }
};

const getClicksPerPage = async (req, res) => {
  try {
    const result = await PageClickLog.aggregate([
      {
        $group: {
          _id: '$page',
          total_clicks: { $sum: 1 },
          unique_users: { $addToSet: '$user_id' }
        }
      },
      {
        $project: {
          _id: 0,
          page: '$_id',
          total_clicks: 1,
          unique_users_count: { $size: '$unique_users' }
        }
      },
      { $sort: { total_clicks: -1 } }
    ]);

    res.status(200).json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch clicks per page'
    });
  }
};

const getListingClicks = async (req, res) => {
  try {
    const result = await ListingClickLog.aggregate([
      {
        $group: {
          _id: {
            type: '$listing_type',
            id: '$listing_id'
          },
          total_clicks: { $sum: 1 },
          unique_users: { $addToSet: '$user_id' }
        }
      },
      {
        $project: {
          _id: 0,
          listing_type: '$_id.type',
          listing_id: '$_id.id',
          total_clicks: 1,
          unique_users_count: { $size: '$unique_users' }
        }
      },
      { $sort: { total_clicks: -1 } },
      { $limit: 100 }
    ]);

    res.status(200).json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch listing clicks'
    });
  }
};

const getLeastSeenSections = async (req, res) => {
  try {
    const result = await PageClickLog.aggregate([
      {
        $group: {
          _id: {
            page: '$page',
            element_id: '$element_id'
          },
          click_count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          page: '$_id.page',
          element_id: '$_id.element_id',
          click_count: 1
        }
      },
      { $sort: { click_count: 1 } },
      { $limit: 50 }
    ]);

    res.status(200).json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch least seen sections'
    });
  }
};

const getUserTrace = async (req, res) => {
  try {
    const { user_id, cohort } = req.query;

    const query = {};
    if (user_id) query.user_id = user_id;
    if (cohort) query.cohort_key = cohort;

    const traces = await UserTrace.find(query).sort({ created_at: -1 }).limit(100);

    res.status(200).json({
      success: true,
      count: traces.length,
      data: traces
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch user trace'
    });
  }
};

module.exports = {
  getTopProperties,
  getCityRevenue,
  getTopProviders,
  getBills,
  getClicksPerPage,
  getListingClicks,
  getLeastSeenSections,
  getUserTrace
};

