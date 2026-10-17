import mongoose from 'mongoose';
import { MESSAGES } from '../constants/index.js';

export const getHealthStatus = async () => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  return {
    status: 'healthy',
    message: MESSAGES.HEALTH_OK,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStatusMap[dbState] || 'unknown',
      connected: dbState === 1,
    },
  };
};
