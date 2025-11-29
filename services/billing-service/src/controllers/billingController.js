const BillingRepository = require('../repositories/billingRepository');
const { executeTransaction } = require('../config/mysql');
const { publishBillingEvent } = require('../config/kafka');
const { generateBillingId, generateInvoiceNumber, processPayment } = require('../utils/billingUtils');
const axios = require('axios');

const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL || 'http://localhost:3003';

const chargeBooking = async (req, res) => {
  try {
    const { user_id, booking_id, payment_method, amount } = req.body;

    // Use transaction for ACID compliance
    const result = await executeTransaction(async (connection) => {
      // Fetch booking from Booking Service
      const bookingResponse = await axios.get(`${BOOKING_SERVICE_URL}/bookings/${booking_id}`);
      const booking = bookingResponse.data.data;

      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.booking_status !== 'Pending') {
        throw new Error(`Booking is already ${booking.booking_status}`);
      }

      // Process payment (mock)
      const paymentResult = await processPayment(amount, payment_method);

      const billing_id = generateBillingId();
      const invoice_number = generateInvoiceNumber();

      const billingData = {
        billing_id,
        user_id,
        user_ref: booking.user_ref || null,
        booking_type: booking.booking_type,
        booking_id,
        booking_ref: booking.id ? booking.id.toString() : null,
        transaction_date: new Date(),
        total_amount_paid: amount,
        payment_method,
        transaction_status: paymentResult.success ? 'Success' : 'Failed',
        invoice_number,
        invoice_details: {
          line_items: [
            {
              description: `${booking.booking_type} Booking`,
              quantity: 1,
              unit_price: amount,
              total: amount
            }
          ],
          subtotal: amount,
          tax: amount * 0.08, // 8% tax
          total: amount * 1.08
        }
      };

      const savedBilling = await BillingRepository.create(billingData, connection);

      // Update booking status based on payment result
      if (paymentResult.success) {
        // Update booking status to Confirmed
        try {
          await axios.put(`${BOOKING_SERVICE_URL}/bookings/${booking_id}/confirm`, {}, { timeout: 5000 });
        } catch (error) {
          console.error('Failed to update booking status, but payment succeeded');
          // Transaction will still commit for billing, but booking update failed
        }
      } else {
        // Update booking status to Cancelled
        try {
          await axios.put(`${BOOKING_SERVICE_URL}/bookings/${booking_id}/cancel`, {}, { timeout: 5000 });
        } catch (error) {
          console.error('Failed to update booking status');
        }
      }

      return {
        billing: savedBilling,
        paymentResult
      };
    });

    // Publish Kafka event (after transaction commits)
    if (result.paymentResult.success) {
      await publishBillingEvent('billing_success', result.billing);
    } else {
      await publishBillingEvent('billing_failed', result.billing);
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

    const billing = await BillingRepository.findByBillingId(billing_id);

    if (!billing) {
      return res.status(404).json({
        success: false,
        error: 'Billing record not found'
      });
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

const searchBilling = async (req, res) => {
  try {
    const { date, month, year, user_id, status } = req.query;

    const filters = {};

    if (user_id) {
      filters.user_id = user_id;
    }

    if (status) {
      filters.status = status;
    }

    if (date) {
      filters.startDate = new Date(date);
      const nextDay = new Date(filters.startDate);
      nextDay.setDate(nextDay.getDate() + 1);
      filters.endDate = nextDay;
    } else if (month && year) {
      filters.startDate = new Date(Number(year), Number(month) - 1, 1);
      filters.endDate = new Date(Number(year), Number(month), 1);
    }

    let billings;
    if (user_id) {
      billings = await BillingRepository.findByUserId(user_id, filters);
    } else {
      // For general search without user_id, we'd need a different method
      // For now, return empty if no user_id
      billings = [];
    }

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
      // For general search without user_id, we'd need a different method
      billings = [];
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

module.exports = {
  chargeBooking,
  getBilling,
  searchBilling,
  getBillingByMonth
};
