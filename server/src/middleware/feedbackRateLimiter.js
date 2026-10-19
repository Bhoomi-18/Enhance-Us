import { ApiError } from '../utils/apiError.js';

// In-memory sliding window store for feedback rate limiting
// Maps clientKey -> timestamp[]
const feedbackStore = new Map();

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS_PER_WINDOW = 5; // Max 5 feedback submissions per 10 minutes

// Periodic cleanup every 15 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of feedbackStore.entries()) {
    const valid = timestamps.filter((t) => now - t < WINDOW_MS);
    if (valid.length === 0) {
      feedbackStore.delete(key);
    } else {
      feedbackStore.set(key, valid);
    }
  }
}, 15 * 60 * 1000).unref();

export const resetFeedbackRateLimiter = () => {
  feedbackStore.clear();
};

export const feedbackRateLimiter = (req, res, next) => {
  if (process.env.NODE_ENV !== 'production' && req.headers['x-bypass-rate-limit'] === 'true') {
    return next();
  }

  // Use user id if authenticated, or client IP header / remote address
  const clientKey =
    req.user?._id?.toString() ||
    req.headers['x-client-ip'] ||
    req.headers['x-forwarded-for'] ||
    req.ip ||
    req.socket?.remoteAddress ||
    'anonymous';

  const now = Date.now();
  let timestamps = feedbackStore.get(clientKey) || [];
  timestamps = timestamps.filter((t) => now - t < WINDOW_MS);

  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return next(
      new ApiError(
        429,
        `Feedback submission limit reached (${MAX_REQUESTS_PER_WINDOW} per 10 minutes). Thank you for your feedback! Please try again later.`
      )
    );
  }

  timestamps.push(now);
  feedbackStore.set(clientKey, timestamps);
  next();
};

export default feedbackRateLimiter;
