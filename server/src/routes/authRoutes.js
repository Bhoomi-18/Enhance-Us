import { Router } from 'express';
import { register, login, logout, getMe, getDemoCredentials } from '../controllers/authController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { authRateLimiter } from '../middleware/authRateLimiter.js';

const router = Router();

// Public Auth Routes (rate-limited against brute-force and credential stuffing)
router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
router.post('/logout', logout);
router.get('/demo-credentials', getDemoCredentials);

// Protected Auth Routes
router.get('/me', authenticateUser, getMe);

export default router;
