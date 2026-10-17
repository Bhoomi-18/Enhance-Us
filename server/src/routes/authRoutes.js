import { Router } from 'express';
import { register, login, logout, getMe, getDemoCredentials } from '../controllers/authController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = Router();

// Public Auth Routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/demo-credentials', getDemoCredentials);

// Protected Auth Routes
router.get('/me', authenticateUser, getMe);

export default router;
