import redisClient from '../config/redisClient';

export const getOrSetCache = async (key: any, cb: any) => {
  try {
    const cachedData = await redisClient.get(key);
    if (cachedData) {
      console.log('Cache hit');
      return JSON.parse(cachedData);
    }
    console.log('Cache miss');
    const freshData = await cb();
    // each key expiration is an hour - 3600 seconds
    await redisClient.setex(key, 3600, JSON.stringify(freshData));
    return freshData;
  } catch (error) {
    console.error('Redis cache error: ', error);
    throw error;
  }
};
