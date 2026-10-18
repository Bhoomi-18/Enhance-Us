import { ApiError } from '../utils/apiError.js';

// In-memory sliding window store for AI usage control
// Maps userId -> timestamp[]
const userRequestStore = new Map();

const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_REQUESTS_PER_WINDOW = 10;

// Periodic cleanup every 10 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [userId, timestamps] of userRequestStore.entries()) {
    const valid = timestamps.filter((t) => now - t < WINDOW_MS);
    if (valid.length === 0) {
      userRequestStore.delete(userId);
    } else {
      userRequestStore.set(userId, valid);
    }
  }
}, 10 * 60 * 1000).unref();

export const resetAiRateLimiter = () => {
  userRequestStore.clear();
};

export const aiRateLimiter = (req, res, next) => {
  if (!req.user || !req.user._id) {
    return next(new ApiError(401, 'Authentication required for AI analysis'));
  }

  const userId = req.user._id.toString();
  const now = Date.now();

  let timestamps = userRequestStore.get(userId) || [];
  // Filter timestamps within sliding window
  timestamps = timestamps.filter((t) => now - t < WINDOW_MS);

  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return next(
      new ApiError(
        429,
        `AI analysis rate limit reached (${MAX_REQUESTS_PER_WINDOW} requests per 5 minutes). Please try again shortly.`
      )
    );
  }

  timestamps.push(now);
  userRequestStore.set(userId, timestamps);
  next();
};

export default aiRateLimiter;
