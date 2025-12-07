const mongoose = require('mongoose');
const { get: redisGet, set: redisSet, del: redisDel, delPattern: redisDelPattern } = require('../config/redis');
const { query: mysqlQuery } = require('../config/mysql');

// Redis TTL configuration
const REDIS_TTL = parseInt(process.env.REDIS_TTL || '1800'); // 30 minutes default

const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false, collection: 'bookings' }));
// Note: Billing data is stored in MySQL, not MongoDB
const Flight = mongoose.model('Flight', new mongoose.Schema({}, { strict: false, collection: 'flights' }));
const Hotel = mongoose.model('Hotel', new mongoose.Schema({}, { strict: false, collection: 'hotels' }));
const Car = mongoose.model('Car', new mongoose.Schema({}, { strict: false, collection: 'cars' }));
const PageClickLog = mongoose.model('PageClickLog', new mongoose.Schema({}, { strict: false, collection: 'page_click_logs' }));
const ListingClickLog = mongoose.model('ListingClickLog', new mongoose.Schema({}, { strict: false, collection: 'listing_click_logs' }));
const UserTrace = mongoose.model('UserTrace', new mongoose.Schema({}, { strict: false, collection: 'user_traces' }));
const Review = mongoose.model('Review', new mongoose.Schema({}, { strict: false, collection: 'reviews' }));
const Provider = mongoose.model('Provider', new mongoose.Schema({}, { strict: false, collection: 'providers' }));

// Helper function to get listing IDs for a provider
// Since provider_id might not exist yet, we'll use provider_name matching
const getProviderListingIds = async (provider_id, provider_name) => {
  const listingIds = [];
  
  // Try to find by provider_id first, fallback to provider_name
  if (provider_id) {
    const flights = await Flight.find({ 
      $or: [
        { provider_id },
        { airline_name: provider_name }
      ]
    }).select('flight_id _id').lean();
    flights.forEach(f => {
      if (f.flight_id) listingIds.push(String(f.flight_id));
      if (f._id) listingIds.push(String(f._id));
    });
    
    const hotels = await Hotel.find({ 
      $or: [
        { provider_id },
        { name: { $regex: new RegExp(provider_name, 'i') } }
      ]
    }).select('hotel_id _id').lean();
    hotels.forEach(h => {
      if (h.hotel_id) listingIds.push(String(h.hotel_id));
      if (h._id) listingIds.push(String(h._id));
    });
    
    const cars = await Car.find({ 
      $or: [
        { provider_id },
        { provider_name }
      ]
    }).select('car_id _id').lean();
    cars.forEach(c => {
      if (c.car_id) listingIds.push(String(c.car_id));
      if (c._id) listingIds.push(String(c._id));
    });
  } else if (provider_name) {
    // Fallback to provider_name matching
    const flights = await Flight.find({ airline_name: provider_name }).select('flight_id _id').lean();
    flights.forEach(f => {
      if (f.flight_id) listingIds.push(String(f.flight_id));
      if (f._id) listingIds.push(String(f._id));
    });
    
    const cars = await Car.find({ provider_name }).select('car_id _id').lean();
    cars.forEach(c => {
      if (c.car_id) listingIds.push(String(c.car_id));
      if (c._id) listingIds.push(String(c._id));
    });
    
    // For hotels, match by name pattern
    const hotels = await Hotel.find({ 
      name: { $regex: new RegExp(provider_name, 'i') } 
    }).select('hotel_id _id').lean();
    hotels.forEach(h => {
      if (h.hotel_id) listingIds.push(String(h.hotel_id));
      if (h._id) listingIds.push(String(h._id));
    });
  }
  
  // Remove duplicates and null/undefined values, convert all to strings
  const uniqueListingIds = [...new Set(listingIds.filter(id => id != null).map(id => String(id)))];
  
  console.log(`[Admin Analytics] getProviderListingIds found ${uniqueListingIds.length} unique listing IDs for provider ${provider_id || provider_name}`);
  
  return uniqueListingIds;
};

