// redis-config.js
const redis = require('redis');

class RedisCache {
  constructor(config = {}) {
    this.config = {
      url: config.url || 'redis://localhost:6379',
      ttl: config.ttl || 3600, // 1 hour default
      keyPrefix: config.keyPrefix || 'username:',
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      ...config
    };
    
    this.client = null;
    this.connected = false;
  }

  async connect() {
    try {
      this.client = redis.createClient({
        url: this.config.url,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            console.error('Redis connection refused');
            return new Error('Redis connection refused');
          }
          
          if (options.times_connected > this.config.maxRetries) {
            console.error('Redis max retries exceeded');
            return new Error('Redis max retries exceeded');
          }
          
          return Math.min(options.attempt * this.config.retryDelay, 3000);
        }
      });

      this.client.on('error', (err) => {
        console.error('Redis error:', err);
        this.connected = false;
      });

      this.client.on('connect', () => {
        console.log('Redis connecting...');
      });

      this.client.on('ready', () => {
        console.log('✅ Redis ready');
        this.connected = true;
      });

      this.client.on('end', () => {
        console.log('Redis connection ended');
        this.connected = false;
      });

      await this.client.connect();
      
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  // Get username availability from cache
  async getUsernameAvailability(username) {
    if (!this.connected) {
      throw new Error('Redis not connected');
    }

    try {
      const key = this.config.keyPrefix + username.toLowerCase();
      const result = await this.client.get(key);
      
      if (result === null) {
        return null; // Cache miss
      }
      
      return result === 'available';
      
    } catch (error) {
      console.warn('Redis get error:', error);
      return null; // Treat as cache miss on error
    }
  }

  // Cache username availability
  async setUsernameAvailability(username, available, ttl = null) {
    if (!this.connected) {
      console.warn('Redis not connected, skipping cache write');
      return false;
    }

    try {
      const key = this.config.keyPrefix + username.toLowerCase();
      const value = available ? 'available' : 'taken';
      const expiry = ttl || this.config.ttl;
      
      await this.client.setEx(key, expiry, value);
      return true;
      
    } catch (error) {
      console.warn('Redis set error:', error);
      return false;
    }
  }

  // Batch cache operations for better performance
  async setMultipleUsernames(usernameStatusMap, ttl = null) {
    if (!this.connected) {
      console.warn('Redis not connected, skipping batch cache write');
      return false;
    }

    try {
      const pipeline = this.client.multi();
      const expiry = ttl || this.config.ttl;
      
      for (const [username, available] of Object.entries(usernameStatusMap)) {
        const key = this.config.keyPrefix + username.toLowerCase();
        const value = available ? 'available' : 'taken';
        pipeline.setEx(key, expiry, value);
      }
      
      await pipeline.exec();
      return true;
      
    } catch (error) {
      console.warn('Redis batch set error:', error);
      return false;
    }
  }

  // Invalidate cache entry
  async invalidateUsername(username) {
    if (!this.connected) {
      return false;
    }

    try {
      const key = this.config.keyPrefix + username.toLowerCase();
      await this.client.del(key);
      return true;
      
    } catch (error) {
      console.warn('Redis delete error:', error);
      return false;
    }
  }

  // Get cache statistics
  async getStats() {
    if (!this.connected) {
      return null;
    }

    try {
      const info = await this.client.info('stats');
      const keyspace = await this.client.info('keyspace');
      
      return {
        connected: this.connected,
        total_commands_processed: this.extractStat(info, 'total_commands_processed'),
        keyspace_hits: this.extractStat(info, 'keyspace_hits'),
        keyspace_misses: this.extractStat(info, 'keyspace_misses'),
        total_keys: this.extractKeyspaceKeys(keyspace),
        memory_usage: await this.client.memory('usage'),
        hit_rate: this.calculateHitRate(info)
      };
      
    } catch (error) {
      console.warn('Redis stats error:', error);
      return null;
    }
  }

  // Warm up cache with popular usernames
  async warmupCache(popularUsernames) {
    console.log(`Warming up cache with ${popularUsernames.length} popular usernames...`);
    
    const batchSize = 100;
    for (let i = 0; i < popularUsernames.length; i += batchSize) {
      const batch = popularUsernames.slice(i, i + batchSize);
      const statusMap = {};
      
      // Assume popular usernames are taken (you'd query DB in reality)
      batch.forEach(username => {
        statusMap[username] = false; // false = taken
      });
      
      await this.setMultipleUsernames(statusMap);
    }
    
    console.log('✅ Cache warmup completed');
  }

  // Flush all username-related keys (use carefully!)
  async flushUsernameCache() {
    if (!this.connected) {
      return false;
    }

    try {
      const keys = await this.client.keys(this.config.keyPrefix + '*');
      if (keys.length > 0) {
        await this.client.del(keys);
        console.log(`Flushed ${keys.length} username cache entries`);
      }
      return true;
      
    } catch (error) {
      console.warn('Redis flush error:', error);
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.connected = false;
    }
  }

  // Utility methods
  extractStat(info, statName) {
    const match = info.match(new RegExp(`${statName}:(\\d+)`));
    return match ? parseInt(match[1]) : 0;
  }

  extractKeyspaceKeys(keyspace) {
    const match = keyspace.match(/keys=(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  calculateHitRate(info) {
    const hits = this.extractStat(info, 'keyspace_hits');
    const misses = this.extractStat(info, 'keyspace_misses');
    const total = hits + misses;
    return total > 0 ? ((hits / total) * 100).toFixed(2) + '%' : '0%';
  }
}

// Redis Cluster configuration (for production scaling)
class RedisCluster {
  constructor(nodes, options = {}) {
    this.nodes = nodes; // Array of {host, port}
    this.options = {
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      ...options
    };
  }

  async connect() {
    const { Cluster } = require('ioredis');
    
    this.client = new Cluster(this.nodes, this.options);
    
    this.client.on('error', (err) => {
      console.error('Redis Cluster error:', err);
    });

    this.client.on('ready', () => {
      console.log('✅ Redis Cluster ready');
    });

    return this.client;
  }
}

module.exports = { RedisCache, RedisCluster };