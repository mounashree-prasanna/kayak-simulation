const { Kafka } = require('kafkajs');

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'kafka:9092';
console.log(`[User Service] Kafka broker configured: ${KAFKA_BROKER}`);
const KAFKA_TOPICS = {
  USER_EVENTS: 'user.events',
  BOOKING_EVENTS: 'booking.events',
  BILLING_EVENTS: 'billing.events',
  DEAL_EVENTS: 'deal.events',
  TRACKING_EVENTS: 'tracking.events',
};

const brokerHost = KAFKA_BROKER.split(':')[0];
const brokerPort = KAFKA_BROKER.split(':')[1] || '9092';
const brokerAddress = `${brokerHost}:${brokerPort}`;

const kafka = new Kafka({
  clientId: 'user-service',
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
const consumer = kafka.consumer({ groupId: 'user-service-group' });

let kafkaConnected = false;

const initializeKafka = async () => {
  const connectionTimeout = 5000;
  
  try {
    console.log(`[User Service] Attempting Kafka connection to ${brokerAddress}...`);
    
    const connectPromise = Promise.all([
      producer.connect(),
      consumer.connect()
    ]);
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Kafka connection timeout')), connectionTimeout)
    );
    
    await Promise.race([connectPromise, timeoutPromise]);
    
    console.log(`[User Service] Kafka connected successfully to ${brokerAddress}`);
    kafkaConnected = true;
  } catch (error) {
    console.warn(`[User Service] Kafka connection failed (non-critical): ${error.message}. Service will continue without Kafka.`);
    kafkaConnected = false;
  }
};

const publishUserEvent = async (eventType, data) => {
  if (!kafkaConnected) {
    return;
  }
  
  // Fire-and-forget: Non-blocking async
  producer.send({
    topic: KAFKA_TOPICS.USER_EVENTS,
    messages: [{
      key: data.user_id || (data._id ? data._id.toString() : ''),
      value: JSON.stringify({
        event_type: eventType,
        timestamp: new Date(),
        data
      })
    }]
  }).catch(error => {
    console.error(`[User Service] Failed to publish event (non-blocking): ${error.message}`);
  });
  
  return Promise.resolve();
};

module.exports = {
  producer,
  consumer,
  initializeKafka,
  publishUserEvent
};

