import { Router } from 'express';
import {
  register,
  login,
  logout,
  getMe,
  getDemoCredentials,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { authenticateUser, optionalAuthenticateUser } from '../middleware/authMiddleware.js';
import { authRateLimiter } from '../middleware/authRateLimiter.js';
import User from '../models/userModel.js';

const router = Router();

// Test helper: auto-verify user in development/test for automated integration test suites
if (process.env.NODE_ENV !== 'production') {
  router.post('/test-verify', async (req, res) => {
    try {
      const { email, userId } = req.body;
      const query = userId ? { _id: userId } : { email: (email || '').toLowerCase().trim() };
      if (User.db?.readyState === 1) {
        await User.updateOne(query, { emailVerified: true });
      }
      res.json({ success: true, message: 'Account verified for testing' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
}

// Public Auth Routes (rate-limited against brute-force and credential stuffing)
router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
router.post('/logout', logout);
router.get('/demo-credentials', getDemoCredentials);

// Email Verification Routes
router.post('/verify-email', authRateLimiter, verifyEmail);
router.get('/verify-email', authRateLimiter, verifyEmail);
router.post('/resend-verification', authRateLimiter, optionalAuthenticateUser, resendVerification);

// Password Reset Routes
router.post('/forgot-password', authRateLimiter, forgotPassword);
router.post('/reset-password', authRateLimiter, resetPassword);

// Protected Auth Routes
router.get('/me', authenticateUser, getMe);

export default router;
