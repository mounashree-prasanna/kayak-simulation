const mongoose = require('mongoose');
const axios = require('axios');
const Billing = require('../models/Billing');
const { publishBillingEvent } = require('../config/kafka');
const { generateBillingId, generateInvoiceNumber, processPayment } = require('../utils/billingUtils');

const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL || 'http://localhost:3003';

const chargeBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { user_id, booking_id, payment_method, amount } = req.body;

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

    const billing = new Billing({
      billing_id,
      user_id,
      user_ref: booking.user_ref,
      booking_type: booking.booking_type,
      booking_id,
      booking_ref: booking._id,
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
      },
      created_at: new Date(),
      updated_at: new Date()
    });

    const savedBilling = await billing.save({ session });

    if (paymentResult.success) {
      // Update booking status to Confirmed
      await axios.put(`${BOOKING_SERVICE_URL}/bookings/${booking_id}/confirm`, {}, { timeout: 5000 }).catch(() => {
        console.error('Failed to update booking status, but payment succeeded');
      });

      // Publish success event
      await publishBillingEvent('billing_success', savedBilling.toObject());
    } else {
      // Update booking status to Cancelled
      await axios.put(`${BOOKING_SERVICE_URL}/bookings/${booking_id}/cancel`, {}, { timeout: 5000 }).catch(() => {
        console.error('Failed to update booking status');
      });

      // Publish failed event
      await publishBillingEvent('billing_failed', savedBilling.toObject());
    }

    await session.commitTransaction();

    res.status(paymentResult.success ? 201 : 402).json({
      success: paymentResult.success,
      data: savedBilling,
      message: paymentResult.success ? 'Payment successful' : paymentResult.message
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to process payment'
    });
  } finally {
    session.endSession();
  }
};

const getBilling = async (req, res) => {
  try {
    const { billing_id } = req.params;

    const billing = await Billing.findOne({ billing_id });

    if (!billing) {
      res.status(404).json({
        success: false,
        error: 'Billing record not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: billing
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch billing'
    });
  }
};

const searchBilling = async (req, res) => {
  try {
    const { date, month, year, user_id, status } = req.query;

    const query = {};

    if (user_id) {
      query.user_id = user_id;
    }

    if (status) {
      query.transaction_status = status;
    }

    if (date) {
      const searchDate = new Date(date);
      const nextDay = new Date(searchDate);
      nextDay.setDate(nextDay.getDate() + 1);
      query.transaction_date = {
        $gte: searchDate,
        $lt: nextDay
      };
    } else if (month && year) {
      const startDate = new Date(Number(year), Number(month) - 1, 1);
      const endDate = new Date(Number(year), Number(month), 1);
      query.transaction_date = {
        $gte: startDate,
        $lt: endDate
      };
    }

    const billings = await Billing.find(query)
      .sort({ transaction_date: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      count: billings.length,
      data: billings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search billing records'
    });
  }
};

const getBillingByMonth = async (req, res) => {
  try {
    const { year, month } = req.query;

    if (!year || !month) {
      res.status(400).json({
        success: false,
        error: 'year and month parameters are required'
      });
      return;
    }

    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 1);

    const billings = await Billing.find({
      transaction_date: {
        $gte: startDate,
        $lt: endDate
      }
    }).sort({ transaction_date: 1 });

    res.status(200).json({
      success: true,
      count: billings.length,
      data: billings
    });
  } catch (error) {
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

