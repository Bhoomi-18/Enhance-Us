import { verifyToken } from '../utils/jwt.js';
import { ApiError } from '../utils/apiError.js';
import User from '../models/userModel.js';

export const authenticateUser = async (req, res, next) => {
  try {
    let token = null;

    // Check HTTP-only cookie first
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // Check Authorization header second
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new ApiError(401, 'Not authorized, no token provided');
    }

    // Verify token
    const decoded = verifyToken(token);

    // If live MongoDB is connected, always fetch real user document from database
    if (User.db?.readyState === 1) {
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        throw new ApiError(401, 'Not authorized, user no longer exists');
      }

      if (user.isSuspended) {
        throw new ApiError(403, 'Account has been suspended. Please contact support@briefenai.me.');
      }

      req.user = user;
      return next();
    }

    // Fallback ONLY when live MongoDB is disconnected and MOCK_DB is active (e.g. offline unit testing)
    if (process.env.MOCK_DB === 'true') {
      const { mockDeletedUsersSet } = await import('../services/userService.js');
      if (mockDeletedUsersSet.has(decoded.id)) {
        throw new ApiError(401, 'Not authorized, user account was permanently deleted');
      }
      req.user = {
        _id: decoded.id,
        name: decoded.name || 'User',
        email: decoded.email || 'user@enhanceus.org',
        role: 'user',
        isDemo: decoded.email?.toLowerCase().includes('demo') || false,
        emailVerified: true,
        skills: [{ name: 'React', level: 'ADVANCED' }],
        learningInterests: [{ name: 'UI/UX Design', priority: 'HIGH' }],
      };
      return next();
    }

    throw new ApiError(503, 'Database unavailable. Please try again shortly.');
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Session expired or invalid token. Please log in again.'));
    }
    next(error);
  }
};

export const optionalAuthenticateUser = async (req, res, next) => {
  try {
    let token = null;
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next();
    }

    const decoded = verifyToken(token);

    if (User.db?.readyState === 1) {
      const user = await User.findById(decoded.id).select('-password');
      if (user) {
        req.user = user;
      }
      return next();
    }

    if (process.env.MOCK_DB === 'true') {
      req.user = {
        _id: decoded.id,
        name: decoded.name || 'User',
        email: decoded.email || 'user@enhanceus.org',
        role: 'user',
        isDemo: decoded.email?.toLowerCase().includes('demo') || false,
      };
      return next();
    }

    next();
  } catch {
    // Graceful fallback for optional auth: proceed as guest
    next();
  }
};

/**
 * Ensures unverified real users cannot access protected application actions.
 * Demo accounts and legacy accounts with undefined emailVerified are safely permitted.
 */
export const requireEmailVerified = (req, res, next) => {
  if (!req.user) {
    return next(new ApiError(401, 'Authentication required'));
  }

  // Demo accounts are always exempt from email verification
  if (req.user.isDemo) {
    return next();
  }

  // Newly registered real accounts start with emailVerified: false
  if (req.user.emailVerified === false) {
    return next(
      new ApiError(
        403,
        'Email verification required. Please verify your email address to access this feature.',
        { emailVerificationRequired: true, email: req.user.email }
      )
    );
  }

  next();
};

export const requireOwnership = (paramKey = 'id') => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    const resourceId = req.params[paramKey] || req.body[paramKey];

    if (req.user.role === 'admin' || req.user._id.toString() === resourceId) {
      return next();
    }

    return next(new ApiError(403, 'Forbidden: You do not have permission to access or modify this resource'));
  };
};

// Role-based authorization middleware foundation
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, `User role '${req.user.role}' is not authorized to perform this action`));
    }

    next();
  };
};
