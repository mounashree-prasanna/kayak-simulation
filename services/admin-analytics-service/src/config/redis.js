const redis = require('redis');

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT) || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || null;

let client = null;

/**
 * @returns {Promise<redis.RedisClient>} 
 */
const connectRedis = async () => {
  try {
    if (client) {
      try {
        await client.ping();
        return client;
      } catch (err) {
        client = null;
      }
    }

    const redisConfig = {
      socket: {
        host: REDIS_HOST,
        port: REDIS_PORT,
        family: 4, // Force IPv4
      },
    };

    if (REDIS_PASSWORD) {
      redisConfig.password = REDIS_PASSWORD;
    }

    client = redis.createClient(redisConfig);

    client.on('error', (err) => {
      console.error('[Admin Analytics Service] [Redis] Connection error:', err);
    });

    client.on('connect', () => {
      console.log(`[Admin Analytics Service] [Redis] Connected to ${REDIS_HOST}:${REDIS_PORT}`);
    });

    await client.connect();
    return client;
  } catch (error) {
    console.error('[Admin Analytics Service] [Redis] Failed to connect:', error.message);
    throw error;
  }
};

/**
 * @param {string} key - Redis key
 * @returns {Promise<string|null>} 
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
    console.error(`[Admin Analytics Service] [Redis] Get error for key "${key}":`, error.message);
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
    console.error(`[Admin Analytics Service] [Redis] Set error for key "${key}":`, error.message);
    throw error;
  }
};

/**
 * @param {string} key - Redis key
 * @returns {Promise<boolean>} 
 */
const del = async (key) => {
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
    const result = await client.del(key);
    return result > 0;
  } catch (error) {
    console.error(`[Admin Analytics Service] [Redis] Delete error for key "${key}":`, error.message);
    throw error;
  }
};

/**
 * @param {string} pattern - Redis key pattern (e.g., "analytics:*")
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
    
    const keys = [];
    for await (const key of client.scanIterator({ MATCH: pattern })) {
      keys.push(key);
    }
    
    if (keys.length > 0) {
      await client.del(keys);
    }
    return keys.length;
  } catch (error) {
    console.error(`[Admin Analytics Service] [Redis] Delete pattern error for "${pattern}":`, error.message);
    throw error;
  }
};

/**
 * @returns {Promise<void>}
 */
const disconnect = async () => {
  try {
    if (client) {
      try {
        await client.quit();
      } catch (err) {
      }
      client = null;
    }
  } catch (error) {
    console.error('[Admin Analytics Service] [Redis] Disconnect error:', error.message);
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

