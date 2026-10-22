import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import config from './config/env.js';
import requestLogger from './middleware/requestLogger.js';
import notFoundMiddleware from './middleware/notFoundMiddleware.js';
import errorMiddleware from './middleware/errorMiddleware.js';
import apiRoutes from './routes/index.js';
import { performanceMonitoringMiddleware } from './services/performanceTracker.js';

const app = express();

// Security: Disable X-Powered-By header to avoid fingerprinting
app.disable('x-powered-by');

// Security: Baseline HTTP Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

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

// Body Parser Middleware with explicit payload bounds (1MB limit to protect against DoS)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request Logger & Performance Monitoring
app.use(requestLogger);
app.use(performanceMonitoringMiddleware);

// Base API Routes
app.use('/api', apiRoutes);

// Lightweight Root Liveness Endpoint (ideal for Render health checks and external uptime monitors)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Root route welcome message
app.get('/', (req, res) => {
  res.json({
    name: 'EnhanceUs API',
    version: '1.0.0',
    description: 'Goal-driven skill exchange platform API',
    healthCheck: '/api/health',
    livenessCheck: '/health',
    authEndpoints: '/api/auth',
  });
});

// 404 Handler
app.use(notFoundMiddleware);

// Centralized Error Handler Middleware
app.use(errorMiddleware);

export default app;
