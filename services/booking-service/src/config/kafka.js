const { Kafka } = require('kafkajs');

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';
const KAFKA_TOPICS = {
  USER_EVENTS: 'user.events',
  BOOKING_EVENTS: 'booking.events',
  BILLING_EVENTS: 'billing.events',
  DEAL_EVENTS: 'deal.events',
  TRACKING_EVENTS: 'tracking.events',
};

const kafka = new Kafka({
  clientId: 'booking-service',
  brokers: [KAFKA_BROKER],
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'booking-service-group' });

const initializeKafka = async () => {
  try {
    await producer.connect();
    console.log('[Booking Service] Kafka producer connected');
    
    // Connect consumer for billing events (Saga pattern)
    await consumer.connect();
    await consumer.subscribe({ topics: [KAFKA_TOPICS.BILLING_EVENTS] });
    console.log('[Booking Service] Kafka consumer connected and subscribed to billing.events');
  } catch (error) {
    console.error(`[Booking Service] Kafka initialization error: ${error.message}`);
  }
};

const publishBookingEvent = async (eventType, data) => {
  try {
    await producer.send({
      topic: KAFKA_TOPICS.BOOKING_EVENTS,
      messages: [{
        key: data.booking_id || (data._id ? data._id.toString() : ''),
        value: JSON.stringify({
          event_type: eventType,
          timestamp: new Date(),
          data
        })
      }]
    });
    console.log(`[Booking Service] Published event: ${eventType}`);
  } catch (error) {
    console.error(`[Booking Service] Failed to publish event: ${error.message}`);
  }
};

module.exports = {
  producer,
  consumer,
  initializeKafka,
  publishBookingEvent
};

