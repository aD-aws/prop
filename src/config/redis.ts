import { createClient } from 'redis';
import { config } from './index';
import { logger } from '../utils/logger';

export const redisClient = createClient({
  url: config.redis.url,
  ...(config.redis.password && { password: config.redis.password }),
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  logger.info('Redis Client Connected');
});

redisClient.on('ready', () => {
  logger.info('Redis Client Ready');
});

redisClient.on('end', () => {
  logger.info('Redis Client Disconnected');
});

export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
    logger.info('Connected to Redis successfully');
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
};

export const disconnectRedis = async (): Promise<void> => {
  try {
    await redisClient.quit();
    logger.info('Disconnected from Redis successfully');
  } catch (error) {
    logger.error('Failed to disconnect from Redis:', error);
    throw error;
  }
};