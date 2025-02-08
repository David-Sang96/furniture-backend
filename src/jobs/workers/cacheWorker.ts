import { Worker } from 'bullmq';
import redisClient from '../../config/redisClient';

// Create a worker to handle cache invalidation jobs
export const cacheWorker = new Worker(
  'cache-invalidation', // Job queue name
  async (job) => {
    const { pattern } = job.data;
    await invalidateCache(pattern);
  },
  {
    connection: redisClient, // Connect to Redis
    concurrency: 5, // Process up to 5 jobs at a time
  }
);

cacheWorker.on('completed', (job) =>
  console.log(`Job completed with result ${job.id}`)
);

cacheWorker.on('failed', (job: any, err) =>
  console.log(`Job ${job.id} failed with ${err.message}`)
);

const invalidateCache = async (pattern: string) => {
  try {
    const stream = redisClient.scanStream({
      match: pattern, // Match keys using a pattern (e.g., 'user:*')
      count: 100, // Process 100 keys at a time
    });

    const pipeline = redisClient.pipeline(); // Use pipeline to batch delete commands
    let totalKeys = 0;

    // Process incoming keys
    stream.on('data', (keys: string[]) => {
      if (keys.length > 0) {
        keys.forEach((key) => {
          pipeline.del(key); // Adds delete command to the batch
          totalKeys++;
        });
      }
    });

    // Wait for scan to complete
    await new Promise<void>((resolve, reject) => {
      stream.on('end', async () => {
        try {
          if (totalKeys > 0) {
            await pipeline.exec(); // Sends all delete commands together in one request
            console.log(`Invalidated ${totalKeys} keys`);
          }
          resolve();
        } catch (execError) {
          reject(execError);
          console.error(execError);
        }
      });

      stream.on('error', (err) => {
        reject(err);
      });
    });
  } catch (error) {
    console.error('Cache Invalidation error: ', error);
    throw error;
  }
};
