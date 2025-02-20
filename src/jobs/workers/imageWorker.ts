import { Worker } from 'bullmq';
import path from 'path';
import sharp from 'sharp';
import redisClient from '../../config/redisClient';

// create a worker to process the image optimization job
const imageWorker = new Worker(
  'imageQueue',
  async (job) => {
    const { filepath, fileName, width, height, quality } = job.data;
    const optimizedImagePath = path.join(
      __dirname,
      '../../../',
      'upload/optimize',
      fileName
    );
    await sharp(filepath)
      .resize(width, height)
      .webp({ quality })
      .toFile(optimizedImagePath);
  },
  { connection: redisClient, concurrency: 4 }
);

imageWorker.on('completed', (job) =>
  console.log(`Job completed with result ${job.id}`)
);

imageWorker.on('failed', (job: any, err) =>
  console.log(`Job ${job.id} failed with ${err.message}`)
);
