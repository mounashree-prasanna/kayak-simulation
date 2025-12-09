const BillingRepository = require('../repositories/billingRepository');
const { executeTransaction } = require('../config/mysql');
const { publishBillingEvent } = require('../config/kafka');
const { generateBillingId, generateInvoiceNumber, processPayment } = require('../utils/billingUtils');
const { get: redisGet, set: redisSet, del: redisDel } = require('../../shared/redisClient');
const axios = require('axios');

const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL || 'http://localhost:3003';

const chargeBooking = async (req, res) => {
  try {
    const { user_id, booking_id, payment_method, amount } = req.body;

    // Use transaction for ACID compliance
    const result = await executeTransaction(async (connection) => {
      let booking = null;
      try {
        const sql = 'SELECT * FROM bookings WHERE booking_id = ?';
        const [rows] = await connection.execute(sql, [booking_id]);
        if (rows[0]) {
          booking = rows[0];
        }
      } catch (mysqlError) {
        console.error('[Billing Service] MySQL query failed:', mysqlError.message);
        throw new Error('Booking not found');
      }

      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.booking_status !== 'Pending') {
        throw new Error(`Booking is already ${booking.booking_status}`);
      }

      const bookingPrice = parseFloat(booking.total_price) || 0;
      const requestedAmount = amount ? parseFloat(amount) : bookingPrice;
      
      if (Math.abs(requestedAmount - bookingPrice) > bookingPrice * 0.01 && requestedAmount !== bookingPrice) {
        console.warn(`[Billing Service] Amount mismatch: booking.total_price=${bookingPrice}, requested=${requestedAmount}. Using booking price.`);
      }
      const amountToCharge = bookingPrice;

      const paymentResult = await processPayment(amountToCharge, payment_method);

      const billing_id = generateBillingId();
      const invoice_number = generateInvoiceNumber();

      const billingData = {
        billing_id,
        user_id,
        user_ref: booking.user_ref || null,
        booking_type: booking.booking_type,
        booking_id,
        booking_ref: booking.id ? booking.id.toString() : null, // MySQL auto-increment id
        transaction_date: new Date(),
        total_amount_paid: amountToCharge, // Use booking price
        payment_method,
        transaction_status: paymentResult.success ? 'Success' : 'Failed',
        invoice_number,
        invoice_details: {
          line_items: [
            {
              description: `${booking.booking_type} Booking`,
              quantity: 1,
              unit_price: amountToCharge,
              total: amountToCharge
            }
          ],
          subtotal: amountToCharge,
          tax: amountToCharge * 0.08, // 8% tax
          total: amountToCharge * 1.08
        }
      };

      const savedBilling = await BillingRepository.create(billingData, connection);

      let bookingStatusUpdate;
      if (paymentResult.success) {
        const updateSql = `UPDATE bookings SET booking_status = 'Confirmed', updated_at = NOW() WHERE booking_id = ?`;
        const [updateResult] = await connection.execute(updateSql, [booking_id]);
        if (updateResult.affectedRows === 0) {
          throw new Error('Failed to update booking status to Confirmed');
        }
        bookingStatusUpdate = 'Confirmed';
      } else {
        const updateSql = `UPDATE bookings SET booking_status = 'PaymentFailed', updated_at = NOW() WHERE booking_id = ?`;
        const [updateResult] = await connection.execute(updateSql, [booking_id]);
        if (updateResult.affectedRows === 0) {
          throw new Error('Failed to update booking status to PaymentFailed');
        }
        bookingStatusUpdate = 'PaymentFailed';
      }

      return {
        billing: savedBilling,
        paymentResult,
        bookingStatusUpdate
      };
    });

    try {
      await redisDel(`booking:${booking_id}`);
      await redisDel(`booking:user:${user_id}:all`);
    } catch (redisError) {
      console.warn('[Billing Service] Failed to invalidate booking cache:', redisError.message);
    }

    if (result.paymentResult.success) {
      await publishBillingEvent('billing_success', result.billing);
    } else {
      await publishBillingEvent('billing_failed', result.billing);
    }

    try {
      await redisDel(`billing:${result.billing.billing_id}`);
      await redisDel(`billing:user:${result.billing.user_id}`);
      const date = new Date(result.billing.transaction_date);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      await redisDel(`billing:user:${result.billing.user_id}:${monthYear}`);
    } catch (redisError) {
      console.warn('[Billing Service] Failed to invalidate cache:', redisError.message);
    }

    res.status(result.paymentResult.success ? 201 : 402).json({
      success: result.paymentResult.success,
      data: result.billing,
      message: result.paymentResult.success ? 'Payment successful' : result.paymentResult.message
    });
  } catch (error) {
    console.error('[Billing Service] Charge booking error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to process payment'
    });
  }
};

