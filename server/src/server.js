import app from './app.js';
import config from './config/env.js';
import connectDB from './config/db.js';

const startServer = async () => {
  try {
    console.log('[Server Startup] Initializing EnhanceUs Backend...');
    
    // Step 1: Connect to MongoDB
    await connectDB();

    // Step 2: Start Express listener after DB connection succeeds
    const server = app.listen(config.port, () => {
      console.log(`[Server] EnhanceUs API is running on http://localhost:${config.port}`);
      console.log(`[Server] Environment: ${config.nodeEnv}`);
      console.log(`[Server] Health Check URL: http://localhost:${config.port}/api/health`);
    });

    // Graceful Shutdown Handlers
    const handleExit = (signal) => {
      console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
      server.close(() => {
        console.log('[Server] HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => handleExit('SIGINT'));
    process.on('SIGTERM', () => handleExit('SIGTERM'));

  } catch (error) {
    console.error('[Server Fatal Error] Failed to start server due to database connection error:', error.message);
    process.exit(1);
  }
};

startServer();
