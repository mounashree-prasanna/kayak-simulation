const { Kafka } = require('kafkajs');

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'kafka:9092';
console.log(`[API Gateway] Kafka broker configured: ${KAFKA_BROKER}`);

const KAFKA_TOPICS = {
  TRACKING_EVENTS: 'tracking.events',
};

const brokerHost = KAFKA_BROKER.split(':')[0];
const brokerPort = KAFKA_BROKER.split(':')[1] || '9092';
const brokerAddress = `${brokerHost}:${brokerPort}`;

const kafka = new Kafka({
  clientId: 'api-gateway',
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
    console.log(`[API Gateway] Attempting Kafka connection to ${brokerAddress}...`);
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Kafka connection timeout')), connectionTimeout)
    );
    
    await Promise.race([producer.connect(), timeoutPromise]);
    
    console.log(`[API Gateway] Kafka connected successfully to ${brokerAddress}`);
    kafkaConnected = true;
  } catch (error) {
    console.warn(`[API Gateway] Kafka connection failed (non-critical): ${error.message}. Service will continue without Kafka.`);
    kafkaConnected = false;
  }
};

module.exports = {
  producer,
  initializeKafka
};

