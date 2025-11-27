const { Kafka } = require('kafkajs');

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';
const KAFKA_TOPICS = {
  TRACKING_EVENTS: 'tracking.events',
};

const kafka = new Kafka({
  clientId: 'api-gateway',
  brokers: [KAFKA_BROKER],
});

const producer = kafka.producer();

const initializeKafka = async () => {
  try {
    await producer.connect();
    console.log('[API Gateway] Kafka producer connected');
  } catch (error) {
    console.error(`[API Gateway] Kafka initialization error: ${error.message}`);
  }
};

module.exports = {
  producer,
  initializeKafka
};

