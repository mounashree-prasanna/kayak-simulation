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
  clientId: 'user-service',
  brokers: [KAFKA_BROKER],
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'user-service-group' });

const initializeKafka = async () => {
  try {
    await producer.connect();
    console.log('[User Service] Kafka producer connected');
    
    await consumer.connect();
    console.log('[User Service] Kafka consumer connected');
  } catch (error) {
    console.error(`[User Service] Kafka initialization error: ${error.message}`);
  }
};

const publishUserEvent = async (eventType, data) => {
  try {
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Kafka publish timeout after 3 seconds')), 3000);
    });
    
    const sendPromise = producer.send({
      topic: KAFKA_TOPICS.USER_EVENTS,
      messages: [{
        key: data.user_id || (data._id ? data._id.toString() : ''),
        value: JSON.stringify({
          event_type: eventType,
          timestamp: new Date(),
          data
        })
      }]
    });
    
    await Promise.race([sendPromise, timeoutPromise]);
    console.log(`[User Service] Published event: ${eventType}`);
  } catch (error) {
    console.error(`[User Service] Failed to publish event: ${error.message}`);
    // Don't throw - allow the request to continue even if Kafka fails
  }
};

module.exports = {
  producer,
  consumer,
  initializeKafka,
  publishUserEvent
};