const getBilling = async (req, res) => {
  try {
    const { billing_id } = req.params;

    const cacheKey = `billing:${billing_id}`;
    try {
      const cached = await redisGet(cacheKey);
      if (cached) {
        const cachedBilling = JSON.parse(cached);
        return res.status(200).json({
          success: true,
          data: cachedBilling,
          cached: true
        });
      }
    } catch (redisError) {
      console.warn('[Billing Service] Redis cache miss or error, falling back to MySQL:', redisError.message);
    }

    const billing = await BillingRepository.findByBillingId(billing_id);

    if (!billing) {
      return res.status(404).json({
        success: false,
        error: 'Billing record not found'
      });
    }

    try {
      await redisSet(cacheKey, JSON.stringify(billing), 3600);
    } catch (redisError) {
      console.warn('[Billing Service] Failed to cache billing:', redisError.message);
    }

    res.status(200).json({
      success: true,
      data: billing
    });
  } catch (error) {
    console.error('[Billing Service] Get billing error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch billing'
    });
  }
};

const getBillingByBookingId = async (req, res) => {
  try {
    const { booking_id } = req.params;

    const billings = await BillingRepository.findByBookingId(booking_id);

    if (!billings || billings.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Billing not found for this booking'
      });
    }

    const billing = billings[0];

    res.status(200).json({
      success: true,
      data: billing
    });
  } catch (error) {
    console.error('[Billing Service] Get billing by booking_id error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch billing'
    });
  }
};

const searchBilling = async (req, res) => {
  try {
    const { from, to, user_id, status } = req.query;

    const filters = {};

    if (user_id) {
      filters.user_id = user_id;
    }

    if (status) {
      filters.status = status;
    }

    if (from && to) {
      filters.startDate = new Date(from);
      filters.endDate = new Date(to);
      filters.endDate.setHours(23, 59, 59, 999);
    } else if (from) {
      filters.startDate = new Date(from);
    } else if (to) {
      filters.endDate = new Date(to);
      filters.endDate.setHours(23, 59, 59, 999);
    }

    const billings = await BillingRepository.search(filters);

    res.status(200).json({
      success: true,
      count: billings.length,
      data: billings
    });
  } catch (error) {
    console.error('[Billing Service] Search billing error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search billing records'
    });
  }
};

const getBillingByMonth = async (req, res) => {
  try {
    const { year, month, user_id } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        error: 'year and month parameters are required'
      });
    }

    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 1);

    const filters = {
      startDate,
      endDate
    };

    let billings;
    if (user_id) {
      billings = await BillingRepository.findByUserId(user_id, filters);
    } else {
      // Use general search for admin queries without user_id
      billings = await BillingRepository.search(filters);
    }

    res.status(200).json({
      success: true,
      count: billings.length,
      data: billings
    });
  } catch (error) {
    console.error('[Billing Service] Get billing by month error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch billing by month'
    });
  }
};

const getUserBillings = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { status } = req.query;

    // Check Redis cache first
    const filterKey = status ? `_${status}` : '';
    const cacheKey = `billing:user:${user_id}${filterKey}`;
    
    try {
      const cached = await redisGet(cacheKey);
      if (cached) {
        const cachedBillings = JSON.parse(cached);
        return res.status(200).json({
          success: true,
          count: cachedBillings.length,
          data: cachedBillings,
          cached: true
        });
      }
    } catch (redisError) {
      // If Redis fails, continue to MySQL query (graceful degradation)
      console.warn('[Billing Service] Redis cache miss or error, falling back to MySQL:', redisError.message);
    }

    // Cache miss - query MySQL
    const filters = {};
    if (status) {
      filters.status = status;
    }

    const billings = await BillingRepository.findByUserId(user_id, filters);

    // Cache the result in Redis with 30 minutes TTL
    try {
      await redisSet(cacheKey, JSON.stringify(billings), 1800);
    } catch (redisError) {
      // Log but don't fail the request if caching fails
      console.warn('[Billing Service] Failed to cache user billings:', redisError.message);
    }

    res.status(200).json({
      success: true,
      count: billings.length,
      data: billings
    });
  } catch (error) {
    console.error('[Billing Service] Get user billings error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch user billings'
    });
  }
};

const getMonthlyStats = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        error: 'year and month query parameters are required'
      });
    }

    // Check Redis cache first
    const monthYear = `${year}-${String(month).padStart(2, '0')}`;
    const cacheKey = `billing:user:${user_id}:${monthYear}`;
    
    try {
      const cached = await redisGet(cacheKey);
      if (cached) {
        const cachedStats = JSON.parse(cached);
        return res.status(200).json({
          success: true,
          data: cachedStats,
          cached: true
        });
      }
    } catch (redisError) {
      // If Redis fails, continue to MySQL query (graceful degradation)
      console.warn('[Billing Service] Redis cache miss or error, falling back to MySQL:', redisError.message);
    }

    // Cache miss - query MySQL
    const stats = await BillingRepository.getMonthlyStats(user_id, year, month);

    // Cache the result in Redis with 1 hour TTL
    try {
      await redisSet(cacheKey, JSON.stringify(stats), 3600);
    } catch (redisError) {
      // Log but don't fail the request if caching fails
      console.warn('[Billing Service] Failed to cache monthly stats:', redisError.message);
    }

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[Billing Service] Get monthly stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch monthly stats'
    });
  }
};

module.exports = {
  chargeBooking,
  getBilling,
  getBillingByBookingId,
  searchBilling,
  getBillingByMonth,
  getUserBillings,
  getMonthlyStats
};
