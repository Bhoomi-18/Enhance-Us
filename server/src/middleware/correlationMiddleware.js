import crypto from 'crypto';

/**
 * Express middleware to propagate and generate request correlation IDs.
 * Allows distributed tracing across client requests, background jobs, and error logs.
 */
export const correlationMiddleware = (req, res, next) => {
  const incomingHeader = req.headers['x-correlation-id'] || req.headers['x-request-id'];

  let correlationId;
  if (incomingHeader && typeof incomingHeader === 'string' && /^[a-zA-Z0-9_\-.]{4,64}$/.test(incomingHeader.trim())) {
    correlationId = incomingHeader.trim();
  } else {
    correlationId = `req_${Date.now().toString(36)}_${crypto.randomBytes(6).toString('hex')}`;
  }

  req.correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);

  next();
};

export default correlationMiddleware;
