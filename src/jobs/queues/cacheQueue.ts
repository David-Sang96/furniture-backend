import { Queue } from 'bullmq';
import redisClient from '../../config/redisClient';

const CacheQueue = new Queue('cache-invalidation', {
  connection: redisClient,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: 1000,
  },
});

export default CacheQueue;
