/**
 * Booking Event Listener
 * 
 * Listens to Kafka booking events and updates MongoDB availability blocks.
 * This keeps the availability cache in sync with MySQL bookings.
 */

const { Kafka } = require('kafkajs');
const AvailabilityService = require('./availabilityService');

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';

let consumer = null;
let isRunning = false;

/**
 * Initialize Kafka consumer for booking events
 */
const initializeConsumer = async () => {
  try {
        // Handle Kafka broker URL (support both 'kafka:9093' and 'localhost:9092')
    let brokerUrl = KAFKA_BROKER;
    if (brokerUrl.includes('localhost') || brokerUrl.includes('127.0.0.1')) {
      // If localhost, try to use Docker service name
      brokerUrl = brokerUrl.replace('localhost', 'kafka').replace('127.0.0.1', 'kafka');
      // Adjust port if needed
      if (brokerUrl.includes(':9092')) {
        brokerUrl = brokerUrl.replace(':9092', ':9093');
      }
    }

    const kafka = new Kafka({
      clientId: 'listing-service-availability-sync',
      brokers: [brokerUrl]
    });

    consumer = kafka.consumer({ groupId: 'listing-service-availability-group' });

    await consumer.connect();
    await consumer.subscribe({ 
      topics: ['booking.events'],
      fromBeginning: true // Consume from beginning to catch up on missed messages
    });

    console.log('[Listing Service] Kafka consumer connected for availability sync');

    // Start consuming
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          await handleBookingEvent(event);
        } catch (error) {
          console.error('[Listing Service] Error processing booking event:', error.message);
        }
      },
    });

    isRunning = true;
    console.log('[Listing Service] Availability sync consumer started');
  } catch (error) {
    console.error('[Listing Service] Failed to initialize Kafka consumer:', error.message);
    console.warn('[Listing Service] Availability cache will not be updated in real-time');
    // Don't throw - service can continue without real-time sync
  }
};

/**
 * Handle booking events and update availability blocks
 */
const handleBookingEvent = async (event) => {
  const { event_type, data } = event;

  if (!data || !data.booking_id) {
    return;
  }

  try {
    switch (event_type) {
      case 'booking_created':
        // Add availability block
        await AvailabilityService.addBlock({
          booking_id: data.booking_id,
          booking_type: data.booking_type,
          reference_id: data.reference_id,
          start_date: data.start_date,
          end_date: data.end_date,
          booking_status: data.booking_status || 'Pending',
          user_id: data.user_id
        });
        console.log(`[Listing Service] Added availability block for booking ${data.booking_id}`);
        break;

      case 'booking_confirmed':
        // Update block status to Confirmed
        await AvailabilityService.addBlock({
          booking_id: data.booking_id,
          booking_type: data.booking_type,
          reference_id: data.reference_id,
          start_date: data.start_date,
          end_date: data.end_date,
          booking_status: 'Confirmed',
          user_id: data.user_id
        });
        console.log(`[Listing Service] Updated availability block for booking ${data.booking_id}`);
        break;

      case 'booking_cancelled':
        // Remove availability block
        await AvailabilityService.removeBlock(data.booking_id);
        console.log(`[Listing Service] Removed availability block for booking ${data.booking_id}`);
        break;

      case 'booking_failed':
      case 'payment_failed':
        // Remove availability block if payment fails
        await AvailabilityService.removeBlock(data.booking_id);
        console.log(`[Listing Service] Removed availability block for failed booking ${data.booking_id}`);
        break;

      default:
        // Ignore other event types
        break;
    }
  } catch (error) {
    console.error(`[Listing Service] Error handling booking event ${event_type}:`, error.message);
  }
};

/**
 * Stop the consumer
 */
const stopConsumer = async () => {
  if (consumer && isRunning) {
    try {
      await consumer.disconnect();
      isRunning = false;
      console.log('[Listing Service] Availability sync consumer stopped');
    } catch (error) {
      console.error('[Listing Service] Error stopping consumer:', error.message);
    }
  }
};

module.exports = {
  initializeConsumer,
  stopConsumer,
  handleBookingEvent
};

