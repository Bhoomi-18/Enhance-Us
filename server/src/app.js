import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import config from './config/env.js';
import requestLogger from './middleware/requestLogger.js';
import notFoundMiddleware from './middleware/notFoundMiddleware.js';
import errorMiddleware from './middleware/errorMiddleware.js';
import apiRoutes from './routes/index.js';

const app = express();

// CORS Middleware Configuration (credentials: true for cookies)
app.use(
  cors({
    origin: config.clientOrigin,
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
