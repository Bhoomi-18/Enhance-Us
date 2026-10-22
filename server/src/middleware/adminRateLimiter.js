import { ApiError } from '../utils/apiError.js';

// In-memory sliding window store for admin route rate limiting
let adminRequestStore = new Map();

export const resetAdminRateLimiter = () => {
  adminRequestStore.clear();
};

export const adminRateLimiter = (options = {}) => {
  const windowMs = options.windowMs || 10 * 60 * 1000; // 10 minutes default
  const maxRequests = options.max || 150; // 150 requests per window
  const message = options.message || 'Admin rate limit exceeded. Please wait a few moments before retrying.';

  return (req, res, next) => {
    // Allow testing bypass
    if (req.headers['x-bypass-rate-limit'] === 'true' || process.env.NODE_ENV === 'test') {
      return next();
    }

    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const key = `admin_${req.user?._id || ip}`;
    const now = Date.now();

    const record = adminRequestStore.get(key) || { count: 0, resetTime: now + windowMs };

    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
    } else {
      record.count += 1;
    }

    adminRequestStore.set(key, record);

    // Housekeeping: purge expired entries periodically to prevent memory bloat
    if (adminRequestStore.size > 2000) {
      for (const [k, v] of adminRequestStore.entries()) {
        if (now > v.resetTime) adminRequestStore.delete(k);
      }
    }

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > maxRequests) {
      return next(new ApiError(429, message));
    }

    next();
  };
};

export default adminRateLimiter;
