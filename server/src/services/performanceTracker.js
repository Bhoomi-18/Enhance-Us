import mongoose from 'mongoose';

// Bounded in-memory performance statistics
const metrics = {
  startedAt: new Date(),
  totalRequests: 0,
  statusCodes: {
    '2xx': 0,
    '3xx': 0,
    '4xx': 0,
    '5xx': 0,
  },
  responseTimes: [], // Rolling buffer of recent 200 response times for percentile calculation
  recentErrors: [], // Rolling buffer of recent 50 errors (no secrets!)
  slowRequests: [], // Rolling buffer of recent 50 slow requests (>500ms)
  securityEvents: {
    failedLogins: 0,
    failedVerifications: 0,
    unauthorizedAdminAttempts: 0,
    rateLimitHits: 0,
  },
};

const MAX_BUFFER_SIZE = 100;
const MAX_ERROR_BUFFER = 50;

/**
 * Strips secrets, tokens, credentials, and cookies from error logs
 */
export const sanitizeErrorDetails = (details) => {
  if (!details || typeof details !== 'object') return {};
  const clean = { ...details };
  const sensitivePatterns = ['password', 'token', 'authorization', 'secret', 'cookie', 'jwt', 'apiKey'];
  for (const key of Object.keys(clean)) {
    if (sensitivePatterns.some((p) => key.toLowerCase().includes(p))) {
      clean[key] = '[REDACTED]';
    }
  }
  return clean;
};

/**
 * Middleware that tracks request duration, status code, and identifies slow endpoints
 */
export const performanceMonitoringMiddleware = (req, res, next) => {
  const start = process.hrtime();
  metrics.totalRequests += 1;

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationMs = Math.round((diff[0] * 1e3 + diff[1] * 1e-6) * 100) / 100;

    // Track status code family
    const status = res.statusCode;
    if (status >= 200 && status < 300) metrics.statusCodes['2xx'] += 1;
    else if (status >= 300 && status < 400) metrics.statusCodes['3xx'] += 1;
    else if (status >= 400 && status < 500) metrics.statusCodes['4xx'] += 1;
    else if (status >= 500) metrics.statusCodes['5xx'] += 1;

    // Rolling latency buffer
    metrics.responseTimes.push(durationMs);
    if (metrics.responseTimes.length > MAX_BUFFER_SIZE) {
      metrics.responseTimes.shift();
    }

    // Capture slow request (>500ms)
    if (durationMs > 500 && !req.originalUrl.includes('/admin/health')) {
      metrics.slowRequests.unshift({
        method: req.method,
        path: req.originalUrl.split('?')[0],
        durationMs,
        statusCode: status,
        timestamp: new Date(),
      });
      if (metrics.slowRequests.length > MAX_ERROR_BUFFER) {
        metrics.slowRequests.pop();
      }
    }
  });

  next();
};

/**
 * Records an error safely into the rolling error log
 */
export const recordApplicationError = ({ method, path, statusCode, message, details = {} }) => {
  metrics.recentErrors.unshift({
    method: method || 'N/A',
    path: (path || 'N/A').split('?')[0],
    statusCode: statusCode || 500,
    message: String(message || 'An error occurred').substring(0, 200),
    details: sanitizeErrorDetails(details),
    timestamp: new Date(),
  });

  if (metrics.recentErrors.length > MAX_ERROR_BUFFER) {
    metrics.recentErrors.pop();
  }
};

/**
 * Records a security event count (e.g. failed login, rate limit hit)
 */
export const recordSecurityMetric = (type) => {
  if (metrics.securityEvents[type] !== undefined) {
    metrics.securityEvents[type] += 1;
  }
};

/**
 * Calculates latency percentiles (avg, p50, p95, p99)
 */
const calculatePercentiles = (times) => {
  if (!times || times.length === 0) {
    return { avg: 0, p50: 0, p95: 0, p99: 0 };
  }
  const sorted = [...times].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const avg = Math.round((sum / sorted.length) * 100) / 100;

  const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
  const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;

  return { avg, p50, p95, p99 };
};

/**
 * Compiles a comprehensive health & technical metrics snapshot
 */
export const getSystemHealthSnapshot = async () => {
  const uptimeSeconds = Math.floor(process.uptime());
  const mem = process.memoryUsage();

  // MongoDB status
  const mongoStates = ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'];
  const mongoReadyState = mongoose.connection.readyState;
  let mongoPingMs = null;

  if (mongoReadyState === 1 && mongoose.connection.db) {
    try {
      const pingStart = Date.now();
      await mongoose.connection.db.admin().ping();
      mongoPingMs = Date.now() - pingStart;
    } catch {
      mongoPingMs = null;
    }
  }

  // Integrations configuration status (Checks presence and format WITHOUT leaking secrets)
  const plunkKey = (process.env.PLUNK_API_KEY || '').trim().replace(/^['"]|['"]$/g, '');
  const emailServiceConfigured = Boolean(
    plunkKey && !plunkKey.startsWith('your_plunk') && plunkKey !== 'placeholder'
  );
  const emailServiceKeyType = plunkKey.startsWith('sk_')
    ? 'Secret Key (sk_*) - Valid'
    : plunkKey.startsWith('pk_')
    ? 'Public Key (pk_*) - Invalid for backend send'
    : emailServiceConfigured
    ? 'Custom/Unrecognized Prefix'
    : 'Not configured';

  const geminiConfigured = Boolean(
    (process.env.GEMINI_API_KEY || '').trim() && !process.env.GEMINI_API_KEY.startsWith('your_')
  );

  const adminEmailsConfigured = Boolean(
    (process.env.ADMIN_EMAILS || '').trim() && !process.env.ADMIN_EMAILS.includes('placeholder')
  );

  const jwtConfigured = Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 16);

  const percentiles = calculatePercentiles(metrics.responseTimes);

  return {
    timestamp: new Date().toISOString(),
    process: {
      uptimeSeconds,
      uptimeHuman: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`,
      nodeVersion: process.version,
      memoryMb: {
        rss: Math.round(mem.rss / 1024 / 1024),
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      },
    },
    database: {
      status: mongoStates[mongoReadyState] || 'Unknown',
      readyState: mongoReadyState,
      pingMs: mongoPingMs,
      host: mongoose.connection.host ? mongoose.connection.host.split('.')[0] + '... [redacted]' : 'local',
    },
    integrations: {
      emailService: {
        configured: emailServiceConfigured,
        keyType: emailServiceKeyType,
        senderDomain: process.env.PLUNK_FROM_EMAIL || 'no-reply@briefenai.me',
        recipient: process.env.SUPPORT_EMAIL || 'support@briefenai.me',
      },
      geminiAi: {
        configured: geminiConfigured,
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      },
      adminSecurity: {
        adminEmailsConfigured,
        allowlistCount: (process.env.ADMIN_EMAILS || '').split(',').filter(Boolean).length,
      },
      jwtAuth: {
        configured: jwtConfigured,
      },
    },
    traffic: {
      totalRequests: metrics.totalRequests,
      statusCodes: metrics.statusCodes,
      latency: percentiles,
    },
    securityEvents: metrics.securityEvents,
    slowRequests: metrics.slowRequests.slice(0, 10),
    recentErrors: metrics.recentErrors.slice(0, 10),
  };
};

export default {
  performanceMonitoringMiddleware,
  recordApplicationError,
  recordSecurityMetric,
  getSystemHealthSnapshot,
};
