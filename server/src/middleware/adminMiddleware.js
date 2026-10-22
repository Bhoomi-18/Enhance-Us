import { validateAdminAccess } from '../utils/adminAuth.js';
import { recordAuditLog } from '../services/auditService.js';
import { recordEvent } from '../services/analyticsService.js';
import { ApiError } from '../utils/apiError.js';

/**
 * Enforces strict backend authorization for every administrative endpoint.
 * Requires:
 * 1. User is authenticated.
 * 2. User is not a demo account (isDemo: false).
 * 3. User is email verified (emailVerified: true).
 * 4. User is not suspended (isSuspended: false).
 * 5. User email matches ADMIN_EMAILS allowlist.
 */
export const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required to access the admin portal.');
    }

    const validation = validateAdminAccess(req.user);

    if (!validation.allowed) {
      const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

      // Record security audit trail for unauthorized administrative attempt
      recordAuditLog({
        actor: req.user,
        action: 'UNAUTHORIZED_ADMIN_ATTEMPT',
        targetId: req.originalUrl,
        targetType: 'ADMIN_ROUTE',
        details: {
          path: req.originalUrl,
          method: req.method,
          reason: validation.reason,
        },
        ip: clientIp,
      }).catch(() => {});

      recordEvent({
        eventType: 'unauthorized_admin_attempt',
        userId: req.user._id,
        metadata: { path: req.originalUrl, email: req.user.email },
        ip: clientIp,
      }).catch(() => {});

      throw new ApiError(validation.statusCode || 403, validation.reason);
    }

    req.isAdmin = true;
    next();
  } catch (err) {
    next(err);
  }
};

export default requireAdmin;
