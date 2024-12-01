const Redis = require('ioredis');
const config = require('../config');

class CacheService {
  constructor() {
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      keyPrefix: 'cache:',
      // Thêm các tùy chọn khác nếu cần
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });
  }

  async get(key) {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache Get Error:', error);
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    try {
      await this.redis.set(
        key,
        JSON.stringify(value),
        'EX',
        ttl
      );
      return true;
    } catch (error) {
      console.error('Cache Set Error:', error);
      return false;
    }
  }

  async delete(key) {
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error('Cache Delete Error:', error);
      return false;
    }
  }
}

module.exports = new CacheService(); 