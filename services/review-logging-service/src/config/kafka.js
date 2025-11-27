const { Kafka } = require('kafkajs');

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';
const KAFKA_TOPICS = {
  TRACKING_EVENTS: 'tracking.events',
};

const kafka = new Kafka({
  clientId: 'review-logging-service',
  brokers: [KAFKA_BROKER],
});

const producer = kafka.producer();

const initializeKafka = async () => {
  try {
    await producer.connect();
    console.log('[Review & Logging Service] Kafka producer connected');
  } catch (error) {
    console.error(`[Review & Logging Service] Kafka initialization error: ${error.message}`);
  }
};

const publishTrackingEvent = async (eventType, data) => {
  try {
    await producer.send({
      topic: KAFKA_TOPICS.TRACKING_EVENTS,
      messages: [{
        key: data.user_id || (data._id ? data._id.toString() : ''),
        value: JSON.stringify({
          event_type: eventType,
          timestamp: new Date(),
          data
        })
      }]
    });
  } catch (error) {
    console.error(`[Review & Logging Service] Failed to publish event: ${error.message}`);
  }
};

module.exports = {
  producer,
  initializeKafka,
  publishTrackingEvent
};

