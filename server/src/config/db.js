import mongoose from 'mongoose';
import config from './env.js';
import { MESSAGES } from '../constants/index.js';

export const connectDB = async () => {
  try {
    console.log(`[MongoDB] Connecting to database: ${config.mongoUri}`);
    
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`[MongoDB] ${MESSAGES.DB_CONNECT_SUCCESS}: ${conn.connection.host}/${conn.connection.name}`);
    
    mongoose.connection.on('error', (err) => {
      console.error('[MongoDB Runtime Error]', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB Warning] Disconnected from MongoDB');
    });

    // Auto-provision isolated demo account in MongoDB
    try {
      const { provisionDemoAccount } = await import('../services/demoProvisioningService.js');
      await provisionDemoAccount();
    } catch (provisionErr) {
      console.warn('[MongoDB Notice] Demo auto-provisioning note:', provisionErr.message);
    }

    return conn;
  } catch (error) {
    // If live MongoDB fails AND MOCK_DB=true is set, fall back to mock connection for offline demo testing
    if (process.env.MOCK_DB === 'true') {
      console.warn('[MongoDB Mock] MOCK_DB=true fallback active. Live MongoDB unavailable:', error.message);
      return { connection: { host: 'localhost', name: 'enhanceus_mock_db' } };
    }
    console.error(`[MongoDB Error] ${MESSAGES.DB_CONNECT_ERROR}:`, error.message);
    console.error('[MongoDB Notice] Start your local MongoDB server or set MONGODB_URI in server/.env (or set MOCK_DB=true for demo mode).');
    throw error;
  }
};

export default connectDB;
