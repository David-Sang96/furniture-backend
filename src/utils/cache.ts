import redisClient from '../config/redisClient';

const stableStringify = (obj: any) => {
  return JSON.stringify(obj, Object.keys(obj).sort());
};

export const getOrSetCache = async (keyObj: any, cb: any) => {
  try {
    const cachedData = await redisClient.get(keyObj);
    if (cachedData) {
      console.log('Cache hit');
      return JSON.parse(cachedData);
    }
    console.log('Cache miss');
    const freshData = await cb();
    // each key expiration is an hour - 3600 seconds
    await redisClient.setex(keyObj, 3600, JSON.stringify(freshData));
    return freshData;
  } catch (error) {
    console.error('Redis cache error: ', error);
    throw error;
  }
};
