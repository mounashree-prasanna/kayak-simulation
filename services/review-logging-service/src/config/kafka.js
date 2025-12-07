const { Kafka } = require('kafkajs');

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'kafka:9092';
console.log(`[Review & Logging Service] Kafka broker configured: ${KAFKA_BROKER}`);

const KAFKA_TOPICS = {
  TRACKING_EVENTS: 'tracking.events',
};

const brokerHost = KAFKA_BROKER.split(':')[0];
const brokerPort = KAFKA_BROKER.split(':')[1] || '9092';
const brokerAddress = `${brokerHost}:${brokerPort}`;

const kafka = new Kafka({
  clientId: 'review-logging-service',
  brokers: [brokerAddress],
  connectionTimeout: 3000,
  requestTimeout: 5000,
  retry: {
    initialRetryTime: 100,
    retries: 2,
    maxRetryTime: 3000
  }
});

const producer = kafka.producer();

let kafkaConnected = false;

const initializeKafka = async () => {
  const connectionTimeout = 5000;
  
  try {
    console.log(`[Review & Logging Service] Attempting Kafka connection to ${brokerAddress}...`);
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Kafka connection timeout')), connectionTimeout)
    );
    
    await Promise.race([producer.connect(), timeoutPromise]);
    
    console.log(`[Review & Logging Service] Kafka connected successfully to ${brokerAddress}`);
    kafkaConnected = true;
  } catch (error) {
    console.warn(`[Review & Logging Service] Kafka connection failed (non-critical): ${error.message}. Service will continue without Kafka.`);
    kafkaConnected = false;
  }
};

const publishTrackingEvent = async (eventType, data) => {
  if (!kafkaConnected) {
    return;
  }
  
  // Fire-and-forget: Non-blocking async
  producer.send({
    topic: KAFKA_TOPICS.TRACKING_EVENTS,
    messages: [{
      key: data.user_id || (data._id ? data._id.toString() : ''),
      value: JSON.stringify({
        event_type: eventType,
        timestamp: new Date(),
        data
      })
    }]
  }).catch(error => {
    console.error(`[Review & Logging Service] Failed to publish event (non-blocking): ${error.message}`);
  });
  
  return Promise.resolve();
};

module.exports = {
  producer,
  initializeKafka,
  publishTrackingEvent
};

