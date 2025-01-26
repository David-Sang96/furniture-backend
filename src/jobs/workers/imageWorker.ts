import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import path from 'path';
import sharp from 'sharp';

const connection = new Redis({
  host: process.env.REDIS_HOST,
  port: 6379,
  maxRetriesPerRequest: null,
});

// create a worker to process the image optimization job
const imageWorker = new Worker(
  'imageQueue',
  async (job) => {
    const { filepath, fileName } = job.data;
    const optimizedImagePath = path.join(
      __dirname,
      '../../../',
      'upload/optimize',
      fileName
    );
    await sharp(filepath)
      .resize(200, 200)
      .webp({ quality: 50 })
      .toFile(optimizedImagePath);
  },
  { connection }
);

imageWorker.on('completed', (job) =>
  console.log(`Job completed with result ${job.id}`)
);

imageWorker.on('failed', (job: any, err) =>
  console.log(`Job ${job.id} failed with ${err.message}`)
);