const getTopProperties = async (req, res) => {
  try {
    // Feature flag for pagination
    const ENABLE_PAGINATION = process.env.ENABLE_PAGINATION !== 'false'; // Default: enabled
    
    const { year, page, limit } = req.query;
    const yearNum = year ? Number(year) : new Date().getFullYear();
    
    // Pagination parameters
    const pageNum = ENABLE_PAGINATION ? parseInt(page) || 1 : 1;
    const pageSize = ENABLE_PAGINATION ? parseInt(limit) || 20 : 10; // Default 20 when enabled, 10 when disabled
    const skip = (pageNum - 1) * pageSize;

    // Build cache key
    const cacheKey = `analytics:top-properties:${yearNum}:${pageNum}:${pageSize}`;

    // Check Redis cache first (cache-aside pattern)
    try {
      const cached = await redisGet(cacheKey);
      if (cached) {
        const cachedResult = JSON.parse(cached);
        console.log(`[Admin Analytics] Cache HIT for top properties: ${cacheKey}`);
        return res.status(200).json({
          ...cachedResult,
          cached: true
        });
      }
      console.log(`[Admin Analytics] Cache MISS for top properties: ${cacheKey}`);
    } catch (redisError) {
      console.warn('[Admin Analytics] Redis cache miss or error, falling back to MongoDB:', redisError.message);
    }

    const startDate = new Date(yearNum, 0, 1);
    const endDate = new Date(yearNum + 1, 0, 1);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Query MySQL for billing and booking data
    const sql = `
      SELECT 
        b.booking_type,
        b.reference_id,
        SUM(bill.total_amount_paid) as total_revenue,
        COUNT(*) as booking_count
      FROM billings bill
      INNER JOIN bookings b ON bill.booking_id = b.booking_id
      WHERE bill.transaction_date >= ? 
        AND bill.transaction_date < ?
        AND bill.transaction_status = 'Success'
      GROUP BY b.booking_type, b.reference_id
      ORDER BY total_revenue DESC
      ${ENABLE_PAGINATION ? `LIMIT ${skip}, ${pageSize}` : `LIMIT ${pageSize}`}
    `;
    
    console.log('[Admin Analytics] getTopProperties SQL:', sql);
    console.log('[Admin Analytics] getTopProperties date range:', startDateStr, 'to', endDateStr);
    
    const result = await mysqlQuery(sql, [startDateStr, endDateStr]);
    
    console.log('[Admin Analytics] getTopProperties result count:', result.length);
    
    // Get total count for pagination
    let totalCount = result.length;
    let totalPages = 1;
    if (ENABLE_PAGINATION) {
      const countSql = `
        SELECT COUNT(DISTINCT CONCAT(b.booking_type, ':', b.reference_id)) as total
        FROM billings bill
        INNER JOIN bookings b ON bill.booking_id = b.booking_id
        WHERE bill.transaction_date >= ? 
          AND bill.transaction_date < ?
          AND bill.transaction_status = 'Success'
      `;
      const countResult = await mysqlQuery(countSql, [startDateStr, endDateStr]);
      totalCount = countResult[0]?.total || 0;
      totalPages = Math.ceil(totalCount / pageSize);
    }
    
    // Transform result to match expected format
    const transformedResult = result.map(row => ({
      property_type: row.booking_type,
      property_id: row.reference_id,
      total_revenue: parseFloat(row.total_revenue) || 0,
      booking_count: parseInt(row.booking_count) || 0
    }));

    const response = {
      success: true,
      year: yearNum,
      count: transformedResult.length,
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
      data: transformedResult
    };

    // Cache the result in Redis with TTL
    try {
      await redisSet(cacheKey, JSON.stringify(response), REDIS_TTL);
      console.log(`[Admin Analytics] Cached top properties: ${cacheKey}`);
    } catch (redisError) {
      console.warn('[Admin Analytics] Failed to cache top properties:', redisError.message);
    }

    console.log('[Admin Analytics] getTopProperties response:', {
      success: response.success,
      count: response.count,
      dataLength: response.data?.length || 0
    });
    
    res.status(200).json(response);
  } catch (error) {
    console.error('[Admin Analytics] getTopProperties error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch top properties'
    });
  }
};

