import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import config from './config/env.js';
import requestLogger from './middleware/requestLogger.js';
import notFoundMiddleware from './middleware/notFoundMiddleware.js';
import errorMiddleware from './middleware/errorMiddleware.js';
import apiRoutes from './routes/index.js';

const app = express();

// Parse allowed origins from environment variable
const allowedOrigins = config.clientOrigin
  ? config.clientOrigin.split(',').map((o) => o.trim().replace(/\/$/, ''))
  : ['http://localhost:5173'];

// CORS Middleware Configuration (credentials: true for cookies & Bearer tokens)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/$/, '');
      const isAllowed =
        allowedOrigins.includes(normalizedOrigin) ||
        allowedOrigins.includes('*') ||
        normalizedOrigin.endsWith('.vercel.app') ||
        process.env.NODE_ENV !== 'production';

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`CORS origin not allowed: ${origin}`));
      }
    },
    credentials: true,
  })
);

// Cookie Parser Middleware
app.use(cookieParser());

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logger
app.use(requestLogger);

// Base API Routes
app.use('/api', apiRoutes);

// Root route welcome message
app.get('/', (req, res) => {
  res.json({
    name: 'EnhanceUs API',
    version: '1.0.0',
    description: 'Goal-driven skill exchange platform API',
    healthCheck: '/api/health',
    authEndpoints: '/api/auth',
  });
});

// 404 Handler
app.use(notFoundMiddleware);

// Centralized Error Handler Middleware
app.use(errorMiddleware);

export default app;
