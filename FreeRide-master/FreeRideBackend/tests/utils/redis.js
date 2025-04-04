import Redis from 'ioredis';

import { redis as redisConfig } from '../../config';

class RedisHandler {
  constructor(config) {
    this.redisClient = new Redis({
      port: config.port, // Redis port
      host: config.host, // Redis host
      db: config.rateLimiteDb
    });
  }

  async deleteAllKeys(keyPattern) {
    return this.redisClient.keys(keyPattern).then((keys) => {
      const pipeline = this.redisClient.pipeline();
      keys.forEach((key) => {
        pipeline.del(key);
      });
      return pipeline.exec();
    });
  }
}

export default new RedisHandler(redisConfig);
