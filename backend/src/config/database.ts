import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

let isConnected = false;

/**
 * Connects to MongoDB using Mongoose.
 * Reuses existing connection if already established.
 */
export async function connectDatabase(): Promise<void> {
  if (isConnected) {
    logger.debug('Reusing existing MongoDB connection');
    return;
  }

  // Set up connection event listeners
  mongoose.connection.on('error', (err: Error) => {
    logger.error('MongoDB runtime connection error', err);
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    logger.warn('MongoDB connection disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    isConnected = true;
    logger.info('MongoDB connection re-established');
  });

  try {
    logger.info('Connecting to MongoDB...');
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    isConnected = true;
    logger.info('Successfully connected to MongoDB', {
      host: conn.connection.host,
      name: conn.connection.name,
    });
  } catch (error) {
    isConnected = false;
    logger.error('Failed to connect to MongoDB', error);
    throw error;
  }
}

/**
 * Disconnects from MongoDB gracefully.
 */
export async function disconnectDatabase(): Promise<void> {
  if (!isConnected && mongoose.connection.readyState === 0) {
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB connection closed gracefully');
  } catch (error) {
    logger.error('Error during MongoDB disconnection', error);
    throw error;
  }
}

/**
 * Returns true if the database is currently connected.
 */
export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
