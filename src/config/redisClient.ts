import { Redis } from 'ioredis';

const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT!) || 6379,
  maxRetriesPerRequest: null, // for bullMQ
});

export default redisClient;
