const { Kafka } = require('kafkajs');

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';
const KAFKA_TOPICS = {
  BOOKING_EVENTS: 'booking.events',
  BILLING_EVENTS: 'billing.events',
};

const kafka = new Kafka({
  clientId: 'billing-service',
  brokers: [KAFKA_BROKER],
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'billing-service-group' });

const initializeKafka = async () => {
  try {
    await producer.connect();
    console.log('[Billing Service] Kafka producer connected');
    
    await consumer.connect();
    await consumer.subscribe({ topics: [KAFKA_TOPICS.BOOKING_EVENTS] });
    console.log('[Billing Service] Kafka consumer connected and subscribed');
  } catch (error) {
    console.error(`[Billing Service] Kafka initialization error: ${error.message}`);
  }
};

const publishBillingEvent = async (eventType, data) => {
  try {
    await producer.send({
      topic: KAFKA_TOPICS.BILLING_EVENTS,
      messages: [{
        key: data.billing_id || (data._id ? data._id.toString() : ''),
        value: JSON.stringify({
          event_type: eventType,
          timestamp: new Date(),
          data
        })
      }]
    });
    console.log(`[Billing Service] Published event: ${eventType}`);
  } catch (error) {
    console.error(`[Billing Service] Failed to publish event: ${error.message}`);
  }
};

module.exports = {
  producer,
  consumer,
  initializeKafka,
  publishBillingEvent
};