const getCityRevenue = async (req, res) => {
  try {
    const { year, city } = req.query;
    const yearNum = year ? Number(year) : new Date().getFullYear();

    // Build cache key
    const cacheKey = `analytics:city-revenue:${city || 'all'}:${yearNum}`;

    // Check Redis cache first (cache-aside pattern)
    try {
      const cached = await redisGet(cacheKey);
      if (cached) {
        const cachedResult = JSON.parse(cached);
        console.log(`[Admin Analytics] Cache HIT for city revenue: ${cacheKey}`);
        return res.status(200).json({
          ...cachedResult,
          cached: true
        });
      }
      console.log(`[Admin Analytics] Cache MISS for city revenue: ${cacheKey}`);
    } catch (redisError) {
      console.warn('[Admin Analytics] Redis cache miss or error, falling back to MongoDB:', redisError.message);
    }

    const startDate = new Date(yearNum, 0, 1);
    const endDate = new Date(yearNum + 1, 0, 1);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Query MySQL for billing and booking data
    const sql = `
      SELECT 
        b.booking_type,
        b.reference_id,
        bill.total_amount_paid
      FROM billings bill
      INNER JOIN bookings b ON bill.booking_id = b.booking_id
      WHERE bill.transaction_date >= ? 
        AND bill.transaction_date < ?
        AND bill.transaction_status = 'Success'
    `;
    
    console.log('[Admin Analytics] getCityRevenue SQL:', sql);
    console.log('[Admin Analytics] getCityRevenue date range:', startDateStr, 'to', endDateStr);
    
    const billingData = await mysqlQuery(sql, [startDateStr, endDateStr]);
    
    console.log('[Admin Analytics] getCityRevenue billing data count:', billingData.length);
    
    // Get city information from MongoDB for each booking
    // Use models defined at top of file (Flight, Hotel, Car)
    const cityRevenueMap = new Map();
    
    for (const row of billingData) {
      try {
        let city = null;
        
        if (row.booking_type === 'Hotel') {
          const hotel = await Hotel.findOne({ hotel_id: row.reference_id }).lean();
          if (hotel && hotel.address && hotel.address.city) {
            city = hotel.address.city;
          }
        } else if (row.booking_type === 'Car') {
          const car = await Car.findOne({ car_id: row.reference_id }).lean();
          if (car && car.pickup_city) {
            city = car.pickup_city;
          }
        }
        // Flights don't have city revenue in the same way, skip them
        
        if (city) {
          const revenue = parseFloat(row.total_amount_paid) || 0;
          if (cityRevenueMap.has(city)) {
            cityRevenueMap.set(city, cityRevenueMap.get(city) + revenue);
          } else {
            cityRevenueMap.set(city, revenue);
          }
        }
      } catch (error) {
        console.error(`[Admin Analytics] Error processing city revenue for ${row.reference_id}:`, error.message);
        // Continue processing other rows
      }
    }
    
    console.log('[Admin Analytics] getCityRevenue city map size:', cityRevenueMap.size);
    
    // Convert map to array and sort
    const result = Array.from(cityRevenueMap.entries())
      .map(([city, total_revenue]) => ({
        city,
        total_revenue,
        transaction_count: 0 // We don't track this separately now
      }))
      .sort((a, b) => b.total_revenue - a.total_revenue);

    const response = {
      success: true,
      year: yearNum,
      count: result.length,
      data: result
    };

    console.log('[Admin Analytics] getCityRevenue response:', {
      success: response.success,
      count: response.count,
      dataLength: response.data?.length || 0
    });

    // Cache the result in Redis with TTL
    try {
      await redisSet(cacheKey, JSON.stringify(response), REDIS_TTL);
      console.log(`[Admin Analytics] Cached city revenue: ${cacheKey}`);
    } catch (redisError) {
      console.warn('[Admin Analytics] Failed to cache city revenue:', redisError.message);
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('[Admin Analytics] getCityRevenue error:', error);
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

    // Build cache key
    const cacheKey = `analytics:top-providers:${yearNum}:${monthNum}`;

    // Check Redis cache first (cache-aside pattern)
    try {
      const cached = await redisGet(cacheKey);
      if (cached) {
        const cachedResult = JSON.parse(cached);
        console.log(`[Admin Analytics] Cache HIT for top providers: ${cacheKey}`);
        return res.status(200).json({
          ...cachedResult,
          cached: true
        });
      }
      console.log(`[Admin Analytics] Cache MISS for top providers: ${cacheKey}`);
    } catch (redisError) {
      console.warn('[Admin Analytics] Redis cache miss or error, falling back to MongoDB:', redisError.message);
    }

    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 1);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Query MySQL for billing and booking data
    const sql = `
      SELECT 
        b.booking_type,
        b.reference_id,
        bill.total_amount_paid
      FROM billings bill
      INNER JOIN bookings b ON bill.booking_id = b.booking_id
      WHERE bill.transaction_date >= ? 
        AND bill.transaction_date < ?
        AND bill.transaction_status = 'Success'
    `;
    
    console.log('[Admin Analytics] getTopProviders SQL:', sql);
    console.log('[Admin Analytics] getTopProviders date range:', startDateStr, 'to', endDateStr);
    
    const billingData = await mysqlQuery(sql, [startDateStr, endDateStr]);
    
    console.log('[Admin Analytics] getTopProviders billing data count:', billingData.length);
    
    // Get provider information from MongoDB for each booking
    // Use models defined at top of file (Flight, Hotel, Car)
    const providerMap = new Map();
    
    for (const row of billingData) {
      try {
        let provider_name = null;
        let provider_id = null;
        
        if (row.booking_type === 'Flight') {
          const flight = await Flight.findOne({ flight_id: row.reference_id }).lean();
          if (flight) {
            provider_name = flight.airline_name;
            provider_id = flight.provider_id || null;
          }
        } else if (row.booking_type === 'Car') {
          const car = await Car.findOne({ car_id: row.reference_id }).lean();
          if (car) {
            provider_name = car.provider_name;
            provider_id = car.provider_id || null;
          }
        } else if (row.booking_type === 'Hotel') {
          const hotel = await Hotel.findOne({ hotel_id: row.reference_id }).lean();
          if (hotel) {
            // Try to get provider name from Provider collection if provider_id exists
            if (hotel.provider_id) {
              const provider = await Provider.findOne({ provider_id: hotel.provider_id }).lean();
              provider_name = provider ? provider.provider_name : 'Hotel Chain';
              provider_id = hotel.provider_id;
            } else {
              provider_name = 'Hotel Chain';
              provider_id = null;
            }
          } else {
            provider_name = 'Hotel Chain';
            provider_id = null;
          }
        }
        
        if (provider_name) {
          const key = provider_id || provider_name;
          const revenue = parseFloat(row.total_amount_paid) || 0;
          
          if (providerMap.has(key)) {
            const existing = providerMap.get(key);
            existing.total_revenue += revenue;
            existing.properties_sold += 1;
          } else {
            providerMap.set(key, {
              provider_id: provider_id,
              provider_name: provider_name,
              total_revenue: revenue,
              properties_sold: 1
            });
          }
        }
      } catch (error) {
        console.error(`[Admin Analytics] Error processing provider for ${row.reference_id}:`, error.message);
        // Continue processing other rows
      }
    }
    
    console.log('[Admin Analytics] getTopProviders provider map size:', providerMap.size);
    
    // Convert map to array, sort, and limit to top 10
    const result = Array.from(providerMap.values())
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, 10);

    const response = {
      success: true,
      month: monthNum,
      year: yearNum,
      count: result.length,
      data: result
    };

    console.log('[Admin Analytics] getTopProviders response:', {
      success: response.success,
      count: response.count,
      dataLength: response.data?.length || 0
    });

    // Cache the result in Redis with TTL
    try {
      await redisSet(cacheKey, JSON.stringify(response), REDIS_TTL);
      console.log(`[Admin Analytics] Cached top providers: ${cacheKey}`);
    } catch (redisError) {
      console.warn('[Admin Analytics] Failed to cache top providers:', redisError.message);
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('[Admin Analytics] getTopProviders error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch top providers'
    });
  }
};

