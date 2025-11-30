const { updateBookingStatus } = require('../controllers/bookingController');

/**
 * Handle billing events from Kafka (Saga pattern)
 * Updates booking status based on billing success/failure
 */
const handleBillingEvent = async (message) => {
  try {
    const event = JSON.parse(message.value.toString());
    const { event_type, data } = event;

    if (!data || !data.booking_id) {
      console.warn('[Booking Service] Invalid billing event: missing booking_id');
      return;
    }

    const { booking_id } = data;

    // Handle billing_success event
    // Note: The booking status is already updated to Confirmed in the billing transaction,
    // but we check and update here as a safety mechanism (idempotent), and emit booking_confirmed event
    if (event_type === 'billing_success') {
      console.log(`[Booking Service] Processing billing_success for booking: ${booking_id}`);
      try {
        // Update booking status (idempotent - safe if already Confirmed)
        await updateBookingStatus(booking_id, 'Confirmed');
        console.log(`[Booking Service] Booking ${booking_id} status updated to Confirmed`);
        
        // Fetch updated booking to publish booking_confirmed event
        const BookingRepository = require('../repositories/bookingRepository');
        const updatedBooking = await BookingRepository.findByBookingId(booking_id);
        
        // Publish booking_confirmed event
        const { publishBookingEvent } = require('../config/kafka');
        if (updatedBooking) {
          await publishBookingEvent('booking_confirmed', updatedBooking);
          console.log(`[Booking Service] Published booking_confirmed event for booking: ${booking_id}`);
        }
      } catch (error) {
        console.error(`[Booking Service] Failed to update booking status to Confirmed:`, error.message);
        // In a real saga, you might want to implement compensation logic here
      }
    }
    // Handle billing_failed event - update booking to PaymentFailed
    else if (event_type === 'billing_failed') {
      console.log(`[Booking Service] Processing billing_failed for booking: ${booking_id}`);
      try {
        await updateBookingStatus(booking_id, 'PaymentFailed');
        console.log(`[Booking Service] Booking ${booking_id} status updated to PaymentFailed`);
        
        // Fetch updated booking to publish event
        const BookingRepository = require('../repositories/bookingRepository');
        const updatedBooking = await BookingRepository.findByBookingId(booking_id);
        
        // Publish booking_failed event so listing service can remove availability block
        const { publishBookingEvent } = require('../config/kafka');
        if (updatedBooking) {
          await publishBookingEvent('booking_failed', updatedBooking);
        }
      } catch (error) {
        console.error(`[Booking Service] Failed to update booking status to PaymentFailed:`, error.message);
      }
    } else {
      console.log(`[Booking Service] Ignoring billing event type: ${event_type}`);
    }
  } catch (error) {
    console.error('[Booking Service] Error processing billing event:', error.message);
    // Don't throw - allow Kafka to retry if needed
  }
};

/**
 * Start consuming billing events from Kafka
 */
const startBillingEventConsumer = async (consumer) => {
  try {
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        console.log(`[Booking Service] Received billing event from topic ${topic}, partition ${partition}`);
        await handleBillingEvent(message);
      },
    });
    console.log('[Booking Service] Billing event consumer started');
  } catch (error) {
    console.error('[Booking Service] Error starting billing event consumer:', error.message);
    throw error;
  }
};

module.exports = {
  handleBillingEvent,
  startBillingEventConsumer
};

