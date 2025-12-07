const { Kafka } = require('kafkajs');

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'kafka:9092';
console.log(`[Billing Service] Kafka broker configured: ${KAFKA_BROKER}`);
const KAFKA_TOPICS = {
  BOOKING_EVENTS: 'booking.events',
  BILLING_EVENTS: 'billing.events',
};

const brokerHost = KAFKA_BROKER.split(':')[0];
const brokerPort = KAFKA_BROKER.split(':')[1] || '9092';
const brokerAddress = `${brokerHost}:${brokerPort}`;

const kafka = new Kafka({
  clientId: 'billing-service',
  brokers: [brokerAddress],
  connectionTimeout: 1500,
  requestTimeout: 2000,
  retry: {
    initialRetryTime: 50,
    retries: 0, // No retries - fail immediately
    maxRetryTime: 100
  }
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'billing-service-group' });

let kafkaConnected = false;

const initializeKafka = async () => {
  const connectionTimeout = 1000; // 1 second - fail fast
  
  try {
    const connectPromise = producer.connect();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Kafka connection timeout')), connectionTimeout)
    );
    
    await Promise.race([connectPromise, timeoutPromise]);
    
    console.log(`[Billing Service] ✓ Kafka producer connected to ${brokerAddress}`);
    kafkaConnected = true;
    
    // Consumer in background
    consumer.connect().then(() => {
      return consumer.subscribe({ topics: [KAFKA_TOPICS.BOOKING_EVENTS] });
    }).then(() => {
      console.log('[Billing Service] ✓ Kafka consumer connected');
    }).catch(() => {
      // Silently fail
    });
  } catch (error) {
    // Silently continue without Kafka
    kafkaConnected = false;
  }
};

const publishBillingEvent = async (eventType, data) => {
  if (!kafkaConnected) {
    return;
  }
  
  // Fire-and-forget: Non-blocking async
  producer.send({
    topic: KAFKA_TOPICS.BILLING_EVENTS,
    messages: [{
      key: data.billing_id || (data._id ? data._id.toString() : ''),
      value: JSON.stringify({
        event_type: eventType,
        timestamp: new Date(),
        data
      })
    }]
  }).catch(error => {
    console.error(`[Billing Service] Failed to publish event (non-blocking): ${error.message}`);
  });
  
  return Promise.resolve();
};

module.exports = {
  producer,
  consumer,
  initializeKafka,
  publishBillingEvent
};

