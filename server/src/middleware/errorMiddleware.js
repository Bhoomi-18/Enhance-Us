import { ApiResponse } from '../utils/apiResponse.js';
import { HTTP_STATUS, MESSAGES } from '../constants/index.js';
import config from '../config/env.js';
import { recordApplicationError } from '../services/performanceTracker.js';

export const errorMiddleware = (err, req, res, next) => {
  let statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = err.message || MESSAGES.INTERNAL_ERROR;
  let errors = err.errors || null;

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = `Invalid format for field: ${err.path}`;
  }

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((el) => el.message);
  }

  // Handle Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    statusCode = HTTP_STATUS.CONFLICT;
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate value for field '${field}'. Please use another value.`;
  }

  // Track error in performance telemetry (safely sanitized)
  try {
    recordApplicationError({
      method: req.method,
      path: req.originalUrl,
      statusCode,
      message,
      details: { errors },
    });
  } catch {}

  // Log error stack in non-production
  if (config.nodeEnv !== 'production') {
    console.error('[Error Stack]', err.stack || err);
  }

  return ApiResponse.error(res, message, statusCode, errors);
};

export default errorMiddleware;
