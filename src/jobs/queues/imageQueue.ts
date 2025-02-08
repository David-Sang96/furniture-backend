import { Queue } from 'bullmq';
import redisClient from '../../config/redisClient';

const ImageQueue = new Queue('imageQueue', { connection: redisClient });

export default ImageQueue;
