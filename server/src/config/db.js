import mongoose from 'mongoose';
import config from './env.js';
import { MESSAGES } from '../constants/index.js';

export const connectDB = async () => {
  // Optional flag for immediate standalone demo testing if local MongoDB is not running
  if (process.env.MOCK_DB === 'true') {
    console.log('[MongoDB Mock] MOCK_DB=true active. Database connection simulated for testing.');
    return { connection: { host: 'localhost', name: 'enhanceus_mock_db' } };
  }

  try {
    console.log(`[MongoDB] Connecting to database: ${config.mongoUri}`);
    
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 3000,
    });

    console.log(`[MongoDB] ${MESSAGES.DB_CONNECT_SUCCESS}: ${conn.connection.host}/${conn.connection.name}`);
    
    mongoose.connection.on('error', (err) => {
      console.error('[MongoDB Runtime Error]', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB Warning] Disconnected from MongoDB');
    });

    return conn;
  } catch (error) {
    console.error(`[MongoDB Error] ${MESSAGES.DB_CONNECT_ERROR}:`, error.message);
    console.error('[MongoDB Notice] Start your local MongoDB server or set MONGODB_URI in server/.env (or set MOCK_DB=true for demo mode).');
    throw error;
  }
};

export default connectDB;