const getBills = async (req, res) => {
  try {
    const { date, month, year } = req.query;

    // Build cache key
    const cacheKey = `analytics:bills:${date || ''}:${month || ''}:${year || ''}`;

    // Check Redis cache first (cache-aside pattern)
    try {
      const cached = await redisGet(cacheKey);
      if (cached) {
        const cachedResult = JSON.parse(cached);
        console.log(`[Admin Analytics] Cache HIT for bills: ${cacheKey}`);
        return res.status(200).json({
          ...cachedResult,
          cached: true
        });
      }
      console.log(`[Admin Analytics] Cache MISS for bills: ${cacheKey}`);
    } catch (redisError) {
      console.warn('[Admin Analytics] Redis cache miss or error, falling back to MySQL:', redisError.message);
    }

    // Build SQL query
    let sql = 'SELECT * FROM billings WHERE 1=1';
    const params = [];

    if (date) {
      // Handle different date formats: YYYY-MM-DD, MM/DD/YYYY, etc.
      let dateValue = date;
      // If date is in MM/DD/YYYY format, convert to YYYY-MM-DD
      if (date.includes('/')) {
        const parts = date.split('/');
        if (parts.length === 3) {
          // Assume MM/DD/YYYY format
          dateValue = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
        }
      }
      // Use DATE() function to compare just the date part, ignoring time and timezone
      // CAST the parameter to DATE to ensure proper comparison
      sql += ' AND DATE(transaction_date) = CAST(? AS DATE)';
      params.push(dateValue);
    } else if (month && year) {
      // Make sure month and year are properly parsed
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      if (!isNaN(monthNum) && !isNaN(yearNum) && monthNum >= 1 && monthNum <= 12) {
        sql += ' AND YEAR(transaction_date) = ? AND MONTH(transaction_date) = ?';
        params.push(yearNum, monthNum);
      }
    }

    sql += ' ORDER BY transaction_date DESC LIMIT 1000';

    console.log('[Admin Analytics] getBills SQL:', sql);
    console.log('[Admin Analytics] getBills params:', params);
    
    const bills = await mysqlQuery(sql, params);
    
    console.log('[Admin Analytics] getBills result count:', bills.length);

    // Parse invoice_details JSON if present
    const parsedBills = bills.map(bill => {
      if (bill.invoice_details && typeof bill.invoice_details === 'string') {
        try {
          bill.invoice_details = JSON.parse(bill.invoice_details);
        } catch (e) {
          // Keep as string if parsing fails
        }
      }
      return bill;
    });

    const response = {
      success: true,
      count: parsedBills.length,
      data: parsedBills
    };

    // Cache the result in Redis with TTL
    try {
      await redisSet(cacheKey, JSON.stringify(response), REDIS_TTL);
      console.log(`[Admin Analytics] Cached bills: ${cacheKey}`);
    } catch (redisError) {
      console.warn('[Admin Analytics] Failed to cache bills:', redisError.message);
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('[Admin Analytics] Get bills error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch bills'
    });
  }
};

