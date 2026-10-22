import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import authRoutes from './authRoutes.js';
import skillRoutes from './skillRoutes.js';
import goalRoutes from './goalRoutes.js';
import matchRoutes from './matchRoutes.js';
import exchangeRoutes from './exchangeRoutes.js';
import conversationRoutes from './conversationRoutes.js';
import sessionRoutes from './sessionRoutes.js';
import reviewRoutes from './reviewRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import searchRoutes from './searchRoutes.js';
import userRoutes from './userRoutes.js';
import roadmapRoutes from './roadmapRoutes.js';
import feedbackRoutes from './feedbackRoutes.js';
import resourceRoutes from './resourceRoutes.js';
import assistantRoutes from './assistantRoutes.js';
import adminRoutes from './adminRoutes.js';

const router = Router();

// API Routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/users', userRoutes);
router.use('/skills', skillRoutes);
router.use('/goals', goalRoutes);
router.use('/roadmaps', roadmapRoutes);
router.use('/resources', resourceRoutes);
router.use('/assistant', assistantRoutes);
router.use('/matches', matchRoutes);
router.use('/exchanges', exchangeRoutes);
router.use('/conversations', conversationRoutes);
router.use('/sessions', sessionRoutes);
router.use('/reviews', reviewRoutes);
router.use('/notifications', notificationRoutes);
router.use('/search', searchRoutes);
router.use('/feedback', feedbackRoutes);

export default router;
