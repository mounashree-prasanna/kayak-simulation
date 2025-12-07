const { Kafka } = require('kafkajs');

// Get Kafka broker from environment, with proper fallback
const KAFKA_BROKER = process.env.KAFKA_BROKER || 'kafka:9092';
const KAFKA_TOPICS = {
  USER_EVENTS: 'user.events',
  BOOKING_EVENTS: 'booking.events',
  BILLING_EVENTS: 'billing.events',
  DEAL_EVENTS: 'deal.events',
  TRACKING_EVENTS: 'tracking.events',
};

// Log the broker being used for debugging
console.log(`[Booking Service] Kafka broker configured: ${KAFKA_BROKER}`);

// Parse broker address
const brokerHost = KAFKA_BROKER.split(':')[0];
const brokerPort = KAFKA_BROKER.split(':')[1] || '9092';
const brokerAddress = `${brokerHost}:${brokerPort}`;

console.log(`[Booking Service] Using Kafka broker: ${brokerAddress}`);

const kafka = new Kafka({
  clientId: 'booking-service',
  brokers: [brokerAddress],
  connectionTimeout: 2000, // Very fast timeout - fail quickly
  requestTimeout: 3000,
  retry: {
    initialRetryTime: 50,
    retries: 1, // Minimal retries - fail fast
    multiplier: 1.5,
    maxRetryTime: 500
  }
});

const producer = kafka.producer({
  maxInFlightRequests: 1,
  idempotent: true,
  transactionTimeout: 30000,
});

const consumer = kafka.consumer({ 
  groupId: 'booking-service-group',
  sessionTimeout: 30000,
  heartbeatInterval: 3000,
  retry: {
    retries: 0, // Disable consumer retries to fail fast
  }
});

let kafkaConnected = false;

const initializeKafka = async () => {
  // Try to connect, but don't block service startup if it fails
  // Set a very short timeout to fail fast
  const connectionTimeout = 1500; // 1.5 seconds max - fail very fast
  
  try {
    console.log(`[Booking Service] Attempting Kafka connection to ${brokerAddress}...`);
    
    // Only try producer - consumer can connect later if needed
    const connectPromise = producer.connect();
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Kafka connection timeout')), connectionTimeout)
    );
    
    await Promise.race([connectPromise, timeoutPromise]);
    
    console.log(`[Booking Service] ✓ Kafka producer connected to ${brokerAddress}`);
    kafkaConnected = true;
    
    // Try consumer in background (don't block)
    consumer.connect().then(() => {
      return consumer.subscribe({ topics: [KAFKA_TOPICS.BILLING_EVENTS] });
    }).then(() => {
      console.log('[Booking Service] ✓ Kafka consumer connected and subscribed');
    }).catch(err => {
      // Silently fail - consumer is optional
    });
    
  } catch (error) {
    // Silently continue without Kafka - don't log errors to reduce noise
    kafkaConnected = false;
    // Service continues normally without Kafka
  }
};

const publishBookingEvent = async (eventType, data) => {
  if (!kafkaConnected) {
    // Silently skip if Kafka not connected - don't block the request
    return;
  }
  
  // Fire-and-forget: Don't await, let it run in background
  // This makes Kafka truly async and non-blocking
  producer.send({
    topic: KAFKA_TOPICS.BOOKING_EVENTS,
    messages: [{
      key: data.booking_id || (data._id ? data._id.toString() : ''),
      value: JSON.stringify({
        event_type: eventType,
        timestamp: new Date(),
        data
      })
    }]
  }).catch(error => {
    // Only log errors, don't throw - this is fire-and-forget
    console.error(`[Booking Service] Failed to publish event (non-blocking): ${error.message}`);
  });
  
  // Return immediately without waiting for Kafka
  return Promise.resolve();
};

module.exports = {
  producer,
  consumer,
  initializeKafka,
  publishBookingEvent
};