const getClicksPerPage = async (req, res) => {
  try {
    // Build cache key
    const cacheKey = `analytics:page-activity:all`;

    // Check Redis cache first (cache-aside pattern)
    try {
      const cached = await redisGet(cacheKey);
      if (cached) {
        const cachedResult = JSON.parse(cached);
        console.log(`[Admin Analytics] Cache HIT for page activity: ${cacheKey}`);
        return res.status(200).json({
          ...cachedResult,
          cached: true
        });
      }
      console.log(`[Admin Analytics] Cache MISS for page activity: ${cacheKey}`);
    } catch (redisError) {
      console.warn('[Admin Analytics] Redis cache miss or error, falling back to MongoDB:', redisError.message);
    }

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

    const response = {
      success: true,
      count: result.length,
      data: result
    };

    // Cache the result in Redis with TTL
    try {
      await redisSet(cacheKey, JSON.stringify(response), REDIS_TTL);
      console.log(`[Admin Analytics] Cached page activity: ${cacheKey}`);
    } catch (redisError) {
      console.warn('[Admin Analytics] Failed to cache page activity:', redisError.message);
    }

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch clicks per page'
    });
  }
};

const getListingClicks = async (req, res) => {
  try {
    const { listing_id } = req.query;

    // Build cache key
    const cacheKey = listing_id 
      ? `analytics:listing-clicks:${listing_id}`
      : `analytics:listing-clicks:all`;

    // Check Redis cache first (cache-aside pattern)
    try {
      const cached = await redisGet(cacheKey);
      if (cached) {
        const cachedResult = JSON.parse(cached);
        console.log(`[Admin Analytics] Cache HIT for listing clicks: ${cacheKey}`);
        return res.status(200).json({
          ...cachedResult,
          cached: true
        });
      }
      console.log(`[Admin Analytics] Cache MISS for listing clicks: ${cacheKey}`);
    } catch (redisError) {
      console.warn('[Admin Analytics] Redis cache miss or error, falling back to MongoDB:', redisError.message);
    }

    const matchStage = listing_id ? { $match: { listing_id } } : { $match: {} };
    const result = await ListingClickLog.aggregate([
      matchStage,
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

    const response = {
      success: true,
      count: result.length,
      data: result
    };

    // Cache the result in Redis with TTL
    try {
      await redisSet(cacheKey, JSON.stringify(response), REDIS_TTL);
      console.log(`[Admin Analytics] Cached listing clicks: ${cacheKey}`);
    } catch (redisError) {
      console.warn('[Admin Analytics] Failed to cache listing clicks:', redisError.message);
    }

    res.status(200).json(response);
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

// Provider-specific analytics endpoints
const getProviderClicksPerPage = async (req, res) => {
  try {
    const { provider_id } = req.params;
    const { provider_name } = req.query;
    
    if (!provider_id && !provider_name) {
      return res.status(400).json({
        success: false,
        error: 'Provider ID or Provider Name is required'
      });
    }

    // Get provider info if provider_id is provided
    let providerInfo = null;
    if (provider_id) {
      providerInfo = await Provider.findOne({ provider_id }).lean();
      if (providerInfo) {
        provider_name = providerInfo.provider_name;
      }
    }

    // Get all listing IDs for this provider and determine listing types
    const listingIds = await getProviderListingIds(provider_id, provider_name);
    
    // Determine what types of listings this provider has
    let hasHotels = false;
    let hasFlights = false;
    let hasCars = false;
    
    if (provider_id) {
      const hotelCount = await Hotel.countDocuments({ 
        $or: [
          { provider_id },
          { name: { $regex: new RegExp(provider_name || '', 'i') } }
        ]
      });
      const flightCount = await Flight.countDocuments({ 
        $or: [
          { provider_id },
          { airline_name: provider_name }
        ]
      });
      const carCount = await Car.countDocuments({ 
        $or: [
          { provider_id },
          { provider_name }
        ]
      });
      hasHotels = hotelCount > 0;
      hasFlights = flightCount > 0;
      hasCars = carCount > 0;
    } else if (provider_name) {
      const hotelCount = await Hotel.countDocuments({ 
        name: { $regex: new RegExp(provider_name, 'i') } 
      });
      const flightCount = await Flight.countDocuments({ airline_name: provider_name });
      const carCount = await Car.countDocuments({ provider_name });
      hasHotels = hotelCount > 0;
      hasFlights = flightCount > 0;
      hasCars = carCount > 0;
    }
    
    // Build match conditions for pages
    // Include: 1) Detail pages with listing IDs, 2) Search pages for relevant listing types
    const matchConditions = [];
    
    // Match detail pages that contain listing IDs (e.g., /hotels/123, /flights/456)
    if (listingIds.length > 0) {
      const escapedListingIds = listingIds.map(id => id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const listingIdPattern = new RegExp(`(${escapedListingIds.join('|')})`, 'i');
      matchConditions.push({ page: { $regex: listingIdPattern } });
    }
    
    // Match search pages based on provider's listing types
    if (hasHotels) {
      matchConditions.push({ page: { $regex: /^\/hotels(\/|$|\?|&)/i } });
    }
    if (hasFlights) {
      matchConditions.push({ page: { $regex: /^\/flights(\/|$|\?|&)/i } });
    }
    if (hasCars) {
      matchConditions.push({ page: { $regex: /^\/cars(\/|$|\?|&)/i } });
    }
    
    if (matchConditions.length === 0) {
      return res.status(200).json({
        success: true,
        provider_id: provider_id || null,
        provider_name: provider_name || null,
        count: 0,
        data: [],
        message: 'No listings found for this provider'
      });
    }
    
    console.log(`[Admin Analytics] getProviderClicksPerPage - Provider: ${provider_name || provider_id}`);
    console.log(`[Admin Analytics] - Listing types: Hotels=${hasHotels}, Flights=${hasFlights}, Cars=${hasCars}`);
    console.log(`[Admin Analytics] - Matching ${listingIds.length} listing IDs + search pages`);
    console.log(`[Admin Analytics] - Sample listing IDs: ${listingIds.slice(0, 5).join(', ')}`);
    
    const result = await PageClickLog.aggregate([
      {
        $match: {
          $or: matchConditions
        }
      },
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
      provider_id: provider_id || null,
      provider_name: provider_name || null,
      count: result.length,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch provider clicks per page'
    });
  }
};

const getProviderListingClicks = async (req, res) => {
  try {
    console.log(`[Admin Analytics] getProviderListingClicks - FUNCTION CALLED`);
    const { provider_id } = req.params;
    const { provider_name } = req.query;
    
    console.log(`[Admin Analytics] getProviderListingClicks - Received params: provider_id="${provider_id}", provider_name="${provider_name}"`);
    
    if (!provider_id && !provider_name) {
      return res.status(400).json({
        success: false,
        error: 'Provider ID or Provider Name is required'
      });
    }

    // Get provider info if provider_id is provided
    let providerInfo = null;
    let actualProviderId = provider_id;
    
    // Try to find provider - first by provider_id, then by provider_name
    if (provider_id) {
      providerInfo = await Provider.findOne({ provider_id }).lean();
      if (providerInfo) {
        provider_name = providerInfo.provider_name || provider_name;
        actualProviderId = providerInfo.provider_id;
      } else if (provider_name) {
        // If provider_id lookup failed, try by provider_name (case-insensitive)
        providerInfo = await Provider.findOne({ 
          provider_name: { $regex: new RegExp(`^${provider_name}$`, 'i') } 
        }).lean();
        if (providerInfo && providerInfo.provider_id) {
          actualProviderId = providerInfo.provider_id;
        }
      }
    } else if (provider_name) {
      // Try to find provider by name (case-insensitive)
      providerInfo = await Provider.findOne({ 
        provider_name: { $regex: new RegExp(`^${provider_name}$`, 'i') } 
      }).lean();
      if (providerInfo && providerInfo.provider_id) {
        actualProviderId = providerInfo.provider_id;
      }
    }

    // Build match query - try provider_id first (more direct), then fall back to listing IDs
    const matchQuery = {};
    
    // First, try to match by provider_id if available in click logs
    // Click logs may have provider_id field even if not in schema (MongoDB allows extra fields)
    // Provider IDs in click logs are typically uppercase (e.g., "MARRIOTT", "HERTZ")
    if (actualProviderId) {
      // Try exact match first
      matchQuery.provider_id = { $regex: new RegExp(`^${actualProviderId}$`, 'i') };
      console.log(`[Admin Analytics] Matching by provider_id (case-insensitive): ${actualProviderId}`);
    }
    
    // Also get listing IDs as fallback (in case some click logs don't have provider_id)
    const listingIds = await getProviderListingIds(actualProviderId || provider_id, provider_name);
    console.log(`[Admin Analytics] getProviderListingClicks - Provider lookup result:`);
    console.log(`  - provider_id param: ${provider_id}`);
    console.log(`  - provider_name param: ${provider_name}`);
    console.log(`  - actualProviderId found: ${actualProviderId || 'N/A'}`);
    console.log(`  - Found ${listingIds.length} listing IDs:`, listingIds.slice(0, 10));
    
    // Build $or query to match by either provider_id OR listing_id
    const orConditions = [];
    
    if (matchQuery.provider_id) {
      orConditions.push({ provider_id: matchQuery.provider_id });
    }
    
    if (listingIds.length > 0) {
      orConditions.push({ listing_id: { $in: listingIds } });
    }
    
    if (orConditions.length === 0) {
      return res.status(200).json({
        success: true,
        provider_id: provider_id || null,
        provider_name: provider_name || null,
        count: 0,
        data: [],
        message: 'No listings found for this provider'
      });
    }
    
    // Use $or to match by either provider_id or listing_id
    matchQuery.$or = orConditions;
    delete matchQuery.provider_id; // Remove the direct provider_id since we're using $or
    
    console.log(`[Admin Analytics] getProviderListingClicks - Using $or query with ${orConditions.length} conditions`);
    console.log(`[Admin Analytics] Match query conditions:`, JSON.stringify(orConditions, null, 2));

    // Check what click logs exist in database
    const allClicks = await ListingClickLog.find({}).limit(10).lean();
    console.log(`[Admin Analytics] Sample click logs in DB (${allClicks.length} total samples):`, allClicks.map(c => ({ 
      listing_type: c.listing_type, 
      listing_id: c.listing_id,
      provider_id: c.provider_id || 'N/A',
      timestamp: c.timestamp 
    })));
    
    // Check if any click logs match our listing IDs
    if (listingIds.length > 0) {
      const matchingClicks = await ListingClickLog.find({ listing_id: { $in: listingIds } }).limit(5).lean();
      console.log(`[Admin Analytics] Click logs matching listing IDs (${matchingClicks.length} found):`, matchingClicks.map(c => ({
        listing_id: c.listing_id,
        listing_type: c.listing_type,
        provider_id: c.provider_id || 'N/A'
      })));
    }

    // Normalize listing_type to handle case-insensitive matching
    // Click logs may have "hotel" but we want "Hotel"
    const result = await ListingClickLog.aggregate([
      {
        $match: matchQuery
      },
      {
        $addFields: {
          normalized_type: {
            $concat: [
              { $toUpper: { $substr: ['$listing_type', 0, 1] } },
              { $toLower: { $substr: ['$listing_type', 1, -1] } }
            ]
          }
        }
      },
      {
        $group: {
          _id: {
            type: '$normalized_type',
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
      { $sort: { total_clicks: -1 } }
    ]);

    console.log(`[Admin Analytics] getProviderListingClicks - Final result: ${result.length} records`);
    if (result.length > 0) {
      console.log(`[Admin Analytics] Sample results:`, result.slice(0, 3));
    } else {
      console.log(`[Admin Analytics] WARNING: No results found for provider "${provider_name || provider_id}"`);
      console.log(`[Admin Analytics] Match query used:`, JSON.stringify(matchQuery, null, 2));
    }

    res.status(200).json({
      success: true,
      provider_id: provider_id || null,
      provider_name: provider_name || null,
      count: result.length,
      data: result
    });
  } catch (error) {
    console.error(`[Admin Analytics] getProviderListingClicks - ERROR:`, error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch provider listing clicks'
    });
  }
};

const getProviderLeastSeenSections = async (req, res) => {
  try {
    const { provider_id } = req.params;
    const { provider_name } = req.query;
    
    if (!provider_id && !provider_name) {
      return res.status(400).json({
        success: false,
        error: 'Provider ID or Provider Name is required'
      });
    }

    // Get provider info if provider_id is provided
    let providerInfo = null;
    if (provider_id) {
      providerInfo = await Provider.findOne({ provider_id }).lean();
      if (providerInfo) {
        provider_name = providerInfo.provider_name;
      }
    }

    // Get all listing IDs for this provider
    const listingIds = await getProviderListingIds(provider_id, provider_name);
    
    if (listingIds.length === 0) {
      return res.status(200).json({
        success: true,
        provider_id: provider_id || null,
        provider_name: provider_name || null,
        count: 0,
        data: [],
        message: 'No listings found for this provider'
      });
    }

    const result = await PageClickLog.aggregate([
      {
        $match: {
          $or: [
            { page: { $regex: new RegExp(listingIds.join('|'), 'i') } },
            { listing_id: { $in: listingIds } }
          ]
        }
      },
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
      provider_id: provider_id || null,
      provider_name: provider_name || null,
      count: result.length,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch provider least seen sections'
    });
  }
};

const getProviderReviews = async (req, res) => {
  try {
    const { provider_id } = req.params;
    const { provider_name } = req.query;
    
    if (!provider_id && !provider_name) {
      return res.status(400).json({
        success: false,
        error: 'Provider ID or Provider Name is required'
      });
    }

    // Get provider info if provider_id is provided
    let providerInfo = null;
    if (provider_id) {
      providerInfo = await Provider.findOne({ provider_id }).lean();
      if (providerInfo) {
        provider_name = providerInfo.provider_name;
      }
    }

    // Get all listing IDs for this provider
    const listingIds = await getProviderListingIds(provider_id, provider_name);
    
    if (listingIds.length === 0) {
      return res.status(200).json({
        success: true,
        provider_id: provider_id || null,
        provider_name: provider_name || null,
        count: 0,
        data: [],
        message: 'No listings found for this provider'
      });
    }

    const reviews = await Review.find({
      entity_id: { $in: listingIds }
    }).lean();

    // Aggregate reviews by listing
    const reviewSummary = {};
    reviews.forEach(review => {
      const key = `${review.entity_type}-${review.entity_id}`;
      if (!reviewSummary[key]) {
        reviewSummary[key] = {
          entity_type: review.entity_type,
          entity_id: review.entity_id,
          count: 0,
          totalRating: 0,
          ratings: []
        };
      }
      reviewSummary[key].count++;
      reviewSummary[key].totalRating += review.rating || 0;
      reviewSummary[key].ratings.push(review.rating || 0);
    });

    const result = Object.values(reviewSummary).map(r => ({
      ...r,
      avgRating: r.totalRating / r.count,
      minRating: Math.min(...r.ratings),
      maxRating: Math.max(...r.ratings)
    })).sort((a, b) => b.count - a.count);

    res.status(200).json({
      success: true,
      provider_id: provider_id || null,
      provider_name: provider_name || null,
      count: result.length,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch provider reviews'
    });
  }
};

const getProviderUserTraces = async (req, res) => {
  try {
    const { provider_id } = req.params;
    const { user_id, cohort, provider_name } = req.query;
    
    if (!provider_id && !provider_name) {
      return res.status(400).json({
        success: false,
        error: 'Provider ID or Provider Name is required'
      });
    }

    // Get provider info if provider_id is provided
    let providerInfo = null;
    let finalProviderName = provider_name;
    if (provider_id) {
      providerInfo = await Provider.findOne({ provider_id }).lean();
      if (providerInfo) {
        finalProviderName = providerInfo.provider_name;
      }
    }

    // Get all listing IDs for this provider
    const listingIds = await getProviderListingIds(provider_id, finalProviderName);
    
    if (listingIds.length === 0) {
      return res.status(200).json({
        success: true,
        provider_id: provider_id || null,
        provider_name: finalProviderName || null,
        count: 0,
        data: [],
        message: 'No listings found for this provider'
      });
    }

    const query = {};
    if (user_id) query.user_id = user_id;
    if (cohort) query.cohort_key = cohort;
    
    // Filter traces that relate to this provider's listings
    const traces = await UserTrace.find(query).lean();
    const filteredTraces = traces.filter(trace => {
      // Check if trace page or action contains any listing ID
      const page = trace.page || '';
      const action = trace.action || '';
      const combined = `${page} ${action}`.toLowerCase();
      return listingIds.some(id => combined.includes(id.toLowerCase()));
    });

    res.status(200).json({
      success: true,
      provider_id: provider_id || null,
      provider_name: finalProviderName || null,
      count: filteredTraces.length,
      data: filteredTraces.slice(0, 100) // Limit to 100
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch provider user traces'
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
  getUserTrace,
  getProviderClicksPerPage,
  getProviderListingClicks,
  getProviderLeastSeenSections,
  getProviderReviews,
  getProviderUserTraces
};

