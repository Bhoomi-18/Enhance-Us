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

    // If mock DB is enabled for offline testing
    if (process.env.MOCK_DB === 'true') {
      req.user = {
        _id: decoded.id,
        name: decoded.name || 'User',
        email: decoded.email || 'user@enhanceus.org',
        role: 'user',
        isDemo: decoded.email?.toLowerCase().includes('demo') || false,
        skills: [{ name: 'React', level: 'ADVANCED' }],
        learningInterests: [{ name: 'UI/UX Design', priority: 'HIGH' }],
      };
      return next();
    }

    // Fetch user from database
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      throw new ApiError(401, 'Not authorized, user no longer exists');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Session expired or invalid token. Please log in again.'));
    }
    next(error);
  }
};

// Require resource ownership middleware foundation
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
