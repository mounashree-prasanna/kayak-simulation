const redis = require('redis');

// Redis connection configuration
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT) || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || null;

// Create Redis client
let client = null;

/**
 * Initialize Redis connection
 * @returns {Promise<redis.RedisClient>} Redis client instance
 */
const connectRedis = async () => {
  try {
    // Check if client exists and is connected
    if (client) {
      try {
        // Try to ping to check if connection is alive
        await client.ping();
        return client;
      } catch (err) {
        // Connection is dead, create new one
        client = null;
      }
    }

    const redisConfig = {
      socket: {
        host: REDIS_HOST,
        port: REDIS_PORT,
        // Disable IPv6 to avoid connection issues
        family: 4, // Force IPv4
      },
    };

    if (REDIS_PASSWORD) {
      redisConfig.password = REDIS_PASSWORD;
    }

    client = redis.createClient(redisConfig);

    client.on('error', (err) => {
      console.error('[Listing Service] [Redis] Connection error:', err);
    });

    client.on('connect', () => {
      console.log(`[Listing Service] [Redis] Connected to ${REDIS_HOST}:${REDIS_PORT}`);
    });

    await client.connect();
    return client;
  } catch (error) {
    console.error('[Listing Service] [Redis] Failed to connect:', error.message);
    throw error;
  }
};

/**
 * Get value from Redis by key
 * @param {string} key - Redis key
 * @returns {Promise<string|null>} Value or null if not found
 */
const get = async (key) => {
  try {
    if (!client) {
      await connectRedis();
    } else {
      // Verify connection is alive
      try {
        await client.ping();
      } catch (err) {
        await connectRedis();
      }
    }
    const value = await client.get(key);
    return value;
  } catch (error) {
    console.error(`[Listing Service] [Redis] Get error for key "${key}":`, error.message);
    throw error;
  }
};

/**
 * Set value in Redis with optional TTL
 * @param {string} key - Redis key
 * @param {string} value - Value to store
 * @param {number} ttlSeconds - Time to live in seconds (optional)
 * @returns {Promise<boolean>} Success status
 */
const set = async (key, value, ttlSeconds = null) => {
  try {
    if (!client) {
      await connectRedis();
    } else {
      // Verify connection is alive
      try {
        await client.ping();
      } catch (err) {
        await connectRedis();
      }
    }
    
    if (ttlSeconds && ttlSeconds > 0) {
      await client.setEx(key, ttlSeconds, value);
    } else {
      await client.set(key, value);
    }
    return true;
  } catch (error) {
    console.error(`[Listing Service] [Redis] Set error for key "${key}":`, error.message);
    throw error;
  }
};

/**
 * Delete a key from Redis
 * @param {string} key - Redis key
 * @returns {Promise<boolean>} Success status
 */
const del = async (key) => {
  try {
    if (!client) {
      await connectRedis();
    } else {
      // Verify connection is alive
      try {
        await client.ping();
      } catch (err) {
        await connectRedis();
      }
    }
    const result = await client.del(key);
    return result > 0;
  } catch (error) {
    console.error(`[Listing Service] [Redis] Delete error for key "${key}":`, error.message);
    throw error;
  }
};

/**
 * Delete multiple keys matching a pattern
 * @param {string} pattern - Redis key pattern (e.g., "flights:search:*")
 * @returns {Promise<number>} Number of keys deleted
 */
const delPattern = async (pattern) => {
  try {
    if (!client) {
      await connectRedis();
    } else {
      try {
        await client.ping();
      } catch (err) {
        await connectRedis();
      }
    }
    
    // Use SCAN to find all keys matching pattern
    const keys = [];
    for await (const key of client.scanIterator({ MATCH: pattern })) {
      keys.push(key);
    }
    
    if (keys.length > 0) {
      await client.del(keys);
    }
    return keys.length;
  } catch (error) {
    console.error(`[Listing Service] [Redis] Delete pattern error for "${pattern}":`, error.message);
    throw error;
  }
};

/**
 * Close Redis connection
 * @returns {Promise<void>}
 */
const disconnect = async () => {
  try {
    if (client) {
      try {
        await client.quit();
      } catch (err) {
        // Connection might already be closed
      }
      client = null;
    }
  } catch (error) {
    console.error('[Listing Service] [Redis] Disconnect error:', error.message);
  }
};

module.exports = {
  connectRedis,
  get,
  set,
  del,
  delPattern,
  disconnect,
  client: () => client
};

