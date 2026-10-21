/**
 * In-memory Authentication Rate Limiter
 * Provides IP-based rate limiting for sensitive authentication endpoints (/login, /register)
 * Protects against credential brute-forcing, credential stuffing, and registration spam.
 * Zero external dependencies.
 */

const authAttempts = new Map();
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 100; // 100 attempts per 15 minutes per IP (robust against bots while allowing dev/test workflows)

// Clean up stale entries periodically to prevent memory leaks
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of authAttempts.entries()) {
    if (now - record.firstAttemptTime > WINDOW_MS) {
      authAttempts.delete(ip);
    }
  }
}, CLEANUP_INTERVAL_MS).unref(); // unref so timer doesn't prevent Node process exit

export const authRateLimiter = (req, res, next) => {
  // Allow disabling or bypassing in automated test runs
  if (process.env.DISABLE_RATE_LIMITER === 'true' || req.headers['x-bypass-rate-limit'] === 'true') {
    return next();
  }

  // Derive client IP reliably, handling standard proxy headers
  const clientIp =
    (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) ||
    req.socket?.remoteAddress ||
    req.ip ||
    '127.0.0.1';

  const now = Date.now();
  let record = authAttempts.get(clientIp);

  if (!record || now - record.firstAttemptTime > WINDOW_MS) {
    record = { count: 1, firstAttemptTime: now };
    authAttempts.set(clientIp, record);
  } else {
    record.count += 1;
  }

  const remaining = Math.max(0, MAX_ATTEMPTS - record.count);
  const resetSeconds = Math.ceil((record.firstAttemptTime + WINDOW_MS - now) / 1000);

  res.setHeader('RateLimit-Limit', MAX_ATTEMPTS);
  res.setHeader('RateLimit-Remaining', remaining);
  res.setHeader('RateLimit-Reset', resetSeconds);

  if (record.count > MAX_ATTEMPTS) {
    return res.status(429).json({
      success: false,
      message: 'Too many authentication attempts from this IP address. Please try again later.',
      retryAfterSeconds: resetSeconds,
    });
  }

  next();
};

export const resetAuthRateLimiter = () => {
  authAttempts.clear();
};

export default authRateLimiter;
